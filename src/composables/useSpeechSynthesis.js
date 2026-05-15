import { ref, onUnmounted } from 'vue'
import { useAvatarStore } from '@/stores/avatar'

function formatLogLine(level, ...args) {
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '')
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
  return `[${ts}] [${level}] ${msg}`
}
function postLog(line) {
  fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: line + '\n' }).catch(() => {})
}
const logInfo = (...args) => {
  const line = formatLogLine('INFO', ...args)
  console.info(line)
  postLog(line)
}
const logWarn = (...args) => {
  const line = formatLogLine('WARN', ...args)
  console.warn(line)
  postLog(line)
}
const logError = (...args) => {
  const line = formatLogLine('ERROR', ...args)
  console.error(line)
  postLog(line)
}

/**
 * Audio map: maps exact reply text → pre-recorded audio file path.
 * When the BFF sends a reply that matches one of these keys exactly,
 * the pre-recorded audio is played instead of Web Speech API TTS.
 *
 * To add new mappings: place the MP3 in public/audio/ and add an entry here.
 */
const AUDIO_MAP = [
  { text: '您好！我是医疗智慧平台AI助手，请问有什么可以帮您的？', audio: '/audio/hello.mp3' },
  { text: '好的，已为您切换到数据看板。', audio: '/audio/dashboard.mp3' },
  { text: '好的，已为您打开诊断工作台。', audio: '/audio/diagnosis.mp3' },
  { text: '好的，已为您进入演示模式。', audio: '/audio/presentation.mp3' },
  { text: '好的，已为您启动考核模块。', audio: '/audio/exam.mp3' },
]

/**
 * Find a pre-recorded audio file for the given text.
 * Returns the audio path or null if no match.
 */
function findAudioForText(text) {
  if (!text) return null
  const entry = AUDIO_MAP.find(e => e.text === text)
  return entry ? entry.audio : null
}

/**
 * Play a pre-recorded audio file via HTML5 Audio.
 * Avatar state is managed by the caller via options callbacks (onStart/onEnd/onError),
 * matching the Web Speech API pattern used in useWebSocket.js.
 * Returns a Promise that resolves when playback ends.
 */
function playAudioFile(audioPath, options = {}) {
  return new Promise((resolve) => {
    logInfo('[SpeechSynthesis] Playing pre-recorded audio:', audioPath)
    const audio = new Audio(audioPath)

    audio.onplay = () => {
      logInfo('[SpeechSynthesis] Audio playback started')
      options.onStart?.()
    }

    audio.onended = () => {
      logInfo('[SpeechSynthesis] Audio playback finished')
      options.onEnd?.()
      resolve()
    }

    audio.onerror = (err) => {
      logWarn('[SpeechSynthesis] Audio playback error:', err)
      options.onError?.(err)
      resolve()
    }

    audio.play().catch(err => {
      logWarn('[SpeechSynthesis] Play failed:', err.message)
      options.onError?.(err)
      resolve()
    })
  })
}

/**
 * Composable for browser-native speech synthesis (text-to-speech)
 * Uses Web Speech API to speak text without any external API
 *
 * Features:
 * - Pre-recorded audio playback: checks audio map first, falls back to TTS
 * - Automatically selects Chinese voice if available
 * - Controls avatar state: SPEAKING while talking, IDLE when done
 * - Queue system: multiple utterances are spoken in order
 */
