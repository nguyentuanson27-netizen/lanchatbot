-- Analytics-safe, short-lived customer measurements used by the realtime size
-- engine. Identity and checkout PII are intentionally excluded from this table.
CREATE TABLE IF NOT EXISTS realtime_customer_profiles (
  page_id text NOT NULL REFERENCES pages(page_id),
  customer_hash text NOT NULL,
  revision bigint NOT NULL CHECK (revision > 0),
  profile_snapshot jsonb NOT NULL,
  field_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, customer_hash),
  CONSTRAINT realtime_customer_profiles_snapshot_object_ck
    CHECK (jsonb_typeof(profile_snapshot) = 'object'),
  CONSTRAINT realtime_customer_profiles_evidence_object_ck
    CHECK (jsonb_typeof(field_evidence) = 'object')
);

CREATE INDEX IF NOT EXISTS realtime_customer_profiles_expiry_idx
  ON realtime_customer_profiles (expires_at);

COMMENT ON TABLE realtime_customer_profiles IS
  '48-hour pseudonymous measurement/profile projection; no name, phone, address or checkout identity';

