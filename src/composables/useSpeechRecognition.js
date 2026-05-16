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
 * Composable for speech recognition
 * Supports Web Speech API (browser native) and Baidu Speech API (fallback)
 *
 * @param {Object} options
 * @param {Function} options.onResult - Callback when transcription is complete (receives text, isInterim)
 * @param {Function} options.onNetworkError - Callback when STT network fails (STT unusable)
 * @param {Function} options.onAudioData - Callback with audio buffer when recording stops (for Baidu API)
 */
export function useSpeechRecognition(options = {}) {
  const { onResult, onNetworkError, onAudioData } = options
  const avatarStore = useAvatarStore()

  let recognition = null
  let isListening = ref(false)
  let isSupported = ref(false)
  let consecutiveErrors = 0
  const MAX_CONSECUTIVE_ERRORS = 3
  let networkFailed = ref(false)
  let baiduConfigured = ref(false)
  let useBaiduFallback = ref(false)

  // 检查百度语音识别是否可用
  async function checkBaiduStatus() {
    try {
      const res = await fetch('/api/speech/status')
      const data = await res.json()
      baiduConfigured.value = data.configured
      logInfo('[SpeechRecognition] 百度语音识别配置状态:', data.configured ? '已配置' : '未配置')
    } catch (e) {
      baiduConfigured.value = false
    }
  }

  // 初始化时检查百度状态
  checkBaiduStatus()

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

  /**
   * 使用百度语音识别 API 识别音频
   * @param {string} base64Pcm - Base64 编码的 PCM 音频数据
   */
  async function recognizeWithBaidu(base64Pcm, sampleRate) {
    if (!baiduConfigured.value) {
      logWarn('[SpeechRecognition] 百度语音识别未配置，跳过')
      return
    }

    // 兼容旧调用方式（纯字符串）和新调用方式（{ audio, sampleRate } 对象）
    const audioStr = typeof base64Pcm === 'string' ? base64Pcm : base64Pcm.audio
    const sr = sampleRate || (typeof base64Pcm === 'object' ? base64Pcm.sampleRate : 16000)

    logInfo('[SpeechRecognition] 使用百度语音识别...')
    useBaiduFallback.value = true

    try {
      logInfo('[SpeechRecognition] 发送百度识别请求, audio length:', audioStr.length, 'sampleRate:', sr)
      const res = await fetch('/api/speech/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioStr,
          sampleRate: sr,
          devPid: 1537 // 中文普通话
        })
      })

      logInfo('[SpeechRecognition] 百度 API 响应状态:', res.status, res.ok)

      let data
      try {
        data = await res.json()
      } catch {
        // 响应不是合法 JSON（如 HTML 错误页）
        const text = await res.text().catch(() => '')
        logError('[SpeechRecognition] 百度 API 返回非 JSON 响应, status:', res.status, 'body:', text.slice(0, 300))
        consecutiveErrors++
        if (!networkFailed.value) {
          networkFailed.value = true
          onNetworkError?.()
        }
        return
      }

      if (data.text) {
        logInfo('[SpeechRecognition] 百度识别结果:', data.text)
        consecutiveErrors = 0
        networkFailed.value = false
        useBaiduFallback.value = false
        onResult?.(data.text, false)
      } else if (data.error) {
        // 后端返回了结构化错误（音频过短、API 异常等）
        logWarn('[SpeechRecognition] 百度识别失败:', data.error)
        // 音频过短等服务端校验错误不视为网络错误，不触发 onNetworkError
        if (res.status >= 500 || data.error.includes('API 响应异常')) {
          consecutiveErrors++
          if (!networkFailed.value) {
            networkFailed.value = true
            onNetworkError?.()
          }
        }
      }
    } catch (err) {
      // 真正的网络错误（fetch 失败）
      logError('[SpeechRecognition] 百度 API 调用失败:', err.message)
      consecutiveErrors++
      if (!networkFailed.value) {
        networkFailed.value = true
        onNetworkError?.()
      }
    }
  }

  return {
    init,
    start,
    stop,
    abort,
    isListening,
    isSupported,
    networkFailed,
    baiduConfigured,
    recognizeWithBaidu,
    useBaiduFallback
  }
}
