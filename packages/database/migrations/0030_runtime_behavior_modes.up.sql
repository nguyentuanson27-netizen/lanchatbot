-- Dynamic runtime behavior modes for confirmation and future authority/read cutovers.
-- Versions and audit rows are immutable. The active pointer is the only mutable row
-- and must advance by compare-and-swap through the control-plane repository.

CREATE TABLE IF NOT EXISTS runtime_behavior_mode_versions (
  mode_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL CHECK (length(page_id) BETWEEN 1 AND 64),
  channel text NOT NULL CHECK (channel ~ '^[A-Z][A-Z0-9_]{0,31}$'),
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  confirmation_mode text NOT NULL CHECK (confirmation_mode IN (
    'LEGACY', 'V2_SHADOW', 'V2_ACTIVE', 'CLARIFY_ONLY'
  )),
  sales_authority_mode text NOT NULL DEFAULT 'LEGACY'
    CHECK (sales_authority_mode = 'LEGACY'),
  state_read_mode text NOT NULL DEFAULT 'LEGACY'
    CHECK (state_read_mode = 'LEGACY'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_by text NOT NULL CHECK (length(created_by) BETWEEN 1 AND 256),
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runtime_behavior_mode_versions_scope_hash_uk
    UNIQUE (page_id, channel, content_hash)
);

CREATE INDEX IF NOT EXISTS runtime_behavior_mode_versions_scope_idx
  ON runtime_behavior_mode_versions (page_id, channel, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_runtime_behavior_mode_version_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'runtime_behavior_mode_versions are immutable';
END;
$$;

DROP TRIGGER IF EXISTS runtime_behavior_mode_versions_no_mutation
  ON runtime_behavior_mode_versions;
CREATE TRIGGER runtime_behavior_mode_versions_no_mutation
  BEFORE UPDATE OR DELETE ON runtime_behavior_mode_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_runtime_behavior_mode_version_mutation();

CREATE TABLE IF NOT EXISTS runtime_behavior_mode_pointers (
  page_id text NOT NULL CHECK (length(page_id) BETWEEN 1 AND 64),
  channel text NOT NULL CHECK (channel ~ '^[A-Z][A-Z0-9_]{0,31}$'),
  active_version_id uuid NOT NULL REFERENCES runtime_behavior_mode_versions(mode_version_id),
  pointer_revision bigint NOT NULL CHECK (pointer_revision >= 1),
  updated_by text NOT NULL CHECK (length(updated_by) BETWEEN 1 AND 256),
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, channel)
);

CREATE OR REPLACE FUNCTION guard_runtime_behavior_mode_pointer()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  version_page_id text;
  version_channel text;
BEGIN
  SELECT page_id, channel
    INTO version_page_id, version_channel
    FROM runtime_behavior_mode_versions
   WHERE mode_version_id = NEW.active_version_id;
  IF version_page_id IS NULL OR version_page_id <> NEW.page_id OR version_channel <> NEW.channel THEN
    RAISE EXCEPTION 'runtime behavior mode pointer scope mismatch';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.pointer_revision <> 1 THEN
    RAISE EXCEPTION 'initial runtime behavior mode pointer revision must be one';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.pointer_revision <> OLD.pointer_revision + 1 THEN
    RAISE EXCEPTION 'runtime behavior mode pointer revision must increment by one';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.page_id <> OLD.page_id OR NEW.channel <> OLD.channel) THEN
    RAISE EXCEPTION 'runtime behavior mode pointer scope is immutable';
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS runtime_behavior_mode_pointer_guard
  ON runtime_behavior_mode_pointers;
CREATE TRIGGER runtime_behavior_mode_pointer_guard
  BEFORE INSERT OR UPDATE ON runtime_behavior_mode_pointers
  FOR EACH ROW EXECUTE FUNCTION guard_runtime_behavior_mode_pointer();

CREATE TABLE IF NOT EXISTS runtime_behavior_mode_activation_audit (
  activation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL CHECK (length(page_id) BETWEEN 1 AND 64),
  channel text NOT NULL CHECK (channel ~ '^[A-Z][A-Z0-9_]{0,31}$'),
  previous_version_id uuid REFERENCES runtime_behavior_mode_versions(mode_version_id),
  new_version_id uuid NOT NULL REFERENCES runtime_behavior_mode_versions(mode_version_id),
  previous_confirmation_mode text CHECK (previous_confirmation_mode IS NULL OR previous_confirmation_mode IN (
    'LEGACY', 'V2_SHADOW', 'V2_ACTIVE', 'CLARIFY_ONLY'
  )),
  new_confirmation_mode text NOT NULL CHECK (new_confirmation_mode IN (
    'LEGACY', 'V2_SHADOW', 'V2_ACTIVE', 'CLARIFY_ONLY'
  )),
  previous_pointer_revision bigint CHECK (previous_pointer_revision IS NULL OR previous_pointer_revision >= 1),
  new_pointer_revision bigint NOT NULL CHECK (new_pointer_revision >= 1),
  actor text NOT NULL CHECK (length(actor) BETWEEN 1 AND 256),
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runtime_behavior_mode_activation_revision_ck CHECK (
    (previous_pointer_revision IS NULL AND new_pointer_revision = 1) OR
    (previous_pointer_revision IS NOT NULL AND new_pointer_revision = previous_pointer_revision + 1)
  )
);

