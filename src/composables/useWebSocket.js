import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAvatarStore } from '@/stores/avatar'
import { useSpeechSynthesis } from '@/composables/useSpeechSynthesis'

// ── Frontend logger: console + POST to /api/log ──
const rawConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
}

const LOG_BUFFER = []
const LOG_FLUSH_INTERVAL = 2000 // flush every 2 seconds
let flushTimer = null

function frontendLog(level, ...args) {
  const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '')
  const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
  const line = `[${timestamp}] [${level}] ${message}`

  // Console (use rawConsole to avoid recursion)
  if (level === 'ERROR') {
    rawConsole.error(line)
  } else if (level === 'WARN') {
    rawConsole.warn(line)
  } else {
    rawConsole.log(line)
  }

  // Buffer for server write
  LOG_BUFFER.push(line)

  // Start flush timer if not running
  if (!flushTimer) {
    flushTimer = setTimeout(flushLogs, LOG_FLUSH_INTERVAL)
  }
}

async function flushLogs() {
  flushTimer = null
  if (LOG_BUFFER.length === 0) return

  const lines = LOG_BUFFER.splice(0, LOG_BUFFER.length).join('\n') + '\n'

  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: lines
    })
  } catch (e) {
    // Silently ignore - don't break app for logging failures
  }

  // If more logs arrived while flushing, schedule another flush
  if (LOG_BUFFER.length > 0) {
    flushTimer = setTimeout(flushLogs, LOG_FLUSH_INTERVAL)
  }
}

const logInfo = (...args) => frontendLog('INFO', ...args)
const logWarn = (...args) => frontendLog('WARN', ...args)
const logError = (...args) => frontendLog('ERROR', ...args)

/**
 * Composable for WebSocket connection to BFF
 * Handles connection lifecycle, message routing, audio playback, and intent commands
 */
