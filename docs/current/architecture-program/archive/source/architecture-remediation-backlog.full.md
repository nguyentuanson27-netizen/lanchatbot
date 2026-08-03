# GitHub Backlog: Architecture Debt Remediation, Release Integrity, and Sales Runtime Consolidation

**Status:** Deploy-ready execution backlog  
**Source plan:** `revised-implementation-plan.md`  
**Scope:** Architecture readiness and production-safety remediation  
**Execution authority:** This backlog is the only source of truth for issue IDs, dependencies, milestones, and acceptance criteria. The source plan defines architecture and sequencing. A mismatch blocks implementation until both files change in the same pull request.  
**Owner assignments:** Template owners are unassigned, but an issue cannot move to `In Progress` until implementation owner, reviewer, and rollback/production approver are named.  
**Expansion relationship:** This backlog establishes prerequisites for a second production page and, later, a second production brand. It does not implement tenant onboarding or brand provisioning.

**Verified baseline:** GitHub `main` and tag `20260801-realtime-wave2-post-media-r32.2.2` resolve to `1ff7f17b0bad7f2870397c9f74c3f1b0943b2be9`; the VPS symlink points to that release, target containers are healthy, the clean VPS repository checkout is at `da88f30d2294bf4abb340f1bb292e149493b2f5a` rather than the live release commit, documented migration head is `0029_meta_outbox_handoff_ordering`, and `/opt/lana-chatbot/runtime-state/current.json` is absent. RI-00 records direct observations separately from reconstructed facts.

**Change classification:** RI/CF are current-defect remediation, DB is structural debt, DF combines authority correction with hardening, and UR is a gated future-state migration. Current sales-cycle state is already encrypted and current conversation/sales-cycle writes already share a PostgreSQL transaction.

---

# 1. Backlog Conventions

## 1.1 Issue types

- **Epic:** Tracking issue containing child issues and gate status.
- **ADR:** Architecture decision required before implementation.
- **Implementation:** Code or schema change expected to produce one or more PRs.
- **Operations:** Runtime evidence, canary execution, or promotion decision.
- **Cleanup:** Removal of compatibility code after a rollback window.

## 1.2 Suggested labels

```text
program/architecture-remediation
track/release-integrity
track/confirmation
track/dependency-boundary
track/sales-runtime
track/state-v2

type/epic
type/adr
type/implementation
type/operations
type/cleanup

priority/p0
priority/p1
priority/p2

risk/low
risk/medium
risk/high

behavior/no-change
behavior/shadow
behavior/customer-visible

requires/migration
requires/canary
requires/human-review
requires/security-review
requires/production-authorization

gate/release-truth
gate/confirmation
gate/dependency
gate/model-context
gate/funnel-authority
gate/unified-state
```

## 1.3 Suggested milestones

| Milestone | Outcome |
|---|---|
| **M0 — Current Runtime Reconciled** | Existing `r32.2.2` drift is represented honestly and append-only. |
| **M1 — Release Truth Operational** | Runtime-state capture and parity verification are enforced. |
| **M2 — Confirmation Safety** | Vietnamese confirmation defect is fixed and runtime-gated. |
| **M3 — Dataset Boundary Clean** | `@lana/database` no longer depends on dataset-review logic. |
| **M4 — Sales Observability Ready** | New dimensions, canonical evidence, and readiness are available. |
| **M5 — Commerce Authority Ready** | Projection, barrier, model context, and quantitative shadow gates pass. |
| **M6 — State V2 Shadow Ready** | Encrypted State V2 and atomic dual-write operate in shadow. |
| **M7 — State V2 Cutover Complete** | V2 reads are active and rollback-tested. |
| **M8 — Legacy State Retired** | Legacy writers/readers are retired after the rollback window. |

## 1.4 Complexity notation

Complexity values are preliminary planning aids, not delivery commitments:

- **S:** isolated change with limited consumers;
- **M:** several modules or one migration;
- **L:** cross-package or runtime behavior change;
- **XL:** architectural migration with production rollout.

## 1.5 Required issue fields

Every implementation issue should contain:

- implementation owner;
- required reviewer(s);
- production/rollback approver when applicable;
- objective;
- in-scope work;
- explicit out-of-scope work;
- likely files or modules;
- dependencies;
- migration ID and exact table/view/role when applicable;
- acceptance criteria;
- test evidence;
- release slice and immutable tag convention;
- runtime mode and initial deployed value when applicable;
- observability query/dashboard and alert threshold;
- rollout and rollback requirements;
- rollback trigger, decision owner, and rehearsal evidence;
- security and PII considerations;
- documentation updates;
- append-only evidence path and reviewer sign-off.

Implementation follows GitHub → reviewed merge to `main` → immutable tag → new VPS release directory → targeted service recreation → candidate runtime-state verification → promotion. No issue authorizes direct source edits on the VPS.

---

# 2. Program Tracking

## EPIC-00 — Architecture Remediation Program

**Type:** Epic  
**Priority:** P0  
**Labels:** `program/architecture-remediation`, `type/epic`  
**Milestone:** M8  
**Complexity:** XL

### Objective

Track the complete program from current release reconciliation through legacy-state retirement.

### Child epics

- EPIC-RI — Release Integrity
- EPIC-CF — Purchase Confirmation Safety
- EPIC-DB — Dataset Dependency Boundary
- EPIC-DF — Sales Runtime Authority
- EPIC-UR — Canonical State V2

### Program gates

- [ ] Gate R — Release Truth
- [ ] Gate C — Confirmation Correctness
- [ ] Gate D — Dependency Boundary
- [ ] Gate E — Canonical Evidence and Model Context
- [ ] Gate F — Funnel Authority
- [ ] Gate U — Unified State

### Expansion gates

A second production page remains blocked until:

- [ ] Gate R
- [ ] Gate C
- [ ] Gate D
- [ ] Gate E
- [ ] Gate F

A second production brand remains blocked until:

- [ ] Gate R
- [ ] Gate C
- [ ] Gate D
- [ ] Gate E
- [ ] Gate F
- [ ] Gate U

Passing architecture gates does not itself authorize onboarding. A separate onboarding plan must prove tenant/page identity, catalog/policy/prompt isolation, credentials, routing, quotas, observability, rollback, and operational ownership.

### Program-level prohibited changes

- Do not rewrite old append-only manifests.
- Do not use README as the current runtime source of truth.
- Do not create another buying-intent classifier beside the existing hybrid resolver.
- Do not reconcile phases with `max(rank)`.
- Do not activate derived phase while regex remains authoritative.
- Do not ship a customer-visible cutover without a runtime mode and rollback test.
- Do not write State V2 and legacy projections in separate transactions.
- Do not store checkout or address state in plaintext.
- Do not expand the page allowlist in the same release as an authority cutover.

---

# 3. Track RI — Release Integrity

## EPIC-RI — Establish a Verifiable Production Runtime Source of Truth

**Type:** Epic  
**Priority:** P0  
**Labels:** `track/release-integrity`, `type/epic`, `gate/release-truth`  
**Milestones:** M0, M1

### Outcome

- Existing `r32.2.2` drift is reconciled honestly.
- Runtime state is generated automatically.
- Live parity is verified on the host.
- CI validates repository artifacts without claiming access to live runtime.
- README and AGENTS point operators and agents to the correct source of truth.

### Child issues

- RI-00 — Reconcile current `r32.2.2` runtime
- RI-01 — Define runtime-state schema and remove README hard-coding
- RI-02 — Implement host capture and parity verification
- RI-03 — Add CI release-integrity checks
- RI-04 — Update AGENTS and VPS authorization boundaries

---

## RI-00 — Reconcile the Current `r32.2.2` Runtime

**Type:** Operations  
**Priority:** P0  
**Risk:** Medium  
**Behavior:** No change  
**Milestone:** M0  
**Complexity:** M  
**Labels:** `track/release-integrity`, `type/operations`, `priority/p0`, `requires/production-authorization`

### Objective

Create an append-only reconciliation record for the audited current runtime:

```text
release:       20260801-realtime-wave2-post-media-r32.2.2
sourceCommit:  1ff7f17b0bad7f2870397c9f74c3f1b0943b2be9
```

The record must distinguish observed evidence from reconstructed or unavailable evidence.

### Depends on

None.

### Blocks

- RI-01
- RI-02
- declaring a clean release-integrity baseline

### In scope

- Collect current source pointer.
- Collect current symlink target.
- Collect per-service image IDs and OCI labels where still available.
- Collect migration ledger.
- Collect non-secret configuration digest.
- Collect canary and routing scope.
- Collect known rollback targets.
- Record capture time.
- Create a new append-only reconciliation artifact.

### Required document shape

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

### Out of scope

- Editing the existing `r32.2` manifest.
- Back-dating evidence.
- Claiming unavailable evidence was verified.
- Reconstructing secrets.
- Changing runtime configuration.

### Acceptance criteria

- [ ] A new append-only reconciliation record exists.
- [ ] Direct observations and reconstructed facts are separated.
- [ ] Missing evidence is listed explicitly.
- [ ] The record contains no secret or raw PII.
- [ ] No historical manifest was modified.
- [ ] The record can be referenced by the runtime-state baseline.

