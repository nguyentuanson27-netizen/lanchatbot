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
  occurred_at,
  CASE
    WHEN event_type LIKE 'WAVE2_%'
      THEN event_metadata #>> '{wave2Strategy,need}'
    ELSE NULL
  END AS wave2_need,
  CASE
    WHEN event_type LIKE 'WAVE2_%'
      THEN event_metadata #>> '{wave2Strategy,barrier}'
    ELSE NULL
  END AS wave2_barrier,
  CASE
    WHEN event_type LIKE 'WAVE2_%'
      THEN event_metadata #>> '{wave2Strategy,decisionFactor}'
    ELSE NULL
  END AS wave2_decision_factor,
  CASE
    WHEN event_type LIKE 'WAVE2_%'
      THEN event_metadata #>> '{wave2Strategy,recommendedStrategy}'
    ELSE NULL
  END AS wave2_strategy,
  CASE
    WHEN event_type LIKE 'WAVE2_%'
      THEN event_metadata #>> '{wave2Strategy,ctaPolicy}'
    ELSE NULL
  END AS wave2_cta_policy,
  CASE
    WHEN event_type LIKE 'WAVE2_%'
      THEN event_metadata #>> '{wave2Strategy,experimentId}'
    ELSE NULL
  END AS wave2_experiment_id,
  CASE
    WHEN event_type LIKE 'WAVE2_%'
      THEN event_metadata #>> '{wave2Strategy,experimentVariant}'
    ELSE NULL
  END AS wave2_experiment_variant
FROM conversation_events;

COMMENT ON VIEW admin_conversation_events_v IS
  'PII-free Admin read model with bounded Wave 2 strategy dimensions; raw event metadata remains hidden.';
