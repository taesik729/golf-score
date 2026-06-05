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
      <div class="card" style="margin-top:16px;overflow-x:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h3 style="font-size:15px;font-weight:700">홀별 스코어</h3>
          <div class="mode-tabs">
            <button :class="{ active: inputMode === 'score' }" @click="inputMode = 'score'">타수 입력</button>
            <button :class="{ active: inputMode === 'diff' }" @click="inputMode = 'diff'">+/- 입력</button>
          </div>
        </div>
        <p v-if="inputMode === 'diff'" class="mode-desc">스코어카드의 오버파 숫자를 그대로 입력하세요 (이븐=0, 보기=1, 버디=-1)</p>

        <!-- 가로 스코어카드 형식: 위=1~9홀, 아래=10~18홀 -->
        <div class="scorecard-wrap">
          <!-- 첫 번째 줄: 1~9홀 -->
          <table class="scorecard-table">
            <thead>
              <tr>
                <th class="label-cell">홀</th>
                <th v-for="h in 9" :key="h">{{ h }}</th>
                <th class="sum-cell">계</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="label-cell">{{ inputMode==='diff' ? '+/-' : '타수' }}</td>
                <td v-for="h in 9" :key="'sc'+h">
                  <input v-if="inputMode==='score'"
                    v-model.number="scores[h-1].score"
                    type="number" min="1" max="20"
                    class="score-input-h" :class="scoreClass(scores[h-1])"
                  />
                  <input v-else
                    v-model.number="diffs[h-1]"
                    type="number" min="-5" max="15"
                    class="score-input-h" :class="diffClass(diffs[h-1])"
                    @change="applyDiff(h-1)"
                  />
                </td>
                <td class="sum-cell score-sum">{{ scores.slice(0,9).reduce((a,s)=>a+s.score,0) }}</td>
              </tr>
              <tr>
                <td class="label-cell">{{ inputMode==='diff' ? '타수' : '+/-' }}</td>
                <td v-for="h in 9" :key="'dif'+h" class="diff-cell" :class="inputMode==='score' ? scoreClass(scores[h-1]) : ''">
                  {{ inputMode==='diff' ? scores[h-1].score : scoreDiff(scores[h-1]) }}
                </td>
                <td class="sum-cell diff-cell">
                  {{ (d => (d>0?'+':'')+d)(scores.slice(0,9).reduce((a,s)=>a+(s.score-s.par),0)) }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 두 번째 줄: 10~18홀 (18홀만) -->
          <template v-if="form.holes === 18">
            <table class="scorecard-table" style="margin-top:12px">
              <thead>
                <tr>
                  <th class="label-cell">홀</th>
                  <th v-for="h in 9" :key="h">{{ h+9 }}</th>
                  <th class="sum-cell">계</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="label-cell">{{ inputMode==='diff' ? '+/-' : '타수' }}</td>
                  <td v-for="h in 9" :key="'sc2'+h">
                    <input v-if="inputMode==='score'"
                      v-model.number="scores[h+8].score"
                      type="number" min="1" max="20"
                      class="score-input-h" :class="scoreClass(scores[h+8])"
                    />
                    <input v-else
                      v-model.number="diffs[h+8]"
                      type="number" min="-5" max="15"
                      class="score-input-h" :class="diffClass(diffs[h+8])"
                      @change="applyDiff(h+8)"
                    />
                  </td>
                  <td class="sum-cell score-sum">{{ scores.slice(9,18).reduce((a,s)=>a+s.score,0) }}</td>
                </tr>
                <tr>
                  <td class="label-cell">{{ inputMode==='diff' ? '타수' : '+/-' }}</td>
                  <td v-for="h in 9" :key="'dif2'+h" class="diff-cell" :class="inputMode==='score' ? scoreClass(scores[h+8]) : ''">
                    {{ inputMode==='diff' ? scores[h+8].score : scoreDiff(scores[h+8]) }}
                  </td>
                  <td class="sum-cell diff-cell">
                    {{ (d => (d>0?'+':'')+d)(scores.slice(9,18).reduce((a,s)=>a+(s.score-s.par),0)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>

        <!-- 합계 -->
        <div class="total-row">
          <span>총계</span>
          <span>파 {{ form.total_par }}</span>
          <span class="total-score">{{ form.total_par + totalDiff }}타</span>
          <span class="diff" :class="totalDiff > 0 ? 'over' : totalDiff < 0 ? 'under' : 'even'">
            {{ totalDiff > 0 ? '+' : '' }}{{ totalDiff }}
          </span>
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
const inputMode = ref('score') // 'score' | 'diff'
const startWith = ref('OUT')  // 'OUT' | 'IN'
const diffs = ref(Array(18).fill(0)) // +/- 입력값

function applyDiff(idx) {
  scores.value[idx].score = scores.value[idx].par + (diffs.value[idx] || 0)
}

function diffClass(d) {
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

// 홀별 스코어 초기화 (18홀)
const scores = ref(Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, par: 4, score: 4 })))

// 홀 수 변경 시 유지
watch(() => form.value.holes, (n) => {
  if (scores.value.length < n) {
    for (let i = scores.value.length; i < n; i++) {
      scores.value.push({ hole: i + 1, par: 4, score: 4 })
    }
  }
})

const totalPar = computed(() => scores.value.slice(0, form.value.holes).reduce((a, s) => a + s.par, 0))
const totalScore = computed(() => scores.value.slice(0, form.value.holes).reduce((a, s) => a + (s.score || 0), 0))
const totalDiff = computed(() => diffs.value.slice(0, form.value.holes).reduce((a, d) => a + (d || 0), 0))

function scoreDiff(s) {
  const d = s.score - s.par
  if (!s.score) return ''
  return d === 0 ? 'E' : d > 0 ? `+${d}` : `${d}`
}

function scoreClass(s) {
  const d = s.score - s.par
  if (!s.score) return ''
  if (d <= -2) return 'eagle'
  if (d === -1) return 'birdie'
  if (d === 0) return 'even'
  if (d === 1) return 'bogey'
  return 'over'
}

// 사진 → Groq Vision 자동 입력
async function onPhoto(e) {
  const file = e.target.files[0]
  if (!file) return
  scanError.value = ''
  scanning.value = true

  try {
    // 이미지 리사이즈 (1024px)
    const base64 = await resizeImage(file, 1024)

    const prompt = `이 사진은 골프 스코어카드입니다.

스코어카드에 IN/OUT 두 줄로 숫자가 나열되어 있습니다.
각 숫자는 해당 홀의 파 대비 오버파 수치입니다 (0=파, 1=보기, 2=더블보기, -1=버디).

읽는 순서:
- 위 줄(첫 번째 줄) 9개 숫자 = 1~9홀 오버파
- 아래 줄(두 번째 줄) 9개 숫자 = 10~18홀 오버파

반드시 아래 JSON 형식만 반환하세요 (다른 텍스트 없이):
{"course":"골프장명","date":"YYYY-MM-DD","total":91,"diffs":[1,1,0,2,0,0,1,1,1,2,1,1,3,2,1,1,2,0]}

- course: 골프장 이름 (없으면 "")
- date: 날짜 YYYY-MM-DD (없으면 "")
- total: 스코어카드에 표시된 총 스코어 숫자 (없으면 0)
- diffs: 1홀~18홀 순서로 오버파 숫자 18개 배열`

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
        max_tokens: 500
      })
    })

    const json = await res.json()
    const text = json.choices?.[0]?.message?.content || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('스코어 데이터를 읽지 못했습니다.')
    const obj = JSON.parse(match[0])

    // 골프장명, 날짜 자동 입력
    if (obj.course) form.value.course_name = obj.course
    if (obj.date) form.value.played_at = obj.date

    // +/- 값을 diffs에 채우고, scores에도 반영
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

    // 사진 인식 후 +/- 입력 모드로 자동 전환
    inputMode.value = 'diff'

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

