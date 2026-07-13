# 변경 기록 (CHANGELOG)

주요 코드 변경 내용과 주요사항을 기록합니다. 최신 항목이 위에 옵니다.

## 2026-07-13 — 수령액 자동 계산 + 셀 줄바꿈 미세 조정

- 장착 폼 수령액 자동 계산: `서비스 비용 × 할인율(%) + 출장비`
  - 서비스비용/할인율/출장비 변경 시 자동 갱신. 직접 입력하면 수동 모드로 전환(override),
    '자동 계산' 링크로 되돌리기. 기존 값이 공식과 다르면(수동 조정분) 수동 모드로 로드
  - i18n `form.autoCalc`/`form.autoCalcOn` 추가
- 운영자료 출동비 표: 'Libur Nasional' 사이에 비줄바꿈 공백(nbsp) → 한 줄 유지, '·' 구분점 추가

## 2026-07-11 — 로그인 화면 인도네시아어 지원

- `AuthGate.vue` / `ResetPasswordView.vue` 의 하드코딩 한국어를 i18n(id/ko)으로 전환
- 로그인 카드 우상단에 언어 전환(🇮🇩/🇰🇷) 추가 — 기본값 인도네시아어
- i18n 에 auth.*/reset.* 키 추가 (부제·입력·버튼·토스트 전부 2개 국어)

## 2026-07-11 — 운영자료 표 글자 겹침 해결 + 탭 크기 통일

- 글자 겹침 수정: '시장 가격/Harga Pasar'(가격 목록형)을 금액 열 처리에서 제외 →
  줄바꿈금지(nowrap) 해제. 긴 텍스트 열(인사이트·가격목록)이 있는 표는 균등폭 강제 해제
  (`isLongTextHeader`) — 좁아진 칸으로 넘쳐 겹치던 문제 해결
- 셀 내 '|' 는 줄바꿈으로 표시(`cellLines`) — 예: 'Rim 8-9: 150K | Rim 10-12: 250K' 를 줄마다 분리
- 탭 크기 통일: 운영자료 탭·실적 분석 서브탭·검색행 버튼 모두 py-2 text-sm(rounded-full)

## 2026-07-11 — 페이지네이션 + 실적 분석 서브탭 + 셀 줄바꿈 방지

- 페이지네이션: 장착 실적(10)/고객별 매출(10)/월별 매출(12)에 적용
  - `src/lib/pagination.ts`(`usePagination`, 목록 축소 시 페이지 자동 보정),
    `src/components/TablePagination.vue`(이전/다음 + 번호 + "N–M / 합계")
  - 합계(tfoot)는 전체 기준 유지, 순위는 페이지 오프셋 반영
- 실적 분석: 고객별/월별 매출을 **서브탭**으로 분리, 상단 검색 행에 서브탭 배치(한 행 정리)
- 운영자료: 괄호 묶음(예: `(18:00–06:00)`)은 셀 내부 강제 줄바꿈 방지(`cellParts`)

## 2026-07-11 — 코드 최적화 (미사용 코드 정리)

- 전수 감사 결과 코드베이스는 대체로 정돈된 상태 확인:
  미사용 import/변수 0 (noUnusedLocals 활성), 스토어 반환 멤버 전원 사용,
  매핑/요약 로직 중복 없음(api-helpers.ts 공유), i18n 키 103개 중 미사용 1개
- 삭제: 미사용 i18n 키 `th.status`
- `auth-state.ts`: `userRole`/`Role` 을 모듈 내부로 캡슐화(export 제거) —
  외부는 canEdit/canDelete 만 사용 (상태 직접 변경 방지)

## 2026-07-11 — 작업자 운영팀 선택 + 운영자료 표 레이아웃 정리

- 작업자 입력: 운영팀(`operationTeam` = Firman/Harun/Arun) 체크박스로 다중 선택
  (`src/lib/format.ts` 에 명단 상수, 운영자료 팀 명단과 동기 유지). 명단 외 기존 값도 보존
- 운영자료 표: 모든 열 균등 폭(`eqWidthStyle`, 셀 간격 동일) — 역할 컬럼 표만 예외(한 줄 유지)
- 서비스 요금 탭: 넓은 화면에서 표를 한 행에 2개씩 배치(`pairSections`, lg:grid-cols-2)

