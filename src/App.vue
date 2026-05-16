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

// ── Audio Recorder (pass socket getter) ──
const { init: initAudio, startRecording, stopRecording, dispose: disposeAudio } = useAudioRecorder(getSocket)

// ── Speech Recognition (local Web Speech API for STT) ──
// Track last sent text to avoid duplicate sends from STT
let lastSentText = ''
const sttCallback = (text, isInterim) => {
  logInfo('[App] STT result:', text, 'interim:', isInterim)
  if (!isInterim && text.trim()) {
    const trimmed = text.trim()
    // Dedup: skip if same as last sent
    if (trimmed === lastSentText) return
    lastSentText = trimmed
    // Send transcribed text to BFF for processing
    send(JSON.stringify({ type: 'user.text', text: trimmed }))
  }
}
const { start: startSTT, stop: stopSTT, isListening: isSTTListening, isSupported: isSTTSupported, networkFailed: isSTTNetworkFailed } = useSpeechRecognition({
  onResult: sttCallback,
  onNetworkError: () => {
    logWarn('[App] STT network failed, showing text input fallback')
    showTextInput.value = true
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
  } else {
    if (!isConnected.value) {
      logWarn('[App] WebSocket not connected, reconnecting...')
      connectWs()
      return
    }
    // 开始录音 + STT，数字人切到 LISTENING
    avatarStore.setState('LISTENING')
    startRecording()
    if (isSTTSupported.value && !isSTTNetworkFailed.value) {
      const started = startSTT()
      if (!started) {
        logWarn('[App] STT start failed, switching to text input')
        showTextInput.value = true
      }
    } else if (isSTTNetworkFailed.value) {
      logInfo('[App] STT network failed previously, showing text input')
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
