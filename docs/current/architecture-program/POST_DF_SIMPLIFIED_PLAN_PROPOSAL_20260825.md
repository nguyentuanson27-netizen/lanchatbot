# Post-DF Hybrid Execution Plan — Anti-Bloat V5

**Status:** `PROPOSED / OWNER-DECISION-READY` — merged as PR #258, but not adopted into the active program state. This document does not itself authorize release, migration, runtime mutation, COMMERCE activation, real-customer traffic, production hardening, or destructive cleanup.
**Operating context:** `ENGINEERING_PREPROD` / one `PREPROD_TEST_PAGE`.
**Primary objective:** activate COMMERCE safely, complete the intended model-vs-code authority split, then iterate sales quality quickly without rebuilding the old architecture/governance program around every tuning cycle.

---

## 0. Context, scope, anti-bloat contract, and adoption

### Why this plan exists

The project needs to move from **architecture construction** to **product learning** without weakening the safety/provenance machinery already built.

The current PREPROD program has already invested in exact candidate identity, stopped-process authority transition, release/startup evidence, safety guards, readback, and rollback. Those are correctness constraints and stay. What moves out of the default critical path is speculative completeness work that does not yet improve the bot's customer-facing sales capability.

V5 therefore keeps exactly three default Tracks:

1. **TRACK A — Activate COMMERCE safely**
2. **TRACK B — Complete model authority**
3. **TRACK C — Improve sales quality continuously**

Everything else is an invariant, bounded artifact, checklist, or trigger-based task.

> **Core principle:** reuse the safety plumbing already built, fix only the concrete activation blocker already proven in current code, make the model genuinely own normal sales strategy and wording, then spend engineering effort on measured sales quality rather than speculative architecture completeness.

### Current repository context to preserve

The plan starts from the current recorded state:

- operating mode: `ENGINEERING_PREPROD`;
- live page role: `PREPROD_TEST_PAGE`;
- gate: `GATE_E_PREPROD_ACCEPTED`;
- runtime sales authority: `LEGACY`;
- DF13 source foundations complete, operational acceptance/runtime activation pending;
- first DF13 PREPROD exercise uses stopped/fresh-process replacement;
- 0035/0036 remain pending DF13 artifacts outside automatic migration discovery;
- Gate F remains the technical acceptance boundary for the first COMMERCE exercise;
- the active program point remains `DF-13 Operational Acceptance`; V5 has not changed it; and
- UR / State V2 are not on the proposed post-Gate-F critical path unless a concrete trigger pulls in a narrow slice.

Target runtime architecture:

```text
sanitized input + verified state/facts
-> model semantic proposal
-> model structured claims/actions + normal customer-facing draft
-> deterministic claim verification
-> deterministic state/effect reconciliation
-> bounded model regeneration request or fixed safe fallback
-> final guard
-> authorized reply / Outbox / state / handoff effects
```

The model owns normal conversational semantics, normal sales strategy, and normal customer-facing wording.

Deterministic code owns verified facts/provenance, safety/security/PII, reconciliation, authorization, idempotency, fail-closed behavior, and bounded safe fallback. Deterministic code must not become a second Vietnamese sales copywriter.

### Goals

- **G1 — Minimize time-to-COMMERCE:** use existing DF13 operational plumbing; do not redesign it without a concrete blocker.
- **G2 — Preserve safety/correctness:** keep exact authority transition, candidate/runtime identity, claim/provenance checks, PII/security, side-effect authorization, readback, and rollback.
- **G3 — Complete model authority:** COMMERCE being active is insufficient if deterministic code still owns normal strategy/copywriting.
- **G4 — Maximize product-learning speed:** after authority is correct, enable a small repeatable safety + quality tuning loop.

### Anti-bloat contract

**Default: do not add another Track.** A fourth Track requires proof that a specific current failure blocks G1–G4 and cannot fit inside A/B/C as a checklist, invariant, acceptance criterion, or trigger.

Do not turn rollback evidence, migration sanity, Gate F evidence, replay hashes, Gate-E rerun CLI, promotion evidence, quality judge adapter, or PII readiness into standalone projects.

