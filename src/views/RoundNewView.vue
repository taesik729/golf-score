<template>
  <div class="layout">
    <header class="topbar">
      <div class="topbar-inner">
        <button class="btn-back" @click="$router.back()">← 뒤로</button>
        <span style="font-weight:700">새 라운드 기록</span>
        <div style="width:60px"></div>
      </div>
    </header>

    <div class="main-content" style="padding-top:76px">
      <!-- 사진 자동 입력 -->
      <div class="card scan-card">
        <div class="scan-title">📸 스코어카드 사진으로 자동 입력</div>
        <p class="scan-desc">스코어카드를 촬영하면 AI가 자동으로 타수를 읽어냅니다</p>
        <div class="scan-actions">
          <label class="btn btn-primary" style="cursor:pointer">
            📷 촬영
            <input type="file" accept="image/*" capture="environment" style="display:none" @change="onPhoto" />
          </label>
          <label class="btn btn-outline" style="cursor:pointer">
            🖼 갤러리
            <input type="file" accept="image/*" style="display:none" @change="onPhoto" />
          </label>
        </div>
        <div v-if="scanning" class="scanning-msg">🤖 AI가 스코어카드를 분석 중...</div>
        <div v-if="scanError" class="error-msg">{{ scanError }}</div>
      </div>

      <!-- 기본 정보 -->
      <div class="card" style="margin-top:16px">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">기본 정보</h3>
        <!-- 골프장 이름 + 총 파 -->
        <div class="form-row" style="grid-template-columns: 1fr 80px">
          <div class="form-group">
            <label>골프장 이름</label>
            <input v-model="form.course_name" placeholder="예: GC 구미" />
          </div>
          <div class="form-group">
            <label>총 파</label>
            <input v-model.number="form.total_par" type="number" min="1" max="100" style="text-align:center;font-weight:700" />
          </div>
        </div>
        <!-- 날짜 + 홀 수 -->
        <div class="form-row">
          <div class="form-group">
            <label>날짜</label>
            <input v-model="form.played_at" type="date" />
          </div>
          <div class="form-group">
            <label>홀 수</label>
            <select v-model="form.holes">
              <option :value="9">9홀</option>
              <option :value="18">18홀</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>메모</label>
          <textarea v-model="form.notes" rows="2" placeholder="날씨, 동반자 등 메모"></textarea>
        </div>
      </div>

      <!-- 홀별 스코어 입력 -->
      <div class="card" style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <h3 style="font-size:15px;font-weight:700">홀별 스코어</h3>
          <div class="mode-hint">Par 셀 탭 → 3/4/5 변경</div>
        </div>

        <!-- 전반 1~9홀 -->
        <div class="half-label">전반 (1~9홀)</div>
        <div class="scorecard-wrap">
          <table class="scorecard-table">
            <thead>
              <tr>
                <th class="label-cell">홀</th>
                <th v-for="h in 9" :key="h">{{ h }}</th>
                <th class="sum-cell">T</th>
              </tr>
            </thead>
            <tbody>
              <!-- Par 행 -->
              <tr class="row-par">
                <td class="label-cell">Par</td>
                <td v-for="h in 9" :key="'par'+h">
                  <span class="par-tap" @click="cyclePar(h-1)">{{ scores[h-1].par }}</span>
                </td>
                <td class="sum-cell par-sum">{{ scores.slice(0,9).reduce((a,s)=>a+s.par,0) }}</td>
              </tr>
              <!-- Score 행 (+/- 입력) -->
              <tr class="row-score">
                <td class="label-cell">Score</td>
                <td v-for="h in 9" :key="'sc'+h">
                  <input
                    v-model.number="diffs[h-1]"
                    type="number" min="-5" max="15"
                    class="score-input-h" :class="diffClass(diffs[h-1])"
                    @change="applyDiff(h-1)"
                  />
                </td>
                <td class="sum-cell" :class="front9Diff > 0 ? 'over' : front9Diff < 0 ? 'birdie' : 'even'">
                  {{ front9Diff > 0 ? '+' : '' }}{{ front9Diff }}
                </td>
              </tr>
              <!-- 실제 타수 행 -->
              <tr class="row-stroke">
                <td class="label-cell">타수</td>
                <td v-for="h in 9" :key="'st'+h" class="stroke-cell" :class="diffClass(diffs[h-1])">
                  {{ scores[h-1].score }}
                </td>
                <td class="sum-cell stroke-sum">{{ scores.slice(0,9).reduce((a,s)=>a+s.score,0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 후반 10~18홀 -->
        <template v-if="form.holes === 18">
          <div class="half-label" style="margin-top:16px">후반 (10~18홀)</div>
          <div class="scorecard-wrap">
            <table class="scorecard-table">
              <thead>
                <tr>
                  <th class="label-cell">홀</th>
                  <th v-for="h in 9" :key="h">{{ h+9 }}</th>
                  <th class="sum-cell">T</th>
                </tr>
              </thead>
              <tbody>
                <tr class="row-par">
                  <td class="label-cell">Par</td>
                  <td v-for="h in 9" :key="'par2'+h">
                    <span class="par-tap" @click="cyclePar(h+8)">{{ scores[h+8].par }}</span>
                  </td>
                  <td class="sum-cell par-sum">{{ scores.slice(9,18).reduce((a,s)=>a+s.par,0) }}</td>
                </tr>
                <tr class="row-score">
                  <td class="label-cell">Score</td>
                  <td v-for="h in 9" :key="'sc2'+h">
                    <input
                      v-model.number="diffs[h+8]"
                      type="number" min="-5" max="15"
                      class="score-input-h" :class="diffClass(diffs[h+8])"
                      @change="applyDiff(h+8)"
                    />
                  </td>
                  <td class="sum-cell" :class="back9Diff > 0 ? 'over' : back9Diff < 0 ? 'birdie' : 'even'">
                    {{ back9Diff > 0 ? '+' : '' }}{{ back9Diff }}
                  </td>
                </tr>
                <tr class="row-stroke">
                  <td class="label-cell">타수</td>
                  <td v-for="h in 9" :key="'st2'+h" class="stroke-cell" :class="diffClass(diffs[h+8])">
                    {{ scores[h+8].score }}
                  </td>
                  <td class="sum-cell stroke-sum">{{ scores.slice(9,18).reduce((a,s)=>a+s.score,0) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- 합계 -->
        <div class="total-bar">
          <div class="total-item">
            <span class="total-label">파</span>
            <span class="total-value">{{ form.total_par }}</span>
          </div>
          <div class="total-item">
            <span class="total-label">총타수</span>
            <span class="total-value total-score">{{ form.total_par + totalDiff }}타</span>
          </div>
          <div class="total-item">
            <span class="total-label">오버파</span>
            <span class="total-value diff" :class="totalDiff > 0 ? 'over' : totalDiff < 0 ? 'birdie' : 'even'">
              {{ totalDiff > 0 ? '+' : '' }}{{ totalDiff }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="saveError" class="error-msg" style="margin-top:12px">{{ saveError }}</div>
      <button class="btn btn-primary" style="width:100%;margin-top:16px;padding:14px" @click="save" :disabled="saving">
        {{ saving ? '저장 중...' : '라운드 저장' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase/client'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const today = new Date().toISOString().split('T')[0]
const form = ref({ course_name: '', played_at: today, holes: 18, notes: '', total_par: 72 })

// 홀 수 변경 시 total_par 기본값 자동 조정
watch(() => form.value.holes, (n) => {
  form.value.total_par = n === 18 ? 72 : 36
})

const diffs = ref(Array(18).fill(0)) // +/- 오버파 입력값

// 홀별 스코어 초기화 (18홀, par 기본값 4)
const scores = ref(Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, par: 4, score: 4 })))

// 파 값 탭 → 3 → 4 → 5 → 3 순환
function cyclePar(idx) {
  const cur = scores.value[idx].par
  scores.value[idx].par = cur === 3 ? 4 : cur === 4 ? 5 : 3
  // par 바뀌면 score 재계산
  scores.value[idx].score = scores.value[idx].par + (diffs.value[idx] || 0)
}

function applyDiff(idx) {
  scores.value[idx].score = scores.value[idx].par + (diffs.value[idx] || 0)
}

function diffClass(d) {
  if (d == null) return ''
  if (d <= -2) return 'eagle'
  if (d === -1) return 'birdie'
  if (d === 0) return 'even'
  if (d === 1) return 'bogey'
  return 'over'
}

const scanning = ref(false)
const scanError = ref('')
const saving = ref(false)
const saveError = ref('')

const front9Diff = computed(() => diffs.value.slice(0, 9).reduce((a, d) => a + (d || 0), 0))
const back9Diff = computed(() => diffs.value.slice(9, 18).reduce((a, d) => a + (d || 0), 0))
const totalDiff = computed(() => diffs.value.slice(0, form.value.holes).reduce((a, d) => a + (d || 0), 0))

// 사진 → Groq Vision 자동 입력
async function onPhoto(e) {
  const file = e.target.files[0]
  if (!file) return
  scanError.value = ''
  scanning.value = true

  try {
    const base64 = await resizeImage(file, 1024)

    const prompt = `이 사진은 골프 스코어카드입니다.

아래 정보를 정확하게 추출해주세요:

1. 골프장 이름
2. 날짜 (YYYY-MM-DD)
3. 총 스코어 숫자
4. 홀별 파(Par) 값 배열 - 1홀부터 18홀 순서로
5. 홀별 오버파(Score) 값 배열 - 스코어카드의 +/-숫자 (0=파,1=보기,2=더블보기,-1=버디)

스코어카드 읽는 순서:
- 위 줄(첫 번째 줄) = 1~9홀
- 아래 줄(두 번째 줄) = 10~18홀

반드시 아래 JSON 형식만 반환하세요 (다른 텍스트 없이):
{"course":"골프장명","date":"YYYY-MM-DD","total":92,"pars":[4,5,3,4,4,4,5,3,4,5,3,4,4,4,3,5,4,4],"diffs":[0,1,0,2,2,1,-1,2,0,1,1,1,1,2,3,1,1,2]}

- pars: 1홀~18홀 파 값 18개 (3,4,5 중 하나)
- diffs: 1홀~18홀 오버파 값 18개`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: base64 } }
          ]
        }],
        temperature: 0.1,
        max_tokens: 600
      })
    })

    const json = await res.json()
    const text = json.choices?.[0]?.message?.content || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('스코어 데이터를 읽지 못했습니다.')
    const obj = JSON.parse(match[0])

    if (obj.course) form.value.course_name = obj.course
    if (obj.date) form.value.played_at = obj.date

    // 파 값 적용
    if (obj.pars?.length) {
      obj.pars.forEach((p, i) => {
        if (i < 18 && [3, 4, 5].includes(p)) {
          scores.value[i].par = p
        }
      })
    }

    // 오버파 값 적용
    if (obj.diffs?.length) {
      const count = obj.diffs.length
      form.value.holes = count <= 9 ? 9 : 18
      obj.diffs.forEach((d, i) => {
        if (i < 18) {
          diffs.value[i] = d
          scores.value[i].score = scores.value[i].par + d
        }
      })
    }

    // total_par 자동 계산 (사진 인식된 par 합계)
    form.value.total_par = scores.value.slice(0, form.value.holes).reduce((a, s) => a + s.par, 0)

  } catch (err) {
    scanError.value = '자동 인식 실패: ' + err.message + '\n수동으로 입력해주세요.'
  } finally {
    scanning.value = false
  }
}

