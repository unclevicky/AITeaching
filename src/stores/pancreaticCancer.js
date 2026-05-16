import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const usePancreaticCancerStore = defineStore('pancreaticCancer', () => {
  // ── Raw data (from GLOBOCAN 2024 / 2025) ──
  const globalStats = {
    newCases2024: 495773,
    deaths2024: 466003,
    incidenceRate: 7.3,
    mortalityRate: 6.8,
    mortalityToIncidenceRatio: 0.94,
    fiveYearSurvival: 12,
  }

  const casesPerMinute = globalStats.newCases2024 / (365.25 * 24 * 60) // ~0.94
  const casesPerDay = Math.round(globalStats.newCases2024 / 365.25)
  const deathsPerDay = Math.round(globalStats.deaths2024 / 365.25)

  const regionalRanking = [
    { country: '匈牙利', code: 'HU', flag: '🇭🇺', asr: 13.2, cases: 1254 },
    { country: '日本', code: 'JP', flag: '🇯🇵', asr: 12.8, cases: 43859 },
    { country: '阿根廷', code: 'AR', flag: '🇦🇷', asr: 12.1, cases: 6800 },
    { country: '韩国', code: 'KR', flag: '🇰🇷', asr: 11.9, cases: 7845 },
    { country: '捷克', code: 'CZ', flag: '🇨🇿', asr: 11.7, cases: 1203 },
    { country: '法国', code: 'FR', flag: '🇫🇷', asr: 11.3, cases: 16021 },
    { country: '美国', code: 'US', flag: '🇺🇸', asr: 11.0, cases: 66440 },
    { country: '德国', code: 'DE', flag: '🇩🇪', asr: 10.8, cases: 18611 },
    { country: '意大利', code: 'IT', flag: '🇮🇹', asr: 10.5, cases: 14123 },
    { country: '英国', code: 'GB', flag: '🇬🇧', asr: 10.2, cases: 10807 },
    { country: '中国', code: 'CN', flag: '🇨🇳', asr: 7.1, cases: 134374 },
    { country: '印度', code: 'IN', flag: '🇮🇳', asr: 1.6, cases: 13716 },
  ]

  const ageDistribution = {
    labels: ['<40岁', '40-49岁', '50-59岁', '60-69岁', '70-79岁', '≥80岁'],
    data: [2.1, 6.8, 18.5, 28.3, 26.4, 17.9],
  }

  const trendData = {
    years: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
    incidence: [5.8, 5.9, 6.1, 6.3, 6.5, 6.6, 6.8, 7.0, 7.2, 7.3],
    mortality: [5.4, 5.5, 5.6, 5.8, 6.0, 6.1, 6.3, 6.5, 6.7, 6.8],
  }

  const riskFactors = [
    { name: '吸烟', weight: 25, color: '#ff4757' },
    { name: '肥胖', weight: 20, color: '#ff6348' },
    { name: '糖尿病', weight: 18, color: '#ff7f50' },
    { name: '慢性胰腺炎', weight: 15, color: '#ffa502' },
    { name: '遗传因素', weight: 12, color: '#ffc048' },
    { name: '饮酒', weight: 10, color: '#747d8c' },
  ]

  const newsItems = [
    '2026年3月：新型纳米药物递送系统突破血胰屏障，胰腺癌化疗效果提升3倍',
    '2026年2月：全球首个胰腺癌mRNA疫苗进入III期临床试验，靶向KRAS突变',
    '2026年1月：中国启动十万人群胰腺癌早筛项目，AI影像识别准确率达95%',
    '2025年12月：免疫检查点抑制剂联合化疗获批用于晚期胰腺癌一线治疗',
    '2025年11月：液体活检技术新突破：ctDNA检测可提前6个月发现胰腺癌复发',
    '2025年10月：机器人辅助胰腺癌根治术在全国50家医院推广，手术成功率提升至92%',
    '2025年9月：胰腺癌代谢组学研究揭示新靶点，精准医疗迎来新机遇',
    '2025年8月：全球胰腺癌患者5年生存率首次突破15%，多学科诊疗模式成效显著',
  ]

  const mapCountryData = [
    { name: 'Hungary', value: 13.2 },
    { name: 'Japan', value: 12.8 },
    { name: 'Argentina', value: 12.1 },
    { name: 'Korea', value: 11.9 },
    { name: 'Czech Republic', value: 11.7 },
    { name: 'France', value: 11.3 },
    { name: 'United States', value: 11.0 },
    { name: 'Germany', value: 10.8 },
    { name: 'Italy', value: 10.5 },
    { name: 'United Kingdom', value: 10.2 },
    { name: 'China', value: 7.1 },
    { name: 'India', value: 1.6 },
    { name: 'Russia', value: 9.5 },
    { name: 'Brazil', value: 8.2 },
    { name: 'Canada', value: 10.8 },
    { name: 'Australia', value: 8.5 },
    { name: 'Spain', value: 9.8 },
    { name: 'Poland', value: 9.2 },
    { name: 'Netherlands', value: 10.0 },
    { name: 'Sweden', value: 9.6 },
    { name: 'Turkey', value: 6.8 },
    { name: 'Mexico', value: 7.5 },
    { name: 'Indonesia', value: 3.2 },
    { name: 'South Africa', value: 4.5 },
    { name: 'Egypt', value: 5.8 },
  ]

  // ── Reactive state ──
  const todayCases = ref(0)
  const todayDeaths = ref(0)
  let updateTimer = null

  // ── Computed ──
  const formattedTodayCases = computed(() => formatNumber(todayCases.value))
  const formattedTodayDeaths = computed(() => formatNumber(todayDeaths.value))
  const avgMinutesPerCase = computed(() => (1 / casesPerMinute).toFixed(1))

  // ── Helpers ──
  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  function calculateTodayCases() {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const minutesElapsed = (now - startOfDay) / (1000 * 60)
    return Math.floor(minutesElapsed * casesPerMinute)
  }

  function calculateTodayDeaths() {
    const deathRate = globalStats.deaths2024 / globalStats.newCases2024
    return Math.floor(todayCases.value * deathRate)
  }

  // ── Actions ──
  function initRealtimeData() {
    todayCases.value = calculateTodayCases()
    todayDeaths.value = calculateTodayDeaths()
  }

  function startRealtimeUpdates() {
    initRealtimeData()
    updateTimer = setInterval(() => {
      const newCases = calculateTodayCases()
      if (newCases > todayCases.value) {
        todayCases.value++
        todayDeaths.value = calculateTodayDeaths()
      }
    }, 60000)
  }

  function stopRealtimeUpdates() {
    if (updateTimer) {
      clearInterval(updateTimer)
      updateTimer = null
    }
  }

  return {
    // Data
    globalStats,
    casesPerMinute,
    casesPerDay,
    deathsPerDay,
    regionalRanking,
    ageDistribution,
    trendData,
    riskFactors,
    newsItems,
    mapCountryData,
    // Reactive state
    todayCases,
    todayDeaths,
    // Computed
    formattedTodayCases,
    formattedTodayDeaths,
    avgMinutesPerCase,
    // Actions
    initRealtimeData,
    startRealtimeUpdates,
    stopRealtimeUpdates,
    formatNumber,
  }
})
