-- Trả `admin_worker_status_v` về hợp của hai bảng cũ trước khi bỏ bảng batch,
-- nếu không view sẽ giữ tham chiếu tới bảng sắp bị DROP.
CREATE OR REPLACE VIEW admin_worker_status_v
WITH (security_barrier = true) AS
SELECT
  'SHADOW'::text AS worker_type,
  worker_id,
  NULL::text AS page_id,
  status,
  NULL::text AS mode,
  false AS send_enabled,
  model_name,
  last_seen_at,
  last_success_at,
  last_error_code,
  updated_at
FROM shadow_worker_status
UNION ALL
SELECT
  'REALTIME'::text AS worker_type,
  worker_id,
  NULL::text AS page_id,
  status,
  mode,
  send_enabled,
  NULL::text AS model_name,
  last_seen_at,
  last_success_at,
  last_error_code,
  updated_at
FROM realtime_worker_status;

DROP VIEW IF EXISTS admin_catalog_issues_v;
DROP VIEW IF EXISTS admin_catalog_status_v;
DROP VIEW IF EXISTS admin_batch_worker_status_v;
DROP TABLE IF EXISTS catalog_data_issues;
DROP TABLE IF EXISTS catalog_snapshot_status;
DROP TABLE IF EXISTS batch_worker_status;
