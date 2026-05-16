<script setup>
import { computed } from 'vue'
import { useAvatarStore } from '@/stores/avatar'
import VideoPlayer from './VideoPlayer.vue'
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
    <div class="status-label px-4 py-1.5 rounded-full glass text-xs font-medium transition-all duration-300"
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

    <!-- Avatar Body — circular holographic style -->
    <div class="avatar-body relative cursor-pointer group"
      @click="handleAvatarClick">

      <!-- Outer glow ring (pulsing when active) -->
      <div class="absolute -inset-3 rounded-full transition-all duration-500"
        :class="{
          'opacity-0 group-hover:opacity-50': avatarStore.isIdle,
          'opacity-80 animate-pulse': avatarStore.isListening || avatarStore.isSpeaking
        }"
        :style="{
          background: avatarStore.isListening
            ? 'radial-gradient(circle, rgba(0,204,170,0.55) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(0,212,255,0.55) 0%, transparent 70%)'
        }">
      </div>

      <!-- Rotating border ring (slow spin when active) -->
      <div class="absolute -inset-2 rounded-full border border-dashed transition-all duration-500"
        :class="{
          'border-cyber-cyan/30': avatarStore.isIdle,
          'border-cyber-teal/60 animate-[spin_8s_linear_infinite]': avatarStore.isListening,
          'border-cyber-cyan/70 animate-[spin_4s_linear_infinite]': avatarStore.isSpeaking
        }">
      </div>

      <!-- Main circular avatar container -->
      <div class="relative w-28 h-28 rounded-full overflow-hidden bg-dark-bg
                  transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(0,212,255,0.3)]">

        <!-- Video player fills the circle -->
        <VideoPlayer :state="avatarStore.state" />

        <!-- Scan line effect (when not idle) -->
        <div v-if="!avatarStore.isIdle"
          class="scan-line absolute inset-0 pointer-events-none z-10">
        </div>
      </div>

      <!-- Speaking indicator rings -->
      <div v-if="avatarStore.isSpeaking"
        class="absolute -inset-4 rounded-full border-2 border-cyber-cyan/50 animate-ping pointer-events-none">
      </div>

      <!-- Bottom platform glow -->
      <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-3 rounded-full bg-cyber-cyan/30 blur-lg"></div>
    </div>

    <!-- Mic Button -->
    <MicButton @click="emit('toggle-mic')" />
  </div>
</template>

<style scoped>
.global-avatar {
  filter: drop-shadow(0 4px 40px rgba(0, 212, 255, 0.25));
}

.avatar-body {
  perspective: 800px;
}

/* Scan line animation */
.scan-line {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 212, 255, 0.05) 50%,
    transparent 100%
  );
  animation: scan-move 3s linear infinite;
}

@keyframes scan-move {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
</style>
