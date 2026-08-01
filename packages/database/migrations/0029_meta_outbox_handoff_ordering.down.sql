DROP INDEX IF EXISTS pancake_tag_outbox_response_group_idx;

ALTER TABLE pancake_tag_outbox
  DROP COLUMN IF EXISTS after_response_group_id;

ALTER TABLE meta_outbox
  DROP COLUMN IF EXISTS send_after_owner_handoff;