CREATE INDEX IF NOT EXISTS runtime_behavior_mode_activation_audit_scope_idx
  ON runtime_behavior_mode_activation_audit (page_id, channel, occurred_at DESC);

CREATE OR REPLACE FUNCTION audit_runtime_behavior_mode_pointer_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  previous_version uuid;
  previous_revision bigint;
  previous_mode text;
  new_mode text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    previous_version := OLD.active_version_id;
    previous_revision := OLD.pointer_revision;
    SELECT confirmation_mode INTO previous_mode
      FROM public.runtime_behavior_mode_versions
     WHERE mode_version_id = previous_version;
  END IF;
  SELECT confirmation_mode INTO new_mode
    FROM public.runtime_behavior_mode_versions
   WHERE mode_version_id = NEW.active_version_id;
  INSERT INTO public.runtime_behavior_mode_activation_audit (
    page_id, channel, previous_version_id, new_version_id,
    previous_confirmation_mode, new_confirmation_mode,
    previous_pointer_revision, new_pointer_revision, actor, reason, occurred_at
  ) VALUES (
    NEW.page_id, NEW.channel, previous_version, NEW.active_version_id,
    previous_mode, new_mode, previous_revision, NEW.pointer_revision,
    NEW.updated_by, NEW.reason, NEW.updated_at
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS runtime_behavior_mode_pointer_activation_audit
  ON runtime_behavior_mode_pointers;
CREATE TRIGGER runtime_behavior_mode_pointer_activation_audit
  AFTER INSERT OR UPDATE ON runtime_behavior_mode_pointers
  FOR EACH ROW EXECUTE FUNCTION audit_runtime_behavior_mode_pointer_activation();

CREATE TABLE IF NOT EXISTS runtime_behavior_mode_resolution_audit (
  resolution_id uuid PRIMARY KEY,
  page_id text NOT NULL CHECK (length(page_id) BETWEEN 1 AND 64),
  channel text NOT NULL CHECK (channel ~ '^[A-Z][A-Z0-9_]{0,31}$'),
  confirmation_mode text NOT NULL CHECK (confirmation_mode IN (
    'LEGACY', 'V2_SHADOW', 'V2_ACTIVE', 'CLARIFY_ONLY'
  )),
  mode_version_id uuid REFERENCES runtime_behavior_mode_versions(mode_version_id),
  content_hash text CHECK (content_hash IS NULL OR content_hash ~ '^sha256:[a-f0-9]{64}$'),
  pointer_revision bigint CHECK (pointer_revision IS NULL OR pointer_revision >= 1),
  source text NOT NULL CHECK (source IN (
    'DATABASE', 'CACHE', 'LAST_KNOWN_GOOD', 'STARTUP_DEFAULT', 'FAIL_SAFE'
  )),
  status text NOT NULL CHECK (status IN ('RESOLVED', 'FALLBACK', 'REJECTED')),
  reason_codes text[] NOT NULL DEFAULT '{}',
  worker_id text NOT NULL CHECK (length(worker_id) BETWEEN 1 AND 256),
  pointer_updated_at timestamptz,
  resolved_at timestamptz NOT NULL,
  propagation_ms bigint CHECK (propagation_ms IS NULL OR propagation_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS runtime_behavior_mode_resolution_audit_scope_idx
  ON runtime_behavior_mode_resolution_audit (page_id, channel, resolved_at DESC);

CREATE OR REPLACE FUNCTION prevent_runtime_behavior_mode_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'runtime behavior mode audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS runtime_behavior_mode_activation_audit_no_mutation
  ON runtime_behavior_mode_activation_audit;
CREATE TRIGGER runtime_behavior_mode_activation_audit_no_mutation
  BEFORE UPDATE OR DELETE ON runtime_behavior_mode_activation_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_runtime_behavior_mode_audit_mutation();

DROP TRIGGER IF EXISTS runtime_behavior_mode_resolution_audit_no_mutation
  ON runtime_behavior_mode_resolution_audit;
CREATE TRIGGER runtime_behavior_mode_resolution_audit_no_mutation
  BEFORE UPDATE OR DELETE ON runtime_behavior_mode_resolution_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_runtime_behavior_mode_audit_mutation();

REVOKE ALL ON runtime_behavior_mode_versions,
  runtime_behavior_mode_pointers,
  runtime_behavior_mode_activation_audit,
  runtime_behavior_mode_resolution_audit FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_runtime_behavior_reader') THEN
    GRANT SELECT ON runtime_behavior_mode_versions, runtime_behavior_mode_pointers, runtime_behavior_mode_resolution_audit
      TO lana_runtime_behavior_reader;
    GRANT INSERT ON runtime_behavior_mode_resolution_audit
      TO lana_runtime_behavior_reader;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_control_api') THEN
    GRANT SELECT, INSERT ON runtime_behavior_mode_versions
      TO lana_admin_control_api;
    GRANT SELECT, INSERT ON runtime_behavior_mode_pointers
      TO lana_admin_control_api;
    GRANT UPDATE (active_version_id, pointer_revision, updated_by, reason, updated_at)
      ON runtime_behavior_mode_pointers TO lana_admin_control_api;
    GRANT SELECT ON runtime_behavior_mode_activation_audit TO lana_admin_control_api;
    GRANT SELECT ON runtime_behavior_mode_resolution_audit
      TO lana_admin_control_api;
  END IF;
END;
$$;
