# REVISED IMPLEMENTATION PLAN
## Architecture Debt Remediation, Release Integrity, and Sales Runtime Consolidation

**Status:** Deploy-ready implementation plan  
**Scope:** Architecture readiness and production-safety remediation  
**Relationship to expansion:** This plan is a prerequisite for adding a second page or brand. It is not the page/brand onboarding plan itself.

**Execution authority:** `architecture-remediation-backlog.md` is the only source of truth for issue IDs, dependencies, milestones, and acceptance criteria. This document defines architecture, sequencing, and release policy. If the two documents differ, execution stops until both are changed in the same pull request.

**Verified baseline:** GitHub `main` and tag `20260801-realtime-wave2-post-media-r32.2.2` resolve to commit `1ff7f17b0bad7f2870397c9f74c3f1b0943b2be9`. The production symlink points to the matching `r32.2.2` release, the target containers are healthy, the clean VPS repository checkout is at `da88f30d2294bf4abb340f1bb292e149493b2f5a` rather than the live release commit, migration `0029_meta_outbox_handoff_ordering` is the documented current ledger, and `/opt/lana-chatbot/runtime-state/current.json` is not yet present. RI-00 must record any evidence that cannot be observed directly rather than infer it.

**Change classification:** RI and CF address confirmed current defects. DB is structural debt. DF contains both current authority cleanup and behavioral hardening. UR is a gated future-state migration, not remediation for an existing plaintext or non-atomic production write.

---

# 1. Objectives

This program closes four groups of issues.

## 1.1 Release integrity

- Reconcile the existing drift between the documented `r32.2` state and the audited runtime/source pointer at `r32.2.2`.
- Stop using README prose as the source of truth for the currently deployed production release.
- Generate and verify a machine-readable runtime-state record during deployment.
- Represent mixed-version production and rollback targets per service.

## 1.2 Dependency boundaries

- Remove the dependency:

```text
@lana/database → @lana/dataset-review
```

- Move dataset-specific persistence into a dedicated adapter package.
- Prevent a new cycle from being introduced in either direction.
- Preserve all existing database tables, encryption behavior, AAD strings, retention rules, and idempotency semantics.

## 1.3 Purchase-confirmation correctness

- Fast-track the Vietnamese `đúng/đừng/dừng` classification defect.
- Remove the deterministic short-circuit that incorrectly treats ambiguous input as terminal.
- Define runtime behavior for ambiguous confirmation, not only a classifier label.
- Make the confirmation change immediately reversible through a runtime mode.

## 1.4 Dual sales-funnel consolidation

- Eliminate two authoritative representations of commercial progress.
- Make the commerce FSM authoritative.
- Make conversation phase a derived projection.
- Model objections and blockers as barriers with explicit activation, clear, supersession, and turn-based decay rules.
- Define canonical buying-intent evidence and cart readiness before changing consumer contracts.
- Treat prompt/model-context migration as a separately evaluated behavioral change.
- Move toward one canonical reducer, revision sequence, fence, and encrypted runtime state.

---

# 2. Confirmed Current State

## 2.1 Existing release drift

The audited current source pointer reports:

```text
release:       20260801-realtime-wave2-post-media-r32.2.2
sourceCommit:  1ff7f17b0bad7f2870397c9f74c3f1b0943b2be9
```

README and the most recent complete deployment evidence still describe `r32.2`.

There is no complete append-only deployment manifest for `r32.2.2`.

This is an existing inconsistency that must be reconciled before the new release-integrity automation is treated as establishing a clean baseline.

## 2.2 Reversed dataset dependency

`packages/database/package.json` currently depends on:

```json
"@lana/dataset-review": "workspace:*"
```

Dataset-specific persistence inside `@lana/database` imports schemas, types, and logic from `@lana/dataset-review`.

The effective dependency chain is:

```text
@lana/database
  → @lana/dataset-review
      → @lana/business-tools
          → @lana/contracts
```

## 2.3 Existing sales representations

- Funnel A uses regex classification and persists `salesStage` in conversation state.
- Funnel B is the commerce FSM and persists its state separately.
- Model context currently includes Funnel A `salesStage`.
- Wave 2 strategy and CTA selection also consume Funnel A `salesStage`.
- Decision analytics mix Funnel A and Funnel B vocabularies through a shared `stage` field.
- Funnel A can advance to `READY_TO_BUY` while Funnel B correctly remains at `MEASUREMENTS_REQUIRED`.

## 2.4 Existing buying-intent support

Buying-intent support is not absent. The repository already contains:

```text
AgentBuyingIntentV1
detectBuyingSignal()
resolveHybridBuyingSignal()
```

However, no canonical consumer-facing sales-evidence contract has been defined, and no `cartReadiness` derivation currently exists.

The new consumer contract must therefore reuse and normalize the existing buying-intent implementation rather than create a second competing classifier.

## 2.5 Existing confirmation short-circuit

The current confirmation path returns early when either:

```text
decision !== UNCLEAR
```

or:

```text
attempted === true
```

The deterministic classifier can return:

```text
decision = UNCLEAR
attempted = true
```

This prevents model structured output or a clarification path from resolving the ambiguity.

Question marks are also currently included in the deterministic rejection classification. The current implementation records a rejection decision but does not itself close the cart or confirm/cancel an order. The defect is still customer-visible because the path returns without asking for clarification.

---

# 3. Architectural Principles

## 3.1 One authority per business dimension

```text
commerceStage
    = authoritative commercial progress

conversationPhase
    = derived presentation/journey projection

activeBarrier
    = orthogonal current blocker

buyingIntent
    = canonical evidence resolution

cartReadiness
    = deterministic readiness derivation

ownership/handoff
    = separate operational dimension
```

## 3.2 Projections are not independent sources of truth

Legacy conversation state and legacy sales-cycle records may remain during migration, but after canonical State V2 is introduced they are compatibility projections only.

## 3.3 Ambiguity must fail safely and visibly

Ambiguous input must not:

- create an order;
- reject an order silently;
- mutate a cart;
- request PII;
- disappear without a customer-facing clarification;
- fail closed without an operational signal.

## 3.4 Behavioral changes must be reversible without redeployment

Every release slice that changes customer-visible decisions must be runtime-mode gated.

The mode names shown in this plan are logical contract names, not process-startup environment variables. Dynamic values must be stored and audited using the existing PostgreSQL-backed Runtime Policy control-plane pattern. A dedicated `RuntimeBehaviorModeResolver` must reuse its page gating, cache, audit, and last-known-good semantics without making policy artifacts and behavior modes the same authority.

Environment variables may only provide a fail-safe startup default and enable/disable the control-plane reader. They must not be the mechanism used for a live mode transition.

Every dynamic mode must define:

- database schema and immutable version identifier;
- allowed transition graph;
- page scope and default behavior for unknown pages;
- actor, reason, timestamp, previous value, and new value;
- cache TTL and maximum propagation time;
- last-known-good behavior when the store is unavailable;
- episode/cart pinning rules when behavior cannot change mid-transaction;
- an operator readback proving that all target workers observe the requested version;
- an emergency rollback transition that does not rewrite business state.

## 3.5 Sensitive canonical state must be encrypted

Checkout, address, and other sensitive commerce data must not be moved into a plaintext conversation snapshot merely to achieve a single logical source of truth.

## 3.6 Deployment evidence must be append-only

Do not rewrite historical deployment evidence to make the past appear complete.

Reconstructed evidence must explicitly identify itself as reconstructed and list unavailable evidence.

---

# 4. Target Architecture

## 4.1 Production runtime truth

```text
Append-only deployment or reconciliation evidence
                    │
                    ▼
Generated runtime-state/current.json
                    │
                    ├── current source pointer
                    ├── current symlink
                    ├── source tag and commit
                    ├── image and digest per service
                    ├── rollback target per service
                    ├── migration ledger
                    ├── non-secret configuration digest
                    └── routing and canary scope
```

README explains how to inspect these sources. README does not contain a permanently “current” release identifier.

