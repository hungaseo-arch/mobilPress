-- MobilPress DB 스키마 (Neon Postgres)
-- Neon 콘솔 SQL Editor 또는 psql 로 실행하세요. (여러 번 실행해도 안전)
-- 전제: Neon Auth 활성화 (사용자는 neon_auth 스키마에 저장됨),
--       Data API 활성화 (RLS 기반 접근).
--
-- 권한 모델:
--   admin — 데이터 입력/수정/삭제 + 조회
--   staff — 데이터 입력/수정 + 조회 (삭제 불가)
--   user  — 데이터 조회만 (신규 가입자 기본값)
-- 모든 입력/수정/삭제는 audit_logs 에 자동 기록됩니다.

-- ─────────────────────────────────────────────
-- 1. 고객 (customers)
-- ─────────────────────────────────────────────
create table if not exists public.customers (
  id                   uuid primary key default gen_random_uuid(),
  company_name         text not null,
  business_type        text not null default '',
  contact_name         text not null default '',
  area                 text not null default '',
  branch_info          text not null default '',
  monthly_demand       integer not null default 0,
  current_press_vendor text not null default '',
  market_price         text not null default '',
  insight              text not null default '',
  status               text not null default 'prospect' check (status in ('prospect', 'active')),
  last_visit_date      date,
  owner_id             text not null default (auth.user_id()),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 2. 타이어 장착 실적 (installations)
-- ─────────────────────────────────────────────
create table if not exists public.installations (
  id               uuid primary key default gen_random_uuid(),
  work_date        date not null,
  distributor      text not null default '',
  customer_name    text not null,
  product          text not null default '',
  rim_size         text not null default '',
  qty              integer not null default 1,
  serial_numbers   text not null default '',
  work_time        text not null default '',
  worker           text not null default '',   -- 작업자
  entered_by       text not null default '',   -- 입력자 (앱이 로그인 사용자 이름으로 자동 기록)
  status           text not null default 'completed' check (status in ('completed', 'pending', 'cancelled')),
  note             text not null default '',
  service_fee      bigint not null default 0,
  mobilization_fee bigint not null default 0,
  discount_rate    integer not null default 0,
  received_amount  bigint not null default 0,
  owner_id         text not null default (auth.user_id()),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 기존 테이블에 작업자/입력자 컬럼 추가 (재실행 안전)
alter table public.installations add column if not exists worker text not null default '';
alter table public.installations add column if not exists entered_by text not null default '';

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists installations_set_updated_at on public.installations;
create trigger installations_set_updated_at
  before update on public.installations
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 3. 역할 (user_roles) — admin / staff / user
--    가입만 하면 기본 'user'(조회 전용)이며, 행이 없어도 user 로 취급됩니다.
--    승격은 콘솔 SQL Editor 에서 (USER_ID 는 콘솔 Auth → Users 에서 확인):
--      insert into public.user_roles (user_id, role) values ('<USER_ID>', 'admin')  -- 또는 'staff'
--        on conflict (user_id) do update set role = excluded.role;
-- ─────────────────────────────────────────────
create table if not exists public.user_roles (
  user_id    text primary key,
  role       text not null default 'user' check (role in ('admin', 'staff', 'user')),
  created_at timestamptz not null default now()
);

-- 기존 테이블에 admin 역할 허용 (재실행 안전)
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check
  check (role in ('admin', 'staff', 'user'));

-- 현재 요청 사용자가 입력/수정 가능(staff 이상)인지 검사 (RLS 정책에서 사용).
-- security definer: user_roles 의 RLS 와 무관하게 조회 가능해야 하므로.
create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.user_id() and role in ('admin', 'staff')
  )
$$;

-- 현재 요청 사용자가 삭제 가능(admin)인지 검사.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.user_id() and role = 'admin'
  )
$$;

-- ─────────────────────────────────────────────
-- 4. 감사 로그 (audit_logs) — 입력/수정/삭제 자동 기록
--    Data API 로는 조회만 가능하며, 기록은 트리거가 담당합니다.
-- ─────────────────────────────────────────────
create table if not exists public.audit_logs (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_id  uuid,
  action     text not null check (action in ('insert', 'update', 'delete')),
  changed_by text not null,          -- Neon Auth user id (SQL Editor 직접 수정 시 'console')
  old_data   jsonb,
  new_data   jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists audit_logs_record_idx on public.audit_logs (table_name, record_id);
create index if not exists audit_logs_changed_at_idx on public.audit_logs (changed_at desc);

-- security definer: authenticated 역할에 insert 권한을 주지 않아도 기록되도록.
create or replace function public.log_changes()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
    values (tg_table_name, old.id, 'delete', coalesce(auth.user_id(), 'console'), to_jsonb(old), null);
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
    values (tg_table_name, new.id, 'update', coalesce(auth.user_id(), 'console'), to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_logs (table_name, record_id, action, changed_by, old_data, new_data)
    values (tg_table_name, new.id, 'insert', coalesce(auth.user_id(), 'console'), null, to_jsonb(new));
    return new;
  end if;
end $$;

drop trigger if exists customers_audit on public.customers;
create trigger customers_audit
  after insert or update or delete on public.customers
  for each row execute function public.log_changes();

drop trigger if exists installations_audit on public.installations;
create trigger installations_audit
  after insert or update or delete on public.installations
  for each row execute function public.log_changes();

-- ─────────────────────────────────────────────
-- 5. RLS (Row Level Security)
--    조회: 로그인 사용자 전원 / 입력·수정: staff 이상 / 삭제: admin 만
-- ─────────────────────────────────────────────
alter table public.customers enable row level security;
alter table public.installations enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;

-- 예전 전원-쓰기 정책 제거 (재실행 안전)
drop policy if exists customers_all on public.customers;
drop policy if exists installations_all on public.installations;

-- customers: 조회는 전원, 쓰기는 staff
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select to authenticated using (true);

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert to authenticated with check (public.is_staff());

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers
  for delete to authenticated using (public.is_admin());

-- installations: 조회는 전원, 쓰기는 staff
drop policy if exists installations_select on public.installations;
create policy installations_select on public.installations
  for select to authenticated using (true);

drop policy if exists installations_insert on public.installations;
create policy installations_insert on public.installations
  for insert to authenticated with check (public.is_staff());

drop policy if exists installations_update on public.installations;
create policy installations_update on public.installations
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists installations_delete on public.installations;
create policy installations_delete on public.installations
  for delete to authenticated using (public.is_admin());

-- user_roles: 본인 역할만 조회 가능, API 로는 쓰기 불가 (SQL Editor 로만 관리)
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles
  for select to authenticated using (user_id = auth.user_id());

-- audit_logs: 로그인 사용자 조회 가능, API 로는 쓰기 불가 (트리거가 기록)
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (true);

-- 익명(anonymous) 접근은 정책을 만들지 않음 → 기본 차단.

grant usage on schema public to authenticated;
grant all on public.customers, public.installations to authenticated;
grant select on public.user_roles, public.audit_logs to authenticated;
