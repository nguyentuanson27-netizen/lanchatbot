# P06-P09 source verification - 2026-10-01

Patch applied to PR377 baseline `8ce14b6e6809b12987d48c0e5b41a727f3c91c4a`.
The patch was checked against this exact clean source before application. Verification
was rerun in the full-history working repository after application; remote CI for
the resulting commit is tracked separately.

## Environment and scope

Working repository at the PR377 baseline, with full Git history. Node 22.16.0,
pnpm 10.12.4, Vitest 3.2.7. Lockfile/dependencies are unchanged. No live database,
catalog, messaging or model calls.

The real runner, compiler, validators, sales cycle and kernel execute in tests;
external model/POS/delivery ports use synthetic fakes. Input understanding by a
real model and La.na conversational quality are not certified by those fakes.

## Commands and observed results

- `pnpm --config.enable-pre-post-scripts=false -r build`: PASS for the workspace.
- `pnpm --config.enable-pre-post-scripts=false --filter @lana/admin-web typecheck`:
  PASS (the Vite build alone does not typecheck this package).
- Focused worker suites (12 files, listed below): **332 passed, zero failures**.
- `pnpm --config.enable-pre-post-scripts=false --filter @lana/worker test`:
  **1,889 passed, zero failures, 4 skipped**. The command includes static benchmark
  validators; it does NOT execute DEV70 generation with a real model.
- `pnpm check:dataset-boundary`: PASS.
- `git diff --check`: PASS. Patch applicability was checked by `git apply --check`
  against the clean baseline before application.

Focused command:

```sh
pnpm --config.enable-pre-post-scripts=false --filter @lana/worker exec vitest run \
  src/realtime-customer-input.test.ts \
  src/realtime-runner.test.ts \
  src/realtime-sales-cycle.test.ts \
  src/redis-product-search-cache.test.ts \
  src/track-c-c3-strategy-contract-runner.test.ts \
  src/track-c-c3-strategy-contract.test.ts \
  src/track-c-offline-candidate.test.ts \
  src/realtime-alternatives.test.ts \
  src/realtime-c3-dialogue.test.ts \
  src/track-c-c3-price-comparison.test.ts \
  src/realtime-server-c3.test.ts \
  src/track-c-c3-checkout-reachability.test.ts
```

## Skips and limits

Four worker skips are the opt-in credentialed Luna test and three opt-in isolated
Qdrant tests. This patch does not execute DEV70 with a real model. The patch does
not change Qdrant/CI files. PostgreSQL-dependent external integration tests were
not run against a live or substitute database.

## Behavioral regression evidence

RED -> GREEN was observed for policy-plus-independent-purchase, combined/partial
variant preservation, bounded discovery, request-window limit, and price
comparison admission/egress. Additional real-runner tests cover final reply and
state for the M-selection/S-stock question, no-cart CHANGE+purchase, checkout
through internal confirmation, and human/post-sale routing with an open cart.
New request/compiler tests preserve clarified material questions with/without
supported evidence across the former window. Scripted replies prove the path,
not the model's judgment.

Tests exercise bounded/no-result/error search, wrong offer/product, stale and
changed comparison operands, customer data redaction, and known-input first
contact. Existing C3-off, human no-call, DRY_RUN, duplicate/stale-preview,
recipient/payment and accepted-history recovery controls remain in the suite.

## Self-review

Same-agent self-review, not independent approval. Reviewed correctness/security
before architecture/simplicity. Changes from that pass preserve both edited
variant fields and untouched fields, separate product-question outbound evidence
from cart effect authority, bind comparison operands independently at egress,
and keep customer context bounded and redacted. Compiler type errors found when
adding final regression coverage were fixed, followed by a fresh successful
workspace build and the final test runs reported above.

No new dependency, database schema/store, provider router, online reviewer,
public Strategist field, or extra history read was introduced. First-contact's
zero-question exception is an explicit candidate spec amendment. No blanket
approval of P06-P09 model quality is inferred from prompt assertions. Remaining
real-model/DEV70 and wider fault-injection acceptance stays open in the checklist.

## Delivery status

Source/test/spec patch applied locally. No merge, deploy, live traffic or provider
change. New-head CI remains required; Definition of Done and full task acceptance
are not declared complete before it.