## 4.2 Dataset package boundary

```text
@lana/contracts
       ▲
       │
@lana/business-tools
       ▲
       │
@lana/dataset-review       @lana/database
          ▲                     ▲
          └──── @lana/dataset-store ────┘
                         ▲
                         │
                admin-api / workers
```

Allowed direction:

```text
@lana/dataset-store
    → @lana/database
    → @lana/contracts

@lana/dataset-store
    → @lana/dataset-review
    → @lana/business-tools
```

Forbidden directions:

```text
@lana/database → @lana/dataset-review
@lana/database → @lana/dataset-store
@lana/database → @lana/business-tools

@lana/dataset-review → @lana/dataset-store
@lana/dataset-review → @lana/database
```

## 4.3 Sales runtime

```text
Inbound event
     │
     ▼
Canonical reducer
     │
     ├── canonical sales evidence
     ├── commerce stage
     ├── conversation phase
     ├── active barrier
     ├── ownership and handoff
     ├── canonical revision and fence
     └── transactional side-effect plans
```

---

# 5. Track A — Release Integrity

## RI-00: Reconcile the Current `r32.2.2` Runtime

**Priority:** P0  
**Type:** One-time remediation  
**Customer-facing behavior:** None

### Purpose

Resolve the existing drift before installing automation that prevents future drift.

### Work

Collect all evidence still available for `r32.2.2`:

- current source pointer;
- release/tag name;
- source commit;
- current symlink target;
- per-service image IDs;
- OCI revision and version labels;
- current migration ledger;
- non-secret runtime configuration digest;
- page and canary routing scope;
- known rollback targets;
- capture timestamp.

Create a new append-only reconciliation record.

Example document type:

```json
{
  "documentType": "RECONSTRUCTED_RUNTIME_RECONCILIATION",
  "reconstructed": true,
  "runtimeRelease": "20260801-realtime-wave2-post-media-r32.2.2",
  "knownFacts": [],
  "unknownOrUnavailableEvidence": [],
  "attestationLevel": "PARTIAL"
}
```

### Rules

- Do not modify the existing `r32.2` manifest.
- Do not back-date the new record.
- Do not describe missing evidence as verified.
- Do not construct a fake complete deployment manifest.
- Explicitly distinguish directly observed facts from reconstructed facts.

### Gate

- The current drift is represented by an append-only record.
- Known and unknown evidence are listed separately.
- The new runtime-state baseline can reference the reconciliation record.
- No historical file is rewritten.

---

## RI-01: Runtime-State Contract and README De-Hardcoding

**Priority:** P0  
**Risk:** Low  
**Customer-facing behavior:** None

### Work

Create:

```text
deploy/runtime-state/runtime-state.schema.json
deploy/runtime-state/example.json
```

Proposed state:

```json
{
  "schemaVersion": 1,
  "capturedAt": "...",
  "environment": "production",
  "current": {
    "release": "...",
    "sourceCommit": "...",
    "symlinkTarget": "..."
  },
  "services": {
    "realtime": {
      "image": "...",
      "imageId": "...",
      "revisionLabel": "...",
      "versionLabel": "...",
      "rollback": {
        "release": "...",
        "image": "...",
        "imageId": "..."
      }
    },
    "delivery": {
      "image": "...",
      "imageId": "...",
      "revisionLabel": "...",
      "versionLabel": "...",
      "rollback": {
        "release": "...",
        "image": "...",
        "imageId": "..."
      }
    }
  },
  "database": {
    "latestMigration": "...",
    "migrationLedgerDigest": "..."
  },
  "runtimeConfig": {
    "configDigest": "..."
  },
  "routing": {
    "pageAllowlistDigest": "...",
    "canaryPageIds": []
  },
  "evidence": {
    "deploymentOrReconciliationManifest": "..."
  }
}
```

Mixed-version production and rollback targets must be represented per service.

A top-level rollback summary may exist for operator convenience, but it must not replace per-service rollback state.

The service map must be exhaustive against a versioned production-service inventory derived from the approved Compose project. The schema must reject an omitted required service and must allow an explicitly declared `NOT_DEPLOYED` optional service.

Every service record must include:

- attestation status: `OBSERVED`, `UNVERIFIED`, or `MISMATCH`;
- full image ID and registry digest when available;
- OCI revision/version labels as evidence, not as the sole proof of source identity;
- an explicit reason when a field cannot be observed.

The source pointer is `/opt/lana-chatbot/releases/<release>/.release-source.json`. It is created only by the approved GitHub-to-VPS deployment flow and contains repository URL, immutable tag, full commit, and creation timestamp. Runtime parity compares this file with the fetched Git object and runtime state; it never infers source identity from an OCI label alone.

Every config or routing digest must use SHA-256 over a documented, sorted, canonical UTF-8 projection of an explicit non-secret allowlist. Unknown keys, secret values, raw environment dumps, and unstable fields such as timestamps must not enter the digest.

Unknown or partially attested state remains representable but cannot pass Gate R.

### README changes

Remove:

- concrete current production release paths;
- statements that production “currently” points to a fixed release;
- unversioned production status assertions.

Replace them with instructions for reading:

- generated runtime state;
- current source pointer;
- current symlink;
- append-only evidence.

Production metrics may appear only as timestamped snapshots.

### Gate

- README contains no fixed release ID described as current.
- README contains no concrete `/opt/lana-chatbot/releases/<release>` current-production path.
- Runtime-state schema validates.
- Mixed-version service states and rollbacks are tested.

---

## RI-02: Host Capture and Runtime Parity Verification

**Priority:** P0  
**Risk:** Low to medium

### Work

Create:

```text
deploy/runtime-state/capture-current.sh
deploy/runtime-state/verify-current.sh
deploy/runtime-state/test-runtime-state.sh
```

Runtime paths:

```text
/opt/lana-chatbot/runtime-state/current.json
/opt/lana-chatbot/runtime-state/history/<timestamp>-<release>.json
/opt/lana-chatbot/runtime-state/candidates/<deployment-id>.json
```

### Deployment sequence

1. Validate the candidate manifest, tag, commit, service inventory, and rollback targets.
2. Capture the prior known-good `current.json` identity without modifying it.
3. Deploy only the target services from the immutable GitHub tag/commit.
4. Run direct health, readiness, queue, outbound-containment, and migration checks.
5. Switch the current symlink only after the existing cutover safety gates pass.
6. Capture a uniquely named candidate runtime-state file containing:
   - current symlink;
   - release-local `.release-source.json`, source tag, and full commit;
   - every required service image ID, digest, labels, and attestation status;
   - migration ledger;
   - named configuration and routing digests;
   - evidence reference and per-service rollback targets.
7. Validate the candidate against the schema and verify it against live state.
8. On any mismatch, write an append-only incident record and leave `current.json` unchanged.
9. Create the append-only history entry with create-exclusive semantics.
10. Promote the verified candidate to `current.json` using atomic rename.
11. Read back `current.json` and verify its digest, history reference, and live parity.
12. Declare deployment success only after the readback verification passes.

### Host-only parity checks

```text
basename(current symlink)
    == runtime-state.current.release
    == release-local .release-source.json release
```

For each live service:

```text
runtime-state.services.<service>.imageId
    == live container image ID
```

Database:

```text
runtime-state.database.latestMigration
    == live production migration ledger
```

### Mismatch behavior

- Do not declare promotion.
- Preserve outbound containment for contained canary releases.
- Do not promote a candidate file to `current.json`.
- Preserve a failed candidate only as a diagnostic artifact linked from the incident record.
- Do not edit README from the host.
- Do not edit an existing append-only manifest.
- Write a new mismatch or incident record.
- Preserve the previous known-good runtime-state file.

### VPS authorization boundary

Existing restrictions remain in force:

- do not edit `/opt/lana-chatbot/current`;
- do not manually or post-creation modify any existing `/opt/lana-chatbot/releases/*` directory;
- do not develop on the production VPS;
- do not deploy without explicit authorization.

