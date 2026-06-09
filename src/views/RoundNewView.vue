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

      <!-- 스코어 미리보기 (사진 스타일) -->
      <div class="score-preview">
        <div class="score-preview-left">
          <div class="preview-label">SCORE</div>
          <div class="preview-score">{{ totalScore }}</div>
        </div>
        <div class="score-preview-right">
          <div class="preview-course">{{ form.course_name || '골프장 이름' }}</div>
          <div class="preview-date">{{ form.played_at }}</div>
          <div class="preview-diff" :class="totalDiff > 0 ? 'over' : totalDiff < 0 ? 'birdie' : 'even'">
            {{ totalDiff > 0 ? '+' : '' }}{{ totalDiff }}
          </div>
        </div>
      </div>

      <!-- 사진 자동 입력 -->
      <div class="card scan-card" style="margin-top:16px">
        <div class="scan-title">📸 스코어카드 사진으로 자동 입력</div>
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

      <!-- 홀별 스코어 (IN / OUT) -->
      <div class="card" style="margin-top:16px">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:12px">홀별 오버파</h3>
        <p class="mode-desc">0=파, 1=보기, 2=더블보기, -1=버디</p>

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
              <td v-for="h in 9" :key="'in'+h">
                <input
                  v-model.number="diffs[h-1]"
                  type="number" min="-5" max="15"
                  class="diff-input" :class="diffClass(diffs[h-1])"
                />
              </td>
              <td class="sum-cell row-total" :class="front9Diff > 0 ? 'over' : front9Diff < 0 ? 'birdie' : 'even'">
                {{ front9Diff > 0 ? '+' : '' }}{{ front9Diff }}
              </td>
            </tr>
          </tbody>
        </table>

        <template v-if="form.holes === 18">
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
                <td v-for="h in 9" :key="'out'+h">
                  <input
                    v-model.number="diffs[h+8]"
                    type="number" min="-5" max="15"
                    class="diff-input" :class="diffClass(diffs[h+8])"
                  />
                </td>
                <td class="sum-cell row-total" :class="back9Diff > 0 ? 'over' : back9Diff < 0 ? 'birdie' : 'even'">
                  {{ back9Diff > 0 ? '+' : '' }}{{ back9Diff }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>
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

watch(() => form.value.holes, (n) => {
  form.value.total_par = n === 18 ? 72 : 36
})

const diffs = ref(Array(18).fill(0))

const front9Diff = computed(() => diffs.value.slice(0, 9).reduce((a, d) => a + (d || 0), 0))
const back9Diff  = computed(() => diffs.value.slice(9, 18).reduce((a, d) => a + (d || 0), 0))
const totalDiff  = computed(() => diffs.value.slice(0, form.value.holes).reduce((a, d) => a + (d || 0), 0))
const totalScore = computed(() => form.value.total_par + totalDiff.value)

function diffClass(d) {
  if (d == null) return ''
  if (d <= -2) return 'eagle'
  if (d === -1) return 'birdie'
  if (d === 0)  return 'even'
  if (d === 1)  return 'bogey'
  return 'over'
}

const scanning = ref(false)
const scanError = ref('')
const saving    = ref(false)
const saveError = ref('')

async function onPhoto(e) {
  const file = e.target.files[0]
  if (!file) return
  scanError.value = ''
  scanning.value = true
  try {
    const base64 = await resizeImage(file, 1024)

    const prompt = `이 사진은 골프 스코어카드입니다.

IN 줄(위)과 OUT 줄(아래)에 각각 9개의 숫자가 있습니다.
각 숫자는 오버파 수치입니다 (0=파, 1=보기, 2=더블보기, -1=버디).

- IN 줄 9개 숫자 = 1~9홀 오버파
- OUT 줄 9개 숫자 = 10~18홀 오버파

반드시 아래 JSON 형식만 반환하세요 (다른 텍스트 없이):
{"course":"골프장명","date":"YYYY-MM-DD","total":91,"diffs":[1,1,0,2,0,0,1,1,1,2,1,1,3,2,1,1,2,0]}`

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
        max_tokens: 400
      })
    })

    const json = await res.json()
    const text = json.choices?.[0]?.message?.content || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('스코어 데이터를 읽지 못했습니다.')
    const obj = JSON.parse(match[0])

    if (obj.course) form.value.course_name = obj.course
    if (obj.date)   form.value.played_at   = obj.date

    if (obj.diffs?.length) {
      const count = obj.diffs.length
      form.value.holes = count <= 9 ? 9 : 18
      obj.diffs.forEach((d, i) => { if (i < 18) diffs.value[i] = d })
    }

    // 사진에 총스코어가 있으면 total_par 역산
    if (obj.total && obj.total > 0) {
      form.value.total_par = obj.total - totalDiff.value
    }

  } catch (err) {
    scanError.value = '자동 인식 실패: ' + err.message
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
        else       { w = w * maxSize / h; h = maxSize }
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
        user_id:      auth.user.id,
        course_name:  form.value.course_name,
        played_at:    form.value.played_at,
        holes:        form.value.holes,
        total_score:  totalScore.value,
        notes:        form.value.notes
      })
      .select().single()
    if (e1) throw e1

    // 홀별 저장 (par=4 기본값)
    const scoreRows = diffs.value.slice(0, form.value.holes).map((d, i) => ({
      round_id: round.id,
      hole:     i + 1,
      par:      4,
      score:    4 + (d || 0)
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
  width: 80px;
  height: 80px;
  justify-content: center;
  flex-shrink: 0;
}
.preview-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; opacity: 0.8; }
.preview-score { font-size: 32px; font-weight: 900; line-height: 1; }
.score-preview-right { flex: 1; }
.preview-course { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
.preview-date   { font-size: 13px; opacity: 0.8; margin-bottom: 6px; }
.preview-diff   { font-size: 16px; font-weight: 700; }
.preview-diff.over   { color: #fca5a5; }
.preview-diff.birdie { color: #93c5fd; }
.preview-diff.even   { color: #d1d5db; }

/* 스코어카드 테이블 */
.scorecard-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.scorecard-table td {
  padding: 6px 2px;
  text-align: center;
}
.scorecard-table tr:first-child td { border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 4px; }

.label-cell {
  width: 40px;
  font-weight: 700;
  font-size: 12px;
  color: var(--text-muted);
  text-align: left !important;
  padding-left: 4px !important;
}
.sum-cell {
  width: 30px;
  font-weight: 800;
  font-size: 13px;
  background: #f0fdf4 !important;
  color: var(--green);
}
.scorecard-table th {
  background: var(--green);
  color: white;
  padding: 5px 2px;
  text-align: center;
  font-weight: 700;
  font-size: 12px;
}
.row-total {
  font-weight: 800;
  font-size: 13px;
}

.diff-input {
  width: 100%;
  max-width: 32px;
  padding: 5px 1px;
  font-size: 14px;
  font-weight: 700;
  border: 1.5px solid var(--border);
  border-radius: 5px;
  text-align: center;
  box-sizing: border-box;
}
.diff-input.eagle { border-color: #7c3aed; color: #7c3aed; background: #f5f3ff; }
.diff-input.birdie { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
.diff-input.bogey  { border-color: #ea580c; color: #ea580c; }
.diff-input.over   { border-color: #dc2626; color: #dc2626; }

.mode-desc {
  font-size: 12px;
  color: var(--green);
  background: var(--green-bg);
  padding: 5px 10px;
  border-radius: 6px;
  margin-bottom: 12px;
}

.scan-card { background: linear-gradient(135deg, #d8f3dc, #b7e4c7); border: none; }
.scan-title { font-size: 15px; font-weight: 700; margin-bottom: 10px; }
.scan-actions { display: flex; gap: 10px; }
.scanning-msg { margin-top: 10px; font-size: 14px; color: var(--green); font-weight: 600; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* 색상 */
.eagle  { color: #7c3aed; }
.birdie { color: #2563eb; }
.even   { color: var(--text-muted); }
.bogey  { color: #ea580c; }
.over   { color: #dc2626; }
</style>
