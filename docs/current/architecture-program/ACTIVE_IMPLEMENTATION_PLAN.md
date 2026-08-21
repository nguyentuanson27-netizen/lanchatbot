# LANA Chatbot — Revised Bug-Fix Wave Integration Plan

**Status:** Historical BF integration plan. Gate BF remains accepted with waivers; the later `GATE_E_PREPROD_ACCEPTED` record advances active source work to DF-C / DF11.
**Companion source of issue truth:** `ACTIVE_BACKLOG.md` and `CURRENT_BASELINE.md`.
**Insertion point:** completed incident waves; before any eligible DF release slice
**Operating mode:** `ENGINEERING_PREPROD`; see `OPERATING_MODE.md`.

## 1. Decision

The three incident waves have source/release evidence. The owner explicitly accepts the BF-03 deferred deviation, the BF-04 P0 known gap, and pending BF-10 natural-transition evidence for progression. These remain recorded residuals rather than completed technical acceptance. `POST_BF_V1` is anchored to the reconciled PREPROD_TEST_PAGE runtime evidence. The historical DF-A entry condition is complete; active DF status is owned by `GATE_E_PREPROD_ACCEPTANCE_20260821.md` and `FUTURE_BACKLOG.md`.

The existing architecture direction remains valid. The incident track provides immediate containment and correctness fixes; root authority changes remain in DF-05 through DF-13 and State V2 design remains in UR.

## 2. Architecture target

The runtime uses a proposal/verification/authorization pipeline:

```text
sanitized customer input + verified state/facts
  -> model semantic proposal
  -> model structured claims + draft
  -> deterministic claim verification
  -> deterministic action reconciliation
  -> bounded model repair when rejected
  -> final guard
  -> authorized Outbox/state/handoff plan
```

### 2.1 Model responsibility

The model may:

- classify dialogue semantics and conversational intent;
- select or propose a response strategy;
- decide what clarification is useful;
- draft all normal customer-facing wording;
- reference only facts present in the verified evidence envelope;
- emit structured claim and requested-action proposals.

### 2.2 Code responsibility

Deterministic code must:

- resolve canonical, fresh, product-scoped evidence;
- validate every protected claim and its provenance;
- reject undeclared or unsupported claims;
- reconcile contradictory strategy, CTA, ownership, safety, and action signals;
- authorize or block cart/order/state/outbox/handoff effects;
- enforce URL/network, PII, ownership, idempotency, and policy constraints;
- record bounded reason codes and safe audit evidence.

Code must not become a Vietnamese copywriter. It accepts, rejects, or asks for bounded repair; it does not splice arbitrary phrases out of the draft and send grammatically damaged text.

### 2.3 Protected claim contract

The implementation should converge on a versioned shape equivalent to:

```ts
interface ProtectedClaim {
  id: string;
  type:
    | "PRICE"
    | "STOCK"
    | "SIZE_RECOMMENDATION"
    | "ETA"
    | "SHIPPING_FEE"
    | "FREESHIP"
    | "PROMOTION"
    | "PRODUCT_MEDIA";
  value: unknown;
  productId: string | null;
  variantId: string | null;
  evidenceRef: string;
  source: string;
  observedAt: string;
  expiresAt: string | null;
}
```

The model proposal references claim IDs. Code verifies references against the trusted evidence envelope. A conservative post-draft detector catches protected claims omitted from the structured list and fails closed.

### 2.4 Dialogue evidence is not buying intent

Introduce a separate versioned evidence contract, conceptually:

```ts
interface CanonicalDialogueEvidence {
  act:
    | "QUESTION"
    | "REQUEST"
    | "CORRECTION"
    | "CONFIRMATION"
    | "REJECTION"
    | "STATEMENT"
    | "AMBIGUOUS";
  source: "DETERMINISTIC" | "MODEL_STRUCTURED_OUTPUT" | "HYBRID";
  confidence: number | null;
  reasonCodes: readonly string[];
}
```

