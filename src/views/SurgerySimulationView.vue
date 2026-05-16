<script setup>
import { ref, onMounted, onUnmounted, computed, shallowRef } from 'vue'

// ── Video source (resolved by Vite at build time) ──
const videoSrc = new URL('@/assets/movie/腹腔镜模拟操作系统 - 医疗教学展示.mp4', import.meta.url).href

// ── State ──
const systemTime = ref('')
const surgeryTime = ref('00:00:00')
const heartRate = ref(72)
const bloodPressure = ref('120/80')
const oxygen = ref(98)
const temperature = ref('36.5')
const videoStarted = ref(false)
const surgeryTimerRunning = ref(false)
const videoReady = ref(false)
const videoElement = shallowRef(null)

let timeInterval = null
let surgeryTimerInterval = null
let vitalsInterval = null
let surgeryStartTime = null

// ── System time ──
function updateSystemTime() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  systemTime.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

// ── Surgery timer ──
function startSurgeryTimer() {
  if (surgeryTimerRunning.value) return
  surgeryTimerRunning.value = true
  surgeryStartTime = Date.now()
  surgeryTimerInterval = setInterval(() => {
    const elapsed = Date.now() - surgeryStartTime
    const h = Math.floor(elapsed / 3600000)
    const m = Math.floor((elapsed % 3600000) / 60000)
    const s = Math.floor((elapsed % 60000) / 1000)
    const pad = n => String(n).padStart(2, '0')
    surgeryTime.value = `${pad(h)}:${pad(m)}:${pad(s)}`
  }, 1000)
}

// ── Vitals simulation ──
function updateVitals() {
  heartRate.value = Math.floor(65 + Math.random() * 20)
  const systolic = Math.floor(110 + Math.random() * 20)
  const diastolic = Math.floor(70 + Math.random() * 15)
  bloodPressure.value = `${systolic}/${diastolic}`
  oxygen.value = Math.floor(96 + Math.random() * 5)
  temperature.value = (36.3 + Math.random() * 0.7).toFixed(1)
}

// ── Video + timer start on click ──
function handleStart() {
  if (!videoStarted.value && videoElement.value) {
    videoStarted.value = true
    videoElement.value.play().catch(() => {})
  }
  if (!surgeryTimerRunning.value) {
    startSurgeryTimer()
  }
}

function onVideoCanPlay() {
  videoReady.value = true
}

onMounted(() => {
  updateSystemTime()
  timeInterval = setInterval(updateSystemTime, 1000)
  updateVitals()
  vitalsInterval = setInterval(updateVitals, 3000)
})

onUnmounted(() => {
  clearInterval(timeInterval)
  clearInterval(surgeryTimerInterval)
  clearInterval(vitalsInterval)
})
</script>

