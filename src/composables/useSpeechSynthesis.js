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
 * Composable for browser-native speech synthesis (text-to-speech)
 * Uses Web Speech API to speak text without any external API
 *
 * Features:
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
   * Speak a text string
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
    if (!isSupported.value || !text) {
      logWarn('[SpeechSynthesis] Not supported or empty text')
      return false
    }

    // Cancel any ongoing speech
    stop()

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
      logInfo('[SpeechSynthesis] Started speaking:', text.slice(0, 30) + '...')
      options.onStart?.()
    }

    utterance.onend = () => {
      isSpeaking.value = false
      avatarStore.setState('IDLE')
      logInfo('[SpeechSynthesis] Finished speaking')
      options.onEnd?.()

      // Process next in queue
      if (utteranceQueue.length > 0) {
        const next = utteranceQueue.shift()
        speak(next.text, next.options)
      }
    }

    utterance.onerror = (event) => {
      isSpeaking.value = false
      avatarStore.setState('IDLE')
      logWarn('[SpeechSynthesis] Error:', event.error)
      options.onError?.(event)
    }

    // Speak
    synth.speak(utterance)
    return true
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
    if (synth) {
      synth.cancel()
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
