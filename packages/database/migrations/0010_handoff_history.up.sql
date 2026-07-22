-- Immutable ownership-transition ledger. This table intentionally contains no
-- raw provider id, customer id or message text. The UI reads the redacted
-- trigger message through trigger_message_pk. The structured ledger is kept
-- for 12 months (purged later by an audited DBA job); canonical message text
-- expires after six months, so the soft join naturally becomes NULL.
CREATE TABLE IF NOT EXISTS handoff_events (
  handoff_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  direction text NOT NULL CHECK (direction IN ('BOT_TO_HUMAN', 'HUMAN_TO_BOT')),
  source text NOT NULL CHECK (
    source IN ('BOT_POLICY', 'CUSTOMER_REQUEST', 'POST_SALE', 'ADMIN')
  ),
  reason_code text NOT NULL CHECK (length(reason_code) BETWEEN 1 AND 128),
  reason_detail_safe jsonb NOT NULL DEFAULT '{}'::jsonb,
  product_id text,
  facts_status text CHECK (
    facts_status IS NULL OR facts_status IN ('OK', 'STALE', 'AMBIGUOUS', 'NOT_FOUND', 'ERROR')
  ),
  facts_reason_code text,
  desired_tag text CHECK (desired_tag IS NULL OR desired_tag IN ('NHAN_VIEN', 'VAN_DON')),
  owner_before text NOT NULL CHECK (owner_before IN ('BOT', 'HUMAN')),
  owner_after text NOT NULL CHECK (owner_after IN ('BOT', 'HUMAN')),
  handoff_generation bigint NOT NULL CHECK (handoff_generation >= 0),
  trigger_event_key_hash text NOT NULL CHECK (
    trigger_event_key_hash ~ '^[0-9a-f]{64}$'
  ),
  -- Soft reference by design: canonical message retention is six months while
  -- the PII-free handoff ledger is retained independently.
  trigger_message_pk uuid,
  source_admin_command_id uuid REFERENCES admin_commands(command_id),
  related_handoff_id uuid REFERENCES handoff_events(handoff_id),
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handoff_events_owner_transition_ck CHECK (owner_before <> owner_after),
  CONSTRAINT handoff_events_direction_ck CHECK (
    (direction = 'BOT_TO_HUMAN' AND owner_before = 'BOT' AND owner_after = 'HUMAN')
    OR
    (direction = 'HUMAN_TO_BOT' AND owner_before = 'HUMAN' AND owner_after = 'BOT')
  ),
  CONSTRAINT handoff_events_admin_source_ck CHECK (
    (source = 'ADMIN' AND source_admin_command_id IS NOT NULL)
    OR (source <> 'ADMIN' AND source_admin_command_id IS NULL)
  ),
  CONSTRAINT handoff_events_trigger_generation_uk UNIQUE
    (conversation_id, direction, trigger_event_key_hash, handoff_generation)
);

CREATE INDEX IF NOT EXISTS handoff_events_conversation_time_idx
  ON handoff_events (conversation_id, occurred_at DESC, handoff_id DESC);
CREATE INDEX IF NOT EXISTS handoff_events_trigger_message_idx
  ON handoff_events (trigger_message_pk)
  WHERE trigger_message_pk IS NOT NULL;
CREATE INDEX IF NOT EXISTS handoff_events_queue_idx
  ON handoff_events (page_id, desired_tag, source, occurred_at DESC)
  WHERE direction = 'BOT_TO_HUMAN';
CREATE UNIQUE INDEX IF NOT EXISTS handoff_events_admin_direction_uk
  ON handoff_events (source_admin_command_id, direction)
  WHERE source_admin_command_id IS NOT NULL;

