ALTER TABLE message_ad_contexts
  ADD COLUMN IF NOT EXISTS referral_type text;

CREATE TABLE IF NOT EXISTS acquisition_sessions (
  acquisition_session_id uuid PRIMARY KEY,
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  customer_hash text NOT NULL,
  entry_message_pk uuid NOT NULL,
  entry_message_occurred_at timestamptz NOT NULL,
  entry_source text NOT NULL CHECK (entry_source IN (
    'META_ADS_CONFIRMED', 'OTHER_REFERRAL', 'UNKNOWN'
  )),
  referral_type text,
  ad_id text,
  post_id text,
  ad_title text,
  extracted_product_id text,
  sales_cycle_id uuid,
  attribution_expires_at timestamptz NOT NULL,
  initial_reply_plan_id uuid,
  initial_outbox_id uuid REFERENCES meta_outbox(outbox_id),
  initial_reply_accepted_at timestamptz,
  initial_reply_terminal_status text CHECK (
    initial_reply_terminal_status IN ('FAILED_PERMANENT', 'AMBIGUOUS')
  ),
  initial_reply_failed_at timestamptz,
  initial_reply_delivered_at timestamptz,
  initial_reply_read_at timestamptz,
  reengaged_at timestamptz,
  meaningful_at timestamptz,
  qualified_at timestamptz,
  buying_candidate_at timestamptz,
  committed_at timestamptz,
  purchase_confirmed_at timestamptz,
  order_created_at timestamptz,
  max_stage_reached text NOT NULL DEFAULT 'UNQUALIFIED_ENTRY' CHECK (
    max_stage_reached IN (
      'UNQUALIFIED_ENTRY', 'REENGAGED', 'QUALIFIED_INTEREST',
      'BUYING_CANDIDATE', 'BUYING_COMMITTED', 'PURCHASE_CONFIRMED', 'CONVERTED'
    )
  ),
  current_disposition text NOT NULL DEFAULT 'ACTIVE' CHECK (
    current_disposition IN (
      'ACTIVE', 'NEGATED', 'RETRACTED', 'STALE', 'PURCHASE_CONFIRMED', 'CONVERTED'
    )
  ),
  first_meaningful_label text,
  first_barrier text,
  first_playbook text,
  derivation_version text NOT NULL,
  superseded_by_session_id uuid REFERENCES acquisition_sessions(acquisition_session_id) DEFERRABLE INITIALLY DEFERRED,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_message_pk, entry_message_occurred_at),
  FOREIGN KEY (entry_message_pk, entry_message_occurred_at)
    REFERENCES messages(message_pk, occurred_at) ON DELETE CASCADE,
  CONSTRAINT acquisition_window_ck CHECK (
    attribution_expires_at > entry_message_occurred_at
  ),
  CONSTRAINT acquisition_reply_time_ck CHECK (
    initial_reply_accepted_at IS NULL OR initial_reply_plan_id IS NOT NULL
  ),
  CONSTRAINT acquisition_reply_terminal_ck CHECK (
    (initial_reply_terminal_status IS NULL) = (initial_reply_failed_at IS NULL)
    AND NOT (
      initial_reply_accepted_at IS NOT NULL
      AND initial_reply_terminal_status IS NOT NULL
    )
  ),
  CONSTRAINT acquisition_order_source_ck CHECK (
    order_created_at IS NULL OR max_stage_reached = 'CONVERTED'
  )
);

CREATE INDEX IF NOT EXISTS acquisition_sessions_page_created_idx
  ON acquisition_sessions (page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS acquisition_sessions_conversation_created_idx
  ON acquisition_sessions (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS acquisition_sessions_ad_created_idx
  ON acquisition_sessions (page_id, ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS acquisition_sessions_sales_cycle_idx
  ON acquisition_sessions (sales_cycle_id)
  WHERE sales_cycle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS acquisition_sessions_active_idx
  ON acquisition_sessions (conversation_id, attribution_expires_at DESC)
  WHERE closed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS acquisition_sessions_reply_plan_uk
  ON acquisition_sessions (initial_reply_plan_id)
  WHERE initial_reply_plan_id IS NOT NULL;

CREATE VIEW admin_acquisition_sessions_v
WITH (security_barrier = true) AS
SELECT
  acquisition_session_id,
  page_id,
  conversation_id,
  entry_source,
  referral_type,
  ad_id,
  post_id,
  left(ad_title, 200) AS ad_title,
  extracted_product_id,
  sales_cycle_id,
  attribution_expires_at,
  initial_reply_plan_id,
  initial_outbox_id,
  initial_reply_accepted_at,
  initial_reply_terminal_status,
  initial_reply_failed_at,
  initial_reply_delivered_at,
  initial_reply_read_at,
  reengaged_at,
  meaningful_at,
  qualified_at,
  buying_candidate_at,
  committed_at,
  purchase_confirmed_at,
  order_created_at,
  max_stage_reached,
  current_disposition,
  first_meaningful_label,
  first_barrier,
  first_playbook,
  derivation_version,
  superseded_by_session_id,
  closed_at,
  created_at,
  updated_at,
  CASE
    WHEN reengaged_at IS NOT NULL THEN 'REENGAGED'
    WHEN initial_reply_terminal_status = 'FAILED_PERMANENT' THEN 'INITIAL_REPLY_FAILED'
    WHEN initial_reply_terminal_status = 'AMBIGUOUS' THEN 'INITIAL_REPLY_AMBIGUOUS'
    WHEN initial_reply_accepted_at IS NULL THEN 'INITIAL_REPLY_PENDING'
    WHEN now() >= initial_reply_accepted_at + interval '24 hours' THEN 'NO_RESPONSE_24H'
    WHEN now() >= initial_reply_accepted_at + interval '1 hour' THEN 'NO_RESPONSE_1H'
    ELSE 'AWAITING_RESPONSE'
  END AS engagement_outcome
FROM acquisition_sessions;

COMMENT ON VIEW admin_acquisition_sessions_v IS
  'PII-free acquisition funnel projection. Pseudonymous identity, raw messages and raw event metadata are hidden.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_readonly') THEN
    GRANT SELECT ON admin_acquisition_sessions_v TO lana_admin_readonly;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lana_admin_control_api') THEN
    GRANT SELECT ON admin_acquisition_sessions_v TO lana_admin_control_api;
  END IF;
END
$$;
