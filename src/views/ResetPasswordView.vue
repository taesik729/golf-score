<template>
  <div class="login-wrap">
    <div class="login-logo">
      <div class="login-logo-icon">🔐</div>
      <h1>비밀번호 재설정</h1>
      <p>새 비밀번호를 입력해주세요</p>
    </div>
    <div class="login-card card">
      <div class="form-group">
        <label>새 비밀번호</label>
        <input v-model="pw" type="password" placeholder="새 비밀번호 입력" />
      </div>
      <div class="form-group">
        <label>비밀번호 확인</label>
        <input v-model="pw2" type="password" placeholder="비밀번호 재입력" @keyup.enter="submit" />
      </div>
      <p v-if="message" :class="['msg', isError ? 'error' : 'success']">{{ message }}</p>
      <button class="btn btn-primary" style="width:100%" @click="submit" :disabled="loading">
        {{ loading ? '처리 중...' : '비밀번호 변경' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase/client'

const router  = useRouter()
const pw      = ref('')
const pw2     = ref('')
const loading = ref(false)
const message = ref('')
const isError = ref(false)

async function submit() {
  if (!pw.value || !pw2.value) {
    message.value = '비밀번호를 입력해주세요.'; isError.value = true; return
  }
  if (pw.value !== pw2.value) {
    message.value = '비밀번호가 일치하지 않습니다.'; isError.value = true; return
  }
  if (pw.value.length < 6) {
    message.value = '비밀번호는 6자 이상이어야 합니다.'; isError.value = true; return
  }
  loading.value = true
  const { error } = await supabase.auth.updateUser({ password: pw.value })
  loading.value = false
  if (error) {
    message.value = '변경 실패. 다시 시도해주세요.'; isError.value = true
  } else {
    message.value = '✅ 비밀번호가 변경됐습니다.'; isError.value = false
    setTimeout(() => router.replace('/dashboard'), 1500)
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%);
  padding: 16px;
  gap: 20px;
}
.login-logo { text-align: center; color: white; }
.login-logo-icon { font-size: 48px; margin-bottom: 8px; }
.login-logo h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
.login-logo p  { font-size: 14px; opacity: .8; }
.login-card { width: 100%; max-width: 400px; }
.msg {
  font-size: 13px; padding: 10px 12px;
  border-radius: 8px; text-align: center; margin-bottom: 8px;
}
.msg.error   { background: #fee2e2; color: #ef4444; }
.msg.success { background: #d1fae5; color: #059669; }
</style>
