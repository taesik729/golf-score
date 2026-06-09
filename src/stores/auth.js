import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase/client'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)
  const loading = ref(false)
  const error   = ref('')

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user ?? null
    supabase.auth.onAuthStateChange((_, session) => {
      user.value = session?.user ?? null
    })
  }

  async function signup(email, password) {
    loading.value = true; error.value = ''
    const { data, err } = await supabase.auth.signUp({ email, password })
    loading.value = false
    if (err) { error.value = err.message; return false }
    if (data?.session) user.value = data.session.user
    return true
  }

  async function login(email, password) {
    loading.value = true; error.value = ''
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    loading.value = false
    if (err) { error.value = '비밀번호를 확인하세요.'; return false }
    return true
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
  }

  // 하위 호환용 alias
  const signUp  = signup
  const signIn  = async (email, password) => {
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) throw err
  }
  const signOut = logout

  return { user, loading, error, init, signup, login, logout, signUp, signIn, signOut }
})
