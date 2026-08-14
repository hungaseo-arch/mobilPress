-- Mobil Press — 장착 실적에 작업보고서(스캔 PDF) 첨부 컬럼 추가
-- 파일 본체는 Google Drive, DB 에는 파일 ID/파일명만 보관합니다.
-- 실행: Neon 콘솔 → SQL Editor

ALTER TABLE installations
  ADD COLUMN IF NOT EXISTS report_file_id   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS report_file_name text NOT NULL DEFAULT '';

COMMENT ON COLUMN installations.report_file_id   IS '작업보고서 스캔 파일의 Google Drive 파일 ID';
COMMENT ON COLUMN installations.report_file_name IS '작업보고서 파일명 (LK_YYYYMMDD_CUSTOMER_nPCS.pdf)';

-- 첨부 여부로 조회하는 경우가 많다면 부분 인덱스
CREATE INDEX IF NOT EXISTS installations_has_report_idx
  ON installations (work_date DESC)
  WHERE report_file_id <> '';

-- Data API(PostgREST) 노출 role 에 컬럼 권한 부여 (기존 정책과 동일 role 사용)
-- 예시: GRANT SELECT, INSERT, UPDATE ON installations TO authenticated;
