DROP TABLE IF EXISTS realtime_worker_status;
DROP TABLE IF EXISTS provider_conversation_links;

DROP INDEX IF EXISTS pages_realtime_route_idx;

ALTER TABLE pancake_tag_outbox
  DROP COLUMN IF EXISTS lease_token,
  DROP COLUMN IF EXISTS pancake_conversation_auth_tag,
  DROP COLUMN IF EXISTS pancake_conversation_nonce,
  DROP COLUMN IF EXISTS pancake_conversation_ciphertext;

ALTER TABLE meta_outbox
  DROP COLUMN IF EXISTS lease_token,
  DROP COLUMN IF EXISTS payload_fingerprint;

ALTER TABLE pages
  DROP COLUMN IF EXISTS kill_switch,
  DROP COLUMN IF EXISTS app_send_enabled,
  DROP COLUMN IF EXISTS routing_owner;

DROP INDEX IF EXISTS webhook_inbox_receive_sequence_uk;

ALTER TABLE webhook_inbox
  DROP COLUMN IF EXISTS lease_token,
  DROP COLUMN IF EXISTS receive_sequence;
