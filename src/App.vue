<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAvatarStore } from '@/stores/avatar'
import { useWebSocket } from '@/composables/useWebSocket'
import { useAudioRecorder } from '@/composables/useAudioRecorder'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'
import SideNav from '@/components/layout/SideNav.vue'
import GlobalAvatar from '@/components/avatar/GlobalAvatar.vue'
import EnterSystemModal from '@/components/common/EnterSystemModal.vue'

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

const router = useRouter()
const avatarStore = useAvatarStore()

// ── WebSocket ──
const { connect: connectWs, disconnect: disconnectWs, send, getSocket, isConnected, connectionStatus } = useWebSocket()

// ── Audio Recorder (pass socket getter + audio data callback) ──
const { init: initAudio, startRecording, stopRecording, dispose: disposeAudio } = useAudioRecorder(getSocket, {
  onAudioData: (data) => {
    pendingAudioData = data.audio
    pendingSampleRate = data.sampleRate || 16000
    logInfo('[App] 音频数据已准备，长度:', data.audio.length, '采样率:', pendingSampleRate)
  }
})

// ── Speech Recognition (local Web Speech API for STT, with Baidu fallback) ──
// Track last sent text to avoid duplicate sends from STT
let lastSentText = ''
let pendingAudioData = null // 存储录音数据，用于百度识别
let pendingSampleRate = 16000 // 音频采样率，降采样后为 8000
let sttSucceeded = false // 标记 Web Speech API 是否成功返回结果

const sttCallback = (text, isInterim) => {
  logInfo('[App] STT result:', text, 'interim:', isInterim)
  if (!isInterim && text.trim()) {
    sttSucceeded = true // 标记成功
    const trimmed = text.trim()
    // Dedup: skip if same as last sent
    if (trimmed === lastSentText) return
    lastSentText = trimmed
    // Send transcribed text to BFF for processing
    send(JSON.stringify({ type: 'user.text', text: trimmed }))
  }
}
const { start: startSTT, stop: stopSTT, isListening: isSTTListening, isSupported: isSTTSupported, networkFailed: isSTTNetworkFailed, baiduConfigured, recognizeWithBaidu, useBaiduFallback } = useSpeechRecognition({
  onResult: sttCallback,
  onNetworkError: () => {
    logWarn('[App] STT network failed')
    // 如果百度已配置，不显示文字输入，等待录音结束后用百度识别
    if (!baiduConfigured.value) {
      logWarn('[App] 百度未配置，显示文字输入 fallback')
      showTextInput.value = true
    } else {
      logInfo('[App] 百度已配置，将在录音结束后自动识别')
    }
  },
  onAudioData: (audioData) => {
    // 保存音频数据，录音停止后使用百度识别
    pendingAudioData = audioData
    logInfo('[App] 音频数据已保存，长度:', audioData.length)
  }
})

// ── Text input fallback when STT is unavailable ──
const textInput = ref('')
const showTextInput = ref(false)

const quickCommands = [
  { label: '打开大屏', text: '打开大屏' },
  { label: '实时监控', text: '实时监控' },
  { label: '战创伤分析', text: '战创伤分析' },
  { label: '开始诊断', text: '开始诊断' },
  { label: '打开PPT', text: '打开PPT' },
  { label: '开始测试', text: '开始测试' },
  { label: '胰腺损伤测验', text: '胰腺损伤测验' },
  { label: '教学模拟', text: '教学模拟' },
]

function handleTextSubmit() {
  const text = textInput.value.trim()
  if (!text) return
  logInfo('[App] Text input submit:', text)
  send(JSON.stringify({ type: 'user.text', text }))
  textInput.value = ''
}

const showEnterModal = ref(true)

// ── Enter System: init audio + connect WS ──
async function handleEnterSystem() {
  showEnterModal.value = false

  // 1. Request mic permission & resume AudioContext
  await initAudio()

  // 2. Connect WebSocket to BFF
  connectWs()
}

