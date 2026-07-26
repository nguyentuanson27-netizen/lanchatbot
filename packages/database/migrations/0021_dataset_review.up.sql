-- AI Evaluation & Dataset Review module (Wave 1 Conversation Recovery and
-- reusable annotation/benchmark tooling). This domain is isolated from the
-- production chat tables: it never references pages/conversations/messages and
-- carries its own encrypted raw payloads. Raw transcript text is immutable and
-- envelope-encrypted; reviewers read only redacted projections. All tables are
-- additive with IF NOT EXISTS so replay is safe under the migration ledger.

CREATE TABLE IF NOT EXISTS dataset_review_datasets (
  dataset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  source_type text NOT NULL CHECK (source_type IN (
    'REDIS_TRANSCRIPT_JSON', 'JSONL', 'CSV', 'PRODUCTION_SAMPLE'
  )),
  original_filename text CHECK (original_filename IS NULL OR char_length(original_filename) <= 512),
  source_checksum text NOT NULL CHECK (source_checksum ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'IMPORTING' CHECK (status IN (
    'IMPORTING', 'READY', 'FAILED', 'ARCHIVED'
  )),
  total_items integer NOT NULL DEFAULT 0 CHECK (total_items >= 0),
  imported_items integer NOT NULL DEFAULT 0 CHECK (imported_items >= 0),
  failed_items integer NOT NULL DEFAULT 0 CHECK (failed_items >= 0),
  normalization_version text NOT NULL DEFAULT 'norm-v1'
    CHECK (normalization_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  redaction_version text NOT NULL DEFAULT 'redact-v1'
    CHECK (redaction_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  import_report jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(import_report) = 'object'),
  created_by_subject text NOT NULL CHECK (char_length(created_by_subject) BETWEEN 1 AND 256),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Idempotent re-import: the same source content maps to one dataset row.
  CONSTRAINT dataset_review_datasets_checksum_uk UNIQUE (source_checksum)
);

-- Immutable raw import records. The raw payload holds real PII and is stored as
-- an envelope-encrypted bundle (same column shape as webhook_inbox). raw_payload
-- is never written to application logs or exports.
CREATE TABLE IF NOT EXISTS dataset_raw_items (
  raw_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES dataset_review_datasets(dataset_id) ON DELETE CASCADE,
  source_key text NOT NULL CHECK (char_length(source_key) BETWEEN 1 AND 512),
  source_key_hash text NOT NULL CHECK (source_key_hash ~ '^[a-f0-9]{64}$'),
  source_ttl bigint CHECK (source_ttl IS NULL OR source_ttl >= 0),
  raw_checksum text NOT NULL CHECK (raw_checksum ~ '^[a-f0-9]{64}$'),
  raw_payload_ciphertext bytea,
  raw_payload_nonce bytea,
  raw_payload_auth_tag bytea,
  raw_payload_encrypted_dek bytea,
  raw_payload_key_ref text,
  import_status text NOT NULL DEFAULT 'PENDING' CHECK (import_status IN (
    'PENDING', 'PARSED', 'FAILED'
  )),
  import_error text CHECK (import_error IS NULL OR char_length(import_error) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Idempotent per-record import within a dataset.
  CONSTRAINT dataset_raw_items_key_uk UNIQUE (dataset_id, source_key_hash)
);
CREATE INDEX IF NOT EXISTS dataset_raw_items_dataset_idx
  ON dataset_raw_items (dataset_id, import_status);

CREATE TABLE IF NOT EXISTS dataset_conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES dataset_review_datasets(dataset_id) ON DELETE CASCADE,
  raw_item_id uuid NOT NULL REFERENCES dataset_raw_items(raw_item_id) ON DELETE CASCADE,
  conversation_key_hash text NOT NULL CHECK (conversation_key_hash ~ '^[a-f0-9]{64}$'),
  message_count integer NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  customer_message_count integer NOT NULL DEFAULT 0 CHECK (customer_message_count >= 0),
  shop_message_count integer NOT NULL DEFAULT 0 CHECK (shop_message_count >= 0),
  length_bin text NOT NULL CHECK (length_bin IN ('1_5', '6_10', '11_20', 'OVER_20')),
  duplicate_group_id text CHECK (duplicate_group_id IS NULL OR duplicate_group_id ~ '^[a-f0-9]{64}$'),
  quality_flags text[] NOT NULL DEFAULT '{}',
  normalization_version text NOT NULL DEFAULT 'norm-v1'
    CHECK (normalization_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  redaction_version text NOT NULL DEFAULT 'redact-v1'
    CHECK (redaction_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dataset_conversations_raw_item_uk UNIQUE (raw_item_id)
);
CREATE INDEX IF NOT EXISTS dataset_conversations_dataset_idx
  ON dataset_conversations (dataset_id, length_bin);
CREATE INDEX IF NOT EXISTS dataset_conversations_dupe_idx
  ON dataset_conversations (dataset_id, duplicate_group_id)
  WHERE duplicate_group_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS dataset_messages (
  message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES dataset_conversations(conversation_id) ON DELETE CASCADE,
  turn_index integer NOT NULL CHECK (turn_index >= 0),
  role text NOT NULL CHECK (role IN ('CUSTOMER', 'SHOP', 'UNKNOWN')),
  -- Raw (unredacted) message text is envelope-encrypted; may be null once a
  -- restricted-retention policy erases it. Reviewers use redacted_text only.
  raw_text_ciphertext bytea,
  raw_text_nonce bytea,
  raw_text_auth_tag bytea,
  raw_text_encrypted_dek bytea,
  raw_text_key_ref text,
  redacted_text text NOT NULL,
  message_checksum text NOT NULL CHECK (message_checksum ~ '^[a-f0-9]{64}$'),
  starts_with_role_prefix boolean NOT NULL DEFAULT true,
  CONSTRAINT dataset_messages_turn_uk UNIQUE (conversation_id, turn_index)
);
CREATE INDEX IF NOT EXISTS dataset_messages_conversation_idx
  ON dataset_messages (conversation_id, turn_index);

-- Versioned, dynamic label schema. schema_json is the frontend-authoritative
-- source of label definitions; the frontend never hard-codes Wave 1 labels.
CREATE TABLE IF NOT EXISTS dataset_label_schemas (
  label_schema_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  version text NOT NULL CHECK (version ~ '^[A-Za-z0-9._-]{1,64}$'),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'ACTIVE', 'LOCKED', 'ARCHIVED'
  )),
  schema_json jsonb NOT NULL CHECK (jsonb_typeof(schema_json) = 'object'),
  created_by_subject text NOT NULL CHECK (char_length(created_by_subject) BETWEEN 1 AND 256),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dataset_label_schemas_name_version_uk UNIQUE (name, version)
);

CREATE TABLE IF NOT EXISTS dataset_annotation_projects (
  project_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES dataset_review_datasets(dataset_id),
  label_schema_id uuid NOT NULL REFERENCES dataset_label_schemas(label_schema_id),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  annotation_mode text NOT NULL DEFAULT 'MESSAGE' CHECK (annotation_mode IN (
    'MESSAGE', 'CONVERSATION', 'SEQUENCE'
  )),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'ACTIVE', 'LOCKED', 'ARCHIVED'
  )),
  review_mode text NOT NULL DEFAULT 'AI_ASSISTED' CHECK (review_mode IN (
    'AI_ASSISTED', 'BLIND', 'DOUBLE_BLIND'
  )),
  split_seed text CHECK (split_seed IS NULL OR char_length(split_seed) <= 128),
  created_by_subject text NOT NULL CHECK (char_length(created_by_subject) BETWEEN 1 AND 256),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dataset_annotation_projects_dataset_idx
  ON dataset_annotation_projects (dataset_id, status);

CREATE TABLE IF NOT EXISTS dataset_project_items (
  project_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES dataset_annotation_projects(project_id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES dataset_conversations(conversation_id),
  split text NOT NULL DEFAULT 'DEVELOPMENT' CHECK (split IN (
    'DEVELOPMENT', 'VALIDATION', 'HOLDOUT', 'RARE_SAFETY'
  )),
  assignment_status text NOT NULL DEFAULT 'UNASSIGNED' CHECK (assignment_status IN (
    'UNASSIGNED', 'ASSIGNED', 'IN_REVIEW', 'REVIEWED',
    'ADJUDICATION_REQUIRED', 'LOCKED'
  )),
  assigned_reviewer_id text CHECK (assigned_reviewer_id IS NULL OR char_length(assigned_reviewer_id) <= 256),
  secondary_reviewer_id text CHECK (secondary_reviewer_id IS NULL OR char_length(secondary_reviewer_id) <= 256),
  priority integer NOT NULL DEFAULT 0,
  queue_reason text CHECK (queue_reason IS NULL OR char_length(queue_reason) <= 256),
  -- Optimistic concurrency lease so two reviewers never silently overwrite.
  lease_owner text CHECK (lease_owner IS NULL OR char_length(lease_owner) <= 256),
  lease_until timestamptz,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dataset_project_items_uk UNIQUE (project_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS dataset_project_items_queue_idx
  ON dataset_project_items (project_id, split, assignment_status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS dataset_project_items_reviewer_idx
  ON dataset_project_items (project_id, assigned_reviewer_id)
  WHERE assigned_reviewer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS dataset_annotations (
  annotation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_item_id uuid NOT NULL REFERENCES dataset_project_items(project_item_id) ON DELETE CASCADE,
  label_code text NOT NULL CHECK (label_code ~ '^[A-Z0-9_]{1,64}$'),
  scope text NOT NULL CHECK (scope IN (
    'CUSTOMER_MESSAGE', 'SHOP_MESSAGE', 'CONVERSATION', 'SEQUENCE'
  )),
  turn_index integer CHECK (turn_index IS NULL OR turn_index >= 0),
  second_turn_index integer CHECK (second_turn_index IS NULL OR second_turn_index >= 0),
  evidence_text text CHECK (evidence_text IS NULL OR char_length(evidence_text) <= 2000),
  evidence_start integer CHECK (evidence_start IS NULL OR evidence_start >= 0),
  evidence_end integer CHECK (evidence_end IS NULL OR evidence_end >= 0),
  confidence text NOT NULL DEFAULT 'MEDIUM' CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  source text NOT NULL CHECK (source IN ('HEURISTIC', 'AI', 'HUMAN', 'ADJUDICATOR')),
  source_version text CHECK (source_version IS NULL OR char_length(source_version) <= 128),
  status text NOT NULL DEFAULT 'PROPOSED' CHECK (status IN (
    'PROPOSED', 'ACCEPTED', 'REJECTED', 'EDITED', 'ADJUDICATED'
  )),
  reviewer_id text CHECK (reviewer_id IS NULL OR char_length(reviewer_id) <= 256),
  prelabel_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dataset_annotations_evidence_span_ck CHECK (
    evidence_end IS NULL OR evidence_start IS NULL OR evidence_end >= evidence_start
  ),
  CONSTRAINT dataset_annotations_sequence_ck CHECK (
    second_turn_index IS NULL OR turn_index IS NULL OR second_turn_index >= turn_index
  )
);
CREATE INDEX IF NOT EXISTS dataset_annotations_item_idx
  ON dataset_annotations (project_item_id, status);
CREATE INDEX IF NOT EXISTS dataset_annotations_label_idx
  ON dataset_annotations (label_code, status);
CREATE INDEX IF NOT EXISTS dataset_annotations_source_idx
  ON dataset_annotations (project_item_id, source, reviewer_id);

-- Append-only review audit. Records every reviewer/adjudicator action with the
-- redacted before/after annotation snapshot. Never contains raw PII.
CREATE TABLE IF NOT EXISTS dataset_review_events (
  review_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_item_id uuid NOT NULL REFERENCES dataset_project_items(project_item_id) ON DELETE CASCADE,
  annotation_id uuid REFERENCES dataset_annotations(annotation_id) ON DELETE SET NULL,
  actor_subject text NOT NULL CHECK (char_length(actor_subject) BETWEEN 1 AND 256),
  action text NOT NULL CHECK (action IN (
    'ACCEPT', 'REJECT', 'EDIT', 'ADD', 'REMOVE', 'LOCK', 'REOPEN', 'ADJUDICATE'
  )),
  before_json jsonb CHECK (before_json IS NULL OR jsonb_typeof(before_json) = 'object'),
  after_json jsonb CHECK (after_json IS NULL OR jsonb_typeof(after_json) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dataset_review_events_item_idx
  ON dataset_review_events (project_item_id, created_at DESC);

-- AI/heuristic pre-label run versioning (§10.5). One run per project + version
-- bundle; per-item idempotency keyed on input checksum + the version bundle so a
-- successful item is never re-run under identical model/prompt/schema/input.
CREATE TABLE IF NOT EXISTS dataset_prelabel_runs (
  prelabel_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES dataset_annotation_projects(project_id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('HEURISTIC', 'AI')),
  model text CHECK (model IS NULL OR char_length(model) <= 128),
  model_version text CHECK (model_version IS NULL OR char_length(model_version) <= 128),
  prompt_version text NOT NULL CHECK (prompt_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  schema_version text NOT NULL CHECK (schema_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
  )),
  total_items integer NOT NULL DEFAULT 0 CHECK (total_items >= 0),
  processed_items integer NOT NULL DEFAULT 0 CHECK (processed_items >= 0),
  failed_items integer NOT NULL DEFAULT 0 CHECK (failed_items >= 0),
  cost_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(cost_metadata) = 'object'),
  started_at timestamptz,
  completed_at timestamptz,
  created_by_subject text NOT NULL CHECK (char_length(created_by_subject) BETWEEN 1 AND 256),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dataset_prelabel_runs_project_idx
  ON dataset_prelabel_runs (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dataset_prelabel_run_items (
  prelabel_run_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prelabel_run_id uuid NOT NULL REFERENCES dataset_prelabel_runs(prelabel_run_id) ON DELETE CASCADE,
  project_item_id uuid NOT NULL REFERENCES dataset_project_items(project_item_id) ON DELETE CASCADE,
  input_checksum text NOT NULL CHECK (input_checksum ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'SUCCEEDED', 'VALIDATION_FAILED', 'FAILED'
  )),
  proposed_count integer NOT NULL DEFAULT 0 CHECK (proposed_count >= 0),
  validation_error text CHECK (validation_error IS NULL OR char_length(validation_error) <= 2000),
  latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 10),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Idempotency: one attempt row per item per run, keyed by identical input.
  CONSTRAINT dataset_prelabel_run_items_uk UNIQUE (prelabel_run_id, project_item_id, input_checksum)
);
CREATE INDEX IF NOT EXISTS dataset_prelabel_run_items_run_idx
  ON dataset_prelabel_run_items (prelabel_run_id, status);

-- Export audit (§14). Every export records who, what filters, split and PII mode.
-- artifact_checksum lets a produced benchmark be verified later.
CREATE TABLE IF NOT EXISTS dataset_exports (
  export_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES dataset_annotation_projects(project_id),
  format text NOT NULL CHECK (format IN ('JSON', 'JSONL', 'CSV')),
  pii_mode text NOT NULL DEFAULT 'REDACTED' CHECK (pii_mode IN (
    'REDACTED', 'FORMAT_PRESERVING_SYNTHETIC'
  )),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filters) = 'object'),
  item_count integer NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  annotation_count integer NOT NULL DEFAULT 0 CHECK (annotation_count >= 0),
  includes_holdout boolean NOT NULL DEFAULT false,
  artifact_checksum text CHECK (artifact_checksum IS NULL OR artifact_checksum ~ '^[a-f0-9]{64}$'),
  created_by_subject text NOT NULL CHECK (char_length(created_by_subject) BETWEEN 1 AND 256),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dataset_exports_project_idx
  ON dataset_exports (project_id, created_at DESC);

-- Disagreements and Benchmarks are read-only projections over the tables above
-- (Batch 5/6 UI). The view keeps the schema "disagreement-ready" today: items
-- with two human reviewers whose accepted label sets differ.
CREATE OR REPLACE VIEW dataset_disagreements_v AS
SELECT pi.project_id,
       pi.project_item_id,
       pi.conversation_id,
       pi.assignment_status
FROM dataset_project_items pi
WHERE pi.secondary_reviewer_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM dataset_annotations a1
    JOIN dataset_annotations a2
      ON a2.project_item_id = a1.project_item_id
     AND a2.reviewer_id IS DISTINCT FROM a1.reviewer_id
    WHERE a1.project_item_id = pi.project_item_id
      AND a1.source = 'HUMAN' AND a2.source = 'HUMAN'
      AND a1.status IN ('ACCEPTED', 'EDITED')
      AND a2.status IN ('ACCEPTED', 'EDITED')
      AND a1.label_code IS DISTINCT FROM a2.label_code
  );
