ALTER TABLE shadow_evaluations
  ADD COLUMN IF NOT EXISTS business_fact_status text,
  ADD COLUMN IF NOT EXISTS business_fact_source text,
  ADD COLUMN IF NOT EXISTS business_fact_observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS business_fact_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS business_fact_product_id text,
  ADD COLUMN IF NOT EXISTS business_fact_reason_code text;

CREATE INDEX IF NOT EXISTS shadow_evaluations_fact_status_idx
  ON shadow_evaluations (business_fact_status, source_occurred_at DESC)
  WHERE business_fact_status IS NOT NULL;