<template>
  <div class="surgery-sim w-full h-full flex flex-col overflow-hidden" style="background: linear-gradient(135deg, #0d1321 0%, #1a1f2e 100%);">
    <!-- Corner Decorations -->
    <div class="corner-tl"></div>
    <div class="corner-tr"></div>
    <div class="corner-bl"></div>
    <div class="corner-br"></div>

    <!-- Status Bar -->
    <div class="status-bar flex items-center justify-between px-8" style="height: 60px; flex-shrink: 0;">
      <div class="flex items-center gap-5">
        <span class="room-number">腹腔镜模拟操作系统</span>
        <span class="room-status">● 手术进行中</span>
      </div>
      <span class="system-time">{{ systemTime }}</span>
    </div>

    <!-- Main Content -->
    <div class="main-content flex flex-1 gap-5 p-5 overflow-hidden">
      <!-- Left: Video Section -->
      <div class="video-section flex-2 relative overflow-hidden flex items-center justify-center" @click="handleStart">
        <div class="video-label">
          <span class="recording-dot"></span>
          LIVE
        </div>

        <!-- Scanline overlay -->
        <div class="scanlines"></div>

        <!-- Actual video player -->
        <video
          ref="videoElement"
          class="surgery-video"
          muted
          loop
          playsinline
          preload="auto"
          @canplay="onVideoCanPlay"
        >
          <source :src="videoSrc" type="video/mp4" />
        </video>

        <!-- Placeholder shown until video is ready -->
        <div v-if="!videoReady" class="video-placeholder text-center">
          <div class="placeholder-icon">🎬</div>
          <div class="placeholder-text">手术模拟视频加载中...</div>
          <div class="placeholder-sub">点击画面开始播放并计时</div>
        </div>
      </div>

      <!-- Right: Monitor Panel -->
      <div class="monitor-panel flex-1 flex flex-col gap-4 overflow-y-auto">
        <!-- Patient Info -->
        <div class="panel-card">
          <div class="card-header">患者信息</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">病历号</span>
              <span class="info-value">2026-03-001</span>
            </div>
            <div class="info-item">
              <span class="info-label">姓名</span>
              <span class="info-value">王**</span>
            </div>
            <div class="info-item">
              <span class="info-label">性别/年龄</span>
              <span class="info-value">男 / 58岁</span>
            </div>
            <div class="info-item">
              <span class="info-label">手术类型</span>
              <span class="info-value">淋巴结清扫</span>
            </div>
          </div>
        </div>

        <!-- Vital Signs -->
        <div class="panel-card flex-1">
          <div class="card-header">生命体征监测</div>
          <div class="vitals-grid">
            <div class="vital-item">
              <div class="vital-icon">❤️</div>
              <div class="vital-label">心率</div>
              <div class="vital-value heart-rate">{{ heartRate }}</div>
              <div class="vital-unit">bpm</div>
            </div>
            <div class="vital-item">
              <div class="vital-icon">🩺</div>
              <div class="vital-label">血压</div>
              <div class="vital-value blood-pressure">{{ bloodPressure }}</div>
              <div class="vital-unit">mmHg</div>
            </div>
            <div class="vital-item">
              <div class="vital-icon">💨</div>
              <div class="vital-label">血氧</div>
              <div class="vital-value oxygen">{{ oxygen }}</div>
              <div class="vital-unit">%</div>
            </div>
            <div class="vital-item">
              <div class="vital-icon">🌡️</div>
              <div class="vital-label">体温</div>
              <div class="vital-value temperature">{{ temperature }}</div>
              <div class="vital-unit">°C</div>
            </div>
          </div>
        </div>

        <!-- Surgery Timer -->
        <div class="panel-card timer-card">
          <div class="timer-label">手术时间</div>
          <div class="timer-display">{{ surgeryTime }}</div>
        </div>

        <!-- Surgical Team -->
        <div class="panel-card">
          <div class="card-header">手术团队</div>
          <div class="team-list">
            <div class="team-member">
              <span class="member-role">主刀</span>
              <span class="member-name">张教授</span>
            </div>
            <div class="team-member">
              <span class="member-role">一助</span>
              <span class="member-name">李医生</span>
            </div>
            <div class="team-member">
              <span class="member-role">麻醉</span>
              <span class="member-name">王主任</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div class="bottom-bar flex items-center justify-between px-8" style="height: 40px; flex-shrink: 0;">
      <div class="connection-status flex items-center gap-2">
        <span class="status-indicator"></span>
        <span>系统连接正常</span>
      </div>
      <div>AI 医疗教学系统 v1.0</div>
    </div>
  </div>
</template>

<style scoped>
/* ── Monitor Container ── */
.surgery-sim {
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  color: #fff;
  position: relative;
  border: 8px solid #1e3a5f;
  border-radius: 12px;
  box-shadow:
    inset 0 0 80px rgba(0, 150, 255, 0.1),
    0 0 40px rgba(0, 150, 255, 0.2);
}

/* ── Corner Decorations ── */
.corner-tl, .corner-tr, .corner-bl, .corner-br {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 2px solid #00d4ff;
  z-index: 30;
  pointer-events: none;
}
.corner-tl { top: 68px; left: 8px; border-right: none; border-bottom: none; }
.corner-tr { top: 68px; right: 8px; border-left: none; border-bottom: none; }
.corner-bl { bottom: 48px; left: 8px; border-right: none; border-top: none; }
.corner-br { bottom: 48px; right: 8px; border-left: none; border-top: none; }