export function useWebSocket() {
  const router = useRouter()
  const avatarStore = useAvatarStore()

  // Local TTS (Web Speech Synthesis API)
  const { speak: localSpeak, stop: stopSpeaking, isSpeaking, isSupported: isTTSSupported } = useSpeechSynthesis()

  let ws = null
  let reconnectTimer = null
  let pingTimer = null
  let audioContext = null
  let audioQueue = []
  let isPlaying = false

  const isConnected = ref(false)
  const connectionStatus = ref('disconnected')
  const lastError = ref(null)

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    connectionStatus.value = 'connecting'
    avatarStore.setConnected(false)

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`

    logInfo('[WebSocket] Connecting to:', wsUrl)

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        logInfo('[WebSocket] Connected to BFF')
        isConnected.value = true
        connectionStatus.value = 'connected'
        avatarStore.setConnected(true)
        lastError.value = null
        startPing()
      }

      ws.onmessage = (event) => {
        logInfo('[WebSocket] 📨 raw message:', typeof event.data === 'string' ? event.data.slice(0, 120) : 'binary ' + event.data.byteLength + 'bytes')
        handleMessage(event.data)
      }

      ws.onerror = (err) => {
        logError('[WebSocket] Error:', err)
        lastError.value = 'WebSocket connection error'
        connectionStatus.value = 'error'
      }

      ws.onclose = () => {
        logInfo('[WebSocket] Disconnected')
        isConnected.value = false
        connectionStatus.value = 'disconnected'
        avatarStore.setConnected(false)
        stopPing()

        // Auto-reconnect after 3 seconds
        reconnectTimer = setTimeout(() => {
          connect()
        }, 3000)
      }
    } catch (err) {
      logError('[WebSocket] Connect error:', err)
      lastError.value = err.message
      connectionStatus.value = 'error'
    }
  }

  function handleMessage(data) {
    // Try JSON first
    try {
      const msg = JSON.parse(data)
      logInfo('[WebSocket] Received:', msg.type, msg)

      switch (msg.type) {
        case 'status':
          connectionStatus.value = msg.status
          if (msg.status === 'connected') {
            avatarStore.setConnected(true)
          }
          break

        case 'command':
          handleCommand(msg.command, msg.target)
          break

        case 'avatar_state':
          avatarStore.setState(msg.state)
          break

        case 'pong':
          break

        case 'user.text':
          logInfo('[WebSocket] User text:', msg.text)
          break

        case 'response.text.done':
        case 'response.text.delta':
          // 不立即 setState SPEAKING，等 TTS onStart 来设，避免闪烁
          logInfo('[WebSocket] Response text:', msg.text.slice(0, 30) + '...')
          // Use local TTS to speak the response
          if (msg.text && isTTSSupported.value) {
            localSpeak(msg.text, {
              rate: 1.0,
              pitch: 1.0,
              volume: 1.0,
              onStart: () => {
                logInfo('[WebSocket] TTS started -> SPEAKING')
                avatarStore.setState('SPEAKING')
              },
              onEnd: () => {
                logInfo('[WebSocket] TTS finished -> IDLE')
                avatarStore.setState('IDLE')
              },
              onError: () => {
                logWarn('[WebSocket] TTS error -> IDLE')
                avatarStore.setState('IDLE')
              }
            })
          } else {
            // TTS 不支持时，文字直接显示，2秒后回 IDLE
            avatarStore.setState('SPEAKING')
            setTimeout(() => avatarStore.setState('IDLE'), 2000)
          }
          break

        case 'response.audio.delta':
          // base64 audio chunk (from MiniMax T2A when balance available)
          if (msg.audio) {
            enqueueAudio(msg.audio)
          }
          avatarStore.setState('SPEAKING')
          break

        case 'response.audio.done':
          logInfo('[WebSocket] Audio response complete, size:', msg.size)
          break

        case 'play.audio.clip':
          // Play a pre-recorded audio file
          if (msg.clip) {
            playPreRecordedClip(msg.clip)
          }
          break

        case 'response.done':
          // BFF 的完成信号，仅作日志，状态由 TTS onEnd / playPreRecordedClip onended 控制
          logInfo('[WebSocket] BFF response.done received')
          break

        default:
          break
      }
    } catch (e) {
      // Binary data (raw audio buffer from BFF)
      logInfo('[WebSocket] Binary audio received, size:', data.byteLength || data.length)
      if (data.byteLength > 100 || data.length > 100) {
        playAudioBuffer(data)
      }
    }
  }

  /**
   * Initialize AudioContext for playback (must be called after user gesture)
   */
  function ensureAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }
    return audioContext
  }

  /**
   * Enqueue base64 audio chunk for playback
   */
  function enqueueAudio(base64Data) {
    audioQueue.push(base64Data)
    if (!isPlaying) {
      playNextInQueue()
    }
  }

  /**
   * Play next audio chunk from queue
   */
  async function playNextInQueue() {
    if (audioQueue.length === 0) {
      isPlaying = false
      return
    }

    isPlaying = true
    const base64 = audioQueue.shift()

    try {
      const ctx = ensureAudioContext()
      const binaryString = window.atob(base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Try to decode as audio (mp3/wav)
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer)
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      source.onended = () => {
        playNextInQueue()
      }
      source.start(0)
    } catch (err) {
      logWarn('[WebSocket] Audio decode failed, trying next:', err.message)
      playNextInQueue()
    }
  }

  /**
   * Play a raw audio buffer (from binary WebSocket message)
   */
  async function playAudioBuffer(buffer) {
    try {
      const ctx = ensureAudioContext()
      const audioBuffer = await ctx.decodeAudioData(buffer)
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      source.start(0)
    } catch (err) {
      logWarn('[WebSocket] Raw audio decode failed:', err.message)
    }
  }

  /**
   * Play a pre-recorded audio clip from src/assets/audio/
   * Uses HTML5 Audio element for reliable MP3 playback
   */
  function playPreRecordedClip(filename) {
    const audioPath = `/audio/${filename}`
    logInfo('[WebSocket] Playing pre-recorded clip:', audioPath)

    const audio = new Audio(audioPath)

    audio.onplay = () => {
      logInfo('[WebSocket] Clip playback started')
      avatarStore.setState('SPEAKING')
    }

    audio.onended = () => {
      logInfo('[WebSocket] Clip playback finished')
      avatarStore.setState('IDLE')
    }

    audio.onerror = (err) => {
      logWarn('[WebSocket] Clip playback error:', err)
      avatarStore.setState('IDLE')
    }

    audio.play().catch(err => {
      logWarn('[WebSocket] Play failed (autoplay policy?):', err.message)
      avatarStore.setState('IDLE')
    })
  }

  function handleCommand(command, target) {
    logInfo('[WebSocket] Command:', command, '->', target)
    avatarStore.setCommand(command)
    avatarStore.setState('SPEAKING')

    if (target) {
      router.push(target)
    }

    setTimeout(() => {
      avatarStore.setCommand(null)
    }, 1000)
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data)
      return true
    }
    return false
  }

  /** Get the raw WebSocket instance (for audio recorder) */
  function getSocket() {
    return ws
  }

  /** Check if socket is ready for sending */
  function isSocketReady() {
    return ws && ws.readyState === WebSocket.OPEN
  }

  function startPing() {
    stopPing()
    pingTimer = setInterval(() => {
      send(JSON.stringify({ type: 'ping' }))
    }, 30000)
  }

  function stopPing() {
    if (pingTimer) {
      clearInterval(pingTimer)
      pingTimer = null
    }
  }

  function disconnect() {
    stopPing()
    stopSpeaking() // Stop any ongoing TTS
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
    isConnected.value = false
    connectionStatus.value = 'disconnected'
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    connect,
    disconnect,
    send,
    getSocket,
    isSocketReady,
    isConnected,
    connectionStatus,
    lastError
  }
}
