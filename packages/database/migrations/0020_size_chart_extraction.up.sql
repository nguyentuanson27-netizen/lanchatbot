-- App-native size-chart extraction queue and review artifacts.

CREATE TABLE IF NOT EXISTS size_chart_extractions (
  extraction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id text NOT NULL CHECK (length(image_id) BETWEEN 1 AND 256),
  parent_product_id text NOT NULL CHECK (length(parent_product_id) BETWEEN 1 AND 128),
  image_url text NOT NULL CHECK (length(image_url) BETWEEN 1 AND 2048),
  image_sha256 text NOT NULL CHECK (image_sha256 ~ '^[a-f0-9]{64}$'),
  extractor_version text NOT NULL CHECK (length(extractor_version) BETWEEN 1 AND 128),
  status text NOT NULL CHECK (status IN (
    'STAGED', 'SKIPPED', 'FAILED'
  )),
  measurement_basis text CHECK (measurement_basis IN ('BODY', 'GARMENT', 'UNKNOWN')),
  confidence double precision CHECK (confidence BETWEEN 0 AND 1),
  artifact_version_id uuid REFERENCES admin_artifact_versions(version_id),
  reason_codes text[] NOT NULL DEFAULT '{}',
  attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT size_chart_extractions_source_uk UNIQUE (
    parent_product_id, image_sha256, extractor_version
  )
);

CREATE INDEX IF NOT EXISTS size_chart_extractions_status_idx
  ON size_chart_extractions (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS size_chart_extractions_product_idx
  ON size_chart_extractions (parent_product_id, created_at DESC);

CREATE OR REPLACE FUNCTION guard_admin_artifact_version_update()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  size_chart_verification_only boolean := false;
BEGIN
  size_chart_verification_only :=
    OLD.artifact_kind = 'SIZE_CHART' AND
    OLD.lifecycle = 'VALIDATED' AND NEW.lifecycle = 'APPROVED' AND
    (NEW.content #- '{chart,reference,verificationStatus}'
                 #- '{chart,reference,verifiedByRef}'
                 #- '{chart,reference,verifiedAt}') =
    (OLD.content #- '{chart,reference,verificationStatus}'
                 #- '{chart,reference,verifiedByRef}'
                 #- '{chart,reference,verifiedAt}') AND
    NEW.content #>> '{chart,reference,verificationStatus}' = 'VERIFIED' AND
    NULLIF(NEW.content #>> '{chart,reference,verifiedByRef}', '') IS NOT NULL AND
    NULLIF(NEW.content #>> '{chart,reference,verifiedAt}', '') IS NOT NULL;

  IF OLD.lifecycle <> 'DRAFT' AND (
    NEW.content IS DISTINCT FROM OLD.content OR
    NEW.content_hash IS DISTINCT FROM OLD.content_hash OR
    NEW.artifact_key IS DISTINCT FROM OLD.artifact_key OR
    NEW.artifact_kind IS DISTINCT FROM OLD.artifact_kind OR
    NEW.version_number IS DISTINCT FROM OLD.version_number
  ) AND NOT size_chart_verification_only THEN
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
