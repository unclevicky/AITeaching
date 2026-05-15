<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import lottie from 'lottie-web'

const props = defineProps({
  state: {
    type: String,
    default: 'IDLE'
  }
})

const container = ref(null)
let anim = null

// Placeholder: colored circle that changes per state
// Replace with actual Lottie JSON files when available
const stateColors = {
  IDLE: '#00d4ff',
  LISTENING: '#00ccaa',
  SPEAKING: '#0066ff'
}

const stateIcons = {
  IDLE: '◉',
  LISTENING: '◉',
  SPEAKING: '◉'
}

onMounted(() => {
  // When real Lottie JSON files are available, load them here:
  // anim = lottie.loadAnimation({
  //   container: container.value,
  //   renderer: 'svg',
  //   loop: true,
  //   autoplay: true,
  //   path: `/lottie/avatar-${props.state.toLowerCase()}.json`
  // })
})

onUnmounted(() => {
  if (anim) {
    anim.destroy()
  }
})

watch(() => props.state, (newState) => {
  if (anim) {
    anim.destroy()
  }
  // Reload with new animation when Lottie files are available
})
</script>

<template>
  <div ref="container" class="lottie-container w-14 h-14 flex items-center justify-center relative">
    <!-- Placeholder visualization (replace with real Lottie) -->
    <div class="relative flex items-center justify-center">
      <!-- Outer ring -->
      <div class="absolute w-14 h-14 rounded-full border-2 opacity-30 transition-colors duration-500"
        :style="{ borderColor: stateColors[state] }">
      </div>
      <!-- Inner ring -->
      <div class="absolute w-10 h-10 rounded-full border opacity-50 transition-colors duration-500"
        :style="{ borderColor: stateColors[state] }">
      </div>
      <!-- Core -->
      <div class="w-6 h-6 rounded-full transition-all duration-500"
        :style="{
          backgroundColor: stateColors[state],
          boxShadow: `0 0 12px ${stateColors[state]}`
        }">
      </div>
    </div>
  </div>
</template>
