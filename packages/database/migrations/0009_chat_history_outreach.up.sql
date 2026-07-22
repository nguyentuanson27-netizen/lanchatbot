CREATE TABLE IF NOT EXISTS outreach_messages (
  outreach_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  customer_hash text NOT NULL,
  source_event_key_hash text NOT NULL,
  provider_message_id_hash text,
  content_hash text NOT NULL,
  template_id text NOT NULL CHECK (template_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  template_version text NOT NULL CHECK (template_version ~ '^[A-Za-z0-9._:-]{1,64}$'),
  matched_rule text NOT NULL DEFAULT 'UPSALE_CONTAINS_FRAGMENT'
    CHECK (matched_rule ~ '^[A-Za-z0-9._:-]{1,128}$'),
  status text NOT NULL DEFAULT 'SENT'
    CHECK (status IN ('SENT', 'DELIVERED', 'READ', 'FAILED')),
  response_status text NOT NULL DEFAULT 'NONE'
    CHECK (response_status IN ('NONE', 'RESPONDED_24H', 'RESPONDED_LATE')),
  response_intent text,
  sent_at timestamptz NOT NULL,
  delivered_at timestamptz,
  read_at timestamptz,
  responded_at timestamptz,
  order_confirmed_at timestamptz,
  order_value numeric(14,2) CHECK (order_value IS NULL OR order_value >= 0),
  currency char(3) NOT NULL DEFAULT 'VND',
  metadata_safe jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata_safe) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_messages_event_uk UNIQUE (page_id, source_event_key_hash),
  CONSTRAINT outreach_messages_delivery_ck CHECK (
    delivered_at IS NULL OR delivered_at >= sent_at
  ),
  CONSTRAINT outreach_messages_read_ck CHECK (
    read_at IS NULL OR read_at >= sent_at
  ),
  CONSTRAINT outreach_messages_response_ck CHECK (
    (response_status = 'NONE' AND responded_at IS NULL)
    OR (response_status <> 'NONE' AND responded_at IS NOT NULL)
  ),
  CONSTRAINT outreach_messages_conversion_ck CHECK (
    (order_confirmed_at IS NULL AND order_value IS NULL)
    OR order_confirmed_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS outreach_messages_provider_message_uk
  ON outreach_messages (page_id, provider_message_id_hash)
  WHERE provider_message_id_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS outreach_messages_customer_time_idx
  ON outreach_messages (page_id, customer_hash, sent_at DESC);
CREATE INDEX IF NOT EXISTS outreach_messages_template_time_idx
  ON outreach_messages (page_id, template_id, template_version, sent_at DESC);
CREATE INDEX IF NOT EXISTS outreach_messages_retention_idx
  ON outreach_messages (sent_at);

CREATE TABLE IF NOT EXISTS outreach_responses (
  response_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_id uuid NOT NULL REFERENCES outreach_messages(outreach_id) ON DELETE CASCADE,
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  customer_hash text NOT NULL,
  response_message_id_hash text NOT NULL,
  response_intent text NOT NULL DEFAULT 'UNKNOWN'
    CHECK (response_intent ~ '^[A-Z0-9_:-]{1,64}$'),
  sentiment text NOT NULL DEFAULT 'UNKNOWN'
    CHECK (sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'UNKNOWN')),
  is_positive boolean NOT NULL DEFAULT false,
  is_opt_out boolean NOT NULL DEFAULT false,
  responded_at timestamptz NOT NULL,
  response_seconds integer NOT NULL CHECK (response_seconds >= 0),
  attribution_window_hours integer NOT NULL DEFAULT 24
    CHECK (attribution_window_hours = 24),
  metadata_safe jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata_safe) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_responses_provider_message_uk
    UNIQUE (page_id, response_message_id_hash)
);

CREATE INDEX IF NOT EXISTS outreach_responses_outreach_time_idx
  ON outreach_responses (outreach_id, responded_at);

CREATE OR REPLACE VIEW admin_outreach_messages_v
WITH (security_barrier = true) AS
SELECT
  outreach_id,
  conversation_id,
  page_id,
  template_id,
  template_version,
  status,
  response_status,
  response_intent,
  sent_at,
  delivered_at,
  read_at,
  responded_at,
  order_confirmed_at,
  order_value,
  created_at
