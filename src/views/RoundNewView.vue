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
        <p class="scan-desc">스코어카드를 촬영하면 AI가 오버파 수치를 자동으로 읽어냅니다</p>
        <label class="btn btn-primary" style="cursor:pointer;display:inline-flex">
          사진 선택
          <input type="file" accept="image/*" capture="environment" style="display:none" @change="onPhoto" />
        </label>
        <div v-if="scanning" class="scanning-msg">🤖 AI가 스코어카드를 분석 중...</div>
        <div v-if="scanError" class="error-msg" style="margin-top:8px">{{ scanError }}</div>
      </div>

      <!-- 기본 정보 -->
      <div class="card" style="margin-top:16px">
        <h3 class="sec-title">기본 정보</h3>
        <div class="form-group">
          <label>골프장 이름</label>
          <input v-model="form.course_name" placeholder="예: GC 구미" />
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
          <textarea v-model="form.notes" rows="2" placeholder="날씨, 동반자 등"></textarea>
        </div>
      </div>

      <!-- 홀별 오버파 입력 -->
      <div class="card" style="margin-top:16px">
        <h3 class="sec-title">홀별 오버파 (+/-)</h3>
        <p class="hint">스코어카드에 표시된 숫자 그대로 입력 (보기=1, 파=0, 버디=-1)</p>

        <!-- 1~9홀 -->
        <div class="hole-section">
          <div class="hole-header">
            <span class="hole-label">홀</span>
            <span v-for="h in 9" :key="h" class="hole-num">{{ h }}</span>
            <span class="hole-sum">합</span>
          </div>
          <div class="hole-row">
            <span class="hole-label">+/-</span>
            <input
              v-for="h in 9" :key="h"
              v-model.number="diffs[h-1]"
              type="number" min="-5" max="15"
              class="diff-input"
              :class="diffClass(diffs[h-1])"
            />
            <span class="hole-sum" :class="sum1 > 0 ? 'over' : sum1 < 0 ? 'birdie' : 'even'">
              {{ sum1 > 0 ? '+' : '' }}{{ sum1 }}
            </span>
          </div>
        </div>

        <!-- 10~18홀 (18홀만) -->
        <div v-if="form.holes === 18" class="hole-section" style="margin-top:12px">
          <div class="hole-header">
            <span class="hole-label">홀</span>
            <span v-for="h in 9" :key="h" class="hole-num">{{ h+9 }}</span>
            <span class="hole-sum">합</span>
          </div>
          <div class="hole-row">
            <span class="hole-label">+/-</span>
            <input
              v-for="h in 9" :key="h"
              v-model.number="diffs[h+8]"
              type="number" min="-5" max="15"
              class="diff-input"
              :class="diffClass(diffs[h+8])"
            />
            <span class="hole-sum" :class="sum2 > 0 ? 'over' : sum2 < 0 ? 'birdie' : 'even'">
              {{ sum2 > 0 ? '+' : '' }}{{ sum2 }}
            </span>
          </div>
        </div>

        <!-- 합계 -->
        <div class="total-bar">
          <div>
            <div style="font-size:12px;color:var(--text-muted)">파 {{ totalPar }} 기준</div>
            <div style="font-size:13px;margin-top:2px">
              오버파
              <span :class="totalDiff > 0 ? 'over' : totalDiff < 0 ? 'birdie' : 'even'" style="font-weight:800">
                {{ totalDiff > 0 ? '+' : '' }}{{ totalDiff }}
              </span>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;color:var(--text-muted)">총 스코어</div>
            <div style="font-size:32px;font-weight:800;color:var(--green)">{{ finalScore }}타</div>
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase/client'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const today = new Date().toISOString().split('T')[0]
const form = ref({ course_name: '', played_at: today, holes: 18, notes: '' })

// 18홀 +/- 입력값 (0 = 파)
const diffs = ref(Array(18).fill(0))

const sum1 = computed(() => diffs.value.slice(0, 9).reduce((a, d) => a + (d || 0), 0))
const sum2 = computed(() => diffs.value.slice(9, 18).reduce((a, d) => a + (d || 0), 0))
const totalDiff = computed(() => form.value.holes === 18 ? sum1.value + sum2.value : sum1.value)
const totalPar = computed(() => form.value.holes === 18 ? 72 : 36)
const finalScore = computed(() => totalPar.value + totalDiff.value)

