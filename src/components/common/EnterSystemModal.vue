<script setup>
import { ref } from 'vue'

const emit = defineEmits(['enter'])
const isHovering = ref(false)
</script>

<template>
  <Transition name="modal">
    <div class="fixed inset-0 z-[10000] flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-dark-bg/90 backdrop-blur-sm"></div>

      <!-- Modal Content -->
      <div class="relative glass rounded-2xl p-10 max-w-md w-full mx-4 text-center glow-border">
        <!-- Decorative top glow -->
        <div class="scan-line absolute top-0 left-0 right-0"></div>

        <!-- Icon -->
        <div class="mb-6 flex justify-center">
          <div class="w-20 h-20 rounded-full bg-cyber-cyan/10 flex items-center justify-center glow-border">
            <svg class="w-10 h-10 text-cyber-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-2xl font-bold text-cyber-cyan glow-text mb-2">医疗智慧平台</h1>
        <p class="text-dark-muted text-sm mb-8">Medical AI Platform — National Competition Demo</p>

        <!-- Features -->
        <div class="grid grid-cols-2 gap-3 mb-8 text-xs">
          <div class="glass-card p-3 text-dark-text">
            <div class="text-cyber-cyan text-lg mb-1">🎙️</div>
            AI 语音交互
          </div>
          <div class="glass-card p-3 text-dark-text">
            <div class="text-cyber-teal text-lg mb-1">📊</div>
            数字大屏
          </div>
          <div class="glass-card p-3 text-dark-text">
            <div class="text-cyber-blue text-lg mb-1">🔬</div>
            智能诊断
          </div>
          <div class="glass-card p-3 text-dark-text">
            <div class="text-cyber-cyan text-lg mb-1">📝</div>
            随堂测试
          </div>
        </div>

        <!-- Enter Button -->
        <button
          class="w-full py-3 rounded-xl font-medium transition-all duration-300 relative overflow-hidden"
          :class="isHovering
            ? 'bg-cyber-cyan text-dark-bg shadow-glow-lg'
            : 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/50'"
          @mouseenter="isHovering = true"
          @mouseleave="isHovering = false"
          @click="emit('enter')"
        >
          <span class="relative z-10 flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            进入系统
          </span>
        </button>

        <p class="text-dark-muted/60 text-xs mt-4">点击以启用音频与麦克风权限</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.4s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .glass,
.modal-leave-to .glass {
  transform: scale(0.95);
}
</style>
