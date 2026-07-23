DROP TABLE IF EXISTS size_chart_extractions;

-- Restore the original immutable-content guard.
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
