# Neon + Neon Auth 설정 가이드

이 앱은 현재 **mock 모드**(브라우저 localStorage)로 동작합니다.
Neon 에 가입하고 아래 절차를 완료하면 실제 Postgres DB + 로그인 기반 권한관리로 전환됩니다.

## 아키텍처

```
브라우저 (Vue SPA)
 ├─ Neon Auth (Better Auth 기반) ──→ 로그인 / JWT 발급
 └─ Neon Data API (PostgREST) ──→ customers / installations 테이블
                                    └─ RLS 정책이 JWT 로 권한 검사
```

- 별도 백엔드 서버 없이 브라우저에서 바로 DB 를 사용합니다.
- 보안은 DB 의 **RLS(Row Level Security)** 가 담당합니다 — 로그인하지 않으면 어떤 데이터도 읽고 쓸 수 없습니다.

## 1. Neon 가입 (무료)

1. https://console.neon.tech 접속
2. **Sign Up** → Google / GitHub / 이메일 중 선택 (Google 계정 hunga.seo@gmail.com 으로 바로 가입 가능)
3. 무료 플랜(Free)으로 시작 — 신용카드 불필요, DB 0.5GB / 월 190 컴퓨트 시간 제공

## 2. 프로젝트 생성

1. 콘솔에서 **New Project**
2. Project name: `mobilpress`
3. Region: **AWS Asia Pacific (Singapore)** 권장 — 인도네시아/한국에서 가장 가까움
4. Postgres 버전: 기본값(17) 그대로 → **Create**

## 3. Neon Auth 활성화

> ⚠️ Neon Auth 가 Stack Auth 기반에서 **Better Auth 기반으로 개편**되었습니다.
> 예전 문서에 나오는 `Project ID` / `Publishable Client Key` 두 개의 키는 더 이상 사용하지 않고,
> **Auth URL 하나**만 사용합니다.

1. 프로젝트 대시보드 → 왼쪽 메뉴 **Auth** 탭 (이미 활성화된 경우 Data API 화면에 "Neon Auth is ready" 로 표시됨)
2. **Configuration** 에서 **Auth URL** 을 복사
   (예: `https://ep-xxx.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth`)
   → `.env` 의 `VITE_NEON_AUTH_URL` 에 입력
   - mobilPress 프로젝트에 발급된 실제 URL:
     `https://ep-damp-night-ao9k667h.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth`
3. **Users** 탭에서 팀원 계정을 직접 추가하거나, 이메일/Google 로그인 허용 설정
   - 사용자 데이터는 DB 의 `neon_auth` 스키마에 저장되어 SQL 로 조회할 수 있고 RLS 정책과 연동됩니다.

## 4. Data API 활성화

1. 왼쪽 메뉴 **Data API** 탭 → **Enable Data API**
2. 발급된 **API URL** (예: `https://ep-xxx.apirest.c-2.ap-southeast-1.aws.neon.tech/neondb/rest/v1`) 을
   `.env` 의 `VITE_NEON_DATA_API_URL` 에 입력
   - mobilPress 프로젝트에 발급된 실제 URL:
     `https://ep-damp-night-ao9k667h.apirest.c-2.ap-southeast-1.aws.neon.tech/neondb/rest/v1`
3. 스키마를 변경한 뒤 API 에 바로 반영하려면 같은 화면의 **Refresh schema cache** 버튼을 누르세요.

## 5. 테이블 생성

1. 왼쪽 메뉴 **SQL Editor** 열기
2. 이 저장소의 [`db/schema.sql`](../db/schema.sql) 내용 전체를 붙여넣고 **Run** (여러 번 실행해도 안전)
   - customers / installations / user_roles / audit_logs 테이블 + RLS 정책이 생성됩니다.
   - 권한 정책: **조회는 로그인 사용자 전원, 입력·수정·삭제는 staff 역할만**
     - 신규 가입자는 기본 `user`(조회 전용)입니다. staff 승격은 SQL Editor 에서:
       ```sql
       insert into public.user_roles (user_id, role) values ('<USER_ID>', 'staff')
         on conflict (user_id) do update set role = excluded.role;
       ```
       (`<USER_ID>` 는 콘솔 Auth → Users 에서 해당 사용자의 ID 복사)
   - 감사 로그: 모든 입력/수정/삭제가 `audit_logs` 테이블에 자동 기록됩니다
     (누가·언제·무엇을 — 변경 전/후 데이터 포함).

## 6. 앱 연동

> ✅ 아래 항목은 모두 구현 완료 상태입니다 (2026-07-10).
> `.env` 의 `VITE_DATA_MODE=neon` 으로 바꾸기만 하면 됩니다.

- SDK: `@neondatabase/neon-js` 설치됨 (Auth + Data API 통합 클라이언트)
- [`src/lib/neon-auth.ts`](../src/lib/neon-auth.ts): 통합 클라이언트 생성 + 로그인/회원가입/Google/로그아웃 헬퍼
- [`src/lib/neon-api.ts`](../src/lib/neon-api.ts): 수동 fetch 대신 `neon.from()` 쿼리 빌더 사용 (JWT 자동 첨부)
- [`src/components/AuthGate.vue`](../src/components/AuthGate.vue): Neon 모드에서 미로그인 시 로그인 화면 표시

`VITE_DATA_MODE=neon` 으로 바꾸고 dev 서버를 재시작하면 mock 대신 Neon 으로 동작합니다.
(단, 5번의 테이블 생성이 선행되어야 데이터 조회가 가능합니다.)
mock 모드에 입력한 데이터는 localStorage 에만 있으므로, 필요하면 앱의
"보고서 기반 초기 데이터 등록" 버튼으로 Neon 에 다시 등록하세요.

## 권한관리 개요

| 구분 | 처리 위치 | 내용 |
|---|---|---|
| 로그인 | Neon Auth (Better Auth 기반) | 이메일 / Google 로그인, 세션·토큰 관리 |
| API 인증 | Data API | `Authorization: Bearer <JWT>` 헤더 검증 |
| 데이터 권한 | Postgres RLS | 조회: 로그인 전원 / 쓰기: `user_roles` 의 staff 만, 익명 차단 |
| 역할 관리 | `public.user_roles` | staff(입력·수정) / user(조회, 기본값). SQL Editor 로 승격 |
| 수정 이력 | `public.audit_logs` | 입력/수정/삭제를 트리거가 자동 기록 (변경 전/후 JSON) |
| 사용자 목록 | `neon_auth` 스키마 | Auth 사용자가 DB 스키마에 저장, SQL 조회 가능 |

## 비용

- **Free 플랜으로 충분**: 이 앱의 데이터 규모(고객/작업 기록 수백 건)는 무료 한도의 1% 미만입니다.
- 유료 전환이 필요해지는 시점: 팀 확대로 DB 0.5GB 초과 또는 상시 트래픽 발생 시 (Launch 플랜 $19/월).
