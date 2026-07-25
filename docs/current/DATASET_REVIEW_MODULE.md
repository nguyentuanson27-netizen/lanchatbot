# AI Evaluation & Dataset Review — Module Design & Ops

Status: **Batch 1 (foundation) implemented**. Not deployed. This document is
additive and does not modify the production baseline or changelog.

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

## Tests (run here, green)

```
pnpm --filter @lana/contracts test        # 80 passed (8 new v5)
pnpm --filter @lana/dataset-review test    # 38 passed
pnpm --filter @lana/database test          # 41 passed (5 new migration)
```

Covers: parser/multiline/start-truncated/counts, redaction + stable map +
synthetic, dedup fingerprint, length bin, quality flags, evidence exact-match,
role/scope hard-negatives (shop size list, shop asks measurements), mutually
exclusive labels, deterministic group-aware split integrity, model-output
validation, seed-schema integrity, migration structure.

## Feature flags (to add in admin-api config, Batch 6)

`ADMIN_DATASET_REVIEW_V1`, `DATASET_AI_PRELABEL_V1`, `DATASET_BLIND_REVIEW_V1`,
`DATASET_EXPORT_V1`. Default off; internal Admin only; no realtime/outbound impact.

## Remaining batches (not started)

- **2b** `@lana/database` store repo (import + parse/normalise/redact/dedup/flags
  persistence, envelope encryption wiring) + streaming import command.
- **3** projects/schemas/splits store + audit event writes.
- **4** `apps/worker` Vertex pre-label runner (batch/retry/idempotent; redacted
  input only; PROPOSED-only writes; evidence validation).
- **5** `apps/admin-web` Review Queue UI (evidence highlight, shortcuts, blind
  review, lease-based concurrency) + Datasets/Projects/Exports screens.
- **6** JSONL export endpoint, RBAC role mapping in admin-api, holdout locking,
  integration + E2E tests, feature flags, seed insertion.

## Rollback

Nothing is deployed. Code is additive on a feature branch; reverting the commit
removes it entirely. The migration is unapplied — no schema change exists in any
environment. If ever applied and rollback is required, follow
`packages/database/README.md`: pause writers, verify a restore point, then
`ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true node dist/migrate.js down` (drops all
`dataset_*` tables and their encrypted raw payloads — confirm no locked holdout
must be preserved first).