### Evidence

- Reconciliation artifact path.
- Hash of the artifact.
- Read-only commands used to collect evidence.
- Reviewer sign-off that no historical file was rewritten.

### Rollback

Not applicable. The artifact is append-only; corrections require a new superseding record.

---

## RI-01 — Define Runtime-State Schema and Remove README Hard-Coding

**Type:** Implementation  
**Priority:** P0  
**Risk:** Low  
**Behavior:** No change  
**Milestone:** M1  
**Complexity:** M  
**Labels:** `track/release-integrity`, `type/implementation`, `priority/p0`, `behavior/no-change`

### Objective

Create a machine-readable runtime-state contract and remove fixed “current release” statements from README.

### Depends on

- RI-00

### Blocks

- RI-02
- RI-03
- Gate R

### Likely files

```text
README.md
deploy/runtime-state/runtime-state.schema.json
deploy/runtime-state/example.json
```

### In scope

- Define schema versioning.
- Define the source pointer as `/opt/lana-chatbot/releases/<release>/.release-source.json`, created only by the approved GitHub-to-VPS deploy flow.
- Represent current release, immutable tag, full source commit, repository, and source-pointer attestation.
- Represent an exhaustive versioned production-service inventory.
- Represent image ID, registry digest, OCI labels, and `OBSERVED`/`UNVERIFIED`/`MISMATCH` attestation per service.
- Represent rollback target per service.
- Represent migration ledger and digest.
- Represent named non-secret config digests using SHA-256 over sorted canonical UTF-8 projections of explicit allowlists.
- Exclude secrets, raw environment dumps, timestamps, and unknown keys from digests.
- Represent routing/canary page scope and its separately named digest.
- Reference deployment or reconciliation evidence.
- Remove concrete current production paths from README.
- Document how to inspect the current source of truth.

### Required schema behavior

- Mixed-version services are valid.
- Rollback is represented per service.
- A top-level summary may exist but cannot replace per-service rollback.
- Missing required services fail validation; optional absent services are explicitly `NOT_DEPLOYED`.
- OCI labels are supporting evidence and cannot prove source identity by themselves.
- Unknown/partial state is representable but cannot pass Gate R.
- Unknown fields must be handled according to an explicit schema policy.
- Timestamp fields must use UTC ISO-8601.

### Out of scope

- Reading live containers.
- Changing deployment scripts.
- Editing runtime files on the VPS.

### Acceptance criteria

- [ ] Runtime-state schema validates the example.
- [ ] Tests cover mixed-version service states.
- [ ] Tests cover omitted required services, optional `NOT_DEPLOYED`, unverified fields, and label/source mismatch.
- [ ] Tests cover per-service rollback.
- [ ] Digest fixtures prove stable ordering, allowlist enforcement, and secret exclusion.
- [ ] `.release-source.json` is verified against the fetched Git object and full commit.
- [ ] No unknown/partial attestation can pass Gate R.
- [ ] README contains no release ID described as permanently current.
- [ ] README contains no concrete current-production release path.
- [ ] README directs readers to generated runtime state, source pointer, symlink, and append-only evidence.

### Test evidence

- Schema validation command.
- Negative fixtures for missing required fields.
- Fixture for mixed-version services.
- README guard test or lint output.

### Rollback

Revert the documentation/schema PR. No runtime change is included.

---

## RI-02 — Implement Host Capture and Runtime Parity Verification

**Type:** Implementation  
**Priority:** P0  
**Risk:** Medium  
**Behavior:** No change  
**Milestone:** M1  
**Complexity:** L  
**Labels:** `track/release-integrity`, `type/implementation`, `priority/p0`, `requires/production-authorization`

### Objective

Generate runtime state during an approved deployment and verify it against live host state before promotion is declared successful.

### Depends on

- RI-00
- RI-01

### Blocks

- Gate R
- promotion of new customer-visible slices without equivalent manual evidence

### Likely files

```text
deploy/runtime-state/capture-current.sh
deploy/runtime-state/verify-current.sh
deploy/runtime-state/test-runtime-state.sh
deploy scripts that perform guarded cutover
```

### In scope

- Capture current symlink.
- Capture and verify release-local `.release-source.json`, immutable tag, and full commit.
- Capture every required service image ID, registry digest, OCI labels, and attestation.
- Capture migration ledger.
- Capture named config/routing digests from documented non-secret allowlists.
- Capture rollback target per service.
- Write a uniquely named candidate state file.
- Validate candidate schema and verify candidate/live parity before promotion.
- On mismatch, write an append-only incident and leave `current.json` untouched.
- Create history with create-exclusive semantics.
- Promote only a verified candidate to `current.json` through atomic rename.
- Read back and verify current digest, history reference, and live parity.
- Preserve the prior known-good `current.json` until candidate promotion succeeds.

### Runtime paths

```text
/opt/lana-chatbot/runtime-state/current.json
/opt/lana-chatbot/runtime-state/history/<timestamp>-<release>.json
/opt/lana-chatbot/runtime-state/candidates/<deployment-id>.json
```

### Required parity

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
    == live migration ledger
