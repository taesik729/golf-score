<template>
  <div class="layout">
    <header class="topbar">
      <div class="topbar-inner">
        <button class="btn-back" @click="$router.back()">← 뒤로</button>
        <span style="font-weight:700">라운드 상세</span>
        <button class="btn-danger-sm" @click="deleteRound">삭제</button>
      </div>
    </header>

    <div class="main-content" style="padding-top:76px">
      <div v-if="loading" class="text-muted">불러오는 중...</div>
      <template v-else-if="round">
        <!-- 요약 -->
        <div class="card summary-card">
          <div class="summary-course">{{ round.course_name }}</div>
          <div class="summary-date">{{ formatDate(round.played_at) }} · {{ round.holes }}홀</div>
          <div class="summary-score-row">
            <div class="summary-big">
              <span class="big-num">{{ round.total_score }}</span><span class="big-label">타</span>
            </div>
            <div class="summary-stats">
              <div>파 <strong>{{ totalPar }}</strong></div>
              <div :class="diffClass">{{ diffText }}</div>
            </div>
          </div>
          <div v-if="round.notes" class="summary-notes">📝 {{ round.notes }}</div>
        </div>

        <!-- 홀별 스코어 -->
        <div class="card" style="margin-top:16px">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">홀별 스코어</h3>

          <!-- 전반/후반 탭 (18홀) -->
          <div v-if="round.holes === 18" class="half-tabs">
            <button :class="{ active: halfTab === 'front' }" @click="halfTab = 'front'">전반 (1-9홀)</button>
            <button :class="{ active: halfTab === 'back' }" @click="halfTab = 'back'">후반 (10-18홀)</button>
            <button :class="{ active: halfTab === 'all' }" @click="halfTab = 'all'">전체</button>
          </div>

          <div class="score-grid">
            <div class="score-header">
              <span>홀</span><span>파</span><span>타수</span><span>+/-</span>
            </div>
            <div v-for="s in displayScores" :key="s.hole" class="score-row">
              <span class="hole-num">{{ s.hole }}</span>
              <span class="par-num">{{ s.par }}</span>
              <span class="score-num" :class="scoreClass(s)">{{ s.score }}</span>
              <span class="diff" :class="scoreClass(s)">{{ scoreDiff(s) }}</span>
            </div>
          </div>

          <!-- 소계 -->
          <div class="subtotal-row">
            <span>소계</span>
            <span>{{ displayPar }}</span>
            <span class="total-score">{{ displayScore }}타</span>
            <span :class="displayScore - displayPar > 0 ? 'over' : displayScore - displayPar < 0 ? 'under' : 'even'">
              {{ displayScore - displayPar > 0 ? '+' : '' }}{{ displayScore - displayPar }}
            </span>
          </div>
        </div>

        <!-- 분석 -->
        <div class="card analysis-card" style="margin-top:16px">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">📊 스코어 분석</h3>
          <div class="analysis-grid">
            <div v-for="item in analysis" :key="item.label" class="analysis-item" :class="item.cls">
              <div class="a-count">{{ item.count }}</div>
              <div class="a-label">{{ item.label }}</div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase/client'

const route = useRoute()
const router = useRouter()
const round = ref(null)
const scoreList = ref([])
const loading = ref(true)
const halfTab = ref('all')

onMounted(async () => {
  const id = route.params.id
  const [{ data: r }, { data: s }] = await Promise.all([
    supabase.from('golf_rounds').select('*').eq('id', id).single(),
    supabase.from('golf_scores').select('*').eq('round_id', id).order('hole')
  ])
  round.value = r
  scoreList.value = s || []
  loading.value = false
})

const totalPar = computed(() => scoreList.value.reduce((a, s) => a + s.par, 0))

const diff = computed(() => (round.value?.total_score || 0) - totalPar.value)
const diffText = computed(() => {
  const d = diff.value
  if (d === 0) return 'EVEN'
  return d > 0 ? `+${d}` : `${d}`
})
const diffClass = computed(() => {
  const d = diff.value
  if (d <= -2) return 'eagle'
  if (d < 0) return 'birdie'
  if (d === 0) return 'even'
  if (d <= 5) return 'bogey'
  return 'over'
})

const displayScores = computed(() => {
  if (halfTab.value === 'front') return scoreList.value.filter(s => s.hole <= 9)
  if (halfTab.value === 'back') return scoreList.value.filter(s => s.hole >= 10)
  return scoreList.value
})
const displayPar = computed(() => displayScores.value.reduce((a, s) => a + s.par, 0))
const displayScore = computed(() => displayScores.value.reduce((a, s) => a + s.score, 0))

