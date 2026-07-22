ALTER TABLE webhook_inbox
  ADD COLUMN IF NOT EXISTS event_kind text NOT NULL DEFAULT 'CUSTOMER',
  ADD COLUMN IF NOT EXISTS evaluation_group_id uuid;

ALTER TABLE webhook_inbox
  DROP CONSTRAINT IF EXISTS webhook_inbox_event_kind_ck;
ALTER TABLE webhook_inbox
  ADD CONSTRAINT webhook_inbox_event_kind_ck
  CHECK (event_kind IN ('CUSTOMER', 'APP_ECHO', 'PAGE_ECHO'));

CREATE INDEX IF NOT EXISTS webhook_inbox_conversation_pending_idx
  ON webhook_inbox (page_id, conversation_hash, event_kind, receive_sequence)
  WHERE status IN ('VERIFIED', 'QUEUED', 'PROCESSING', 'FAILED_RETRYABLE');

CREATE INDEX IF NOT EXISTS webhook_inbox_evaluation_group_idx
  ON webhook_inbox (evaluation_group_id)
  WHERE evaluation_group_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS conversation_ingress_heads (
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_hash text NOT NULL,
  -- The globally increasing inbox receive_sequence is also the activity
  -- generation. A duplicate webhook never obtains a new sequence, so it can
  -- never extend the debounce window or invalidate in-flight work.
  generation bigint NOT NULL CHECK (generation > 0),
  last_customer_receive_sequence bigint,
  quiet_until timestamptz,
  lease_owner text,
  lease_token uuid,
  lease_until timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, conversation_hash),
  CONSTRAINT conversation_ingress_customer_clock_ck CHECK (
    (last_customer_receive_sequence IS NULL AND quiet_until IS NULL)
    OR
    (last_customer_receive_sequence IS NOT NULL AND quiet_until IS NOT NULL)
  ),
  CONSTRAINT conversation_ingress_lease_ck CHECK (
    (lease_owner IS NULL AND lease_token IS NULL AND lease_until IS NULL)
    OR
    (lease_owner IS NOT NULL AND lease_token IS NOT NULL AND lease_until IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS conversation_ingress_heads_due_idx
  ON conversation_ingress_heads (quiet_until, next_attempt_at)
  WHERE quiet_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS conversation_ingress_heads_lease_idx
  ON conversation_ingress_heads (lease_until)
  WHERE lease_until IS NOT NULL;

-- Preserve pending work created by the previous singleton worker. Historical
-- rows cannot expose is_echo without decrypting their payload, so deployment
-- must drain the old worker first; pending legacy rows are conservatively
-- treated as customer messages.
INSERT INTO conversation_ingress_heads (
  page_id, conversation_hash, generation,
  last_customer_receive_sequence, quiet_until, created_at, updated_at
)
SELECT
  page_id,
  conversation_hash,
  max(receive_sequence),
  max(receive_sequence),
  max(received_at) + interval '5 seconds',
  min(created_at),
  now()
FROM webhook_inbox
WHERE status IN ('VERIFIED', 'QUEUED', 'PROCESSING', 'FAILED_RETRYABLE')
  AND receive_sequence IS NOT NULL
GROUP BY page_id, conversation_hash
ON CONFLICT (page_id, conversation_hash) DO NOTHING;
