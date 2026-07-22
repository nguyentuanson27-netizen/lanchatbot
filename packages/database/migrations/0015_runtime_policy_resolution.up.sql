-- Runtime consumption of Admin Policy Control Plane artifacts. Pins preserve
-- the exact trusted bundle used by a sales episode/cart across pointer rollback.

CREATE TABLE IF NOT EXISTS runtime_policy_pins (
  pin_scope_type text NOT NULL CHECK (pin_scope_type IN ('SALES_EPISODE', 'CART')),
  pin_scope_id text NOT NULL CHECK (length(pin_scope_id) BETWEEN 1 AND 256),
  page_id text NOT NULL CHECK (length(page_id) BETWEEN 1 AND 64),
  channel text NOT NULL CHECK (channel IN ('CANARY_SHADOW', 'CANARY_LIVE', 'PUBLISHED')),
  bundle_id text NOT NULL CHECK (length(bundle_id) BETWEEN 1 AND 256),
  bundle_hash text NOT NULL CHECK (bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  version_ids uuid[] NOT NULL CHECK (cardinality(version_ids) >= 3),
  bundle jsonb NOT NULL CHECK (jsonb_typeof(bundle) = 'object'),
  pinned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pin_scope_type, pin_scope_id)
);

CREATE INDEX IF NOT EXISTS runtime_policy_pins_page_idx
  ON runtime_policy_pins (page_id, channel, pinned_at DESC);

CREATE OR REPLACE FUNCTION prevent_runtime_policy_pin_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'runtime_policy_pins are immutable';
END;
$$;

DROP TRIGGER IF EXISTS runtime_policy_pins_no_mutation ON runtime_policy_pins;
CREATE TRIGGER runtime_policy_pins_no_mutation
  BEFORE UPDATE OR DELETE ON runtime_policy_pins
  FOR EACH ROW EXECUTE FUNCTION prevent_runtime_policy_pin_mutation();

CREATE TABLE IF NOT EXISTS runtime_policy_resolution_audit (
  resolution_id uuid PRIMARY KEY,
  page_id text NOT NULL CHECK (length(page_id) BETWEEN 1 AND 64),
  channel text NOT NULL CHECK (channel IN ('CANARY_SHADOW', 'CANARY_LIVE', 'PUBLISHED')),
  status text NOT NULL CHECK (status IN (
    'RESOLVED', 'PINNED', 'LAST_KNOWN_GOOD', 'DISABLED', 'UNAVAILABLE', 'REJECTED'
  )),
  source text NOT NULL CHECK (source IN ('DATABASE', 'CACHE', 'PIN', 'LAST_KNOWN_GOOD', 'NONE')),
  side_effects text NOT NULL CHECK (side_effects IN ('DISABLED', 'LIVE_OUTBOUND')),
  bundle_id text,
  bundle_hash text CHECK (bundle_hash IS NULL OR bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  version_ids uuid[] NOT NULL DEFAULT '{}',
  reason_codes text[] NOT NULL DEFAULT '{}',
  pin_scope_type text CHECK (pin_scope_type IS NULL OR pin_scope_type IN ('SALES_EPISODE', 'CART')),
  pin_scope_id text,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runtime_policy_resolution_audit_pin_ck CHECK (
    (pin_scope_type IS NULL) = (pin_scope_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS runtime_policy_resolution_audit_page_idx
  ON runtime_policy_resolution_audit (page_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION prevent_runtime_policy_resolution_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'runtime_policy_resolution_audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS runtime_policy_resolution_audit_no_mutation
  ON runtime_policy_resolution_audit;
CREATE TRIGGER runtime_policy_resolution_audit_no_mutation
  BEFORE UPDATE OR DELETE ON runtime_policy_resolution_audit
  FOR EACH ROW EXECUTE FUNCTION prevent_runtime_policy_resolution_audit_mutation();

REVOKE UPDATE, DELETE ON runtime_policy_pins FROM PUBLIC;
REVOKE UPDATE, DELETE ON runtime_policy_resolution_audit FROM PUBLIC;