// IN/OUT 스왑 (전반 1~9 ↔ 후반 10~18)
function swapInOut() {
  const front = scores.value.slice(0, 9).map(s => ({ ...s }))
  const back = scores.value.slice(9, 18).map(s => ({ ...s }))
  back.forEach((s, i) => { scores.value[i] = { ...s, hole: i + 1 } })
  front.forEach((s, i) => { scores.value[i + 9] = { ...s, hole: i + 10 } })
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
        total_score: inputMode.value === 'diff'
          ? form.value.total_par + totalDiff.value
          : totalScore.value,
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

/* 가로 스코어카드 */
.scorecard-wrap { overflow-x: auto; }
.scorecard-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 480px;
  font-size: 13px;
}
.scorecard-table th {
  background: var(--green);
  color: white;
  padding: 6px 4px;
  text-align: center;
  font-weight: 700;
  min-width: 36px;
}
.scorecard-table td {
  padding: 4px 2px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}
.scorecard-table tr:nth-child(even) td { background: var(--bg); }
.label-cell {
  font-weight: 700;
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
  padding: 4px 8px !important;
  text-align: left !important;
  background: var(--bg) !important;
}
.sum-cell {
  font-weight: 700;
  background: #f0fdf4 !important;
  color: var(--green);
}
.score-sum { font-size: 16px; }
.diff-cell { font-size: 12px; font-weight: 700; }

