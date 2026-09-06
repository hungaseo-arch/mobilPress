-- 회원관리 탭(admin 전용) 마이그레이션.
--   1) public.user_accounts 뷰 — 가입 계정 + 역할 + 최근 로그인. admin 에게만 행이 보인다.
--   2) user_roles 를 앱(Data API)에서 admin 이 직접 수정할 수 있도록 RLS 정책 추가.
-- 지금까지 권한 변경은 콘솔 SQL Editor 전용이었다(docs/ROLES.md). 이 마이그레이션 이후
-- 앱의 회원관리 탭에서도 같은 일을 할 수 있으며, SQL 방식도 그대로 동작한다.
--
-- ⚠️ 본인(admin) 자신의 역할은 정책으로 막는다 — 마지막 admin 이 스스로 권한을 잃어
--    아무도 권한을 되돌릴 수 없게 되는 사고를 방지하기 위함. 필요하면 SQL Editor 로 변경.

-- ─────────────────────────────────────────────
-- 1. 계정 목록 뷰 (admin 전용)
--    뷰는 소유자 권한으로 동작하므로 user_roles 의 RLS 와 무관하게 전체를 읽는다.
--    대신 where 절의 is_admin() 이 admin 이 아닌 요청에는 0행을 돌려준다.
-- ─────────────────────────────────────────────
-- neon_auth."user".id 는 uuid, user_roles/access_logs 의 user_id 는 text(auth.user_id() 반환형)
-- 이므로 조인·비교 전에 u.id 를 text 로 캐스팅한다. 뷰가 돌려주는 user_id 도 text 로 통일.
-- (컬럼 타입이 바뀌면 create or replace 가 실패하므로 먼저 drop 한다 — 재실행 안전용.)
drop view if exists public.user_accounts;
create view public.user_accounts as
  select
    u.id::text               as user_id,
    u.email,
    u.name,
    coalesce(r.role, 'user') as role,
    u."createdAt"            as created_at,
    (select max(l.occurred_at)
       from public.access_logs l
      where l.user_id = u.id::text and l.event = 'login') as last_login_at
  from neon_auth."user" u
  left join public.user_roles r on r.user_id = u.id::text
  where public.is_admin();

grant select on public.user_accounts to authenticated;

-- ─────────────────────────────────────────────
-- 2. user_roles 쓰기 정책 (admin, 본인 제외)
--    기존 user_roles_select_own(본인 행 조회)은 그대로 두고 admin 정책을 더한다.
--    (같은 명령에 정책이 여러 개면 OR 로 결합된다.)
-- ─────────────────────────────────────────────
drop policy if exists user_roles_select_admin on public.user_roles;
create policy user_roles_select_admin on public.user_roles
  for select to authenticated using (public.is_admin());

drop policy if exists user_roles_insert_admin on public.user_roles;
create policy user_roles_insert_admin on public.user_roles
  for insert to authenticated
  with check (public.is_admin() and user_id <> auth.user_id());

drop policy if exists user_roles_update_admin on public.user_roles;
create policy user_roles_update_admin on public.user_roles
  for update to authenticated
  using (public.is_admin() and user_id <> auth.user_id())
  with check (public.is_admin() and user_id <> auth.user_id());

grant insert, update on public.user_roles to authenticated;
