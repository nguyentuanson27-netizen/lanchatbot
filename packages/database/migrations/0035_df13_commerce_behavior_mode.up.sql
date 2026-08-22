-- DF13 source-only schema contract. Do not apply this migration without a
-- separately authorized control-plane release.
--
-- A COMMERCE pointer must identify the complete authority bundle through the
-- immutable version content hash. UR state reads remain unavailable here.

ALTER TABLE runtime_behavior_mode_versions
  ADD COLUMN IF NOT EXISTS authority_bundle_hash text;

ALTER TABLE runtime_behavior_mode_versions
  DROP CONSTRAINT IF EXISTS runtime_behavior_mode_versions_sales_authority_mode_check;

ALTER TABLE runtime_behavior_mode_versions
  DROP CONSTRAINT IF EXISTS runtime_behavior_mode_versions_sales_authority_mode_ck;

ALTER TABLE runtime_behavior_mode_versions
  ADD CONSTRAINT runtime_behavior_mode_versions_sales_authority_mode_ck
    CHECK (sales_authority_mode IN ('LEGACY', 'COMMERCE'));

ALTER TABLE runtime_behavior_mode_versions
  DROP CONSTRAINT IF EXISTS runtime_behavior_mode_versions_commerce_binding_ck;

ALTER TABLE runtime_behavior_mode_versions
  ADD CONSTRAINT runtime_behavior_mode_versions_commerce_binding_ck CHECK (
    (sales_authority_mode = 'LEGACY' AND authority_bundle_hash IS NULL)
    OR
    (sales_authority_mode = 'COMMERCE'
      AND state_read_mode = 'LEGACY'
      AND authority_bundle_hash ~ '^[a-f0-9]{64}$')
  );

COMMENT ON COLUMN runtime_behavior_mode_versions.authority_bundle_hash IS
  'DF13 COMMERCE authority bundle hash; immutable and included in content_hash. COMMERCE authority bundle hash is required.';
