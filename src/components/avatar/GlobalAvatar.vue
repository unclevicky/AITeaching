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

    <!-- Avatar Body — 3D holographic style -->
    <div class="avatar-body relative cursor-pointer group"
      @click="handleAvatarClick">

      <!-- Outer glow ring (pulsing when active) -->
      <div class="absolute -inset-3 rounded-full transition-all duration-500"
        :class="{
          'opacity-0 group-hover:opacity-40': avatarStore.isIdle,
          'opacity-60 animate-pulse': avatarStore.isListening || avatarStore.isSpeaking
        }"
        :style="{
          background: avatarStore.isListening
            ? 'radial-gradient(circle, rgba(0,204,170,0.4) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(0,212,255,0.4) 0%, transparent 70%)'
        }">
      </div>

      <!-- Rotating border ring (slow spin when speaking) -->
      <div class="absolute -inset-2 rounded-full border border-dashed transition-all duration-500"
        :class="{
          'border-dark-border/30': avatarStore.isIdle,
          'border-cyber-teal/40 animate-[spin_8s_linear_infinite]': avatarStore.isListening,
          'border-cyber-cyan/50 animate-[spin_4s_linear_infinite]': avatarStore.isSpeaking
        }">
      </div>

      <!-- Main avatar container — glass card with depth -->
      <div class="relative w-28 h-28 rounded-2xl overflow-hidden glass-panel shadow-2xl
                  transition-all duration-300 group-hover:scale-105 group-hover:shadow-cyber-cyan/20"
        :style="{
          transform: avatarStore.isListening ? 'perspective(600px) rotateY(-3deg)'
                   : avatarStore.isSpeaking ? 'perspective(600px) rotateY(3deg)'
                   : 'perspective(600px) rotateY(0deg)'
        }">

        <!-- Inner dark background -->
        <div class="absolute inset-0 bg-gradient-to-br from-dark-surface/90 to-dark-bg/95"></div>

        <!-- Video player -->
        <div class="absolute inset-0 flex items-center justify-center p-2">
          <VideoPlayer :state="avatarStore.state" />
        </div>

        <!-- Scan line effect (when not idle) -->
        <div v-if="!avatarStore.isIdle"
          class="scan-line absolute inset-0 pointer-events-none z-10">
        </div>

        <!-- Corner accents -->
        <div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg transition-colors duration-300"
          :class="avatarStore.isIdle ? 'border-dark-border/50' : 'border-cyber-cyan/60'"></div>
        <div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg transition-colors duration-300"
          :class="avatarStore.isIdle ? 'border-dark-border/50' : 'border-cyber-cyan/60'"></div>
        <div class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg transition-colors duration-300"
          :class="avatarStore.isIdle ? 'border-dark-border/50' : 'border-cyber-cyan/60'"></div>
        <div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg transition-colors duration-300"
          :class="avatarStore.isIdle ? 'border-dark-border/50' : 'border-cyber-cyan/60'"></div>
      </div>

      <!-- Speaking indicator rings -->
      <div v-if="avatarStore.isSpeaking"
        class="absolute -inset-4 rounded-2xl border-2 border-cyber-cyan/30 animate-ping pointer-events-none">
      </div>

      <!-- Bottom platform shadow -->
      <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-2 rounded-full bg-cyber-cyan/20 blur-md"></div>
    </div>

    <!-- Mic Button -->
    <MicButton @click="emit('toggle-mic')" />
  </div>
</template>

<style scoped>
.global-avatar {
  filter: drop-shadow(0 4px 30px rgba(0, 212, 255, 0.15));
}

.avatar-body {
  perspective: 800px;
}

.avatar-body:active .glass-panel {
  transform: scale(0.95) !important;
}

/* Glass panel effect */
.glass-panel {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: linear-gradient(
    135deg,
    rgba(10, 20, 40, 0.8) 0%,
    rgba(5, 15, 30, 0.9) 50%,
    rgba(10, 25, 50, 0.8) 100%
  );
  border: 1px solid rgba(0, 212, 255, 0.15);
  box-shadow:
    0 0 40px rgba(0, 212, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
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