Approved deployment automation has two narrow capabilities after explicit production authorization:

```text
1. create a new /opt/lana-chatbot/releases/<release>/ directory from an immutable GitHub tag/commit
2. create that new release's .release-source.json once, before activation
3. atomically write /opt/lana-chatbot/runtime-state/* through the candidate/verify/promote flow
```

It must never modify an existing release directory or its `.release-source.json`. This does not authorize manual runtime mutation by a coding agent.

---

## RI-03 through RI-04: CI and Agent Guardrails

**Priority:** P0

### CI checks

Add:

```text
pnpm check:release-integrity
```

CI validates:

- runtime-state schema;
- manifest schema;
- README hard-code prohibition;
- required manifest fields;
- source references;
- unit tests for capture and validation scripts;
- repository-level dependency architecture.

CI does not claim to verify:

- live container image IDs;
- current symlink;
- live migration ledger;
- host configuration digest;
- live health.

Those are host/deployment checks owned by RI-02.

### AGENTS changes

Require agents to read:

1. README;
2. current baseline documentation;
3. relevant realtime plan;
4. the latest append-only manifest;
5. generated runtime state when production status is relevant.

Clarify three execution classes:

```text
repository source change
    → branch, review, merge

approved deployment automation
    → production execution after explicit authorization

manual runtime mutation
    → prohibited
```

---

# 6. Track B — Purchase Confirmation Hotfix

## CF-01 through CF-04: Flag-Gated Confirmation V2

**Priority:** P0, fast-track  
**Risk:** Low to medium  
**Must not be combined with:** authority cutover, unified reducer, analytics migration, or dataset extraction

### Runtime modes

```text
REALTIME_CONFIRMATION_MODE
    = LEGACY
    | V2_SHADOW
    | V2_ACTIVE
    | CLARIFY_ONLY
```

Meaning:

- `LEGACY`: existing production behavior.
- `V2_SHADOW`: calculate V2 result but do not alter behavior.
- `V2_ACTIVE`: use the V2 classifier; a terminal explicit confirmation or rejection may decide, while a question or ambiguous input remains non-terminal and produces a verified answer or clarification.
- `CLARIFY_ONLY`: emergency containment mode. A clear rejection remains a rejection, but no positive or ambiguous input may confirm purchase. Disable model fallback and emit `ASK_CONFIRMATION_CLARIFICATION`; purchase completion is intentionally suspended until the mode is changed.

### Dynamic storage and resolution

Add immutable `runtime_behavior_mode_versions`, a revisioned per-page/channel active pointer, and append-only activation audit. The versioned payload contains:
Provisional migration `0030_runtime_behavior_modes` must be rechecked as the next unused ID on merge day. It adds:

```text
runtime_behavior_mode_versions
    mode_version_id UUID primary key
    page_id + channel + schema_version
    confirmation_mode + sales_authority_mode + state_read_mode
    content_hash + created_by + reason + created_at
    immutable: no update/delete

runtime_behavior_mode_pointers
    page_id + channel primary key
    active_version_id foreign key
    pointer_revision
    updated_by + reason + updated_at
    compare-and-swap on expected pointer_revision

runtime_behavior_mode_activation_audit
    previous/new version and pointer revision
    actor + reason + timestamp
    append-only
```

Runtime workers receive read access to versions/pointers and insert access to bounded resolution audit only. Activation is restricted to the approved control-plane role. No table contains secrets or raw customer data.

```text
confirmationMode
salesAuthorityMode
stateReadMode
```

`RuntimeBehaviorModeResolver` must resolve by page and channel, cache for at most five seconds, expose the resolved version/hash in decision evidence, and use last-known-good for at most five minutes. After last-known-good expiry:

- confirmation fails to `CLARIFY_ONLY`;
- sales authority fails to `LEGACY`;
- State V2 reads fail to `LEGACY` while compatibility writes remain enabled.

Confirmation mode is evaluated for each inbound command and is not pinned to the cart, so an emergency rollback affects the next command after the bounded cache interval. Worker readback must prove the active version before canary promotion.

Mode changes must be audited with:

- actor;
- reason;
- timestamp;
- page scope;
- previous mode;
- new mode.

### Primitive location

Add the accent-preserving text utility directly to:

```text
packages/business-tools/src/vietnamese-text.ts
```

CF-01 uses the new utility only for confirmation.

Other consumers are migrated later in DF-03, avoiding both inline duplication and broad behavioral change in the hotfix.

Proposed functions:

```ts
normalizeVietnameseNfc(text)
foldVietnameseForRecall(text)
```

### Confirmation contract

Replace the overloaded `attempted` meaning with explicit semantics:

```ts
interface ConfirmationClassification {
  decision: "CONFIRM" | "REJECT" | "UNCLEAR";
  terminal: boolean;
  evidenceDetected: boolean;
  source:
    | "DETERMINISTIC_CLASSIFIER"
    | "MODEL_STRUCTURED_OUTPUT"
    | null;
  reasonCode: string | null;
}
```

Required behavior:

```text
CONFIRM
    → terminal = true

clear REJECT
    → terminal = true

UNCLEAR
    → terminal = false

AMBIGUOUS
    → terminal = false

QUESTION
    → terminal = false
```

The deterministic result must short-circuit only when it is terminal.

Do not retain logic equivalent to:

```text
UNCLEAR + evidenceDetected → return immediately
```

Do not retain:

```text
text.includes("?") → REJECT
```

### Runtime action

When the final result remains ambiguous in `ORDER_PREVIEW`, produce:

```text
ASK_CONFIRMATION_CLARIFICATION
```

Example:

```text
Input:
“Dung chot don”

Result:
decision = UNCLEAR
reasonCode = CONFIRMATION_AMBIGUOUS_UNACCENTED

Action:
ASK_CONFIRMATION_CLARIFICATION
```

The runtime must:

- not confirm;
- not reject;
- not mutate the cart;
- not request additional checkout PII;
- send a concise clarification message.

### Required cases

```text
“Đúng, chốt đơn giúp chị”
    → CONFIRM

“Đừng chốt đơn”
    → REJECT

“Dừng chốt đơn”
    → REJECT

“Chốt đơn được không?”
    → UNCLEAR or QUESTION
    → ASK_CONFIRMATION_CLARIFICATION or answer the question
    → no confirmation

“Dung chot don”
    → UNCLEAR
    → ASK_CONFIRMATION_CLARIFICATION

“OK”
    → may confirm only in ORDER_PREVIEW
```

### Gate

- Confirmation remains impossible outside `ORDER_PREVIEW`.
- No price, stock, size, checkout, payment, or verified-fact behavior changes.
- No new cart mutation path.
- Differential tests against the current compatibility baseline pass.
- All accepted deviations are confirmation-specific and documented.
- Controlled human Messenger scenarios pass.
- Immediate rollback is possible by changing runtime mode.

---

# 7. Track C — Dataset Dependency Extraction

## DB-01: Create `@lana/dataset-store`

**Priority:** P1  
**Risk:** Low  
**Database migration:** None

Create:

```text
packages/dataset-store
```

Move with `git mv`:

```text
packages/database/src/dataset-review-store.ts
packages/database/src/dataset-review-store.test.ts
packages/database/src/dataset-import.ts

→ packages/dataset-store/src/
```

Preserve exactly:

- SQL;
- table names;
- encryption algorithms;
- AAD strings;
- retention behavior;
- idempotency keys;
- error codes;
- transaction behavior.

Do not change:

```text
dataset-review:raw-item:v1:...
dataset-review:message:v1:...
```

---

## DB-02 through DB-03: Move Remaining Dataset Persistence and Migrate Consumers

Move:

```text
dataset-annotation-store.ts
dataset-annotation-store.test.ts
dataset-prelabel-store.ts
dataset-prelabel-store.test.ts
dataset-gold-v2-replace.ts
```

Update all consumers across the workspace.

Expected known consumers include:

```text
apps/admin-api
apps/worker
dataset import CLI and wiring
```

