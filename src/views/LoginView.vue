<template>
  <div class="login-wrap">
    <div class="login-logo">
      <div class="login-logo-icon">⛳</div>
      <h1>필드 스코어</h1>
      <p>라운드 기록을 쉽게 관리하세요</p>
    </div>
    <div class="login-card card">

      <!-- 비밀번호 찾기 모드 -->
      <template v-if="isForgot">
        <div class="form-group">
          <label>가입한 이메일</label>
          <input v-model="email" type="email" placeholder="이메일 입력"
            @keyup.enter="sendReset" autocomplete="email" />
        </div>
        <p v-if="message" :class="['msg', isError ? 'error' : 'success']">{{ message }}</p>
        <button class="btn btn-primary" style="width:100%" @click="sendReset" :disabled="sending">
          {{ sending ? '발송 중...' : '재설정 링크 발송' }}
        </button>
        <button class="link-btn" @click="isForgot = false; message = ''">← 로그인으로 돌아가기</button>
      </template>

      <!-- 로그인 / 회원가입 모드 -->
      <template v-else>
        <div class="form-group">
          <label>이메일</label>
          <input v-model="email" type="email" placeholder="example@email.com"
            @keyup.enter="submit" autocomplete="email" />
        </div>
        <div class="form-group">
          <label>비밀번호</label>
          <input v-model="pw" type="password" placeholder="6자 이상"
            @keyup.enter="submit" autocomplete="current-password" />
        </div>

        <p v-if="message" :class="['msg', isError ? 'error' : 'success']">{{ message }}</p>

        <button class="btn btn-primary" style="width:100%;margin-top:4px" @click="submit" :disabled="auth.loading">
          {{ auth.loading ? '처리 중...' : (isSignup ? '회원가입' : '로그인') }}
        </button>

        <div class="bottom-links">
          <button class="link-btn" @click="toggle">
            {{ isSignup ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입' }}
          </button>
          <button v-if="!isSignup" class="link-btn hint" @click="isForgot = true; message = ''">
            비밀번호를 잊으셨나요?
          </button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../supabase/client'

const auth     = useAuthStore()
const router   = useRouter()
const email    = ref('')
const pw       = ref('')
const isSignup = ref(false)
const isForgot = ref(false)
const message  = ref('')
const isError  = ref(false)
const sending  = ref(false)

function toggle() {
  isSignup.value = !isSignup.value
  message.value  = ''
}

async function submit() {
  if (!email.value || !pw.value) {
    message.value = '이메일과 비밀번호를 입력해주세요.'; isError.value = true; return
  }
  message.value = ''
  if (isSignup.value) {
    const ok = await auth.signup(email.value.trim(), pw.value)
    if (ok) {
      message.value = '✅ 가입 완료! 로그인해주세요.'
      isError.value  = false
      isSignup.value = false
    } else {
      message.value = auth.error || '가입 실패. 다시 시도해주세요.'; isError.value = true
    }
  } else {
    const ok = await auth.login(email.value.trim(), pw.value)
    if (ok) router.replace('/dashboard')
    else { message.value = auth.error || '로그인 실패. 이메일/비밀번호를 확인해주세요.'; isError.value = true }
  }
}

async function sendReset() {
  if (!email.value) {
    message.value = '이메일을 입력해주세요.'; isError.value = true; return
  }
  sending.value = true; message.value = ''
  const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: `${window.location.origin}/reset-password`
  })
  sending.value = false
  if (error) {
    message.value = '발송 실패. 이메일을 확인해주세요.'; isError.value = true
  } else {
    message.value = '✅ 재설정 링크를 이메일로 발송했습니다.'; isError.value = false
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
.login-card { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 0; }
.msg {
  font-size: 13px; padding: 10px 12px;
  border-radius: 8px; text-align: center; margin-bottom: 8px;
}
.msg.error   { background: #fee2e2; color: #ef4444; }
.msg.success { background: #d1fae5; color: #059669; }
.bottom-links { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.link-btn {
  background: none; border: none; color: var(--green);
  font-size: 13px; cursor: pointer; text-align: center;
  padding: 4px; text-decoration: underline; width: 100%;
}
.link-btn.hint { color: var(--text-muted); font-size: 12px; }
</style>
