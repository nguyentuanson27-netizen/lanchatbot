ALTER TABLE webhook_inbox
  ADD COLUMN IF NOT EXISTS receive_sequence bigserial,
  ADD COLUMN IF NOT EXISTS lease_token uuid;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_inbox_receive_sequence_uk
  ON webhook_inbox (receive_sequence);

ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS routing_owner text NOT NULL DEFAULT 'N8N'
    CHECK (routing_owner IN ('N8N', 'APP')),
  ADD COLUMN IF NOT EXISTS app_send_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kill_switch boolean NOT NULL DEFAULT true;

ALTER TABLE meta_outbox
  ADD COLUMN IF NOT EXISTS payload_fingerprint text,
  ADD COLUMN IF NOT EXISTS lease_token uuid;

ALTER TABLE pancake_tag_outbox
  ADD COLUMN IF NOT EXISTS pancake_conversation_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS pancake_conversation_nonce bytea
    CHECK (
      pancake_conversation_nonce IS NULL
      OR octet_length(pancake_conversation_nonce) = 12
    ),
  ADD COLUMN IF NOT EXISTS pancake_conversation_auth_tag bytea
    CHECK (
      pancake_conversation_auth_tag IS NULL
      OR octet_length(pancake_conversation_auth_tag) = 16
    ),
  ADD COLUMN IF NOT EXISTS lease_token uuid;

CREATE TABLE IF NOT EXISTS provider_conversation_links (
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  provider text NOT NULL CHECK (provider IN ('META', 'PANCAKE')),
  external_id_hash text NOT NULL,
  external_id_ciphertext bytea NOT NULL,
  external_id_nonce bytea NOT NULL CHECK (octet_length(external_id_nonce) = 12),
  external_id_auth_tag bytea NOT NULL CHECK (octet_length(external_id_auth_tag) = 16),
  verified_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, conversation_id, provider),
  CONSTRAINT provider_conversation_links_external_uk
    UNIQUE (page_id, provider, external_id_hash)
);

CREATE INDEX IF NOT EXISTS provider_conversation_links_expiry_idx
  ON provider_conversation_links (expires_at);

CREATE TABLE IF NOT EXISTS realtime_worker_status (
  worker_id text PRIMARY KEY,
  status text NOT NULL CHECK (
    status IN ('STARTING', 'IDLE', 'PROCESSING', 'ERROR', 'STOPPING')
  ),
  mode text NOT NULL CHECK (mode IN ('DRY_RUN', 'LIVE')),
  send_enabled boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  last_error_code text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pages_realtime_route_idx
  ON pages (routing_owner, app_send_enabled, kill_switch);