Do not assume this list is complete.

The implementation must perform a workspace-wide sweep for:

- `PostgresDataset*` symbols;
- direct imports from `@lana/database`;
- test-only imports;
- dynamic imports;
- package dependencies;
- barrel re-exports;
- worker variants;
- simulation or control applications.

Update imports from:

```ts
import { PostgresDatasetReviewStore } from "@lana/database";
```

to:

```ts
import { PostgresDatasetReviewStore } from "@lana/dataset-store";
```

---

## DB-04 through DB-05: Cut the Dependency and Prove Compatibility

Remove from `@lana/database`:

```json
"@lana/dataset-review": "workspace:*"
```

Remove build hooks that force dataset-review to build before database.

Remove dataset store exports from:

```text
packages/database/src/index.ts
```

Do not re-export `@lana/dataset-store` through `@lana/database`.

### Architecture rules

```text
packages/database/** must not import:
- @lana/dataset-review
- @lana/dataset-store
- @lana/business-tools
```

```text
packages/dataset-review/** must not import:
- @lana/dataset-store
- @lana/database
```

```text
packages/dataset-store/** may import:
- @lana/database
- @lana/dataset-review
```

### Gate

- Workspace search finds no forbidden dependency.
- `@lana/database` builds and tests without building dataset-review.
- `pnpm -r typecheck` passes.
- `pnpm -r test` passes.
- Dataset integration tests use existing tables.
- Existing ciphertext remains decryptable.
- No migration or data backfill occurs.
- Admin review and prelabel smoke tests pass.

### Rollback

Rollback application images and package imports only.

No schema or data rollback is required.

---

# 8. Track D — Observability, Analytics, and Canonical Sales Evidence

## DF-01: Test Observability

**Priority:** P1  
**Production behavior:** None

Expose in the test and debug contract:

```ts
{
  legacyDetectedPhase,
  commerceStage,
  derivedConversationPhase,
  activeBarrier,
  barrierSource,
  canonicalBuyingIntent,
  cartReadiness,
  messages,
  cartMutations,
  handoff,
  decisionEvents
}
```

Required fixtures:

```text
purchase request with missing size
purchase request with missing color
complete variant and cart opening
cart expiration
product switch during the funnel
price objection followed by acceptance
fit objection followed by size selection
ORDER_PREVIEW followed by a question
đúng / đừng / dừng / dung
post-sale
handoff
missing commerce state with committed buying intent
```

---

## DF-02: Additive Analytics Dimensions

Create an additive migration, provisionally:

```text
0031_realtime_decision_dimensions
```

The exact storage target is the partitioned parent table `conversation_events`. Adding columns to the parent must propagate to the default and future partitions under the existing PostgreSQL convention. This migration does not alter `messages.sales_stage`.

The same release must update:

```text
packages/database/migrations/0031_realtime_decision_dimensions.up.sql
packages/database/migrations/0031_realtime_decision_dimensions.down.sql
packages/database/src/realtime-runtime.ts
apps/admin-api/src/store.ts
admin_conversation_events_v
```

All new columns are nullable. `active_barrier` stores only the bounded barrier type, never the source event key or raw evidence. Check constraints must use the versioned contract enums. The Admin view exposes only these bounded, PII-safe dimensions and retains the existing security-barrier and grants.

Deployment rollback reverts writers and readers but leaves the additive nullable columns in place. The production runbook must not execute a destructive down migration; the down file must follow the repository convention while being explicitly marked non-production.

Add:

```text
commerce_stage
conversation_phase
active_barrier
phase_source
canonical_buying_intent
cart_readiness_status
```

Keep legacy:

```text
stage
```

but mark it deprecated.

Optionally retain:

```text
legacy_detected_phase
```

for shadow comparison.

### Historical data

Do not guess historical meanings.

Before the release boundary:

```text
stage = legacy
commerce_stage = null
conversation_phase = null
active_barrier = null
```

New dashboards must use only new dimensions from the release boundary onward.

### Semantic versioning

The legacy enum:

```text
SalesStageV1
```

contains:

```text
OBJECTION_HANDLING
```

The replacement:

```text
ConversationPhaseV2
```

does not.

Objection semantics move to:

```text
activeBarrier
```

Do not silently reuse the old `SalesStage` type name for the new enum.

Dashboard and analytics consumers must explicitly migrate from:

```text
7-stage funnel including OBJECTION_HANDLING
```

to:

```text
phase dimension
+
barrier dimension
```

### Gate

- Migration `0031` is still the next unused ID on merge day; otherwise it is renumbered before merge.
- Migration is applied to a restored production backup before canary deployment.
- New events include `commerce_stage` when commerce state exists.
- New reports do not consume legacy `stage`.
- No mixed-vocabulary fallback is used.
- No new PII is added.
- Dashboard consumers are version-aware.
- The Admin role can select the versioned view but cannot select raw `event_metadata` or newly expose `customer_hash`.
- Rollback evidence proves the previous binary can run with the additive schema.

---

## DF-04: Consolidate Text-Normalization Primitives

Migrate duplicated normalization code toward:

```ts
normalizeVietnameseNfc(text)
foldVietnameseForRecall(text)
tokenizeAsciiForRegex(text)
```

Rules:

- confirmation uses accent-preserving normalization;
- recall/search may use folded text;
- legacy regex consumers use a named shared primitive;
- consumers migrate incrementally;
- moving the function must not automatically change every classifier’s behavior.

Gate:

```text
function asciiFold
```

does not remain independently implemented across unrelated modules.

---

## DF-05 through DF-06: Canonical Sales Evidence and Cart Readiness

**Priority:** P1  
**Required before:** Model Context V2 and authority cutover

### Purpose

Produce the fields that the new consumer contract expects.

Reuse the existing:

```text
AgentBuyingIntentV1
detectBuyingSignal()
resolveHybridBuyingSignal()
```

Do not create another competing buying-intent classifier.

### Canonical contract

```ts
interface CanonicalSalesEvidence {
  buyingIntent: {
    decision:
      | "NONE"
      | "CONSIDERING"
      | "COMMITTED"
      | "NEGATED";

    source:
      | "DETERMINISTIC"
      | "MODEL_STRUCTURED_OUTPUT"
      | null;

    requestedAction:
      | "OPEN_CART"
      | "ADD_TO_CART"
      | "SET_QUANTITY"
      | "PROCEED_TO_PAYMENT"
      | null;

    quantity: number | null;
    reasonCodes: readonly string[];
  };

  cartReadiness: {
    status:
      | "READY"
      | "BLOCKED"
      | "NOT_APPLICABLE";

    missingRequirements: readonly (
      | "PRODUCT"
      | "VARIANT"
      | "SIZE"
      | "COLOR"
      | "VERIFIED_FACTS"
      | "STOCK"
      | "POLICY"
    )[];

    reasonCodes: readonly string[];
  };

  evaluatedAt: string;
  evidenceRefs: readonly {
    kind: "PRODUCT" | "VARIANT" | "STOCK" | "POLICY" | "PRICE";
    ref: string;
    observedAt: string;
    expiresAt: string | null;
  }[];
}
```

### Cart-readiness rules

`cartReadiness` must not be a global boolean based on:

```text
product + size + color + facts
```

Requirements depend on the selected product and offer:

- one-size products do not require size;
- products without color variants do not require color;
- some actions require verified stock;
- some product types require variant verification;
- policy may block cart creation even when variant data is complete;
- informational intent is `NOT_APPLICABLE`, not `BLOCKED`.

### Authority

- Model output supplies evidence.
- Deterministic guards decide whether evidence is usable.
- Readiness is derived from verified state and policy.
- Model output alone never creates a side effect.

Explicit deterministic action evidence has precedence over model evidence when it is not negated, questioned, or ambiguous. Model output may fill a missing action only when its schema, confidence, and evidence guards pass. A deterministic/model conflict resolves to no action and emits a reason code; it never chooses the more aggressive action.

