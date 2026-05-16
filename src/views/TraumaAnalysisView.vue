<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { useCombatTraumaStore } from '@/stores/combatTrauma'

const store = useCombatTraumaStore()

// Chart refs
const incidenceChartRef = ref(null)
const mortalityChartRef = ref(null)
let charts = []
let triadCharts = []
let triadChartsInitialized = false

const selectedOrganData = computed(() => store.getSelectedOrganData())

// ── Init main charts (incidence + mortality) ──
function initCharts() {
  if (!incidenceChartRef.value || !mortalityChartRef.value) return

  const incidenceChart = echarts.init(incidenceChartRef.value)
  incidenceChart.setOption({
    backgroundColor: 'transparent',
    grid: { left: '28%', right: '20%', bottom: '10%', top: '10%' },
    xAxis: { type: 'value', max: 80, axisLabel: { show: false }, axisLine: { show: false }, splitLine: { show: false } },
    yAxis: {
      type: 'category',
      data: ['体表多发伤', '骨盆及会阴部', '腹部', '头颈部伤', '四肢伤'],
      axisLabel: { color: '#e0f4f8', fontSize: 13, fontWeight: 'bold' },
      axisLine: { lineStyle: { color: 'rgba(0,188,212,0.3)' } },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: [
        { value: 5, itemStyle: { color: '#4caf50' } },
        { value: 10, itemStyle: { color: '#00bcd4' } },
        { value: 20, itemStyle: { color: '#ff9800' } },
        { value: 25, itemStyle: { color: '#00bcd4' } },
        { value: 70, itemStyle: { color: '#00bcd4' } },
      ],
      barWidth: '60%',
      label: { show: true, position: 'right', formatter: '{c}%', color: '#fff', fontSize: 15, fontWeight: 'bold' },
    }],
  })
  charts.push(incidenceChart)

  const mortalityChart = echarts.init(mortalityChartRef.value)
  mortalityChart.setOption({
    backgroundColor: 'transparent',
    grid: { left: '28%', right: '20%', bottom: '10%', top: '10%' },
    xAxis: { type: 'value', max: 60, axisLabel: { show: false }, axisLine: { show: false }, splitLine: { show: false } },
    yAxis: {
      type: 'category',
      data: ['烧伤', '躯干肢体交界', '骨盆及会阴部', '腹部', '头颈部伤'],
      axisLabel: { color: '#e0f4f8', fontSize: 13, fontWeight: 'bold' },
      axisLine: { lineStyle: { color: 'rgba(0,188,212,0.3)' } },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: [
        { value: 5, itemStyle: { color: '#4caf50' } },
        { value: 10, itemStyle: { color: '#00bcd4' } },
        { value: 25, itemStyle: { color: '#00bcd4' } },
        { value: 35, itemStyle: { color: '#ff9800' } },
        { value: 50, itemStyle: { color: '#ff6b6b' } },
      ],
      barWidth: '60%',
      label: { show: true, position: 'right', formatter: '{c}%', color: '#fff', fontSize: 15, fontWeight: 'bold' },
    }],
  })
  charts.push(mortalityChart)
}

