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

-- A page-scoped release transition must be fenced separately from individual
-- Inbox batches.  The cutover row is durable and stores both immutable ends of
-- the one-authority transition, so a lost acknowledgement or process restart
-- can be reconciled without guessing a pointer or replaying a CAS.
CREATE TABLE IF NOT EXISTS df13_commerce_cutover_fences (
  fence_id uuid PRIMARY KEY,
  -- An immutable caller-generated operation identity makes a lost ACK
  -- observable/reconcilable without ever replaying a transition as a new one.
  operation_id uuid NOT NULL UNIQUE,
  page_id text NOT NULL,
  channel text NOT NULL,
  pre_cutover_version_id uuid NOT NULL REFERENCES runtime_behavior_mode_versions(mode_version_id),
  pre_cutover_content_hash text NOT NULL,
  pre_cutover_pointer_revision bigint NOT NULL,
  target_version_id uuid NOT NULL REFERENCES runtime_behavior_mode_versions(mode_version_id),
  target_content_hash text NOT NULL,
  target_authority_bundle_hash char(64) NOT NULL,
  request_fingerprint char(64) NOT NULL,
  epoch bigint NOT NULL,
  token_hash char(64),
  lease_until timestamptz,
  released_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT df13_commerce_cutover_fences_scope_ck
    CHECK (length(page_id) BETWEEN 1 AND 64 AND channel ~ '^[A-Z][A-Z0-9_]{0,31}$'),
  CONSTRAINT df13_commerce_cutover_fences_pre_cutover_content_hash_ck
    CHECK (pre_cutover_content_hash ~ '^sha256:[a-f0-9]{64}$'),
  CONSTRAINT df13_commerce_cutover_fences_target_content_hash_ck
    CHECK (target_content_hash ~ '^sha256:[a-f0-9]{64}$'),
  CONSTRAINT df13_commerce_cutover_fences_target_bundle_hash_ck
    CHECK (target_authority_bundle_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT df13_commerce_cutover_fences_fingerprint_ck
    CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  CONSTRAINT df13_commerce_cutover_fences_epoch_ck
    CHECK (pre_cutover_pointer_revision >= 1 AND epoch >= 1),
  CONSTRAINT df13_commerce_cutover_fences_token_state_ck
    CHECK (
      (released_at IS NULL AND token_hash ~ '^[a-f0-9]{64}$' AND lease_until IS NOT NULL)
      OR
      (released_at IS NOT NULL AND token_hash IS NULL AND lease_until IS NULL)
    )
);

-- Historical fence rows stay immutable evidence; only one live fence may hold
-- a page/channel while an authority transition is in progress.
CREATE UNIQUE INDEX IF NOT EXISTS df13_commerce_cutover_fences_live_scope_uk
  ON df13_commerce_cutover_fences (page_id, channel)
  WHERE released_at IS NULL;

-- A raw UUID foreign key is not enough: every persisted cutover must bind to
-- the current canonical LEGACY pointer and to an in-scope, canonical COMMERCE
-- target. Versions are immutable, but the pointer is deliberately mutable, so
-- this validation happens only when a new durable operation is inserted.
CREATE OR REPLACE FUNCTION guard_df13_commerce_cutover_fence_insert_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  pointer_version_id uuid;
  pointer_revision bigint;
  pre_version runtime_behavior_mode_versions%ROWTYPE;
  target_version runtime_behavior_mode_versions%ROWTYPE;
BEGIN
  SELECT pointer.active_version_id, pointer.pointer_revision
    INTO pointer_version_id, pointer_revision
    FROM runtime_behavior_mode_pointers AS pointer
   WHERE pointer.page_id = NEW.page_id AND pointer.channel = NEW.channel
   FOR UPDATE;
  IF pointer_version_id IS NULL
     OR pointer_version_id <> NEW.pre_cutover_version_id
     OR pointer_revision <> NEW.pre_cutover_pointer_revision THEN
    RAISE EXCEPTION 'df13 commerce cutover fence pre-cutover pointer is not current';
  END IF;

  SELECT * INTO pre_version
    FROM runtime_behavior_mode_versions
   WHERE mode_version_id = NEW.pre_cutover_version_id
   FOR KEY SHARE;
  SELECT * INTO target_version
    FROM runtime_behavior_mode_versions
   WHERE mode_version_id = NEW.target_version_id
   FOR KEY SHARE;
  IF pre_version.mode_version_id IS NULL
     OR pre_version.page_id <> NEW.page_id
     OR pre_version.channel <> NEW.channel
     OR pre_version.sales_authority_mode <> 'LEGACY'
     OR pre_version.state_read_mode <> 'LEGACY'
     OR pre_version.authority_bundle_hash IS NOT NULL
     OR pre_version.content_hash <> NEW.pre_cutover_content_hash THEN
    RAISE EXCEPTION 'df13 commerce cutover fence pre-cutover identity is invalid';
  END IF;
  IF target_version.mode_version_id IS NULL
     OR target_version.page_id <> NEW.page_id
     OR target_version.channel <> NEW.channel
     OR target_version.confirmation_mode <> pre_version.confirmation_mode
     OR target_version.sales_authority_mode <> 'COMMERCE'
     OR target_version.state_read_mode <> 'LEGACY'
     OR target_version.content_hash <> NEW.target_content_hash
     OR target_version.authority_bundle_hash <> NEW.target_authority_bundle_hash THEN
    RAISE EXCEPTION 'df13 commerce cutover fence target identity is invalid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS df13_commerce_cutover_fence_insert_identity_guard
  ON df13_commerce_cutover_fences;
CREATE TRIGGER df13_commerce_cutover_fence_insert_identity_guard
  BEFORE INSERT ON df13_commerce_cutover_fences
  FOR EACH ROW EXECUTE FUNCTION guard_df13_commerce_cutover_fence_insert_identity();

CREATE OR REPLACE FUNCTION guard_df13_commerce_cutover_fence_identity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.page_id IS DISTINCT FROM NEW.page_id
     OR OLD.channel IS DISTINCT FROM NEW.channel
     OR OLD.operation_id IS DISTINCT FROM NEW.operation_id
     OR OLD.pre_cutover_version_id IS DISTINCT FROM NEW.pre_cutover_version_id
     OR OLD.pre_cutover_content_hash IS DISTINCT FROM NEW.pre_cutover_content_hash
     OR OLD.pre_cutover_pointer_revision IS DISTINCT FROM NEW.pre_cutover_pointer_revision
     OR OLD.target_version_id IS DISTINCT FROM NEW.target_version_id
     OR OLD.target_content_hash IS DISTINCT FROM NEW.target_content_hash
     OR OLD.target_authority_bundle_hash IS DISTINCT FROM NEW.target_authority_bundle_hash
     OR OLD.request_fingerprint IS DISTINCT FROM NEW.request_fingerprint THEN
    RAISE EXCEPTION 'df13 commerce cutover fence identity is immutable';
  END IF;
  IF OLD.released_at IS NOT NULL THEN
    RAISE EXCEPTION 'df13 commerce cutover fence is already released';
  END IF;
  IF NEW.epoch < OLD.epoch THEN
    RAISE EXCEPTION 'df13 commerce cutover fence epoch cannot decrease';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS df13_commerce_cutover_fence_identity_guard
  ON df13_commerce_cutover_fences;
CREATE TRIGGER df13_commerce_cutover_fence_identity_guard
  BEFORE UPDATE ON df13_commerce_cutover_fences
  FOR EACH ROW EXECUTE FUNCTION guard_df13_commerce_cutover_fence_identity();
