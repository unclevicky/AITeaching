<script setup>
// Animated waveform bars shown during LISTENING state
</script>

<template>
  <div class="waveform flex items-end gap-0.5 h-4">
    <div v-for="i in 5" :key="i"
      class="w-1 rounded-full bg-cyber-cyan/80 animate-wave"
      :style="{
        animationDelay: `${i * 0.15}s`,
        height: '4px'
      }">
    </div>
  </div>
</template>

<style scoped>
@keyframes waveBar {
  0%, 100% { height: 4px; }
  50% { height: 16px; }
}

.animate-wave {
  animation: waveBar 0.8s ease-in-out infinite;
}
</style>
