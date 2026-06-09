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

        <!-- 스코어 미리보기 -->
        <div class="score-preview">
          <div class="score-preview-left">
            <div class="preview-label">SCORE</div>
            <div class="preview-score">{{ round.total_score }}</div>
          </div>
          <div class="score-preview-right">
            <div class="preview-course">{{ round.course_name }}</div>
            <div class="preview-date">{{ formatDate(round.played_at) }} · {{ round.holes }}홀</div>
            <div class="preview-diff" :class="diffClass">{{ diffText }}</div>
          </div>
        </div>

        <!-- 홀별 스코어 가로 테이블 -->
        <div class="card" style="margin-top:16px">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">홀별 스코어</h3>

          <!-- 전반 1~9홀 -->
          <table class="scorecard-table">
            <thead>
              <tr>
                <th class="label-cell">홀</th>
                <th v-for="h in 9" :key="h">{{ h }}</th>
                <th class="sum-cell">T</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="label-cell">Score</td>
                <td v-for="h in 9" :key="'s'+h"
                  class="score-cell" :class="scoreClass(front[h-1])">
                  {{ front[h-1] ? scoreDiff(front[h-1]) : '-' }}
                </td>
                <td class="sum-cell" :class="front9Diff > 0 ? 'over' : front9Diff < 0 ? 'birdie' : 'even'">
                  {{ front9Diff > 0 ? '+' : '' }}{{ front9Diff }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 후반 10~18홀 -->
          <template v-if="round.holes === 18">
            <table class="scorecard-table" style="margin-top:10px">
              <thead>
                <tr>
                  <th class="label-cell">홀</th>
                  <th v-for="h in 9" :key="h">{{ h+9 }}</th>
                  <th class="sum-cell">T</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="label-cell">Score</td>
                  <td v-for="h in 9" :key="'b'+h"
                    class="score-cell" :class="scoreClass(back[h-1])">
                    {{ back[h-1] ? scoreDiff(back[h-1]) : '-' }}
                  </td>
                  <td class="sum-cell" :class="back9Diff > 0 ? 'over' : back9Diff < 0 ? 'birdie' : 'even'">
                    {{ back9Diff > 0 ? '+' : '' }}{{ back9Diff }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- 메모 -->
          <div v-if="round.notes" class="notes-row">📝 {{ round.notes }}</div>
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

const route  = useRoute()
const router = useRouter()
const round     = ref(null)
const scoreList = ref([])
const loading   = ref(true)

onMounted(async () => {
  const id = route.params.id
  const [{ data: r }, { data: s }] = await Promise.all([
    supabase.from('golf_rounds').select('*').eq('id', id).single(),
    supabase.from('golf_scores').select('*').eq('round_id', id).order('hole')
  ])
  round.value   = r
  scoreList.value = s || []
  loading.value = false
})

const front = computed(() => scoreList.value.filter(s => s.hole <= 9))
const back  = computed(() => scoreList.value.filter(s => s.hole >= 10))

const front9Diff = computed(() => front.value.reduce((a, s) => a + (s.score - s.par), 0))
const back9Diff  = computed(() => back.value.reduce((a, s) => a + (s.score - s.par), 0))

const totalPar = computed(() => scoreList.value.reduce((a, s) => a + s.par, 0))
const diff     = computed(() => (round.value?.total_score || 0) - totalPar.value)

const diffText = computed(() => {
  const d = diff.value
  if (d === 0) return 'EVEN'
  return d > 0 ? `+${d}` : `${d}`
})
const diffClass = computed(() => {
  const d = diff.value
  if (d <= -2) return 'eagle'
  if (d < 0)   return 'birdie'
  if (d === 0) return 'even'
  if (d <= 5)  return 'bogey'
  return 'over'
})

const analysis = computed(() => {
  const list = scoreList.value
  const count = (fn) => list.filter(fn).length
  return [
    { label: '이글', count: count(s => s.score - s.par <= -2), cls: 'eagle' },
    { label: '버디', count: count(s => s.score - s.par === -1), cls: 'birdie' },
    { label: '파',   count: count(s => s.score - s.par === 0),  cls: 'even'   },
    { label: '보기', count: count(s => s.score - s.par === 1),  cls: 'bogey'  },
    { label: '더블+',count: count(s => s.score - s.par >= 2),  cls: 'over'   },
  ]
})

function scoreDiff(s) {
  if (!s) return '-'
  const d = s.score - s.par
  if (d === 0)  return '0'
  return d > 0 ? `+${d}` : `${d}`
}
function scoreClass(s) {
  if (!s) return ''
  const d = s.score - s.par
  if (d <= -2) return 'eagle'
  if (d === -1) return 'birdie'
  if (d === 0)  return 'even'
  if (d === 1)  return 'bogey'
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

/* 스코어 미리보기 */
.score-preview {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #1b4332, #2d6a4f);
  border-radius: 14px;
  padding: 20px;
  gap: 20px;
  color: white;
}
.score-preview-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255,255,255,0.15);
  border-radius: 50%;
  width: 84px;
  height: 84px;
  justify-content: center;
  flex-shrink: 0;
}
.preview-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; opacity: 0.8; }
.preview-score { font-size: 34px; font-weight: 900; line-height: 1; }
.score-preview-right { flex: 1; }
.preview-course { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
.preview-date   { font-size: 13px; opacity: 0.8; margin-bottom: 6px; }
.preview-diff   { font-size: 16px; font-weight: 700; }
.preview-diff.over   { color: #fca5a5; }
.preview-diff.birdie { color: #93c5fd; }
.preview-diff.eagle  { color: #c4b5fd; }
.preview-diff.even   { color: #d1d5db; }
.preview-diff.bogey  { color: #fdba74; }

/* 가로 스코어카드 */
.scorecard-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.scorecard-table th {
  background: var(--green);
  color: white;
  padding: 5px 2px;
  text-align: center;
  font-weight: 700;
  font-size: 12px;
}
.scorecard-table td {
  padding: 6px 2px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}
.label-cell {
  width: 40px;
  font-weight: 700;
  font-size: 11px;
  color: var(--text-muted);
  text-align: left !important;
  padding-left: 4px !important;
}
.sum-cell {
  width: 30px;
  font-weight: 800;
  font-size: 13px;
  background: #f0fdf4 !important;
}
.score-cell {
  font-size: 14px;
  font-weight: 800;
}

.notes-row {
  margin-top: 14px;
  padding: 10px 12px;
  background: var(--bg);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

/* 분석 */
.analysis-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.analysis-item { text-align: center; padding: 12px 8px; border-radius: 10px; background: var(--bg); }
.a-count { font-size: 24px; font-weight: 800; }
.a-label { font-size: 12px; margin-top: 4px; color: var(--text-muted); }
.analysis-item.eagle  .a-count { color: #7c3aed; }
.analysis-item.birdie .a-count { color: #2563eb; }
.analysis-item.even   .a-count { color: var(--green); }
.analysis-item.bogey  .a-count { color: #ea580c; }
.analysis-item.over   .a-count { color: #dc2626; }

/* 색상 */
.eagle  { color: #7c3aed; }
.birdie { color: #2563eb; }
.even   { color: var(--text-muted); }
.bogey  { color: #ea580c; }
.over   { color: #dc2626; }

.text-muted { color: var(--text-muted); text-align: center; padding: 40px; }
</style>
