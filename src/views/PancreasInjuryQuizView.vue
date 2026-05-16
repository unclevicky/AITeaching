<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useQuizStore } from '@/stores/quiz'
import * as echarts from 'echarts'

const store = useQuizStore()
const questions = store.pancreasInjuryQuestions
const CHART_COLORS = ['#5470C6', '#91CC75', '#FAC858', '#EE6666']

// ── Local state ──
const currentView = ref('list')
const currentQIdx = ref(0)
const secondsLeft = ref(3)
const answeredCount = ref(0)
const isSimulating = ref(false)
const finalCounts = ref(null)
const resultsOverviewVisible = ref(false)
const showChart = ref(false)
let chart = null
let timerHandle = null
let countdownHandle = null

const countdownSeconds = computed(() => {
  return currentQIdx.value < 2 ? 3 : 10
})

const progressPercent = computed(() => (answeredCount.value / store.TOTAL_STUDENTS) * 100)
const countdownProgress = computed(() => (secondsLeft.value / countdownSeconds.value) * 100)

// ── Chart container ref ──
const chartContainer = ref(null)

function getChartType() {
  const q = questions[currentQIdx.value]
  if (!q) return 'pie'
  if (q.isMultipleChoice || q.useBarChart) return 'bar'
  return 'pie'
}

function initChart() {
  if (chart) chart.dispose()
  if (!chartContainer.value) return
  chart = echarts.init(chartContainer.value)
  const type = getChartType()
  const q = questions[currentQIdx.value]

  let option
  if (type === 'bar') {
    option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function (params) {
          const data = params[0]
          return `${data.name}<br/>占比：${data.value}%`
        },
      },
      grid: { left: '3%', right: '15%', bottom: '3%', top: '5%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 12, color: '#8ba2b8' },
        splitLine: { lineStyle: { color: 'rgba(0,180,255,0.06)' } },
      },
      yAxis: {
        type: 'category',
        data: [],
        axisLabel: { fontSize: 11, color: '#b0c4d8' },
        axisLine: { lineStyle: { color: 'rgba(0,180,255,0.1)' } },
      },
      series: [{
        type: 'bar',
        data: [],
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: function (params) {
            if (q && q.isMultipleChoice) {
              const correctKey = q.correctOptions.join(',')
              return params.data.key === correctKey ? '#91CC75' : '#5470C6'
            } else if (q && q.useBarChart) {
              return params.data.isCorrect ? '#91CC75' : '#5470C6'
            }
            return '#5470C6'
          },
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          fontSize: 11,
          color: '#b0c4d8',
        },
        barWidth: '60%',
        animationDuration: 500,
      }],
    }
  } else {
    option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}：{c} 人（{d}%）',
      },
      series: [{
        type: 'pie',
        radius: ['35%', '60%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 5,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0a1628',
          borderWidth: 2,
        },
        label: {
          show: true,
          position: 'outside',
          formatter: function (params) {
            const letter = params.name.split('.')[0].trim()
            const count = params.value || 0
            const percent = params.percent ? Math.round(params.percent) : 0
            return letter + '\n' + count + '人 ' + percent + '%'
          },
          fontSize: 11,
          color: '#b0c4d8',
          fontWeight: 600,
          lineHeight: 14,
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 25,
        },
        emphasis: {
          scaleSize: 8,
          label: { fontSize: 12, fontWeight: 'bold' },
        },
        animationType: 'scale',
        animationEasing: 'cubicOut',
        animationDuration: 400,
        data: [],
      }],
    }
  }
  chart.setOption(option, true)
}

function updatePieChart(counts, options) {
  const letters = ['A', 'B', 'C', 'D']
  const data = options
    .map((opt, i) => ({
      value: counts[i] || 0,
      name: `${letters[i]}. ${opt}`,
      itemStyle: { color: CHART_COLORS[i] },
    }))
    .filter((d) => d.value > 0)
  chart.setOption({ series: [{ data }] })
}

