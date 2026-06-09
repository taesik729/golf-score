<template>
  <div class="layout">
    <!-- 탑바 -->
    <header class="topbar">
      <div class="topbar-inner">
        <span class="topbar-logo">⛳ 필드 스코어</span>
        <div class="topbar-right">
          <span class="user-email">{{ auth.user?.email }}</span>
          <button class="btn btn-outline" style="padding:6px 14px;font-size:13px" @click="logout">로그아웃</button>
        </div>
      </div>
    </header>

    <div class="main-content" style="padding-top:80px">
      <!-- 통계 카드 -->
      <div class="stats-row">
        <div class="stat-card card">
          <div class="stat-label">총 라운드</div>
          <div class="stat-value">{{ rounds.length }}</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">평균 스코어</div>
          <div class="stat-value">{{ avgScore || '-' }}</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">베스트 스코어</div>
          <div class="stat-value">{{ bestScore || '-' }}</div>
        </div>
      </div>

      <!-- 새 라운드 버튼 -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin:24px 0 16px">
        <h2 style="font-size:18px;font-weight:700">라운드 이력</h2>
        <router-link to="/round/new" class="btn btn-primary">+ 새 라운드</router-link>
      </div>

      <!-- 라운드 목록 -->
      <div v-if="loading" class="text-muted">불러오는 중...</div>
      <div v-else-if="rounds.length === 0" class="empty card">
        <p>아직 기록된 라운드가 없습니다.</p>
        <router-link to="/round/new" class="btn btn-primary" style="margin-top:16px">첫 라운드 기록하기</router-link>
      </div>
      <div v-else class="round-list">
        <div v-for="r in rounds" :key="r.id" class="round-item card" @click="$router.push(`/round/${r.id}`)">
          <div class="round-left">
            <div class="round-course">{{ r.course_name }}</div>
            <div class="round-date">{{ formatDate(r.played_at) }} · {{ r.holes }}홀</div>
          </div>
          <div class="round-score">
            <span class="score-num">{{ r.total_score }}</span>
            <span class="score-label">타</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../supabase/client'

const auth = useAuthStore()
const router = useRouter()
const rounds = ref([])
const loading = ref(true)

onMounted(async () => {
  const { data } = await supabase
    .from('golf_rounds')
    .select('*')
    .order('played_at', { ascending: false })
  rounds.value = data || []
  loading.value = false
})

const avgScore = computed(() => {
  if (!rounds.value.length) return null
  const sum = rounds.value.reduce((a, r) => a + (r.total_score || 0), 0)
  return Math.round(sum / rounds.value.length)
})

const bestScore = computed(() => {
  if (!rounds.value.length) return null
  return Math.min(...rounds.value.map(r => r.total_score || 999))
})

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

async function logout() {
  await auth.signOut()
  router.push('/login')
}
</script>

<style scoped>
.topbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  background: white;
  border-bottom: 1px solid var(--border);
  z-index: 100;
  height: 60px;
}
.topbar-inner {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.topbar-logo { font-size: 20px; font-weight: 800; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.user-email { font-size: 13px; color: var(--text-muted); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 8px;
}
.stat-card { text-align: center; }
.stat-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.stat-value { font-size: 28px; font-weight: 800; color: var(--green); }

.round-list { display: flex; flex-direction: column; gap: 10px; }
.round-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.round-item:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); }
.round-course { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.round-date { font-size: 13px; color: var(--text-muted); }
.round-score { text-align: right; }
.score-num { font-size: 32px; font-weight: 800; color: var(--green); }
.score-label { font-size: 14px; color: var(--text-muted); }

.empty { text-align: center; padding: 48px 20px; color: var(--text-muted); }
.text-muted { color: var(--text-muted); text-align: center; padding: 40px; }

@media (max-width: 500px) {
  .user-email { display: none; }
  .stat-value { font-size: 22px; }
}
</style>
