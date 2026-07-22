CREATE TABLE IF NOT EXISTS message_ad_contexts (
  message_pk uuid NOT NULL,
  message_occurred_at timestamptz NOT NULL,
  page_id text NOT NULL REFERENCES pages(page_id),
  conversation_id uuid NOT NULL REFERENCES conversations(conversation_id),
  source text,
  ad_title text,
  post_id text,
  ad_id text,
  ref text,
  extracted_product_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_pk, message_occurred_at),
  FOREIGN KEY (message_pk, message_occurred_at)
    REFERENCES messages(message_pk, occurred_at) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS message_ad_contexts_ad_idx
  ON message_ad_contexts (page_id, ad_id, post_id, message_occurred_at DESC);
CREATE INDEX IF NOT EXISTS message_ad_contexts_product_idx
  ON message_ad_contexts (page_id, extracted_product_id, message_occurred_at DESC)
  WHERE extracted_product_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS message_media_analysis (
  message_pk uuid NOT NULL,
  message_occurred_at timestamptz NOT NULL,
  media_ordinal smallint NOT NULL CHECK (media_ordinal BETWEEN 0 AND 9),
  media_type text NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
  analysis_status text NOT NULL
    CHECK (analysis_status IN ('MATCHED', 'AMBIGUOUS', 'NOT_FOUND', 'ERROR')),
  product_id text,
  score double precision CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  top_gap double precision CHECK (top_gap IS NULL OR (top_gap >= 0 AND top_gap <= 1)),
  reason_code text,
  frame_count smallint NOT NULL DEFAULT 1 CHECK (frame_count BETWEEN 1 AND 3),
  cache_hit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_pk, message_occurred_at, media_ordinal),
  FOREIGN KEY (message_pk, message_occurred_at)
    REFERENCES messages(message_pk, occurred_at) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS message_media_analysis_status_idx
  ON message_media_analysis (analysis_status, message_occurred_at DESC);
CREATE INDEX IF NOT EXISTS message_media_analysis_product_idx
  ON message_media_analysis (product_id, message_occurred_at DESC)
  WHERE product_id IS NOT NULL;