-- Mutable operational projection. Ownership transitions stay immutable in
-- handoff_events; acknowledging/resolving a queue item only changes this row.
CREATE TABLE IF NOT EXISTS handoff_cases (
  opening_handoff_id uuid PRIMARY KEY REFERENCES handoff_events(handoff_id),
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  status text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
  acknowledged_at timestamptz,
  acknowledged_by_ref text,
  resolved_at timestamptz,
  resolved_by_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handoff_cases_lifecycle_ck CHECK (
    (status = 'NEW' AND acknowledged_at IS NULL AND resolved_at IS NULL)
    OR (status = 'IN_PROGRESS' AND acknowledged_at IS NOT NULL AND resolved_at IS NULL)
    OR (status = 'RESOLVED' AND resolved_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS handoff_cases_one_active_conversation_idx
  ON handoff_cases (conversation_id)
  WHERE status IN ('NEW', 'IN_PROGRESS');
CREATE INDEX IF NOT EXISTS handoff_cases_queue_idx
  ON handoff_cases (page_id, status, created_at, opening_handoff_id);

CREATE OR REPLACE FUNCTION prevent_handoff_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'handoff_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS handoff_events_no_mutation ON handoff_events;
CREATE TRIGGER handoff_events_no_mutation
  BEFORE UPDATE OR DELETE ON handoff_events
  FOR EACH ROW EXECUTE FUNCTION prevent_handoff_event_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON handoff_events FROM PUBLIC;

CREATE OR REPLACE VIEW admin_handoff_queue_v
WITH (security_barrier = true) AS
SELECT
  event.handoff_id,
  event.page_id,
  event.conversation_id,
  event.direction,
  event.source,
  event.reason_code,
  event.reason_detail_safe,
  event.product_id,
  event.facts_status,
  event.facts_reason_code,
  event.desired_tag,
  event.owner_before,
  event.owner_after,
  event.handoff_generation,
  event.trigger_message_pk,
  message.text_redacted AS trigger_text_redacted_safe,
  message.message_type AS trigger_message_type,
  message.attachment_count AS trigger_attachment_count,
  case_state.status,
  case_state.acknowledged_at,
  case_state.acknowledged_by_ref,
  case_state.resolved_at,
  case_state.resolved_by_ref,
  tag_outbox.status AS pancake_sync_status,
  tag_outbox.last_error_code AS pancake_sync_error_code,
  event.occurred_at,
  event.created_at,
  case_state.updated_at
FROM handoff_events AS event
JOIN handoff_cases AS case_state
  ON case_state.opening_handoff_id = event.handoff_id
LEFT JOIN messages AS message
  ON message.message_pk = event.trigger_message_pk
 AND message.conversation_id = event.conversation_id
 AND message.dlp_status = 'PASSED'
LEFT JOIN LATERAL (
  SELECT status, last_error_code
  FROM pancake_tag_outbox
  WHERE conversation_id = event.conversation_id
    AND desired_tag = event.desired_tag
    AND handoff_generation = event.handoff_generation
    AND operation = 'ADD'
  ORDER BY created_at DESC, operation_id DESC
  LIMIT 1
) AS tag_outbox ON true
WHERE event.direction = 'BOT_TO_HUMAN';

CREATE OR REPLACE VIEW admin_handoff_history_v
WITH (security_barrier = true) AS
SELECT
  event.handoff_id,
  event.page_id,
  event.conversation_id,
  event.direction,
  event.source,
  event.reason_code,
  event.reason_detail_safe,
  event.product_id,
  event.facts_status,
  event.facts_reason_code,
  event.desired_tag,
  event.owner_before,
  event.owner_after,
  event.handoff_generation,
  event.trigger_message_pk,
  message.text_redacted AS trigger_text_redacted_safe,
  message.message_type AS trigger_message_type,
  message.attachment_count AS trigger_attachment_count,
  event.source_admin_command_id,
  event.related_handoff_id,
  event.occurred_at,
  event.created_at
FROM handoff_events AS event
LEFT JOIN messages AS message
  ON message.message_pk = event.trigger_message_pk
 AND message.conversation_id = event.conversation_id
 AND message.dlp_status = 'PASSED';