const analysis = computed(() => {
  const list = scoreList.value
  const count = (fn) => list.filter(fn).length
  return [
    { label: '이글', count: count(s => s.score - s.par <= -2), cls: 'eagle' },
    { label: '버디', count: count(s => s.score - s.par === -1), cls: 'birdie' },
    { label: '파', count: count(s => s.score - s.par === 0), cls: 'even' },
    { label: '보기', count: count(s => s.score - s.par === 1), cls: 'bogey' },
    { label: '더블+', count: count(s => s.score - s.par >= 2), cls: 'over' },
  ]
})

function scoreDiff(s) {
  const d = s.score - s.par
  if (d === 0) return 'E'
  return d > 0 ? `+${d}` : `${d}`
}
function scoreClass(s) {
  const d = s.score - s.par
  if (d <= -2) return 'eagle'
  if (d === -1) return 'birdie'
  if (d === 0) return 'even'
  if (d === 1) return 'bogey'
  return 'over'
}
function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

async function deleteRound() {
  if (!confirm('이 라운드를 삭제하시겠습니까?')) return
  await supabase.from('golf_scores').delete().eq('round_id', round.value.id)
  await supabase.from('golf_rounds').delete().eq('id', round.value.id)
  router.push('/dashboard')
}
</script>

<style scoped>
.topbar {
  position: fixed; top: 0; left: 0; right: 0;
  background: white; border-bottom: 1px solid var(--border);
  z-index: 100; height: 56px;
}
.topbar-inner {
  max-width: 900px; margin: 0 auto; padding: 0 16px;
  height: 100%; display: flex; align-items: center; justify-content: space-between;
}
.btn-back { border: none; background: none; font-size: 15px; cursor: pointer; color: var(--green); font-weight: 600; }
.btn-danger-sm { border: none; background: #fee2e2; color: #dc2626; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px; }

.summary-card { background: linear-gradient(135deg, #1b4332, #2d6a4f); color: white; }
.summary-course { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
.summary-date { font-size: 14px; opacity: 0.8; margin-bottom: 16px; }
.summary-score-row { display: flex; align-items: flex-end; gap: 20px; margin-bottom: 12px; }
.big-num { font-size: 56px; font-weight: 800; line-height: 1; }
.big-label { font-size: 20px; opacity: 0.8; }
.summary-stats { display: flex; flex-direction: column; gap: 4px; font-size: 15px; padding-bottom: 8px; }
.summary-notes { font-size: 13px; opacity: 0.85; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); }

.half-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
.half-tabs button {
  padding: 6px 14px; border-radius: 20px; border: 1.5px solid var(--border);
  background: white; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--text-muted);
}
.half-tabs button.active { background: var(--green); color: white; border-color: var(--green); }

.score-grid { display: flex; flex-direction: column; gap: 4px; }
.score-header {
  display: grid; grid-template-columns: 36px 48px 64px 48px;
  gap: 8px; font-size: 12px; font-weight: 700; color: var(--text-muted); padding: 0 4px;
}
.score-row {
  display: grid; grid-template-columns: 36px 48px 64px 48px;
  gap: 8px; align-items: center; padding: 6px 4px; border-radius: 6px;
}
.score-row:nth-child(even) { background: var(--bg); }
.hole-num { font-weight: 700; text-align: center; }
.par-num { text-align: center; color: var(--text-muted); }
.score-num { text-align: center; font-size: 18px; font-weight: 800; }
.diff { text-align: center; font-size: 13px; font-weight: 700; }

.subtotal-row {
  display: grid; grid-template-columns: 36px 48px 64px 48px;
  gap: 8px; padding: 12px 4px 4px; border-top: 2px solid var(--border); margin-top: 8px; font-weight: 700;
}
.total-score { font-size: 18px; font-weight: 800; color: var(--green); text-align: center; }

.analysis-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.analysis-item { text-align: center; padding: 12px 8px; border-radius: 10px; background: var(--bg); }
.a-count { font-size: 24px; font-weight: 800; }
.a-label { font-size: 12px; margin-top: 4px; color: var(--text-muted); }
.analysis-item.eagle .a-count { color: #7c3aed; }
.analysis-item.birdie .a-count { color: #2563eb; }
.analysis-item.even .a-count { color: var(--green); }
.analysis-item.bogey .a-count { color: #ea580c; }
.analysis-item.over .a-count { color: #dc2626; }

.eagle { color: #7c3aed; }
.birdie { color: #2563eb; }
.even { color: var(--text-muted); }
.bogey { color: #ea580c; }
.over { color: #dc2626; }
.under { color: #2563eb; }

.text-muted { color: var(--text-muted); text-align: center; padding: 40px; }
</style>
