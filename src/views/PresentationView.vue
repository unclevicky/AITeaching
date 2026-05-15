<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { mockPresentationData } from '@/mock/presentation-data'

const currentIndex = ref(0)
let autoPlayTimer = null

const currentSlide = computed(() => mockPresentationData[currentIndex.value])

function next() {
  currentIndex.value = (currentIndex.value + 1) % mockPresentationData.length
}

function prev() {
  currentIndex.value = (currentIndex.value - 1 + mockPresentationData.length) % mockPresentationData.length
}

function goTo(idx) {
  currentIndex.value = idx
}

function startAutoPlay() {
  autoPlayTimer = setInterval(next, 5000)
}

function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

onMounted(() => {
  startAutoPlay()
})

onUnmounted(() => {
  stopAutoPlay()
})
</script>

<template>
  <div class="presentation-view w-full h-full p-6 flex flex-col">
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-cyber-cyan glow-text">PPT 展示</h1>
        <p class="text-dark-muted text-sm mt-1">医疗智慧平台解决方案</p>
      </div>
      <div class="text-sm text-dark-muted">
        {{ currentIndex + 1 }} / {{ mockPresentationData.length }}
      </div>
    </div>

    <!-- Main Slide -->
    <div class="flex-1 glass-card p-6 flex items-center justify-center relative overflow-hidden min-h-0"
      @mouseenter="stopAutoPlay" @mouseleave="startAutoPlay">

      <!-- Slide Image -->
      <Transition name="slide" mode="out-in">
        <img :key="currentIndex"
          :src="currentSlide.image"
          :alt="currentSlide.title"
          class="max-w-full max-h-full object-contain rounded-lg" />
      </Transition>

      <!-- Slide Title Overlay -->
      <div class="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-dark-bg/90 to-transparent">
        <h2 class="text-lg font-semibold text-cyber-cyan glow-text">{{ currentSlide.title }}</h2>
        <p class="text-sm text-dark-muted mt-1">{{ currentSlide.description }}</p>
      </div>

      <!-- Navigation Arrows -->
      <button
        class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center text-dark-muted hover:text-cyber-cyan hover:glow-border transition-all duration-300"
        @click="prev">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center text-dark-muted hover:text-cyber-cyan hover:glow-border transition-all duration-300"
        @click="next">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Thumbnails -->
    <div class="mt-4 flex gap-3 justify-center">
      <button
        v-for="(slide, idx) in mockPresentationData"
        :key="idx"
        class="w-20 h-14 rounded-lg overflow-hidden border-2 transition-all duration-300"
        :class="idx === currentIndex ? 'border-cyber-cyan glow-border' : 'border-dark-border opacity-50 hover:opacity-80'"
        @click="goTo(idx)">
        <img :src="slide.image" :alt="slide.title" class="w-full h-full object-cover" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.4s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
