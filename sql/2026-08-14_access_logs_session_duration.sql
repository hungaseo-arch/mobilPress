-- 접속 기록에 총 체류시간(로그인~로그아웃)을 기록하기 위한 마이그레이션.
-- neon_auth."session" 행은 로그아웃/만료 시 삭제되므로, 기존 INSERT 트리거(로그인)에 더해
-- AFTER DELETE 트리거(로그아웃)를 추가하고, 둘을 짝지을 session_id 를 access_logs 에 둔다.
-- neon_auth."session" 의 PK 컬럼명이 불확실하므로, 항상 존재가 보장되는
-- userId + createdAt 조합으로 세션마다 고유한 session_id 를 만든다.

alter table public.access_logs
  add column if not exists session_id text not null default '';

create index if not exists access_logs_session_idx on public.access_logs (session_id);

-- 기존 log_login() 을 session_id 를 채우도록 갱신.
create or replace function public.log_login()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text;
  v_name  text;
begin
  select email, name into v_email, v_name from neon_auth."user" where id = new."userId";
  insert into public.access_logs (user_id, email, user_name, event, ip_address, user_agent, occurred_at, session_id)
  values (new."userId", coalesce(v_email, ''), coalesce(v_name, ''), 'login',
          coalesce(new."ipAddress", ''), coalesce(new."userAgent", ''),
          coalesce(new."createdAt", now()), new."userId" || ':' || new."createdAt"::text);
  return new;
end $$;

-- 로그아웃(세션 종료) 기록.
create or replace function public.log_logout()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_email text;
  v_name  text;
begin
  select email, name into v_email, v_name from neon_auth."user" where id = old."userId";
  insert into public.access_logs (user_id, email, user_name, event, ip_address, user_agent, occurred_at, session_id)
  values (old."userId", coalesce(v_email, ''), coalesce(v_name, ''), 'logout',
          coalesce(old."ipAddress", ''), coalesce(old."userAgent", ''),
          now(), old."userId" || ':' || old."createdAt"::text);
  return old;
end $$;

drop trigger if exists session_access_logout on neon_auth."session";
create trigger session_access_logout
  after delete on neon_auth."session"
  for each row execute function public.log_logout();
