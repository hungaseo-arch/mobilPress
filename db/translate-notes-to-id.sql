-- 기존 DB 에 한국어로 저장된 초기 데이터(고객 insight/지점/업체/시장가, 장착 note)를
-- 인도네시아어로 변경합니다. Neon 콘솔 SQL Editor 에서 실행하세요.
-- (한국어 원문과 정확히 일치하는 행만 바뀌므로, 이미 수정한 행은 영향 없음)

-- ── 고객 (customers) ─────────────────────────
update public.customers set
  branch_info          = 'Customer dengan riwayat pemasangan',
  current_press_vendor = 'Via PT. Total Tire Bank',
  market_price         = 'Promosi 50% diterapkan'
where branch_info = '작업 실적 등록 고객';

update public.customers
set insight = 'Masalah ketebalan soket pada pekerjaan pertama, lalu diperbaiki dengan set soket 24pcs baru.'
where insight = '첫 작업 시 소켓 두께 문제 발생, 이후 신규 24pcs 소켓 세트로 개선.';

update public.customers
set insight = 'Pengerjaan 28*9-15 dan 6.50-10. Durasi kerja bervariasi tergantung kondisi velg.'
where insight = '28*9-15 및 6.50-10 작업. 벨그 상태에 따라 작업 시간 편차 큼.';

-- ── 장착 실적 (installations) note ───────────
update public.installations
set note = 'Masalah alat — ketebalan kunci soket mengganggu. Diperbaiki dengan membeli kunci shock baru.'
where note = '공구 문제 — 소켓 렌치 두께 방해. 신규 kunci shock 구매로 개선.';

update public.installations
set note = 'Durasi kerja berbeda tergantung kondisi velg.'
where note = '벨그 상태별 작업 시간 상이.';

update public.installations
set note = 'Ban sudah terlepas dari unit dan velg.'
where note = '타이어가 이미 유닛·벨그에서 분리된 상태.';

-- ── 남은 한국어 데이터 확인 (0 건이면 완료) ──
select 'customers' as tbl, count(*) from public.customers
where insight ~ '[가-힣]' or branch_info ~ '[가-힣]' or current_press_vendor ~ '[가-힣]' or market_price ~ '[가-힣]'
union all
select 'installations', count(*) from public.installations where note ~ '[가-힣]';
