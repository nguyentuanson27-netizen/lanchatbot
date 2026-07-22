CREATE OR REPLACE VIEW admin_pages_v
WITH (security_barrier = true) AS
SELECT
  page_id,
  page_alias,
  status,
  routing_owner,
  app_send_enabled,
  kill_switch,
  (meta_verify_secret_ref IS NOT NULL) AS has_meta_verify_secret,
  (meta_send_secret_ref IS NOT NULL) AS has_meta_send_secret,
  (pancake_read_tag_secret_ref IS NOT NULL) AS has_pancake_secret,
  (handoff_employee_tag_id IS NOT NULL) AS has_employee_tag,
  (handoff_post_sale_tag_id IS NOT NULL) AS has_post_sale_tag,
  created_at,
  updated_at
FROM pages;

CREATE OR REPLACE VIEW admin_conversations_v
WITH (security_barrier = true) AS
SELECT
  conversation_id,
  page_id,
  left(customer_hash, 12) AS customer_ref,
  routing_owner,
  conversation_owner,
  owner_lease_until,
  blocking_tag,
  blocking_tag_verified_at,
  state_version,
  nullif(state_snapshot ->> 'tagGateStatus', '') AS tag_gate_status,
  nullif(state_snapshot ->> 'currentProductId', '') AS product_id,
  nullif(state_snapshot ->> 'salesStage', '') AS sales_stage,
  nullif(state_snapshot #>> '{consideredVariant,size}', '') AS considered_size,
  nullif(state_snapshot #>> '{unresolvedQuestions,0}', '') AS unresolved_question,
  last_provider_occurred_at,
  last_received_at,
  first_seen_at,
  updated_at,
  expires_at
FROM conversations;

CREATE OR REPLACE VIEW admin_messages_v
WITH (security_barrier = true) AS
SELECT
  message_pk,
  page_id,
  conversation_id,
  direction,
  sender_type,
  message_type,
  text_redacted AS text_redacted_safe,
  'PASSED'::text AS dlp_status,
  attachment_count,
  product_id,
  sales_stage,
  intent,
  outcome,
  prompt_version,
  model_version,
  policy_version,
  catalog_version,
  provider_occurred_at,
  received_at,
  occurred_at
FROM messages
WHERE dlp_status = 'PASSED';

CREATE OR REPLACE VIEW admin_conversation_events_v
WITH (security_barrier = true) AS
SELECT
  event_id,
  conversation_id,
  page_id,
  event_type,
  intent,
  stage,
  action,
  handoff_reason,
  owner,
  readiness_score,
  product_id,
  order_outcome,
  prompt_version,
  model_version,
  policy_version,
  catalog_version,
  occurred_at
FROM conversation_events;

CREATE OR REPLACE VIEW admin_evaluations_v
WITH (security_barrier = true) AS
SELECT
  evaluation_id,
  source_occurred_at,
  conversation_id,
  page_id,
  status,
  attempt_count,
  completed_at,
  prompt_version,
  model_provider,
  model_name,
  model_version,
  nullif(proposal ->> 'intent', '') AS intent,
  nullif(proposal ->> 'action', '') AS proposed_action,
  nullif(guarded_plan ->> 'action', '') AS guarded_action,
  blocked_reason_codes,
  actual_outbound_count,
  text_similarity,
  CASE
    WHEN jsonb_typeof(quality_assessment -> 'scores' -> 'overall') = 'number'
    THEN (quality_assessment -> 'scores' ->> 'overall')::numeric
    ELSE NULL
  END AS quality_overall_score,
  latency_ms,
  business_fact_status,
  business_fact_source,
  business_fact_observed_at,
  business_fact_expires_at,
  business_fact_product_id,
  business_fact_reason_code,
  error_code,
  created_at,
  updated_at
FROM shadow_evaluations;

CREATE OR REPLACE VIEW admin_worker_status_v
WITH (security_barrier = true) AS
SELECT
  'SHADOW'::text AS worker_type,
  worker_id,
  NULL::text AS page_id,
  status,
  NULL::text AS mode,
  false AS send_enabled,
  model_name,
  last_seen_at,
  last_success_at,
  last_error_code,
  updated_at
FROM shadow_worker_status
UNION ALL
SELECT
  'REALTIME'::text AS worker_type,
  worker_id,
  NULL::text AS page_id,
  status,
  mode,
  send_enabled,
  NULL::text AS model_name,
  last_seen_at,
  last_success_at,
  last_error_code,
  updated_at
FROM realtime_worker_status;

CREATE OR REPLACE VIEW admin_inbox_v
WITH (security_barrier = true) AS
SELECT
  inbox_id,
  page_id,
  provider,
  status,
  provider_occurred_at,
  received_at,
  attempt_count,
  next_attempt_at,
  lease_until,
  last_error_code,
  processed_at,
  created_at,
  updated_at
FROM webhook_inbox;

CREATE OR REPLACE VIEW admin_meta_outbox_v
WITH (security_barrier = true) AS
SELECT
  outbox_id,
  reply_plan_id,
  response_group_id,
  conversation_id,
  page_id,
  sequence_no,
  status,
  attempt_count,
  lease_until,
  next_attempt_at,
  request_started_at,
  accepted_at,
  delivered_at,
  read_at,
  ambiguity_reason,
  last_error_code,
  created_at,
  updated_at
FROM meta_outbox;

CREATE OR REPLACE VIEW admin_pancake_outbox_v
WITH (security_barrier = true) AS
SELECT
  operation_id,
  conversation_id,
  page_id,
  desired_tag,
  operation,
  status,
  attempt_count,
  lease_until,
  next_attempt_at,
  last_error_code,
  applied_at,
  created_at,
  updated_at
FROM pancake_tag_outbox;

CREATE OR REPLACE VIEW admin_audit_v
WITH (security_barrier = true) AS
SELECT
  audit_id,
  actor_type,
  CASE
    WHEN actor_type = 'USER' THEN actor_id
    ELSE left(actor_id, 64)
  END AS actor_id_safe,
  action,
  resource_type,
  resource_id_hash,
  metadata_safe,
  correlation_id,
  occurred_at,
  created_at
FROM audit_log;
