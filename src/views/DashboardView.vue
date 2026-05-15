<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { mockDashboardData } from '@/mock/dashboard-data'

const chartContainer = ref(null)
const gaugeContainer = ref(null)
let mainChart = null
let gaugeChart = null

onMounted(() => {
  initMainChart()
  initGaugeChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  mainChart?.dispose()
  gaugeChart?.dispose()
})

function handleResize() {
  mainChart?.resize()
  gaugeChart?.resize()
}

function initMainChart() {
  if (!chartContainer.value) return
  mainChart = echarts.init(chartContainer.value)

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: '实时接诊数据',
      textStyle: { color: '#00d4ff', fontSize: 14, fontWeight: 500 },
      left: 'center',
      top: 10
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10, 30, 60, 0.9)',
      borderColor: 'rgba(0, 180, 255, 0.3)',
      textStyle: { color: '#aaccdd' }
    },
    grid: { left: 50, right: 30, top: 50, bottom: 30 },
    xAxis: {
      type: 'category',
      data: mockDashboardData.timeline,
      axisLine: { lineStyle: { color: 'rgba(0, 180, 255, 0.2)' } },
      axisLabel: { color: '#667788' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(0, 180, 255, 0.2)' } },
      axisLabel: { color: '#667788' },
      splitLine: { lineStyle: { color: 'rgba(0, 180, 255, 0.08)' } }
    },
    series: [
      {
        name: '接诊量',
        type: 'line',
        smooth: true,
        data: mockDashboardData.patients,
        lineStyle: { color: '#00d4ff', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 212, 255, 0.3)' },
            { offset: 1, color: 'rgba(0, 212, 255, 0.02)' }
          ])
        },
        itemStyle: { color: '#00d4ff' },
        symbol: 'circle',
        symbolSize: 6
      },
      {
        name: 'AI 辅助诊断',
        type: 'line',
        smooth: true,
        data: mockDashboardData.aiDiagnosis,
        lineStyle: { color: '#00ccaa', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 204, 170, 0.3)' },
            { offset: 1, color: 'rgba(0, 204, 170, 0.02)' }
          ])
        },
        itemStyle: { color: '#00ccaa' },
        symbol: 'circle',
        symbolSize: 6
      }
    ],
    legend: {
      data: ['接诊量', 'AI 辅助诊断'],
      textStyle: { color: '#aaccdd' },
      top: 10,
      right: 10
    }
  }

  mainChart.setOption(option)
}

function initGaugeChart() {
  if (!gaugeContainer.value) return
  gaugeChart = echarts.init(gaugeContainer.value)

  const option = {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 220,
      endAngle: -40,
      min: 0,
      max: 100,
      pointer: { show: false },
      progress: {
        show: true,
        overlap: false,
        roundCap: true,
        clip: false,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#0066ff' },
            { offset: 1, color: '#00d4ff' }
          ])
        }
      },
      axisLine: {
        lineStyle: {
          width: 12,
          color: [[1, 'rgba(0, 180, 255, 0.1)']]
        }
      },
      splitLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      data: [{
        value: mockDashboardData.accuracy,
        name: '诊断准确率',
        title: {
          offsetCenter: ['0%', '70%'],
          color: '#667788',
          fontSize: 12
        },
        detail: {
          offsetCenter: ['0%', '30%'],
          color: '#00d4ff',
          fontSize: 28,
          fontWeight: 600,
          formatter: '{value}%',
          valueAnimation: true
        }
      }]
    }]
  }

  gaugeChart.setOption(option)
}
</script>

<template>
  <div class="dashboard-view w-full h-full p-6 overflow-y-auto scrollbar-thin">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-cyber-cyan glow-text">数字大屏</h1>
      <p class="text-dark-muted text-sm mt-1">实时监控 · 数据驱动决策</p>
    </div>

    <!-- Top Stats Cards -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div v-for="stat in mockDashboardData.stats" :key="stat.label"
        class="glass-card p-4 text-center">
        <div class="text-2xl font-bold glow-text" :style="{ color: stat.color }">
          {{ stat.value }}
        </div>
        <div class="text-xs text-dark-muted mt-1">{{ stat.label }}</div>
      </div>
    </div>

    <!-- Main Chart + Gauge -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="col-span-2 glass-card p-4 h-72">
        <div ref="chartContainer" class="w-full h-full"></div>
      </div>
      <div class="glass-card p-4 h-72 flex items-center justify-center">
        <div ref="gaugeContainer" class="w-full h-full"></div>
      </div>
    </div>

    <!-- Bottom Cards -->
    <div class="grid grid-cols-3 gap-4">
      <div v-for="card in mockDashboardData.bottomCards" :key="card.title"
        class="glass-card p-4">
        <div class="text-sm font-medium text-dark-text mb-2">{{ card.title }}</div>
        <div class="space-y-2">
          <div v-for="item in card.items" :key="item.label"
            class="flex justify-between text-xs">
            <span class="text-dark-muted">{{ item.label }}</span>
            <span :style="{ color: item.color }">{{ item.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
