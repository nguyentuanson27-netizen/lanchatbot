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
  END AS wave2_experiment_variant,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      THEN 1
    ELSE NULL
  END AS decision_observability_schema_version,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND jsonb_typeof(
      event_metadata #> '{decisionObservability,dialogueEvidence,codes}'
    ) = 'array'
      THEN COALESCE(
        (
          SELECT jsonb_agg(bounded_code.code ORDER BY bounded_code.ordinality)
          FROM (
            SELECT code, ordinality
            FROM jsonb_array_elements_text(
              event_metadata #> '{decisionObservability,dialogueEvidence,codes}'
            ) WITH ORDINALITY AS dialogue_code(code, ordinality)
            WHERE code IN (
              'DIRECT_PURCHASE_VERB',
              'SHIP_REQUEST',
              'CONFIRMED_SIZE',
              'CONFIRMED_COLOR',
              'COMPONENT_SELECTION',
              'MODEL_BUYING_COMMITTED',
              'TEXT_OCCASION',
              'TEXT_STYLE',
              'TEXT_BUDGET',
              'TEXT_PRICE_OBJECTION',
              'TEXT_FIT_OBJECTION',
              'TEXT_MATERIAL_OBJECTION',
              'TEXT_TRUST_OBJECTION',
              'TEXT_DELIVERY_OBJECTION',
              'TEXT_CHOICE_OVERLOAD',
              'STATE_OBJECTION',
              'STATE_PRODUCT_MATCHED',
              'STATE_BUYING_SIGNAL',
              'STATE_MEASUREMENTS_PRESENT',
              'REQUESTED_MATERIAL_PROOF',
              'REQUESTED_SOCIAL_PROOF',
              'MODEL_ANALYSIS_ACCEPTED',
              'DETERMINISTIC_FALLBACK'
            )
            ORDER BY ordinality
            LIMIT 16
          ) AS bounded_code
        ),
        '[]'::jsonb
      )
    ELSE NULL
  END AS dialogue_evidence_codes,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,buyingIntent,decision}' IN (
      'NONE',
      'CONSIDERING',
      'COMMITTED',
      'NEGATED'
    ) THEN event_metadata #>> '{decisionObservability,buyingIntent,decision}'
    ELSE NULL
  END AS buying_intent_decision,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,protectedClaimValidation,outcome}' IN (
      'NOT_EVALUATED',
      'NO_PROTECTED_CLAIMS',
      'VALIDATED',
      'PARTIALLY_BLOCKED',
      'BLOCKED'
    ) THEN event_metadata #>> '{decisionObservability,protectedClaimValidation,outcome}'
    ELSE NULL
  END AS protected_claim_validation_outcome,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,readiness,outcome}' IN (
      'NOT_EVALUATED',
      'LEGACY_READY',
      'LEGACY_NOT_READY'
    ) THEN event_metadata #>> '{decisionObservability,readiness,outcome}'
    ELSE NULL
  END AS readiness_outcome,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,phaseBarrier,phase}' IN (
      'NOT_EVALUATED',
      'DISCOVERY',
      'PRODUCT_MATCHED',
      'FACTS_PRESENTED',
      'FIT_CONSULTING',
      'MEASUREMENTS_REQUIRED',
      'SIZE_RECOMMENDED',
      'OBJECTION_HANDLING',
      'READY_TO_BUY',
      'CART_OPEN',
      'ORDER_REVIEW',
      'ORDER_PREVIEW',
      'PURCHASE_CONFIRMED',
      'HANDED_OFF',
      'POST_SALE'
    ) THEN event_metadata #>> '{decisionObservability,phaseBarrier,phase}'
    ELSE NULL
  END AS phase_observed,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,phaseBarrier,barrier}' IN (
      'NOT_EVALUATED',
      'NONE',
      'BARRIER_PRICE',
      'BARRIER_FIT',
      'BARRIER_MATERIAL',
      'BARRIER_TRUST',
      'BARRIER_DELIVERY',
      'CHOICE_OVERLOAD'
    ) THEN event_metadata #>> '{decisionObservability,phaseBarrier,barrier}'
    ELSE NULL
  END AS barrier_observed,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,context,contextVersion}' = 'LEGACY_CONTEXT_V1'
      THEN 'LEGACY_CONTEXT_V1'
    ELSE NULL
  END AS context_version_observed,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,strategyCta,strategy}' IN (
      'NONE',
      'STRATEGY_RECOMMEND_PRODUCT',
      'STRATEGY_SHOW_PROOF',
      'STRATEGY_ANSWER_OBJECTION',
      'STRATEGY_ASK_CLARIFY',
      'STRATEGY_CLOSE'
    ) THEN event_metadata #>> '{decisionObservability,strategyCta,strategy}'
    ELSE NULL
  END AS strategy_observed,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,strategyCta,cta}' IN (
      'NONE',
      'ASK_OCCASION',
      'ASK_STYLE',
      'ASK_BUDGET',
      'ASK_MEASUREMENTS',
      'ASK_PROOF_PREFERENCE',
      'REDUCE_TO_TWO',
      'POST_MEDIA_CLOSE',
      'NO_ADDITIONAL_CTA'
    ) THEN event_metadata #>> '{decisionObservability,strategyCta,cta}'
    ELSE NULL
  END AS cta_observed,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,reconciliation,outcome}' IN (
      'NOT_APPLIED',
      'PRESERVED',
      'OVERRIDDEN',
      'REJECTED'
    ) THEN event_metadata #>> '{decisionObservability,reconciliation,outcome}'
    ELSE NULL
  END AS reconciliation_outcome,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,guard,outcome}' IN (
      'NOT_EVALUATED',
      'ALLOWED',
      'BLOCKED'
    ) THEN event_metadata #>> '{decisionObservability,guard,outcome}'
    ELSE NULL
  END AS guard_outcome_observed,
  CASE
    WHEN event_metadata #>> '{decisionObservability,schemaVersion}' = '1'
      AND event_metadata #>> '{decisionObservability,sideEffectPlan,disposition}' IN (
      'NONE',
      'PLANNED',
      'SAFE_FALLBACK_PLANNED',
      'BLOCKED'
    ) THEN event_metadata #>> '{decisionObservability,sideEffectPlan,disposition}'
    ELSE NULL
  END AS side_effect_plan_disposition
FROM conversation_events;

COMMENT ON VIEW admin_conversation_events_v IS
  'PII-free Admin read model with bounded Wave 2 strategy and DF-P1 decision-observability dimensions; raw event metadata remains hidden.';
