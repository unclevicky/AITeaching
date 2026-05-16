import { ref, onUnmounted } from 'vue'
import { useAudioStore } from '@/stores/audio'
import { useAvatarStore } from '@/stores/avatar'

// Inline logger for this module (avoids circular deps)
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
 * Composable for browser microphone audio recording
 * Uses Web Audio API to capture audio, encodes as base64 PCM chunks,
 * and sends via WebSocket as JSON { type: 'user.audio', audio: base64 }
 *
 * @param {Function} getSocket - Function that returns the current WebSocket instance
 */
export function useAudioRecorder(getSocket) {
  const audioStore = useAudioStore()
  const avatarStore = useAvatarStore()

  let audioContext = null
  let mediaStream = null
  let processor = null
  let workletRegistered = false

  const isInitialized = ref(false)

  /**
   * Initialize audio context and request microphone permission
   */
  async function init() {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
      }
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      audioStore.setPermission(true)
      audioStore.clearError()
      isInitialized.value = true
      logInfo('[AudioRecorder] Initialized successfully')
      return true
    } catch (err) {
      logError('[AudioRecorder] Init error:', err)
      audioStore.setError(err.message || '麦克风权限被拒绝')
      audioStore.setPermission(false)
      return false
    }
  }

  /**
   * Start recording and sending audio via WebSocket
   */
  function startRecording() {
    if (!isInitialized.value || !mediaStream) {
      logWarn('[AudioRecorder] Not initialized, trying to init first...')
      init().then(ok => {
        if (ok) doStartRecording()
      })
      return
    }
    doStartRecording()
  }

  function doStartRecording() {
    const ws = getSocket?.()
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logError('[AudioRecorder] WebSocket not ready')
      return
    }

    const source = audioContext.createMediaStreamSource(mediaStream)

    // Try AudioWorklet first, fall back to ScriptProcessor
    if (audioContext.audioWorklet) {
      initAudioWorklet(source)
    } else {
      initScriptProcessor(source)
    }

    audioStore.setRecording(true)
    avatarStore.setMicActive(true)
    logInfo('[AudioRecorder] Recording started')
  }

  function initScriptProcessor(source) {
    const bufferSize = 4096
    processor = audioContext.createScriptProcessor(bufferSize, 1, 1)

    processor.onaudioprocess = (e) => {
      if (!audioStore.isRecording) return

      const inputData = e.inputBuffer.getChannelData(0)

      // Calculate audio level for visualization + VAD
      let sum = 0
      for (let i = 0; i < inputData.length; i++) {
        sum += Math.abs(inputData[i])
      }
      const level = (sum / inputData.length) * 5
      audioStore.setAudioLevel(level)

      // VAD: skip sending if audio level is below threshold (silence)
      const VAD_THRESHOLD = 0.01
      if (level < VAD_THRESHOLD) return

      // Convert to 16-bit PCM, then base64, send as JSON
      const pcmBuffer = floatTo16BitPCM(inputData)
      const base64 = arrayBufferToBase64(pcmBuffer)
      const ws = getSocket?.()
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'user.audio', audio: base64 }))
      }
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
  }

  async function initAudioWorklet(source) {
    try {
      if (!workletRegistered) {
        const workletCode = `
          class AudioProcessor extends AudioWorkletProcessor {
            process(inputs) {
              const input = inputs[0]
              if (input.length > 0) {
                this.port.postMessage(input[0])
              }
              return true
            }
          }
          registerProcessor('audio-recorder', AudioProcessor)
        `
        const blob = new Blob([workletCode], { type: 'application/javascript' })
        const workletUrl = URL.createObjectURL(blob)
        await audioContext.audioWorklet.addModule(workletUrl)
        URL.revokeObjectURL(workletUrl)
        workletRegistered = true
      }

      const workletNode = new AudioWorkletNode(audioContext, 'audio-recorder')

      workletNode.port.onmessage = (e) => {
        if (!audioStore.isRecording) return

        const channelData = e.data
        let sum = 0
        for (let i = 0; i < channelData.length; i++) {
          sum += Math.abs(channelData[i])
        }
        const level = (sum / channelData.length) * 5
        audioStore.setAudioLevel(level)

        // VAD: skip sending if audio level is below threshold (silence)
        if (level < 0.01) return

        const pcmBuffer = floatTo16BitPCM(channelData)
        const base64 = arrayBufferToBase64(pcmBuffer)
        const ws = getSocket?.()
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'user.audio', audio: base64 }))
        }
      }

      source.connect(workletNode)
      processor = workletNode
    } catch (err) {
      logWarn('[AudioRecorder] AudioWorklet failed, falling back:', err)
      initScriptProcessor(source)
    }
  }

  function stopRecording() {
    if (processor) {
      try { processor.disconnect() } catch {}
      try { processor.port?.close() } catch {}
      processor = null
    }
    audioStore.setRecording(false)
    audioStore.setAudioLevel(0)
    avatarStore.setMicActive(false)
    logInfo('[AudioRecorder] Recording stopped')
  }

  function dispose() {
    stopRecording()
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      mediaStream = null
    }
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    isInitialized.value = false
  }

  function floatTo16BitPCM(floatArray) {
    const buffer = new ArrayBuffer(floatArray.length * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < floatArray.length; i++) {
      const s = Math.max(-1, Math.min(1, floatArray[i]))
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    }
    return buffer
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  onUnmounted(() => {
    dispose()
  })

  return {
    init,
    startRecording,
    stopRecording,
    dispose,
    isInitialized
  }
}
