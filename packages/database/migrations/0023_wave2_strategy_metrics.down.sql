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
