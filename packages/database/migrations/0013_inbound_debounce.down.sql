DROP INDEX IF EXISTS conversation_ingress_heads_lease_idx;
DROP INDEX IF EXISTS conversation_ingress_heads_due_idx;
DROP TABLE IF EXISTS conversation_ingress_heads;

DROP INDEX IF EXISTS webhook_inbox_evaluation_group_idx;
DROP INDEX IF EXISTS webhook_inbox_conversation_pending_idx;

ALTER TABLE webhook_inbox
  DROP CONSTRAINT IF EXISTS webhook_inbox_event_kind_ck;
ALTER TABLE webhook_inbox
  DROP COLUMN IF EXISTS evaluation_group_id,
  DROP COLUMN IF EXISTS event_kind;
