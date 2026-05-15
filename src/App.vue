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
const { start: startSTT, stop: stopSTT, isListening: isSTTListening, isSupported: isSTTSupported } = useSpeechRecognition(sttCallback)

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
    // 停止录音和识别
    stopRecording()
    stopSTT()
    // 停止后切回 IDLE（如果当前还在 LISTENING）
    if (avatarStore.state === 'LISTENING') {
      avatarStore.setState('IDLE')
    }
  } else {
    if (!isConnected.value) {
      logWarn('[App] WebSocket not connected, reconnecting...')
      connectWs()
      return
    }
    // 开始录音 + STT，数字人切到 LISTENING
    avatarStore.setState('LISTENING')
    startRecording()
    if (isSTTSupported.value) {
      startSTT()
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
</style>
