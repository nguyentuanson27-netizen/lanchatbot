# AI Evaluation & Dataset Review — Module Design & Ops

Status: **Batches 1 + 2b + 3 + 4 + 5 implemented** (foundation + import pipeline +
annotation core + AI pre-label runner + Review Queue UI module). Not deployed.
This document is additive and does not modify the production baseline or
changelog. Real PostgreSQL and Vertex integration is only for an authorized dev
environment; no migration, import, or production credential/database is used
here.

## Goal

An Admin module to import conversation datasets, normalise + redact PII, let AI
pre-label, let humans review/lock labels, produce development/validation/holdout
splits, and export benchmarks for evaluating the AI agent. Reusable across
labelling projects (Wave 1 now, Wave 2 and later evaluations next).

## Architecture decisions (reuse, no parallel systems)

| Concern | Reused owner |
| --- | --- |
| Auth / RBAC | `apps/admin-api` HMAC assertion + `AdminRole` (OWNER/EDITOR/APPROVER/VIEWER). Dataset roles map on top via `ADMIN_ROLE_TO_DATASET_ROLE` — no new auth. |
| API | Fastify `apps/admin-api`, `AdminStore` interface, `/admin/v1/*`, idempotency keys, optimistic concurrency → 409. |
| PostgreSQL / migrations | `packages/database` numbered SQL + SHA-256 ledger (`migrate.ts`). |
| PII redaction | `redactAnalyticsText` pattern (`@lana/database`) + new stable per-conversation placeholder mapping. |
| Raw encryption | Envelope columns (same shape as `webhook_inbox`), `LocalEnvelopeCipher` / `@lana/secrets`. |
| Model gateway | `VertexShadowModel` (`apps/worker/src/vertex.ts`) — Vertex/Gemini strict `responseSchema`, retry, token usage, `UNTRUSTED_*` prompt isolation. |
| Frontend | `apps/admin-web` vanilla TS + Vite. |
| Contracts | `@lana/contracts` zod, new `v5`. |

## Data model (migration `0017_dataset_review`)

Isolated `dataset_*` domain, never references production chat tables. Raw
transcript text is **immutable and envelope-encrypted**; reviewers read only the
`redacted_text` projection.

Tables: `dataset_review_datasets`, `dataset_raw_items`, `dataset_conversations`,
`dataset_messages`, `dataset_label_schemas`, `dataset_annotation_projects`,
`dataset_project_items`, `dataset_annotations`, `dataset_review_events` (audit),
`dataset_prelabel_runs` / `dataset_prelabel_run_items` (run versioning +
idempotency), `dataset_exports` (export audit). `dataset_disagreements_v` view
keeps Disagreements/Benchmarks schema-ready.

Idempotency: `UNIQUE(source_checksum)`, `UNIQUE(dataset_id, source_key_hash)`,
`UNIQUE(prelabel_run_id, project_item_id, input_checksum)`.
Concurrency: `dataset_project_items.lease_owner/lease_until/revision`.

## `packages/dataset-review` (pure logic, this batch)

- `parseTranscript` — prefix detection, multiline join, start-truncated UNKNOWN
  turn, role counts, CRLF-only normalisation (emoji/teencode preserved).
- `lengthBin`, `normalizeForFingerprint`.
- `ConversationRedactor` — stable `[PHONE_1]`… mapping per conversation,
  phone/email/url/order-id/address/person; `synthesize()` for format-preserving
  synthetic PII (checkout benchmarks); `hasResidualPii`.
- `computeQualityFlags` — the §7.3 flag set.
- `customerSequenceFingerprint` — duplicate grouping over customer script only.
- `validatePrelabelAnnotation` / `locateEvidence` / `findMutualExclusionConflicts`
  — evidence exact-match → offsets, role/scope enforcement (customer intent only
  on CUSTOMER turns), mutual-exclusion.
- `assignSplits` — deterministic, group-aware (no duplicate leakage).
- `WAVE1_LABEL_SCHEMA` — seed `wave1-conversation-recovery-v1`, contract-validated
  at module load. Contains no forbidden inferred-outcome labels
  (`HANDOFF_OCCURRED` / `ABANDONED`); uses observational counterparts.

## `@lana/contracts` v5

