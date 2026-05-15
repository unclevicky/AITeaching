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
 * Composable for browser-native speech recognition (Web Speech API)
 * Used as local STT to convert user's speech to text without MiniMax API
 *
 * @param {Function} onResult - Callback when transcription is complete (receives text)
 */
export function useSpeechRecognition(onResult) {
  const avatarStore = useAvatarStore()

  let recognition = null
  let isListening = ref(false)
  let isSupported = ref(false)

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SpeechRecognition) {
    isSupported.value = true
  }

  /**
   * Initialize speech recognition
   */
  function init() {
    if (!isSupported.value) {
      logWarn('[SpeechRecognition] Web Speech API not supported in this browser')
      return false
    }

    recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      isListening.value = true
      logInfo('[SpeechRecognition] Started listening')
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript) {
        logInfo('[SpeechRecognition] Final result:', finalTranscript)
        onResult?.(finalTranscript, false)
      } else if (interimTranscript) {
        logInfo('[SpeechRecognition] Interim result:', interimTranscript)
        onResult?.(interimTranscript, true)
      }
    }

    recognition.onerror = (event) => {
      logWarn('[SpeechRecognition] Error:', event.error)
      isListening.value = false

      if (event.error === 'no-speech') {
        logInfo('[SpeechRecognition] No speech detected')
      } else if (event.error === 'not-allowed') {
        logWarn('[SpeechRecognition] Microphone permission denied')
      }
    }

    recognition.onend = () => {
      isListening.value = false
      logInfo('[SpeechRecognition] Stopped listening')
    }

    return true
  }

  /**
   * Start listening
   */
  function start() {
    if (!recognition) {
      if (!init()) return false
    }

    if (isListening.value) {
      logInfo('[SpeechRecognition] Already listening')
      return true
    }

    try {
      recognition.start()
      return true
    } catch (err) {
      logWarn('[SpeechRecognition] Start error:', err.message)
      return false
    }
  }

  /**
   * Stop listening
   */
  function stop() {
    if (recognition && isListening.value) {
      try {
        recognition.stop()
      } catch (err) {
        logWarn('[SpeechRecognition] Stop error:', err.message)
      }
    }
    isListening.value = false
  }

  /**
   * Abort immediately
   */
  function abort() {
    if (recognition) {
      try {
        recognition.abort()
      } catch (err) {
        logWarn('[SpeechRecognition] Abort error:', err.message)
      }
    }
    isListening.value = false
  }

  onUnmounted(() => {
    abort()
  })

  return {
    init,
    start,
    stop,
    abort,
    isListening,
    isSupported
  }
}
