DROP VIEW IF EXISTS admin_simulation_runs_v;

DROP INDEX IF EXISTS admin_simulation_runs_lease_idx;
DROP INDEX IF EXISTS admin_simulation_runs_queue_idx;

UPDATE admin_simulation_runs
SET status = 'FAILED',
    error_code = COALESCE(error_code, 'ROLLED_BACK_INSUFFICIENT_EVIDENCE'),
    completed_at = COALESCE(completed_at, now()),
    lease_owner = NULL, lease_token = NULL, lease_until = NULL,
    updated_at = now()
WHERE status = 'INSUFFICIENT_EVIDENCE';

ALTER TABLE admin_simulation_results
  DROP COLUMN IF EXISTS evaluation_status;

ALTER TABLE admin_simulation_runs
  DROP CONSTRAINT IF EXISTS admin_simulation_runs_lease_bundle_ck,
  DROP CONSTRAINT IF EXISTS admin_simulation_runs_status_check,
  DROP COLUMN IF EXISTS baseline_version_ids,
  DROP COLUMN IF EXISTS baseline_source,
  DROP COLUMN IF EXISTS attempt_count,
  DROP COLUMN IF EXISTS next_attempt_at,
  DROP COLUMN IF EXISTS lease_owner,
  DROP COLUMN IF EXISTS lease_token,
  DROP COLUMN IF EXISTS lease_until,
  DROP COLUMN IF EXISTS started_at;

ALTER TABLE admin_simulation_runs
  ADD CONSTRAINT admin_simulation_runs_status_check CHECK (status IN (
    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
  ));

CREATE INDEX admin_simulation_runs_queue_idx
  ON admin_simulation_runs (status, created_at)
  WHERE status IN ('PENDING', 'PROCESSING');

CREATE OR REPLACE VIEW admin_simulation_runs_v AS
SELECT simulation_id, page_id, version_ids, lookback_days, max_conversations,
       side_effects, status, created_by_subject, claimed_at, completed_at,
       error_code, aggregate_metrics, created_at, updated_at
FROM admin_simulation_runs;
