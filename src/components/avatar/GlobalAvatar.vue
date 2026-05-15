<script setup>
import { computed } from 'vue'
import { useAvatarStore } from '@/stores/avatar'
import LottiePlayer from './LottiePlayer.vue'
import WaveformVisualizer from './WaveformVisualizer.vue'
import MicButton from './MicButton.vue'

const emit = defineEmits(['toggle-mic'])
const avatarStore = useAvatarStore()

const statusText = computed(() => {
  switch (avatarStore.state) {
    case 'LISTENING': return '聆听中...'
    case 'SPEAKING': return '播报中...'
    default: return '待命中'
  }
})

const statusColor = computed(() => {
  switch (avatarStore.state) {
    case 'LISTENING': return 'text-cyber-teal'
    case 'SPEAKING': return 'text-cyber-cyan'
    default: return 'text-dark-muted'
  }
})

function handleAvatarClick() {
  emit('toggle-mic')
}
</script>

<template>
  <div class="global-avatar fixed bottom-8 right-8 z-[9999] flex flex-col items-center gap-3">
    <!-- Status Label -->
    <div class="status-label px-3 py-1 rounded-full glass text-xs font-medium transition-all duration-300"
      :class="statusColor">
      <span class="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
        :class="{
          'bg-dark-muted': avatarStore.isIdle,
          'bg-cyber-teal animate-pulse': avatarStore.isListening,
          'bg-cyber-cyan animate-pulse': avatarStore.isSpeaking
        }">
      </span>
      {{ statusText }}
    </div>

    <!-- Avatar Body -->
    <div class="avatar-body relative w-24 h-24 rounded-full glass glow-border flex items-center justify-center breath overflow-hidden cursor-pointer"
      @click="handleAvatarClick">

      <!-- Scan Line Effect -->
      <div class="scan-line absolute inset-0 pointer-events-none" v-if="!avatarStore.isIdle"></div>

      <!-- Hologram Glow -->
      <div class="absolute inset-0 rounded-full bg-cyber-cyan/10 blur-xl"></div>

      <!-- Lottie Animation Placeholder -->
      <LottiePlayer :state="avatarStore.state" />

      <!-- Waveform (when listening) -->
      <WaveformVisualizer v-if="avatarStore.isListening" class="absolute -bottom-1 left-1/2 -translate-x-1/2" />

      <!-- Speaking indicator rings -->
      <div v-if="avatarStore.isSpeaking"
        class="absolute inset-0 rounded-full border-2 border-cyber-cyan/50 animate-ping pointer-events-none">
      </div>
    </div>

    <!-- Mic Button (fallback) -->
    <MicButton @click="emit('toggle-mic')" />
  </div>
</template>

<style scoped>
.global-avatar {
  filter: drop-shadow(0 0 20px rgba(0, 212, 255, 0.2));
}

.avatar-body {
  background: radial-gradient(circle at 30% 30%, rgba(0, 212, 255, 0.15), transparent 70%),
    radial-gradient(circle at 70% 70%, rgba(0, 102, 255, 0.1), transparent 70%);
}
</style>
