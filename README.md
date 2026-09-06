# MobilPress — Mobil Press 운영관리

PT Ascendo Internasional 의 이동식 타이어 프레스(Mobil Press) 사업 운영 웹앱입니다.
고객·타이어 장착 실적·매출 분석·예산 집행·운영자료·접속/변경 기록·회원 관리를 한 화면에서 다룹니다.
UI 는 인도네시아어가 기본이고 한국어를 함께 지원합니다.

- 배포 주소: https://hungaseo-arch.github.io/mobilPress/
- 스택: **Vue 3** (`<script setup>`) · **Vite 6** · **TypeScript** · **Tailwind CSS v4** · **Pinia** · **Vue Router 4**
- 백엔드: **Neon**(Postgres Data API + Neon Auth) — 별도 서버 없이 브라우저에서 직접 호출
- 파일 저장: **Google Drive**(Apps Script 웹앱) — 작업보고서 PDF·주행거리계 사진
- 호스팅: **GitHub Pages** — `main` push 시 GitHub Actions 가 자동 배포

## 빠른 시작

```bash
npm install        # postinstall 에서 public/fonts/ (Pretendard) 를 생성합니다
npm run dev        # http://localhost:5173/
```

`.env` 가 없으면 **mock 모드**로 뜹니다. 데이터는 브라우저 localStorage 에 저장되고 로그인은 없습니다.
표가 비어 있으면 상단의 **초기 데이터 등록** 버튼으로 보고서 기반 시드를 채울 수 있습니다.
(초기화: 콘솔에서 `localStorage.removeItem('mobilpress-mock-db')` 후 새로고침)

## 데이터 소스 모드

`.env.example` 을 `.env` 로 복사해 `VITE_DATA_MODE` 를 고릅니다. 자세한 흐름은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

| 모드 | 저장소 | 로그인 | 용도 |
|---|---|---|---|
| `mock` (기본) | 브라우저 localStorage | 없음(모든 권한) | 로컬 개발, 데모 |
| `neon` | Neon Postgres (Data API) | Neon Auth 이메일 로그인 | **운영** |
| `proxy` | `/api` 를 `VITE_API_PROXY_TARGET` 으로 프록시 | 없음 | 자체 백엔드 실험 |

### 환경 변수

| 변수 | 필요 모드 | 설명 |
|---|---|---|
| `VITE_DATA_MODE` | 전체 | `mock` / `neon` / `proxy` |
| `VITE_NEON_DATA_API_URL` | neon | Neon 콘솔 → Data API 엔드포인트 |
| `VITE_NEON_AUTH_URL` | neon | Neon 콘솔 → Auth → Configuration 의 Auth URL |
| `VITE_DRIVE_UPLOAD_URL` | neon(선택) | Apps Script 웹앱 `/exec` URL. 없으면 업로드 버튼이 숨겨집니다 |
| `VITE_DRIVE_UPLOAD_TOKEN` | neon(선택) | Apps Script 와 공유하는 단순 토큰 |
| `VITE_API_PROXY_TARGET` | proxy | 예: `http://localhost:3100` |

