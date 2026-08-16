-- Mobil Press — 장착 실적 작업보고서 첨부를 최대 3개까지 지원
-- 기존 report_file_id/report_file_name(1번째 파일)에 2·3번째 슬롯을 추가합니다.
-- 실행: Neon 콘솔 → SQL Editor

ALTER TABLE installations
  ADD COLUMN IF NOT EXISTS report_file_id2   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS report_file_name2 text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS report_file_id3   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS report_file_name3 text NOT NULL DEFAULT '';

COMMENT ON COLUMN installations.report_file_id2   IS '작업보고서 스캔 파일 2번째 Google Drive 파일 ID';
COMMENT ON COLUMN installations.report_file_name2 IS '작업보고서 2번째 파일명';
COMMENT ON COLUMN installations.report_file_id3   IS '작업보고서 스캔 파일 3번째 Google Drive 파일 ID';
COMMENT ON COLUMN installations.report_file_name3 IS '작업보고서 3번째 파일명';