// ── Toggle microphone ──
function toggleMic() {
  if (avatarStore.isMicActive) {
    // 停止录音（关闭麦克风）
    stopRecording()
    // 同时停止 STT — 用户主动结束输入
    // 注意：如果 STT 已经 network failed，stopSTT 是 no-op（isListening 已经是 false）
    stopSTT()

    // 延迟触发百度识别，等待 Web Speech API 的 error/result 回调完成
    // 如果 Web Speech API 已成功返回结果（sttSucceeded=true），就不再调用百度
    const audioDataSnapshot = pendingAudioData
    const srSnapshot = pendingSampleRate
    const sttSucceededSnapshot = sttSucceeded
    logInfo('[App] 设置百度识别定时器, pendingAudioData:', audioDataSnapshot ? audioDataSnapshot.length : null, 'sampleRate:', srSnapshot, 'sttSucceeded:', sttSucceededSnapshot)
    setTimeout(() => {
      logInfo('[App] 百度识别定时器触发, baiduConfigured:', baiduConfigured.value, 'hasAudioData:', !!audioDataSnapshot, 'sttSucceeded:', sttSucceeded)
      if (baiduConfigured.value && audioDataSnapshot && !sttSucceeded) {
        logInfo('[App] Web Speech API 未返回结果，使用百度语音识别...')
        recognizeWithBaidu(audioDataSnapshot, srSnapshot)
      } else {
        logInfo('[App] 跳过百度识别, 原因:', !baiduConfigured.value ? '百度未配置' : !audioDataSnapshot ? '无音频数据' : 'sttSucceeded=true')
      }
      // 重置标志，为下次录音做准备
      sttSucceeded = false
      pendingAudioData = null
    }, 500)
  } else {
    // 重置状态，准备新的录音
    showTextInput.value = false
    sttSucceeded = false  // 关键：在录音开始时重置
    pendingAudioData = null

    if (!isConnected.value) {
      logWarn('[App] WebSocket not connected, reconnecting...')
      connectWs()
      return
    }
    // 开始录音 + STT，数字人切到 LISTENING
    avatarStore.setState('LISTENING')
    startRecording()

    // 优先使用 Web Speech API（本地，更快）
    if (isSTTSupported.value && !isSTTNetworkFailed.value) {
      const started = startSTT()
      if (!started) {
        logWarn('[App] STT start failed, switching to text input')
        showTextInput.value = true
      }
    } else if (isSTTNetworkFailed.value) {
      // Web Speech API 不可用，如果百度已配置则等待录音后用百度识别
      if (baiduConfigured.value) {
        logInfo('[App] Web Speech API 不可用，将使用百度语音识别')
        // 清除文字输入，让用户专注于说话
        showTextInput.value = false
      } else {
        logInfo('[App] STT network failed previously, showing text input')
        showTextInput.value = true
      }
    } else if (!isSTTSupported.value && baiduConfigured.value) {
      // 浏览器不支持 Web Speech API，使用百度
      logInfo('[App] 浏览器不支持 Web Speech API，将使用百度语音识别')
    } else {
      showTextInput.value = true
    }
  }
}

// ── Keyboard shortcuts ──
function handleKeydown(e) {
  if (showEnterModal.value) return

  switch (e.code) {
    case 'Space':
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        toggleMic()
      }
      break
    case 'Digit1':
      router.push('/dashboard')
      break
    case 'Digit2':
      router.push('/diagnosis')
      break
    case 'Digit3':
      router.push('/presentation')
      break
    case 'Digit4':
      router.push('/exam')
      break
    case 'Digit5':
      router.push('/realtime')
      break
    case 'Digit6':
      router.push('/trauma')
      break
    case 'Digit7':
      router.push('/pancreas-injury')
      break
    case 'Digit8':
      router.push('/surgery-simulation')
      break
    case 'Escape':
      if (avatarStore.isMicActive) {
        stopRecording()
        stopSTT()
      }
      break
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  stopRecording()
  stopSTT()
  disposeAudio()
  disconnectWs()
})
</script>

<template>
  <div class="app-container relative w-full h-full overflow-hidden">
    <SideNav />

    <main class="main-content absolute left-16 top-0 right-0 bottom-0 overflow-y-auto scrollbar-thin">
      <router-view v-slot="{ Component }">
        <Transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <GlobalAvatar @toggle-mic="toggleMic" />

    <!-- Text input fallback: shown when Web Speech API is unavailable or network-failed -->
    <Transition name="slide-up">
      <div v-if="showTextInput && !showEnterModal"
        class="fixed bottom-36 right-8 z-[9999] w-80">
        <div class="glass-panel rounded-xl p-3 shadow-2xl">
          <!-- Header -->
          <div class="flex items-center gap-2 mb-2">
            <div class="w-2 h-2 rounded-full" :class="isSTTNetworkFailed ? 'bg-amber-400' : 'bg-cyber-teal'"></div>
            <span class="text-xs text-dark-muted">
              {{ isSTTNetworkFailed ? '语音识别不可用，请输入文字' : '同时支持文字输入' }}
            </span>
            <button @click="showTextInput = false" class="ml-auto text-dark-muted hover:text-white transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <!-- Input area -->
          <form @submit.prevent="handleTextSubmit" class="flex gap-2">
            <input
              v-model="textInput"
              type="text"
              placeholder="输入您想说的话..."
              class="flex-1 bg-dark-bg/80 border border-dark-border/50 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-muted focus:outline-none focus:border-cyber-teal/50 transition-colors"
            />
            <button
              type="submit"
              class="px-4 py-2 bg-cyber-teal/20 hover:bg-cyber-teal/30 text-cyber-teal rounded-lg text-sm font-medium transition-colors"
            >
              发送
            </button>
          </form>
          <!-- Quick commands -->
          <div class="flex flex-wrap gap-1.5 mt-2">
            <button v-for="cmd in quickCommands" :key="cmd.text"
              @click="textInput = cmd.text; handleTextSubmit()"
              class="px-2 py-1 text-xs rounded-md bg-dark-surface/60 text-dark-muted hover:text-cyber-teal hover:bg-dark-surface transition-colors">
              {{ cmd.label }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <EnterSystemModal v-if="showEnterModal" @enter="handleEnterSystem" />
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
