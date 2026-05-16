import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCombatTraumaStore = defineStore('combatTrauma', () => {
  // ── War history data ──
  const warHistory = [
    { name: '第二次世界大战', period: '1939-1945', casualties: '7000万+', traumaRate: '65%', mortality: '19%', desc: '现代战伤外科的重要发展时期，确立了分级救治体系' },
    { name: '朝鲜战争', period: '1950-1953', casualties: '300万+', traumaRate: '58%', mortality: '15%', desc: '首次大规模使用直升机后送伤员，大大降低了死亡率' },
    { name: '越南战争', period: '1955-1975', casualties: '300万+', traumaRate: '62%', mortality: '12%', desc: '建立了完善的战伤救治体系，死亡率显著下降' },
    { name: '海湾战争', period: '1990-1991', casualties: '10万+', traumaRate: '45%', mortality: '8%', desc: '现代化战争的典型代表，精准医疗和快速后送发挥了重要作用' },
    { name: '阿富汗战争', period: '2001-2021', casualties: '17万+', traumaRate: '52%', mortality: '7%', desc: '现代战伤救治的巅峰时期，死亡率降至历史最低' },
    { name: '伊拉克战争', period: '2003-2011', casualties: '50万+', traumaRate: '48%', mortality: '9%', desc: 'IED（简易爆炸装置）伤成为主要致伤原因' },
    { name: '俄乌冲突', period: '2022-至今', casualties: '50万+', traumaRate: '55%', mortality: '数据收集中', desc: '无人机和精确制导武器造成的新型战创伤' },
  ]

  // ── Organ data ──
  const organData = {
    head: { name: '头颈部', description: '颅脑损伤、颈椎损伤、颈部血管损伤', incidence: 25, mortality: 50, details: '头颈部战创伤死亡率高，主要致死原因包括颅脑损伤、颈椎骨折脱位、颈部大血管损伤等。' },
    chest: { name: '胸部', description: '胸部穿透伤、血气胸、心脏损伤', incidence: 15, mortality: 25, details: '胸部战创伤常见于弹片伤和钝性伤，血气胸和心脏压塞是主要致死原因。' },
    abdomen: { name: '腹部', description: '腹部穿透伤、肝脾破裂、肠管损伤', incidence: 20, mortality: 35, details: '腹部战创伤发生率高，救治难度大。死亡三联征是主要致死原因。' },
    pelvis: { name: '骨盆及会阴部', description: '骨盆骨折、盆腔血管损伤、泌尿系损伤', incidence: 10, mortality: 25, details: '骨盆骨折合并大出血是主要致死原因，需要紧急止血和抗休克治疗。' },
    limbs: { name: '四肢', description: '四肢骨折、血管神经损伤、软组织损伤', incidence: 70, mortality: 8, details: '四肢伤发生率最高，但通过及时的止血、包扎和固定，死亡率相对较低。' },
  }

  // ── Reactive state ──
  const selectedWarIndex = ref(0)
  const selectedOrgan = ref('abdomen')
  const triadExpanded = ref(false)

  // ── Actions ──
  function selectWar(index) {
    selectedWarIndex.value = index
  }

  function selectOrgan(key) {
    selectedOrgan.value = key
  }

  function toggleTriad() {
    triadExpanded.value = !triadExpanded.value
  }

  function getSelectedOrganData() {
    return organData[selectedOrgan.value] || null
  }

  return {
    warHistory,
    organData,
    selectedWarIndex,
    selectedOrgan,
    triadExpanded,
    selectWar,
    selectOrgan,
    toggleTriad,
    getSelectedOrganData,
  }
})
