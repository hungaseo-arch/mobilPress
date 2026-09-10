-- 장착 실적에 위치 정보 추가 (2026-09-10)
-- 작업지시서(SURAT PERINTAH KERJA)의 'Lokasi' 항목을 앱에서도 기록하기 위한 컬럼입니다.
--   install_area : 장착 지역 — 사람이 읽는 장소명 (예: Gudang Ascendo Karawang)
--   location_url : 구글 위치 — 'lat, lng' 좌표 또는 붙여넣은 Google Maps 링크
-- Neon 콘솔 SQL Editor 에서 실행한 뒤 Data API 의 'Refresh schema cache' 를 눌러주세요.
ALTER TABLE public.installations
  ADD COLUMN IF NOT EXISTS install_area text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_url text NOT NULL DEFAULT '';

COMMENT ON COLUMN installations.install_area IS '장착 지역 (작업지시서 Lokasi)';
COMMENT ON COLUMN installations.location_url IS '구글 위치 — lat,lng 좌표 또는 Google Maps 링크';