function updateBarChart(counts, question) {
  const letters = ['A', 'B', 'C', 'D']

  if (question.isMultipleChoice) {
    const combinationCounts = {}
    Object.entries(question.combinationWeights).forEach(([key, weight]) => {
      const count = Math.round(weight * store.TOTAL_STUDENTS)
      if (count > 0) {
        const label = key.split(',').map(i => letters[parseInt(i)]).join('')
        combinationCounts[label] = { count, key, percent: Math.round(weight * 100) }
      }
    })
    const sortedData = Object.entries(combinationCounts).sort((a, b) => b[1].percent - a[1].percent)
    const categories = sortedData.map(([label]) => label)
    const data = sortedData.map(([, info]) => ({
      value: info.percent,
      key: info.key,
      count: info.count,
    }))
    chart.setOption({
      yAxis: { data: categories },
      series: [{
        data: data.map(d => ({ ...d, itemLabel: d.count + '人 (' + d.value + '%)' })),
        label: {
          show: true,
          position: 'right',
          formatter: function (p) { return p.data.itemLabel },
          fontSize: 12,
          color: '#b0c4d8',
        },
      }],
    })
  } else if (question.useBarChart) {
    const categories = []
    const data = []
    for (let i = question.options.length - 1; i >= 0; i--) {
      const weight = question.weights[i]
      const count = Math.round(weight * store.TOTAL_STUDENTS)
      const percent = Math.round(weight * 100)
      categories.push(letters[i])
      data.push({ value: percent, count, isCorrect: i === question.correctIndex })
    }
    chart.setOption({
      yAxis: { data: categories },
      series: [{
        data: data.map(d => ({ ...d, itemLabel: d.count + '人 (' + d.value + '%)' })),
        label: {
          show: true,
          position: 'right',
          formatter: function (p) { return p.data.itemLabel },
          fontSize: 12,
          color: '#b0c4d8',
        },
      }],
    })
  }
}

function highlightCorrect() {
  const q = questions[currentQIdx.value]
  if (q.isMultipleChoice && q.correctOptions) {
    q.correctOptions.forEach(idx => {
      const el = document.getElementById(`option-${idx}`)
      if (el) el.classList.add('correct')
    })
  } else {
    const el = document.getElementById(`option-${q.correctIndex}`)
    if (el) el.classList.add('correct')
  }
}

function renderLegend(options) {
  const letters = ['A', 'B', 'C', 'D']
  return options
    .map(
      (opt, i) =>
        `<div class="legend-item"><span class="legend-dot" style="background:${CHART_COLORS[i]}"></span>${letters[i]}. ${opt}</div>`
    )
    .join('')
}

function generateAnswerSequence(question) {
  const seq = []
  if (question.isMultipleChoice && question.combinationWeights) {
    Object.entries(question.combinationWeights).forEach(([key, weight]) => {
      const count = Math.round(weight * store.TOTAL_STUDENTS)
      for (let i = 0; i < count; i++) {
        seq.push(key.split(',').map(Number))
      }
    })
  } else {
    for (let i = 0; i < store.TOTAL_STUDENTS; i++) {
      const r = Math.random()
      let sum = 0
      for (let j = 0; j < question.weights.length; j++) {
        sum += question.weights[j]
        if (r < sum) { seq.push(j); break }
      }
    }
  }
  return seq.sort(() => Math.random() - 0.5)
}

function showDetail(index) {
  currentQIdx.value = index
  const q = questions[index]
  const cdSeconds = index < 2 ? 3 : 10

  currentView.value = 'detail'
  secondsLeft.value = cdSeconds
  answeredCount.value = 0
  finalCounts.value = null
  showChart.value = false

  nextTick(() => {
    initChart()
    startSimulation(q, cdSeconds)
  })
}

function startSimulation(question, cdSeconds) {
  const counts = [0, 0, 0, 0]
  let answered = 0
  secondsLeft.value = cdSeconds
  isSimulating.value = true
  const intervalMs = (cdSeconds * 1000) / store.TOTAL_STUDENTS
  const answerSequence = generateAnswerSequence(question)

  countdownHandle = setInterval(() => {
    secondsLeft.value--
    if (secondsLeft.value < 0) secondsLeft.value = 0
    if (secondsLeft.value <= 0) clearInterval(countdownHandle)
  }, 1000)

  timerHandle = setInterval(() => {
    if (answered >= store.TOTAL_STUDENTS) {
      clearInterval(timerHandle)
      isSimulating.value = false
      finalCounts.value = counts
      showChart.value = true

      const q = questions[currentQIdx.value]
      if (q.isMultipleChoice || q.useBarChart) {
        updateBarChart(counts, q)
      } else {
        updatePieChart(counts, q.options)
      }
      highlightCorrect()
      return
    }

    if (question.isMultipleChoice && question.combinationWeights) {
      const selectedOptions = answerSequence[answered]
      selectedOptions.forEach(idx => { counts[idx]++ })
    } else {
      const choice = answerSequence[answered]
      counts[choice]++
    }
    answered++
    answeredCount.value = answered
  }, intervalMs)
}

