import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase/client'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    user.value = session?.user ?? null
    supabase.auth.onAuthStateChange((_, session) => {
      user.value = session?.user ?? null
    })
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // 이메일 인증 없이 바로 세션 설정
    if (data?.session) {
      user.value = data.session.user
    }
    return data
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, init, signUp, signIn, signOut }
})
