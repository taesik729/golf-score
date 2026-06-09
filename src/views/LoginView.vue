<template>
  <div class="login-wrap">
    <div class="login-box card">
      <div class="logo">⛳ 필드 스코어</div>
      <p class="sub">라운드 기록을 쉽게 관리하세요</p>

      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">로그인</button>
        <button :class="{ active: mode === 'signup' }" @click="mode = 'signup'">회원가입</button>
      </div>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label>이메일</label>
          <input v-model="email" type="email" placeholder="example@email.com" required />
        </div>
        <div class="form-group">
          <label>비밀번호</label>
          <input v-model="password" type="password" placeholder="6자 이상" required minlength="6" />
        </div>
        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
        <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px" :disabled="loading">
          {{ loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const mode = ref('login')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

async function submit() {
  errorMsg.value = ''
  successMsg.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.signIn(email.value, password.value)
      router.push('/dashboard')
    } else {
      const data = await auth.signUp(email.value, password.value)
      if (data?.session) {
        router.push('/dashboard')
      } else {
        successMsg.value = '가입 완료! 로그인해주세요.'
      }
    }
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%);
  padding: 16px;
}
.login-box {
  width: 100%;
  max-width: 400px;
}
.logo {
  font-size: 28px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 6px;
}
.sub {
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  margin-bottom: 24px;
}
.tabs {
  display: flex;
  background: var(--bg);
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 24px;
}
.tabs button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.2s;
}
.tabs button.active {
  background: white;
  color: var(--green);
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
.success-msg {
  color: var(--green);
  font-size: 13px;
  margin-top: 4px;
}
</style>
