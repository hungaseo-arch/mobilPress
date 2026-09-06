# 기여 가이드 (CONTRIBUTING)

이 저장소에서 코드를 고치고 배포까지 가져가는 절차입니다. 구조 설명은 [ARCHITECTURE.md](ARCHITECTURE.md),
바뀐 내용의 기록은 [CHANGELOG.md](CHANGELOG.md) 에 있습니다.

## 1. 개발 환경

- Node 22 (CI 와 동일). `npm ci` 또는 `npm install`.
- `npm install` 의 `postinstall` 이 `scripts/build-fonts.mjs` 를 실행해 `public/fonts/` 를 만듭니다.
  이 폴더는 `.gitignore` 대상이며 `npm run dev` / `npm run build` 앞에서도 자동으로 다시 생성됩니다.
  폰트 굵기를 바꾸려면 스크립트의 `WEIGHTS` 만 고칩니다.
- `.env.example` 을 `.env` 로 복사합니다. `.env` 는 절대 커밋하지 않습니다.
  - 로컬 개발은 `VITE_DATA_MODE=mock` 이면 충분합니다(로그인 없음, localStorage).
  - 운영 DB 로 확인해야 할 때만 `neon` 으로 두고 Neon URL 두 개를 채웁니다([NEON-SETUP.md](NEON-SETUP.md)).
- `npm run dev` → http://localhost:5173/ . 프리뷰(`npm run preview`)는 `/mobilPress/` 경로로 열립니다.

## 2. 작업 흐름

1. `main` 에서 브랜치를 만듭니다. 큰 작업은 `perf/…`, `docs/…` 처럼 목적별 브랜치 → `main` 에 merge.
2. 고치는 파일 범위 안에서만 수정합니다. 저장소 전체 `prettier --write .` 같은 일괄 포맷은
   무관한 diff 를 만들므로 하지 않습니다(2026-08-19 결정). 새로 만든 파일은 Prettier 로 정리해 둡니다.
3. 커밋 전에 반드시 통과시킵니다.
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```
4. 커밋 메시지는 **한국어**, 첫 줄은 "무엇을 왜" 가 드러나게 씁니다. 작업지시서에 따른 항목은
   `[P1-2]` 처럼 우선순위 태그를 앞에 붙입니다. 본문에는 배경(왜 이렇게 했는지)을 남깁니다.
5. 사용자에게 보이는 변경, 정책 변경, 스키마 변경은 같은 커밋(또는 같은 PR)에서
   `docs/CHANGELOG.md` 맨 위에 `## YYYY-MM-DD — 제목` 항목을 추가합니다.

### 코드 규칙

- Vue 3 `<script setup lang="ts">`, 상태는 Pinia 스토어(`src/stores/mobilPress.ts`) 하나에 둡니다.
- Neon SDK 는 **동적 import 로만** 불러옵니다(`@/lib/neon-auth`, `@/lib/neon-api`). 정적으로 import 하면
  mock 번들에 SDK 300 KB 가 딸려 들어갑니다. 설정 여부 판정은 `neon-config.ts` 만 참조합니다.
- 탭이나 모달을 열 때만 필요한 컴포넌트는 `defineAsyncComponent` 로 lazy 로드합니다(HomeView 참고).
- 권한 판단은 `auth-state.ts` 의 `canEdit / canDelete / isAdmin / reportPerms` 만 씁니다.
  화면의 권한 표시는 UX 일 뿐이고 실제 보호는 DB 의 RLS 가 합니다.
- 문자열은 `src/lib/i18n.ts` 에 `id`/`ko` 쌍으로 넣고 `t('key')` 로 씁니다. 인도네시아어가 정본입니다.
- 색·글자체는 `src/assets/main.css` 의 토큰(AsuraDB 디자인 가이드)만 사용하고, 원격 `@import` 나
  외부 폰트 `<link>` 를 추가하지 않습니다(렌더 차단 — CHANGELOG 2026-09-06).

## 3. DB 마이그레이션

스키마 전체는 `db/schema.sql`, 변경분은 `sql/YYYY-MM-DD_설명.sql` 입니다.

1. `sql/` 에 날짜 파일을 새로 만들고, `db/schema.sql` 도 같은 내용으로 갱신합니다
   (schema.sql 은 새 환경을 처음부터 만들 때 쓰는 정본).
