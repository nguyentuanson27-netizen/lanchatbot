-- Structured Admin Policy Control Plane. PostgreSQL is the only mutable source
-- of truth; Google Sheets may import into DRAFT but cannot activate a version.

CREATE TABLE IF NOT EXISTS admin_artifact_versions (
  version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_key text NOT NULL CHECK (artifact_key ~ '^[A-Za-z0-9._:-]{1,128}$'),
  artifact_kind text NOT NULL CHECK (artifact_kind IN (
    'SHOP_POLICY', 'OFFER_POLICY', 'CLOSING_STRATEGY',
    'SIZE_CHART', 'HANDOFF_MATRIX', 'PAYMENT_POLICY'
  )),
  version_number integer NOT NULL CHECK (version_number > 0),
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  lifecycle text NOT NULL DEFAULT 'DRAFT' CHECK (lifecycle IN (
    'DRAFT', 'VALIDATED', 'APPROVED', 'CANARY', 'PUBLISHED', 'RETIRED'
  )),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_by_subject text NOT NULL CHECK (length(created_by_subject) BETWEEN 1 AND 256),
  updated_by_subject text NOT NULL CHECK (length(updated_by_subject) BETWEEN 1 AND 256),
  validated_by_subject text,
  approved_by_subject text,
  canary_by_subject text,
  published_by_subject text,
  retired_by_subject text,
  validated_at timestamptz,
  approved_at timestamptz,
  canary_at timestamptz,
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_artifact_versions_key_version_uk UNIQUE (artifact_key, version_number),
  CONSTRAINT admin_artifact_versions_kind_matches_content_ck CHECK (
    content->>'kind' = artifact_kind AND content->>'schemaVersion' = '1'
  ),
  CONSTRAINT admin_artifact_versions_validation_actor_ck CHECK (
    (validated_at IS NULL) = (validated_by_subject IS NULL)
  ),
  CONSTRAINT admin_artifact_versions_approval_actor_ck CHECK (
    (approved_at IS NULL) = (approved_by_subject IS NULL)
  ),
  CONSTRAINT admin_artifact_versions_canary_actor_ck CHECK (
    (canary_at IS NULL) = (canary_by_subject IS NULL)
  ),
  CONSTRAINT admin_artifact_versions_publish_actor_ck CHECK (
    (published_at IS NULL) = (published_by_subject IS NULL)
  ),
  CONSTRAINT admin_artifact_versions_retire_actor_ck CHECK (
    (retired_at IS NULL) = (retired_by_subject IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS admin_artifact_versions_lookup_idx
  ON admin_artifact_versions (artifact_kind, artifact_key, version_number DESC);
CREATE INDEX IF NOT EXISTS admin_artifact_versions_lifecycle_idx
  ON admin_artifact_versions (lifecycle, updated_at DESC);

CREATE OR REPLACE FUNCTION guard_admin_artifact_version_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.lifecycle <> 'DRAFT' AND (
    NEW.content IS DISTINCT FROM OLD.content OR
    NEW.content_hash IS DISTINCT FROM OLD.content_hash OR
    NEW.artifact_key IS DISTINCT FROM OLD.artifact_key OR
    NEW.artifact_kind IS DISTINCT FROM OLD.artifact_kind OR
    NEW.version_number IS DISTINCT FROM OLD.version_number
  ) THEN
    RAISE EXCEPTION 'non-draft admin artifact content is immutable';
  END IF;

  IF OLD.lifecycle = 'RETIRED' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'retired admin artifact versions are immutable';
  END IF;

  IF OLD.lifecycle <> NEW.lifecycle AND NOT (
    (OLD.lifecycle = 'DRAFT' AND NEW.lifecycle = 'VALIDATED') OR
    (OLD.lifecycle = 'VALIDATED' AND NEW.lifecycle = 'APPROVED') OR
    (OLD.lifecycle = 'APPROVED' AND NEW.lifecycle = 'CANARY') OR
    (OLD.lifecycle = 'CANARY' AND NEW.lifecycle = 'PUBLISHED') OR
    (OLD.lifecycle IN ('APPROVED', 'CANARY', 'PUBLISHED') AND NEW.lifecycle = 'RETIRED')
  ) THEN
    RAISE EXCEPTION 'invalid admin artifact lifecycle transition: % -> %', OLD.lifecycle, NEW.lifecycle;
  END IF;

  IF NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'admin artifact revision must increment by one';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_artifact_versions_update_guard ON admin_artifact_versions;
CREATE TRIGGER admin_artifact_versions_update_guard
  BEFORE UPDATE ON admin_artifact_versions
  FOR EACH ROW EXECUTE FUNCTION guard_admin_artifact_version_update();

CREATE TABLE IF NOT EXISTS admin_artifact_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES admin_artifact_versions(version_id),
  artifact_key text NOT NULL,
  action text NOT NULL CHECK (action IN (
    'CREATED', 'UPDATED', 'VALIDATED', 'APPROVED', 'CANARY_STARTED',
    'PUBLISHED', 'RETIRED', 'POINTER_CHANGED', 'ROLLBACK'
  )),
  from_lifecycle text,
  to_lifecycle text,
  actor_subject text NOT NULL CHECK (length(actor_subject) BETWEEN 1 AND 256),
  actor_role text NOT NULL CHECK (actor_role IN ('OWNER', 'EDITOR', 'APPROVER', 'VIEWER')),
  page_id text,
  channel text,
  correlation_id uuid NOT NULL,
  metadata_safe jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_artifact_events_version_idx
  ON admin_artifact_events (version_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_artifact_events_actor_idx
  ON admin_artifact_events (actor_subject, occurred_at DESC);

CREATE OR REPLACE FUNCTION prevent_admin_artifact_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'admin_artifact_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS admin_artifact_events_no_mutation ON admin_artifact_events;
CREATE TRIGGER admin_artifact_events_no_mutation
  BEFORE UPDATE OR DELETE ON admin_artifact_events
  FOR EACH ROW EXECUTE FUNCTION prevent_admin_artifact_event_mutation();

CREATE TABLE IF NOT EXISTS admin_active_pointers (
  pointer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_key text NOT NULL,
  artifact_kind text NOT NULL,
  page_id text,
  channel text NOT NULL CHECK (channel IN ('CANARY_SHADOW', 'CANARY_LIVE', 'PUBLISHED')),
  version_id uuid NOT NULL REFERENCES admin_artifact_versions(version_id),
  active boolean NOT NULL DEFAULT true,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_by_subject text NOT NULL CHECK (length(updated_by_subject) BETWEEN 1 AND 256),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_active_pointers_scope_uk UNIQUE NULLS NOT DISTINCT
    (artifact_key, artifact_kind, page_id, channel)
);

CREATE INDEX IF NOT EXISTS admin_active_pointers_version_idx
  ON admin_active_pointers (version_id);

CREATE TABLE IF NOT EXISTS admin_simulation_runs (
  simulation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL,
  version_ids uuid[] NOT NULL CHECK (cardinality(version_ids) BETWEEN 1 AND 20),
  lookback_days integer NOT NULL CHECK (lookback_days BETWEEN 1 AND 186),
  max_conversations integer NOT NULL CHECK (max_conversations BETWEEN 1 AND 1000),
  side_effects text NOT NULL DEFAULT 'DISABLED' CHECK (side_effects = 'DISABLED'),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
  )),
  created_by_subject text NOT NULL CHECK (length(created_by_subject) BETWEEN 1 AND 256),
  claimed_at timestamptz,
  completed_at timestamptz,
  error_code text,
  aggregate_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_simulation_runs_queue_idx
  ON admin_simulation_runs (status, created_at)
  WHERE status IN ('PENDING', 'PROCESSING');

CREATE TABLE IF NOT EXISTS admin_simulation_results (
  result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES admin_simulation_runs(simulation_id) ON DELETE CASCADE,
  conversation_hash text NOT NULL CHECK (conversation_hash ~ '^sha256:[a-f0-9]{64}$'),
  baseline_outcome text,
  candidate_outcome text,
  funnel_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_codes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_simulation_results_conversation_uk UNIQUE (simulation_id, conversation_hash)
);

CREATE OR REPLACE VIEW admin_artifact_versions_v AS
SELECT
  version_id, artifact_key, artifact_kind, version_number, schema_version,
  lifecycle, revision, content, content_hash, created_by_subject,
  updated_by_subject, validated_by_subject, approved_by_subject,
  canary_by_subject, published_by_subject, retired_by_subject,
  validated_at, approved_at, canary_at, published_at, retired_at,
  created_at, updated_at
FROM admin_artifact_versions;

CREATE OR REPLACE VIEW admin_active_pointers_v AS
SELECT
  pointer.pointer_id, pointer.artifact_key, pointer.artifact_kind,
  pointer.page_id, pointer.channel, pointer.version_id, pointer.active, pointer.revision,
  pointer.updated_by_subject, pointer.updated_at,
  version.version_number, version.lifecycle, version.content_hash
FROM admin_active_pointers pointer
JOIN admin_artifact_versions version ON version.version_id = pointer.version_id
WHERE pointer.active;

CREATE OR REPLACE VIEW admin_simulation_runs_v AS
SELECT simulation_id, page_id, version_ids, lookback_days, max_conversations,
       side_effects, status, created_by_subject, claimed_at, completed_at,
       error_code, aggregate_metrics, created_at, updated_at
FROM admin_simulation_runs;

REVOKE DELETE ON admin_artifact_versions FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON admin_artifact_events FROM PUBLIC;
REVOKE DELETE ON admin_active_pointers FROM PUBLIC;
REVOKE DELETE ON admin_simulation_runs, admin_simulation_results FROM PUBLIC;
