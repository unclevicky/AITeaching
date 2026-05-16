<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { usePancreaticCancerStore } from '@/stores/pancreaticCancer'

const store = usePancreaticCancerStore()

// Chart ref
const riskPieRef = ref(null)
let pieChart = null
let resizeHandler = null
let timeTimer = null

// Time display
const currentTime = ref('--')
const updateTimeDisplay = ref('--')

function updateTime() {
  const now = new Date()
  const str = now.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  currentTime.value = str
  updateTimeDisplay.value = str
}

function initRiskPieChart() {
  if (!riskPieRef.value) return
  pieChart = echarts.init(riskPieRef.value)
  pieChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    legend: { show: false },
    series: [{
      name: '风险因素',
      type: 'pie',
      radius: ['50%', '80%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: 'rgba(13,31,51,0.85)', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold', color: '#fff' } },
      data: store.riskFactors.map(r => ({
        value: r.weight,
        name: r.name,
        itemStyle: { color: r.color },
      })),
    }],
  })
}

onMounted(() => {
  updateTime()
  timeTimer = setInterval(updateTime, 1000)
  store.startRealtimeUpdates()
  nextTick(() => {
    initRiskPieChart()
    resizeHandler = () => { pieChart && pieChart.resize() }
    window.addEventListener('resize', resizeHandler)
  })
})

onUnmounted(() => {
  if (timeTimer) clearInterval(timeTimer)
  store.stopRealtimeUpdates()
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (pieChart) { pieChart.dispose(); pieChart = null }
})
</script>

