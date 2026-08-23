-- Pending DF13 schema artifact. It is intentionally outside the active
-- migration directory and must not be promoted or applied without a separately
-- authorized control-plane release. This source artifact does not activate
-- COMMERCE, alter the live runner, or mutate existing Inbox/Outbox work.

CREATE TABLE IF NOT EXISTS df13_commerce_authority_fences (
  fence_id uuid PRIMARY KEY,
  page_id text NOT NULL,
  channel text NOT NULL,
  work_id text NOT NULL,
  inbox_ids uuid[] NOT NULL,
  request_fingerprint char(64) NOT NULL,
  sales_authority_mode text NOT NULL,
  state_read_mode text NOT NULL,
  mode_version_id uuid NOT NULL,
  content_hash text NOT NULL,
  pointer_revision bigint NOT NULL,
  authority_bundle_hash char(64) NOT NULL,
  authority_source text NOT NULL,
  epoch bigint NOT NULL,
  token_hash char(64),
  lease_until timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT df13_commerce_authority_fences_scope_unique
    UNIQUE (page_id, channel, work_id),
  CONSTRAINT df13_commerce_authority_fences_inbox_ids_nonempty_ck
    CHECK (cardinality(inbox_ids) > 0),
  CONSTRAINT df13_commerce_authority_fences_fingerprint_ck
    CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT df13_commerce_authority_fences_content_hash_ck
    CHECK (content_hash ~ '^sha256:[a-f0-9]{64}$'),
  CONSTRAINT df13_commerce_authority_fences_modes_ck
    CHECK (sales_authority_mode = 'COMMERCE' AND state_read_mode = 'LEGACY'),
  CONSTRAINT df13_commerce_authority_fences_revision_ck
    CHECK (pointer_revision >= 1 AND epoch >= 1),
  CONSTRAINT df13_commerce_authority_fences_bundle_hash_ck
    CHECK (authority_bundle_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT df13_commerce_authority_fences_source_ck
    CHECK (authority_source IN ('DATABASE', 'CACHE')),
  CONSTRAINT df13_commerce_authority_fences_token_state_ck
    CHECK (
      (completed_at IS NOT NULL AND token_hash IS NULL AND lease_until IS NULL)
      OR
      (completed_at IS NULL AND token_hash ~ '^[a-f0-9]{64}$' AND lease_until IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS df13_commerce_authority_fence_claims (
  fence_id uuid NOT NULL REFERENCES df13_commerce_authority_fences(fence_id),
  inbox_id uuid NOT NULL REFERENCES webhook_inbox(inbox_id),
  epoch bigint NOT NULL,
  claimed_at timestamptz NOT NULL,
  released_at timestamptz,
  PRIMARY KEY (fence_id, inbox_id, epoch),
  CONSTRAINT df13_commerce_authority_fence_claims_epoch_ck CHECK (epoch >= 1)
);

-- Enforces non-overlapping ownership across every live fenced batch. A stale
-- token cannot release a newer holder because completion also binds epoch.
CREATE UNIQUE INDEX IF NOT EXISTS df13_commerce_authority_fence_claims_live_inbox_uq
  ON df13_commerce_authority_fence_claims (inbox_id)
  WHERE released_at IS NULL;