This contract does not replace `CanonicalSalesEvidence.buyingIntent` and must not become a second buying-intent classifier.

## 3. Sequencing

```text
Completed: RI -> CF -> DB/C2 -> R3 deployment/evidence

Incident wave A: BF-04 -> BF-05 -> BF-10
Incident wave B: BF-02 -> BF-01 -> BF-03
Incident wave C: BF-06 -> BF-07 -> BF-08 -> BF-09

Gate BF + post-fix immutable baseline
  -> DF-A: DF-01..DF-06
     (observability -> normalization -> canonical evidence/readiness)
  -> DF-B: DF-07..DF-10
     (phase/barrier shadow -> Context V2 paired evaluation)
  -> DF-C: DF-11..DF-13
     (authority implementation/shadow -> controlled COMMERCE promotion)
  -> UR dependency/vertical trains: UR-A -> UR-B -> UR-C -> UR-D
  -> separately approved destructive UR-X/UR-10
```

**Historical program point:** all three waves merged/deployed and the owner accepted Gate BF with explicit waivers. The active source-work train is now DF-C / DF11 after `GATE_E_PREPROD_ACCEPTED`; this plan's future-facing DF topology is superseded by `FUTURE_BACKLOG.md` and `PREPROD_DF_UR_PLAN_AMENDMENT.md`. No decision activates a runtime mode, authorizes deployment, or closes the recorded BF residuals.

Each bug remains one focused PR. Adjacent bugs must not share a diff merely because they belong to the same wave. Full verification, immutable release preparation, and authorized test-page deployment occur at the wave/Release Train boundary rather than once per PR.

## 4. Runtime-policy design

Behavioral containment uses the existing versioned database control plane. The logical policy payload must support independently audited selections equivalent to:

```text
replyReconciliationPolicy:
  LEGACY | CLARIFY_RECONCILED_V1

mediaPartialResolutionPolicy:
  LEGACY | PER_ASSET_V1

multiProductResolutionPolicy:
  LEGACY | CLARIFY_V1

customerUrlPolicy:
  STRICT_BLOCK_ALL | CLASSIFIED_ALLOWLIST_V1
```

The BF-03 correctionDialoguePolicy is deliberately absent: PR #158 removed its runtime adapter and the publishable schema rejects that field. The retained BF-03 foundations are non-authoritative and cannot be activated through this control plane.

Exact storage names may follow current repository conventions. Required properties are immutable versions, CAS activation, page scope, append-only audit, content hash, worker readback, bounded cache propagation, last-known-good behavior, and an explicit safest fallback.

Fallback rules:

- URL policy falls back to `STRICT_BLOCK_ALL`.
- Claim verification always fails closed; it has no unsafe legacy override.
- Other behavioral policies may return to their reviewed prior version through audited CAS activation.
- Sales authority remains `LEGACY`; state read remains `LEGACY`; confirmation remains `V2_ACTIVE` throughout the incident track unless a separate incident requires its emergency mode.

## 5. Wave A — Safety and data correctness

### BF-04 first

This is the only P0. Its fail-closed invariant and known detector bypass remain unresolved and cannot be disabled by a runtime flag. The owner waived the finding only as a DF-progression blocker on 2026-08-13; it must remain visible in review and cannot be represented as fixed. Any future remediation or deployment still requires separate review and authorization.

### BF-05 second

Repair the exact chart eligibility/projection layer already identified by the incident analysis. Add reason codes instead of collapsing all failures into `VERIFIED_SIZE_CHART_UNAVAILABLE`. Do not bypass verification to make Admin `PUBLISHED` content appear usable.

### BF-10 third

Repair terminal Outbox state and retain historical attempt evidence. This release must prove no changes to dedupe, retry scheduling, delivery interpretation, or idempotency.

Wave-A exit evidence:

- no unverified size claim;
- eligible charts resolve;
- ineligible charts remain reason-coded and blocked;
- terminal success has no stale active error;
- no migration/backfill unless separately approved.

