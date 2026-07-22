CREATE TABLE IF NOT EXISTS admin_conversation_identities (
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  provider text NOT NULL CHECK (provider = 'PANCAKE'),
  customer_name_ciphertext bytea NOT NULL,
  customer_name_nonce bytea NOT NULL
    CHECK (octet_length(customer_name_nonce) = 12),
  customer_name_auth_tag bytea NOT NULL
    CHECK (octet_length(customer_name_auth_tag) = 16),
  encryption_key_ref text NOT NULL
    CHECK (length(encryption_key_ref) BETWEEN 3 AND 128),
  observed_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, conversation_id, provider),
  CONSTRAINT admin_conversation_identities_expiry_ck
    CHECK (expires_at > observed_at)
);

CREATE INDEX IF NOT EXISTS admin_conversation_identities_expiry_idx
  ON admin_conversation_identities (expires_at);

COMMENT ON TABLE admin_conversation_identities IS
  'OWNER-only admin identity projection. Customer names are AES-GCM encrypted; never expose this table through an admin read view.';