function showList() {
  clearInterval(timerHandle)
  clearInterval(countdownHandle)
  if (chart) { chart.dispose(); chart = null }
  currentView.value = 'list'
}

function toggleResultsOverview() {
  resultsOverviewVisible.value = !resultsOverviewVisible.value
}

function getResultsData() {
  return questions.map((q, idx) => {
    const counts = new Array(q.options.length).fill(0)
    if (q.isMultipleChoice && q.combinationWeights) {
      Object.entries(q.combinationWeights).forEach(([key, weight]) => {
        const count = Math.round(weight * store.TOTAL_STUDENTS)
        key.split(',').map(Number).forEach(i => { counts[i] += count })
      })
    } else {
      for (let i = 0; i < store.TOTAL_STUDENTS; i++) {
        const r = Math.random()
        let sum = 0
        for (let j = 0; j < q.weights.length; j++) {
          sum += q.weights[j]
          if (r < sum) { counts[j]++; break }
        }
      }
    }
    return { questionIdx: idx, counts, total: store.TOTAL_STUDENTS }
  })
}

function getCombinationResults(question) {
  return Object.entries(question.combinationWeights)
    .sort((a, b) => b[1] - a[1])
    .map(([key, weight]) => ({
      key,
      label: key.split(',').map(i => ['A', 'B', 'C', 'D'][parseInt(i)]).join(''),
      count: Math.round(weight * store.TOTAL_STUDENTS),
      percent: Math.round(weight * 100),
      isCorrect: key === question.correctOptions.join(','),
    }))
}

onUnmounted(() => {
  clearInterval(timerHandle)
  clearInterval(countdownHandle)
  if (chart) chart.dispose()
})
</script>