function resizeImage(file, maxSize) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = h * maxSize / w; w = maxSize }
        else { w = w * maxSize / h; h = maxSize }
      }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

async function save() {
  if (!form.value.course_name) { saveError.value = '골프장 이름을 입력하세요.'; return }
  saving.value = true
  saveError.value = ''
  try {
    const { data: round, error: e1 } = await supabase
      .from('golf_rounds')
      .insert({
        user_id: auth.user.id,
        course_name: form.value.course_name,
        played_at: form.value.played_at,
        holes: form.value.holes,
        total_score: form.value.total_par + totalDiff.value,
        notes: form.value.notes
      })
      .select().single()

    if (e1) throw e1

    const scoreRows = scores.value.slice(0, form.value.holes).map(s => ({
      round_id: round.id,
      hole: s.hole,
      par: s.par,
      score: s.score
    }))
    const { error: e2 } = await supabase.from('golf_scores').insert(scoreRows)
    if (e2) throw e2

    router.push(`/round/${round.id}`)
  } catch (err) {
    saveError.value = err.message
  } finally {
    saving.value = false
  }
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

.half-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--green);
  margin-bottom: 6px;
  padding: 3px 8px;
  background: var(--green-bg);
  border-radius: 5px;
  display: inline-block;
}

.mode-hint {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg);
  padding: 3px 8px;
  border-radius: 5px;
}