/* ── Status Bar ── */
.status-bar {
  background: linear-gradient(90deg, #0d1b2a 0%, #1b263b 50%, #0d1b2a 100%);
  border-bottom: 2px solid #2e5c8a;
  position: relative;
}
.status-bar::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00d4ff, transparent);
  animation: scanline 3s linear infinite;
}

@keyframes scanline {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.room-number {
  font-size: 20px;
  font-weight: bold;
  color: #00d4ff;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.room-status {
  background: #e63946;
  color: #fff;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  animation: pulse-opacity 2s ease-in-out infinite;
}

@keyframes pulse-opacity {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.system-time {
  font-size: 18px;
  color: #00d4ff;
  font-family: 'Courier New', monospace;
}

/* ── Main Content ── */
.main-content {
  min-height: 0;
}

/* ── Video Section ── */
.video-section {
  background: #000;
  border: 3px solid #2e5c8a;
  border-radius: 8px;
  cursor: pointer;
}

.scanlines {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 212, 255, 0.03) 2px,
    rgba(0, 212, 255, 0.03) 4px
  );
  pointer-events: none;
  z-index: 10;
}

.video-label {
  position: absolute;
  top: 15px;
  left: 15px;
  background: rgba(230, 57, 70, 0.9);
  color: #fff;
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
}

.recording-dot {
  width: 10px;
  height: 10px;
  background: #fff;
  border-radius: 50%;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.surgery-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #4a5568;
  z-index: 5;
}

.placeholder-icon {
  font-size: 80px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.placeholder-text {
  font-size: 20px;
  color: #718096;
  margin-bottom: 8px;
}

.placeholder-sub {
  font-size: 14px;
  color: #4a5568;
}

/* ── Monitor Panel ── */
.monitor-panel {
  min-width: 320px;
}

.panel-card {
  background: linear-gradient(135deg, #1b263b 0%, #0d1b2a 100%);
  border: 1px solid #2e5c8a;
  border-radius: 8px;
  padding: 18px;
}

.card-header {
  font-size: 13px;
  color: #00d4ff;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 14px;
  border-bottom: 1px solid #2e5c8a;
  padding-bottom: 10px;
}

/* ── Patient Info ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #718096;
}

.info-value {
  font-size: 15px;
  color: #fff;
  font-weight: 500;
}

/* ── Vitals ── */
.vitals-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 10px;
}

.vital-item {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 14px;
  text-align: center;
  border: 1px solid rgba(46, 92, 138, 0.3);
}

.vital-icon {
  font-size: 22px;
  margin-bottom: 6px;
}

.vital-label {
  font-size: 11px;
  color: #718096;
  margin-bottom: 4px;
}

.vital-value {
  font-size: 26px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.vital-unit {
  font-size: 11px;
  color: #718096;
}

.heart-rate { color: #e63946; }
.blood-pressure { color: #00d4ff; }
.oxygen { color: #48bb78; }
.temperature { color: #ed8936; }

/* ── Timer ── */
.timer-card {
  text-align: center;
}

.timer-display {
  font-size: 44px;
  font-weight: bold;
  color: #00d4ff;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
  margin-top: 8px;
}

.timer-label {
  font-size: 12px;
  color: #718096;
  text-transform: uppercase;
  letter-spacing: 3px;
}

/* ── Team ── */
.team-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.team-member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.member-role {
  font-size: 11px;
  color: #00d4ff;
  background: rgba(0, 212, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.member-name {
  font-size: 14px;
  color: #fff;
}

/* ── Bottom Bar ── */
.bottom-bar {
  background: linear-gradient(90deg, #0d1b2a 0%, #1b263b 50%, #0d1b2a 100%);
  border-top: 1px solid #2e5c8a;
  font-size: 12px;
  color: #718096;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  background: #48bb78;
  border-radius: 50%;
  animation: pulse-opacity 2s infinite;
}
</style>