Quantity comes only from deterministic structured extraction or existing verified cart state. Readiness must be recomputed for the current product/offer and current time immediately before cart, preview, or confirmation side effects. An expired stock, price, policy, or variant reference changes readiness to `BLOCKED` with a bounded reason code.

`evidenceRefs` contains opaque verified-fact references and timestamps only. It must not contain raw customer text, PII, secret material, or full provider payloads.

The current `PostgresRealtimeRuntimeStore.commit` transaction remains the write boundary until Track UR. DF work must extend that transaction rather than introduce uncoordinated writes.

### Gate

- `buyingIntent` in the new context is canonical resolved evidence, not raw model output.
- `cartReadiness` is always derived before DF-11.
- Missing requirements are deterministic and reason-coded.
- Product types with optional dimensions are covered by tests.
- No cart opens from model evidence alone.

---

# 9. Track E — Projection, Barrier Lifecycle, Model Evaluation, and Authority Cutover

## DF-07 through DF-08: Conversation-Phase and Barrier Shadow

Implement:

```ts
deriveConversationPhase({
  commerceStage,
  hasProduct,
  journey,
  ownership
})
```

Base mapping:

```text
ConversationPhaseV2 =
    DISCOVERY
    | PRODUCT_MATCHED
    | FIT_CONSULTING
    | READY_TO_BUY
    | ORDER_REVIEW
    | ORDER_CONFIRMED
    | POST_SALE
```

```text
DISCOVERY + no product
    → DISCOVERY

DISCOVERY + product
FACTS_PRESENTED
    → PRODUCT_MATCHED

MEASUREMENTS_REQUIRED
SIZE_RECOMMENDED
    → FIT_CONSULTING

CART_OPEN
    → READY_TO_BUY

ORDER_PREVIEW
    → ORDER_REVIEW

PURCHASE_CONFIRMED
    → ORDER_CONFIRMED

post-sale journey
    → POST_SALE
```

Handoff and ownership do not create an additional phase. They remain separate operational dimensions. While ownership is `HUMAN`, derived phase may still be observed but no bot CTA or commerce side effect may be emitted.

Do not use:

```text
max(rank(oldPhase, projectedPhase))
```

The phase may move backward when the actual business state changes:

- product switch;
- cart expiration;
- invalidated preview;
- failed fact revalidation;
- commerce-state reset.

### Barrier state

```ts
interface ActiveBarrier {
  type:
    | "PRICE"
    | "SIZE_FIT"
    | "DELIVERY"
    | "MATERIAL"
    | "COLOR";

  productId: string | null;
  sourceEventRef: `sha256:${string}`;
  activatedAt: string;
  lastEvidenceAt: string;
  silentCustomerTurns: number;
}
```

`sourceEventRef` is derived from an opaque internal event identifier. Raw event keys, customer text, provider payloads, and PII are never stored in barrier state or analytics.

During `SHADOW`, the barrier is calculated and emitted only as bounded comparison telemetry. It is not persisted as a third authority.

After `COMMERCE` activation and before State V2 cutover, `activeBarrier` is persisted in the versioned legacy conversation projection through the existing PostgreSQL commit transaction. After State V2 cutover, it moves into canonical encrypted state and legacy storage becomes a compatibility projection.

The transition between these storage locations is covered by golden fixtures and atomic-write tests.

### Barrier clear rules

Clear when:

1. an explicit resolution event occurs;
2. commerce advances beyond the blocked point;
3. the customer switches product;
4. the conversation enters handoff;
5. the conversation enters post-sale;
6. a new barrier supersedes the old one;
7. the approved turn-decay threshold is exceeded without supporting evidence.

Wall-clock expiration is a safety cleanup mechanism, not primary business evidence that a concern has been resolved.

### Shadow behavior

- Production behavior remains unchanged.
- New phase and barrier are calculated in parallel.
- Shadow values do not affect prompts, CTA, handoff, cart, or replies.
- Differences are reason-coded.

---

## DF-09 through DF-10: Model Context V2 and Generative Evaluation

**Priority:** P1  
**Required before:** DF-11

### Purpose

Treat the model-context change as a real behavioral migration rather than a structural field rename.

### Context V2

```json
{
  "type": "CONVERSATION_STATE_V2",
  "commerceStage": "...",
  "conversationPhase": "...",
  "activeBarrier": null,
  "buyingIntent": {},
  "cartReadiness": {},
  "currentProductId": "...",
  "consideredVariant": {},
  "verifiedVariant": {},
  "customerProfile": {}
}
```

Do not provide conflicting V1 and V2 commercial fields to the live model in the same prompt.

In `LEGACY`, the live model receives Context V1. In `SHADOW`, live behavior still receives Context V1; a sampled, side-effect-free second model call receives Context V2 for paired evaluation. In `COMMERCE`, the live model receives only Context V2. Therefore Model Context V2 has no independent live cutover flag and cannot drift from commerce authority.

Before DF-11, `salesAuthorityMode=SHADOW` is consumed only by projection/comparison/evaluation code; Funnel A remains authoritative. DF-11 later makes the same versioned field govern the atomic live cutover.

The paired shadow call must:

- use the same audited model, generation configuration, and verified-fact envelope as the live call;
- use the same sanitized input and a correlation ID, but have no Outbox, cart, tag, handoff, or audit-side-effect capability;
- run asynchronously so failure or latency cannot delay the live response;
- be skipped when its separate quota or cost ceiling is exhausted;
- store only PII-safe hashes, bounded scores, model/config identifiers, and reviewer references;
- record sampling rate, skip reason, token usage, latency, and estimated cost.


### Work

Update:

- prompt templates;
- system instructions;
- Wave 2 strategy inputs;
- CTA policy selection;
- post-media CTA logic;
- tests that assume `salesStage`;
- model-output interpretation;
- audit metadata identifying context version.

### Evaluation layers

#### Deterministic evaluation

Validate:

- selected strategy;
- CTA policy;
- side-effect plan;
- cart mutation;
- handoff;
- guard outcome;
- verified-fact preservation.

#### Generative evaluation

Use:

- golden conversations;
- replay datasets;
- blind human review;
- controlled canary conversations.

Review:

- response relevance;
- progression through the sales journey;
- correct handling of missing size or color;
- objection response;
- CTA timing;
- repetition;
- hallucination;
- tone;
- clarification quality;
- verified-fact preservation.

### Gate

- Safety invariants pass at 100%.
- No model output independently triggers side effects.
- Verified price, stock, size, ETA, offer, and media remain protected.
- No unresolved regression in CTA timing.
- Human evaluation meets a pre-registered non-inferiority threshold.
- Evaluation rubric and threshold are recorded before the canary result is reviewed.
- The audited production model and configuration are recorded in the evaluation evidence.

---

- At least 100 eligible paired generations are reviewed, stratified across the critical phases, barriers, and missing-requirement cases.
- Two reviewers score blinded V1/V2 pairs on the pre-registered 1–5 rubric; disagreements on a safety dimension require adjudication.
- The primary non-safety score is the mean of relevance, progression, objection handling, CTA timing, repetition, tone, and clarification quality.
- The lower bound of a paired 95% bootstrap confidence interval for `V2 - V1` primary score is at least `-0.15`.
- Safety dimensions have zero V2 regressions: hallucinated facts, lost verified facts/media, unauthorized side effects, premature CTA, PII exposure, or incorrect handoff.
- Reviewer agreement for the binary safety decision is reported; results cannot be promoted while disagreement is unresolved.
- Sampling, exclusions, reviewer identities, adjudications, model usage, and cost evidence are append-only.
- If the sample cannot meet coverage or threshold, DF-11 remains `SHADOW`; the threshold must not be relaxed after results are seen.
## DF-11 through DF-13: Flag-Gated Commerce Authority Cutover

**Priority:** P1  
**Risk:** High  
**Behavior change:** Yes

### Runtime mode

```text
REALTIME_SALES_AUTHORITY_MODE
    = LEGACY
    | SHADOW
    | COMMERCE
```