`LabelSchemaV1` (dynamic, frontend-authoritative), `LabelDefinitionV1`,
`AnnotationEvidenceV1`, strict AI output `PrelabelResponseV1` +
`PRELABEL_RESPONSE_SCHEMA` (Vertex dialect), all enums, `ADMIN_ROLE_TO_DATASET_ROLE`.

## `@lana/database` store & import pipeline (Batch 2b)

- `computeConversationImport` / `buildImportReport` (in `@lana/dataset-review`) —
  pure per-record parse → redact → flag → dedup → checksum, plus the aggregate
  import report (counts only, no raw content).
- `PostgresDatasetReviewStore` — thin, encrypting persistence: `createDataset`
  (idempotent by `source_checksum`), `importRecords` (per-record transaction,
  partial-failure tolerant, DUPLICATE no-op on repeated source key, raw
  payload + raw message text envelope-encrypted, reviewer projections redacted),
  `finalizeDataset`, and redacted-only read queries.
- `dataset-import.ts` CLI — streams a `{key,ttl,value}[]` export in chunks.

### Import command

```
DATABASE_URL=... REALTIME_DATA_KEY=<32-byte hex/base64> REALTIME_DATA_KEY_REF=<ref> \
DATASET_IMPORT_ACTOR=<subject> \
node packages/database/dist/dataset-import.js history_export_2000_curated.json
```

Idempotent: re-running the same file returns the same dataset (created=false) and
re-imported records are DUPLICATE no-ops. Output is aggregate counts only.

## `@lana/database` annotation core (Batch 3)

`PostgresDatasetAnnotationStore`:
- **Label schemas** — `createLabelSchema` validates against `LabelSchemaV1Schema`
  before write (rejects invalid schema without a DB round-trip); idempotent by
  `(name, version)`; `getLabelSchema` / `listLabelSchemas` / `setLabelSchemaStatus`.
- **Projects** — `createProject` / `getProject` / `listProjects` / `setProjectStatus`.
- **Splits** — `createSplit` runs the deterministic group-aware `assignSplits`,
  inserts `dataset_project_items` (idempotent `ON CONFLICT`), guarantees a
  duplicate group never straddles splits; `splitSummary` for counts.
- **Annotations + audit** — `addAnnotation` (human/adjudicator ADD is audited; an
  AI/heuristic PROPOSED insert is not a reviewer action and is not audited),
  `reviewAnnotation` (ACCEPT/REJECT/EDIT/REMOVE) writes the new status and an
  append-only `dataset_review_events` row with before/after snapshots (redacted
  columns only — no raw PII), `listAnnotations` / `listReviewEvents`.

## AI pre-label runner (Batch 4)

Reuses the existing Vertex gateway — no parallel AI client. Added an additive
`VertexShadowModel.prelabel(systemInstruction, userPrompt)` that shares the same
OAuth/token, retry and timeout infra and returns the strict `PrelabelResponseV1`.

- `apps/worker/src/dataset-prelabel-prompt.ts` — provider-agnostic system
  instruction (lists schema labels + scope, demands JSON-only, wraps transcript
  as untrusted) and `computePrelabelInputChecksum` (idempotency key over
  model/versions/schema/redacted input).
- `apps/worker/src/dataset-prelabel-runner.ts` — `DatasetPrelabelRunner` over a
  `PrelabelModelPort` (mockable) and `PrelabelStorePort`. Per item: load redacted
  messages, reserve by input checksum (skip if already done), call the model with
  bounded retry, validate each annotation (`validatePrelabelAnnotation`: label in
  schema, role/scope, evidence exact-match → offsets), persist only valid ones as
  PROPOSED, route items with invalid annotations to review, record outcome.
  `runBatch` isolates per-item failure.
- `apps/worker/src/dataset-prelabel-wiring.ts` — thin adapters: Vertex → port,
  `PostgresDatasetPrelabelStore` → port.
- `packages/database/src/dataset-prelabel-store.ts` — `PostgresDatasetPrelabelStore`:
  `createRun` (stores model, model version, prompt version, schema version, run id),
  `reserveRunItem` (idempotent by `(run, item, input_checksum)`; SUCCEEDED/
  VALIDATION_FAILED = done, FAILED/PENDING re-runnable), `persistProposals`
  (writes `source='AI' status='PROPOSED'` only, no audit event), `recordItemOutcome`,
  `finalizeRun`. `loadItemMessages` selects redacted projections only.