<template>
  <div class="quiz-view w-full h-full overflow-y-auto" style="background: #0a1628; padding: 24px 32px;">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6" style="padding-bottom: 16px; border-bottom: 1px solid rgba(0,180,255,0.15);">
      <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #5470c6, #91cc75); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; font-weight: 700; flex-shrink: 0;">Q</div>
      <div>
        <h1 style="font-size: 20px; font-weight: 700; color: #00d4ff; margin: 0;">课堂互动答题</h1>
        <p style="font-size: 13px; color: #7a8ba6; margin: 2px 0 0;">胰腺损伤专题 · 20人参与</p>
      </div>
    </div>

    <!-- List View -->
    <div v-if="currentView === 'list'">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 22px; font-weight: 600; color: #e0e8f0; margin-bottom: 6px;">胰腺损伤专题测验</h2>
        <p style="font-size: 14px; color: #7a8ba6;">共 {{ questions.length }} 道题目，点击查看答题详情与学生作答分布</p>
      </div>

      <div style="margin-bottom: 24px;">
        <div
          v-for="(q, i) in questions"
          :key="i"
          @click="showDetail(i)"
          class="question-card"
        >
          <div :class="['card-index', `card-index-${i}`]">{{ i + 1 }}</div>
          <div class="card-body">
            <div class="card-title">{{ q.title }}</div>
            <div class="card-brief">{{ q.brief }}</div>
          </div>
          <span class="card-arrow">›</span>
        </div>
      </div>

      <!-- View Results Button -->
      <button class="view-results-btn" @click="toggleResultsOverview">
        <span>📊</span>
        <span>{{ resultsOverviewVisible ? '隐藏答题结果概览' : '查看答题结果概览' }}</span>
      </button>

      <!-- Results Overview -->
      <div v-if="resultsOverviewVisible" class="results-overview">
        <h2>📊 答题结果概览</h2>
        <div v-for="(q, idx) in questions" :key="idx" class="result-item">
          <div class="result-title">题目 {{ idx + 1 }}: {{ q.title }}</div>

          <!-- Multiple Choice: combination distribution -->
          <div v-if="q.isMultipleChoice" class="result-combo">
            <div v-for="combo in getCombinationResults(q)" :key="combo.key" class="result-bar">
              <div class="result-bar-label" :style="{ color: combo.isCorrect ? '#91CC75' : '#8ba2b8' }">
                {{ combo.label }} <span v-if="combo.isCorrect">✓</span>
              </div>
              <div class="result-bar-track">
                <div class="result-bar-fill" :style="{ width: combo.percent + '%', background: combo.isCorrect ? '#91CC75' : '#5470C6' }">
                  <span v-if="combo.percent > 15" class="result-bar-text">{{ combo.percent }}%</span>
                </div>
              </div>
              <div class="result-bar-count">{{ combo.count }}人</div>
            </div>
          </div>

          <!-- Bar Chart single choice -->
          <div v-else-if="q.useBarChart" class="result-bars">
            <div v-for="(opt, i) in q.options" :key="i" class="result-bar">
              <div class="result-bar-label" :style="{ color: i === q.correctIndex ? '#91CC75' : '#8ba2b8' }">
                {{ ['A', 'B', 'C', 'D'][i] }} <span v-if="i === q.correctIndex">✓</span>
              </div>
              <div class="result-bar-track">
                <div class="result-bar-fill" :style="{ width: (q.weights[i] * 100) + '%', background: i === q.correctIndex ? '#91CC75' : CHART_COLORS[i] }">
                  <span v-if="q.weights[i] > 0.15" class="result-bar-text">{{ Math.round(q.weights[i] * 100) }}%</span>
                </div>
              </div>
              <div class="result-bar-count">{{ Math.round(q.weights[i] * 20) }}人</div>
            </div>
          </div>

          <!-- Regular single choice -->
          <div v-else class="result-bars">
            <div v-for="(opt, i) in q.options" :key="i" class="result-bar">
              <div class="result-bar-label" :style="{ color: i === q.correctIndex ? '#91CC75' : '#8ba2b8' }">
                {{ ['A', 'B', 'C', 'D'][i] }} <span v-if="i === q.correctIndex">✓</span>
              </div>
              <div class="result-bar-track">
                <div class="result-bar-fill" :style="{ width: (q.weights[i] * 100) + '%', background: i === q.correctIndex ? '#91CC75' : CHART_COLORS[i] }">
                  <span v-if="q.weights[i] > 0.15" class="result-bar-text">{{ Math.round(q.weights[i] * 100) }}%</span>
                </div>
              </div>
              <div class="result-bar-count">{{ Math.round(q.weights[i] * 20) }}人</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail View -->
    <div v-else>
      <button class="back-btn" @click="showList">← 返回题目列表</button>

      <div class="detail-card">
        <div class="detail-header">
          <span class="detail-tag">题目 {{ currentQIdx + 1 }} / {{ questions.length }}</span>
          <h2 class="detail-title">{{ questions[currentQIdx].title }}</h2>
          <p class="detail-desc">{{ questions[currentQIdx].description }}</p>
        </div>

        <div class="detail-body">
          <!-- Left: Options -->
          <div class="detail-left">
            <div class="options-title">{{ questions[currentQIdx].isMultipleChoice ? '选项（多选）' : '选项' }}</div>
            <div v-for="(opt, i) in questions[currentQIdx].options" :key="i" :id="'option-' + i" class="option-item">
              <div class="option-letter">{{ ['A', 'B', 'C', 'D'][i] }}</div>
              <div class="option-text">{{ opt }}</div>
            </div>
          </div>

          <!-- Right: Timer + Chart -->
          <div class="detail-right">
            <div class="timer-section">
              <div class="timer-circle" :style="{ '--progress': countdownProgress + '%' }">
                <div class="timer-inner">{{ secondsLeft }}</div>
              </div>
              <div class="timer-info">
                <div class="timer-label">答题倒计时</div>
                <div class="timer-progress-bar">
                  <div class="timer-progress-fill" :style="{ width: progressPercent + '%' }"></div>
                </div>
              </div>
            </div>

            <div
              ref="chartContainer"
              :class="['chart-container', { show: showChart }]"
            ></div>

            <div class="chart-legend" v-html="renderLegend(questions[currentQIdx].options)"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Question Cards */