Trigger-only by default:

- UR / State V2 / Gate U;
- multi-page expansion;
- real-customer pilot preparation;
- production hardening / traffic canary / long soak;
- broad retention redesign;
- general replay/evaluator platform work;
- broad governance redesign;
- destructive Legacy cleanup.

### Planning estimates

These are engineering planning estimates, not repository facts or delivery commitments, and exclude waiting for owner approvals/runtime access/credentials.

| Track | Planning range | Main uncertainty |
|---|---:|---|
| Track A | ~2–4 working days | narrow reactivation fix + disposable-DB proof + authorized runtime exercise |
| Track B | ~4–10 working days | actual current COMMERCE call graph and amount of mixed deterministic sales/correctness logic |
| Track C minimum loop | ~2–4 working days | replay adapter integration + quality comparison adapter |
| Sequential initial target | ~8–18 working days | subject to B1 re-estimate and environment/approval timing |

**B1 timebox:** within 1–2 engineering days, produce the bounded current COMMERCE call graph and KEEP/DEMOTE/SPLIT inventory. Then lock scope and re-estimate. If scope is still unbounded, stop/replan rather than expanding into a repo-wide audit.

### Owner adoption and supersession

PR #258 published this proposal; merge alone is not V5 adoption. V5 becomes the canonical **post-Gate-F sequencing plan** only when a separate, durable owner-decision record on merged `main` names this document and its reviewed commit/blob, explicitly adopts the sequencing baseline, and records that the active point remains `DF-13 Operational Acceptance` until Gate F is actually accepted.

**Adoption update:** that decision record must update the `future` section of `program-state.json` and add matching supersession notices to `FUTURE_BACKLOG.md` and the applicable post-Gate-F sequencing section of `PREPROD_DF_UR_PLAN_AMENDMENT.md`. Preserve historical text; do not rewrite earlier decisions. Until then, V5 is a merged proposal and neither the notices nor this plan change runtime, migration, release, or authorization state.

V5 supersedes only conflicting future sequencing that would otherwise require UR / State V2 / Gate U before model-authority completion and the sales-quality loop. It does **not** supersede:

- immutable Gate E evidence or acceptance records;
- the current Gate F technical contract;
- DF13 fresh-process operational contracts;
- release-integrity/provenance requirements;
- migration correctness rules;
- security/PII/auth requirements;
- exact rollback requirements;
- explicit owner authorization boundaries.

Owner decisions required to adopt V5:

1. adopt V5 as the canonical post-Gate-F sequencing baseline;
2. defer UR / State V2 from the default critical path until a concrete trigger exists;
3. authorize the narrow DF13 reactivation compatibility fix after the disposable-DB regression proves the current blocker;
4. permit minimal operational Gate-E rerun CLI/wiring around the existing runner for materially changed Track B deployment candidates;
5. permit the lightweight quality loop to reuse existing replay/judge/provenance primitives rather than building new platforms.

---

## 1. TRACK A — Activate COMMERCE safely

### Objective

Use the current DF13 first-activation plumbing to:

1. prove/fix the known rollback → fresh-reactivation blocker before touching PREPROD runtime;
2. activate COMMERCE;
3. satisfy the current Gate F technical contract;
4. prove exact rollback to LEGACY;
5. perform a fresh LEGACY → COMMERCE reactivation;
6. finish with runtime actually on COMMERCE.

Do not redesign DF13.

### A0 — Mandatory disposable-DB reactivation proof

Before any real PREPROD Track A runtime mutation, verify the full lifecycle in a disposable isolated database:

```text
LEGACY
-> prepare COMMERCE
-> activate COMMERCE
-> rollback LEGACY
-> fresh zero-work proof / fresh operationId / current pointer revision
-> prepare or reconcile COMMERCE again
-> activate COMMERCE again
-> verify exact final COMMERCE identity
```

#### Known current blocker

Current preparation semantics look up an existing COMMERCE version by canonical `content_hash`. Existing-version reconciliation also compares stored preparation `reason`, while the preparer writes:

```text
DF13_FIRST_PREPROD_PREPARE:<operationId>
```

