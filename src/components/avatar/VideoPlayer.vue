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
const currentSrc = ref('')

const videoSources = {
  IDLE: '/video/idle.mp4',
  LISTENING: '/video/listening.mp4',
  SPEAKING: '/video/speaking.mp4'
}

function switchVideo(newSrc) {
  const video = videoRef.value
  if (!video) return

  currentSrc.value = newSrc

  // Just set src — don't call load() which causes a visible gray flash
  // The browser will load the new source automatically
  video.src = newSrc

  // Force play after a short delay to ensure the video is ready
  const tryPlay = () => {
    video.play().catch(() => {})
  }

  if (video.readyState >= 3) {
    tryPlay()
  } else {
    const onCanPlay = () => {
      tryPlay()
      video.removeEventListener('canplay', onCanPlay)
    }
    video.addEventListener('canplay', onCanPlay)

    setTimeout(() => {
      video.removeEventListener('canplay', onCanPlay)
      if (video.paused && !video.error) {
        tryPlay()
      }
    }, 1500)
  }
}

onMounted(() => {
  const video = videoRef.value
  if (video) {
    currentSrc.value = videoSources.IDLE
    video.src = videoSources.IDLE
    video.play().catch(() => {})
  }
})

watch(() => props.state, (newState, oldState) => {
  const oldSrc = videoSources[oldState] || videoSources.IDLE
  const newSrc = videoSources[newState] || videoSources.IDLE

  // Same video — just ensure it's playing
  if (oldSrc === newSrc && currentSrc.value === newSrc) {
    const video = videoRef.value
    if (video && video.paused && !video.error && video.readyState >= 2) {
      video.play().catch(() => {})
    }
    return
  }

  // Different video — switch
  switchVideo(newSrc)
})

onUnmounted(() => {
  const video = videoRef.value
  if (video) {
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
})
</script>

<template>
  <div ref="containerRef" class="video-player-container relative">
    <!-- Glow effect behind the video -->
    <div class="absolute inset-0 rounded-full bg-cyber-cyan/20 blur-xl scale-110 pointer-events-none"></div>

    <!-- Video element -->
    <video
      ref="videoRef"
      class="avatar-video w-full h-full object-cover rounded-full object-[center_25%]"
      loop
      muted
      playsinline
      preload="auto"
      crossorigin="anonymous"
    ></video>

    <!-- Inner shadow overlay for depth -->
    <div class="absolute inset-0 rounded-full shadow-[inset_0_0_8px_rgba(0,0,0,0.15)] pointer-events-none"></div>

    <!-- Top highlight for 3D effect -->
    <div class="absolute top-0 left-1/4 right-1/4 h-1/3 rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
  </div>
</template>

<style scoped>
.video-player-container {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 50%;
  overflow: visible;
}

.avatar-video {
  position: relative;
  z-index: 1;
  border-radius: 50%;
  outline: none;
  filter: saturate(1.3) brightness(1.15) contrast(1.05);
  /* Dark background to match page bg, prevents bright gray flash */
  background: #040d12;
}
</style>
