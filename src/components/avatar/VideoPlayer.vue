<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  state: {
    type: String,
    default: 'IDLE'
  }
})

const videoRef = ref(null)
const containerRef = ref(null)

const videoSources = {
  IDLE: '/video/idle.mp4',
  LISTENING: '/video/listening.mp4',
  SPEAKING: '/video/speaking.mp4'
}

function loadAndPlay() {
  const video = videoRef.value
  if (!video) return
  video.src = videoSources[props.state] || videoSources.IDLE
  video.load()
  video.play().catch(() => {
    // Autoplay may be blocked; user gesture will trigger it later
  })
}

onMounted(() => {
  loadAndPlay()
})

watch(() => props.state, () => {
  loadAndPlay()
})

onUnmounted(() => {
  const video = videoRef.value
  if (video) {
    video.pause()
    video.src = ''
  }
})
</script>

<template>
  <div ref="containerRef" class="video-player-container relative">
    <!-- Glow effect behind the video -->
    <div class="absolute inset-0 rounded-full bg-cyber-cyan/20 blur-xl scale-110 pointer-events-none"></div>

    <!-- Outer decorative ring -->
    <div class="absolute -inset-1 rounded-full border border-cyber-cyan/30 pointer-events-none"></div>

    <!-- Video element -->
    <video
      ref="videoRef"
      class="avatar-video w-full h-full object-cover rounded-full"
      loop
      muted
      playsinline
      preload="auto"
      crossorigin="anonymous"
    ></video>

    <!-- Inner shadow overlay for depth -->
    <div class="absolute inset-0 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.6)] pointer-events-none"></div>

    <!-- Top highlight for 3D effect -->
    <div class="absolute top-0 left-1/4 right-1/4 h-1/3 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
  </div>
</template>

<style scoped>
.video-player-container {
  width: 5.5rem;
  height: 5.5rem;
  position: relative;
  border-radius: 50%;
  overflow: visible;
}

.avatar-video {
  position: relative;
  z-index: 1;
  border-radius: 50%;
  /* Remove any default browser video controls styling */
  outline: none;
}
</style>