Meaning:

- `LEGACY`: Funnel A remains authoritative.
- `SHADOW`: live behavior remains on Funnel A/Context V1; commerce projection, deterministic V2 consumers, and sampled Context V2 generations are compared side-effect-free.
- `COMMERCE`: commerce FSM and derived phase are authoritative.

The value is read from the versioned behavior-mode control plane described in CF-01. The environment variable of the same name is only the startup fail-safe default.

Normal promotion is pinned at the sales-episode/cart boundary so a conversation cannot mix authorities mid-command sequence. An audited emergency `LEGACY` override supersedes pins after the bounded cache interval; this is safe only while legacy compatibility projections remain atomically current.

Every decision event records the resolved behavior-mode version/hash and whether the value came from database, cache, pin, last-known-good, or emergency override.

Worker readback, cache-propagation timing, pin behavior, last-known-good expiry, and emergency override are integration-tested before canary.

### Atomic release requirement

These changes must activate together:

```text
derived ConversationPhaseV2 enabled
+
legacy regex writer demoted
+
consumer context switched to V2
```

Do not activate derived phase while leaving the legacy regex writer authoritative.

### After cutover

```text
commerceStage
    = authoritative commercial progress

conversationPhase
    = derived projection

activeBarrier
    = orthogonal blocker

legacy regex stage
    = shadow telemetry only
```

`applyInboundEvent()` may continue to own:

- ownership;
- handoff;
- product context;
- tag gate;
- revision and fence.

It must no longer write an authoritative commercial phase based on regex purchase verbs.

### Consumer contract

Model context, strategy, and CTA selection consume:

```text
commerceStage
conversationPhase
activeBarrier
canonical buyingIntent
cartReadiness
```

They do not consume legacy `salesStage`.

### Fail-closed behavior

When commerce state is unavailable:

```text
commerceStage = null
```

Phase may derive only from structural facts:

```text
DISCOVERY
PRODUCT_MATCHED
POST_SALE
```

Do not promote to `READY_TO_BUY` from purchase verbs alone.

### Operational signal

When:

```text
canonical buyingIntent = COMMITTED
commerceStage = null
```

emit:

```text
COMMERCE_STATE_MISSING_WITH_COMMITTED_BUYING_INTENT
```

Requirements:

- no raw customer message;
- no PII;
- page and release dimensions;
- rate-limited alerting;
- dashboard visibility;
- still no unsafe cart/order side effect.

### Quantitative shadow gate

Default minimum gate:

```text
continuous shadow observation:
    at least 48 hours

reviewed eligible generations:
    at least 100

safety-critical divergence:
    0

unauthorized cart/order/handoff/PII divergence:
    0

unclassified divergence:
    0

classified non-critical divergence:
    no more than 1%
    after excluding approved expected corrections
```

Transition coverage must include reviewed examples for:

```text
MEASUREMENTS_REQUIRED
SIZE_RECOMMENDED
CART_OPEN
ORDER_PREVIEW
PURCHASE_CONFIRMED
product switch/reset
barrier activation
barrier clear
```

Default minimum:

```text
at least 5 reviewed examples per critical transition
```

When natural canary volume is insufficient, controlled human scenarios must fill the missing transition coverage.

Changing these thresholds requires explicit approval recorded in the candidate release manifest before promotion.

### Required correction case

For:

```text
“đặt cho chị bộ này”
```

with missing size:

```text
commerceStage = MEASUREMENTS_REQUIRED
conversationPhase = FIT_CONSULTING
cartReadiness = BLOCKED
missingRequirements includes SIZE
no READY_TO_BUY decision
```

### Rollback

Switch:

```text
REALTIME_SALES_AUTHORITY_MODE=LEGACY
```

without redeployment.

Rollback must not delete state or rewrite events.

---

# 10. Track F — Unified Reducer and Canonical Runtime State

## Track-F principle

Track F is a gated future-state migration. The current production sales-cycle state is already envelope-encrypted, and current conversation/sales-cycle writes already share a PostgreSQL transaction through `PostgresRealtimeRuntimeStore.commit`. Track F consolidates ownership, revision, fence, and read authority; it must build on those protections and must not describe the current system as plaintext or non-atomic.

Track F begins only after DF-13 stabilizes commerce authority and UR-00 records an explicit go/no-go decision. It must not block RI, CF, DB, analytics separation, or commerce-authority correction.

---

## UR-00: Approve State V2 ADR and Go/No-Go

The ADR must define:

- exact canonical-state boundary and fields intentionally left outside it;
- two encrypted retention domains: conversation/core state and short-lived commerce/checkout state;
- mapping from every legacy source field to its target envelope or compatibility projection;
- current retention values and deletion/expiry behavior, including Redis, PostgreSQL, audit, profile, cart, checkout, and address data;
- envelope format, key references, AAD strings, rotation, corrupt-ciphertext behavior, and cryptographic compatibility;
- schema ownership, database roles, grants, backup, and restore-test;
- canonical revision, fence, expected-version, lock/CAS, and concurrent-command semantics;
- transaction boundary, projection ownership, outbox planning, and exactly-once compatibility;
- backfill, conflict handling, idempotency, dry-run, bounded batches, and resume cursor;
- read-mode fallback, rollback window, retirement criteria, operational cost, and expected temporary complexity increase.

The ADR must explicitly decide whether customer profile remains a separately governed store. It cannot silently copy profile or PII into State V2.

No State V2 migration or implementation PR may merge before security, database, and runtime reviewers approve the ADR.

---

## UR-01: Add Encrypted State V2 Schema

Create the additive table:

```text
conversation_runtime_states_v2
```

The final column names are fixed by UR-00, but the schema must provide one shared identity/revision/fence and independently expiring encrypted envelopes:

```text
conversation_id
runtime_revision
last_fence

core_state_ciphertext / nonce / auth_tag / encrypted_dek / key_ref
core_state_expires_at

commerce_state_ciphertext / nonce / auth_tag / encrypted_dek / key_ref
commerce_state_expires_at

created_at
updated_at
```

Rules:

- `commerce_state_expires_at` preserves the approved short checkout/cart/address lifetime and cannot be extended merely because core conversation state remains active.
- Core expiry cannot retain sensitive commerce data because the envelopes are independently erasable.
- Fast-query fields are bounded projections only and are never independent decision authorities.
- The migration is additive, idempotent, restore-tested, and compatible with the previous binary.
- State roles receive least privilege; Admin roles do not receive ciphertext or raw canonical state access.
- No destructive production down migration is used for rollback.

---

## UR-02: Define Canonical Reducer Output Contract

For identical input and state, the reducer must deterministically return data, not execute side effects:

```text
core encrypted-state payload
commerce encrypted-state payload
routing projections
decision/audit events
transactional outbox plans
tag plans
handoff plans
canonical runtime revision
canonical fence
retention/expiry decisions
```

Golden fixtures cover commerce, confirmation, product switch/reset, barriers, ownership/handoff, expiry, stale facts, concurrency, and retry. Every projection has one named owner and mapping from canonical state.

---

## UR-03: Implement Atomic Transactional Dual-Write

Extend the existing `PostgresRealtimeRuntimeStore.commit` transaction. Do not create three independent writers.

```text
BEGIN

validate expected legacy and canonical versions
validate canonical runtime revision
validate fence
acquire the approved row lock or CAS protection

write State V2 envelopes
write legacy conversation compatibility projection
write legacy sales-cycle compatibility projection
write decision/audit events
write transactional outbox plans
write handoff/tag plans

COMMIT
```

Any failure rolls back every write. Required idempotency includes a unique `command_id` or `event_key`, canonical revision, fence, expected-version checks, and database uniqueness constraints.

Partial-failure, retry, stale-fence, concurrent-command, deadlock-retry, outbox-duplication, and expiry tests are mandatory.

---

## UR-04: Implement Idempotent Backfill

Backfill runs after dual-write exists and before shadow-read comparison:

