<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const menuItems = [
  { path: '/dashboard', icon: 'dashboard', label: '数字大屏' },
  { path: '/realtime', icon: 'realtime', label: '实时监控' },
  { path: '/trauma', icon: 'trauma', label: '战创伤分析' },
  { path: '/diagnosis', icon: 'diagnosis', label: '智能诊断' },
  { path: '/presentation', icon: 'presentation', label: 'PPT 展示' },
  { path: '/exam', icon: 'exam', label: '随堂测试' },
  { path: '/pancreas-injury', icon: 'pancreasInjury', label: '胰腺损伤测验' },
  { path: '/surgery-simulation', icon: 'surgerySim', label: '教学模拟' }
]

function isActive(path) {
  return route.path === path
}
</script>

<template>
  <nav class="sidenav fixed left-0 top-0 bottom-0 w-16 glass flex flex-col items-center py-6 z-50">
    <!-- Logo -->
    <div class="nav-logo mb-8 w-10 h-10 rounded-lg bg-cyber-cyan/20 flex items-center justify-center glow-border">
      <svg class="w-6 h-6 text-cyber-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    </div>

    <!-- Menu Items -->
    <div class="flex flex-col gap-2 flex-1">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        :class="[
          'nav-item w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 group relative',
          isActive(item.path)
            ? 'bg-cyber-cyan/20 text-cyber-cyan glow-border'
            : 'text-dark-muted hover:text-cyber-cyan hover:bg-cyber-cyan/10'
        ]"
      >
        <!-- Dashboard Icon -->
        <svg v-if="item.icon === 'dashboard'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
        <!-- Realtime Icon -->
        <svg v-else-if="item.icon === 'realtime'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <!-- Trauma Icon -->
        <svg v-else-if="item.icon === 'trauma'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <!-- Diagnosis Icon -->
        <svg v-else-if="item.icon === 'diagnosis'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <!-- Presentation Icon -->
        <svg v-else-if="item.icon === 'presentation'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <!-- Exam Icon -->
        <svg v-else-if="item.icon === 'exam'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <!-- Pancreas Injury Icon -->
        <svg v-else-if="item.icon === 'pancreasInjury'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <!-- Surgery Simulation Icon -->
        <svg v-else-if="item.icon === 'surgerySim'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>

        <!-- Tooltip -->
        <span class="absolute left-14 px-2 py-1 text-xs bg-dark-surface border border-dark-border rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          {{ item.label }}
        </span>
      </router-link>
    </div>

    <!-- Bottom status -->
    <div class="mt-auto pt-4 border-t border-dark-border w-full flex justify-center">
      <div class="w-2 h-2 rounded-full bg-cyber-teal animate-pulse"></div>
    </div>
  </nav>
</template>

<style scoped>
.sidenav {
  background: linear-gradient(180deg, rgba(10, 30, 60, 0.9) 0%, rgba(4, 13, 26, 0.95) 100%);
  border-right: 1px solid rgba(0, 180, 255, 0.15);
}
</style>
