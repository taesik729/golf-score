import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login',          component: () => import('../views/LoginView.vue'),          meta: { public: true } },
  { path: '/dashboard',      component: () => import('../views/DashboardView.vue') },
  { path: '/round/new',      component: () => import('../views/RoundNewView.vue') },
  { path: '/round/:id',      component: () => import('../views/RoundDetailView.vue') },
  { path: '/settings',       component: () => import('../views/SettingsView.vue') },
  { path: '/reset-password', component: () => import('../views/ResetPasswordView.vue'), meta: { public: true } },
  { path: '/privacy',        component: () => import('../views/PrivacyView.vue'),        meta: { public: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.user) await auth.init()
  if (!to.meta.public && !auth.user) return '/login'
  if (to.path === '/login' && auth.user) return '/dashboard'
})

export default router
