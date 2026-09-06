-- Mobil Press — 주행거리계 사진 첨부 + 타이어 판매가(건별) 컬럼 추가
-- · odometer_file_id/name : 장착 시 주행거리계 사진 (Google Drive 파일 ID + 파일명)
--   현장 조도·통신 상태에 따라 촬영이 어려울 수 있어 선택 첨부입니다. DB 제약도 걸지 않습니다.
-- · tire_price            : 타이어 판매가. 고객마다 달라 건별 총액으로 입력합니다(단가 아님).
-- 실행: Neon 콘솔 → SQL Editor

ALTER TABLE installations
  ADD COLUMN IF NOT EXISTS odometer_file_id   text   NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS odometer_file_name text   NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tire_price         bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN installations.odometer_file_id   IS '주행거리계 사진 Google Drive 파일 ID';
COMMENT ON COLUMN installations.odometer_file_name IS '주행거리계 사진 파일명';
COMMENT ON COLUMN installations.tire_price         IS '타이어 판매가 (건별 총액, Rp)';