2. Neon 콘솔 → SQL Editor 에서 실행합니다.
3. **Data API → "Refresh schema cache"** 를 누릅니다. 이걸 빼먹으면 새 컬럼/테이블이 API 에서
   보이지 않아 `권한(user_roles) 조회 실패` 같은 오류로 나타납니다.
4. CHANGELOG 항목에 `⚠️ SQL 마이그레이션 필요: sql/…` 줄을 넣습니다.
5. 새 테이블에는 RLS 정책과(필요하면) 감사 로그 트리거를 같이 붙입니다 — 기존 테이블 정의를 복사해 맞춥니다.

권한 부여/회수 SQL 은 [ROLES.md](ROLES.md) 를 따릅니다.

## 4. 배포 규칙

- `main` 에 push 하면 `.github/workflows/deploy.yml` 이 `npm run predeploy` 로 빌드해
  `gh-pages` 브랜치에 올립니다. 로컬 `npm run deploy` 도 같은 결과를 냅니다.
- 빌드 env 는 **리포지토리 secrets** 에서만 옵니다. 다음 다섯 개가 모두 등록돼 있어야 합니다.

  | secret | 비어 있으면 |
  |---|---|
  | `VITE_DATA_MODE` | mock 모드로 배포됨 |
  | `VITE_NEON_DATA_API_URL`, `VITE_NEON_AUTH_URL` | 로그인 게이트가 꺼짐 |
  | `VITE_DRIVE_UPLOAD_URL`, `VITE_DRIVE_UPLOAD_TOKEN` | 업로드 버튼이 사라짐 |

- **secrets 를 등록하기 전에는 `main` 에 push 하지 않습니다.** 기능이 빠진 빌드가 그대로 운영에 올라갑니다.
  로컬 `.env` 값과 secrets 가 같은지 배포 후 https://hungaseo-arch.github.io/mobilPress/ 에서
  로그인·업로드 버튼을 확인합니다.
- GitHub Pages 는 `cache-control: max-age=600` 이라 배포 후 최대 10분간 이전 HTML 이 보일 수 있습니다.
- Drive 업로드 백엔드(`apps-script/Code.gs`)를 바꾸면 Apps Script 에서 **새 배포**를 만들어야
  `/exec` URL 에 반영됩니다. `SHARED_TOKEN` 을 바꾸면 secrets 의 `VITE_DRIVE_UPLOAD_TOKEN` 도 함께 바꿉니다.

## 5. 성능·접근성 측정

번들 크기와 Lighthouse 점수는 CHANGELOG 에 날짜별로 기록합니다(2026-08-19, 2026-09-06 항목 참고).

```bash
npm run build                                   # 청크별 raw/gzip 크기 출력
npx vite preview --port 4175 --strictPort       # 4173 은 다른 앱이 쓰는 경우가 있어 포트를 고정
npx lighthouse http://localhost:4175/mobilPress/ \
  --output=json --output-path=./lh.json \
  --chrome-flags="--headless=new" \
  --only-categories=performance,accessibility,best-practices,seo --quiet
```

- 로컬 `.env` 가 `neon` 이면 로그인 화면이 측정됩니다. 데이터 화면을 재려면
  `VITE_DATA_MODE=mock npx vite build --outDir dist-mock` 후 `--outDir dist-mock` 으로 프리뷰합니다
  (`dist-mock/` 은 측정 후 지웁니다).
- 초기 청크에 무엇이 들어갔는지 볼 때는 `npx vite-bundle-visualizer` 또는 `dist/index.html` 의
  `modulepreload` 목록을 확인합니다.

## 6. 의존성 업데이트

- 마이너/패치(`npm update`)는 위 3단계 검증만 통과하면 함께 올립니다.
- 메이저 업그레이드는 **되돌리기 쉬운 별도 커밋**으로, 한 번에 몇 개만 올리고
  로그인 → 등록 → 업로드 → 토스트까지 손으로 확인합니다.
  예: vue-sonner 2.x 는 스타일을 자동 주입하지 않아 `App.vue` 에서 `vue-sonner/style.css` 를 import 해야 합니다.
- Vite 8 / Pinia 4 / Vue Router 5 / TypeScript 7 / ESLint 10 은 2026-09-06 기준 아직 올리지 않았습니다.
  올릴 때는 `vite.config.ts` 의 플러그인 훅과 `eslint.config.js` 를 함께 점검합니다.