export function useSpeechSynthesis() {
  const avatarStore = useAvatarStore()

  let synth = window.speechSynthesis
  let voices = []
  let utteranceQueue = []
  let isSpeaking = ref(false)
  let isSupported = ref(false)
  let selectedVoice = null
  let currentAudioElement = null  // track current HTML5 audio for stop()

  // Check browser support
  if (synth) {
    isSupported.value = true
    // Load voices (async in some browsers)
    voices = synth.getVoices()
    if (voices.length === 0) {
      // Chrome loads voices asynchronously
      synth.onvoiceschanged = () => {
        voices = synth.getVoices()
        selectChineseVoice()
      }
    } else {
      selectChineseVoice()
    }
  }

  /**
   * Select the best available Chinese voice
   */
  function selectChineseVoice() {
    if (voices.length === 0) return

    // Priority order for Chinese voices
    const preferredVoices = [
      'Microsoft Huihui',
      'Microsoft Kangkang',
      'Microsoft Yaoyao',
      'Google 普通话',
      'Google 國語',
      'Ting-Ting',
      'Mei-Jia',
      'Xander',
      'Samantha',
    ]

    // Try preferred voices first
    for (const name of preferredVoices) {
      const voice = voices.find(v => v.name.includes(name))
      if (voice) {
        selectedVoice = voice
        return
      }
    }

    // Fallback: any Chinese voice
    const chineseVoice = voices.find(v =>
      v.lang === 'zh-CN' || v.lang === 'zh-TW' || v.lang === 'zh-HK' || v.lang.startsWith('zh')
    )
    if (chineseVoice) {
      selectedVoice = chineseVoice
      return
    }

    // Last resort: default voice
    selectedVoice = voices[0]
  }

  /**
   * Process the next item in the queue.
   * Each queue item is { text, options }.
   * First checks if there's a pre-recorded audio file for the text.
   * If yes, plays the audio. If no, falls back to Web Speech API TTS.
   */
  function processQueue() {
    if (utteranceQueue.length === 0) return
    if (isSpeaking.value) return

    const { text, options } = utteranceQueue.shift()

    // ── Try pre-recorded audio first ──
    const audioPath = findAudioForText(text)
    if (audioPath) {
      isSpeaking.value = true
      playAudioFile(audioPath, {
        onStart: () => {
          isSpeaking.value = true
          avatarStore.setState('SPEAKING')
          options.onStart?.()
        },
        onEnd: () => {
          isSpeaking.value = false
          avatarStore.setState('IDLE')
          options.onEnd?.()
          processQueue()
        },
        onError: () => {
          isSpeaking.value = false
          avatarStore.setState('IDLE')
          options.onError?.()
          processQueue()
        }
      })
      return
    }

    // ── Fallback: Web Speech API TTS ──
    isSpeaking.value = true
    speakWithTTS(text, options)
  }

  /**
   * Speak text using Web Speech API (browser TTS)
   */
  function speakWithTTS(text, options = {}) {
    if (!isSupported.value || !text) {
      logWarn('[SpeechSynthesis] TTS not supported or empty text')
      options.onEnd?.()
      processQueue()
      return false
    }

    const utterance = new SpeechSynthesisUtterance(text)

    // Set voice
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    // Set options
    utterance.rate = options.rate ?? 1.0
    utterance.pitch = options.pitch ?? 1.0
    utterance.volume = options.volume ?? 1.0
    utterance.lang = 'zh-CN'

    // Events
    utterance.onstart = () => {
      isSpeaking.value = true
      avatarStore.setState('SPEAKING')
      logInfo('[SpeechSynthesis] TTS started:', text.slice(0, 30) + '...')
      options.onStart?.()
    }

    utterance.onend = () => {
      isSpeaking.value = false
      avatarStore.setState('IDLE')
      logInfo('[SpeechSynthesis] TTS finished')
      options.onEnd?.()
      processQueue()
    }

    utterance.onerror = (event) => {
      isSpeaking.value = false
      avatarStore.setState('IDLE')
      logWarn('[SpeechSynthesis] TTS error:', event.error)
      options.onError?.(event)
      processQueue()
    }

    // Speak
    synth.speak(utterance)
    return true
  }

  /**
   * Speak a text string.
   * Checks the pre-recorded audio map first. If a match is found, plays the audio file.
   * Otherwise falls back to Web Speech API TTS.
   *
   * @param {string} text - Text to speak
   * @param {Object} options - Speech options
   * @param {number} options.rate - Speech rate (0.1 to 10, default 1)
   * @param {number} options.pitch - Pitch (0 to 2, default 1)
   * @param {number} options.volume - Volume (0 to 1, default 1)
   * @param {Function} options.onStart - Callback when speech starts
   * @param {Function} options.onEnd - Callback when speech ends
   * @param {Function} options.onError - Callback on error
   */
  function speak(text, options = {}) {
    if (!text) {
      logWarn('[SpeechSynthesis] Empty text')
      return false
    }

    // Cancel any ongoing speech
    stop()

    // ── Try pre-recorded audio first ──
    const audioPath = findAudioForText(text)
    if (audioPath) {
      isSpeaking.value = true
      playAudioFile(audioPath, {
        onStart: () => {
          isSpeaking.value = true
          avatarStore.setState('SPEAKING')
          options.onStart?.()
        },
        onEnd: () => {
          isSpeaking.value = false
          avatarStore.setState('IDLE')
          options.onEnd?.()
          processQueue()
        },
        onError: () => {
          isSpeaking.value = false
          avatarStore.setState('IDLE')
          options.onError?.()
          processQueue()
        }
      })
      return true
    }

    // ── Fallback: Web Speech API TTS ──
    isSpeaking.value = true
    return speakWithTTS(text, options)
  }

  /**
   * Queue text to speak after current speech finishes
   */
  function speakLater(text, options = {}) {
    if (isSpeaking.value) {
      utteranceQueue.push({ text, options })
    } else {
      speak(text, options)
    }
  }

  /**
   * Stop speaking immediately
   */
  function stop() {
    // Stop Web Speech API
    if (synth) {
      synth.cancel()
    }
    // Stop any playing HTML5 audio
    if (currentAudioElement) {
      currentAudioElement.pause()
      currentAudioElement.src = ''
      currentAudioElement = null
    }
    isSpeaking.value = false
    avatarStore.setState('IDLE')
  }

  /**
   * Pause speaking
   */
  function pause() {
    if (synth) {
      synth.pause()
    }
  }

  /**
   * Resume speaking
   */
  function resume() {
    if (synth) {
      synth.resume()
    }
  }

  /**
   * Get available voices
   */
  function getVoices() {
    return voices
  }

  onUnmounted(() => {
    stop()
  })

  return {
    speak,
    speakLater,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported,
    getVoices,
    selectedVoice
  }
}
