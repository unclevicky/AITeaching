<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { mockExamData } from '@/mock/exam-data'

const participants = ref(mockExamData.participants)
const stats = ref(mockExamData.stats)
const timeRemaining = ref(300) // 5 minutes countdown
const isActive = ref(true)
let timer = null

const minutes = computed(() => Math.floor(timeRemaining.value / 60).toString().padStart(2, '0'))
const seconds = computed(() => (timeRemaining.value % 60).toString().padStart(2, '0'))

onMounted(() => {
  timer = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="exam-view w-full h-full p-6 overflow-y-auto scrollbar-thin">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-cyber-cyan glow-text">随堂测试</h1>
        <p class="text-dark-muted text-sm mt-1">扫码参与 · 实时统计</p>
      </div>
      <div class="glass px-4 py-2 rounded-lg flex items-center gap-3">
        <span class="text-dark-muted text-sm">剩余时间</span>
        <span class="text-cyber-cyan font-mono text-lg font-bold">{{ minutes }}:{{ seconds }}</span>
      </div>
    </div>

    <!-- QR Code + Stats -->
    <div class="grid grid-cols-3 gap-6 mb-6">
      <!-- QR Code -->
      <div class="glass-card p-6 flex flex-col items-center justify-center text-center">
        <div class="w-32 h-32 bg-white rounded-xl p-2 mb-4">
          <!-- Placeholder QR Code -->
          <svg viewBox="0 0 100 100" class="w-full h-full">
            <rect fill="#040d1a" x="0" y="0" width="100" height="100" />
            <rect fill="#00d4ff" x="10" y="10" width="25" height="25" />
            <rect fill="#00d4ff" x="65" y="10" width="25" height="25" />
            <rect fill="#00d4ff" x="10" y="65" width="25" height="25" />
            <rect fill="#00d4ff" x="40" y="40" width="20" height="20" />
            <rect fill="#00d4ff" x="70" y="70" width="10" height="10" />
            <rect fill="#00d4ff" x="85" y="65" width="5" height="25" />
            <rect fill="#00d4ff" x="65" y="85" width="10" height="5" />
            <rect fill="#00d4ff" x="40" y="10" width="5" height="5" />
            <rect fill="#00d4ff" x="50" y="20" width="5" height="5" />
            <rect fill="#00d4ff" x="40" y="70" width="5" height="10" />
          </svg>
        </div>
        <p class="text-dark-text font-medium">扫码参与测试</p>
        <p class="text-dark-muted text-xs mt-1">使用手机扫描二维码</p>
      </div>

      <!-- Live Stats -->
      <div class="col-span-2 grid grid-cols-2 gap-4">
        <div v-for="stat in stats" :key="stat.label" class="glass-card p-5 flex flex-col justify-center">
          <div class="text-3xl font-bold glow-text" :style="{ color: stat.color }">
            {{ stat.value }}
          </div>
          <div class="text-sm text-dark-muted mt-1">{{ stat.label }}</div>
          <div class="mt-3 h-1 rounded-full bg-dark-border overflow-hidden">
            <div class="h-full rounded-full transition-all duration-1000"
              :style="{ width: stat.percent + '%', backgroundColor: stat.color }">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Participant List -->
    <div class="glass-card p-6">
      <div class="flex items-center justify-between mb-4 pb-3 border-b border-dark-border">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse"></div>
          <span class="text-sm font-medium text-dark-text">实时参与情况</span>
        </div>
        <span class="text-xs text-dark-muted">共 {{ participants.length }} 人参与</span>
      </div>

      <div class="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto scrollbar-thin">
        <div v-for="p in participants" :key="p.id"
          class="flex items-center gap-3 p-3 rounded-lg bg-dark-bg/30 border border-dark-border/50">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            :style="{ backgroundColor: p.avatarColor + '30', color: p.avatarColor }">
            {{ p.name.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-dark-text truncate">{{ p.name }}</div>
            <div class="text-xs text-dark-muted">得分: {{ p.score }}</div>
          </div>
          <div class="text-xs px-2 py-0.5 rounded-full"
            :class="p.status === '已完成' ? 'bg-cyber-teal/20 text-cyber-teal' : 'bg-cyber-cyan/20 text-cyber-cyan'">
            {{ p.status }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
