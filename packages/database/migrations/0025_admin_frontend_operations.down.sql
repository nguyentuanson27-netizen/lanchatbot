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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_readonly') THEN
    GRANT SELECT ON admin_handoff_queue_v TO lana_admin_readonly;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_control_api') THEN
    GRANT SELECT ON admin_handoff_queue_v TO lana_admin_control_api;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS handoff_case_events_no_mutation ON handoff_case_events;
DROP FUNCTION IF EXISTS prevent_handoff_case_event_mutation();
DROP TABLE IF EXISTS handoff_case_events;
DROP INDEX IF EXISTS handoff_cases_sla_queue_idx;

ALTER TABLE handoff_cases
  DROP CONSTRAINT IF EXISTS handoff_cases_priority_ck,
  DROP COLUMN IF EXISTS last_actor_ref,
  DROP COLUMN IF EXISTS revision,
  DROP COLUMN IF EXISTS sla_due_at,
  DROP COLUMN IF EXISTS priority,
  DROP COLUMN IF EXISTS assignee_ref;
