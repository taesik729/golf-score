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
            사진 선택
            <input type="file" accept="image/*" capture="environment" style="display:none" @change="onPhoto" />
          </label>
        </div>
        <div v-if="scanning" class="scanning-msg">🤖 AI가 스코어카드를 분석 중...</div>
        <div v-if="scanError" class="error-msg">{{ scanError }}</div>
      </div>

      <!-- 기본 정보 -->
      <div class="card" style="margin-top:16px">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">기본 정보</h3>
        <div class="form-group">
          <label>골프장 이름</label>
          <input v-model="form.course_name" placeholder="예: 경주 힐링밸리 골프클럽" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>라운드 날짜</label>
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
        <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">홀별 스코어</h3>
        <div class="score-grid">
          <div class="score-header">
            <span>홀</span>
            <span>파</span>
            <span>타수</span>
            <span>+/-</span>
          </div>
          <div v-for="h in form.holes" :key="h" class="score-row">
            <span class="hole-num">{{ h }}</span>
            <select v-model="scores[h-1].par" class="par-sel">
              <option :value="3">3</option>
              <option :value="4">4</option>
              <option :value="5">5</option>
            </select>
            <input
              v-model.number="scores[h-1].score"
              type="number" min="1" max="20"
              class="score-input"
              :class="scoreClass(scores[h-1])"
            />
            <span class="diff" :class="scoreClass(scores[h-1])">
              {{ scoreDiff(scores[h-1]) }}
            </span>
          </div>
        </div>

        <!-- 합계 -->
        <div class="total-row">
          <span>총계</span>
          <span>파 {{ totalPar }}</span>
          <span class="total-score">{{ totalScore }}타</span>
          <span class="diff" :class="totalScore - totalPar > 0 ? 'over' : totalScore - totalPar < 0 ? 'under' : 'even'">
            {{ totalScore - totalPar > 0 ? '+' : '' }}{{ totalScore - totalPar }}
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
const form = ref({ course_name: '', played_at: today, holes: 18, notes: '' })
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
각 홀의 파(PAR)와 타수(SCORE)를 JSON 배열로 추출해주세요.
반드시 아래 형식만 반환하세요 (다른 텍스트 없이):
[{"hole":1,"par":4,"score":5},{"hole":2,"par":3,"score":3},...]
홀 번호 순서대로, 확인 불가 홀은 par:4, score:4로 채워주세요.`

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
        max_tokens: 1000
      })
    })

    const json = await res.json()
    const text = json.choices?.[0]?.message?.content || ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('스코어 데이터를 읽지 못했습니다.')

    const parsed = JSON.parse(match[0])
    parsed.forEach((h, i) => {
      if (i < 18) {
        scores.value[i].par = h.par || 4
        scores.value[i].score = h.score || 4
      }
    })
    form.value.holes = parsed.length <= 9 ? 9 : 18

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
        total_score: totalScore.value,
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
