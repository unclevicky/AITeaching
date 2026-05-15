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
 * @param {Object} options
 * @param {Function} options.onResult - Callback when transcription is complete (receives text, isInterim)
 * @param {Function} options.onNetworkError - Callback when STT network fails (STT unusable)
 */
export function useSpeechRecognition(options = {}) {
  const { onResult, onNetworkError } = options
  const avatarStore = useAvatarStore()

  let recognition = null
  let isListening = ref(false)
  let isSupported = ref(false)
  let consecutiveErrors = 0
  const MAX_CONSECUTIVE_ERRORS = 3
  let networkFailed = ref(false)

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SpeechRecognition) {
    isSupported.value = true
  }

  function createRecognition() {
    const rec = new SpeechRecognition()
    rec.lang = 'zh-CN'
    rec.continuous = false
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onstart = () => {
      isListening.value = true
      logInfo('[SpeechRecognition] Started listening')
    }

    rec.onresult = (event) => {
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
        consecutiveErrors = 0  // reset on success
        networkFailed.value = false
        logInfo('[SpeechRecognition] Final result:', finalTranscript)
        onResult?.(finalTranscript, false)
      } else if (interimTranscript) {
        logInfo('[SpeechRecognition] Interim result:', interimTranscript)
        onResult?.(interimTranscript, true)
      }
    }

    rec.onerror = (event) => {
      logWarn('[SpeechRecognition] Error:', event.error)
      isListening.value = false

      if (event.error === 'network') {
        consecutiveErrors++
        if (!networkFailed.value) {
          networkFailed.value = true
          logWarn('[SpeechRecognition] Network error — Web Speech API unreachable')
          // Immediately notify caller so UI can react (show text input etc.)
          onNetworkError?.()
        }
      } else if (event.error === 'no-speech') {
        logInfo('[SpeechRecognition] No speech detected')
      } else if (event.error === 'not-allowed') {
        logWarn('[SpeechRecognition] Microphone permission denied')
      } else if (event.error === 'aborted') {
        logInfo('[SpeechRecognition] Aborted')
      }
    }

    rec.onend = () => {
      isListening.value = false
      logInfo('[SpeechRecognition] Stopped listening')
    }

    return rec
  }

  /**
   * Initialize speech recognition
   */
  function init() {
    if (!isSupported.value) {
      logWarn('[SpeechRecognition] Web Speech API not supported in this browser')
      return false
    }

    recognition = createRecognition()
    return true
  }

  /**
   * Start listening
   */
  function start() {
    // If STT has failed too many times, don't try again
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      logWarn('[SpeechRecognition] Too many consecutive errors, STT disabled')
      return false
    }

    if (!recognition) {
      if (!init()) return false
    }

    if (isListening.value) {
      logInfo('[SpeechRecognition] Already listening')
      return true
    }

    // Recreate recognition each time to avoid stale state
    if (recognition) {
      recognition.onstart = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
    }
    recognition = createRecognition()

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
    isSupported,
    networkFailed
  }
}
