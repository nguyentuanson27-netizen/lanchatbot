DROP INDEX IF EXISTS shadow_evaluations_fact_status_idx;
ALTER TABLE shadow_evaluations
  DROP COLUMN IF EXISTS business_fact_reason_code,
  DROP COLUMN IF EXISTS business_fact_product_id,
  DROP COLUMN IF EXISTS business_fact_expires_at,
  DROP COLUMN IF EXISTS business_fact_observed_at,
  DROP COLUMN IF EXISTS business_fact_source,
  DROP COLUMN IF EXISTS business_fact_status;
