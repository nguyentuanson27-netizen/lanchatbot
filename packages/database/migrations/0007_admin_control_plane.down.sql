DROP VIEW IF EXISTS admin_command_events_v;
DROP VIEW IF EXISTS admin_commands_v;
DROP TRIGGER IF EXISTS admin_command_events_no_mutation ON admin_command_events;
DROP FUNCTION IF EXISTS prevent_admin_command_event_mutation();
DROP TABLE IF EXISTS admin_command_events;
DROP INDEX IF EXISTS pancake_tag_outbox_admin_command_uk;
ALTER TABLE pancake_tag_outbox DROP COLUMN IF EXISTS source_admin_command_id;
ALTER TABLE pancake_tag_outbox DROP CONSTRAINT IF EXISTS pancake_tag_desired_state_uk;
ALTER TABLE pancake_tag_outbox ADD CONSTRAINT pancake_tag_desired_state_uk UNIQUE
  (conversation_id, desired_tag, handoff_generation);
ALTER TABLE pancake_tag_outbox DROP CONSTRAINT IF EXISTS pancake_tag_outbox_operation_check;
ALTER TABLE pancake_tag_outbox ADD CONSTRAINT pancake_tag_outbox_operation_check CHECK
  (operation = 'ADD');
ALTER TABLE pancake_tag_outbox DROP CONSTRAINT IF EXISTS pancake_tag_outbox_desired_tag_check;
ALTER TABLE pancake_tag_outbox ADD CONSTRAINT pancake_tag_outbox_desired_tag_check CHECK
  (desired_tag IN ('NHAN_VIEN', 'VAN_DON'));
DROP TABLE IF EXISTS admin_commands;
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_blocking_tag_check;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_blocking_tag_check CHECK (
    blocking_tag IS NULL OR blocking_tag IN ('NHAN_VIEN', 'VAN_DON')
  );
