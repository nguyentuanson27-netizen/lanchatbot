DROP VIEW IF EXISTS admin_outreach_metrics_v;
DROP VIEW IF EXISTS admin_outreach_messages_v;
DROP TABLE IF EXISTS outreach_responses;
DROP TABLE IF EXISTS outreach_messages;

CREATE OR REPLACE FUNCTION lana_apply_retention(p_now timestamptz DEFAULT now())
RETURNS TABLE (
  messages_deleted bigint,
  events_deleted bigint,
  inbox_payloads_erased bigint,
  outbox_payloads_erased bigint,
  audit_rows_deleted bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM messages WHERE occurred_at < p_now - interval '6 months';
  GET DIAGNOSTICS messages_deleted = ROW_COUNT;

  DELETE FROM message_identities WHERE occurred_at < p_now - interval '6 months';

  DELETE FROM conversation_events WHERE occurred_at < p_now - interval '6 months';
  GET DIAGNOSTICS events_deleted = ROW_COUNT;

  UPDATE webhook_inbox
  SET payload_ciphertext = NULL,
      payload_nonce = NULL,
      payload_auth_tag = NULL,
      payload_encrypted_dek = NULL,
      payload_key_ref = NULL,
      updated_at = p_now
  WHERE payload_ciphertext IS NOT NULL
    AND payload_expires_at <= p_now
    AND status IN ('PROCESSED', 'REJECTED', 'FAILED_PERMANENT');
  GET DIAGNOSTICS inbox_payloads_erased = ROW_COUNT;

  UPDATE meta_outbox
  SET recipient_ciphertext = NULL,
      recipient_nonce = NULL,
      recipient_auth_tag = NULL,
      payload_ciphertext = NULL,
      payload_nonce = NULL,
      payload_auth_tag = NULL,
      payload_encrypted_dek = NULL,
      payload_key_ref = NULL,
      updated_at = p_now
  WHERE (recipient_ciphertext IS NOT NULL OR payload_ciphertext IS NOT NULL)
    AND payload_expires_at <= p_now
    AND status IN ('SENT_ACCEPTED', 'DELIVERED', 'READ', 'FAILED_PERMANENT', 'MANUAL_REVIEW');
  GET DIAGNOSTICS outbox_payloads_erased = ROW_COUNT;

  audit_rows_deleted := 0;
  RETURN NEXT;
END;
$$;