Neon 프로젝트 생성부터 테이블 적용까지는 [docs/NEON-SETUP.md](docs/NEON-SETUP.md),
Drive 업로드 백엔드는 [apps-script/Code.gs](apps-script/Code.gs) 상단 주석을 따릅니다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (`predev` 가 폰트 생성) |
| `npm run build` | `vue-tsc` 타입체크 + `vite build` (`prebuild` 가 폰트 생성) |
| `npm run build:only` | 타입체크 없이 빌드 |
| `npm run preview` | 빌드 결과 미리보기 (`/mobilPress/` 경로) |
| `npm run typecheck` | 타입체크만 |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run fonts` | `public/fonts/` 재생성 (`scripts/build-fonts.mjs`) |
| `npm run deploy` | 로컬에서 `gh-pages` 브랜치로 수동 배포 (평소에는 CI 가 대신함) |

## 권한

역할은 DB 의 `user_roles` 테이블로 정합니다. 행이 없으면 조회 전용 **user** 입니다.

| 역할 | 조회 | 등록·수정 | 삭제 | 접속기록·변경이력·회원관리 |
|---|---|---|---|---|
| user | ✅ | – | – | – |
| staff | ✅ | ✅ | – | – |
| admin | ✅ | ✅ | ✅ | ✅ |

부여·회수 SQL 과 회원관리 탭 사용법은 [docs/ROLES.md](docs/ROLES.md).

## 배포

`main` 에 push 하면 `.github/workflows/deploy.yml` 이 빌드해 `gh-pages` 브랜치에 올립니다.
빌드 env 는 리포지토리 **Settings → Secrets and variables → Actions** 에서 읽습니다.

필수 secrets: `VITE_DATA_MODE`, `VITE_NEON_DATA_API_URL`, `VITE_NEON_AUTH_URL`,
`VITE_DRIVE_UPLOAD_URL`, `VITE_DRIVE_UPLOAD_TOKEN`.
하나라도 비어 있으면 그 기능이 빠진 채(예: 업로드 버튼 없음) 배포되므로 push 전에 확인합니다 —
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) 의 "배포 규칙".

## 폴더 구조

```
index.html               폰트 <link>, 메타 태그 (폰트는 public/fonts/ 자체 호스팅)
vite.config.ts           base(/mobilPress/), manualChunks, neon 청크 modulepreload 플러그인
scripts/build-fonts.mjs  node_modules/pretendard → public/fonts/ (굵기 400/500/600/700)
src/
  main.ts                Pinia·Router 등록
  App.vue                Toaster + AuthGate + RouterView
  assets/main.css        Tailwind v4 + 디자인 토큰(AsuraDB 가이드)
  router/index.ts        / , /reset-password , 404
  stores/mobilPress.ts   데이터·검색·CRUD·시드 (Pinia)
  lib/
    api.ts               apiFetch — 모드별로 neon-api / mock-api / fetch 분기
    neon-api.ts          '/mobil-press/*' 경로 → Neon Data API 쿼리 변환
    neon-auth.ts         Neon Auth SDK 래퍼 (동적 import 전용)
    neon-config.ts       Neon 설정 여부 (SDK 를 import 하지 않음)
    auth-state.ts        currentUser · 역할 · canEdit/canDelete/isAdmin · 보고서 권한표
    idle-logout.ts       30분 무활동 자동 로그아웃
    drive-report.ts      Drive 업로드/삭제 (Apps Script)
    mock-api.ts          localStorage mock
    i18n.ts              id/ko 문자열
    format.ts, pagination.ts, api-helpers.ts, types.ts
  data/
    seed.ts              폼 기본값 + SEED_COUNTS
    seed-report.ts       시드 행 데이터 (버튼을 눌렀을 때만 로드)
    operations.ts, budget-ko.ts   운영자료·예산 참고 텍스트
  components/            모달·표·참고자료 (대부분 탭/모달 열 때 lazy 로드)
  pages/                 HomeView(대시보드), ResetPasswordView, NotFoundView
db/schema.sql            테이블·RLS·감사 로그 트리거 (전체 스키마)
sql/                     날짜별 마이그레이션 (적용 후 Data API "Refresh schema cache")
apps-script/Code.gs      Drive 업로드 백엔드
docs/                    ARCHITECTURE · CONTRIBUTING · CHANGELOG · NEON-SETUP · ROLES
```

## 문서

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 데이터 흐름, 인증·권한, 번들 구성, 배포 파이프라인
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) — 개발 환경, 커밋 규칙, 마이그레이션·배포 절차, 성능 측정법
- [docs/CHANGELOG.md](docs/CHANGELOG.md) — 변경 기록 (SQL 마이그레이션 필요 여부 포함)
- [docs/NEON-SETUP.md](docs/NEON-SETUP.md) — Neon 프로젝트·Auth·Data API 설정
- [docs/ROLES.md](docs/ROLES.md) — 권한 부여/회수 SQL, 게스트 계정