A fresh reactivation operation necessarily has a fresh `operationId`; with an already-created identical COMMERCE version, current code deterministically reaches:

```text
DF13_FIRST_PREPROD_PREPARATION_IDEMPOTENCY_MISMATCH
```

Treat this as a known Track A blocker, not a hypothetical edge case.

The regression test must fail on current behavior, then the implementation must make the smallest fix that preserves immutable COMMERCE identity, fresh proof/current-pointer checks, exact auditability, no generic COMMERCE operator, no dual authority, and exact rollback.

The startup package is create-once. Fresh reactivation must prove a safe current-operation package/output path and exact startup binding rather than overwriting a prior package.

The zero-work proof has a maximum age of 15 minutes; every mutating authority transition needs a fresh valid proof.

### A1 — PREPROD preflight

Only after A0 passes:

- lock the exact candidate/release;
- verify current release/startup evidence;
- re-read runtime authority/state and current behavior pointer;
- inspect the live migration ledger;
- verify exact page/channel scope;
- verify backup/restore readiness required by the current operational contract;
- capture exact known-good LEGACY release/config/pointer rollback identity;
- verify current DF13 candidate/release evidence accepts the intended first-exercise inputs.

#### 0035 / 0036 rule

`0036` is not applied or rehearsed for the stopped-process exercise. `0035` and `0036` remain outside automatic migration discovery; neither is promoted by this plan.

Before any COMMERCE preparation, preflight must inspect the target's durable ledger and schema. If the target lacks the `0035` COMMERCE schema, the exercise stops before a COMMERCE version is created: the existing `0030` schema admits only `LEGACY` and has no authority-bundle column. `0035` may then be applied only through a separately authorized, additive, checksum-verified Release Train after its disposable-database rehearsal and backup/restore requirements pass. A disposable rehearsal is evidence, not application authority. If the target already has the exact compatible schema, no migration is implied.

### A2 — First COMMERCE activation

```text
seal admission
-> drain/reconcile eligible queued + in-flight work to zero under LEGACY
-> stop the finite authority-consuming process set
-> fresh zero-work proof
-> prepare exact immutable COMMERCE target/startup package
-> LEGACY -> COMMERCE through the narrow writer
-> start one fresh COMMERCE authority-consuming service set
-> smoke/integration verification
-> exact DATABASE/runtime readback
```

Acceptance:

- COMMERCE is the only sales authority;
- no LEGACY/COMMERCE co-authority;
- exact candidate/release/startup/runtime identity matches;
- required consumers resolve the same database-backed authority identity;
- protected claims remain verified/fail-closed;
- side effects remain explicitly authorized;
- smoke/integration checks pass.

### A3 — Gate F + exact rollback

