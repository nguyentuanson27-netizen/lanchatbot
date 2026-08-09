-- A user-visible policy deletion is an append-only tombstone. Artifact rows and
-- their event history remain intact for audit, rollback analysis and forensics.

CREATE TABLE IF NOT EXISTS admin_artifact_deletions (
  version_id uuid PRIMARY KEY REFERENCES admin_artifact_versions(version_id),
  artifact_key text NOT NULL,
  artifact_kind text NOT NULL,
  artifact_revision bigint NOT NULL CHECK (artifact_revision >= 0),
  deleted_by_subject text NOT NULL CHECK (length(deleted_by_subject) BETWEEN 1 AND 256),
  actor_role text NOT NULL CHECK (actor_role = 'OWNER'),
  correlation_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_artifact_deletions_time_idx
  ON admin_artifact_deletions (deleted_at DESC, version_id);

CREATE OR REPLACE FUNCTION prevent_admin_artifact_deletion_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'admin_artifact_deletions is append-only';
END;
$$;

DROP TRIGGER IF EXISTS admin_artifact_deletions_no_mutation ON admin_artifact_deletions;
CREATE TRIGGER admin_artifact_deletions_no_mutation
  BEFORE UPDATE OR DELETE ON admin_artifact_deletions
  FOR EACH ROW EXECUTE FUNCTION prevent_admin_artifact_deletion_mutation();

CREATE OR REPLACE FUNCTION prevent_deleted_artifact_activation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.active AND EXISTS (
    SELECT 1 FROM admin_artifact_deletions WHERE version_id = NEW.version_id
  ) THEN
    RAISE EXCEPTION 'deleted admin artifact version cannot be activated';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_active_pointers_deleted_version_guard ON admin_active_pointers;
CREATE TRIGGER admin_active_pointers_deleted_version_guard
  BEFORE INSERT OR UPDATE ON admin_active_pointers
  FOR EACH ROW EXECUTE FUNCTION prevent_deleted_artifact_activation();

REVOKE UPDATE, DELETE, TRUNCATE ON admin_artifact_deletions FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_readonly') THEN
    GRANT SELECT ON admin_artifact_deletions TO lana_admin_readonly;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_control_api') THEN
    GRANT SELECT, INSERT ON admin_artifact_deletions TO lana_admin_control_api;
  END IF;
END;
$$;
