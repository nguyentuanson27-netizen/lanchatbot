-- Trạng thái vận hành + ảnh chụp catalog cho các worker batch đã port từ n8n
-- (POS snapshot, P2.3A registry sync, P2.3B metadata staging, P2.3C qdrant publisher).
--
-- Các worker này chỉ ghi số liệu tổng hợp: không có nội dung khách, không có
-- secret, không có URL ảnh. Trang quản trị đọc lại qua view read-only.

CREATE TABLE IF NOT EXISTS batch_worker_status (
  worker_type text NOT NULL
    CHECK (worker_type IN (
      'POS_SNAPSHOT',
      'P23A_REGISTRY_SYNC',
      'P23B_METADATA_STAGING',
      'P23C_QDRANT_PUBLISHER'
    )),
  worker_id text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('STARTING', 'IDLE', 'RUNNING', 'ERROR', 'STOPPING')),
  mode text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  last_error_code text,
  last_run_ms integer CHECK (last_run_ms IS NULL OR last_run_ms >= 0),
  stats jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (worker_type, worker_id)
);

CREATE INDEX IF NOT EXISTS batch_worker_status_seen_idx
  ON batch_worker_status (last_seen_at DESC);

-- Mỗi nguồn dữ liệu nghiệp vụ giữ đúng một dòng trạng thái mới nhất.
CREATE TABLE IF NOT EXISTS catalog_snapshot_status (
  snapshot_key text PRIMARY KEY
    CHECK (snapshot_key IN (
      'POS_CATALOG',
      'PRODUCT_REGISTRY',
      'IMAGE_REGISTRY',
      'QDRANT_COLLECTION'
    )),
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('OK', 'WARNING', 'ERROR', 'STALE')),
  record_count integer NOT NULL DEFAULT 0 CHECK (record_count >= 0),
  detail text,
  metrics jsonb NOT NULL DEFAULT '{}',
  observed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Danh sách mã cần bổ sung dữ liệu. Ghi lại toàn bộ sau mỗi chu kỳ nên bảng
-- luôn phản ánh đúng hiện trạng, không tích luỹ rác.
CREATE TABLE IF NOT EXISTS catalog_data_issues (
  snapshot_key text NOT NULL
    REFERENCES catalog_snapshot_status (snapshot_key) ON DELETE CASCADE,
  product_id text NOT NULL,
  issue_code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical', 'warning')),
  source text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_key, product_id, issue_code)
);

CREATE INDEX IF NOT EXISTS catalog_data_issues_severity_idx
  ON catalog_data_issues (severity, detected_at DESC);

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
FROM realtime_worker_status
UNION ALL
SELECT
  worker_type,
  worker_id,
  NULL::text AS page_id,
  status,
  mode,
  false AS send_enabled,
  NULL::text AS model_name,
  last_seen_at,
  last_success_at,
  last_error_code,
  updated_at
FROM batch_worker_status;

CREATE OR REPLACE VIEW admin_batch_worker_status_v
WITH (security_barrier = true) AS
SELECT
  worker_type,
  worker_id,
  status,
  mode,
  last_seen_at,
  last_success_at,
  last_error_code,
  last_run_ms,
  stats,
  updated_at
FROM batch_worker_status;

CREATE OR REPLACE VIEW admin_catalog_status_v
WITH (security_barrier = true) AS
SELECT
  snapshot_key,
  source,
  status,
  record_count,
  detail,
  metrics,
  observed_at,
  updated_at
FROM catalog_snapshot_status;

CREATE OR REPLACE VIEW admin_catalog_issues_v
WITH (security_barrier = true) AS
SELECT
  snapshot_key,
  product_id,
  issue_code,
  severity,
  source,
  detected_at
FROM catalog_data_issues;
