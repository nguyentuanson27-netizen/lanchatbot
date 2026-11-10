# Phase C — B-preserving implementation, 2026-11-05

Implementation base: `d83dc3c85cb22b9fccd463c1025606cd010b5f7a` (approved plan); prior model source `e14d26594bb8831909788007f92fba81b3cd54e4`. [Plan](c3-phase-c-b-preserving-infrastructure-plan-20261104.md). Scoped source/evaluator/input reviews APPROVE; model prefix13cases24turns completed at69bd1221 with functional gate FAIL/STOP. [Actual outcomes and remaining defects](../../apps/worker/evals/single-agent-commerce-qualification/b-preserving-run-20261105/REPORT.md). Engineering approval did not establish model acceptance. No qualification GO, live source write, deploy or live send.

## Changes

- I (`77083bda`): owner-approved test chart interpretation: both BUST/HIPS are body maxima; choose smallest fitting size for direct measurements only. Original published chart remains unchanged; normalized source version and approval bind the derived chart. Height/weight and ordinary interval behavior remain.
- II (`e0e46c0c`): retain at most four active requested fit targets, recompute against current profile/chart/BOM on new adapter; never persist verifier PASS. Identical inline profile patches commit once before target calculations; conflicting patches still reject. Source checks precede writes, correction receipt remains immutable across metadata CAS, unbound old targets do not exhaust a lifetime quota.
- III (`4e77b8e8`): explicit `read_product.customerSelected` persists product/offer without creating cart; expose only when state writer exists. Preserve current fits/receipt through selection metadata. Extend existing quote task with quantity/region and code-owned pre-cart totals bound to price/policy/cart/recipient; final readback invalidates changes. One technical owner instruction; no sales-style rewrite or new role/tool.
- IV: whole-product DETAIL hint now exposes eligible V406 close-up. Owner authorized NEW isolated SD023 test asset using actual canonical prepared bytes/hash/check time; original raw/live proof is retained, never called successful revalidation of mismatched old hash. Add receipt-backed native checkout progress and evaluator-only next-field/preview branches. Original33 scripts unchanged; separate checkout1case7turns.

## Actual verification

Observed RED logs before implementation: `../c3-b-preserve-red-{size,state,quote,media,checkout}-20261104.log`. They include actual failing assertions/missing implementation; no model requests.

- Full worker Vitest: **2,648 PASS /154files**, `../c3-b-preserve-worker-tests-20261105-02.log`. First broad run had7failures (mock events missing, an unwanted metadata write on NO_CHART); retained and corrected.
- Shared focused: contracts73 + business150 = **223 PASS**, `../c3-b-preserve-shared-tests-20261105.log`.
- `pnpm --filter @lana/worker test:evals`: **848 PASS,2 existing SKIP /850total**, `../c3-b-preserve-all-evals-20261105.log`. Earlier Node commerce run B1 schema mismatch and transient prompt-hash edit failures retained; final stable all-eval run green.
- `pnpm --filter @lana/worker typecheck`, `pnpm --filter @lana/worker lint`, contracts/business-tools typecheck: exit0. Worker/dependency builds exit0 in `../c3-b-preserve-worker-build-20261105.log`; direct compiler evidence also retained.
- Actual command `python ../c3-media-context-model-source-wrapper-20261103-02.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-preserve-pg-20261105-03 COD --check-prefix "C B-preserving"`: **2/2 PASS**, provider0/livefalse/databaseDropped:true. Covers multi-target profile-once/restart/source invalidation and selected-offer/no-cart plus complete checkout through PURCHASE_CONFIRMED. This report says `sourceDirty:true`: worktree verification, not clean-head evidence. Two prior failed integration attempts retained, each DB dropped.
- `git diff --check`: exit0. No canonical root `pnpm check` PASS claimed.

## Differential and wire evidence

`../c3-b-preserve-bc-current-20261105.json` replays the six pinned B historical trusted/draft/clock inputs through current deterministic boundary: all allow as pinned B did; identical input/world hashes, five same-world product reads OK and height/weight RECOMMENDED. Comparison `../c3-b-preserve-bc-comparison-20261105.json`. Scripted/offline components, not native E2E/model parity or search equivalence.

Older two reconstructed continuations fit at65,440/65,182 bytes, only96bytes minimum headroom. Latest20261104s13 reconstructed original three-call continuation **still exceeds bound:72,693>65,536**; actual captured tool responses match, signed parts preserved, no truncation or cap increase. Evidence `../c3-b-preserve-latest-s13-wire-20261105.json`.

New quote path on that same frozen source/clock returns529,000VND including ship. With the **full captured owner tool surface** and current prompt, constructed continuation is **56,441bytes** (`../c3-b-preserve-new-quote-wire-20261105.json`). No provider signature invented, no model result: whether owner selects this path remains a model acceptance question. Old redundant path is not claimed fixed.

## Remaining acceptance

Fresh source capture, clean runtime seal and independent frozen input review precede model dispatch. Prefix13cases24turns first; material failure stops remainder20cases24turns. Separate full checkout1case7turns only after readiness. No hidden retries, changed denominator or customer-script repair after results.

BE photo binding remains a source gap; ACK need not request optional images. Feedback is an owner-approved catalog test assumption, not verified customer-worn provenance. Native successful purchase may legitimately transfer HUMAN ownership; do not treat stage alone or blanket HANDOFF as a receipt-backed continuation. Keep actual terminal outcome and denominator. No model stability, whole-reply quality or qualification success inferred from test PASS.


## Pre-provider input review correction

Independent review caught inherited `CART_COLOR_REQUIRED` classified as shop-data absence. Known stock options exist; this is missing customer choice. Original pending inputs are retained outside source. Conditional later-cart prerequisites now explicitly require an accepted prior customer reply, while first-contact paths still require media; this is evaluator-only source/capability evidence, never runtime send permission or evidence that a reply has occurred. Original33 customer scripts remain unchanged.

The newly added checkout-only script uses plain synthetic name/address when those fields are asked. Earlier conversational wrappers were not accepted by existing private intake; no parser or production flow was expanded to fit the case. Policy/scope hashes change before provider results. Focused source-readiness/diagnostic/branch/terminal tests:35PASS, including observed RED then GREEN for the conditional path. New executable identity and clean initial-state capture are required before dispatch; original frozen world source/clocks remain unchanged and freshness is rechecked at actual time.
