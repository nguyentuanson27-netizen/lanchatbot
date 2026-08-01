CREATE TABLE IF NOT EXISTS meta_response_group_gates (
  response_group_id uuid PRIMARY KEY,
  reply_plan_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  page_id text NOT NULL REFERENCES pages(page_id),
  source text NOT NULL DEFAULT 'PANCAKE' CHECK (source = 'PANCAKE'),
  status text NOT NULL CHECK (status IN ('UNVERIFIED', 'ALLOWED', 'BLOCKED')),
  reason_code text,
  blocking_tag text CHECK (
    blocking_tag IS NULL OR blocking_tag IN (
      'NHAN_VIEN', 'VAN_DON', 'DA_CHOT_DON', 'KHONG_UP_SALE'
    )
  ),
  observed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_response_group_gate_ttl_ck CHECK (expires_at > created_at),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_response_group_gate_state_ck CHECK (
    (
      status = 'ALLOWED'
      AND reason_code IS NULL
      AND blocking_tag IS NULL
      AND observed_at IS NOT NULL
    ) OR (
      status = 'BLOCKED'
      AND reason_code IS NOT NULL
      AND blocking_tag IS NOT NULL
      AND observed_at IS NOT NULL
    ) OR (
      status = 'UNVERIFIED'
      AND reason_code IS NOT NULL
      AND blocking_tag IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS meta_response_group_gates_status_idx
  ON meta_response_group_gates (status, expires_at);