Satisfy the complete, closed Gate F-PREPROD checklist in [`FUTURE_BACKLOG.md`](FUTURE_BACKLOG.md#gate-f-preprod), including the full transition matrix and BF/DF replay. V5 creates no additional Gate F criterion; the list below is only a readable index of that canonical checklist.

- COMMERCE FSM authority / derived phase;
- coherent Context V2, phase, reconciliation, and legacy-authority demotion;
- no COMMERCE decision using legacy `salesStage` as authority;
- missing COMMERCE state with committed intent failing closed;
- full transition matrix and BF/DF replay;
- exact immutable candidate projection/content-fingerprint match;
- stopped-process single-authority evidence;
- exact runtime/control-plane readback;
- controlled PREPROD critical human journeys;
- complete `COMMERCE -> LEGACY` rollback and exact LEGACY restart/readback.

After rollback, runtime is LEGACY. That completes Gate F rollback evidence, not the final runtime state required by V5.

### A4 — Fresh COMMERCE reactivation

Use the exact lifecycle proven in A0:

```text
seal admission
-> drain/reconcile
-> stop
-> fresh zero-work proof
-> re-read current LEGACY pointer/revision
-> prepare/reconcile exact COMMERCE target under fixed semantics
-> create fresh current-operation startup package
-> LEGACY -> COMMERCE
-> smoke/integration
-> exact DATABASE/runtime readback
```

A new source SHA/tag is not assumed either way. Reuse of the same immutable release candidate is allowed only when current release/startup contracts prove that exact reuse is valid after the A0 fix.

**Track A exit:** disposable-DB lifecycle passes; the known preparation blocker is narrowly fixed; `0036` remains unapplied and `0035`, if required by the target schema, was separately authorized and applied through its governed Release Train; first activation passes; all current Gate F criteria and human journeys pass; exact LEGACY rollback passes; fresh COMMERCE reactivation passes; final runtime readback is COMMERCE.

---

## 2. TRACK B — Complete model authority

### Objective

Make the current PREPROD COMMERCE response path match the intended architecture:

> **model owns normal strategy + normal wording; code owns facts, safety, reconciliation, authorization, and bounded fallback.**

This is a bounded current-runtime-path refactor, not a repo-wide chatbot audit.

### B1 — Timeboxed current-path inventory

Within 1–2 engineering days inspect only code reachable from:

```text
accepted inbound customer message
-> context / verified facts
-> strategy / proposal construction
-> model call + structured output
-> model draft
-> post-model validation / reconciliation
-> repair / fallback
-> final customer-facing reply
-> requested-effect authorization
```

Produce the actual current call graph, candidate-affecting files, deterministic-authority inventory, KEEP/DEMOTE/SPLIT classification, implementation slices, and a Track B re-estimate.

Exclude legacy-only paths, admin flows, unrelated workers, future page modes, unreachable utilities, and deterministic logic that cannot affect the current COMMERCE reply/authority path. Inspect outside the boundary only with evidence that code can modify/replace the reply or override normal sales/effect authority.

Do not assume helper names from reviews; locate current call-sites first.

### B2 — Demote only deterministic sales/copywriting authority

**KEEP** deterministic authority for verified facts/claims/provenance, freshness/product scope, state consistency, side-effect authorization, auth/authz, PII/security, idempotency, fail-closed behavior, contradiction reconciliation, and fixed safe fallback.

**DEMOTE** deterministic logic when it selects normal sales strategy instead of the model, writes normal customer-facing sales copy, rewrites a valid model draft for ordinary style/business preference, or hard-codes objection/CTA behavior as conversational authority rather than correctness/safety.

**SPLIT** mixed helpers only enough to preserve the deterministic technical boundary while moving normal conversational authority to the model. No unrelated cleanup.

### B3 — One reproducible side-effect-free replay adapter

Target runtime:

```text
verified facts/state
-> model structured strategy + claims + requested effects + normal reply draft
-> deterministic claim verification
-> deterministic state/effect reconciliation
-> bounded model regeneration request OR fixed safe fallback
-> final guard
-> authorized reply/effects
```

Deterministic repair may reject invalid structures, reconcile deterministic conflicts, request bounded model regeneration, and select a fixed safe fallback. It must not compose normal sales wording, rewrite a valid draft for style, splice deterministic sales copy, or replace model strategy for ordinary business preference.

Build **one minimum side-effect-free full-agent replay adapter** and reuse it in Track C. It must cover representative current COMMERCE fixtures, compare before/after authority changes, inspect final replies, prove MUST_PASS safety/correctness, and detect regressions from demoting deterministic strategy/copywriting.

For meaningful comparison pin:

- model/provider-model identity;
- prompt/template identity;
- generation configuration;
- relevant policy/schema/config identity;
- fixed verified-fact/business fixtures.

Business side effects remain disabled. Do not infer verified fact envelopes from historical transcript text. Do not build a second replay framework. Do not require the full Wave1 population before Track B finishes.

### B3.1 — Minimal Gate-E rerun operationalization for deployment

A materially changed Track B candidate is expected to modify candidate-affecting source covered by current Gate-E fingerprinting. The pre-deploy re-evaluation boundary is therefore a known Track B deployment dependency.

Reuse the existing Gate-E scored-run engine:

```text
executeGateEScoredRun(...)
```

Do not rebuild scorer/evidence logic. Add only the minimum operational entrypoint/wiring needed for a selected deployment candidate, such as a CLI/command adapter, registration-path inputs, existing evidence-store wiring, existing provider transport, and redacted result/evidence output.

#### Credential boundary

Do **not** add Vertex service-account credentials to GitHub Actions as part of V5.

Default split:

```text
GitHub CI
-> deterministic/unit/integration/replay checks without provider credentials

authorized local/VPS/manual or scheduled evaluation environment
-> Gate-E provider-backed scored rerun using existing service-account access
```

Use the current governing Gate-E re-evaluation path. Only if the current contract still blocks the intended lightweight deployment flow **after** minimal operationalization exists may the smallest separately authorized contract/enforcement amendment be proposed. Do not pre-build a new evidence profile or second evaluation authority.

**Track B exit:** bounded call graph/inventory complete; normal strategy and wording are model-owned; deterministic technical boundaries remain; bounded repair is not a copywriter; one reproducible replay adapter passes focused MUST_PASS verification; minimal Gate-E rerun operational path exists; any materially changed selected candidate passes current pre-deploy re-evaluation/provenance before becoming the accepted COMMERCE baseline for Track C.

---

## 3. TRACK C — Improve sales quality continuously

### Objective

```text
current accepted COMMERCE
-> new candidate
-> MUST_PASS safety/correctness
-> quality comparison
-> reject or select for deployment
-> pre-deploy provenance/re-evaluation
-> deploy
-> becomes new accepted COMMERCE baseline
-> repeat
```

A full LEGACY quality baseline is not mandatory. LEGACY comparison is optional only for a concrete diagnostic/historical need.

### C1 — MUST_PASS first, QUALITY second

A candidate is rejected before quality comparison if it fails any of:

- factual/protected-claim correctness;
- **no unsupported claims**;
- no unsafe/unauthorized action or effect;
- PII/security constraints;
- fail-closed requirements;
- required authority/context invariants for the tested path.

Only after MUST_PASS succeeds compare quality on:

- understanding actual customer intent;
- relevance/usefulness;
- naturalness;
- appropriate progress toward the customer's goal/purchase;
- constructive objection/uncertainty handling;
- avoidance of unnecessary repetition or pressure.

### C1.1 — Reuse `judgeSalesReplyV2`; do not build a judge platform

Use an offline adapter around existing `judgeSalesReplyV2(...)`. Pin judge provider/model identity, judge prompt/rubric identity, judge generation config, verified-fact fixture identity, accepted/candidate reply identities, and relevant proposal/guard inputs.

Judge output is evaluation evidence only and never authorizes outbound replies or side effects. MUST_PASS remains deterministic and takes precedence over judge scores.

`judgeSalesReplyV2` scores one reply; it is not itself pairwise. Run accepted COMMERCE and candidate replies under the same pinned judge configuration and derive a bounded result such as:

```text
BETTER
SAME
WORSE
+ short reason / score delta
```

Human review is reserved for calibration samples, ties/near-ties, unexpected regressions, and obvious judge disagreements. Do not require a human to read every replay output every iteration.

### C2 — Reuse B3 replay; fixed dev/validation anchor by default

Reuse the B3 adapter for accepted COMMERCE vs candidate, fixed development/validation fixtures, and new fixtures only from observed failures/new behavior/accepted incidents/material risks.

Primary comparison:

```text
candidate vs current accepted COMMERCE
```

Drift guard:

```text
fixed Commerce-era development/validation reference slice
```

#### Locked holdout is not part of the default loop

Do **not** require the locked Wave1 holdout for normal Track C iteration. Current full-agent holdout replay is not assumed executable until reproducible recorded fixtures/fact envelopes exist.

Holdout is trigger-only: run a bounded locked-holdout checkpoint only when the required protected/reproducible recorded fixtures exist and the checkpoint is explicitly authorized. Do not create a broad recorded-fixture project merely to satisfy the word “holdout”.

### C3 — Fast tuning loop

Allow rapid iteration on prompt, playbook, objection handling, CTA/question sequencing, model, and generation configuration.

Never bypass verified facts/provenance, unsupported-claim rejection, PII/security, side-effect authorization, fail-closed behavior, or deterministic protected constraints.

```text
candidate change
-> deterministic MUST_PASS
-> B3 side-effect-free replay
-> pinned judgeSalesReplyV2 quality comparison
-> human review only where needed
-> reject OR select for deployment
```

### C4 — Shared pre-deploy provenance / re-evaluation boundary

Local experiments and candidates not selected for deployment do not require release/promotion ceremony.

A materially changed candidate selected for PREPROD deployment — including a Track B authority-completion candidate — must pass the current shared pre-deploy provenance/re-evaluation boundary.

#### Reuse existing provenance; do not create a second system

Promotion evidence is a lightweight projection/reference over existing candidate-evaluation and release-integrity evidence. Reuse existing fields/tooling wherever already present, including exact Git/source revision, Gate-E candidate identity/fingerprint, prompt/model/config identity, policy/schema/config identity, regression/replay result identity, immutable release/image/source identity, runtime readback, and exact rollback target.

Do not invent a competing promotion-manifest authority when Gate-E/DF13/release-integrity artifacts already own the field. Unknown, partial, stale, or mismatched identity blocks promotion.

The current governing PREPROD contract requires the existing re-evaluation path when a material candidate-identity change invalidates accepted Gate-E evidence until that contract is explicitly amended.

For a materially changed selected deployment candidate:

1. run the current re-evaluation path using the minimal operational entrypoint from Track B;
2. use existing provenance/release evidence for promotion;
3. only if the governing contract still creates a concrete unacceptable blocker, make the smallest separately authorized contract/enforcement amendment;
4. preserve exact candidate identity, reproducibility, and rollback traceability.

Do not proactively redesign governance.

Track C is ongoing. Success means tuning remains fast, MUST_PASS stays stable, quality improves without drift, regressions are caught before deployment, human review is not the per-case bottleneck, replay/judge tooling does not become a platform project, and selected deployment candidates have reproducible pre-deploy provenance using existing evidence authorities.

---

## 4. Trigger-only work

| Trigger | Pull in only this work |
|---|---|
| measured state race/consistency pain, state representation blocks a real feature, or production/data need requires it | minimum required UR / State V2 slice |
| owner wants a real-customer pilot | operating-mode authorization + bounded PII/data readiness for the actual pilot |
| explicit production-hardening decision | traffic/canary/load/soak/SLO/public-production work actually needed |
| real/new failure is not represented by current replay | add only the fixture/adapter capability needed for that gap |
| locked holdout is desired and reproducible recorded fixtures now exist | one bounded authorized holdout checkpoint |
| current Gate-E contract still blocks an already selected deployment after minimal rerun operationalization | one narrow separately authorized contract/enforcement amendment |
| page/traffic scope expands | only the additional authority/data/operational safeguards required by that expansion |

Do not automatically resurrect full UR, full State V2, Gate U, replay/evaluator platform work, broad governance redesign, production-scale rollout machinery, or destructive Legacy cleanup.

For a future real-customer pilot, bounded readiness covers only the actual planned flow: owner/operating-mode authorization, fields collected, storage, encryption, retention/expiry/deletion, log/telemetry redaction, provider exposure, and authz/least privilege. Pull in only the required data/UR slice if current state is insufficient.

---

## Critical path

```text
TRACK A
disposable-DB reactivation regression
-> narrow fix for known preparation blocker
-> first COMMERCE activation
-> full current Gate F proof
-> exact rollback to LEGACY
-> fresh reactivation to COMMERCE

TRACK B
1–2 day bounded call-graph inventory
-> demote deterministic sales/copywriting authority
-> preserve deterministic fact/safety/effect boundaries
-> one reproducible side-effect-free replay adapter
-> minimal CLI/wiring around existing executeGateEScoredRun
-> current pre-deploy Gate-E re-evaluation for selected material candidate
-> accepted COMMERCE baseline

TRACK C
accepted COMMERCE vs candidate
-> deterministic MUST_PASS
-> fixed dev/validation replay anchor
-> pinned judgeSalesReplyV2 quality comparison
-> reuse existing provenance/re-evaluation boundary
-> deploy selected candidate
-> repeat
```

Everything else must prove a concrete trigger before entering scope.