## 6. Wave B — Context and conversational reconciliation

### BF-02 first

Separate proposal validity from context validity. A failed model schema cannot erase independently verified product context. The fallback order must be explicit, version/fence-aware, and reset-aware.

### BF-01 second

Create the minimum final reconciler needed to prevent customer silence from contradictory decisions. This is not the DF-11 authority cutover. It only enforces terminal invariants and records why an action was corrected.

### BF-03 third

**Canonical disposition:** do not add or reactivate correction containment. PR #158 retained only foundation-safe, non-runtime components: an inert post-gate extension point, stale-generation ordering, replay/own-echo/concurrency evidence, a pure unused authorization primitive, and research-only corpus data. The original correction-as-SIZE behavior remains a root dialogue-evidence obligation for DF-05/DF-06 and DF-09/DF-11; it is not claimed as a completed BF runtime behavior.

Wave-B exit evidence:

- active product survives grounded-output failure when still valid;
- direct questions receive a response unless a higher-priority policy explicitly blocks it;
- BF-03’s non-activatable foundation disposition remains intact; no correction heuristic or policy field can return to the production import graph;
- general correction semantics move to the later canonical dialogue-evidence path, not a second legacy classifier;
- model remains the author of customer-facing clarification text.

## 7. Wave C — Media and URL handling

### BF-06 first

Change media resolution from batch-ratio authority to per-asset evidence. Preserve valid matches and classify each failure. Keep all side effects disabled until the final plan is authorized.

### BF-07 second

When several distinct products are resolved, ask for selection rather than choosing `primary`. This is a customer-visible behavioral change and therefore requires the runtime policy omitted by the original proposal.

### BF-08 third

Classify normalized URLs before sensitive-case routing. Only approved domains and paths enter resolvers. Network access must remain SSRF-safe, redirect-bounded, and credential-free. Unknown/dangerous URLs remain fail-closed, but the customer should not experience unexplained silence when a safe explanatory response is permitted.

### BF-09 fourth

Correct taxonomy precedence for complete outfits. This must not turn component images into full-look images merely because multiple tags are present.

Wave-C exit evidence:

- partial batches preserve safe matches;
- multi-product batches cannot collapse silently;
- supported first-party/shop URLs work through allowlisted resolvers;
- suspicious URLs remain blocked;
- eligible full-look products can send multiple bounded verified assets.

## 8. PR and review protocol

For every bug:

1. Fetch current GitHub `main`; read README, all applicable `AGENTS.md`, current baseline, latest release/runtime-state evidence, and this incident plan.
2. Check the live runtime read-only and compare it with the last authoritative evidence.
3. Create a clean worktree and bug-specific branch.
4. Write an incident fixture before or with the fix; add negative and counterexample fixtures.
5. Keep the diff to one bug and its direct observability/tests.
6. Run focused package/consumer tests plus all risk-applicable architecture, migration-diff, secret/PII, security, and data-integrity checks. Broaden verification when the PR's own dependency surface requires it.
7. Open a Draft PR with scope, non-goals, focused evidence, Release Train assignment, and future architectural retirement link.
8. Perform an independent exact-head review. Reviewers must inspect the diff from the actual GitHub base and rerun the relevant gates.
9. Merge only after `MERGE_RECOMMENDED`; a merged PR does not require an immediate tag, manifest, full repository gate, or deployment.

At the Release Train boundary, run frozen install, full `pnpm check`, cross-PR integration/replay, architecture and release-integrity guards, and all applicable security/data checks before immutable release preparation.

## 9. Deployment protocol

Each owner-authorized Release Train deployment follows GitHub -> immutable tag -> new VPS release directory -> targeted service recreation -> candidate runtime-state verification -> promotion on the `PREPROD_TEST_PAGE`.

For policy-gated changes:

