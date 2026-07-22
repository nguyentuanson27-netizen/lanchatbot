CREATE TABLE IF NOT EXISTS shadow_evaluations (
  evaluation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_identity_key text NOT NULL UNIQUE,
  source_message_pk uuid NOT NULL,
  source_occurred_at timestamptz NOT NULL,
  conversation_id uuid NOT NULL,
  page_id text NOT NULL,
  customer_hash text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'PROCESSING', 'AWAITING_ACTUAL', 'COMPLETED', 'FAILED_RETRYABLE', 'FAILED_PERMANENT')
  ),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 20),
  next_attempt_at timestamptz NOT NULL DEFAULT now() + interval '10 seconds',
  claimed_at timestamptz,
  claim_token uuid,
  completed_at timestamptz,
  prompt_version text NOT NULL DEFAULT 'lana-shadow-closing-v1',
  model_provider text,
  model_name text,
  model_version text,
  input_context_hash text,
  proposal jsonb,
  guarded_plan jsonb,
  blocked_reason_codes text[] NOT NULL DEFAULT '{}',
  actual_outbound_text_redacted text,
  actual_outbound_count integer NOT NULL DEFAULT 0 CHECK (actual_outbound_count >= 0),
  text_similarity numeric(6,5) CHECK (text_similarity IS NULL OR text_similarity BETWEEN 0 AND 1),
  quality_assessment jsonb,
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  token_usage jsonb NOT NULL DEFAULT '{}',
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shadow_worker_status (
  worker_id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('STARTING', 'IDLE', 'PROCESSING', 'ERROR', 'STOPPING')),
  model_name text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  last_error_code text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shadow_evaluations_claim_idx
  ON shadow_evaluations (status, next_attempt_at, source_occurred_at);
CREATE INDEX IF NOT EXISTS shadow_evaluations_page_time_idx
  ON shadow_evaluations (page_id, source_occurred_at DESC);
CREATE INDEX IF NOT EXISTS shadow_evaluations_conversation_time_idx
  ON shadow_evaluations (conversation_id, source_occurred_at DESC);

UPDATE messages
SET dlp_status = CASE
  WHEN text_redacted ~* '(?:[[:alnum:]_.%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}|(?:^|[^0-9])[0-9]{6,19}(?:[^0-9]|$)|địa chỉ|dia chi|xã |xa |phường|phuong|huyện|huyen|quận|quan |tỉnh|tinh |thành phố|thanh pho|đường|duong |số nhà|so nha|ấp |thon |thôn )'
    THEN 'QUARANTINED'
  ELSE 'PASSED'
END
WHERE identity_key LIKE 'mirror:v1:%' AND dlp_status = 'PENDING';

INSERT INTO shadow_evaluations (
  source_identity_key, source_message_pk, source_occurred_at,
  conversation_id, page_id, customer_hash
)
SELECT
  m.identity_key, m.message_pk, m.occurred_at,
  m.conversation_id, m.page_id, m.customer_hash
FROM messages m
WHERE m.identity_key LIKE 'mirror:v1:%'
  AND m.direction = 'INBOUND'
  AND m.dlp_status = 'PASSED'
  AND m.text_redacted <> 'phase3 smoke test [PHONE]'
ON CONFLICT (source_identity_key) DO NOTHING;

CREATE OR REPLACE FUNCTION lana_apply_shadow_retention(p_now timestamptz DEFAULT now())
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_rows bigint;
BEGIN
  DELETE FROM shadow_evaluations WHERE source_occurred_at < p_now - interval '6 months';
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  DELETE FROM shadow_worker_status WHERE last_seen_at < p_now - interval '30 days';
  RETURN deleted_rows;
END;
$$;
