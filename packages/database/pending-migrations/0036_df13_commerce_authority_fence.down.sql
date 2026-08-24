-- Pending DF13 rollback artifact. It must not be applied independently of a
-- separately authorized control-plane release and its audited rollback plan.
-- Refuse to erase any incomplete or completed fence evidence implicitly.
DO $$
DECLARE
  has_fence_rows boolean;
BEGIN
  IF to_regclass('public.df13_commerce_cutover_fences') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM df13_commerce_cutover_fences)'
      INTO has_fence_rows;
    IF has_fence_rows THEN
      RAISE EXCEPTION 'DF13_COMMERCE_FENCE_ROLLBACK_BLOCKED';
    END IF;
  END IF;
  IF to_regclass('public.df13_commerce_authority_fences') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM df13_commerce_authority_fences)'
      INTO has_fence_rows;
    IF has_fence_rows THEN
      RAISE EXCEPTION 'DF13_COMMERCE_FENCE_ROLLBACK_BLOCKED';
    END IF;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS df13_commerce_cutover_fence_identity_guard
  ON df13_commerce_cutover_fences;
DROP FUNCTION IF EXISTS guard_df13_commerce_cutover_fence_identity();
DROP TRIGGER IF EXISTS df13_commerce_cutover_fence_insert_identity_guard
  ON df13_commerce_cutover_fences;
DROP FUNCTION IF EXISTS guard_df13_commerce_cutover_fence_insert_identity();
DROP TABLE IF EXISTS df13_commerce_cutover_fences;
DROP TABLE IF EXISTS df13_commerce_authority_fence_claims;
DROP TABLE IF EXISTS df13_commerce_authority_fences;