```

### Failure behavior

- Do not declare promotion.
- Preserve outbound containment for contained canary releases.
- Do not promote a failed candidate to `current.json`.
- Preserve the failed candidate only as a diagnostic artifact referenced by the incident.
- Do not edit README from the host.
- Write a new mismatch/incident record.
- Keep previous known-good state available.

### Out of scope

- General permission for manual VPS writes.
- Editing `/opt/lana-chatbot/current`.
- Manual or post-creation editing of any existing `/opt/lana-chatbot/releases/*` directory.
- Deploying without explicit production authorization.

### Acceptance criteria

- [ ] Capture is deterministic and tested with fixtures.
- [ ] Candidate validation and live parity occur before `current.json` promotion.
- [ ] `current.json` promotion uses atomic rename and post-promotion readback.
- [ ] History records are append-only and create-exclusive.
- [ ] Live mismatch causes non-zero exit.
- [ ] Previous runtime state survives failed capture/verification.
- [ ] No secret values are written.
- [ ] A controlled host dry run passes.
- [ ] A mismatch rehearsal proves promotion is blocked.
- [ ] All required services, including mixed-version non-target services, appear in the state record.
- [ ] Wrong OCI revision label is classified as mismatch evidence rather than silently trusted.

### Rollback

Disable invocation from deploy flow and continue using the last known-good state plus manual evidence. Do not delete history.

---

## RI-03 — Add CI Release-Integrity Checks

**Type:** Implementation  
**Priority:** P0  
**Risk:** Low  
**Behavior:** No change  
**Milestone:** M1  
**Complexity:** M  
**Labels:** `track/release-integrity`, `type/implementation`, `priority/p0`, `behavior/no-change`

### Objective

Validate repository artifacts in CI without claiming to verify live runtime state.

### Depends on

- RI-01

### Can run in parallel with

- RI-02

### In scope

Add:

```text
pnpm check:release-integrity
```

Validate:

- runtime-state schema;
- deployment/reconciliation artifact schemas;
- required manifest fields;
- README hard-code prohibition;
- source-reference shape;
- tests for capture/validation scripts;
- repository architecture rules introduced by DB-04 when available.

### Explicit limitation

CI must not claim to verify:

- live container image IDs;
- live symlink;
- live migration ledger;
- live configuration digest;
- live service health.

Those are host checks owned by RI-02.

### Acceptance criteria

- [ ] CI fails on a hard-coded current release in README.
- [ ] CI fails on invalid runtime-state examples.
- [ ] CI fails on missing required manifest fields.
- [ ] CI output clearly distinguishes repository validation from host parity.
- [ ] `pnpm check` includes or invokes the new check.

### Rollback

Remove the CI job or invocation. No production state is affected.

---

## RI-04 — Update AGENTS and VPS Authorization Boundaries

**Type:** Implementation  
**Priority:** P0  
**Risk:** Low  
**Behavior:** No change  
**Milestone:** M1  
**Complexity:** S  
**Labels:** `track/release-integrity`, `type/implementation`, `priority/p0`, `behavior/no-change`

### Objective

Document the new runtime-state source and narrowly authorize approved deployment automation without weakening existing VPS protections.

### Depends on

- RI-01
- design from RI-02

### Likely files

```text
AGENTS.md
README.md
relevant deployment documentation
```

### Required execution classes

```text
repository source change
    → branch, review, merge

approved deployment automation
    → production execution after explicit authorization

manual runtime mutation
    → prohibited
```

### In scope

- Require reading generated runtime state when current production status matters.
- Preserve prohibition on manually editing `current` or any release directory.
- After explicit production authorization, approved deployment automation may create a new release directory from an immutable GitHub tag/commit, create its `.release-source.json` once before activation, and atomically write `/opt/lana-chatbot/runtime-state/*` through candidate/verify/promote.
- Approved automation must never modify an existing release directory or existing `.release-source.json`.
- Require explicit authorization before deploy, migration, restart, symlink change, or canary send.

### Acceptance criteria

- [ ] AGENTS points to generated runtime state.
- [ ] Existing read-only deploy-key rule remains.
- [ ] Manual runtime mutation remains prohibited.
- [ ] The new-release/source-pointer and runtime-state automation exceptions are narrow and explicit.
- [ ] Tests prove existing release directories/source pointers cannot be overwritten.
- [ ] No wording implies coding agents may deploy autonomously.

---

# 4. Track CF — Purchase Confirmation Safety

## EPIC-CF — Correct and Gate Purchase Confirmation

**Type:** Epic  
**Priority:** P0  
**Labels:** `track/confirmation`, `type/epic`, `gate/confirmation`  
**Milestone:** M2

### Outcome

- `đúng`, `đừng`, and `dừng` are distinct.
- Questions are not terminal rejections.
- Ambiguous unaccented text triggers a clarification action.
- Customer-visible behavior is runtime-gated and rollback-tested.

### Child issues

- CF-01 — Add shared Vietnamese text primitives
- CF-02 — Replace overloaded confirmation semantics
- CF-03 — Add clarification action and runtime mode
- CF-04 — Run shadow, canary, and rollback evidence

---

## CF-01 — Add Shared Vietnamese Text Primitives

**Type:** Implementation  
**Priority:** P0  
**Risk:** Low  
**Behavior:** No change outside the new call site  
**Milestone:** M2  
**Complexity:** S  
**Labels:** `track/confirmation`, `type/implementation`, `priority/p0`

### Objective

Add accent-preserving and recall-oriented normalization primitives in `@lana/business-tools` without migrating unrelated classifiers in the same PR.

### Likely files

```text
packages/business-tools/src/vietnamese-text.ts
packages/business-tools/src/index.ts
new unit tests
```

### In scope

```ts
normalizeVietnameseNfc(text)
foldVietnameseForRecall(text)
```

### Out of scope

- Replacing every `asciiFold` implementation.
- Changing buying-signal behavior.
- Changing confirmation behavior in this PR.

### Acceptance criteria

- [ ] `đúng`, `đừng`, and `dừng` remain distinguishable after NFC normalization.
- [ ] Folded output is documented as recall-only.
- [ ] Unit tests cover composed and decomposed Unicode.
- [ ] No existing consumer behavior changes until explicitly migrated.

---

## CF-02 — Replace Overloaded Confirmation Semantics

**Type:** Implementation  
**Priority:** P0  
**Risk:** Medium  
**Behavior:** Shadow-capable  
**Milestone:** M2  
**Complexity:** M  
**Labels:** `track/confirmation`, `type/implementation`, `priority/p0`, `behavior/shadow`

### Objective

Replace `attempted` with explicit terminality and evidence semantics, and remove the ambiguous deterministic short-circuit.

### Depends on

- CF-01

### Likely files

```text
apps/worker/src/realtime-sales-cycle.ts
apps/worker/src/realtime-sales-cycle.test.ts
related contract/test helpers
```

### Required contract

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

### Required logic

- `CONFIRM` is terminal.
- Clear `REJECT` is terminal.
- `UNCLEAR`, `AMBIGUOUS`, and `QUESTION` are non-terminal.
- Deterministic classification short-circuits only when terminal.
- `text.includes("?")` is not a rejection rule.
- Model evidence may be considered only under existing confidence and exact-evidence safeguards.

### Acceptance criteria

- [ ] `UNCLEAR + evidenceDetected` does not return early solely because evidence was detected.
- [ ] Questions are not classified as terminal rejection.
- [ ] Existing safeguards around model evidence remain.
- [ ] No confirmation is possible outside `ORDER_PREVIEW`.
- [ ] Tests cover `đúng`, `đừng`, `dừng`, question forms, and unaccented ambiguity.

### Rollback

Behavior remains inactive until CF-03 mode enables it.

---

## CF-03 — Add Clarification Action and Runtime Mode

**Type:** Implementation  
**Priority:** P0  
**Risk:** Medium  
**Behavior:** Customer-visible  
**Milestone:** M2  
**Complexity:** M  
**Labels:** `track/confirmation`, `type/implementation`, `priority/p0`, `behavior/customer-visible`, `requires/migration`, `requires/canary`, `requires/production-authorization`

### Objective

Define runtime behavior for ambiguous confirmation and make the change reversible without redeployment.

### Depends on

- CF-02
- Gate R or equivalent recorded release-parity evidence

### Runtime mode

```text
REALTIME_CONFIRMATION_MODE
    = LEGACY
    | V2_SHADOW
    | V2_ACTIVE
    | CLARIFY_ONLY
```

Semantics:

- `LEGACY`: current production behavior.
- `V2_SHADOW`: calculate V2 but keep legacy output; emit bounded comparison telemetry only.
- `V2_ACTIVE`: terminal explicit V2 confirmation/rejection may decide; questions and ambiguity are non-terminal and receive a verified answer or clarification.
- `CLARIFY_ONLY`: emergency containment. A clear rejection remains a rejection; positive or ambiguous input cannot confirm purchase, model fallback is disabled, and clarification is sent. Purchase completion is intentionally suspended until mode changes.

### Dynamic storage and resolution

Add immutable `runtime_behavior_mode_versions`, a revisioned active pointer per page/channel, append-only activation audit, and `RuntimeBehaviorModeResolver`. The versioned payload contains `confirmationMode`, `salesAuthorityMode`, and `stateReadMode`; each consumer reads only its field.
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

The resolver reuses the existing Runtime Policy control-plane pattern for page gating, cache, last-known-good, and audit without making behavior modes part of business policy authority.

- cache TTL: at most five seconds;
- last-known-good: at most five minutes;
- confirmation fallback after LKG expiry: `CLARIFY_ONLY`;
- mode resolved per inbound command, not cart-pinned;
- decision evidence records version/hash and source;
- worker readback proves the active version before promotion;
- the environment variable is startup fail-safe only, not the live-switch mechanism.

### New runtime action

```text
ASK_CONFIRMATION_CLARIFICATION
```

### Required behavior

For ambiguous input during `ORDER_PREVIEW`:

- do not confirm;
- do not reject;
- do not mutate cart/order state;
- do not request new checkout PII;
- send a concise clarification message.

### Required audit fields

- previous mode;
- new mode;
- actor;
- reason;
- page scope;
- timestamp;
- immutable mode version and content hash;
- activation pointer revision;
- resolver source (`DATABASE`, `CACHE`, `LAST_KNOWN_GOOD`, or fallback);
- worker readback and propagation timestamp.

### Acceptance criteria

- [ ] `“Dung chot don”` produces clarification, not silence.
- [ ] `“Chốt đơn được không?”` does not confirm.
- [ ] `“Đúng, chốt đơn giúp chị”` confirms only in `ORDER_PREVIEW`.
- [ ] `“Đừng chốt đơn”` and `“Dừng chốt đơn”` reject.
- [ ] Mode can be switched without redeploy through the database-backed control plane.
- [ ] Five-second cache propagation, five-minute LKG expiry, fallback, and readback are integration-tested.
- [ ] `CLARIFY_ONLY` blocks every purchase-confirmation side effect and raises an operator-visible containment signal.
- [ ] Environment-only changes are not accepted as proof of no-redeploy switching.
- [ ] Mode changes and every resolved decision version are auditable.
- [ ] Migration `0030_runtime_behavior_modes` is additive, idempotent, restore-tested, and compatible with the previous binary.
- [ ] Version rows and activation audit are immutable; pointer update enforces expected revision/CAS.
- [ ] Runtime and control-plane database grants pass least-privilege tests.
- [ ] Updating one mode creates a complete immutable version, preserves the other two values, and advances the pointer by CAS.

### Rollback

Switch to `LEGACY` or `CLARIFY_ONLY` without redeploy.

---

## CF-04 — Execute Confirmation Shadow, Canary, and Rollback Evidence

**Type:** Operations  
**Priority:** P0  
**Risk:** Medium  
**Behavior:** Customer-visible in controlled scope  
**Milestone:** M2  
**Complexity:** M  
**Labels:** `track/confirmation`, `type/operations`, `priority/p0`, `requires/canary`, `requires/human-review`

### Depends on

- CF-03
- Gate R

### In scope

- Run `V2_SHADOW`.
- Compare V2 and legacy outcomes.
- Run controlled Messenger scenarios.
- Activate `V2_ACTIVE` on the approved canary scope.
- Rehearse rollback to `LEGACY` or `CLARIFY_ONLY`.
- Write append-only promotion or rollback evidence.

### Acceptance criteria

- [ ] All required phrases pass.
- [ ] No cart/order mutation occurs on ambiguous input.
- [ ] No new permanent failure is introduced.
- [ ] Rollback mode change is demonstrated.
- [ ] Human reviewer confirms clarification text is understandable.
- [ ] Evidence records model/config, release, page scope, and timestamps.

---

# 5. Track DB — Dataset Dependency Boundary

## EPIC-DB — Extract Dataset Persistence from `@lana/database`

**Type:** Epic  
**Priority:** P1  
**Labels:** `track/dependency-boundary`, `type/epic`, `gate/dependency`  
**Milestone:** M3

### Outcome

`@lana/database` contains generic persistence infrastructure and no longer depends on dataset-review or business-tools.

### Child issues

- DB-01 — Create `@lana/dataset-store` and move review import persistence
- DB-02 — Move annotation, prelabel, and gold persistence
- DB-03 — Migrate all workspace consumers
- DB-04 — Remove dependency and enforce architecture rules
- DB-05 — Run integration and compatibility evidence

---

## DB-01 — Create `@lana/dataset-store` and Move Review Import Persistence

**Type:** Implementation  
**Priority:** P1  
**Risk:** Low  
**Behavior:** No business change  
**Milestone:** M3  
**Complexity:** M  
**Labels:** `track/dependency-boundary`, `type/implementation`, `priority/p1`, `behavior/no-change`

### Objective

Create the persistence adapter package and move the first coherent group of files without changing SQL or encryption behavior.

### Likely moves

```text
packages/database/src/dataset-review-store.ts
packages/database/src/dataset-review-store.test.ts
packages/database/src/dataset-import.ts

→ packages/dataset-store/src/
```

### Preserve exactly

- SQL;
- table names;
- encryption algorithms;
- AAD strings;
- retention;
- idempotency;
- error codes;
- transaction behavior.

### Required unchanged AAD prefixes

```text
dataset-review:raw-item:v1:...
dataset-review:message:v1:...
```

### Acceptance criteria

- [ ] Package builds independently.
- [ ] Moved tests pass without semantic changes.
- [ ] No database migration is added.
- [ ] Existing encryption fixtures remain valid.
- [ ] Imports are updated only for moved consumers.

---

## DB-02 — Move Annotation, Prelabel, and Gold Persistence

**Type:** Implementation  
**Priority:** P1  
**Risk:** Low  
**Behavior:** No business change  
**Milestone:** M3  
**Complexity:** M  
**Labels:** `track/dependency-boundary`, `type/implementation`, `priority/p1`, `behavior/no-change`

### Depends on

- DB-01

### Likely moves

```text
dataset-annotation-store.ts
dataset-annotation-store.test.ts
dataset-prelabel-store.ts
dataset-prelabel-store.test.ts
dataset-gold-v2-replace.ts
```

### Acceptance criteria

- [ ] All dataset-specific persistence is under `@lana/dataset-store`.
- [ ] SQL and table names are unchanged.
- [ ] Tests continue to use existing schemas.
- [ ] No backfill or data rewrite is introduced.

---

## DB-03 — Migrate All Workspace Consumers

**Type:** Implementation  
**Priority:** P1  
**Risk:** Medium  
**Behavior:** No business change  
**Milestone:** M3  
**Complexity:** M  
**Labels:** `track/dependency-boundary`, `type/implementation`, `priority/p1`, `behavior/no-change`

### Depends on

- DB-01
- DB-02

### Objective

Replace all dataset-store imports and package dependencies across the complete workspace.

### Known consumers

```text
apps/admin-api
apps/worker
dataset import CLI and wiring
```

### Required workspace sweep

Search for:

- `PostgresDataset*`;
- imports from `@lana/database`;
- test-only imports;
- dynamic imports;
- package dependencies;
- barrel re-exports;
- control/simulation workers;
- generated build references where applicable.

### Acceptance criteria

- [ ] Global search finds no dataset-store symbol imported from `@lana/database`.
- [ ] All package manifests use the correct direct dependency.
- [ ] `pnpm -r typecheck` passes.
- [ ] `pnpm -r test` passes.
- [ ] No consumer was assumed absent without a workspace search.

---

## DB-04 — Remove Dependency and Enforce Architecture Rules

**Type:** Implementation  
**Priority:** P1  
**Risk:** Medium  
**Behavior:** No business change  
**Milestone:** M3  
**Complexity:** M  
**Labels:** `track/dependency-boundary`, `type/implementation`, `priority/p1`, `behavior/no-change`

### Depends on

- DB-03

### Required removals

From `@lana/database`:

```json
"@lana/dataset-review": "workspace:*"
```

Remove prebuild hooks that force dataset-review to build.

Remove dataset-store exports from:

```text
packages/database/src/index.ts
```

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

### Acceptance criteria

- [ ] `@lana/database` builds without building dataset-review.
- [ ] Forbidden imports fail CI.
- [ ] No reverse re-export exists.
- [ ] No dependency cycle exists.
- [ ] Root release-integrity/architecture check includes these rules.

---

## DB-05 — Run Dataset Integration and Compatibility Evidence

**Type:** Operations  
**Priority:** P1  
**Risk:** Low  
**Behavior:** No business change  
**Milestone:** M3  
**Complexity:** S  
**Labels:** `track/dependency-boundary`, `type/operations`, `priority/p1`

### Depends on

- DB-04

### In scope

- Admin dataset-review smoke test.
- Prelabel smoke test.
- Import idempotency test.
- Existing ciphertext decryptability test.
- Package build-order verification.

### Acceptance criteria

- [ ] Existing datasets remain readable.
- [ ] Existing encrypted payloads decrypt.
- [ ] Re-import remains idempotent.
- [ ] Admin and worker paths pass.
- [ ] No migration or data rollback is required.

---

# 6. Track DF — Sales Runtime Authority

## EPIC-DF — Establish Canonical Sales Evidence and Commerce Authority

**Type:** Epic  
**Priority:** P1  
**Labels:** `track/sales-runtime`, `type/epic`, `gate/model-context`, `gate/funnel-authority`  
**Milestones:** M4, M5

### Outcome

- Analytics dimensions are explicit.
- Canonical buying intent and product-aware cart readiness exist.
- Conversation phase is derived.
- Barriers have finite lifecycles.
- Model Context V2 is evaluated.
- Commerce FSM becomes authoritative behind a runtime mode.
- Legacy regex becomes shadow-only.

### Child issues

- DF-01 — Expose test/debug observability contract
- DF-02 — Add analytics dimensions migration
- DF-03 — Populate new analytics dimensions and deprecate legacy stage
- DF-04 — Consolidate text-normalization consumers
- DF-05 — Define canonical buying-intent evidence
- DF-06 — Implement product-aware cart readiness
- DF-07 — Implement conversation-phase projection in shadow
- DF-08 — Implement barrier lifecycle and decay ADR
- DF-09 — Implement Model Context V2 and migrate deterministic consumers
- DF-10 — Build generative evaluation gate
- DF-11 — Add commerce-authority runtime mode and cutover path
- DF-12 — Add missing-commerce operational signal
- DF-13 — Execute quantitative shadow/canary promotion

---

## DF-01 — Expose Test and Debug Observability Contract

**Type:** Implementation  
**Priority:** P1  
**Risk:** Low  
**Behavior:** No production behavior change  
**Milestone:** M4  
**Complexity:** M  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`, `behavior/no-change`

### Objective

Expose all dimensions needed for regression gates before changing production analytics or authority.

### Required output

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

### Required fixtures

- purchase request with missing size;
- purchase request with missing color;
- complete variant and cart opening;
- cart expiration;
- product switch;
- price objection then acceptance;
- fit objection then size selection;
- `ORDER_PREVIEW` followed by a question;
- `đúng`, `đừng`, `dừng`, `dung`;
- post-sale;
- handoff;
- committed buying intent with missing commerce state.

### Acceptance criteria

- [ ] Fixtures expose all requested dimensions.
- [ ] Test output contains no raw PII.
- [ ] Existing behavior is unchanged.
- [ ] The harness can compare legacy and derived outputs.

---

## DF-02 — Add Analytics Dimensions Migration

**Type:** Implementation  
**Priority:** P1  
**Risk:** Medium  
**Behavior:** Additive telemetry  
**Milestone:** M4  
**Complexity:** M  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`, `requires/migration`

### Objective

Add explicit analytics fields without attempting to reinterpret historical mixed-vocabulary records.

### Proposed migration

```text
0031_realtime_decision_dimensions
```

The exact storage target is the partitioned parent `conversation_events`; parent-table alteration must cover the default and future partitions. `messages.sales_stage` is out of scope.

The same release updates:

```text
packages/database/migrations/0031_realtime_decision_dimensions.up.sql
packages/database/migrations/0031_realtime_decision_dimensions.down.sql
packages/database/src/realtime-runtime.ts
apps/admin-api/src/store.ts
admin_conversation_events_v
```

New columns are nullable and constrained to versioned enum values. `active_barrier` stores only bounded barrier type, never source event key/raw evidence. The security-barrier Admin view retains existing grants and exposes no `customer_hash` or raw `event_metadata`.

Rollback reverts writers/readers while leaving additive columns. Production must not run a destructive down migration. Migration `0031` is provisional until merge-day verification confirms it is the next unused ID.

### Fields

```text
commerce_stage
conversation_phase
active_barrier
phase_source
canonical_buying_intent
cart_readiness_status
```

Retain but deprecate:

```text
stage
```

Optional shadow metadata:

```text
legacy_detected_phase
```

### Historical rule

Before the release boundary:

```text
stage = legacy
commerce_stage = null
conversation_phase = null
active_barrier = null
```

### Acceptance criteria

- [ ] Migration ID is rechecked against current `main` before merge.
- [ ] Migration is additive, idempotent, and backward-compatible with the previous binary.
- [ ] A restored production backup passes migration and previous-binary compatibility tests.
- [ ] `conversation_events`, every partition, writer, Admin store, and security-barrier view expose the intended columns consistently.
- [ ] No historical backfill guesses meanings.
- [ ] Rollback does not require deleting columns or data.
- [ ] Admin role can read the bounded view but not raw event metadata, customer hash, or base-table PII.
- [ ] PII review passes.

---

## DF-03 — Populate New Analytics Dimensions and Deprecate Legacy Stage

**Type:** Implementation  
**Priority:** P1  
**Risk:** Medium  
**Behavior:** Additive telemetry  
**Milestone:** M4  
**Complexity:** M  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`

### Depends on

- DF-01
- DF-02

### Objective

Write explicit dimensions for new events and stop new dashboards from consuming ambiguous `stage`.

### Required semantic change

Version types explicitly:

```text
SalesStageV1
ConversationPhaseV2
```

`ConversationPhaseV2` does not include:

```text
OBJECTION_HANDLING
```

Objections move to:

```text
activeBarrier
```

### Acceptance criteria

- [ ] New events contain `commerce_stage` when commerce state exists.
- [ ] New events contain phase and barrier fields when derived.
- [ ] No fallback equivalent to `salesStageAfter ?? nextState.salesStage` remains in the new contract.
- [ ] New report queries do not use legacy `stage`.
- [ ] Dashboard consumers account for the phase/barrier split.
- [ ] Legacy `stage` remains readable only for historical compatibility.

---

## DF-04 — Consolidate Text-Normalization Consumers

**Type:** Implementation  
**Priority:** P1  
**Risk:** Medium  
**Behavior:** Limited and consumer-specific  
**Milestone:** M4  
**Complexity:** M  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`

### Depends on

- CF-01
- CF-04 completed or confirmation behavior locked

### Objective

Migrate duplicated text-normalization implementations to shared primitives without coupling all consumers to one semantic output.

### Shared API

```ts
normalizeVietnameseNfc(text)
foldVietnameseForRecall(text)
tokenizeAsciiForRegex(text)
```

### Rules

- confirmation uses NFC-preserving normalization;
- recall/search may use folded text;
- regex consumers use a clearly named regex tokenization helper;
- each consumer migration includes its own regression tests.

### Acceptance criteria

- [ ] Independent `asciiFold` implementations are removed from migrated modules.
- [ ] Consumer-specific behavior is documented.
- [ ] Buying-signal regression tests pass.
- [ ] Confirmation regression tests remain unchanged.
- [ ] No broad behavior change is hidden inside a utility move.

---

## DF-05 — Define Canonical Buying-Intent Evidence

**Type:** Implementation  
**Priority:** P1  
**Risk:** Medium  
**Behavior:** Shadow first  
**Milestone:** M4  
**Complexity:** M  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`, `behavior/shadow`

### Objective

Define one consumer-facing buying-intent result by reusing existing hybrid resolution.

### Reuse

```text
AgentBuyingIntentV1
detectBuyingSignal()
resolveHybridBuyingSignal()
```

### Required output

```ts
{
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
}
```

### Rules

- Raw model output is evidence, not authority.
- Exact evidence and confidence checks remain.
- Informational questions cannot become committed side effects.
- Explicit deterministic action evidence wins when not negated/questioned/ambiguous.
- Model evidence may fill a missing action only after schema, confidence, and exact-evidence guards pass.
- Deterministic/model conflict resolves to no action with a reason code; never choose the more aggressive action.
- Quantity comes only from deterministic structured extraction or verified cart state.
- Deterministic guards retain final authority.

### Acceptance criteria

- [ ] No second buying-intent classifier is created.
- [ ] Consumer contract always identifies source.
- [ ] Tests cover deterministic, model, negated, considering, and none.
- [ ] Model evidence alone cannot open a cart.

---

## DF-06 — Implement Product-Aware Cart Readiness

**Type:** Implementation  
**Priority:** P1  
**Risk:** Medium  
**Behavior:** Shadow first  
**Milestone:** M4  
**Complexity:** L  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`, `behavior/shadow`

### Depends on

- DF-05

### Required output

```ts
{
  status: "READY" | "BLOCKED" | "NOT_APPLICABLE";
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
  evaluatedAt: string;
  evidenceRefs: readonly {
    kind: "PRODUCT" | "VARIANT" | "STOCK" | "POLICY" | "PRICE";
    ref: string;
    observedAt: string;
    expiresAt: string | null;
  }[];
}
```

### Rules

- One-size products do not require size.
- Products without color variants do not require color.
- Informational intent is `NOT_APPLICABLE`.
- Policy or stock may block readiness.
- Requirements derive from the current verified product/offer state and current time.
- Readiness is recomputed immediately before cart, preview, or confirmation side effects.
- Expired price, stock, policy, product, or variant evidence produces `BLOCKED` with a bounded reason code.
- Evidence references are opaque and PII-safe; they never contain customer text or full provider payloads.
- Until Track UR, state/projection/event/outbox changes extend the existing `PostgresRealtimeRuntimeStore.commit` transaction and do not create an uncoordinated writer.

### Acceptance criteria

- [ ] Readiness is not a single global boolean rule.
- [ ] Optional product dimensions are tested.
- [ ] Missing requirements are deterministic and reason-coded.
- [ ] Readiness alone does not emit side effects.
- [ ] Missing or expired verified facts/stock/policy are represented correctly.
- [ ] Freshness changes between classification and side effect are caught by final recomputation.
- [ ] Evidence refs contain no PII/raw provider payload.
- [ ] Existing atomic commit and exactly-once Outbox behavior remain intact.

---

## DF-07 — Implement Conversation-Phase Projection in Shadow

**Type:** Implementation  
**Priority:** P1  
**Risk:** Medium  
**Behavior:** Shadow only  
**Milestone:** M5  
**Complexity:** M  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`, `behavior/shadow`

### Depends on

- DF-01
- DF-03
- DF-06

### Required function

```ts
deriveConversationPhase({
  commerceStage,
  hasProduct,
  journey,
  ownership
})
```

### Required mapping

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

post-sale
    → POST_SALE
```

### Rules

- No `max(rank)`.
- Projection may move backward on product switch, cart expiration, preview invalidation, fact failure, or commerce reset.
- Handoff/ownership remain separate dimensions and do not create a phase.
- While ownership is `HUMAN`, phase may be observed but no bot CTA or commerce side effect is emitted.
- Shadow result cannot affect prompts, CTA, cart, handoff, or reply.

### Acceptance criteria

- [ ] Pure function has exhaustive unit tests.
- [ ] Backward transitions are tested.
- [ ] Exact missing-size example derives `FIT_CONSULTING`.
- [ ] `ORDER_PREVIEW` derives `ORDER_REVIEW`; `PURCHASE_CONFIRMED` derives `ORDER_CONFIRMED`.
- [ ] Shadow differences are reason-coded.
- [ ] No production consumer reads the shadow value.

---

## DF-08 — Implement Barrier Lifecycle and Decay ADR

**Type:** ADR + Implementation  
**Priority:** P1  
**Risk:** Medium  
**Behavior:** Shadow first  
**Milestone:** M5  
**Complexity:** L  
**Labels:** `track/sales-runtime`, `type/adr`, `priority/p1`, `behavior/shadow`

### Depends on

- DF-01
- DF-07

### Required state

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

### Required clear rules

Clear when:

1. explicit resolution occurs;
2. commerce progresses beyond the blocked point;
3. product changes;
4. handoff occurs;
5. post-sale begins;
6. a new barrier supersedes the old barrier;
7. approved silent-customer-turn decay is exceeded.

### ADR requirements

- Define turn-decay threshold.
- Document replay evidence.
- Explain why wall-clock TTL is cleanup only.
- Define barrier supersession behavior.
- Define audit-history retention.
- Define `sourceEventRef` as a SHA-256 reference over an opaque internal ID; prohibit raw event key, customer text, provider payload, and PII.
- In `SHADOW`, emit bounded comparison telemetry only and persist no third authority.
- In `COMMERCE` before State V2, persist barrier in the versioned legacy conversation projection through the existing atomic commit.
- After State V2 cutover, persist barrier in encrypted canonical state and treat legacy state as a projection.

### Acceptance criteria

- [ ] Price barrier clears after accepted price/offer or checkout progression.
- [ ] Fit barrier clears after verified size selection.
- [ ] Product switch clears product-scoped barriers.
- [ ] Barrier cannot remain sticky indefinitely.
- [ ] Decay threshold is approved before active use.
- [ ] Shadow telemetry distinguishes activation, clear, supersession, and decay.
- [ ] Barrier telemetry/state contains no raw event key, customer text, provider payload, or PII.
- [ ] Shadow, pre-V2 active, and post-V2 storage transitions are covered by atomic-write fixtures.

---

## DF-09 — Implement Model Context V2 and Migrate Deterministic Consumers

**Type:** Implementation  
**Priority:** P1  
**Risk:** High  
**Behavior:** Shadow/config-gated  
**Milestone:** M5  
**Complexity:** L  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`, `risk/high`, `requires/human-review`

### Depends on

- CF-03 behavior-mode control-plane foundation
- DF-05
- DF-06
- DF-07
- DF-08

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

### In scope

- Prompt templates.
- System instructions.
- Wave 2 strategy inputs.
- CTA policy selection.
- Post-media CTA logic.
- Model-output interpretation.
- Context-version audit metadata.
- Tests currently keyed to `salesStage`.

### Rules

- Do not provide conflicting V1 and V2 commercial fields to the active model.
- `LEGACY`: live model receives Context V1.
- `SHADOW`: live behavior receives Context V1; a sampled asynchronous second call receives Context V2 side-effect-free.
- Before DF-11, `salesAuthorityMode=SHADOW` is consumed only by projection/comparison/evaluation code; Funnel A remains authoritative.
- `COMMERCE`: live model receives only Context V2; there is no independent live context flag.
- Paired calls use the same audited model/config and verified-fact envelope with a correlation ID.
- Shadow has no Outbox, cart, tag, handoff, or side-effect capability and cannot delay the live response.
- Shadow uses a separately approved hourly/daily quota, spend ceiling, sampling rate, and skip reason.
- Evidence stores PII-safe hashes, bounded scores, identifiers, token usage, latency, and estimated cost; no raw PII/model body.
- Deterministic strategy and CTA behavior must be testable separately from generated text.
- No model output may bypass guards.

### Acceptance criteria

- [ ] Context V2 is versioned.
- [ ] Every production `salesStage` consumer is inventoried.
- [ ] Migrated deterministic consumers use V2 fields.
- [ ] Legacy context remains available only behind `LEGACY`/`SHADOW`; Context V2 live activation is atomic with `COMMERCE`.
- [ ] Paired shadow cannot block/delay live output and cannot access side-effect ports.
- [ ] Quota, cost ceiling, sampling/skip telemetry, and model usage are approved and tested.
- [ ] Verified facts and media protections remain.
- [ ] No model-only side effect path exists.

---

## DF-10 — Build Generative Evaluation Gate

**Type:** Implementation + Operations  
**Priority:** P1  
**Risk:** High  
**Behavior:** Evaluation only  
**Milestone:** M5  
**Complexity:** L  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`, `requires/human-review`

### Depends on

- DF-09

### Objective

Evaluate Model Context V2 as a stochastic behavioral change rather than relying only on deterministic differential tests.

### Evaluation inputs

- golden conversations;
- replay dataset;
- blind V1/V2 human comparison;
- controlled canary conversations.

### Review dimensions

- relevance;
- sales progression;
- missing size/color handling;
- objection handling;
- CTA timing;
- repetition;
- hallucination;
- tone;
- clarification quality;
- verified-fact preservation.

### Required pre-registration

Before reviewing canary outcomes, record:

- a blinded paired 1–5 rubric;
- at least 100 eligible pairs stratified across critical phases, barriers, and missing-requirement cases;
- primary non-safety score: mean relevance, progression, objection handling, CTA timing, repetition, tone, and clarification quality;
- non-inferiority: lower bound of paired 95% bootstrap CI for `V2 - V1` is at least `-0.15`;
- safety invariants with zero permitted V2 regression: hallucinated/lost verified facts or media, unauthorized side effect, premature CTA, PII exposure, or incorrect handoff;
- two blind reviewers and adjudication of every safety disagreement;
- sample selection/exclusion method, reviewer agreement report, audited model/config, quota/cost ceiling, and reviewer instructions.

### Acceptance criteria

- [ ] At least 100 eligible paired generations and required stratum coverage are complete.
- [ ] Safety invariants pass at 100% with every reviewer disagreement adjudicated.
- [ ] No unresolved CTA-timing regression.
- [ ] Paired 95% bootstrap CI lower bound is at least `-0.15`.
- [ ] Threshold, sampling, and exclusions were frozen before outcomes were reviewed and were not relaxed afterward.
- [ ] Model/config, reviewer identities, agreement, adjudications, usage, latency, and cost are append-only evidence.
- [ ] Results separate deterministic failure from generative quality.
- [ ] Evaluation can be rerun for later model/config changes.

---

## DF-11 — Add Commerce-Authority Runtime Mode and Cutover Path

**Type:** Implementation  
**Priority:** P1  
**Risk:** High  
**Behavior:** Customer-visible  
**Milestone:** M5  
**Complexity:** L  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`, `risk/high`, `behavior/customer-visible`, `requires/canary`

### Depends on

- DF-07
- DF-08
- DF-09
- DF-10

### Runtime mode

```text
REALTIME_SALES_AUTHORITY_MODE
    = LEGACY
    | SHADOW
    | COMMERCE
```

- `LEGACY`: Funnel A/Context V1 remain live.
- `SHADOW`: Funnel A/Context V1 remain live; commerce projections, deterministic V2 consumers, and sampled Context V2 generations are side-effect-free comparisons.
- `COMMERCE`: commerce FSM, derived phase, V2 deterministic consumers, and Context V2 are live atomically.

The value is resolved from the versioned behavior-mode control plane created in CF-03; the environment variable is startup fail-safe only.

Normal promotion is pinned at the sales-episode/cart boundary so authority cannot change mid-command sequence. An audited emergency `LEGACY` override supersedes pins after the five-second cache bound; this is safe only while legacy compatibility projections remain atomically current.

Every decision records mode version/hash and resolver source. Worker readback, propagation time, cache, pin, last-known-good expiry, and emergency override require integration tests.

### Atomic activation requirement

The `COMMERCE` mode must activate together:

- derived `ConversationPhaseV2`;
- demotion of legacy regex writer;
- Model Context V2;
- deterministic consumers migrated to V2.

### Required post-cutover authority

```text
commerceStage
    = authoritative

conversationPhase
    = derived

activeBarrier
    = orthogonal

legacy regex stage
    = shadow telemetry only
```

### Fail-closed rule

When commerce state is unavailable:

```text
commerceStage = null
```

Only structural phases may be derived:

```text
DISCOVERY
PRODUCT_MATCHED
POST_SALE
```

### Acceptance criteria

- [ ] No production decision reads legacy `salesStage` in `COMMERCE` mode.
- [ ] Legacy regex cannot promote to `READY_TO_BUY`.
- [ ] Mode switches without redeploy through the database-backed control plane; an environment-only change is not accepted.
- [ ] Worker readback proves active version/hash within five seconds.
- [ ] Normal pins prevent mixed authority; emergency `LEGACY` override supersedes them safely.
- [ ] LKG expiry fails to `LEGACY` and emits a bounded operational signal.
- [ ] Mode activation, resolution source, decision version, and override are audited.
- [ ] Missing-size purchase request remains `MEASUREMENTS_REQUIRED` / `FIT_CONSULTING`.
- [ ] Rollback to `LEGACY` does not delete or rewrite state.

---

## DF-12 — Add Missing-Commerce Operational Signal

**Type:** Implementation  
**Priority:** P1  
**Risk:** Low  
**Behavior:** Telemetry only  
**Milestone:** M5  
**Complexity:** S  
**Labels:** `track/sales-runtime`, `type/implementation`, `priority/p1`

### Depends on

- DF-05
- DF-11

### Trigger

```text
canonical buyingIntent = COMMITTED
commerceStage = null
```

### Required reason code

```text
COMMERCE_STATE_MISSING_WITH_COMMITTED_BUYING_INTENT
```

### Requirements

- no raw customer text;
- no PII;
- include page/release dimensions;
- rate-limit alerts;
- dashboard visibility;
- fail closed for cart/order side effects.

### Acceptance criteria

- [ ] Unit test emits the reason code.
- [ ] Telemetry contains no PII.
- [ ] Alert threshold is documented.
- [ ] Failure remains safe but is no longer silent.

---

## DF-13 — Execute Quantitative Shadow and Canary Promotion

**Type:** Operations  
**Priority:** P1  
**Risk:** High  
**Behavior:** Customer-visible in approved canary  
**Milestone:** M5  
**Complexity:** L  
**Labels:** `track/sales-runtime`, `type/operations`, `priority/p1`, `requires/canary`, `requires/human-review`, `risk/high`

### Depends on

- DF-10
- DF-11
- DF-12
- Gate R
- Gate C

### Default minimum gate

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
    <= 1%
    after approved expected corrections are excluded
```

### Transition coverage

At least five reviewed examples per critical transition:

- `MEASUREMENTS_REQUIRED`;
- `SIZE_RECOMMENDED`;
- `CART_OPEN`;
- `ORDER_PREVIEW`;
- `PURCHASE_CONFIRMED`;
- product switch/reset;
- barrier activation;
- barrier clear.

Controlled scenarios must fill gaps when natural canary volume is insufficient.

### Required correction case

For `“đặt cho chị bộ này”` with missing size:

```text
commerceStage = MEASUREMENTS_REQUIRED
conversationPhase = FIT_CONSULTING
cartReadiness = BLOCKED
missingRequirements includes SIZE
no READY_TO_BUY decision
```

### Acceptance criteria

- [ ] All quantitative thresholds pass.
- [ ] Every divergence is classified.
- [ ] Rollback to `LEGACY` is rehearsed.
- [ ] Human Messenger scenarios pass.
- [ ] Promotion evidence is append-only.
- [ ] Threshold changes, if any, were approved before promotion.

---

# 7. Track UR — Canonical State V2

## EPIC-UR — Introduce and Cut Over to Encrypted Canonical Runtime State

**Type:** Epic  
**Priority:** P1/P2  
**Labels:** `track/state-v2`, `type/epic`, `gate/unified-state`  
**Milestones:** M6, M7, M8

### Outcome

- One canonical revision and fence.
- Encrypted canonical runtime state.
- Atomic writes to canonical state, compatibility projections, events, and outbox.
- Shadow comparison.
- Runtime-gated read cutover.
- Legacy retirement after rollback window.

### Child issues

- UR-00 — Approve State V2 ADR and go/no-go
- UR-01 — Add encrypted State V2 schema
- UR-02 — Define canonical reducer output contract
- UR-03 — Implement atomic transactional dual-write
- UR-04 — Implement idempotent backfill
- UR-05 — Implement shadow-read comparator
- UR-06 — Add State V2 read mode
- UR-07 — Execute V2 canary and rollback rehearsal
- UR-08 — Stop legacy writes
- UR-09 — Remove legacy readers and compatibility flags
- UR-10 — Define deferred legacy storage cleanup

---

## UR-00 — Approve State V2 ADR and Go/No-Go

**Type:** ADR  
**Priority:** P1  
**Risk:** High  
**Behavior:** No change  
**Milestone:** M6  
**Complexity:** M  
**Labels:** `track/state-v2`, `type/adr`, `priority/p1`, `requires/security-review`

### Depends on

- DF-13 complete and commerce authority stabilized

### ADR must cover

- confirmed starting point: current sales-cycle state is envelope-encrypted and current conversation/sales-cycle writes share `PostgresRealtimeRuntimeStore.commit`;
- canonical state boundary and fields intentionally kept outside State V2;
- two independently expiring encrypted domains: conversation/core and short-lived commerce/checkout/address;
- field-by-field mapping from every legacy source to target envelope or compatibility projection;
- retention/deletion matrix for Redis, PostgreSQL, audit, profile, cart, checkout, and address data;
- envelope format, key references, AAD strings, rotation, corrupt-ciphertext behavior, and compatibility;
- schema ownership, least-privilege roles/grants, backup, and restore-test;
- revision, fence, expected-version, row-lock/CAS, and concurrent-command semantics;
- transaction and projection ownership, Outbox planning, and exactly-once compatibility;
- backfill conflicts, idempotency, dry-run, batches, rate limit, pause, and resume;
- read fallback, rollback window, retirement criteria, operational cost, and expected temporary complexity increase;
- explicit decision whether customer profile remains a separately governed store.

### Acceptance criteria

- [ ] Security review approves encryption boundary.
- [ ] Transaction boundary is explicit.
- [ ] Legacy records are defined as projections, not co-equal truth.
- [ ] Rollback and retention windows are defined.
- [ ] Go/no-go decision is recorded.
- [ ] No unsupported claim of guaranteed LOC reduction is made.

---

## UR-01 — Add Encrypted State V2 Schema

**Type:** Implementation  
**Priority:** P1  
**Risk:** High  
**Behavior:** No output change  
**Milestone:** M6  
**Complexity:** L  
**Labels:** `track/state-v2`, `type/implementation`, `priority/p1`, `requires/migration`, `requires/security-review`

### Depends on

- UR-00

### Proposed table

```text
conversation_runtime_states_v2
```

### Proposed fields

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

### Rules

- Core and commerce envelopes share revision/fence but expire independently.
- Short-lived checkout/address data cannot be retained by core-state expiry.
- Sensitive checkout/address data is envelope-encrypted using ADR-approved AAD/key compatibility.
- Fast-query fields may exist only as bounded projections.
- Migration is additive, idempotent, and compatible with the previous binary.
- Legacy tables remain; production rollback does not run a destructive down migration.
- Admin roles receive no ciphertext/decrypted-state access; runtime roles use least privilege.

### Acceptance criteria

- [ ] Migration is additive, idempotent, restore-tested, and backward-compatible with the previous binary.
- [ ] Core and commerce expiry tests prove short-lived data is independently erasable.
- [ ] Encryption/decryption, key rotation, corrupt-ciphertext, and exact AAD compatibility tests pass.
- [ ] No sensitive canonical JSON is stored plaintext.
- [ ] Runtime/Admin database grants pass least-privilege tests.
- [ ] Customer profile is either explicitly out of scope or governed by ADR-approved independent retention.

---

## UR-02 — Define Canonical Reducer Output Contract

**Type:** Implementation  
**Priority:** P1  
**Risk:** High  
**Behavior:** No output change  
**Milestone:** M6  
**Complexity:** L  
**Labels:** `track/state-v2`, `type/implementation`, `priority/p1`

### Depends on

- UR-00
- UR-01

### Required reducer output

```text
canonical encrypted state
routing projections
decision events
transactional outbox plans
tag plans
handoff plans
canonical runtime revision
canonical fence
```

### Acceptance criteria

- [ ] Reducer is deterministic for identical input/state.
- [ ] Side-effect plans are data, not executed by the reducer.
- [ ] Revision/fence behavior is specified.
- [ ] Projection ownership is explicit.
- [ ] Golden fixtures cover commerce, barriers, handoff, and confirmation.

---

## UR-03 — Implement Atomic Transactional Dual-Write

**Type:** Implementation  
**Priority:** P1  
**Risk:** High  
**Behavior:** No output change  
**Milestone:** M6  
**Complexity:** XL  
**Labels:** `track/state-v2`, `type/implementation`, `priority/p1`, `risk/high`, `requires/security-review`

### Depends on

- UR-01
- UR-02

The implementation extends the existing `PostgresRealtimeRuntimeStore.commit` transaction and preserves its current atomicity. It does not introduce a parallel writer or imply that current legacy writes are uncoordinated.

### Required transaction

```text
BEGIN

validate expected state version
validate canonical runtime revision
validate fence
acquire required row lock or CAS protection

write State V2
write legacy conversation projection
write legacy sales-cycle projection
write decision/audit events
write transactional outbox plans
write handoff/tag plans

COMMIT
```

Any failure must:

```text
ROLLBACK all writes
```

### Required idempotency

- unique `command_id` or `event_key`;
- canonical revision;
- canonical fence;
- expected-version checks;
- database uniqueness constraints.

### Acceptance criteria

- [ ] All writes occur through one PostgreSQL transaction.
- [ ] Partial-failure tests prove no split state remains.
- [ ] Retry tests prove idempotency.
- [ ] Concurrency tests cover stale revision/fence.
- [ ] Legacy records are labeled compatibility projections.
- [ ] Outbox plans remain exactly-once compatible.

---

## UR-04 — Implement Idempotent Backfill

**Type:** Implementation  
**Priority:** P1  
**Risk:** High  
**Behavior:** No output change  
**Milestone:** M6  
**Complexity:** L  
**Labels:** `track/state-v2`, `type/implementation`, `priority/p1`, `requires/migration`

### Depends on

- UR-03

### In scope

- Read conversation state and sales-cycle state.
- Produce canonical V2 state.
- Record source revisions.
- Make repeated execution idempotent.
- Report conflicts without guessing.
- Avoid side effects.

### Acceptance criteria

- [ ] Backfill can resume safely.
- [ ] Re-running produces no duplicate state.
- [ ] Conflicting legacy data is reason-coded.
- [ ] No outbound event is emitted.
- [ ] PII is not logged.
- [ ] Dry-run and bounded-batch modes exist.

---

## UR-05 — Implement Shadow-Read Comparator

**Type:** Implementation  
**Priority:** P1  
**Risk:** Medium  
**Behavior:** Shadow only  
**Milestone:** M6  
**Complexity:** L  
**Labels:** `track/state-v2`, `type/implementation`, `priority/p1`, `behavior/shadow`

### Depends on

- UR-03
- UR-04

### Compare

- commerce stage;
- phase;
- barrier;
- buying intent;
- cart readiness;
- ownership;
- handoff;
- cart/checkout;
- planned side effects.

### Rules

- Shadow path emits no side effects.
- Mismatches use reason codes.
- Logs use safe hashes, not PII.
- Every divergence is classified.

### Acceptance criteria

- [ ] Comparator runs without affecting active behavior.
- [ ] Safety-critical divergence is separately classified.
- [ ] No raw message, address, or checkout PII is logged.
- [ ] Metrics support release/page dimensions.
- [ ] Comparator overhead is measured.

---

## UR-06 — Add State V2 Read Mode

**Type:** Implementation  
**Priority:** P1  
**Risk:** High  
**Behavior:** Customer-visible when active  
**Milestone:** M7  
**Complexity:** L  
**Labels:** `track/state-v2`, `type/implementation`, `priority/p1`, `behavior/customer-visible`, `requires/canary`

### Depends on

- CF-03 behavior-mode control-plane foundation
- UR-05

### Runtime mode

```text
REALTIME_STATE_READ_MODE
    = LEGACY
    | SHADOW
    | V2
```

The value is resolved from the versioned behavior-mode control plane created in CF-03. The environment variable is startup fail-safe only. Resolve once per inbound command, record version/hash/source, and never combine partial V2 and legacy fields in one read.

Worker readback proves propagation within five seconds. LKG lasts at most five minutes, then fails to a complete `LEGACY` read while compatibility writes remain active. An audited emergency `LEGACY` override requires no data deletion or rewrite.

### Rules

- `LEGACY`: read legacy projections.
- `SHADOW`: active behavior reads legacy; V2 is compared.
- `V2`: active behavior reads V2; legacy writes continue during rollback window.

### Acceptance criteria

- [ ] Mode switches without redeploy through the database-backed control plane; an environment-only change is not accepted.
- [ ] Worker readback proves active version/hash within five seconds.
- [ ] Mode version/hash/source, activation, LKG fallback, and emergency override are audited.
- [ ] Five-minute LKG expiry fails to a complete `LEGACY` read and emits a bounded operational signal.
- [ ] One command cannot combine partial V2 and legacy fields.
- [ ] `V2` does not stop compatibility writes prematurely.
- [ ] Rollback to `LEGACY` requires no data deletion or rewrite.
- [ ] Missing/expired/corrupt/stale-revision/stale-fence V2 state follows the ADR-defined policy.

---

## UR-07 — Execute V2 Canary and Rollback Rehearsal

**Type:** Operations  
**Priority:** P1  
**Risk:** High  
**Behavior:** Customer-visible in controlled scope  
**Milestone:** M7  
**Complexity:** L  
**Labels:** `track/state-v2`, `type/operations`, `priority/p1`, `requires/canary`, `requires/human-review`

### Depends on

- UR-06
- Gate F

### Promotion requirements

- golden fixtures pass at 100%;
- safety-critical divergence is zero;
- unclassified divergence is zero;
- replay deviations are classified;
- controlled Messenger scenarios pass;
- no new permanent failures;
- verified facts and media remain unchanged;
- rollback rehearsal passes.

### Acceptance criteria

- [ ] `V2` mode runs on approved canary scope.
- [ ] Legacy dual-write remains active.
- [ ] Rollback to `LEGACY` is demonstrated.
- [ ] Queue and outbox invariants remain.
- [ ] Append-only canary evidence is written.
- [ ] Promotion decision is explicit.

---

## UR-08 — Stop Legacy Writes

**Type:** Implementation  
**Priority:** P2  
**Risk:** High  
**Behavior:** Structural  
**Milestone:** M8  
**Complexity:** L  
**Labels:** `track/state-v2`, `type/cleanup`, `priority/p2`, `risk/high`

### Depends on

- UR-07
- approved rollback window completed

### In scope

- Stop legacy conversation commercial-state writes.
- Stop legacy sales-cycle writes.
- Preserve legacy records read-only.
- Keep audit retention.

### Out of scope

- Dropping legacy tables.
- Deleting data.
- Removing all readers in the same release.

### Acceptance criteria

- [ ] V2 is the only written canonical state.
- [ ] Legacy records remain queryable for audit.
- [ ] Rollback policy is updated to reflect end of dual-write.
- [ ] No destructive migration is included.

---

## UR-09 — Remove Legacy Readers and Compatibility Flags

**Type:** Cleanup  
**Priority:** P2  
**Risk:** Medium  
**Behavior:** Structural  
**Milestone:** M8  
**Complexity:** L  
**Labels:** `track/state-v2`, `type/cleanup`, `priority/p2`

### Depends on

- UR-08
- retention and rollback criteria satisfied

### In scope

- Remove production readers of legacy conversation commercial state.
- Remove production readers of legacy sales-cycle state.
- Remove retired compatibility exports.
- Remove runtime flags in a separate cleanup release.
- Update documentation and architecture checks.

### Acceptance criteria

- [ ] Global search finds no production legacy reader.
- [ ] Legacy flags are removed only after no longer needed.
- [ ] Audit tooling remains available according to retention policy.
- [ ] Full regression suite passes.

---

## UR-10 — Define Deferred Legacy Storage Cleanup

**Type:** ADR / Deferred Cleanup  
**Priority:** P2  
**Risk:** High  
**Behavior:** Destructive if executed  
**Milestone:** Post-M8  
**Complexity:** M  
**Labels:** `track/state-v2`, `type/adr`, `priority/p2`, `requires/security-review`

### Depends on

- UR-09
- retention period completed

### Objective

Decide whether and when old tables or columns may be archived or dropped.

### Rules

- Do not combine with stopping legacy writes.
- Require backup and restore-test.
- Require legal/audit retention review.
- Require explicit destructive-change approval.
- Prefer archival before deletion.

### Acceptance criteria

- [ ] Cleanup decision is documented separately.
- [ ] No destructive migration is automatically scheduled by the main program.
- [ ] Retention, backup, and restore evidence are defined.

---

# 8. Dependency and Execution Order

## 8.1 Primary dependency chain

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

The diagram is the release-level critical path. Each issue’s explicit `Depends on` list remains authoritative when it adds an extra prerequisite.

## 8.2 Parallel work

- CF development may run in parallel, but customer-visible promotion requires Gate R or equivalent approved manual parity evidence.
- DB runs independently from CF/DF and must not share a release with an authority cutover.
- DF-01 through DF-06 may proceed while DB runs.
- UR implementation cannot start before DF-13 is stable and UR-00 is approved.
- A blocked optional/deferred track does not block an earlier safety hotfix unless its explicit gate depends on that track.

## 8.3 Release separation rules

Do not combine:

- dataset extraction and commerce-authority cutover;
- confirmation promotion and State V2;
- authority cutover and page-allowlist expansion;
- authority cutover and destructive legacy cleanup;
- stop-legacy-write and reader removal;
- reader removal and storage deletion.

## 8.4 Executable release slices

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

Every slice is a separate pull request/release candidate unless adjacent no-behavior slices are explicitly combined after review. Each candidate starts from current GitHub `main`, receives an immutable tag, and follows GitHub → new VPS release directory → targeted service recreation → candidate runtime-state verification → promotion.

---
# 9. Gate Checklists

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
# 10. Suggested GitHub Project Views

## View: Immediate P0

Filter:

```text
priority/p0 is:open
```

Expected issues:

- RI-00 through RI-04
- CF-01 through CF-04

## View: No-Behavior Structural Work

Filter:

```text
behavior/no-change is:open
```

Expected focus:

- Release schema/CI
- Dataset package extraction
- State V2 schema foundations before activation

## View: Canary Required

Filter:

```text
requires/canary is:open
```

Expected issues:

- CF-03
- CF-04
- DF-11
- DF-13
- UR-06
- UR-07

## View: Expansion Blockers

Filter by open issues linked to:

- Gate R
- Gate C
- Gate D
- Gate E
- Gate F
- Gate U

---

# 11. Program Definition of Done

The program is complete when:

- [ ] Existing `r32.2.2` drift has an append-only reconciliation record.
- [ ] README no longer changes to track each current release.
- [ ] Runtime state is machine-readable and verified per service.
- [ ] Rollback targets are represented per service.
- [ ] `@lana/database` no longer depends on `@lana/dataset-review`.
- [ ] Dependency-cycle guards work in both directions.
- [ ] Vietnamese confirmation distinguishes `đúng`, `đừng`, and `dừng`.
- [ ] Ambiguous confirmation produces an explicit clarification action.
- [ ] Every customer-visible cutover has a tested runtime rollback mode.
- [ ] Behavior modes are versioned, database-backed, page-scoped, auditable, and proven by worker readback.
- [ ] Canonical buying intent and product-aware cart readiness exist.
- [ ] Model Context V2 passes deterministic and generative evaluation.
- [ ] New analytics do not use an ambiguous shared stage.
- [ ] Commerce FSM is the sole authority for commercial progress.
- [ ] Conversation phase is a projection.
- [ ] Objections are finite-lifecycle barriers.
- [ ] Legacy regex no longer affects production decisions.
- [ ] Missing commerce state with committed intent is operationally visible.
- [ ] State V2 and all compatibility projections write atomically.
- [ ] Sensitive canonical state is encrypted.
- [ ] Core and short-lived commerce envelopes preserve independent retention/expiry.
- [ ] Idempotent backfill and shadow comparison complete before V2 reads.
- [ ] State V2 read cutover is complete.
- [ ] Legacy state is retired after the rollback window.
- [ ] A second page or brand can pass its required gates without reproducing the original defects.
