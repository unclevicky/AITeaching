<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { usePancreaticCancerStore } from '@/stores/pancreaticCancer'
import worldJson from '@/assets/world.json'

const store = usePancreaticCancerStore()

// Chart refs
const worldMapRef = ref(null)
const ageChartRef = ref(null)
const trendChartRef = ref(null)

let charts = []
let timeTimer = null

// Register world map
echarts.registerMap('world', worldJson)

// Time display
const currentTime = ref('--')
function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function initWorldMap() {
  if (!worldMapRef.value) return
  const chart = echarts.init(worldMapRef.value)
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter(params) {
        if (params.value) {
          return `<div style="text-align:center;padding:5px">
            <div style="font-size:16px;margin-bottom:5px">${params.name}</div>
            <div>Incidence: <strong style="color:#ff6b6b">${params.value}</strong> / 100k</div>
          </div>`
        }
        return params.name
      },
      backgroundColor: 'rgba(13,31,51,0.95)',
      borderColor: '#0066cc',
      textStyle: { color: '#fff' },
    },
    visualMap: {
      min: 0, max: 15,
      right: 20, bottom: 40,
      text: ['High', 'Low'],
      calculable: true,
      orient: 'vertical',
      itemWidth: 15, itemHeight: 120,
      inRange: { color: ['#1a4d6d', '#2980b9', '#e74c3c', '#c0392b'] },
      textStyle: { color: '#a0c4e8', fontSize: 12 },
    },
    series: [{
      name: 'Pancreatic Cancer Incidence',
      type: 'map',
      map: 'world',
      roam: true,
      layoutCenter: ['45%', '55%'],
      layoutSize: '105%',
      zoom: 1.0,
      center: [15, 15],
      scaleLimit: { min: 0.8, max: 3 },
      emphasis: {
        label: { show: true, color: '#fff', fontSize: 12 },
        itemStyle: { areaColor: '#ffd700', shadowBlur: 10, shadowColor: 'rgba(255,215,0,0.5)' },
      },
      itemStyle: { areaColor: '#1a3a5c', borderColor: '#2a5a8c', borderWidth: 0.5 },
      data: store.mapCountryData,
      select: { disabled: true },
    }],
  })
  charts.push(chart)
}

function initAgeChart() {
  if (!ageChartRef.value) return
  const chart = echarts.init(ageChartRef.value)
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: store.ageDistribution.labels,
      axisLine: { lineStyle: { color: '#4a6b8a' } },
      axisLabel: { color: '#a0c4e8', fontSize: 10 },
    },
    yAxis: {
      type: 'value', name: 'Percent(%)',
      nameTextStyle: { color: '#a0c4e8', fontSize: 10 },
      axisLine: { lineStyle: { color: '#4a6b8a' } },
      axisLabel: { color: '#a0c4e8' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    series: [{
      type: 'bar',
      data: store.ageDistribution.data,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#00a8cc' },
          { offset: 1, color: '#0066cc' },
        ]),
      },
      barWidth: '60%',
    }],
  })
  charts.push(chart)
}

function initTrendChart() {
  if (!trendChartRef.value) return
  const chart = echarts.init(trendChartRef.value)
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['Incidence', 'Mortality'], textStyle: { color: '#a0c4e8' }, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category', boundaryGap: false,
      data: store.trendData.years,
      axisLine: { lineStyle: { color: '#4a6b8a' } },
      axisLabel: { color: '#a0c4e8', fontSize: 10 },
    },
    yAxis: {
      type: 'value', name: 'Per 100k',
      nameTextStyle: { color: '#a0c4e8', fontSize: 10 },
      axisLine: { lineStyle: { color: '#4a6b8a' } },
      axisLabel: { color: '#a0c4e8' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    series: [
      {
        name: 'Incidence', type: 'line', smooth: true,
        data: store.trendData.incidence,
        itemStyle: { color: '#0066cc' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0,102,204,0.5)' },
            { offset: 1, color: 'rgba(0,102,204,0.05)' },
          ]),
        },
      },
      {
        name: 'Mortality', type: 'line', smooth: true,
        data: store.trendData.mortality,
        itemStyle: { color: '#ff6b6b' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255,107,107,0.5)' },
            { offset: 1, color: 'rgba(255,107,107,0.05)' },
          ]),
        },
      },
    ],
  })
  charts.push(chart)
}

function handleResize() {
  charts.forEach(c => c && c.resize())
}

