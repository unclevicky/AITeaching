<script setup>
import { ref } from 'vue'

const isDragging = ref(false)
const uploadedFile = ref(null)
const isAnalyzing = ref(false)
const diagnosisResult = ref('')
const resultLines = ref([])

const mockDiagnosisText = [
  '正在分析影像数据...',
  '检测到肺部右中叶存在不规则结节影，直径约 8.3mm。',
  'CT 值范围：-120 ~ +45 HU，边界欠清晰。',
  'AI 辅助诊断意见：',
  '  1. 考虑炎性结节可能性较大（置信度 72%）',
  '  2. 不除外早期占位，建议 3 个月后复查 HRCT',
  '  3. 建议结合肿瘤标志物（CEA、CYFRA21-1）综合评估',
  '诊断完成。如需进一步分析，请上传更多影像序列。'
]

function handleDrop(e) {
  e.preventDefault()
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files?.length) {
    handleFile(files[0])
  }
}

function handleFileInput(e) {
  const files = e.target.files
  if (files?.length) {
    handleFile(files[0])
  }
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) return
  uploadedFile.value = {
    name: file.name,
    size: (file.size / 1024).toFixed(1) + ' KB',
    url: URL.createObjectURL(file)
  }
}

function startAnalysis() {
  if (!uploadedFile.value || isAnalyzing.value) return
  isAnalyzing.value = true
  resultLines.value = []
  diagnosisResult.value = ''

  let i = 0
  const interval = setInterval(() => {
    if (i < mockDiagnosisText.length) {
      resultLines.value.push(mockDiagnosisText[i])
      i++
    } else {
      clearInterval(interval)
      isAnalyzing.value = false
    }
  }, 600)
}

function reset() {
  uploadedFile.value = null
  diagnosisResult.value = ''
  resultLines.value = []
  isAnalyzing.value = false
}
</script>

<template>
  <div class="diagnosis-view w-full h-full p-6 overflow-y-auto scrollbar-thin">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-cyber-cyan glow-text">智能诊断</h1>
      <p class="text-dark-muted text-sm mt-1">CT 影像分析 · AI 辅助诊断</p>
    </div>

    <div class="grid grid-cols-2 gap-6 h-[calc(100%-4rem)]">
      <!-- Left: Upload Area -->
      <div class="flex flex-col gap-4">
        <!-- Upload Zone -->
        <div
          class="upload-zone glass-card p-8 flex-1 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer min-h-64"
          :class="isDragging ? 'border-cyber-cyan glow-border' : 'border-dark-border'"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop="handleDrop"
          @click="$refs.fileInput.click()"
        >
          <input ref="fileInput" type="file" accept="image/*,.dcm" class="hidden" @change="handleFileInput" />

          <template v-if="!uploadedFile">
            <div class="w-16 h-16 rounded-full bg-cyber-cyan/10 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-cyber-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p class="text-dark-text font-medium mb-1">拖拽 CT 影像至此处</p>
            <p class="text-dark-muted text-sm">或点击选择文件 · 支持 DICOM / PNG / JPG</p>
          </template>

          <template v-else>
            <div class="w-full h-full flex flex-col items-center justify-center">
              <img :src="uploadedFile.url" class="max-h-40 rounded-lg mb-3 object-contain" alt="CT Preview" />
              <p class="text-dark-text text-sm">{{ uploadedFile.name }}</p>
              <p class="text-dark-muted text-xs">{{ uploadedFile.size }}</p>
            </div>
          </template>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3">
          <button
            class="flex-1 py-3 rounded-xl font-medium transition-all duration-300 bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/50 hover:bg-cyber-cyan hover:text-dark-bg disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!uploadedFile || isAnalyzing"
            @click="startAnalysis"
          >
            <span v-if="isAnalyzing" class="flex items-center justify-center gap-2">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="30 70" />
              </svg>
              分析中...
            </span>
            <span v-else>开始 AI 诊断</span>
          </button>
          <button
            class="px-6 py-3 rounded-xl font-medium transition-all duration-300 text-dark-muted border border-dark-border hover:text-dark-text hover:border-cyber-cyan/30"
            @click="reset"
          >
            重置
          </button>
        </div>
      </div>

      <!-- Right: Result Stream -->
      <div class="glass-card p-6 flex flex-col">
        <div class="flex items-center gap-2 mb-4 pb-3 border-b border-dark-border">
          <div class="w-2 h-2 rounded-full bg-cyber-teal animate-pulse"></div>
          <span class="text-sm font-medium text-dark-text">诊断结果</span>
        </div>

        <div class="flex-1 overflow-y-auto scrollbar-thin font-mono text-sm leading-relaxed">
          <template v-if="resultLines.length">
            <div v-for="(line, idx) in resultLines" :key="idx"
              class="py-1 transition-all duration-300"
              :class="line.startsWith('  ') ? 'text-dark-muted pl-4' : 'text-dark-text'">
              {{ line }}
            </div>
            <div v-if="isAnalyzing" class="py-1 text-cyber-cyan">▌</div>
          </template>
          <template v-else>
            <div class="text-dark-muted text-center mt-20">
              <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>上传影像后开始诊断</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-zone {
  border: 2px dashed rgba(0, 180, 255, 0.2);
}

.upload-zone:hover {
  border-color: rgba(0, 212, 255, 0.5);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.15);
}
</style>
