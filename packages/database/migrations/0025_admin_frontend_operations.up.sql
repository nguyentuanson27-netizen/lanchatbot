-- FE3 operational projection: SLA/assignment state is mutable, while every
-- transition is recorded in an append-only, PII-free event ledger.
ALTER TABLE handoff_cases
  ADD COLUMN IF NOT EXISTS assignee_ref text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_actor_ref text;

ALTER TABLE handoff_cases
  DROP CONSTRAINT IF EXISTS handoff_cases_priority_ck;
ALTER TABLE handoff_cases
  ADD CONSTRAINT handoff_cases_priority_ck
  CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'));

UPDATE handoff_cases
SET sla_due_at = created_at + interval '30 minutes'
WHERE sla_due_at IS NULL;

ALTER TABLE handoff_cases
  ALTER COLUMN sla_due_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS handoff_cases_sla_queue_idx
  ON handoff_cases (page_id, status, sla_due_at, priority, opening_handoff_id)
  WHERE status IN ('NEW', 'IN_PROGRESS');

CREATE TABLE IF NOT EXISTS handoff_case_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_handoff_id uuid NOT NULL REFERENCES handoff_cases(opening_handoff_id),
  action text NOT NULL CHECK (
    action IN ('CLAIM', 'REASSIGN', 'RESOLVE', 'REOPEN', 'SET_PRIORITY')
  ),
  actor_ref text NOT NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('OWNER', 'EDITOR')),
  idempotency_key text NOT NULL,
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  from_status text NOT NULL CHECK (from_status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
  to_status text NOT NULL CHECK (to_status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
  from_assignee_ref text,
  to_assignee_ref text,
  from_priority text NOT NULL CHECK (from_priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  to_priority text NOT NULL CHECK (to_priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  revision bigint NOT NULL CHECK (revision > 0),
  correlation_id uuid NOT NULL,
  metadata_safe jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT handoff_case_events_actor_idempotency_uk UNIQUE (actor_ref, idempotency_key)
);

CREATE INDEX IF NOT EXISTS handoff_case_events_case_time_idx
  ON handoff_case_events (opening_handoff_id, occurred_at DESC, event_id DESC);

CREATE OR REPLACE FUNCTION prevent_handoff_case_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'handoff_case_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS handoff_case_events_no_mutation ON handoff_case_events;
CREATE TRIGGER handoff_case_events_no_mutation
  BEFORE UPDATE OR DELETE ON handoff_case_events
  FOR EACH ROW EXECUTE FUNCTION prevent_handoff_case_event_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON handoff_case_events FROM PUBLIC;

DROP VIEW IF EXISTS admin_handoff_queue_v;
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
  case_state.assignee_ref,
  case_state.priority,
  case_state.sla_due_at,
  case_state.revision,
  case_state.last_actor_ref,
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

COMMENT ON VIEW admin_handoff_queue_v IS
  'PII-free handoff queue with assignment, optimistic revision and SLA deadline.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_readonly') THEN
    GRANT SELECT ON admin_handoff_queue_v, handoff_case_events TO lana_admin_readonly;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_control_api') THEN
    GRANT SELECT ON admin_handoff_queue_v, handoff_cases, handoff_case_events
      TO lana_admin_control_api;
    GRANT UPDATE (
      status, acknowledged_at, acknowledged_by_ref, resolved_at, resolved_by_ref,
      assignee_ref, priority, revision, last_actor_ref, updated_at
    ) ON handoff_cases TO lana_admin_control_api;
    GRANT INSERT ON handoff_case_events TO lana_admin_control_api;
  END IF;
END;
$$;