1. deploy binary with prior/safest policy active;
2. verify health, readiness, runtime-state, image identity, migration ledger, control-plane readback, Outbox, and service UID/restarts;
3. activate only the `PREPROD_TEST_PAGE` through audited CAS;
4. verify propagation/readback within the existing cache bound;
5. run authorized controlled scenarios and bounded soak;
6. promote or revert the policy revision without redeploy;
7. append live/test-page evidence tied to the immutable tag.

Do not recreate `admin-web` or `admin-simulation-worker` until per-service image selectors are pinned and reviewed. The shared `ADMIN_IMAGE` residual remains fail-closed. Host-only deployment scripts require a reviewed repository artifact or fresh hash verification before reuse.

## 10. Post-wave evaluation baseline

After all three waves pass their Release Train verification and Gate BF passes:

- create an immutable post-fix baseline tag and runtime evidence record;
- freeze the deployed test-page model, generation configuration, prompts, policy versions, evidence-envelope version, and page scope;
- preserve all ten incidents plus counterexamples as replay strata;
- record which incidents are containment fixes and which are root fixes;
- use this post-fix live path as Context V1 in DF-09/DF-10 paired evaluation.

The pre-fix conversations remain historical regression evidence but are not the primary V1 comparator. Otherwise Context V2 receives artificial credit for defects already scheduled for correction.

## 11. Integration with the original architecture program

### DF-01 through DF-03

Add bounded observability and analytics dimensions for dialogue evidence, claim verification, reconciliation, policy version, and media/URL outcomes. Do not store raw customer text or provider payloads merely to support evaluation.

### DF-04

Continue consumer-specific normalization migration. BF-03 has no runtime containment to reuse; retained foundation primitives must not acquire dialogue-classification authority during a utility move.

### DF-05 through DF-06

Extend canonical evidence with separate dialogue evidence and protected-claim provenance. `buyingIntent` remains the existing hybrid resolver’s result. Cart readiness continues to be derived from verified, fresh product/offer state immediately before side effects.

### DF-07 through DF-08

Keep phase and barrier calculations shadow-only. Incident fixes must not turn them into a third live authority.

### DF-09 through DF-10

Context V2 receives canonical dialogue evidence, verified claims, derived phase/barrier, buying intent, and cart readiness. The sampled second model call remains asynchronous and side-effect-free. Pre-register evaluation thresholds before results are reviewed.

### DF-11 through DF-13

Activate derived phase, Context V2 consumers, final reconciliation, and regex-writer demotion atomically under sales-authority mode. The replacement must handle correction semantics through canonical evidence; do not introduce a new BF-03 containment path or retain co-authorities.

### UR-00 and State V2

The ADR must decide the canonical shape for multiple considered products and one active selection before schema work. It must cover ordered media evidence, product switching, reset, expiry, encryption, and legacy compatibility projection. BF-07 remains a clarification containment until that design is approved.

## 12. Gate BF and definition of done

**Historical incident state: GATE_BF_ACCEPTED_WITH_OWNER_WAIVERS.** The original strict checklist
remains the technical contract, but BF-03, BF-04, and BF-10 deviations are explicitly
recorded in ACTIVE_BACKLOG.md and CURRENT_BASELINE.md. `POST_BF_V1` is a comparison
anchor for DF work, not proof that those residuals were fixed or authorization to deploy.
The later `GATE_E_PREPROD_ACCEPTED` governance record starts DF-C / DF11 source work only.

The incident track is complete only when:

- every original incident and counterexample passes;
- claim-level provenance prevents unverified protected claims;
- no known contradictory decision produces unexplained silence;
- proposal failure cannot erase verified context;
- media and URL policies are safe, observable, and reversible;
- all customer-visible policies have database readback and rollback evidence;
- all releases have immutable Git/runtime evidence and clean soak;
- later DF/UR documents contain the root-fix obligations listed above;
- the post-fix V1 baseline is frozen for future paired evaluation.

Passing Gate BF authorizes resuming the architecture plan. It is not a production-readiness declaration and does not authorize sales-authority `COMMERCE`, State V2, a second page, a second brand, deployment, or any live mutation without its own approval.
