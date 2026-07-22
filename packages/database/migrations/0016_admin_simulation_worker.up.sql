-- Durable, side-effect-free policy simulation queue execution.

ALTER TABLE admin_simulation_runs
  DROP CONSTRAINT IF EXISTS admin_simulation_runs_status_check;

ALTER TABLE admin_simulation_runs
  ADD CONSTRAINT admin_simulation_runs_status_check CHECK (status IN (
    'PENDING', 'PROCESSING', 'COMPLETED', 'INSUFFICIENT_EVIDENCE',
    'FAILED', 'CANCELLED'
  )),
  ADD COLUMN IF NOT EXISTS baseline_version_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS baseline_source text NOT NULL DEFAULT 'UNRESOLVED'
    CHECK (baseline_source IN ('UNRESOLVED', 'PUBLISHED_POLICY', 'HISTORICAL_ACTUAL')),
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0
    CHECK (attempt_count BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lease_owner text,
  ADD COLUMN IF NOT EXISTS lease_token uuid,
  ADD COLUMN IF NOT EXISTS lease_until timestamptz,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- 0014 had no lease token. Return any in-flight legacy row to the durable
-- queue before enforcing the new processing-lease bundle.
UPDATE admin_simulation_runs
SET status = 'PENDING', claimed_at = NULL, next_attempt_at = now(),
    error_code = 'MIGRATION_RECOVERED_UNLEASED_PROCESSING', updated_at = now()
WHERE status = 'PROCESSING';

ALTER TABLE admin_simulation_runs
  ADD CONSTRAINT admin_simulation_runs_lease_bundle_ck CHECK (
    (status = 'PROCESSING' AND lease_owner IS NOT NULL AND
      lease_token IS NOT NULL AND lease_until IS NOT NULL)
    OR
    (status <> 'PROCESSING' AND lease_owner IS NULL AND
      lease_token IS NULL AND lease_until IS NULL)
  );

DROP INDEX IF EXISTS admin_simulation_runs_queue_idx;
CREATE INDEX admin_simulation_runs_queue_idx
  ON admin_simulation_runs (status, next_attempt_at, created_at)
  WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX admin_simulation_runs_lease_idx
  ON admin_simulation_runs (lease_until)
  WHERE status = 'PROCESSING';

ALTER TABLE admin_simulation_results
  ADD COLUMN IF NOT EXISTS evaluation_status text NOT NULL DEFAULT 'EVALUATED'
    CHECK (evaluation_status IN ('EVALUATED', 'INSUFFICIENT_EVIDENCE'));

-- PostgreSQL cannot insert/rename columns in-place through CREATE OR REPLACE
-- VIEW. Recreate the read view atomically inside this migration transaction.
DROP VIEW IF EXISTS admin_simulation_runs_v;
CREATE VIEW admin_simulation_runs_v AS
SELECT simulation_id, page_id, version_ids, baseline_version_ids, baseline_source,
       lookback_days, max_conversations, side_effects, status,
       created_by_subject, attempt_count, next_attempt_at, claimed_at,
       started_at, lease_until, completed_at, error_code,
       aggregate_metrics, created_at, updated_at
FROM admin_simulation_runs;