<template>
  <div class="w-full h-full flex flex-col" style="background: #0a1628; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-3" style="background: linear-gradient(135deg, #0d1f33 0%, #0a1628 100%); border-bottom: 1px solid rgba(0,102,204,0.3); position: relative; overflow: hidden;">
      <div class="absolute top-0 left-0 right-0 h-0.5" style="background: linear-gradient(90deg, #0066cc, #00a8cc, #0066cc); animation: shimmer 3s infinite;"></div>
      <div class="flex items-center gap-3">
        <span style="font-size: 1.8rem;">🏥</span>
        <h1 style="font-size: 1.3rem; font-weight: 700; color: #c3b091; letter-spacing: 2px; font-family: 'Courier New', monospace;">胰腺癌数据大屏</h1>
      </div>
      <div class="text-center flex-1">
        <h2 style="font-size: 1.2rem; font-weight: 600; letter-spacing: 2px;">全球胰腺癌流行病学实时监控平台</h2>
        <p style="font-size: 0.8rem; color: #a0c4e8; margin-top: 2px;">Global Pancreatic Cancer Epidemiology Real-time Monitor</p>
      </div>
      <div class="flex items-center gap-4">
        <router-link to="/dashboard" class="back-link px-4 py-2 text-sm rounded transition-all">← 返回主页面</router-link>
        <div class="px-4 py-2 text-sm" style="color: #9acd32; font-family: 'Courier New', monospace; background: rgba(0,0,0,0.4); border: 1px solid #4b5320; border-radius: 4px; text-shadow: 0 0 5px rgba(154,205,50,0.5);">{{ currentTime }}</div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 p-5 overflow-hidden" style="background: #0d1208;">
      <!-- Unified Dashboard Card -->
      <div class="unified-card w-full h-full rounded-lg flex flex-col">
        <!-- Scan line animation -->
        <div class="absolute top-0 left-0 right-0 h-0.5 pointer-events-none" style="background: linear-gradient(90deg, transparent, #9acd32, transparent); animation: scan-line 8s linear infinite;"></div>

        <!-- Tactical corner -->
        <div class="absolute top-4 right-4 w-10 h-10 pointer-events-none" style="border-top: 3px solid #c3b091; border-right: 3px solid #c3b091; opacity: 0.6;"></div>

        <!-- Card Header -->
        <div class="flex items-center justify-between px-8 py-5 relative" style="background: linear-gradient(90deg, rgba(61,68,24,0.25), transparent); border-bottom: 1px solid #4b5320;">
          <div class="absolute bottom-0 left-0 right-0 h-px" style="background: linear-gradient(90deg, #4b5320, transparent 80%);"></div>
          <div class="flex items-center gap-4">
            <span style="font-size: 2rem; filter: drop-shadow(0 0 8px rgba(255,107,53,0.5));">⚡</span>
            <h2 style="font-size: 1.2rem; font-weight: 600; letter-spacing: 3px; font-family: 'Courier New', monospace;">全球实时数据监控</h2>
            <div class="live-badge flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold">
              <span class="live-dot w-2.5 h-2.5 rounded-full"></span>
              LIVE
            </div>
          </div>
          <div class="flex items-center gap-5 text-sm" style="font-family: 'Courier New', monospace;">
            <span style="color: #8a8478; letter-spacing: 1px;">数据更新时间:</span>
            <span style="color: #9acd32; text-shadow: 0 0 5px rgba(154,205,50,0.4);">{{ updateTimeDisplay }}</span>
          </div>
        </div>

        <!-- Three Column Content -->
        <div class="flex-1 grid gap-0 p-7 overflow-hidden" style="grid-template-columns: 340px 1fr 340px; min-height: 0;">
          <!-- Left: Today's Stats -->
          <div class="relative" style="padding-right: 30px;">
            <div class="divider-line absolute top-2.5 bottom-2.5 right-0 w-0.5"></div>

            <div class="flex flex-col h-full">
              <div class="section-header flex items-center gap-3 mb-6 pb-4">
                <span class="text-lg">📊</span>
                <span class="section-title">今日全球统计</span>
              </div>

              <div class="flex flex-col gap-5">
                <!-- New Cases -->
                <div class="stat-card stat-new flex items-center gap-4 p-5 rounded transition-all">
                  <div class="stat-icon w-14 h-14 flex items-center justify-center text-2xl">🆕</div>
                  <div class="flex-1">
                    <div class="stat-value text-3xl font-bold leading-none">{{ store.formattedTodayCases }}</div>
                    <div class="flex items-center justify-between mt-2">
                      <span class="text-sm" style="color: #b8b0a0; letter-spacing: 1px;">新增病例</span>
                      <span class="trend-badge trend-up text-xs px-3 py-1 rounded font-semibold">↑ 实时</span>
                    </div>
                  </div>
                </div>

                <!-- Deaths -->
                <div class="stat-card stat-death flex items-center gap-4 p-5 rounded transition-all">
                  <div class="stat-icon w-14 h-14 flex items-center justify-center text-2xl">💀</div>
                  <div class="flex-1">
                    <div class="stat-value-death text-3xl font-bold leading-none">{{ store.formattedTodayDeaths }}</div>
                    <div class="flex items-center justify-between mt-2">
                      <span class="text-sm" style="color: #b8b0a0; letter-spacing: 1px;">死亡病例</span>
                      <span class="trend-badge trend-warn text-xs px-3 py-1 rounded font-semibold">! 关注</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Center: Big Counter -->
          <div class="dashboard-center flex flex-col items-center justify-center px-8 relative">
            <!-- Tactical circles -->
            <div class="tactical-circle absolute pointer-events-none"></div>
            <div class="tactical-cross absolute pointer-events-none text-4xl">+</div>

            <div class="center-header text-lg font-semibold mb-5">全球实时新增病例</div>

            <div class="mb-6 relative">
              <div class="counter-number text-8xl font-extrabold leading-none">
                {{ store.formattedTodayCases }}
              </div>
              <div class="counter-unit text-base text-center mt-4">例 / 今日</div>
            </div>

            <div class="center-stats-row flex items-center gap-8 text-base mb-6">
              <span>平均每 <span class="highlight font-bold">{{ store.avgMinutesPerCase }}</span> 分钟新增 1 例</span>
              <div class="center-divider" style="width: 1px; height: 24px; background: #4b5320;"></div>
              <span>实时更新 <span class="highlight font-bold">每分钟</span></span>
            </div>

            <!-- Progress Bar -->
            <div class="progress-container w-full max-w-md">
              <div class="progress-track w-full h-2 overflow-hidden">
                <div class="progress-fill h-full"></div>
              </div>
              <div class="progress-label text-sm text-center mt-3">距离下次病例新增倒计时</div>
            </div>
          </div>

          <!-- Right: Risk Factors -->
          <div class="relative" style="padding-left: 30px;">
            <div class="divider-line absolute top-2.5 bottom-2.5 left-0 w-0.5"></div>

            <div class="flex flex-col h-full">
              <div class="section-header flex items-center gap-3 mb-6 pb-4">
                <span class="text-lg">⚠️</span>
                <span class="section-title">主要风险因素</span>
              </div>

              <!-- Pie Chart -->
              <div class="mb-5" style="height: 160px;">
                <div ref="riskPieRef" class="w-full h-full"></div>
              </div>

              <!-- Risk List -->
              <div class="flex flex-col gap-2.5">
                <div
                  v-for="risk in store.riskFactors"
                  :key="risk.name"
                  class="risk-item flex items-center gap-3.5 px-4 py-3 rounded transition-all"
                >
                  <span class="risk-dot w-3 h-3 rounded-sm flex-shrink-0" :style="`background: ${risk.color}; box-shadow: 0 0 8px ${risk.color};`"></span>
                  <span class="flex-1 text-sm" style="color: #b8b0a0; letter-spacing: 1px;">{{ risk.name }}</span>
                  <span class="risk-percent text-base font-bold">{{ risk.weight }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="flex items-center justify-between px-8 py-4 text-xs" style="background: linear-gradient(180deg, #1a2112, rgba(13,18,8,0.95)); border-top: 2px solid #4b5320; color: #8a8478; font-family: 'Courier New', monospace;">
      <div class="flex gap-4">
        <span style="letter-spacing: 0.5px;">数据来源: GLOBOCAN 2024, WHO, IARC</span>
        <span>数据更新: 2025年底</span>
      </div>
      <div>
        <span style="color: #c3b091; text-shadow: 0 0 5px rgba(195,176,145,0.2);">⚠️ 本页面仅供医学教育参考，数据基于流行病学统计估算</span>
      </div>
      <div>
        <span>MediVis Screen © 2025</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ── Animations ── */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes scan-line {
  0% { left: -100%; }
  100% { left: 100%; }
}
@keyframes tactical-pulse {
  0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(196,30,58,0.7); }
  70% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 12px rgba(196,30,58,0); }
  100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(196,30,58,0); }
}
@keyframes digital-glow {
  0%, 100% { text-shadow: 0 0 20px rgba(154,205,50,0.8), 0 0 40px rgba(154,205,50,0.4), 0 0 60px rgba(154,205,50,0.2); }
  50% { text-shadow: 0 0 30px rgba(154,205,50,1), 0 0 60px rgba(154,205,50,0.6), 0 0 90px rgba(154,205,50,0.3); }
}
@keyframes progress-fill {
  0% { width: 0%; }
  100% { width: 100%; }
}

