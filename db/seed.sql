-- MobilPress 초기 데이터 (장착 실적 보고서 기반)
-- Neon 콘솔 SQL Editor 에서 실행하세요. 여러 번 실행해도 중복 등록되지 않습니다.
-- (앱의 "보고서 기반 초기 데이터 등록" 버튼과 같은 데이터입니다.
--  src/data/seed.ts 와 동기 유지)
--
-- 참고: SQL Editor 실행 시 auth.user_id() 가 없으므로 owner_id 는 'console' 로 기록됩니다.
--       audit_logs 에도 changed_by='console' 로 남습니다.

-- ── 고객 ─────────────────────────────────────
insert into public.customers
  (company_name, business_type, area, branch_info, current_press_vendor, market_price, insight, status, last_visit_date, owner_id)
select * from (values
  ('PT. Seungbin Textile Raja', 'End user / Textile', 'Karawang', '작업 실적 등록 고객',
   'PT. Total Tire Bank 경유', '프로모션 50% 적용',
   '첫 작업 시 소켓 두께 문제 발생, 이후 신규 24pcs 소켓 세트로 개선.', 'active', date '2026-06-29', 'console'),
  ('PT. Hankook Tire Indonesia', 'End user / Manufacturing', 'Cikarang', '작업 실적 등록 고객',
   'PT. Total Tire Bank 경유', '프로모션 50% 적용',
   '28*9-15 및 6.50-10 작업. 벨그 상태에 따라 작업 시간 편차 큼.', 'active', date '2026-07-06', 'console')
) as v(company_name, business_type, area, branch_info, current_press_vendor, market_price, insight, status, last_visit_date, owner_id)
where not exists (
  select 1 from public.customers c where c.company_name = v.company_name
);

-- ── 장착 실적 ─────────────────────────────────
insert into public.installations
  (work_date, distributor, customer_name, product, rim_size, qty, serial_numbers, work_time, status, note, service_fee, mobilization_fee, discount_rate, received_amount, owner_id)
select * from (values
  (date '2026-06-29', 'PT. Total Tire Bank', 'PT. Seungbin Textile Raja',
   'ASC 6.00-9 S2000 / ASC 7.00-12 S2000', '9 / 12', 4, '-', '13.30–16.30', 'completed',
   '공구 문제 — 소켓 렌치 두께 방해. 신규 kunci shock 구매로 개선.',
   1100000::bigint, 100000::bigint, 50, 250000::bigint, 'console'),
  (date '2026-07-01', 'PT. Total Tire Bank', 'PT. Hankook Tire Indonesia',
   'ASC 28*9-15 S2000', '15', 6,
   'AJ220626269, AJ230626138, AJ230626263, AJ230626148, AJ230626149, AJ240626033',
   '11.00–14.54', 'completed', '벨그 상태별 작업 시간 상이.',
   2400000::bigint, 150000::bigint, 50, 1350000::bigint, 'console'),
  (date '2026-07-06', 'PT. Total Tire Bank', 'PT. Hankook Tire Indonesia',
   'ASC 6.50-10 S2000', '10', 2, 'AJ150526108, AJ180526201', '13.30–14.30', 'completed',
   '타이어가 이미 유닛·벨그에서 분리된 상태.',
   700000::bigint, 150000::bigint, 50, 500000::bigint, 'console')
) as v(work_date, distributor, customer_name, product, rim_size, qty, serial_numbers, work_time, status, note, service_fee, mobilization_fee, discount_rate, received_amount, owner_id)
where not exists (
  select 1 from public.installations i
  where i.work_date = v.work_date and i.customer_name = v.customer_name and i.product = v.product
);

-- ── 등록 결과 확인 ────────────────────────────
select 'customers' as tbl, count(*) from public.customers
union all
select 'installations', count(*) from public.installations;
