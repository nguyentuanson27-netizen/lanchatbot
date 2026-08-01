ALTER TABLE meta_outbox
  ADD COLUMN IF NOT EXISTS send_after_owner_handoff boolean NOT NULL DEFAULT false;

ALTER TABLE pancake_tag_outbox
  ADD COLUMN IF NOT EXISTS after_response_group_id uuid;

CREATE INDEX IF NOT EXISTS pancake_tag_outbox_response_group_idx
  ON pancake_tag_outbox (after_response_group_id, status, created_at)
  WHERE after_response_group_id IS NOT NULL
    AND status IN ('PENDING', 'RETRYABLE', 'APPLYING');