/* ── Unified card ── */
.unified-card {
  background: linear-gradient(135deg, #1a2112 0%, #0d1208 100%);
  border: 2px solid #4b5320;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  position: relative;
  overflow: hidden;
}

/* ── Divider lines ── */
.divider-line {
  background: repeating-linear-gradient(180deg, #4b5320 0px, #4b5320 5px, transparent 5px, transparent 10px);
  opacity: 0.5;
}

/* ── Section header ── */
.section-header {
  border-bottom: 2px solid #4b5320;
  position: relative;
}
.section-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 80px;
  height: 2px;
  background: #c3b091;
}
.section-title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 2px;
  font-family: 'Courier New', monospace;
}

/* ── Live badge ── */
.live-badge {
  color: #c41e3a;
  border: 1px solid #c41e3a;
  background: rgba(196,30,58,0.15);
  font-family: 'Courier New', monospace;
  box-shadow: 0 0 10px rgba(196,30,58,0.2);
}
.live-dot {
  background: #c41e3a;
  animation: tactical-pulse 1.5s ease-out infinite;
  box-shadow: 0 0 10px #c41e3a;
}

/* ── Stat cards ── */
.stat-card {
  background: rgba(35,43,26,0.8);
  border: 1px solid #4b5320;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}
.stat-card:hover {
  border-color: #c3b091;
  box-shadow: 0 0 20px rgba(75,83,32,0.3), 0 8px 24px rgba(0,0,0,0.4);
  transform: translateX(5px);
}
.stat-icon {
  border-radius: 4px;
  clip-path: polygon(10% 0%, 100% 0%, 100% 90%, 90% 100%, 0% 100%, 0% 10%);
}
.stat-new .stat-icon {
  background: linear-gradient(135deg, rgba(255,107,53,0.3), rgba(255,140,97,0.2));
  border: 2px solid #ff6b35;
  box-shadow: 0 0 15px rgba(255,107,53,0.3);
}
.stat-death .stat-icon {
  background: linear-gradient(135deg, rgba(75,83,32,0.5), rgba(107,124,63,0.3));
  border: 2px solid #6b7c3f;
  box-shadow: 0 0 15px rgba(75,83,32,0.3);
}
.stat-value {
  color: #9acd32;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 10px rgba(154,205,50,0.5);
  letter-spacing: 2px;
}
.stat-value-death {
  color: #c3b091;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 10px rgba(195,176,145,0.3);
  letter-spacing: 2px;
}
.trend-badge {
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}
.trend-up {
  background: rgba(154,205,50,0.15);
  color: #9acd32;
  border: 1px solid #6b8e23;
}
.trend-warn {
  background: rgba(255,107,53,0.15);
  color: #ff6b35;
  border: 1px solid #ff6b35;
}

/* ── Dashboard center ── */
.dashboard-center::before {
  content: '';
  position: absolute;
  width: 380px;
  height: 380px;
  border: 1px dashed rgba(75,83,32,0.3);
  border-radius: 50%;
  pointer-events: none;
}
.dashboard-center::after {
  content: '+';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 3rem;
  color: rgba(75,83,32,0.2);
  pointer-events: none;
}
.center-header {
  color: #b8b0a0;
  letter-spacing: 4px;
  font-family: 'Courier New', monospace;
}
.counter-number {
  color: #9acd32;
  font-family: 'Courier New', monospace;
  letter-spacing: 8px;
  animation: digital-glow 2s ease-in-out infinite;
}
.counter-unit {
  color: #8a8478;
  letter-spacing: 3px;
  font-family: 'Courier New', monospace;
}
.center-stats-row {
  color: #b8b0a0;
  font-family: 'Courier New', monospace;
}
.highlight {
  color: #c3b091;
  text-shadow: 0 0 10px rgba(195,176,145,0.3);
}
.progress-track {
  background: rgba(0,0,0,0.4);
  border: 1px solid #4b5320;
}
.progress-fill {
  background: linear-gradient(90deg, #2d3318, #9acd32, #6b7c3f);
  box-shadow: 0 0 15px rgba(154,205,50,0.5);
  animation: progress-fill 64s linear infinite;
}
.progress-label {
  color: #8a8478;
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
}

/* ── Risk items ── */
.risk-item {
  background: rgba(35,43,26,0.8);
  border: 1px solid #4b5320;
}
.risk-item:hover {
  background: rgba(75,83,32,0.3);
  border-color: #c3b091;
  transform: translateX(5px);
}
.risk-percent {
  color: #e8e4dc;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 5px rgba(195,176,145,0.2);
}

/* ── Back link ── */
.back-link {
  color: #c3b091;
  border: 1px solid #4b5320;
  background: rgba(75,83,32,0.2);
}
.back-link:hover {
  background: #4b5320;
  color: #fff;
  box-shadow: 0 0 15px rgba(75,83,32,0.4);
}
</style>