/* 스코어카드 */
.scorecard-wrap { width: 100%; }
.scorecard-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 12px;
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
  padding: 3px 1px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}
.label-cell {
  width: 38px;
  font-weight: 700;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  text-align: left !important;
  padding-left: 4px !important;
}
.sum-cell {
  width: 28px;
  font-weight: 700;
  font-size: 12px;
  background: #f0fdf4 !important;
  color: var(--green);
}

/* Par 행 */
.row-par td { background: #f8fffe; }
.par-tap {
  display: inline-block;
  min-width: 22px;
  padding: 3px 2px;
  font-size: 12px;
  font-weight: 700;
  color: #444;
  cursor: pointer;
  border-radius: 3px;
  user-select: none;
}
.par-tap:active { background: #d1fae5; }
.par-sum { color: #555 !important; font-size: 12px; }

/* Score 행 */
.row-score td { background: white; }
.score-input-h {
  width: 100%;
  max-width: 34px;
  padding: 4px 1px;
  font-size: 13px;
  font-weight: 700;
  border: 1.5px solid var(--border);
  border-radius: 4px;
  text-align: center;
  box-sizing: border-box;
}
.score-input-h.eagle { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }
.score-input-h.birdie { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
.score-input-h.bogey { border-color: #ea580c; color: #ea580c; }
.score-input-h.over { border-color: #dc2626; color: #dc2626; }

/* 타수 행 */
.row-stroke td { background: #fafafa; }
.stroke-cell {
  font-size: 12px;
  font-weight: 600;
}
.stroke-sum { font-size: 13px !important; font-weight: 800 !important; }

/* 합계 바 */
.total-bar {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  padding: 12px;
  background: var(--green-bg);
  border-radius: 10px;
}
.total-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.total-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}
.total-value {
  font-size: 18px;
  font-weight: 800;
  color: #222;
}
.total-score { color: var(--green); font-size: 20px; }

.scan-card { background: linear-gradient(135deg, #d8f3dc, #b7e4c7); border: none; }
.scan-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
.scan-desc { font-size: 13px; color: #2d6a4f; margin-bottom: 14px; }
.scan-actions { display: flex; gap: 10px; }
.scanning-msg { margin-top: 12px; font-size: 14px; color: var(--green); font-weight: 600; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* 스코어 색상 */
.eagle { color: #7c3aed; }
.birdie { color: #2563eb; }
.even { color: var(--text-muted); }
.bogey { color: #ea580c; }
.over { color: #dc2626; }

.diff.over { color: #dc2626; font-weight: 800; }
.diff.birdie { color: #2563eb; font-weight: 800; }
.diff.even { color: var(--text-muted); }
</style>