onMounted(() => {
  updateTime()
  timeTimer = setInterval(updateTime, 1000)
  nextTick(() => {
    initWorldMap()
    initAgeChart()
    initTrendChart()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  if (timeTimer) clearInterval(timeTimer)
  window.removeEventListener('resize', handleResize)
  charts.forEach(c => c && c.dispose())
  charts = []
})
</script>

<template>
  <div class="w-full h-full flex flex-col" style="background: #0a1628; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-3" style="background: linear-gradient(135deg, #0d1f33 0%, #0a1628 100%); border-bottom: 1px solid rgba(0,102,204,0.3); position: relative; overflow: hidden;">
      <div class="absolute top-0 left-0 right-0 h-0.5" style="background: linear-gradient(90deg, #0066cc, #00a8cc, #0066cc); animation: shimmer 3s infinite;"></div>
      <div class="flex items-center gap-3">
        <span style="font-size: 1.8rem;">🏥</span>
      </div>
      <div class="text-center flex-1">
        <h2 style="font-size: 1.6rem; font-weight: 600; letter-spacing: 1px;">Global Pancreatic Cancer Epidemiology Real-time Monitoring Platform</h2>
      </div>
      <div class="flex items-center gap-4">
        <router-link to="/realtime" class="rt-link inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full transition-all">📊 Real-time Data →</router-link>
        <div class="text-right" style="font-size: 1rem; font-weight: 600; color: #4d94ff; font-family: 'Courier New', monospace;">{{ currentTime }}</div>
      </div>
    </header>

    <!-- Main Grid -->
    <main class="flex-1 grid gap-4 p-4 overflow-hidden" style="grid-template-columns: 280px 1fr 280px; min-height: 0;">
      <!-- Left Panel -->
      <aside class="flex flex-col gap-4 overflow-hidden" style="height: 100%;">
        <!-- Annual Overview -->
        <section class="rounded-xl p-4 flex-1" style="background: rgba(13,31,51,0.85); border: 1px solid rgba(0,102,204,0.3); box-shadow: 0 4px 20px rgba(0,102,204,0.2);">
          <h3 class="text-sm font-semibold mb-3 pb-3" style="color: #4d94ff; border-bottom: 1px solid rgba(0,102,204,0.3);">📋 2025 Annual Overview</h3>
          <div class="flex flex-col gap-2">
            <div class="overview-card flex items-center gap-3 p-2.5 rounded-lg transition-all">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-lg" style="background: rgba(0,102,204,0.2);">🆕</span>
              <div>
                <div class="text-lg font-bold" style="color: #4d94ff; font-family: 'Courier New', monospace;">{{ store.formatNumber(store.globalStats.newCases2024) }}</div>
                <div class="text-xs" style="color: #6b8cae;">Global New Cases</div>
              </div>
            </div>
            <div class="overview-card flex items-center gap-3 p-2.5 rounded-lg transition-all">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-lg" style="background: rgba(0,102,204,0.2);">💀</span>
              <div>
                <div class="text-lg font-bold" style="color: #4d94ff; font-family: 'Courier New', monospace;">{{ store.formatNumber(store.globalStats.deaths2024) }}</div>
                <div class="text-xs" style="color: #6b8cae;">Global Deaths</div>
              </div>
            </div>
            <div class="overview-card flex items-center gap-3 p-2.5 rounded-lg transition-all">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-lg" style="background: rgba(0,102,204,0.2);">📊</span>
              <div>
                <div class="text-lg font-bold" style="color: #4d94ff; font-family: 'Courier New', monospace;">{{ store.globalStats.incidenceRate }}/100k</div>
                <div class="text-xs" style="color: #6b8cae;">Age-Standardized Incidence</div>
              </div>
            </div>
            <div class="overview-card flex items-center gap-3 p-2.5 rounded-lg transition-all">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-lg" style="background: rgba(0,102,204,0.2);">⚡</span>
              <div>
                <div class="text-lg font-bold" style="color: #4d94ff; font-family: 'Courier New', monospace;">{{ (store.globalStats.mortalityToIncidenceRatio * 100).toFixed(0) }}%</div>
                <div class="text-xs" style="color: #6b8cae;">Mortality/Incidence Ratio</div>
              </div>
            </div>
            <div class="overview-card flex items-center gap-3 p-2.5 rounded-lg transition-all">
              <span class="w-8 h-8 flex items-center justify-center rounded-lg text-lg" style="background: rgba(0,102,204,0.2);">⏱️</span>
              <div>
                <div class="text-lg font-bold" style="color: #4d94ff; font-family: 'Courier New', monospace;">{{ store.globalStats.fiveYearSurvival }}%</div>
                <div class="text-xs" style="color: #6b8cae;">5-Year Survival Rate</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Age Distribution -->
        <section class="rounded-xl p-4" style="background: rgba(13,31,51,0.85); border: 1px solid rgba(0,102,204,0.3); box-shadow: 0 4px 20px rgba(0,102,204,0.2); height: 240px; display: flex; flex-direction: column;">
          <h3 class="text-sm font-semibold mb-2" style="color: #4d94ff;">👥 Age Distribution</h3>
          <div ref="ageChartRef" class="flex-1"></div>
        </section>
      </aside>

      <!-- Center Panel -->
      <section class="flex flex-col gap-3 overflow-hidden" style="height: 100%;">
        <!-- World Map -->
        <div class="rounded-xl p-4 flex-1 flex flex-col" style="background: rgba(13,31,51,0.85); border: 1px solid rgba(0,102,204,0.3); box-shadow: 0 4px 20px rgba(0,102,204,0.2); min-height: 0;">
          <div class="flex items-center justify-between mb-2 pb-2" style="border-bottom: 1px solid rgba(0,102,204,0.3);">
            <h3 class="text-base font-semibold" style="color: #4d94ff;">🌍 Global Incidence Heat Distribution</h3>
            <div class="flex items-center gap-2 text-xs" style="color: #6b8cae;">
              <span>Low</span>
              <div style="width: 80px; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #1a4d6d, #2980b9, #e74c3c, #c0392b);"></div>
              <span>High</span>
            </div>
          </div>
          <div ref="worldMapRef" class="flex-1" style="min-height: 0;"></div>
        </div>

        <!-- News Ticker -->
        <div class="flex items-center gap-3 px-4 py-2.5 rounded-lg overflow-hidden flex-shrink-0" style="background: linear-gradient(135deg, rgba(0,102,204,0.2), rgba(0,168,204,0.2)); border: 1px solid rgba(0,102,204,0.3);">
          <span class="px-3 py-1 rounded text-xs font-semibold whitespace-nowrap" style="background: #0066cc; color: #fff;">📰 Latest News</span>
          <div class="flex-1 overflow-hidden whitespace-nowrap">
            <span class="inline-block text-sm" style="color: #a0c4e8; animation: ticker 25s linear infinite;">
              <span v-for="(news, i) in store.newsItems" :key="i" class="px-6">🩺 {{ news }}</span>
            </span>
          </div>
        </div>
      </section>

      <!-- Right Panel -->
      <aside class="flex flex-col gap-4 overflow-hidden" style="height: 100%;">
        <!-- Regional Ranking -->
        <section class="rounded-xl p-4 flex-1 flex flex-col" style="background: rgba(13,31,51,0.85); border: 1px solid rgba(0,102,204,0.3); box-shadow: 0 4px 20px rgba(0,102,204,0.2); min-height: 0;">
          <h3 class="text-sm font-semibold mb-3 pb-3" style="color: #4d94ff; border-bottom: 1px solid rgba(0,102,204,0.3);">🏆 Regional Incidence Ranking (ASR)</h3>
          <div class="flex flex-col gap-1.5 overflow-y-auto flex-1" style="padding-right: 4px;">
            <div
              v-for="(item, index) in store.regionalRanking"
              :key="item.code"
              class="rank-item flex items-center px-2.5 py-2 rounded-md transition-all text-sm"
              :class="{ 'highlight': item.code === 'CN' }"
            >
              <span class="rank-num w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0" :class="{ 'num-cn': item.code === 'CN' }">{{ index + 1 }}</span>
              <span class="flex-1">{{ item.flag }} {{ item.country }}</span>
              <span class="font-semibold" style="color: #4d94ff; font-family: 'Courier New', monospace;">{{ item.asr }}</span>
            </div>
          </div>
        </section>

        <!-- Trend Chart -->
        <section class="rounded-xl p-4 flex flex-col" style="background: rgba(13,31,51,0.85); border: 1px solid rgba(0,102,204,0.3); box-shadow: 0 4px 20px rgba(0,102,204,0.2); height: 200px;">
          <h3 class="text-sm font-semibold mb-2" style="color: #4d94ff;">📈 Incidence Trend Comparison</h3>
          <div ref="trendChartRef" class="flex-1"></div>
        </section>
      </aside>
    </main>

    <!-- Footer -->
    <footer class="flex items-center justify-between px-6 py-3 text-xs" style="background: #0d1f33; border-top: 1px solid rgba(0,102,204,0.3); color: #6b8cae;">
      <div class="flex gap-4">
        <span>Data Sources: GLOBOCAN 2024, WHO, IARC</span>
        <span>Data Updated: End of 2025</span>
      </div>
      <div>
        <span>⚠️ This page is for medical education reference only. Data based on epidemiological statistical estimates.</span>
      </div>
      <div>
        <span>MediVis Screen © 2025</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes ticker {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
/* Overview cards hover */
.overview-card {
  background: rgba(0, 0, 0, 0.2);
  border-left: 3px solid transparent;
}
.overview-card:hover {
  background: rgba(0, 102, 204, 0.15);
  border-left-color: #0066cc;
  transform: translateX(4px);
}

/* Rank items */
.rank-item {
  background: rgba(0, 0, 0, 0.2);
}
.rank-item:hover {
  background: rgba(0, 102, 204, 0.2) !important;
  transform: translateX(3px);
}
.rank-item.highlight {
  background: rgba(255, 107, 107, 0.15);
  border: 1px solid rgba(255, 107, 107, 0.3);
}
.rank-num {
  background: #0066cc;
}
.rank-num.num-cn {
  background: #ff6b6b;
}

/* Realtime link */
.rt-link {
  color: #4d94ff;
  border: 1px solid #0066cc;
  background: rgba(0, 102, 204, 0.1);
}
.rt-link:hover {
  background: #0066cc;
  color: #fff;
  transform: translateX(4px);
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: #0066cc; border-radius: 2px; }
</style>
