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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
