import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useQuizStore = defineStore('quiz', () => {
  const TOTAL_STUDENTS = 20

  // ── Page2: 胰腺癌专题测验 ──
  const pancreaticCancerQuestions = [
    {
      title: '老王最有可能患的是什么类型的黄疸？',
      brief: '关于胰腺癌引起黄疸类型的问题',
      description: '胰腺癌患者常因肿瘤压迫胆管而出现黄疸。根据黄疸的发病机制，可分为溶血性黄疸、肝细胞性黄疸和梗阻性黄疸三种类型。老王作为胰腺癌患者，其黄疸最可能的类型是？',
      options: ['溶血性黄疸', '肝细胞性黄疸', '梗阻性黄疸'],
      correctIndex: 2,
      weights: [0, 0, 1],
    },
    {
      title: '标准的Whipple手术是正确的治疗决策吗？',
      brief: '关于Whipple手术适应证的问题',
      description: 'Whipple手术（胰十二指肠切除术）是治疗胰头癌的经典术式，但并非所有胰腺癌患者都适合该手术。需要综合考虑肿瘤位置、分期、患者身体状况等因素。对于王参谋长的情况，标准的Whipple手术是否是正确的治疗决策？',
      options: ['正确，可以达到病灶清除', '不正确，无法根治'],
      correctIndex: 1,
      weights: [0.47, 0.53],
    },
    {
      title: '胰腺癌早期最典型的临床表现是什么？',
      brief: '关于胰腺癌早期症状的问题',
      description: '胰腺癌早期症状隐匿，缺乏特异性，这也是导致诊断困难、预后差的重要原因。了解胰腺癌早期的典型临床表现对于早期发现和诊断具有重要意义。以下哪种临床表现被认为是胰腺癌早期最典型的症状？',
      options: ['腹痛', '黄疸', '腹胀', '不明确'],
      correctIndex: 3,
      weights: [0.33, 0.5, 0.26, 0.04],
    },
  ]

  // ── Page3: 胰腺损伤专题测验 ──
  const pancreasInjuryQuestions = [
    {
      title: '该病人是否使用止痛药？',
      brief: '关于胰腺损伤病人疼痛管理的问题',
      description: '该病人为胰腺损伤患者，疼痛是主要症状之一。对于此类患者，是否使用止痛药是一个重要的临床决策问题。',
      options: ['不止痛', '止痛'],
      correctIndex: 1,
      weights: [0.6, 0.4],
      useBarChart: true,
    },
    {
      title: '目前伤员考虑是哪种类型的休克？',
      brief: '关于休克类型鉴别诊断的问题',
      description: '胰腺损伤患者可能因出血、感染等原因导致休克。根据伤员目前的临床表现和病理生理机制，需要判断其休克的类型以指导治疗。',
      options: ['心源性休克', '感染性休克', '失血性休克'],
      correctIndex: 2,
      weights: [0.1, 0.4, 0.5],
      useBarChart: true,
    },
    {
      title: '下列关于小王的胰腺相关损伤与淀粉酶生理特性的描述中，哪些选项最能解释其病情进展的原因？',
      brief: '关于胰腺损伤病理生理机制的多选题',
      description: '小王因胰腺外伤导致胰腺损伤，需要分析胰腺损伤与淀粉酶生理特性之间的关系，以及导致病情进展的病理生理机制。',
      options: [
        '胰腺外伤导致胰管破裂，胰液外渗后胰蛋白酶原在胰腺组织内被异常激活，引发自身消化',
        '创伤后胰腺微循环障碍与缺血，可加剧胰酶激活与组织坏死进程',
        '胰液中碳酸氢盐分泌减少，导致胰管内酸化，促进酶原自发激活',
        '胰蛋白酶抑制物（如SPINK1）在创伤后失活，削弱对活化胰酶的调控能力',
      ],
      correctIndex: 0,
      correctOptions: [0, 1, 3],
      isMultipleChoice: true,
      combinationWeights: {
        '0,1': 0.4,
        '0,1,3': 0.4,
        '0,3': 0.1,
        '1,3': 0.1,
      },
    },
  ]

  // ── State ──
  const currentView = ref('list') // 'list' | 'detail'
  const currentQuestionIndex = ref(0)
  const resultsOverviewVisible = ref(false)
  const countdownSeconds = ref(3)
  const secondsLeft = ref(3)
  const answeredCount = ref(0)
  const isSimulating = ref(false)
  const finalCounts = ref(null)
  const chartInstance = ref(null)

  // ── Computed ──
  const currentQuestion = computed(() => {
    // This is set by the component based on which quiz is active
    return currentQuestionIndex.value >= 0 ? currentQuestionIndex.value : null
  })

  const progressPercent = computed(() => {
    return (answeredCount.value / TOTAL_STUDENTS) * 100
  })

  const countdownProgress = computed(() => {
    return (secondsLeft.value / countdownSeconds.value) * 100
  })

  // ── Actions ──
  function setView(view) {
    currentView.value = view
  }

  function setCurrentQuestion(index) {
    currentQuestionIndex.value = index
  }

  function toggleResultsOverview() {
    resultsOverviewVisible.value = !resultsOverviewVisible.value
  }

  function resetTimerState(seconds) {
    countdownSeconds.value = seconds
    secondsLeft.value = seconds
    answeredCount.value = 0
    isSimulating.value = false
    finalCounts.value = null
  }

  function setFinalCounts(counts) {
    finalCounts.value = counts
  }

  function setChartInstance(instance) {
    chartInstance.value = instance
  }

  function disposeChart() {
    if (chartInstance.value) {
      chartInstance.value.dispose()
      chartInstance.value = null
    }
  }

  // ── Fixed distribution generators (for reproducible simulations) ──
  function generateFixedDistribution(question, questionIndex, quizType) {
    const counts = new Array(question.options.length).fill(0)

    if (quizType === 'pancreaticCancer') {
      if (questionIndex === 1) {
        // Q2: 11人选A, 9人选B
        counts[0] = 11
        counts[1] = 9
      } else if (questionIndex === 2) {
        // Q3: fixed A=5, B=3, C=10, D=2
        counts[0] = 5
        counts[1] = 3
        counts[2] = 10
        counts[3] = 2
      } else {
        // Q1: use weights
        for (let i = 0; i < TOTAL_STUDENTS; i++) {
          const choice = weightedRandom(question.weights)
          counts[choice]++
        }
      }
    } else if (quizType === 'pancreasInjury') {
      if (question.isMultipleChoice && question.combinationWeights) {
        // Generate combination selections
        const sequence = []
        Object.entries(question.combinationWeights).forEach(([key, weight]) => {
          const count = Math.round(weight * TOTAL_STUDENTS)
          for (let i = 0; i < count; i++) {
            sequence.push(key.split(',').map(Number))
          }
        })
        // Shuffle
        sequence.sort(() => Math.random() - 0.5)
        sequence.forEach(selectedOptions => {
          selectedOptions.forEach(idx => {
            counts[idx]++
          })
        })
      } else {
        // Use weights for single choice
        for (let i = 0; i < TOTAL_STUDENTS; i++) {
          const choice = weightedRandom(question.weights)
          counts[choice]++
        }
      }
    }

    return counts
  }

  function weightedRandom(weights) {
    const r = Math.random()
    let sum = 0
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i]
      if (r < sum) return i
    }
    return weights.length - 1
  }

  function getCountdownForQuestion(questionIndex, quizType) {
    if (quizType === 'pancreasInjury') {
      return questionIndex < 2 ? 3 : 10
    }
    return 3
  }

  return {
    TOTAL_STUDENTS,
    pancreaticCancerQuestions,
    pancreasInjuryQuestions,
    currentView,
    currentQuestionIndex,
    resultsOverviewVisible,
    countdownSeconds,
    secondsLeft,
    answeredCount,
    isSimulating,
    finalCounts,
    currentQuestion,
    progressPercent,
    countdownProgress,
    setView,
    setCurrentQuestion,
    toggleResultsOverview,
    resetTimerState,
    setFinalCounts,
    setChartInstance,
    disposeChart,
    generateFixedDistribution,
    getCountdownForQuestion,
  }
})
