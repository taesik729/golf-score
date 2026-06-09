<template>
  <div class="layout">
    <!-- 탑바 -->
    <header class="topbar">
      <div class="topbar-inner">
        <button class="btn btn-outline" style="padding:6px 14px;font-size:13px" @click="$router.back()">← 뒤로</button>
        <span class="topbar-title">설정</span>
        <div style="width:80px"></div>
      </div>
    </header>

    <div class="main-content" style="padding-top:80px;max-width:500px">

      <!-- 계정 정보 -->
      <div class="section-card card">
        <div class="section-title">계정 정보</div>
        <div class="info-row">
          <span class="info-label">이메일</span>
          <span class="info-val">{{ auth.user?.email }}</span>
        </div>
      </div>

      <!-- 앱 정보 -->
      <div class="section-card card" style="margin-top:12px">
        <div class="section-title">앱 정보</div>
        <div class="info-row">
          <span class="info-label">버전</span>
          <span class="info-val">1.0.0</span>
        </div>
      </div>

      <!-- 로그아웃 -->
      <button class="btn btn-danger" style="width:100%;margin-top:20px" @click="logout">
        로그아웃
      </button>

      <!-- 회원 탈퇴 -->
      <button class="btn-withdraw" @click="showWithdraw = true">회원 탈퇴</button>
      <div style="text-align:center;margin-top:4px">
        <router-link to="/privacy" style="font-size:12px;color:var(--text-muted);text-decoration:underline">개인정보처리방침</router-link>
      </div>

    </div>

    <!-- 탈퇴 확인 모달 -->
    <div v-if="showWithdraw" class="modal-overlay" @click.self="showWithdraw = false">
      <div class="modal card">
        <div class="modal-hd">
          <div class="modal-title">회원 탈퇴</div>
          <button class="icon-btn" @click="showWithdraw = false">✕</button>
        </div>
        <div style="font-size:14px;color:var(--text-muted);line-height:1.7;padding:4px 0 12px">
          탈퇴 시 <strong style="color:#ef4444">모든 라운드 데이터가 삭제</strong>되며 복구할 수 없습니다.
        </div>
        <div class="form-group">
          <label>확인을 위해 <strong style="color:#ef4444">탈퇴</strong> 라고 입력하세요</label>
          <input v-model="confirmText" type="text" placeholder="탈퇴" />
        </div>
        <p v-if="withdrawError" style="font-size:13px;color:#ef4444;margin-bottom:8px">{{ withdrawError }}</p>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline" style="flex:1" @click="showWithdraw = false">취소</button>
          <button class="btn btn-danger" style="flex:1" @click="withdraw" :disabled="withdrawing">
            {{ withdrawing ? '처리 중...' : '탈퇴하기' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../supabase/client'

const auth   = useAuthStore()
const router = useRouter()

const showWithdraw  = ref(false)
const confirmText   = ref('')
const withdrawing   = ref(false)
const withdrawError = ref('')

async function logout() {
  await auth.logout()
  router.push('/login')
}

async function withdraw() {
  withdrawError.value = ''
  if (confirmText.value.trim() !== '탈퇴') {
    withdrawError.value = '"탈퇴" 라고 정확히 입력해주세요.'; return
  }
  withdrawing.value = true
  // 라운드 데이터 삭제
  await supabase.from('golf_rounds').delete().eq('user_id', auth.user.id)
  // 계정 삭제 (Supabase RPC 또는 그냥 로그아웃)
  const { error } = await supabase.rpc('delete_user').catch(() => ({ error: true }))
  if (error) await auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.topbar {
  position: fixed; top: 0; left: 0; right: 0;
  background: white; border-bottom: 1px solid var(--border);
  z-index: 100; height: 60px;
}
.topbar-inner {
  max-width: 500px; margin: 0 auto; padding: 0 20px;
  height: 100%; display: flex; align-items: center; justify-content: space-between;
}
.topbar-title { font-size: 17px; font-weight: 700; }

.section-card { padding: 16px 20px; }
.section-title { font-size: 12px; font-weight: 700; color: var(--text-muted);
                 text-transform: uppercase; letter-spacing: .05em; margin-bottom: 12px; }
.info-row { display: flex; justify-content: space-between; align-items: center; }
.info-label { font-size: 14px; color: var(--text-muted); }
.info-val { font-size: 14px; font-weight: 500; }

.btn-withdraw {
  background: none; border: none; color: var(--text-muted);
  font-size: 13px; text-decoration: underline; cursor: pointer;
  text-align: center; padding: 12px; width: 100%; margin-top: 4px;
}
.btn-withdraw:hover { color: #ef4444; }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 200; padding: 16px;
}
@media (min-width: 500px) {
  .modal-overlay { align-items: center; }
}
.modal { width: 100%; max-width: 420px; padding: 20px; }
.modal-hd {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.modal-title { font-size: 17px; font-weight: 700; }
.icon-btn {
  background: none; border: none; cursor: pointer;
  font-size: 18px; color: var(--text-muted); padding: 4px;
}
</style>
