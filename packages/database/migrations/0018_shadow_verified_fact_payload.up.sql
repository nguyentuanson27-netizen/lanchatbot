ALTER TABLE shadow_evaluations
  ADD COLUMN IF NOT EXISTS business_fact_payload jsonb;

COMMENT ON COLUMN shadow_evaluations.business_fact_payload IS
  'Verified business-fact envelope used for shadow generation and Judge v2; never customer transcript data.';