.par-sel-h {
  width: 36px;
  padding: 3px 2px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 4px;
  text-align: center;
}
.score-input-h {
  width: 36px;
  padding: 4px 2px;
  font-size: 14px;
  font-weight: 700;
  border: 1.5px solid var(--border);
  border-radius: 4px;
  text-align: center;
}
.score-input-h.eagle { border-color: #7c3aed; color: #7c3aed; }
.score-input-h.birdie { border-color: #2563eb; color: #2563eb; }
.score-input-h.bogey { border-color: #ea580c; }
.score-input-h.over { border-color: #dc2626; }

.start-tabs {
  display: flex;
  gap: 8px;
}
.start-tabs button {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: white;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-muted);
}
.start-tabs button.active {
  background: var(--green);
  color: white;
  border-color: var(--green);
}

.mode-tabs {
  display: flex;
  background: var(--bg);
  border-radius: 8px;
  padding: 3px;
}
.mode-tabs button {
  border: none;
  background: transparent;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-muted);
}
.mode-tabs button.active {
  background: var(--green);
  color: white;
}
.mode-desc {
  font-size: 12px;
  color: var(--green);
  background: var(--green-bg);
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.btn-swap {
  border: 1.5px solid var(--green);
  background: white;
  color: var(--green);
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.btn-swap:hover { background: var(--green-bg); }

.half-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--green);
  margin-bottom: 8px;
  padding: 4px 8px;
  background: var(--green-bg);
  border-radius: 6px;
}
.half-subtotal {
  display: grid;
  grid-template-columns: 36px 60px 72px 48px;
  gap: 8px;
  padding: 8px 4px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.scan-card { background: linear-gradient(135deg, #d8f3dc, #b7e4c7); border: none; }
.scan-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
.scan-desc { font-size: 13px; color: #2d6a4f; margin-bottom: 14px; }
.scan-actions { display: flex; gap: 10px; }
.scanning-msg { margin-top: 12px; font-size: 14px; color: var(--green); font-weight: 600; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.score-grid { display: flex; flex-direction: column; gap: 6px; }
.score-header {
  display: grid; grid-template-columns: 36px 60px 72px 48px;
  gap: 8px; font-size: 12px; font-weight: 700; color: var(--text-muted);
  padding: 0 4px;
}
.score-row {
  display: grid; grid-template-columns: 36px 60px 72px 48px;
  gap: 8px; align-items: center; padding: 4px;
  border-radius: 6px;
}
.score-row:nth-child(even) { background: var(--bg); }
.hole-num { font-weight: 700; font-size: 14px; text-align: center; }
.par-sel { padding: 6px 4px; font-size: 14px; }
.score-input { padding: 6px 8px; font-size: 16px; font-weight: 700; text-align: center; }
.diff { font-size: 13px; font-weight: 700; text-align: center; }

.total-row {
  display: grid; grid-template-columns: 36px 60px 72px 48px;
  gap: 8px; align-items: center; padding: 12px 4px 4px;
  border-top: 2px solid var(--border); margin-top: 8px;
  font-weight: 700;
}
.total-score { font-size: 18px; font-weight: 800; color: var(--green); text-align: center; }

/* 스코어 색상 */
.eagle { color: #7c3aed; }
.birdie { color: #2563eb; }
.even { color: var(--text-muted); }
.bogey { color: #ea580c; }
.over { color: #dc2626; }
.score-input.eagle { border-color: #7c3aed; color: #7c3aed; }
.score-input.birdie { border-color: #2563eb; color: #2563eb; }
.score-input.bogey { border-color: #ea580c; }
.score-input.over { border-color: #dc2626; }
</style>