.question-card {
  background: rgba(13, 31, 51, 0.8);
  border-radius: 12px;
  padding: 24px 28px;
  margin-bottom: 16px;
  cursor: pointer;
  border: 1px solid rgba(0, 180, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 18px;
}
.question-card:hover {
  border-color: rgba(0, 180, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 180, 255, 0.1);
  transform: translateY(-2px);
}

.card-index {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}
.card-index-0 { background: linear-gradient(135deg, #5470c6, #7b9cf7); }
.card-index-1 { background: linear-gradient(135deg, #91cc75, #b5e89b); }
.card-index-2 { background: linear-gradient(135deg, #fac858, #ffd97a); }

.card-body { flex: 1; }
.card-title { font-size: 16px; font-weight: 600; color: #e0e8f0; margin-bottom: 6px; }
.card-brief { font-size: 13px; color: #7a8ba6; line-height: 1.5; }

.card-arrow { color: #4a5568; font-size: 20px; transition: color 0.2s; }
.question-card:hover .card-arrow { color: #00d4ff; }

/* Back Button */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #00d4ff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 20px;
  padding: 6px 0;
  transition: color 0.2s;
}
.back-btn:hover { color: #00a8cc; }

/* Detail Card */
.detail-card {
  background: rgba(13, 31, 51, 0.85);
  border-radius: 14px;
  border: 1px solid rgba(0, 180, 255, 0.12);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.detail-header {
  padding: 28px 32px 20px;
  border-bottom: 1px solid rgba(0, 180, 255, 0.08);
}

.detail-tag {
  display: inline-block;
  background: rgba(0, 180, 255, 0.15);
  color: #00d4ff;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 12px;
}

.detail-title { font-size: 20px; font-weight: 600; color: #e0e8f0; margin-bottom: 10px; }
.detail-desc { font-size: 14px; color: #8ba2b8; line-height: 1.7; }

.detail-body { display: flex; gap: 0; }
.detail-left {
  flex: 1;
  padding: 28px 32px;
  border-right: 1px solid rgba(0, 180, 255, 0.08);
}

.options-title {
  font-size: 13px;
  font-weight: 600;
  color: #7a8ba6;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid rgba(0, 180, 255, 0.08);
  margin-bottom: 10px;
  background: rgba(10, 22, 40, 0.5);
  transition: all 0.3s;
}
.option-item.correct {
  border-color: #91cc75;
  background: rgba(145, 204, 117, 0.1);
}
.option-item.correct .option-letter {
  background: #91cc75;
  color: #fff;
}
.option-item.correct .option-text {
  color: #91cc75;
  font-weight: 500;
}

.option-letter {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 8px;
  background: rgba(0, 180, 255, 0.15);
  color: #00d4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.3s;
}

.option-text { font-size: 14px; color: #b0c4d8; }

/* Right Panel */
.detail-right {
  width: 420px;
  min-width: 420px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timer-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  width: 100%;
}

.timer-circle {
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 50%;
  background: conic-gradient(#00d4ff var(--progress, 100%), rgba(0, 180, 255, 0.1) var(--progress, 100%));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.timer-inner {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #0a1628;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #00d4ff;
}

.timer-info { flex: 1; }
.timer-label { font-size: 12px; color: #7a8ba6; margin-bottom: 2px; }

.timer-progress-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 180, 255, 0.1);
  overflow: hidden;
}

.timer-progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #00d4ff, #00ccaa);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.chart-container {
  width: 360px;
  height: 360px;
  display: none;
}
.chart-container.show { display: block; }

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 4px;
  justify-content: center;
}

:deep(.legend-item) {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8ba2b8;
}
:deep(.legend-dot) {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

/* View Results Button */
.view-results-btn {
  background: linear-gradient(135deg, #5470c6, #91cc75);
  color: #fff;
  border: none;
  padding: 14px 32px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}
.view-results-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(84, 112, 198, 0.3);
}

/* Results Overview */
.results-overview {
  background: rgba(13, 31, 51, 0.85);
  border-radius: 12px;
  padding: 24px;
  margin-top: 32px;
  border: 1px solid rgba(0, 180, 255, 0.12);
}
.results-overview h2 {
  font-size: 18px;
  font-weight: 600;
  color: #e0e8f0;
  margin-bottom: 20px;
}

.result-item {
  padding: 16px;
  border-bottom: 1px solid rgba(0, 180, 255, 0.06);
}
.result-item:last-child { border-bottom: none; }

.result-title {
  font-size: 14px;
  font-weight: 600;
  color: #b0c4d8;
  margin-bottom: 12px;
}

.result-bars { display: flex; flex-direction: column; gap: 8px; }
.result-combo { display: flex; flex-direction: column; gap: 8px; }

.result-bar { display: flex; align-items: center; gap: 12px; }
.result-bar-label {
  width: 60px;
  font-size: 13px;
  font-weight: 500;
}
.result-bar-track {
  flex: 1;
  height: 24px;
  background: rgba(0, 180, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}
.result-bar-fill {
  height: 100%;
  border-radius: 12px;
  transition: width 0.6s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
}
.result-bar-text {
  font-size: 12px;
  color: #fff;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
.result-bar-count {
  width: 60px;
  text-align: right;
  font-size: 13px;
  color: #7a8ba6;
}
</style>
