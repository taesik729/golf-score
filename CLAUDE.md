# 골프 스코어 — CLAUDE.md

---

## 프로젝트 개요

- **이름**: 골프 스코어 (golf-score)
- **경로**: `C:\work\SCORE`
- **포트**: 3001 (`npm run dev`)

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Vue 3 (`<script setup>`) |
| 빌드 | Vite |
| 라우터 | Vue Router 4 |
| 상태관리 | Pinia |
| DB/Auth | Supabase |

---

## 라우트 목록

| 경로 | 화면 |
|------|------|
| `/login` | 로그인 |
| `/dashboard` | 대시보드 |
| `/round/new` | 새 라운드 |
| `/round/:id` | 라운드 상세 |

---

## 개발 환경

```bash
npm run dev     # 로컬 개발 서버 (port 3001)
npm run build   # 프로덕션 빌드
```

---

## Android APK Safe Area 처리 (필수!)

Capacitor 5는 기본적으로 edge-to-edge 모드로 실행됨.
WebView가 상단 Status Bar / 하단 Navigation Bar 영역까지 침범해서 UI가 겹치는 문제 발생.

### 해결 방법 (HOUSEHOLD에서 검증 완료 — 동일하게 적용)

**1. `index.html`** — viewport-fit=cover 추가
```html
<meta name="viewport" content="..., viewport-fit=cover" />
```

**2. CSS** — safe-area 적용 (하단 탭바, 상단 탑바, 콘텐츠, FAB 버튼)
```css
.topbar {
  padding: env(safe-area-inset-top, 0px) 20px 0;
  height: calc(56px + env(safe-area-inset-top, 0px));
  align-items: flex-end;
  padding-bottom: 8px;
}
.bottom-nav {
  bottom: env(safe-area-inset-bottom);
  height: 64px;
}
.content { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
.btn-fab { bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
```

**3. `MainActivity.java`**
```java
import android.os.Bundle;
import androidx.core.view.WindowCompat;
public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
```

**4. `capacitor.config.json`**
```json
"plugins": {
  "StatusBar": {
    "overlaysWebView": false,
    "style": "DEFAULT",
    "backgroundColor": "#ffffff"
  }
}
```

> 삼성 갤럭시 3버튼 네비 기준 safe-area-inset-bottom = **48px** 확인됨

---

## Supabase 인증 문제 디버깅 순서

1. Supabase 대시보드 → Authentication → URL Configuration 확인
   - **Site URL** 올바른지 확인
   - **Redirect URLs** 에 `/reset-password` URL 등록됐는지 확인
2. 환경변수 확인
3. 코드 확인

### 비밀번호 재설정 설정 (HOUSEHOLD에서 검증)
- `resetPasswordForEmail` 에 `redirectTo: 'https://golf-taesik.vercel.app/reset-password'` 하드코딩
- `src/supabase/client.js` → `detectSessionInUrl: true` 설정
- `src/router/index.js` → `/reset-password` 경로 가드 최상단에서 `return true` 처리
- 회원탈퇴 후 이동: `router.push` 대신 `window.location.href` 사용 (APK에서 router.push 미작동)

---

## 프로젝트 구분 (중요!)

- **심플 가계부** (`com.taesik.household`) — Android APK, Capacitor 앱
- **골프 스코어** (`C:\work\SCORE`) — Android APK, Capacitor 앱
- **AI 병해충 진단** — Android APK, Capacitor 앱
- **태식 팜 MES** — 웹앱 (PWA), APK 아님
- 앱 관련 작업(빌드, 배포, AdMob, Play Console)은 심플 가계부·골프 스코어·병해충 진단에만 해당

---

## 코드 수정 규칙

- 코드 수정 시 반드시 **수정 전 → 수정 후** 코드블록 형식으로 대화창에 펼쳐서 보여줌
- 터미널 명령어 실행 전 코드블록으로 명령어 먼저 표시
- "실행합니다" 하고 그냥 넘어가지 않음
- 모든 세션에 적용
- **구현 전 설계 먼저**: 새 기능 구현 전 반드시 폴더 구조·상태 흐름을 먼저 설계하고 사용자 확인 후 구현

---

## 세션 시작 방법

```
C:\work\SCORE 프로젝트야, CLAUDE.md 읽고 [작업내용] 해줘
```
