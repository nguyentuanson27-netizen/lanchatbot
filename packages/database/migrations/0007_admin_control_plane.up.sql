CREATE TABLE IF NOT EXISTS admin_commands (
  command_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  command_type text NOT NULL CHECK (command_type IN (
    'HANDOFF_NHAN_VIEN', 'HANDOFF_VAN_DON', 'PAUSE_BOT', 'RESUME_BOT',
    'ADD_TAG', 'REMOVE_TAG', 'SYNC_PANCAKE_TAGS'
  )),
  tag text CHECK (tag IS NULL OR tag IN (
    'NHAN_VIEN', 'VAN_DON', 'DA_CHOT_DON', 'KHONG_UP_SALE'
  )),
  pause_minutes integer CHECK (pause_minutes IS NULL OR pause_minutes IN (15, 60)),
  expected_state_version bigint NOT NULL CHECK (expected_state_version >= 0),
  enqueued_state_version bigint CHECK (enqueued_state_version IS NULL OR enqueued_state_version >= 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'PROCESSING', 'APPLIED', 'FAILED', 'CONFLICT'
  )),
  reason text NOT NULL CHECK (reason IN (
    'ADMIN_HANDOFF', 'CUSTOMER_REQUESTED_HUMAN', 'POST_SALE_SUPPORT',
    'TEMPORARY_PAUSE', 'RESUME_AFTER_REVIEW', 'TAG_CORRECTION',
    'MANUAL_TAG_SYNC', 'ADMIN_TEST'
  )),
  requested_by_subject text NOT NULL CHECK (length(requested_by_subject) BETWEEN 1 AND 256),
  requested_by_role text NOT NULL CHECK (requested_by_role = 'OWNER'),
  correlation_id uuid NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz,
  lease_owner text,
  lease_token uuid,
  lease_until timestamptz,
  error_code text,
  applied_state_version bigint CHECK (applied_state_version IS NULL OR applied_state_version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT admin_commands_actor_idempotency_uk
    UNIQUE (requested_by_subject, idempotency_key),
  CONSTRAINT admin_commands_arguments_ck CHECK (
    (command_type = 'PAUSE_BOT' AND pause_minutes IN (15, 60) AND tag IS NULL)
    OR (command_type IN ('ADD_TAG', 'REMOVE_TAG') AND tag IS NOT NULL AND pause_minutes IS NULL)
    OR (command_type NOT IN ('PAUSE_BOT', 'ADD_TAG', 'REMOVE_TAG') AND tag IS NULL AND pause_minutes IS NULL)
  ),
  CONSTRAINT admin_commands_reason_ck CHECK (
    (command_type IN ('HANDOFF_NHAN_VIEN', 'HANDOFF_VAN_DON')
      AND reason IN ('ADMIN_HANDOFF', 'CUSTOMER_REQUESTED_HUMAN', 'POST_SALE_SUPPORT', 'ADMIN_TEST'))
    OR (command_type = 'PAUSE_BOT' AND reason IN ('TEMPORARY_PAUSE', 'ADMIN_TEST'))
    OR (command_type = 'RESUME_BOT' AND reason IN ('RESUME_AFTER_REVIEW', 'ADMIN_TEST'))
    OR (command_type IN ('ADD_TAG', 'REMOVE_TAG') AND reason IN ('TAG_CORRECTION', 'ADMIN_TEST'))
    OR (command_type = 'SYNC_PANCAKE_TAGS' AND reason IN ('MANUAL_TAG_SYNC', 'TAG_CORRECTION', 'ADMIN_TEST'))
  ),
  CONSTRAINT admin_commands_terminal_ck CHECK (
    (status NOT IN ('APPLIED', 'FAILED', 'CONFLICT') OR completed_at IS NOT NULL)
    AND (status <> 'APPLIED' OR applied_state_version IS NOT NULL)
    AND (status <> 'FAILED' OR error_code IS NOT NULL)
    AND (status <> 'CONFLICT' OR error_code IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS admin_commands_dispatch_idx
  ON admin_commands (status, next_attempt_at, lease_until, created_at)
  WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX IF NOT EXISTS admin_commands_conversation_time_idx
  ON admin_commands (conversation_id, created_at DESC, command_id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS admin_commands_one_active_version_idx
  ON admin_commands (conversation_id, expected_state_version)
  WHERE status IN ('PENDING', 'PROCESSING');

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_blocking_tag_check;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_blocking_tag_check CHECK (
    blocking_tag IS NULL OR blocking_tag IN (
      'NHAN_VIEN', 'VAN_DON', 'DA_CHOT_DON', 'KHONG_UP_SALE'
    )
  );

ALTER TABLE pancake_tag_outbox
  DROP CONSTRAINT IF EXISTS pancake_tag_outbox_desired_tag_check;
ALTER TABLE pancake_tag_outbox
  ADD CONSTRAINT pancake_tag_outbox_desired_tag_check CHECK (
    desired_tag IN ('NHAN_VIEN', 'VAN_DON', 'DA_CHOT_DON', 'KHONG_UP_SALE')
  );
ALTER TABLE pancake_tag_outbox
  DROP CONSTRAINT IF EXISTS pancake_tag_outbox_operation_check;
ALTER TABLE pancake_tag_outbox
  ADD CONSTRAINT pancake_tag_outbox_operation_check CHECK (
    operation IN ('ADD', 'REMOVE')
  );
ALTER TABLE pancake_tag_outbox
  DROP CONSTRAINT IF EXISTS pancake_tag_desired_state_uk;
ALTER TABLE pancake_tag_outbox
  ADD CONSTRAINT pancake_tag_desired_state_uk UNIQUE
    (conversation_id, desired_tag, operation, handoff_generation);
ALTER TABLE pancake_tag_outbox
  ADD COLUMN IF NOT EXISTS source_admin_command_id uuid
    REFERENCES admin_commands(command_id);
CREATE UNIQUE INDEX IF NOT EXISTS pancake_tag_outbox_admin_command_uk
  ON pancake_tag_outbox (source_admin_command_id, desired_tag, operation)
  WHERE source_admin_command_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_command_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id uuid NOT NULL REFERENCES admin_commands(command_id),
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  event_type text NOT NULL CHECK (event_type IN ('CREATED', 'STATUS_CHANGED')),
  from_status text CHECK (from_status IS NULL OR from_status IN (
    'PENDING', 'PROCESSING', 'APPLIED', 'FAILED', 'CONFLICT'
  )),
  to_status text NOT NULL CHECK (to_status IN (
    'PENDING', 'PROCESSING', 'APPLIED', 'FAILED', 'CONFLICT'
  )),
  actor_type text NOT NULL CHECK (actor_type IN ('USER', 'SERVICE', 'SYSTEM')),
  actor_ref text NOT NULL,
  metadata_safe jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_command_events_command_time_idx
  ON admin_command_events (command_id, occurred_at DESC, event_id DESC);

CREATE OR REPLACE FUNCTION prevent_admin_command_event_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'admin_command_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS admin_command_events_no_mutation ON admin_command_events;
CREATE TRIGGER admin_command_events_no_mutation
  BEFORE UPDATE OR DELETE ON admin_command_events
  FOR EACH ROW EXECUTE FUNCTION prevent_admin_command_event_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON admin_command_events FROM PUBLIC;

CREATE OR REPLACE VIEW admin_commands_v
WITH (security_barrier = true) AS
SELECT
  command_id,
  page_id,
  conversation_id,
  command_type,
  tag,
  pause_minutes,
  expected_state_version,
  enqueued_state_version,
  status,
  reason,
  left(encode(digest(requested_by_subject, 'sha256'), 'hex'), 16) AS requested_by_ref,
  correlation_id,
  attempt_count,
  next_attempt_at,
  lease_until,
  error_code,
  applied_state_version,
  created_at,
  updated_at,
  started_at,
  completed_at
FROM admin_commands;

CREATE OR REPLACE VIEW admin_command_events_v
WITH (security_barrier = true) AS
SELECT
  event_id,
  command_id,
  page_id,
  conversation_id,
  event_type,
  from_status,
  to_status,
  actor_type,
  left(encode(digest(actor_ref, 'sha256'), 'hex'), 16) AS actor_ref,
  metadata_safe,
  occurred_at
FROM admin_command_events;
