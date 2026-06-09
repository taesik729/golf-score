import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../supabase/client'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/dashboard', component: () => import('../views/DashboardView.vue') },
  { path: '/round/new', component: () => import('../views/RoundNewView.vue') },
  { path: '/round/:id', component: () => import('../views/RoundDetailView.vue') },
  { path: '/settings', component: () => import('../views/SettingsView.vue') },
  { path: '/reset-password', component: () => import('../views/ResetPasswordView.vue'), meta: { public: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!to.meta.public && !session) return '/login'
})

export default router
