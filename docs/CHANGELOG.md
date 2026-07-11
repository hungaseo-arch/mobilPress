# 변경 기록 (CHANGELOG)

주요 코드 변경 내용과 주요사항을 기록합니다. 최신 항목이 위에 옵니다.

## 2026-07-10 — 역할 기반 권한(staff/user) + 감사 로그

- **요구사항**: 수정 시 로그 기록 / staff 는 데이터 입력·수정, user 는 조회만
- `db/schema.sql` 전면 개정 (**Neon SQL Editor 에서 재실행 필요** — 여러 번 실행해도 안전):
  - `user_roles` 테이블: staff / user 역할. 신규 가입자는 기본 user(조회 전용).
    staff 승격은 SQL Editor 에서 `insert into user_roles ... on conflict do update` (docs/NEON-SETUP.md 5번 참고)
  - `audit_logs` 테이블 + `log_changes()` 트리거: customers/installations 의
    모든 입력/수정/삭제를 자동 기록 (누가/언제/변경 전·후 JSON). Data API 로는 조회만 가능
  - RLS 정책 분리: select 는 로그인 전원, insert/update/delete 는 `is_staff()` 만
- `src/lib/auth-state.ts`: 로그인 시 본인 역할 조회 (`userRole`), `canEdit` computed 추가 (mock 모드는 항상 편집 가능)
- `HomeView.vue` / `RevenueHistoryModal.vue`: user 역할이면 등록/수정/삭제 버튼과 초기 데이터 등록 배너 숨김
  (UI 는 편의용이고 실제 차단은 DB RLS 가 담당)
- `auth-state.ts` 후속 수정: user_roles 조회 실패 시 조용히 user 로 남지 않고 오류 토스트 표시
  (흔한 원인: Data API "Refresh schema cache" 미실행, schema.sql 미적용)

## 2026-07-10 — 로그인 버튼 실제 연동 + neon 모드 전환

- **문제**: 헤더의 로그인 버튼이 구현 전 자리표시자(안내 토스트만 표시)였고, `.env` 가 mock 모드라 로그인 게이트가 비활성 상태였음
- `src/lib/auth-state.ts` **신규**: AuthGate 와 HomeView 헤더가 공유하는 세션 상태 (`currentUser`, `refreshUser`, `logout`)
- `HomeView.vue`: 자리표시자 로그인 버튼 → 로그인 사용자명 + 로그아웃 버튼으로 교체 (neon 모드에서 로그인 시에만 표시, mock 모드에선 숨김)
- `AuthGate.vue`: 공유 상태 사용으로 변경, 우하단 플로팅 로그아웃 버튼 제거 (헤더로 이동)
- `i18n.ts`: `btn.login`/`toast.authNotReady` 제거, `btn.logout` 추가
- `.env`: **`VITE_DATA_MODE=neon` 으로 전환** — dev 서버 재시작 시 로그인 화면이 표시됨
- ⬜ 여전히 남은 선행 작업: Neon SQL Editor 에서 `db/schema.sql` 실행 (테이블 미생성 시 로그인 후 데이터 조회 오류 발생)

## 2026-07-10 — 불필요 파일 정리

- 삭제: `src/stores/mobilPress 2.ts` (i18n 적용 전 구버전 백업본 — 사용처 없음 확인),
  `.DS_Store` 2개, `tsconfig.*.tsbuildinfo` (빌드 캐시), `dist/` (빌드 산출물, `npm run build` 로 재생성),
  `.dockerignore` (Dockerfile 이 없어 불필요)
- `.gitignore` 에 `dist/` 추가
- **`.ts` 파일은 삭제 대상 아님**: 이 프로젝트는 Vue 3 + **TypeScript** 기반.
  `main.ts`(엔트리), `stores/`, `lib/`, `vite.config.ts`, `env.d.ts`, `tsconfig*.json` 모두 필수.
- 문서 파일은 이미 `docs/` 하위에 위치 (`README.md` 는 관례상 루트 유지 — GitHub/에디터가 프로젝트 첫 화면으로 표시)
- 정리 후 `npm run typecheck` / `npm run build` 통과 확인

## 2026-07-10 — Neon 연동 구현 (mock → Neon 전환 준비 완료)

### 배경

- Neon 콘솔 확인 결과 **Data API URL 형식이 변경**됨 (호스트에 `c-2.` 세그먼트 추가).
- **Neon Auth 가 Stack Auth 기반에서 Better Auth 기반으로 전면 개편**됨:
  - 예전: `Project ID` + `Publishable Client Key` 2개 키 + `@stackframe/js` SDK
  - 현재: **Auth URL 1개** + `@neondatabase/neon-js` 통합 SDK
  - 사용자 저장: `neon_auth.users_sync` 테이블 → `neon_auth` 스키마

### 변경 내용

| 파일 | 내용 |
|---|---|
| `src/lib/neon-auth.ts` | TODO 스텁 → 실제 구현. `createClient` 로 Auth+Data API 통합 클라이언트(`neon`) 생성. 로그인/회원가입/Google/로그아웃 헬퍼 export |
| `src/lib/neon-api.ts` | 수동 `fetch` + 토큰 첨부 코드 제거 → `neon.from()` 쿼리 빌더로 교체 (JWT 자동 첨부). 미로그인 시 401 응답 처리 |
| `src/components/AuthGate.vue` | **신규**. Neon 모드에서 미로그인 시 로그인/회원가입 화면 표시, 로그인 후 우하단에 로그아웃 버튼. mock/proxy 모드는 그대로 통과 |
| `src/App.vue` | `RouterView` 를 `AuthGate` 로 감쌈 |
| `src/lib/api.ts` | `dataMode` export 추가 (AuthGate 에서 모드 판별용) |
| `.env` | **신규**. 실제 발급된 `VITE_NEON_DATA_API_URL`, `VITE_NEON_AUTH_URL` 입력. `VITE_DATA_MODE=mock` 유지 |
| `.env.example` | `VITE_STACK_PROJECT_ID`/`VITE_STACK_PUBLISHABLE_CLIENT_KEY` → `VITE_NEON_AUTH_URL` 로 교체 |
| `docs/NEON-SETUP.md` | 새 Auth 방식/URL 형식으로 전면 갱신. 실제 발급 URL 명시 |
| `db/schema.sql` | 주석의 `users_sync` 표기를 `neon_auth` 스키마로 수정 |
| `package.json` | `@neondatabase/neon-js` 의존성 추가 |

### 주요사항 / 남은 작업

- ✅ `npm run typecheck`, `npm run build` 통과
- ✅ Auth 엔드포인트 응답 확인 (`…/auth/ok` → 200)
- ⬜ **테이블 미생성 상태** — Neon 콘솔 SQL Editor 에서 `db/schema.sql` 실행 필요
- ⬜ 테이블 생성 후 `.env` 의 `VITE_DATA_MODE=neon` 으로 전환
- ⬜ Google 로그인을 쓰려면 Neon 콘솔 Auth 탭에서 Google provider 활성화 필요
- ℹ️ mock 모드에서 입력한 데이터는 localStorage 에만 있음 — 전환 후 재등록 필요
