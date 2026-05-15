<script setup>
import { useAvatarStore } from '@/stores/avatar'

defineEmits(['click'])
const avatarStore = useAvatarStore()
</script>

<template>
  <button
    class="mic-button w-10 h-10 rounded-full glass flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
    :class="avatarStore.isMicActive ? 'text-cyber-teal glow-border' : 'text-dark-muted hover:text-cyber-cyan'"
    @click="$emit('click')"
    title="麦克风 (空格键)"
  >
    <!-- Mic On -->
    <svg v-if="avatarStore.isMicActive" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
    <!-- Mic Off -->
    <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  </button>
</template>
