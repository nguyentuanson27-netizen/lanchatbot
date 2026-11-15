# Receipt continuity and independent quote repair

Implementation base: `9fd209c4` (previous colour/pending run report). Owner requests fixing remaining causes and rerunning J4 / two-shirt control without prompt patches. Candidate-only isolated scope; no rollout or live send.

## Implementation

1. Keep original CART_OPENED and subsequent NEGOTIATION_UPDATED receipts unchanged. The executor records their continuity only across its own proved consecutive commits with identical cart lines and the exact previous committed state hash. Same-operation duplicates do not add receipts. A restored cart-open receipt must pass the existing ledger/current-state checks before joining a sequence.
2. Add the bounded `effectReceiptContinuity` runtime contract. It binds the original ordered receipt refs to the current cart identity/version, state revision, binding, recipient and exact public cart-items hash. The deterministic gate validates the sequence, original freshness, unique refs/operations, consecutive revisions, correct effects/subject and current scope. Individual receipts retain their original revisions/times. An unrelated mutation, external revision, expired predecessor or changed world invalidates continuity; old PASS cannot authorize it. No blanket acceptance of historical receipts.
3. Preserve this code-owned proof through the existing context, handoff/media and owner projections. No new persisted schema, migration, model role or provider generation.
4. Extend the existing identity-bound no-commit proof to a RECORD request rejected at VALIDATION for an invalid/current-message source. The existing writer-first quote path can then execute independent reads after fresh readback verifies unchanged state/authority. The rejected write remains rejected and grants nothing. Forged result objects, scope changes, domain/CAS/commit/readback uncertainty receive no such exception. Closed batch shape and existing call/generation budgets stay unchanged.
5. Expose structured `benefitAuthorization` facts: pending request and pre-cart quote have no granted additional benefits/receipt. Scope explicitly distinguishes ADDITIONAL_SUPPORT_FOR_THIS_PENDING_REQUEST / ADDITIONAL_SUPPORT_IN_THIS_PRE_CART_QUOTE from an actual committed cart concession. Automatic quantity promotions remain in `standardPromotion` and in the quoted amounts. This removes ambiguity in supplied data; semantic verifier remains mandatory and still rejects promises not supported by an actual grant. It does not guarantee the owner will never make that language error.

Owner and verifier prompt bytes, models, thresholds, corpus and tool budgets are unchanged. No regex, Vietnamese parser, case-specific response template, rewrite or reverify loop.

## Observed verification before provider run

RED observed: the original cart-open receipt disappeared after pending activation; an invalid old objection stopped the independent quote. Both reproductions then GREEN. Additional checks cover original revisions, restored ledger proof, intervening revision, later cart mutation, forged no-commit token, readback invalidation and 14 malformed/stale/wrong-scope continuity cases. Original operation IDs must still be present in current durable state before continuity is emitted.

```powershell
pnpm exec vitest run apps/worker/src/single-agent-commerce-effects.test.ts apps/worker/src/single-agent-semantic-verifier-boundary.test.ts apps/worker/src/single-agent-commerce-quote.test.ts apps/worker/src/single-agent-commerce-handoff.test.ts apps/worker/src/single-agent-commerce-media-delivery.test.ts apps/worker/src/single-agent-commerce-ingress.test.ts apps/worker/src/single-agent-commerce-read-only.test.ts apps/worker/src/single-agent-commerce-preparation.test.ts apps/worker/src/single-agent-commerce-owner-view.test.ts apps/worker/src/single-agent-commerce-read-only-context.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm exec vitest run apps/worker/src/track-b-protected-claim-boundary.test.ts
pnpm exec vitest run packages/business-tools/src/protected-claims.test.ts packages/business-tools/src/reply-assembler.test.ts
pnpm --filter @lana/worker build
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker lint
git diff --check
```

642/642 worker tests, 102/102 Node tests, 18/18 existing worker protected-boundary tests, 22/22 existing protected-claim/reply-assembler tests, worker build/noEmit/lint PASS. No shared package source changes. Self-review checks the continuity exception is limited to unchanged-cart negotiation, never silently rebases an old receipt, and no-commit proof authorizes read siblings only. Additional-support fields explicitly exclude the automatic quantity promotion.

First source capture at `5ef00a83` stopped with `C_CAPTURE_POS_CHANGED`: SV461's source synced_at changed from 15:29:47.807Z to 15:59:47.910Z during the double read. The incomplete capture is retained; no provider generation or initial-state/model attempt ran. Retry must acquire a fresh consistent source snapshot, never suppress the check or rewrite the original timestamps.

## Execution pending

Commit executable source, capture fresh real shop sources with the same approved test supplements, create current disposable initial state, init/seal and preflight. J4 ×5 plus two-shirt control ×1: 6 attempts / 18 turns, same scripts. Capture fresh source because the preceding world's stock/selection freshness window has ended; do not change old timestamps or treat a fresh capture as an exact same-world A/B comparison. Preserve every started attempt and actual terminal outcome. Report once all selected slots finish. Historical Phase C STOP remains; this targeted rerun cannot establish qualification GO.
