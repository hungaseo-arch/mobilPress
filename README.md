# MobilPress (독립 실행형 Vue 3 앱)

기존 React 클라이언트를 **Vue 3 + Vite + TypeScript + Tailwind v4 + Pinia + Vue Router**로 마이그레이션한 **독립 실행형** 버전입니다. 모노레포나 별도 백엔드 없이 이 폴더 하나만으로 실행됩니다. API는 내장 **mock 레이어**(`src/lib/mock-api.ts`)가 브라우저 안에서 처리하며, 데이터는 localStorage에 저장됩니다.

## 스택 (Teknologi / 기술)

- **Vue 3 Composition API** — `<script setup>` 문법
- **Vite 6** — 개발 서버 및 번들러
- **Tailwind CSS v4** — CSS-first 설정 (`src/assets/main.css`)
- **Pinia** — 상태관리 (`src/stores/mobilPress.ts`)
- **Vue Router 4** — 라우팅 (`src/router/index.ts`)
- **lucide-vue-next** — 아이콘, **vue-sonner** — 토스트 알림
- **내장 mock API** — 백엔드 없이 동작 (`src/lib/mock-api.ts`)

## 실행 방법 (백엔드 불필요)

```bash
npm install
npm run dev
```

개발 서버 주소:

```
http://localhost:5173/
```

> 처음에는 데이터가 비어 있습니다. 히어로 영역의 **"보고서 초기 데이터"** 버튼을 누르면
> 첨부 보고서 기반 고객/장착 데이터가 채워집니다. 이후 등록·수정·삭제한 내용은
> 브라우저 localStorage에 저장되어 새로고침해도 유지됩니다.
> (초기화하려면 브라우저 콘솔에서 `localStorage.removeItem('mobilpress-mock-db')` 실행 후 새로고침.)

## 실제 백엔드에 연결하려면 (선택)

`.env.example`을 `.env`로 복사한 뒤 아래처럼 설정하고, 실제 Hono 백엔드를 띄웁니다.

```env
VITE_USE_MOCK=false
VITE_API_PROXY_TARGET=http://localhost:3100
```

`VITE_USE_MOCK=false`이면 `apiFetch`가 실제 `/api/mobil-press/*`로 요청하고,
vite dev 서버가 이를 `VITE_API_PROXY_TARGET`으로 프록시합니다.

## 빌드 / 검증

```bash
npm run build      # vue-tsc 타입체크 + vite build
npm run typecheck  # 타입체크만
npm run preview    # 빌드 결과 미리보기
```

## 폴더 구조

```
src/
  main.ts                  앱 진입점 (Pinia, Router 등록)
  App.vue                  루트 컴포넌트 (Toaster + RouterView)
  assets/main.css          Tailwind v4 + 테마 토큰
  router/index.ts          라우트 정의 (/ , 404 catch-all)
  stores/mobilPress.ts     Pinia 스토어 (데이터/필터/CRUD/시드)
  lib/
    mock-api.ts            내장 mock API (localStorage 기반 CRUD) ★독립 실행 핵심
    api.ts                 apiFetch (mock/실백엔드 분기 + 에러 토스트)
    api-base.ts            API_BASE_URL / apiUrl / authUrl
    api-error.ts           API 에러 정규화
    auth.ts                Bearer 토큰 헬퍼 (로그인 UI는 다음 단계)
    format.ts              formatRp, parseApi, statusLabel 등
    types.ts               도메인 타입
  data/seed.ts             빈 폼 기본값 + 보고서 초기 데이터
  components/
    ui/BaseButton.vue      버튼 (variant/size)
    dashboard/             MetricCard, PanelCard, Form*, StatusBadge,
                           EmptyState, 4개 탭 컴포넌트
  pages/
    HomeView.vue           대시보드 셸 (헤더/히어로/검색/탭)
    NotFoundView.vue       404
```

## 구현 범위

- ✅ 메인 대시보드 4개 탭: 대시보드 · 고객 정보 · 타이어 장착 · 요금·SOP
- ✅ 검색, 새로고침, 보고서 초기 데이터 시드, CRUD (mock/실백엔드 공통)
- ✅ 404 페이지
- ✅ 백엔드 없이 완전 독립 실행 (mock API + localStorage)
- ⏳ 인증(로그인/회원가입) 페이지 — 다음 단계 (`auth.ts` 토큰 헬퍼는 이미 준비됨)