- read both legacy projections under a consistent snapshot;
- produce both V2 encrypted envelopes and record source revisions;
- never emit an outbound event, tag, handoff, cart mutation, or other side effect;
- support dry-run, bounded batch, resume cursor, rate limit, and pause;
- be safely repeatable and skip already-current rows;
- reason-code conflicts instead of guessing;
- log only safe hashes and aggregate counts, never PII or decrypted state.

Backfill evidence reports scanned, created, skipped, conflicted, failed, retried, and expired rows. Conflicts remain ineligible for V2 reads until resolved or explicitly excluded.

---

## UR-05: Implement Shadow-Read Comparator

Active behavior continues to read legacy state. The comparator reads V2 side-effect-free and compares:

- commerce stage, phase, barrier, buying intent, and cart readiness;
- ownership and handoff;
- cart/checkout and expiry decisions;
- canonical revision/fence;
- planned side effects.

Every divergence is classified. Safety-critical and unclassified divergence are separate metrics. Logs use safe hashes and contain no customer text, address, checkout PII, or decrypted state. Comparator latency, database load, and decrypt failures are measured.

---

## UR-06: Add Dynamic State V2 Read Mode

Logical mode:

```text
REALTIME_STATE_READ_MODE
    = LEGACY
    | SHADOW
    | V2
```

The value comes from the versioned behavior-mode control plane; the environment variable is only a startup fail-safe default.

- `LEGACY`: read legacy compatibility projections.
- `SHADOW`: active behavior reads legacy; V2 is compared only.
- `V2`: active behavior reads V2; atomic legacy compatibility writes continue through the rollback window.

A missing, expired, corrupt, stale-revision, or stale-fence V2 record follows the ADR policy and never silently merges partial V2 and legacy fields. Before legacy writes stop, the fail-safe fallback is a complete `LEGACY` read with a bounded operational signal. Mode version/hash and source are recorded in decision evidence.

Mode changes require worker readback and propagate within the bounded cache interval. An audited emergency `LEGACY` override supersedes normal pins and requires no data deletion.

---

## UR-07: Execute V2 Canary and Rollback Rehearsal

Promotion requires:

- backfill eligibility and shadow comparator evidence;
- golden fixtures and safety invariants at 100%;
- zero safety-critical and zero unclassified divergence;
- replay deviations classified;
- controlled Messenger scenarios passed;
- verified facts, media, queue, outbox, ownership, and handoff invariants unchanged;
- database load, latency, and decrypt-error budgets passed;
- rollback from `V2` to `LEGACY` demonstrated without deletion or state rewrite;
- append-only evidence and explicit promotion approval.

Canary starts with the single approved page and an explicit bounded cohort. Legacy dual-write remains active.

---

## UR-08: Stop Legacy Writes

Only after the approved V2 rollback window completes:

- stop legacy conversation commercial-state writes;
- stop legacy sales-cycle writes;
- retain legacy records read-only for audit;
- update rollback policy to reflect the end of compatibility writes.

Do not drop tables, delete data, remove all readers, or combine this with destructive cleanup.

---

## UR-09: Remove Legacy Readers and Compatibility Flags

In a separate cleanup release after retention and rollback criteria are satisfied:

- remove production legacy readers;
- remove retired compatibility exports;
- remove obsolete runtime flags;
- keep approved audit tooling;
- run a global production-consumer search and full regression suite.

---

## UR-10: Define Deferred Legacy Storage Cleanup

Any archival or drop decision is a separate destructive-change ADR after UR-09 and the retention period. It requires legal/audit review, backup and restore-test, explicit approval, and archival preference before deletion.

The main program does not automatically schedule a table or column drop.

---
# 11. Proposed Release Slices

| Slice | Backlog contents | Behavior | Runtime mode at deploy |
|---|---|---:|---|
| A0 | RI-00 reconciliation | No | None |
| A1 | RI-01 runtime-state contract/README | No | None |
| A2 | RI-02 host candidate capture/parity/promotion | No | None |
| A3 | RI-03 CI and RI-04 agent/VPS guards | No | None |
| B0 | CF-01 primitives and CF-02 classifier contract | No active change | `LEGACY` |
| B1 | CF-03 dynamic mode and clarification action | Shadow only | `V2_SHADOW` |
| B2 | CF-04 controlled confirmation canary | Yes | `V2_ACTIVE`, emergency `CLARIFY_ONLY` |
| C1 | DB-01 through DB-02 package extraction | No business change | None |
| C2 | DB-03 through DB-05 consumer migration, boundary cut, compatibility evidence | No business change | None |
| D1 | DF-01 observability | No | None |
| D2 | DF-02 additive analytics schema | Additive telemetry | None |
| D3 | DF-03 analytics writers/views | Additive telemetry | None |
| E1 | DF-04 normalization consumers | Limited, consumer-scoped | Existing consumer flags |
| E2 | DF-05 through DF-06 canonical evidence/readiness | Shadow only | `LEGACY`/comparison telemetry |
| E3 | DF-07 through DF-08 phase/barrier projection | Shadow only | Internal shadow telemetry; no authority change |
| E4 | DF-09 through DF-10 Context V2 paired evaluation | Side-effect-free model evaluation | Sales authority `SHADOW` |
| F1 | DF-11 through DF-12 authority code and missing-commerce signal | Shadow only | `SHADOW` |
| F2 | DF-13 quantitative canary/promotion | Yes | `COMMERCE` |
| G0 | UR-00 ADR/go-no-go | No | None |
| G1 | UR-01 through UR-03 schema, reducer, atomic dual-write | No output change | State read `LEGACY` |
| G2 | UR-04 through UR-05 backfill and comparator | Shadow only | State read `SHADOW` |
| H | UR-06 through UR-07 V2 read canary/rollback rehearsal | Yes | State read `V2` |
| I1 | UR-08 stop legacy writes | Structural | Separate release after rollback window |
| I2 | UR-09 remove legacy readers/flags | Structural | Separate cleanup release |
| Post-program | UR-10 deferred storage-cleanup ADR | No automatic change | Explicit destructive approval required |

Every slice is a separate pull request/release candidate unless two adjacent no-behavior slices are explicitly combined after review. A release candidate starts from current GitHub `main`, receives its own immutable tag, and is deployed GitHub → new VPS release directory → targeted service recreation → candidate runtime-state verification → symlink/current-state promotion.

Do not combine unrelated risk classes. In particular, do not combine dataset extraction with authority cutover, confirmation promotion with State V2, page allowlist expansion with authority cutover, stop-legacy-write with reader removal, or reader removal with storage deletion.

---
# 12. Critical Path and Parallel Work

```text
RI-00 → RI-01 → RI-02 → Gate R
                 ├──────→ RI-03
                 └──────→ RI-04

CF-01 → CF-02 → CF-03 → CF-04 → Gate C

DB-01 → DB-02 → DB-03 → DB-04 → DB-05 → Gate D

DF-01 → DF-02 → DF-03
  └────→ DF-04 → DF-05 → DF-06 → DF-07 → DF-08
                                  → DF-09 → DF-10 → DF-11 → DF-12 → DF-13
                                                        → Gate E / Gate F

DF-13 → UR-00 → UR-01 → UR-02 → UR-03 → UR-04 → UR-05
                                           → UR-06 → UR-07 → UR-08 → UR-09 → Gate U
                                                                    → UR-10 deferred
```

- CF development may run in parallel, but customer-visible promotion requires Gate R or equivalent approved manual parity evidence.
- CF-03 is the cross-track behavior-mode control-plane prerequisite for DF-09 evaluation and UR-06 State V2 read cutover; its future mode fields remain `LEGACY` until their owning track activates them.
- DB runs independently from CF/DF and must not share a release with an authority cutover.
- DF-01 through DF-06 may proceed while DB runs.
- UR implementation cannot start before DF-13 is stable and UR-00 is approved.
- A blocked optional/deferred track does not block an earlier safety hotfix unless its explicit gate depends on that track.

---
# 13. Acceptance Gates

