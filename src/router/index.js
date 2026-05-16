import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue')
  },
  {
    path: '/realtime',
    name: 'RealtimeMonitoring',
    component: () => import('@/views/RealtimeMonitorView.vue')
  },
  {
    path: '/trauma',
    name: 'TraumaAnalysis',
    component: () => import('@/views/TraumaAnalysisView.vue')
  },
  {
    path: '/diagnosis',
    name: 'Diagnosis',
    component: () => import('@/views/DiagnosisView.vue')
  },
  {
    path: '/presentation',
    name: 'Presentation',
    component: () => import('@/views/PresentationView.vue')
  },
  {
    path: '/exam',
    name: 'Exam',
    component: () => import('@/views/ExamView.vue')
  },
  {
    path: '/pancreas-injury',
    name: 'PancreasInjuryQuiz',
    component: () => import('@/views/PancreasInjuryQuizView.vue')
  },
  {
    path: '/surgery-simulation',
    name: 'SurgerySimulation',
    component: () => import('@/views/SurgerySimulationView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
