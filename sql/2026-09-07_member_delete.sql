-- 회원관리 탭(admin 전용) — 계정 삭제 기능 마이그레이션.
--   public.delete_member(target_user_id text) RPC 를 추가한다.
--
-- 계정 원본은 Neon Auth 가 관리하는 neon_auth."user" 에 있고 Data API(PostgREST)는
-- public 스키마만 노출하므로, 앱에서 직접 delete 를 날릴 수 없다. security definer
-- 함수 하나를 public 에 두고 그 안에서 권한을 재검증한 뒤 지운다.
--
-- ⚠️ 본인(admin) 자신의 계정은 함수가 막는다 — 마지막 admin 이 스스로 사라져
--    아무도 회원관리를 할 수 없게 되는 사고를 방지하기 위함(역할 변경과 같은 규칙).
-- ⚠️ 접속 기록(access_logs)·감사 로그(audit_logs)는 남긴다 — 계정이 사라져도
--    "누가 언제 무엇을 했는지"는 보존되어야 하므로.

create or replace function public.delete_member(target_user_id text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_uuid  uuid;
  v_email text;
  v_name  text;
begin
  if not public.is_admin() then
    raise exception '관리자만 계정을 삭제할 수 있습니다.' using errcode = '42501';
  end if;

  if target_user_id = auth.user_id() then
    raise exception '본인 계정은 삭제할 수 없습니다.' using errcode = '42501';
  end if;

  -- user_roles/access_logs 의 user_id 는 text, neon_auth."user".id 는 uuid 라 캐스팅한다.
  begin
    v_uuid := target_user_id::uuid;
  exception when invalid_text_representation then
    raise exception '잘못된 계정 식별자입니다.' using errcode = '22P02';
  end;

  select email, name into v_email, v_name from neon_auth."user" where id = v_uuid;
  if not found then
    raise exception '계정을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  -- 삭제 사실을 감사 로그에 남긴다 (계정 행 자체는 곧 사라지므로 스냅샷을 함께 저장).
  insert into public.audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
  values ('user_accounts', v_uuid, 'delete', coalesce(auth.user_id(), 'console'),
          jsonb_build_object('user_id', target_user_id, 'email', v_email, 'name', v_name), null);

  delete from public.user_roles where user_id = target_user_id;

  -- Better Auth 부속 테이블 — FK 가 cascade 라는 보장이 없어 먼저 지운다.
  -- (session 삭제는 로그아웃 트리거를 태워 access_logs 에 세션 종료 기록을 남긴다 — 의도된 동작.)
  if to_regclass('neon_auth.session') is not null then
    execute 'delete from neon_auth."session" where "userId" = $1' using v_uuid;
  end if;
  if to_regclass('neon_auth.account') is not null then
    execute 'delete from neon_auth."account" where "userId" = $1' using v_uuid;
  end if;

  delete from neon_auth."user" where id = v_uuid;
end $$;

-- 실행 권한은 로그인 사용자에게만 — 실제 허용 여부는 함수 안의 is_admin() 이 판단한다.
revoke all on function public.delete_member(text) from public;
grant execute on function public.delete_member(text) to authenticated;

-- ⚠️ 적용 후 Neon 콘솔 → Data API → "Refresh schema cache" 를 실행해야
--    POST /rpc/delete_member 가 노출된다.