// ── Init triad detail charts (lazy) ──
function initTriadCharts() {
  if (triadChartsInitialized) return
  triadChartsInitialized = true

  const makePie = (id, title, value, color) => {
    const el = document.getElementById(id)
    if (!el) return null
    const chart = echarts.init(el)
    chart.setOption({
      backgroundColor: 'transparent',
      title: { text: title, left: 'center', top: 'middle', textStyle: { color, fontSize: 16, fontWeight: 'bold' } },
      series: [{
        type: 'pie', radius: ['50%', '70%'], center: ['50%', '45%'],
        avoidLabelOverlap: false, label: { show: false },
        data: [
          { value, name: '比率', itemStyle: { color } },
          { value: 100 - value, name: '其他', itemStyle: { color: 'rgba(100,100,100,0.2)' } },
        ],
      }],
    })
    return chart
  }

  const makeBar = (id) => {
    const el = document.getElementById(id)
    if (!el) return null
    const chart = echarts.init(el)
    chart.setOption({
      backgroundColor: 'transparent',
      grid: { left: '12%', right: '8%', bottom: '15%', top: '8%' },
      xAxis: {
        type: 'category', data: ['1小时', '2小时', '3小时'],
        axisLabel: { color: '#7ab8c4', fontSize: 11 },
        axisLine: { lineStyle: { color: 'rgba(0,188,212,0.3)' } },
      },
      yAxis: {
        type: 'value', max: 50,
        axisLabel: { color: '#7ab8c4', formatter: '{value}%', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(0,188,212,0.3)' } },
        splitLine: { lineStyle: { color: 'rgba(0,188,212,0.1)' } },
      },
      series: [{
        type: 'bar',
        data: [
          { value: 20, itemStyle: { color: '#4caf50' } },
          { value: 30, itemStyle: { color: '#ff9800' } },
          { value: 45, itemStyle: { color: '#ff6b6b' } },
        ],
        barWidth: '40%',
        label: { show: true, position: 'top', formatter: '{c}%', color: '#fff', fontSize: 12, fontWeight: 'bold' },
      }],
    })
    return chart
  }

  triadCharts.push(
    makePie('triadWithChart', '50-70%', 60, '#ff6b6b'),
    makePie('triadWithoutChart', '10-20%', 15, '#00bcd4'),
    makePie('survivalRateChart', '80%', 80, '#4caf50'),
    makeBar('surgeryTimeChart'),
    makePie('survivalRateChartLarge', '80%', 80, '#4caf50'),
  )
}

function handleResize() {
  charts.forEach(c => c && c.resize())
  triadCharts.forEach(c => c && c.resize())
}

// ── Toggle triad modal ──
function toggleTriad() {
  store.toggleTriad()
  if (store.triadExpanded) {
    nextTick(() => {
      setTimeout(initTriadCharts, 100)
    })
  }
}

// ── Body part click ──
function onBodyPartClick(organKey) {
  store.selectOrgan(organKey)
}

onMounted(() => {
  nextTick(() => {
    initCharts()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  charts.forEach(c => c && c.dispose())
  charts = []
  triadCharts.forEach(c => c && c.dispose())
  triadCharts = []
})
</script>

<template>
  <div class="w-full h-full flex flex-col" style="background: linear-gradient(135deg, #0a1f2e 0%, #0d2b3a 50%, #0a1f2e 100%); color: #e0f4f8; font-family: 'Microsoft YaHei', -apple-system, sans-serif;">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-3 flex-shrink-0" style="background: linear-gradient(90deg, rgba(0,40,60,0.95), rgba(0,60,80,0.9)); border-bottom: 2px solid rgba(0,188,212,0.5); height: 60px;">
      <div class="flex items-center gap-3">
        <span style="font-size: 1.8rem;">🏥</span>
        <h1 style="font-size: 1.3rem; background: linear-gradient(135deg, #fff, #00bcd4); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">战创伤救治数据中心</h1>
      </div>
      <div class="text-center">
        <h2 style="font-size: 1.5rem; letter-spacing: 3px; text-shadow: 0 0 20px rgba(0,188,212,0.5);">⚔️ 战创伤发生与救治分析系统</h2>
        <p style="font-size: 0.85rem; color: #7ab8c4; margin-top: 2px;">COMBAT TRAUMA ANALYSIS SYSTEM</p>
      </div>
      <div>
        <router-link to="/dashboard" class="inline-block px-4 py-2 text-sm rounded transition-all" style="color: #7ab8c4; border: 1px solid rgba(0,188,212,0.3);" onmouseover="this.style.background='rgba(0,188,212,0.15)'"
 onmouseout="this.style.background='transparent'">← 返回首页</router-link>
      </div>
    </header>

    <!-- Main 3-column grid -->
    <main class="flex-1 grid gap-4 p-4 overflow-hidden" style="grid-template-columns: 340px 1fr 400px; min-height: 0;">
      <!-- Left: War History -->
      <aside class="panel flex flex-col overflow-hidden">
        <div class="panel-title">
          <span>📜</span>
          <span>历次重大战争战创伤数据</span>
        </div>
        <div class="flex-1 overflow-y-auto war-history">
          <div
            v-for="(war, index) in store.warHistory"
            :key="war.name"
            class="war-item"
            :class="{ active: store.selectedWarIndex === index }"
            @click="store.selectWar(index)"
          >
            <div class="war-name">{{ war.name }}</div>
            <div class="war-info">{{ war.period }} · {{ war.desc }}</div>
            <div class="war-stats">
              <div class="war-stat">
                <span class="war-stat-label">伤亡:</span>
                <span class="war-stat-value">{{ war.casualties }}</span>
              </div>
              <div class="war-stat">
                <span class="war-stat-label">创伤率:</span>
                <span class="war-stat-value">{{ war.traumaRate }}</span>
              </div>
              <div class="war-stat">
                <span class="war-stat-label">死亡率:</span>
                <span class="war-stat-value">{{ war.mortality }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Center: Body + Charts -->
      <section class="panel body-panel flex flex-col overflow-hidden">
        <div class="body-title">🫀 点击人体部位查看详细数据</div>

        <!-- Human Body SVG -->
        <div class="body-container flex-shrink-0 flex justify-center">
          <svg class="human-body" viewBox="0 0 320 520" xmlns="http://www.w3.org/2000/svg">
            <!-- Head/Neck -->
            <g class="body-part" :class="{ active: store.selectedOrgan === 'head' }" @click="onBodyPartClick('head')">
              <ellipse class="part-head" cx="160" cy="50" rx="40" ry="45" />
              <rect class="part-neck" x="145" y="95" width="30" height="25" rx="6" />
              <text class="body-label" x="160" y="60">头颈部</text>
            </g>
            <!-- Chest -->
            <g class="body-part" :class="{ active: store.selectedOrgan === 'chest' }" @click="onBodyPartClick('chest')">
              <path class="part-chest" d="M100 122 L220 122 L215 195 L105 195 Z" />
              <text class="body-label" x="160" y="165">胸部</text>
            </g>
            <!-- Abdomen -->
            <g class="body-part" :class="{ active: store.selectedOrgan === 'abdomen' }" @click="onBodyPartClick('abdomen')">
              <ellipse class="part-abdomen" cx="160" cy="235" rx="52" ry="42" />
              <text class="body-label" x="160" y="242">腹部</text>
            </g>
            <!-- Pelvis -->
            <g class="body-part" :class="{ active: store.selectedOrgan === 'pelvis' }" @click="onBodyPartClick('pelvis')">
              <path class="part-pelvis" d="M108 280 L212 280 L200 330 L120 330 Z" />
              <text class="body-label" x="160" y="310">骨盆</text>
            </g>
            <!-- Left Arm -->
            <g class="body-part" :class="{ active: store.selectedOrgan === 'limbs' }" @click="onBodyPartClick('limbs')">
              <path class="part-arm" d="M55 125 L95 125 L90 250 L60 250 Z" />
            </g>
            <!-- Right Arm -->
            <g class="body-part" :class="{ active: store.selectedOrgan === 'limbs' }" @click="onBodyPartClick('limbs')">
              <path class="part-arm" d="M225 125 L265 125 L260 250 L230 250 Z" />
            </g>
            <!-- Arm labels -->
            <g>
              <text class="body-label" x="75" y="200" font-size="12">四肢</text>
              <text class="body-label" x="245" y="200" font-size="12">四肢</text>
            </g>
            <!-- Left Leg -->
            <g class="body-part" :class="{ active: store.selectedOrgan === 'limbs' }" @click="onBodyPartClick('limbs')">
              <path class="part-leg" d="M118 335 L155 335 L150 465 L123 465 Z" />
            </g>
            <!-- Right Leg -->
            <g class="body-part" :class="{ active: store.selectedOrgan === 'limbs' }" @click="onBodyPartClick('limbs')">
              <path class="part-leg" d="M165 335 L202 335 L197 465 L170 465 Z" />
            </g>
            <!-- Leg labels -->
            <g>
              <text class="body-label" x="136" y="410" font-size="12">四肢</text>
              <text class="body-label" x="183" y="410" font-size="12">四肢</text>
            </g>
          </svg>
        </div>

        <!-- Comparison Charts -->
        <div class="comparison-charts grid gap-5 flex-1 min-h-0" style="grid-template-columns: 1fr 1fr; margin-top: 80px;">
          <div class="comparison-chart-box">
            <div class="comparison-title">发生率</div>
            <div ref="incidenceChartRef" class="comparison-chart-content"></div>
          </div>
          <div class="comparison-chart-box">
            <div class="comparison-title">死亡率</div>
            <div ref="mortalityChartRef" class="comparison-chart-content"></div>
          </div>
        </div>
      </section>

      <!-- Right: Organ Info + Organ Failure -->
      <aside class="flex flex-col gap-3 overflow-hidden">
        <!-- Organ Info Panel -->
        <div class="panel flex-shrink-0">
          <div class="panel-title">
            <span>🫁</span>
            <span>部位详细信息</span>
          </div>
          <div class="organ-info">
            <div class="organ-name">{{ selectedOrganData?.name || '请选择部位' }}</div>
            <div class="organ-desc">{{ selectedOrganData?.description || '点击左侧人体图查看详细数据' }}</div>
          </div>
          <div class="stats-row">
            <div class="stat-box">
              <div class="stat-label">发生率</div>
              <div class="stat-value">{{ selectedOrganData?.incidence ?? '--' }}</div>
              <div class="stat-unit">%</div>
            </div>
            <div class="stat-box highlight">
              <div class="stat-label">死亡率</div>
              <div class="stat-value danger">{{ selectedOrganData?.mortality ?? '--' }}</div>
              <div class="stat-unit">%</div>
            </div>
          </div>
        </div>

        <!-- Organ Failure Panel -->
        <div class="panel organ-failure-panel flex-1 flex flex-col overflow-hidden">
          <div class="organ-failure-title">
            <span>⚠️</span>
            <span>严重脏器功能衰竭</span>
          </div>
          <div class="failure-types-grid">
            <div class="failure-type-item">
              <span class="type-name">失血性休克</span>
            </div>
            <div class="failure-type-item">
              <span class="type-name">急性呼吸衰竭</span>
            </div>
            <div class="failure-type-item">
              <span class="type-name">急性肾功能衰竭</span>
            </div>
            <div class="failure-type-item">
              <span class="type-name">急性肝功能衰竭</span>
            </div>
          </div>
          <div
            class="failure-type-item expandable"
            :class="{ active: store.triadExpanded }"
            @click="toggleTriad"
          >
            <span class="type-name">死亡三联征</span>
          </div>

          <!-- Triad Detail -->
          <div class="triad-detail-container" :class="{ show: store.triadExpanded }">
            <div class="triad-detail-header">
              <span>🔺</span>
              <span>死亡三联征 (Lethal Triad)</span>
            </div>
            <div class="triad-detail-grid">
              <div class="triad-detail-item">
                <div class="triad-detail-label">低体温</div>
                <div class="triad-detail-value danger">&lt;35°C</div>
              </div>
              <div class="triad-detail-item">
                <div class="triad-detail-label">酸中毒</div>
                <div class="triad-detail-value danger">pH &lt;7.2</div>
              </div>
              <div class="triad-detail-item">
                <div class="triad-detail-label">凝血障碍</div>
                <div class="triad-detail-value danger">PT &gt;19s</div>
              </div>
            </div>
            <div class="triad-charts-grid">
              <div class="triad-chart-item">
                <div class="triad-chart-label">有死亡三联征</div>
                <div class="triad-chart-wrap" id="triadWithChart"></div>
              </div>
              <div class="triad-chart-item">
                <div class="triad-chart-label">无死亡三联征</div>
                <div class="triad-chart-wrap" id="triadWithoutChart"></div>
              </div>
              <div class="triad-chart-item">
                <div class="triad-chart-label">填塞止血存活率</div>
                <div class="triad-chart-wrap" id="survivalRateChart"></div>
              </div>
            </div>
            <div class="triad-bar-chart-wrap">
              <div class="triad-chart-label">手术时长与死亡三联征发生率</div>
              <div id="surgeryTimeChart" style="width: 100%; height: 140px;"></div>
            </div>
            <div class="triad-large-chart">
              <div id="survivalRateChartLarge" style="width: 100%; height: 180px;"></div>
            </div>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<style scoped>
/* ── Panel ── */
.panel {
  background: rgba(10,35,50,0.7);
  border: 1px solid rgba(0,188,212,0.3);
  border-radius: 12px;
  padding: 16px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Panel title ── */
.panel-title {
  font-size: 1.15rem;
  color: #00bcd4;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(0,188,212,0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ── War history ── */
.war-history {
  padding-right: 4px;
}
.war-item {
  background: rgba(0,40,60,0.5);
  border-left: 4px solid #00bcd4;
  padding: 14px;
  margin-bottom: 10px;
  border-radius: 0 10px 10px 0;
  transition: all 0.3s;
  cursor: pointer;
}
.war-item:hover {
  background: rgba(0,188,212,0.15);
  transform: translateX(5px);
}
.war-item.active {
  background: rgba(0,188,212,0.2);
  border-left-color: #ff9800;
}
.war-name {
  font-weight: 700;
  color: #fff;
  font-size: 1.05rem;
  margin-bottom: 6px;
}
.war-info {
  font-size: 0.85rem;
  color: #7ab8c4;
  line-height: 1.5;
  margin-bottom: 8px;
}
.war-stats {
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
}
.war-stat { display: flex; align-items: center; gap: 4px; }
.war-stat-label { color: #5d8a9e; }
.war-stat-value { color: #ff9800; font-weight: 700; font-size: 1rem; }

/* ── Body panel ── */
.body-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow: hidden;
}
.body-title {
  text-align: center;
  font-size: 1.2rem;
  color: #00bcd4;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.body-container {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 10px 0 50px 0;
  height: 360px;
}

/* ── Human body SVG ── */
.human-body { width: 380px; height: 520px; }
.body-part { cursor: pointer; transition: all 0.3s ease; }
.body-part:hover { filter: brightness(1.3) drop-shadow(0 0 15px rgba(0,188,212,0.8)); }
.body-part.active { filter: brightness(1.4) drop-shadow(0 0 20px rgba(255,152,0,0.9)); }

.part-head { fill: rgba(0,188,212,0.5); stroke: #00bcd4; stroke-width: 2.5; }
.part-neck { fill: rgba(0,188,212,0.4); stroke: #00bcd4; stroke-width: 2; }
.part-chest { fill: rgba(0,188,212,0.45); stroke: #00bcd4; stroke-width: 2.5; }
.part-abdomen { fill: rgba(0,188,212,0.4); stroke: #00bcd4; stroke-width: 2.5; }
.part-pelvis { fill: rgba(0,188,212,0.45); stroke: #00bcd4; stroke-width: 2.5; }
.part-arm { fill: rgba(0,188,212,0.35); stroke: #00bcd4; stroke-width: 2; }
.part-leg { fill: rgba(0,188,212,0.35); stroke: #00bcd4; stroke-width: 2; }

.body-part:hover .part-head, .body-part.active .part-head { fill: rgba(255,152,0,0.6); stroke: #ff9800; }
.body-part:hover .part-neck, .body-part.active .part-neck { fill: rgba(255,152,0,0.5); stroke: #ff9800; }
.body-part:hover .part-chest, .body-part.active .part-chest { fill: rgba(255,152,0,0.55); stroke: #ff9800; }
.body-part:hover .part-abdomen, .body-part.active .part-abdomen { fill: rgba(255,152,0,0.5); stroke: #ff9800; }
.body-part:hover .part-pelvis, .body-part.active .part-pelvis { fill: rgba(255,152,0,0.55); stroke: #ff9800; }
.body-part:hover .part-arm, .body-part.active .part-arm { fill: rgba(255,152,0,0.45); stroke: #ff9800; }
.body-part:hover .part-leg, .body-part.active .part-leg { fill: rgba(255,152,0,0.45); stroke: #ff9800; }

.body-label {
  fill: #fff;
  font-size: 14px;
  font-weight: 700;
  text-anchor: middle;
  pointer-events: none;
  text-shadow: 0 2px 4px rgba(0,0,0,0.9);
}

/* ── Comparison charts ── */
.comparison-charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
  margin-top: 80px;
}
.comparison-chart-box {
  background: rgba(0,30,40,0.6);
  border-radius: 12px;
  border: 1px solid rgba(0,188,212,0.2);
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.comparison-title {
  font-size: 1.1rem;
  color: #00bcd4;
  font-weight: 700;
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0,188,212,0.2);
}
.comparison-chart-content { flex: 1; min-height: 0; width: 100%; }

/* ── Organ info ── */
.organ-info {
  text-align: center;
  padding: 16px;
  background: rgba(0,188,212,0.12);
  border-radius: 10px;
  border: 1px solid rgba(0,188,212,0.2);
}
.organ-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 6px;
  text-shadow: 0 0 10px rgba(0,188,212,0.5);
}
.organ-desc { font-size: 0.95rem; color: #7ab8c4; line-height: 1.5; }

.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}
.stat-box {
  background: rgba(0,30,40,0.7);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  border: 1px solid rgba(0,188,212,0.2);
}
.stat-box.highlight {
  border-color: rgba(255,152,0,0.6);
  background: rgba(255,152,0,0.1);
}
.stat-label { font-size: 0.9rem; color: #5d8a9e; margin-bottom: 6px; }
.stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: #00bcd4;
  text-shadow: 0 0 15px rgba(0,188,212,0.4);
}
.stat-value.danger { color: #ff6b6b; text-shadow: 0 0 15px rgba(255,107,107,0.4); }
.stat-unit { font-size: 0.9rem; color: #5d8a9e; margin-top: 4px; }

/* ── Organ failure panel ── */
.organ-failure-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.organ-failure-title {
  font-size: 1.1rem;
  color: #ff9800;
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,152,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.failure-types-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}
.failure-type-item {
  background: rgba(0,40,60,0.6);
  border: 1px solid rgba(0,188,212,0.2);
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
  font-size: 0.9rem;
  color: #e0f4f8;
  transition: all 0.3s;
}
.failure-type-item:hover {
  background: rgba(0,188,212,0.15);
  border-color: rgba(0,188,212,0.5);
}
.failure-type-item.expandable {
  border-color: rgba(255,152,0,0.4);
  cursor: pointer;
  position: relative;
}
.failure-type-item.expandable::after {
  content: '▼';
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  color: #ff9800;
}
.failure-type-item.expandable.active::after { content: '▲'; }
.failure-type-item.expandable:hover {
  background: rgba(255,152,0,0.1);
  border-color: rgba(255,152,0,0.7);
}
.failure-type-item .type-name { font-weight: 600; color: #00bcd4; }
.failure-type-item.expandable .type-name { color: #ff9800; }

/* ── Triad detail ── */
.triad-detail-container {
  background: rgba(0,20,30,0.9);
  border: 2px solid rgba(76,175,80,0.6);
  border-radius: 12px;
  padding: 12px;
  margin-top: 8px;
  display: none;
  flex: 1;
  overflow: hidden;
  flex-direction: column;
  min-height: 200px;
}
.triad-detail-container.show { display: flex; }

.triad-detail-header {
  font-size: 1rem;
  color: #4caf50;
  font-weight: 700;
  text-align: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(76,175,80,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
}
.triad-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.triad-detail-item {
  background: rgba(0,40,60,0.6);
  border: 1px solid rgba(0,188,212,0.2);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}
.triad-detail-label { font-size: 0.8rem; color: #5d8a9e; margin-bottom: 4px; }
.triad-detail-value { font-size: 1rem; font-weight: 700; }
.triad-detail-value.danger { color: #ff6b6b; }

.triad-charts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
  flex-shrink: 0;
}
.triad-chart-item {
  text-align: center;
}
.triad-chart-label {
  font-size: 0.75rem;
  color: #7ab8c4;
  margin-bottom: 4px;
}
.triad-chart-wrap { height: 100px; }

.triad-bar-chart-wrap {
  flex-shrink: 0;
  margin-bottom: 8px;
}
.triad-large-chart {
  flex: 1;
  min-height: 0;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
::-webkit-scrollbar-thumb { background: rgba(0,188,212,0.5); border-radius: 3px; }
</style>