Requirement mapping: redacted input only ✓ · strict output ✓ · evidence exact-match
+ role ✓ · invalid never persisted ✓ · PROPOSED-only ✓ · model/version/prompt/
schema/checksum/run id stored ✓ · idempotency + bounded retry + partial-failure
isolation ✓.

## Review Queue UI (Batch 5)

`apps/admin-web` vanilla-TS module, matching the repo's `render*(data, identity)
=> HTML string` convention (no framework). Renders redacted text only.

- `dataset-review-types.ts` — view-model types (redacted projections the admin-api
  will serve in Batch 6).
- `dataset-review-ui.ts`:
  - `highlightEvidence(text, spans)` — escapes text and wraps evidence offsets in
    `<mark>`; clamps/merges spans so overlaps never break markup.
  - `resolveShortcut(ctx)` — A/R/E/N/P/S and Shift+A; suppressed inside
    input/textarea/select/contentEditable and with ctrl/meta/alt.
  - `visibleAnnotations(...)` — blind / double-blind hide AI + heuristic proposals
    until the reviewer's pass is revealed; the reviewer's own labels always show.
  - `isLeaseHeldByOther(...)` — optimistic-lease concurrency: another active holder
    → read-only.
  - `renderReviewQueue(data, identity)` — two-column transcript + labels, quality
    flags, progress, evidence highlight + jump, accept/reject/edit/delete per
    annotation, footer (previous / accept-all / skip / needs-adjudication /
    save-next), blind note and a lock banner that disables actions.
  - `bindReviewQueue(root, handlers)` — event delegation for mounting (Batch 6).
- `styles.css` — review-queue styles using existing design tokens.

Not yet wired into `main.ts` routing and not backed by endpoints — that is Batch 6
(admin-api `/admin/v1/datasets…` + RBAC + tab). The module is unit-tested in
isolation.

## Tests (run here, green)

```
pnpm --filter @lana/contracts test        # 80 passed (8 v5)
pnpm --filter @lana/dataset-review test    # 42 passed (import pipeline incl.)
pnpm --filter @lana/database test          # 63 passed (migration + 3 stores)
pnpm --filter @lana/worker test            # 270 passed (incl. 10 pre-label)
pnpm --filter @lana/admin-web test         # 32 vitest + 4 auth (13 new review UI)
```

All store tests use an injected fake pool; the pre-label runner uses a mocked
provider port. No live PostgreSQL and no Vertex credentials are touched here; real
DB/Vertex integration (apply `0017`, run the import CLI, exercise the stores and a
real pre-label run) is deferred to an authorized dev environment.

Covers: parser/multiline/start-truncated/counts, redaction + stable map +
synthetic, dedup fingerprint, length bin, quality flags, evidence exact-match,
role/scope hard-negatives (shop size list, shop asks measurements), mutually
exclusive labels, deterministic group-aware split integrity, model-output
validation, seed-schema integrity, migration structure.

## Feature flags (to add in admin-api config, Batch 6)

`ADMIN_DATASET_REVIEW_V1`, `DATASET_AI_PRELABEL_V1`, `DATASET_BLIND_REVIEW_V1`,
`DATASET_EXPORT_V1`. Default off; internal Admin only; no realtime/outbound impact.

## Remaining batches (not started)

- **6** admin-api `/admin/v1/datasets…` endpoints (AdminStore + routes) wiring the
  stores/runner, RBAC role mapping, holdout locking, JSONL export endpoint,
  mounting the Review Queue module into `main.ts` + Datasets/Projects/Exports
  screens, feature flags, seed insertion, integration + E2E tests.

## Rollback

Nothing is deployed. Code is additive on a feature branch; reverting the commit
removes it entirely. The migration is unapplied — no schema change exists in any
environment. If ever applied and rollback is required, follow
`packages/database/README.md`: pause writers, verify a restore point, then
`ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true node dist/migrate.js down` (drops all
`dataset_*` tables and their encrypted raw payloads — confirm no locked holdout
must be preserved first).
