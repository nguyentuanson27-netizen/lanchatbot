CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_name text PRIMARY KEY,
  checksum_sha256 text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS secret_versions (
  secret_version_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text,
  provider text NOT NULL,
  secret_type text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL CHECK (status IN ('PENDING_VALIDATION', 'ACTIVE', 'GRACE', 'REVOKED', 'DESTROYED')),
  algorithm text NOT NULL DEFAULT 'AES-256-GCM' CHECK (algorithm = 'AES-256-GCM'),
  envelope_version integer NOT NULL DEFAULT 1 CHECK (envelope_version = 1),
  ciphertext bytea NOT NULL,
  nonce bytea NOT NULL CHECK (octet_length(nonce) = 12),
  auth_tag bytea NOT NULL CHECK (octet_length(auth_tag) = 16),
  encrypted_dek bytea NOT NULL,
  encrypted_dek_nonce bytea NOT NULL CHECK (octet_length(encrypted_dek_nonce) = 12),
  encrypted_dek_auth_tag bytea NOT NULL CHECK (octet_length(encrypted_dek_auth_tag) = 16),
  kek_provider text NOT NULL,
  kek_version text NOT NULL,
  aad_sha256 bytea NOT NULL CHECK (octet_length(aad_sha256) = 32),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  grace_until timestamptz,
  revoked_at timestamptz,
  destroyed_at timestamptz,
  CONSTRAINT secret_versions_scope_version_uk UNIQUE NULLS NOT DISTINCT
    (page_id, provider, secret_type, version),
  CONSTRAINT secret_versions_lifecycle_ck CHECK (
    (status <> 'ACTIVE' OR activated_at IS NOT NULL)
    AND (status <> 'REVOKED' OR revoked_at IS NOT NULL)
    AND (status <> 'DESTROYED' OR (destroyed_at IS NOT NULL AND revoked_at IS NOT NULL))
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS secret_versions_one_active_idx
  ON secret_versions (coalesce(page_id, ''), provider, secret_type)
  WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS secret_versions_page_type_idx
  ON secret_versions (page_id, secret_type, status);

CREATE TABLE IF NOT EXISTS pages (
  page_id text PRIMARY KEY,
  page_alias text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PAUSED' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPROMISED', 'DISABLED')),
  meta_app_id text NOT NULL,
  meta_verify_secret_ref uuid,
  meta_send_secret_ref uuid,
  pancake_read_tag_secret_ref uuid,
  handoff_employee_tag_id text,
  handoff_post_sale_tag_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pages_live_configuration_ck CHECK (
    status <> 'ACTIVE'
    OR (
      meta_verify_secret_ref IS NOT NULL
      AND meta_send_secret_ref IS NOT NULL
      AND pancake_read_tag_secret_ref IS NOT NULL
      AND handoff_employee_tag_id IS NOT NULL
      AND handoff_post_sale_tag_id IS NOT NULL
    )
  ),
  CONSTRAINT pages_meta_verify_secret_fk FOREIGN KEY (meta_verify_secret_ref)
    REFERENCES secret_versions(secret_version_id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT pages_meta_send_secret_fk FOREIGN KEY (meta_send_secret_ref)
    REFERENCES secret_versions(secret_version_id) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT pages_pancake_secret_fk FOREIGN KEY (pancake_read_tag_secret_ref)
    REFERENCES secret_versions(secret_version_id) DEFERRABLE INITIALLY DEFERRED
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'secret_versions_page_fk'
  ) THEN
    ALTER TABLE secret_versions
      ADD CONSTRAINT secret_versions_page_fk FOREIGN KEY (page_id)
      REFERENCES pages(page_id) DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS webhook_inbox (
  inbox_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'META' CHECK (provider = 'META'),
  page_id text NOT NULL REFERENCES pages(page_id),
  event_key text NOT NULL,
  provider_message_id text,
  conversation_hash text NOT NULL,
  provider_occurred_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  signature_key_version text NOT NULL,
  status text NOT NULL DEFAULT 'VERIFIED' CHECK (status IN (
    'RECEIVED', 'VERIFIED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'REJECTED',
    'FAILED_RETRYABLE', 'FAILED_PERMANENT'
  )),
  payload_ciphertext bytea,
  payload_nonce bytea CHECK (payload_nonce IS NULL OR octet_length(payload_nonce) = 12),
  payload_auth_tag bytea CHECK (payload_auth_tag IS NULL OR octet_length(payload_auth_tag) = 16),
  payload_encrypted_dek bytea,
  payload_key_ref text,
  payload_expires_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz,
  lease_owner text,
  lease_until timestamptz,
  last_error_code text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_inbox_page_event_uk UNIQUE (page_id, event_key),
  CONSTRAINT webhook_inbox_payload_bundle_ck CHECK (
    (payload_ciphertext IS NULL AND payload_nonce IS NULL AND payload_auth_tag IS NULL AND payload_encrypted_dek IS NULL AND payload_key_ref IS NULL)
    OR
    (payload_ciphertext IS NOT NULL AND payload_nonce IS NOT NULL AND payload_auth_tag IS NOT NULL AND payload_encrypted_dek IS NOT NULL AND payload_key_ref IS NOT NULL AND payload_expires_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS webhook_inbox_dispatch_idx
  ON webhook_inbox (status, next_attempt_at, received_at)
  WHERE status IN ('VERIFIED', 'QUEUED', 'FAILED_RETRYABLE');
CREATE INDEX IF NOT EXISTS webhook_inbox_lease_idx
  ON webhook_inbox (lease_until) WHERE status = 'PROCESSING';

CREATE TABLE IF NOT EXISTS conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL REFERENCES pages(page_id),
  customer_hash text NOT NULL,
  hash_key_version text NOT NULL,
  routing_owner text NOT NULL DEFAULT 'N8N' CHECK (routing_owner IN ('N8N', 'APP')),
  conversation_owner text NOT NULL DEFAULT 'BOT' CHECK (conversation_owner IN ('BOT', 'HUMAN')),
  owner_lease_until timestamptz,
  blocking_tag text CHECK (blocking_tag IS NULL OR blocking_tag IN ('NHAN_VIEN', 'VAN_DON')),
  blocking_tag_verified_at timestamptz,
  state_version bigint NOT NULL DEFAULT 0 CHECK (state_version >= 0),
  state_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_provider_occurred_at timestamptz,
  last_received_at timestamptz,
  last_message_id_hash text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '20 days'),
  CONSTRAINT conversations_page_customer_uk UNIQUE (page_id, customer_hash),
  CONSTRAINT conversations_handoff_ck CHECK (
    conversation_owner <> 'HUMAN' OR owner_lease_until IS NOT NULL OR blocking_tag IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS conversations_owner_idx
  ON conversations (page_id, routing_owner, conversation_owner);
CREATE INDEX IF NOT EXISTS conversations_expiry_idx ON conversations (expires_at);

CREATE TABLE IF NOT EXISTS meta_outbox (
  outbox_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  reply_plan_id uuid NOT NULL,
  response_group_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  page_id text NOT NULL REFERENCES pages(page_id),
  customer_hash text NOT NULL,
  recipient_ciphertext bytea,
  recipient_nonce bytea CHECK (recipient_nonce IS NULL OR octet_length(recipient_nonce) = 12),
  recipient_auth_tag bytea CHECK (recipient_auth_tag IS NULL OR octet_length(recipient_auth_tag) = 16),
  payload_ciphertext bytea,
  payload_nonce bytea CHECK (payload_nonce IS NULL OR octet_length(payload_nonce) = 12),
  payload_auth_tag bytea CHECK (payload_auth_tag IS NULL OR octet_length(payload_auth_tag) = 16),
  payload_encrypted_dek bytea,
  payload_key_ref text,
  payload_expires_at timestamptz,
  sequence_no integer NOT NULL CHECK (sequence_no >= 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'SENDING', 'SENT_ACCEPTED', 'DELIVERED', 'READ', 'AMBIGUOUS',
    'RETRYABLE', 'FAILED_PERMANENT', 'MANUAL_REVIEW'
  )),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  lease_owner text,
  lease_until timestamptz,
  meta_message_id text,
  request_started_at timestamptz,
  accepted_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  ambiguity_reason text,
  last_error_code text,
  next_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_outbox_plan_sequence_uk UNIQUE (reply_plan_id, sequence_no),
  CONSTRAINT meta_outbox_recipient_bundle_ck CHECK (
    (recipient_ciphertext IS NULL AND recipient_nonce IS NULL AND recipient_auth_tag IS NULL)
    OR
    (recipient_ciphertext IS NOT NULL AND recipient_nonce IS NOT NULL AND recipient_auth_tag IS NOT NULL)
  ),
  CONSTRAINT meta_outbox_payload_bundle_ck CHECK (
    (payload_ciphertext IS NULL AND payload_nonce IS NULL AND payload_auth_tag IS NULL AND payload_encrypted_dek IS NULL AND payload_key_ref IS NULL)
    OR
    (payload_ciphertext IS NOT NULL AND payload_nonce IS NOT NULL AND payload_auth_tag IS NOT NULL AND payload_encrypted_dek IS NOT NULL AND payload_key_ref IS NOT NULL AND payload_expires_at IS NOT NULL)
  ),
  CONSTRAINT meta_outbox_acceptance_ck CHECK (
    status NOT IN ('SENT_ACCEPTED', 'DELIVERED', 'READ')
    OR (meta_message_id IS NOT NULL AND accepted_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS meta_outbox_dispatch_idx
  ON meta_outbox (status, next_attempt_at, created_at)
  WHERE status IN ('PENDING', 'RETRYABLE');
CREATE INDEX IF NOT EXISTS meta_outbox_ambiguous_idx
  ON meta_outbox (request_started_at) WHERE status = 'AMBIGUOUS';
CREATE UNIQUE INDEX IF NOT EXISTS meta_outbox_provider_message_uk
  ON meta_outbox (page_id, meta_message_id) WHERE meta_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS meta_outbox_conversation_sequence_idx
  ON meta_outbox (conversation_id, response_group_id, sequence_no);

CREATE TABLE IF NOT EXISTS pancake_tag_outbox (
  operation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  desired_tag text NOT NULL CHECK (desired_tag IN ('NHAN_VIEN', 'VAN_DON')),
  operation text NOT NULL DEFAULT 'ADD' CHECK (operation = 'ADD'),
  pancake_tag_id text NOT NULL,
  handoff_generation bigint NOT NULL CHECK (handoff_generation >= 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'APPLYING', 'APPLIED', 'RETRYABLE', 'FAILED_PERMANENT'
  )),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  lease_owner text,
  lease_until timestamptz,
  last_error_code text,
  next_attempt_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pancake_tag_desired_state_uk UNIQUE
    (conversation_id, desired_tag, handoff_generation)
);

CREATE INDEX IF NOT EXISTS pancake_tag_outbox_dispatch_idx
  ON pancake_tag_outbox (status, next_attempt_at, created_at)
  WHERE status IN ('PENDING', 'RETRYABLE');

-- Partitioned analytical history. Global idempotency lives in message_identities because
-- PostgreSQL unique constraints on a partitioned table must include the partition key.
CREATE TABLE IF NOT EXISTS message_identities (
  identity_key text PRIMARY KEY,
  page_id text NOT NULL REFERENCES pages(page_id),
  provider_message_id_hash text,
  outbox_id uuid REFERENCES meta_outbox(outbox_id),
  message_pk uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_identities_source_ck CHECK (
    (provider_message_id_hash IS NOT NULL)::integer + (outbox_id IS NOT NULL)::integer = 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS message_identities_inbound_uk
  ON message_identities (page_id, provider_message_id_hash)
  WHERE provider_message_id_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS message_identities_outbound_uk
  ON message_identities (outbox_id) WHERE outbox_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS messages (
  message_pk uuid NOT NULL DEFAULT gen_random_uuid(),
  identity_key text NOT NULL,
  page_id text NOT NULL,
  conversation_id uuid NOT NULL,
  customer_hash text NOT NULL,
  provider_message_id_hash text,
  outbox_id uuid,
  direction text NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  sender_type text NOT NULL CHECK (sender_type IN ('CUSTOMER', 'BOT', 'HUMAN', 'SYSTEM')),
  message_type text NOT NULL CHECK (message_type IN ('TEXT', 'IMAGE', 'MIXED', 'EVENT', 'POSTBACK')),
  text_redacted text NOT NULL DEFAULT '',
  redaction_version text NOT NULL,
  dlp_status text NOT NULL DEFAULT 'PENDING' CHECK (dlp_status IN ('PENDING', 'PASSED', 'QUARANTINED')),
  attachment_count integer NOT NULL DEFAULT 0 CHECK (attachment_count BETWEEN 0 AND 10),
  product_id text,
  sales_stage text,
  intent text,
  outcome text,
  prompt_version text,
  model_version text,
  policy_version text,
  catalog_version text,
  provider_occurred_at timestamptz,
  received_at timestamptz,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_pk, occurred_at),
  CONSTRAINT messages_direction_sender_ck CHECK (
    (direction = 'INBOUND' AND sender_type IN ('CUSTOMER', 'HUMAN', 'SYSTEM'))
    OR (direction = 'OUTBOUND' AND sender_type IN ('BOT', 'HUMAN', 'SYSTEM'))
  )
) PARTITION BY RANGE (occurred_at);

CREATE TABLE IF NOT EXISTS messages_default PARTITION OF messages DEFAULT;
CREATE INDEX IF NOT EXISTS messages_conversation_time_idx
  ON messages (conversation_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS messages_page_time_idx ON messages (page_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS messages_product_stage_idx
  ON messages (product_id, sales_stage, occurred_at DESC);

CREATE TABLE IF NOT EXISTS conversation_events (
  event_id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  page_id text NOT NULL,
  customer_hash text NOT NULL,
  event_type text NOT NULL,
  intent text,
  stage text,
  action text,
  handoff_reason text,
  owner text CHECK (owner IS NULL OR owner IN ('BOT', 'HUMAN')),
  readiness_score numeric(5,2) CHECK (readiness_score IS NULL OR readiness_score BETWEEN 0 AND 100),
  product_id text,
  order_outcome text,
  prompt_version text,
  model_version text,
  policy_version text,
  catalog_version text,
  event_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE IF NOT EXISTS conversation_events_default PARTITION OF conversation_events DEFAULT;
CREATE INDEX IF NOT EXISTS conversation_events_conversation_time_idx
  ON conversation_events (conversation_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS conversation_events_page_type_time_idx
  ON conversation_events (page_id, event_type, occurred_at DESC);

CREATE OR REPLACE FUNCTION lana_create_history_partitions(p_month date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  month_start date := date_trunc('month', p_month)::date;
  month_end date := (month_start + interval '1 month')::date;
  suffix text := to_char(month_start, 'YYYY_MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF messages FOR VALUES FROM (%L) TO (%L)',
    'messages_' || suffix, month_start, month_end
  );
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF conversation_events FOR VALUES FROM (%L) TO (%L)',
    'conversation_events_' || suffix, month_start, month_end
  );
END;
$$;

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL CHECK (actor_type IN ('USER', 'SERVICE', 'SYSTEM')),
  actor_id text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id_hash text,
  metadata_safe jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_ip_hash text,
  session_id_hash text,
  correlation_id uuid NOT NULL,
  previous_hash bytea,
  entry_hash bytea NOT NULL CHECK (octet_length(entry_hash) = 32),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_resource_idx
  ON audit_log (resource_type, resource_id_hash, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx
  ON audit_log (actor_type, actor_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;

CREATE OR REPLACE FUNCTION chain_audit_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  last_hash bytea;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('lana.audit_log.chain'));
  NEW.created_at := clock_timestamp();
  SELECT entry_hash INTO last_hash
  FROM audit_log
  ORDER BY created_at DESC, audit_id DESC
  LIMIT 1;
  NEW.previous_hash := last_hash;
  NEW.entry_hash := digest(
    convert_to(concat_ws('|',
      NEW.audit_id::text,
      NEW.actor_type,
      NEW.actor_id,
      NEW.action,
      NEW.resource_type,
      coalesce(NEW.resource_id_hash, ''),
      NEW.metadata_safe::text,
      coalesce(NEW.source_ip_hash, ''),
      coalesce(NEW.session_id_hash, ''),
      NEW.correlation_id::text,
      coalesce(encode(last_hash, 'hex'), ''),
      NEW.occurred_at::text,
      NEW.created_at::text
    ), 'UTF8'),
    'sha256'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_chain_insert ON audit_log;
CREATE TRIGGER audit_log_chain_insert
  BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION chain_audit_insert();

DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC;