const scanning = ref(false)
const scanError = ref('')

async function onPhoto(e) {
  const file = e.target.files[0]
  if (!file) return
  scanError.value = ''
  scanning.value = true
  try {
    const base64 = await resizeImage(file, 1024)
    const prompt = `이 골프 스코어카드에서 각 홀의 오버파 수치를 읽어주세요.

스코어카드에 IN/OUT 두 줄로 표시된 경우:
- 첫 번째 줄 9개 숫자 = 1~9홀 오버파
- 두 번째 줄 9개 숫자 = 10~18홀 오버파
- 숫자가 0이면 파(이븐), 1이면 보기, 2면 더블보기, -1이면 버디

골프장 이름과 날짜도 있으면 함께 추출해주세요.

반드시 아래 JSON 형식만 반환 (다른 텍스트 없이):
{"course":"골프장명","date":"YYYY-MM-DD","diffs":[1,1,0,2,0,0,1,1,1,2,1,1,3,2,1,1,2,0]}

diffs는 1홀부터 18홀(또는 9홀) 순서로 오버파 숫자 배열.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: base64 } }
        ]}],
        temperature: 0.1, max_tokens: 500
      })
    })
    const json = await res.json()
    const text = json.choices?.[0]?.message?.content || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('인식 실패')
    const obj = JSON.parse(match[0])
    if (obj.course) form.value.course_name = obj.course
    if (obj.date) form.value.played_at = obj.date
    if (obj.diffs?.length) {
      obj.diffs.forEach((d, i) => { if (i < 18) diffs.value[i] = d })
      form.value.holes = obj.diffs.length <= 9 ? 9 : 18
    }
  } catch (err) {
    scanError.value = '자동 인식 실패. 수동으로 입력해주세요.'
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
      if (w > h) { h = h * maxSize / w; w = maxSize } else { w = w * maxSize / h; h = maxSize }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

function diffClass(d) {
  if (d <= -2) return 'eagle'
  if (d === -1) return 'birdie'
  if (d === 0) return 'even'
  if (d === 1) return 'bogey'
  return 'over'
}

const saving = ref(false)
const saveError = ref('')

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
        total_score: finalScore.value,
        notes: form.value.notes
      })
      .select().single()
    if (e1) throw e1

    // 홀별 저장 (+/- 기준, par=4 기본값으로 score 계산)
    const count = form.value.holes
    const scoreRows = Array.from({ length: count }, (_, i) => ({
      round_id: round.id,
      hole: i + 1,
      par: 4,
      score: 4 + (diffs.value[i] || 0)
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

.scan-card { background: linear-gradient(135deg, #d8f3dc, #b7e4c7); border: none; }
.scan-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
.scan-desc { font-size: 13px; color: #2d6a4f; margin-bottom: 14px; }
.scanning-msg { margin-top: 12px; font-size: 14px; color: var(--green); font-weight: 600; }

.sec-title { font-size: 15px; font-weight: 700; margin-bottom: 16px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.big-input { font-size: 24px; font-weight: 800; color: var(--green); text-align: center; }
.hint { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; background: var(--bg); padding: 6px 10px; border-radius: 6px; }

/* 홀별 입력 */
.hole-section { overflow-x: auto; }
.hole-header, .hole-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 480px;
}
.hole-header {
  margin-bottom: 6px;
}
.hole-label {
  width: 32px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}
.hole-num {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: white;
  background: var(--green);
  border-radius: 4px;
  padding: 4px 0;
}
.hole-sum {
  width: 36px;
  text-align: center;
  font-weight: 800;
  font-size: 14px;
  flex-shrink: 0;
}
.diff-input {
  flex: 1;
  min-width: 0;
  padding: 6px 2px;
  font-size: 16px;
  font-weight: 800;
  border: 2px solid var(--border);
  border-radius: 6px;
  text-align: center;
  background: white;
}
.diff-input:focus { outline: none; border-color: var(--green); }

.total-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 2px solid var(--border);
  font-weight: 700;
}

/* 색상 */
.eagle { color: #7c3aed; border-color: #7c3aed !important; }
.birdie { color: #2563eb; border-color: #2563eb !important; }
.even { color: var(--text-muted); }
.bogey { color: #ea580c; border-color: #ea580c !important; }
.over { color: #dc2626; border-color: #dc2626 !important; }
</style>
