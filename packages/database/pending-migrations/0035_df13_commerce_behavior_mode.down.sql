-- A rollback must not silently discard immutable COMMERCE versions.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM runtime_behavior_mode_versions
     WHERE sales_authority_mode = 'COMMERCE'
  ) THEN
    RAISE EXCEPTION 'DF13_COMMERCE_VERSION_ROLLBACK_BLOCKED';
  END IF;
END;
$$;

ALTER TABLE runtime_behavior_mode_versions
  DROP CONSTRAINT IF EXISTS runtime_behavior_mode_versions_commerce_binding_ck;

ALTER TABLE runtime_behavior_mode_versions
  DROP CONSTRAINT IF EXISTS runtime_behavior_mode_versions_sales_authority_mode_ck;

ALTER TABLE runtime_behavior_mode_versions
  ADD CONSTRAINT runtime_behavior_mode_versions_sales_authority_mode_check
    CHECK (sales_authority_mode = 'LEGACY');

ALTER TABLE runtime_behavior_mode_versions
  DROP COLUMN IF EXISTS authority_bundle_hash;
