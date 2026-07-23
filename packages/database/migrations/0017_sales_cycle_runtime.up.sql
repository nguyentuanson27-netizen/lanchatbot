-- Phase 3 sales-cycle state is operational and may contain checkout PII.
-- The JSON payload is therefore envelope-encrypted; only routing, revisions,
-- expiry and PII-free audit fields remain queryable.
CREATE TABLE IF NOT EXISTS sales_cycle_states (
  conversation_id uuid PRIMARY KEY REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  page_id text NOT NULL REFERENCES pages(page_id),
  state_revision bigint NOT NULL DEFAULT 0 CHECK (state_revision >= 0),
  state_ciphertext bytea NOT NULL,
  state_nonce bytea NOT NULL CHECK (octet_length(state_nonce) = 12),
  state_auth_tag bytea NOT NULL CHECK (octet_length(state_auth_tag) = 16),
  state_encrypted_dek bytea NOT NULL,
  state_key_ref text NOT NULL,
  cart_expires_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_cycle_state_cart_expiry_ck CHECK (
    cart_expires_at IS NULL OR cart_expires_at <= expires_at
  )
);

CREATE INDEX IF NOT EXISTS sales_cycle_states_expiry_idx
  ON sales_cycle_states (expires_at);
CREATE INDEX IF NOT EXISTS sales_cycle_states_page_stage_idx
  ON sales_cycle_states (page_id, updated_at DESC);

-- Append-only, PII-free command ledger. Raw message IDs, names, phone numbers
-- and addresses are never stored here.
CREATE TABLE IF NOT EXISTS sales_cycle_events (
  event_id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  page_id text NOT NULL REFERENCES pages(page_id),
  command_id_hash text NOT NULL,
  command_kind text NOT NULL CHECK (
    command_kind IN (
      'FACTS_PRESENTED', 'MEASUREMENTS_REQUIRED', 'SIZE_RECOMMENDED',
      'CART_OPENED', 'CART_MUTATED', 'NEGOTIATION_EVENT', 'CART_READY',
      'CHECKOUT_DETAILS_CAPTURED', 'PREVIEW_CREATED', 'CONFIRM_PURCHASE',
      'PAYMENT_RECEIPT_RECEIVED'
    )
  ),
  outcome text NOT NULL CHECK (outcome IN ('APPLIED', 'HANDOFF')),
  state_revision_before bigint NOT NULL CHECK (state_revision_before >= 0),
  state_revision_after bigint NOT NULL CHECK (state_revision_after > state_revision_before),
  stage_before text NOT NULL,
  stage_after text NOT NULL,
  cart_id uuid,
  cart_version integer CHECK (cart_version IS NULL OR cart_version > 0),
  reason_code text,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_cycle_events_command_uk UNIQUE (conversation_id, command_id_hash)
);

CREATE INDEX IF NOT EXISTS sales_cycle_events_conversation_time_idx
  ON sales_cycle_events (conversation_id, occurred_at DESC, event_id DESC);

CREATE OR REPLACE FUNCTION prevent_sales_cycle_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'sales_cycle_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS sales_cycle_events_no_mutation ON sales_cycle_events;
CREATE TRIGGER sales_cycle_events_no_mutation
  BEFORE UPDATE OR DELETE ON sales_cycle_events
  FOR EACH ROW EXECUTE FUNCTION prevent_sales_cycle_event_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON sales_cycle_events FROM PUBLIC;

