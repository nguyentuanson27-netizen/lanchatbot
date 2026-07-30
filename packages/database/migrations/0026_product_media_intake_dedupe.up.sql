CREATE TABLE IF NOT EXISTS product_media_intakes (
  intake_id text PRIMARY KEY CHECK (intake_id ~ '^[0-9a-f]{32}$'),
  brand text NOT NULL,
  brand_key text NOT NULL,
  product_code text NOT NULL,
  image_hash text NOT NULL CHECK (image_hash ~ '^[0-9a-f]{64}$'),
  image_url text NOT NULL,
  uploaded_at timestamptz NOT NULL,
  projection_status text NOT NULL DEFAULT 'RESERVED'
    CHECK (projection_status IN ('RESERVED', 'PROJECTED', 'FAILED')),
  projected_at timestamptz,
  last_error_code text,
  revision bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_media_intakes_dedupe_uk
    UNIQUE (brand_key, product_code, image_hash)
);

CREATE INDEX IF NOT EXISTS product_media_intakes_recent_idx
  ON product_media_intakes (uploaded_at DESC, intake_id DESC);
CREATE INDEX IF NOT EXISTS product_media_intakes_projection_idx
  ON product_media_intakes (projection_status, updated_at)
  WHERE projection_status <> 'PROJECTED';

COMMENT ON TABLE product_media_intakes IS
  'Authoritative idempotency and dedupe index for Admin product-media intake; Google Sheets remains an operational projection.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_control_api') THEN
    GRANT SELECT, INSERT, UPDATE ON product_media_intakes TO lana_admin_control_api;
  END IF;
END;
$$;