FROM outreach_messages;

CREATE OR REPLACE VIEW admin_outreach_metrics_v
WITH (security_barrier = true) AS
SELECT
  page_id,
  date_trunc('day', sent_at) AS period_start,
  date_trunc('day', sent_at) + interval '1 day' AS period_end,
  count(*)::bigint AS total,
  count(*) FILTER (WHERE status IN ('SENT', 'DELIVERED', 'READ'))::bigint AS sent,
  count(*) FILTER (WHERE delivered_at IS NOT NULL)::bigint AS delivered,
  count(*) FILTER (WHERE read_at IS NOT NULL)::bigint AS read,
  count(*) FILTER (WHERE response_status = 'RESPONDED_24H')::bigint AS responded_24h,
  count(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM outreach_responses response
      WHERE response.outreach_id = outreach_messages.outreach_id
        AND response.is_positive
    )
  )::bigint AS positive_responses,
  count(*) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM outreach_responses response
      WHERE response.outreach_id = outreach_messages.outreach_id
        AND response.is_opt_out
    )
  )::bigint AS opt_outs,
  count(*) FILTER (
    WHERE order_confirmed_at IS NOT NULL
      AND order_confirmed_at <= sent_at + interval '7 days'
  )::bigint AS converted_7d,
  coalesce(sum(order_value) FILTER (
    WHERE order_confirmed_at IS NOT NULL
      AND order_confirmed_at <= sent_at + interval '7 days'
  ), 0)::numeric(14,2) AS revenue,
  avg(extract(epoch FROM (responded_at - sent_at))) FILTER (
    WHERE responded_at IS NOT NULL
  )::numeric(14,2) AS avg_response_seconds,
  max(updated_at) AS updated_at
FROM outreach_messages
GROUP BY page_id, date_trunc('day', sent_at);

CREATE OR REPLACE FUNCTION lana_apply_retention(p_now timestamptz DEFAULT now())
RETURNS TABLE (
  messages_deleted bigint,
  events_deleted bigint,
  inbox_payloads_erased bigint,
  outbox_payloads_erased bigint,
  audit_rows_deleted bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM messages WHERE occurred_at < p_now - interval '6 months';
  GET DIAGNOSTICS messages_deleted = ROW_COUNT;

  DELETE FROM message_identities WHERE occurred_at < p_now - interval '6 months';

  DELETE FROM conversation_events WHERE occurred_at < p_now - interval '6 months';
  GET DIAGNOSTICS events_deleted = ROW_COUNT;

  -- Responses are removed by ON DELETE CASCADE. Neither table stores raw outreach text.
  DELETE FROM outreach_messages WHERE sent_at < p_now - interval '6 months';

  UPDATE webhook_inbox
  SET payload_ciphertext = NULL,
      payload_nonce = NULL,
      payload_auth_tag = NULL,
      payload_encrypted_dek = NULL,
      payload_key_ref = NULL,
      updated_at = p_now
  WHERE payload_ciphertext IS NOT NULL
    AND payload_expires_at <= p_now
    AND status IN ('PROCESSED', 'REJECTED', 'FAILED_PERMANENT');
  GET DIAGNOSTICS inbox_payloads_erased = ROW_COUNT;

  UPDATE meta_outbox
  SET recipient_ciphertext = NULL,
      recipient_nonce = NULL,
      recipient_auth_tag = NULL,
      payload_ciphertext = NULL,
      payload_nonce = NULL,
      payload_auth_tag = NULL,
      payload_encrypted_dek = NULL,
      payload_key_ref = NULL,
      updated_at = p_now
  WHERE (recipient_ciphertext IS NOT NULL OR payload_ciphertext IS NOT NULL)
    AND payload_expires_at <= p_now
    AND status IN ('SENT_ACCEPTED', 'DELIVERED', 'READ', 'FAILED_PERMANENT', 'MANUAL_REVIEW');
  GET DIAGNOSTICS outbox_payloads_erased = ROW_COUNT;

  audit_rows_deleted := 0;
  RETURN NEXT;
END;
$$;