## Gate R — Release Truth

- [ ] RI-00 reconciliation exists and separates observed/reconstructed/missing evidence.
- [ ] Runtime-state schema and exhaustive production-service inventory are merged.
- [ ] Release-local `.release-source.json`, immutable tag, full commit, and fetched Git object match.
- [ ] Candidate state passes schema/live parity before atomic `current.json` promotion and readback.
- [ ] Every required service records image ID/digest, attestation, and per-service rollback target.
- [ ] Migration ledger and digest match production.
- [ ] Named config/routing digests are canonical, allowlisted, stable, and secret-free.
- [ ] README contains no hard-coded current release/path and points to generated truth.
- [ ] Unknown/partial/mismatched attestation blocks promotion and preserves prior `current.json`.

## Gate C — Confirmation Correctness

- [ ] `đúng`, `đừng`, and `dừng` remain distinct after NFC normalization.
- [ ] Questions are non-terminal and never confirm/reject merely because they contain `?`.
- [ ] Unaccented ambiguity produces `ASK_CONFIRMATION_CLARIFICATION`.
- [ ] Confirmation remains limited to `ORDER_PREVIEW`.
- [ ] `CLARIFY_ONLY` blocks purchase confirmation and exposes containment operationally.
- [ ] Dynamic mode switch, five-second propagation/readback, LKG expiry, fallback, and audit pass without redeploy.
- [ ] No ambiguous input mutates cart/order, requests PII, or bypasses verified facts.
- [ ] Shadow, controlled Messenger canary, and emergency rollback evidence pass.

## Gate D — Dependency Boundary

- [ ] `@lana/database` does not depend on dataset-review, dataset-store, or business-tools.
- [ ] `@lana/dataset-review` does not depend on database or dataset-store.
- [ ] Dataset persistence lives in dataset-store with no reverse re-export.
- [ ] Workspace consumer sweep and bidirectional architecture guards pass.
- [ ] Existing SQL, tables, AAD, ciphertext, retention, idempotency, and error behavior remain compatible.
- [ ] Dataset integration and Admin review/prelabel smoke evidence pass with no migration/backfill.

## Gate E — Canonical Evidence and Model Context

- [ ] Canonical buying intent reuses the existing hybrid resolver with deterministic/model precedence and conflict reason codes.
- [ ] Product-aware cart readiness is recomputed from current verified/fresh evidence before side effects.
- [ ] `ConversationPhaseV2` includes distinct `ORDER_REVIEW` and `ORDER_CONFIRMED`; handoff remains separate.
- [ ] Barrier references/storage are PII-safe and have finite lifecycle.
- [ ] Model Context V2 and deterministic consumers are versioned.
- [ ] Paired Context V1/V2 shadow is side-effect-free, quota/cost bounded, and cannot delay live output.
- [ ] At least 100 stratified pairs pass zero safety regression and CI lower-bound `V2 - V1 >= -0.15`.
- [ ] No model-only side effect exists and verified facts/media remain protected.

## Gate F — Funnel Authority

- [ ] Commerce FSM is authoritative and conversation phase is derived.
- [ ] Context V2, derived phase, deterministic V2 consumers, and regex demotion activate atomically.
- [ ] `OBJECTION_HANDLING` is retired from phase semantics; barriers remain orthogonal.
- [ ] No production decision reads legacy `salesStage` in `COMMERCE`.
- [ ] Quantitative shadow thresholds, transition coverage, and controlled canary pass.
- [ ] Database-backed mode readback, normal pin behavior, emergency `LEGACY` override, and rollback pass.
- [ ] Missing commerce state with committed intent alerts and fails closed for side effects.

## Gate U — Unified State

- [ ] State V2 ADR/security/database/runtime reviews approve exact scope, retention matrix, AAD/keys, transaction, and rollback.
- [ ] Core and commerce encrypted envelopes share one revision/fence but expire independently.
- [ ] State V2 extends the existing atomic commit; partial-failure/concurrency/idempotency tests pass.
- [ ] Idempotent dry-run/batched/resumable backfill completes and conflicts remain ineligible.
- [ ] Shadow comparator has zero safety-critical and zero unclassified divergence.
- [ ] Database-backed V2 read cutover, five-second readback, LKG fallback, and emergency `LEGACY` rollback pass without partial mixed reads.
- [ ] Legacy writes stop only after the rollback window; readers/flags are removed in a later release.
- [ ] Storage deletion remains a separately approved UR-10 destructive-change decision.

---
# 14. Expansion Gates

This program is architecture readiness for expansion. It does not implement:

- tenant onboarding;
- page provisioning;
- brand configuration;
- catalog separation;
- policy isolation;
- per-brand prompt configuration;
- operational ownership assignment.

## Second page

Do not enable a second production page until:

```text
Gate R
Gate C
Gate D
Gate E
Gate F
```

pass.

## Second brand

Do not enable a second production brand until all architecture gates pass:

```text
Gate R
Gate C
Gate D
Gate E
Gate F
Gate U
```

A second brand may be prepared in offline or shadow mode earlier, but production multi-brand operation must not depend indefinitely on dual legacy state.

These architecture gates are necessary but not sufficient. Passing them does not authorize production onboarding; the separate onboarding plan must still prove tenant/page identity, catalog and policy isolation, brand prompt/config isolation, credentials, routing, quotas, observability, rollback, and operational ownership.

---

# 15. Prohibited Changes

- Do not update README after each deployment to store the current release.
- Do not treat README as a runtime manifest.
- Do not edit old append-only evidence.
- Do not fabricate complete evidence for `r32.2.2`.
- Do not re-export dataset-store through database.
- Do not place dataset business logic in contracts.
- Do not create another buying-intent classifier beside the existing hybrid resolver.
- Do not define cart readiness as one global boolean.
- Do not use `max(rank)` for phase reconciliation.
- Do not keep barriers indefinitely.
- Do not use wall-clock expiration as primary evidence that a barrier is resolved.
- Do not enable derived phase while regex remains authoritative.
- Do not leave ambiguous confirmation without a runtime action.
- Do not treat `UNCLEAR + attempted` as terminal.
- Do not change model context without a generative evaluation gate.
- Do not ship a customer-visible cutover without a runtime mode.
- Do not perform State V2 and legacy writes outside one transaction.
- Do not backfill historical stages through inference.
- Do not store checkout or address data in plaintext.
- Do not expand the page allowlist in the same release as an authority cutover.
- Do not claim Track F reduces LOC before legacy retirement proves it.
- Do not weaken general VPS restrictions to support runtime-state automation.

---

# 16. Program Definition of Done

The program is complete only when all of the following are true:

```text
The existing r32.2.2 drift has an append-only reconciliation record.

README no longer changes with each current release.

Production runtime state is machine-readable and verified per service.

Rollback targets are represented per service.

@lana/database no longer depends on @lana/dataset-review.

Dataset dependency-cycle guards work in both directions.

Vietnamese confirmation distinguishes đúng, đừng, and dừng.

Ambiguous confirmation produces an explicit clarification action.

All behavioral cutovers have tested runtime rollback modes.

Behavior modes are versioned, database-backed, page-scoped, auditable, and proven by worker readback rather than environment-only changes.

Canonical buying intent and product-aware cart readiness exist.

Model Context V2 has passed deterministic and generative evaluation.

Analytics no longer use an ambiguous shared stage for new funnel reports.

Commerce FSM is the sole authority for commercial progress.

Conversation phase is a projection.

Objections are represented as finite-lifecycle barriers.

Legacy regex no longer affects production decisions.

Missing commerce state with committed intent is operationally visible.

Canonical State V2 writes atomically with all compatibility projections.

Sensitive canonical state is encrypted.

Core and short-lived commerce envelopes preserve independent retention/expiry.

Idempotent backfill and shadow comparison completed before V2 reads.

State V2 read cutover has completed successfully.

Legacy state has been retired after the approved rollback window.

A second page or brand can pass the required release gates without
replicating the original architecture defects.
```
