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
 * @param {Object} options - Configuration options
 * @param {Function} options.onAudioData - Callback with complete audio data when recording stops (base64 PCM)
 */
export function useAudioRecorder(getSocket, options = {}) {
  const { onAudioData } = options
  const audioStore = useAudioStore()
  const avatarStore = useAvatarStore()

  let audioContext = null
  let mediaStream = null
  let processor = null
  let workletRegistered = false
  let pcmChunks = [] // 收集原始 PCM ArrayBuffer 用于百度识别

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
      logInfo('[AudioRecorder] Initialized successfully, AudioContext sampleRate:', audioContext.sampleRate)
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

    pcmChunks = [] // 清空之前的录音数据
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

      // Convert to 16-bit PCM
      const pcmBuffer = floatTo16BitPCM(inputData)

      // 保存原始 PCM 数据用于百度识别（避免 base64 拼接对齐问题）
      // 不再使用VAD过滤，确保完整录音数据被保存
      pcmChunks.push(pcmBuffer)

      // base64 encode for WebSocket
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

        const pcmBuffer = floatTo16BitPCM(channelData)

        // 保存原始 PCM 数据用于百度识别（避免 base64 拼接对齐问题）
        // 不再使用VAD过滤，确保完整录音数据被保存
        pcmChunks.push(pcmBuffer)

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

    // 合并所有 PCM chunks 并回调
    if (pcmChunks.length > 0 && onAudioData) {
      // 合并多个 ArrayBuffer 为一个 Int16Array
      let totalBytes = 0
      for (const chunk of pcmChunks) totalBytes += chunk.byteLength
      const merged = new Int16Array(totalBytes / 2)
      let offset = 0
      for (const chunk of pcmChunks) {
        const src = new Int16Array(chunk)
        merged.set(src, offset)
        offset += src.length
      }

      // 获取 AudioContext 实际采样率（通常是 44100 或 48000）
      const sourceRate = audioContext ? audioContext.sampleRate : 44100
      // 百度语音识别仅支持 8000 和 16000，使用 8000 以减少数据量
      const targetRate = 8000

      // 使用线性插值从 sourceRate 重采样到 targetRate
      const resampled = resample(merged, sourceRate, targetRate)

      const combinedBase64 = arrayBufferToBase64(resampled.buffer)
      logInfo('[AudioRecorder] 录音完成, sourceRate:', sourceRate, '→ targetRate:', targetRate,
        '原始样本数:', merged.length, '重采样后:', resampled.length, 'bytes:', totalBytes)
      onAudioData({ audio: combinedBase64, sampleRate: targetRate })
      pcmChunks = []
    } else {
      logInfo('[AudioRecorder] Recording stopped (no audio data)')
    }
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

  /**
   * 线性插值重采样：从 sourceRate 重采样到 targetRate（百度语音识别要求 8000Hz 或 16000Hz）
   */
  function resample(samples, sourceRate, targetRate) {
    const ratio = sourceRate / targetRate
    const outputLength = Math.floor(samples.length / ratio)
    const output = new Int16Array(outputLength)
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio
      const srcIndexFloor = Math.floor(srcIndex)
      const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1)
      const t = srcIndex - srcIndexFloor
      output[i] = Math.round(samples[srcIndexFloor] * (1 - t) + samples[srcIndexCeil] * t)
    }
    return output
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