## 2026-07-11 — 장착 정보에 작업자·입력자 추가

- `installations` 에 `worker`(작업자), `entered_by`(입력자) 컬럼 추가
  (**SQL Editor 에서 schema.sql 재실행 + Data API "Refresh schema cache" 필요**)
- 작업자: 장착 등록/수정 폼에서 직접 입력, 목록의 작업일 칸에 표시
- 입력자: 신규 등록 시 로그인 사용자 이름으로 **자동 기록** (수정해도 원본 유지),
  수정 폼에서 읽기 전용으로 표시
- i18n: form.worker(Petugas), form.enteredBy(Diinput oleh)

## 2026-07-11 — 비밀번호 재설정 기능 + 권한 관리 SQL 문서

- `docs/ROLES.md` **신규**: 계정별 권한 부여/회수/현황 조회 SQL 모음
  (콘솔 "Make admin" 은 앱 권한과 무관하다는 주의 포함)
- 비밀번호 재설정 (이메일 링크 방식):
  - `neon-auth.ts`: `requestPasswordReset` / `resetPassword` 헬퍼 추가
  - `AuthGate.vue`: 로그인 화면에 "비밀번호를 잊으셨나요?" 모드 추가 (이메일 입력 → 링크 발송)
  - `ResetPasswordView.vue` **신규** (`/reset-password` 라우트): 링크의 token 으로 새 비밀번호 설정,
    만료/무효 토큰 안내 처리. AuthGate 는 이 라우트를 로그인 없이 통과시킴
- ⚠️ 재설정 메일이 오지 않으면 스팸함 확인. 발신은 Neon Auth 관리형 메일

## 2026-07-11 — GitHub Pages 배포 설정 (npm run deploy)

- `gh-pages` 패키지 추가, `npm run deploy` 스크립트 구성 (빌드 → 404.html 복사 → gh-pages 브랜치 푸시)
- `vite.config.ts`: production `base: '/mobilPress/'` (GitHub Pages 하위 경로 대응)
- `router/index.ts`: `createWebHistory(import.meta.env.BASE_URL)` 로 base 경로 반영
- 배포 URL: https://hungaseo-arch.github.io/mobilPress/
- ⚠️ 주의: `.env` 의 Neon URL 이 빌드 결과물에 포함됨 (VITE_ 변수는 원래 클라이언트 노출용).
  보안은 Neon Auth 로그인 + RLS 가 담당하므로 URL 노출 자체는 설계상 문제 없음
- ⬜ 배포 사이트에서 로그인이 안 되면 Neon 콘솔 Auth → Configuration 의
  Trusted origins 에 `https://hungaseo-arch.github.io` 추가 필요

## 2026-07-11 — 역할 3단계로 세분화 (admin / staff / user)

- **요구사항**: staff 는 등록·수정만, 삭제는 admin 만
- `db/schema.sql` (**SQL Editor 재실행 필요**):
  - `user_roles` 의 role 허용값에 `admin` 추가 (기존 테이블도 constraint 교체로 반영)
  - `is_staff()` = staff 이상(입력·수정), `is_admin()` = admin(삭제) 함수 분리
  - delete RLS 정책을 `is_admin()` 으로 변경
- `auth-state.ts`: `Role` 에 admin 추가, `canEdit`(staff 이상) / `canDelete`(admin) 분리
- `HomeView.vue`: 삭제(휴지통) 버튼은 admin 에게만 표시
- 기존 staff 계정은 그대로 등록·수정 가능. 삭제가 필요한 계정은 admin 으로 승격:
  `insert into user_roles ... values ('<USER_ID>', 'admin') on conflict do update ...`

## 2026-07-11 — 초기 장착 실적 DB 등록용 seed.sql 추가

- `db/seed.sql` **신규**: 보고서 기반 초기 데이터(고객 2건 + 장착 실적 3건)를 SQL Editor 에서
  직접 등록. `where not exists` 로 중복 방지 — 여러 번 실행해도 안전
- 앱의 "보고서 기반 초기 데이터 등록" 버튼(src/data/seed.ts)과 동일 데이터. 수정 시 양쪽 동기 유지
- GitHub 등록: https://github.com/hungaseo-arch/mobilPress (main, .env 제외)

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
