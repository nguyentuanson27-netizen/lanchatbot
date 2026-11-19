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

## Execution complete — control passes, J4 retains two malformed owner completions

Sealed clean executable source: `978fc83dcae93fbb21fd2f72485d50429589d788`. Implementation base: `9fd209c4e23bf80656df4880c6a04597fd15a974`. Fresh consistent capture: 107 products, world `83facf100a289302c2a34911c699856895c5ac446a78562671305162480a033c`; same approved test supplements. Real disposable initial state and both preflights PASS. J4 ×5 plus two-shirt control ×1, all 6 attempts / 18 terminal turns executed. Source/data timestamps were not rewritten. Since world hashes differ from the preceding run, this is not an exact same-world A/B comparison.

Exact models/configuration, prompt/schema/corpus/registration hashes and selected population: [identities](RECEIPT_QUOTE_IDENTITIES_20261115.json), [preflight](RECEIPT_QUOTE_PREFLIGHT_20261115.json). Owner remains Gemini 3.5 Flash Lite High; verifier and offline blinded judge remain GPT-6.1 Sol High with CLI 0.159.2. Owner/verifier prompt hashes remain unchanged (`a29e5416…` / `ca2c8835…`). No automatic extra sampling or model substitution.

### Whole-run result

| Population | Actual outcome | Independent whole-conversation judge |
|---|---|---|
| J4 repetition 1 | 3 SEND_ELIGIBLE, correct 529,000đ total | PASS |
| J4 repetition 2 | First-turn malformed owner completion → HANDOFF; later 2 NO_SEND | FAIL |
| J4 repetition 3 | 3 SEND_ELIGIBLE, correct 529,000đ total | PASS |
| J4 repetition 4 | 3 SEND_ELIGIBLE, correct 529,000đ total | PASS |
| J4 repetition 5 | First-turn malformed owner completion → HANDOFF; later 2 NO_SEND | FAIL |
| Two-shirt control | 3 SEND_ELIGIBLE; support activated once in turn 2, total 948,100đ | PASS |

Denominator remains J4 **3/5** and control **1/1**, not a redefined 3/3 success rate. Aggregate: 12 SEND_ELIGIBLE / 2 HANDOFF / 4 NO_SEND. All 6 independent ratings valid, 4 whole-conversation PASS. Facts/action safety accepted on actual terminal outcomes in all 6; silent failures are still incomplete sales conversations and remain in the quality denominator. No verifier FAIL/UNCERTAIN or verifier transport failure in the 12 calls it received. This does not certify failed owner outputs or a wider population.

[Complete customer history, including silent outcomes](RECEIPT_QUOTE_CONVERSATIONS_20261115.md), [judge results](RECEIPT_QUOTE_JUDGE_RESULTS_20261115.json), [public execution summary](RECEIPT_QUOTE_RUN_SUMMARY_20261115.json).

### What was actually demonstrated

- **Receipt loss fixed in the native control.** Turn 2 exposes CART_OPENED at original state revision 5 and NEGOTIATION_UPDATED at revision 6, together with current-state continuity. Both observedAt values and revisions match the durable ledger exactly. Verifier PASS, customer receives the cart/support acknowledgement, and the following total question is answered instead of NO_SEND. Duplicate add calls share one operation and do not double the two-shirt quantity. [Direct ledger comparison audit](RECEIPT_QUOTE_CONTINUITY_AUDIT_20261115.json).
- **Independent quote repair is deterministic evidence, not an exercised native recovery in this run.** All three completed J4 paths call quote directly on turn 3. The old-source RECORD refusal followed by successful quote is covered by observed RED→GREEN tests, including forged-result and changed-state negatives. Do not claim that native path ran when it did not.
- **Pending is not a grant in the three completed J4 paths.** Their support requests are recorded, no additional benefit is promised/credited, and turn 3 quotes 499,000đ + 30,000đ ship = 529,000đ. The two malformed paths never reach those turns, so five-repetition language stability remains unproved.
- **Automatic promotion preserved.** Control first quotes 978,100đ with 5% quantity discount; after actual pending activation it quotes 948,100đ. The 79,900đ total adjustments comprise 49,900đ discount and 30,000đ shipping waiver. Base `shippingFeeVnd=30000` is not rewritten to zero; the grand total includes the corresponding adjustment. No price/policy formula was changed.

### Remaining failures: owner native function-call completion

J4 repetitions 2 and 5 receive HTTP 200 with provider finishReason `MALFORMED_FUNCTION_CALL`, failure layer MODEL_OUTPUT / code OWNER_FINISH_REASON. Both have `inspectedParts: 0`, no usable function-call candidate, no executed owner tool and no verifier call. Existing fail-closed recovery commits silent handoff; subsequent customer turns are recorded as NO_SEND after ownership changes to HUMAN. Neither is an auth/quota/401/429/5xx failure.

The initial declared-tool schema hash is `82d415a3cb758ded1c15653417a54f0bcbacc443bcc0d01ce10b63c6f137052f`, 14 declarations, identical to the preceding `247ecf7b` run. The provider does not expose the malformed function name/arguments in these completions; attributing them to a specific tool or fixing schemas by guess is not justified. The frozen request/config and failure telemetry are retained. No success-only rerun, added example or acceptance change hides these two failures.

Runtime also reports a second failed local owner invocation for each interrupted attempt, without telemetry or a corresponding native transport STARTED/dispatch record. These extra local failures are retained in the public summary; their detailed pre-transport cause is not exposed by the current artifact. The captured native requests still account for all 38 STARTED records: 36 RESULT + 2 ERROR. Do not report the runtime retries as successful generations or silently increase HTTP counts.

### Operational/accounting evidence

- 38 captured native generation requests: owner 26 (24 OK / 2 MALFORMED), verifier 12 (all PASS/OK). Two additional recorded native auth requests. Six offline judge generation requests, all OK. Total captured generation requests 44; all selected attempts and silent descendant turns remain accounted for.
- Reported transport timeout/401/429/5xx errors: 0/38 native; owner malformed completions: 2/26 owner requests (2/38 native). The latter are output failures despite successful HTTP status.
- Owner usage: 333,107 input / 25,479 output tokens. Verifier: 123,524 input / 973 output. Usage includes malformed outputs. Cost not exposed by provider.
- Verifier adapter generation latency over 12 samples, nearest-rank: p50 8.311s / p95 10.077s. This is not a separate measurement of total added end-to-end latency. Lower request count than the preceding run is partly due to interrupted journeys, not an efficiency claim.
- [Native audit](RECEIPT_QUOTE_NATIVE_AUDIT_20261115.json) verifies exact sent draft/hash, model identity, request accounting, evaluator-label firewall, clean source and both native test-database drops. Receipt audit creates no provider call. Initial/source captures use no generation. Live sends and shop-source writes: zero.

Commands actually used after the checks above (run pointer resolves to `c3-receipt-quote-model-978fc83d-20261115-230533`):

```powershell
$taskRun=Get-Content ../c3-receipt-quote-active-20261115.txt
python ../c3-native-context-launch-20261115.py node apps/worker/evals/single-agent-commerce-qualification/capture-world.mjs (Join-Path $taskRun 'world') (Join-Path $taskRun 'CODES.json') --test-media-proof-world ../c3-convergence-model-world-20261111-10/WORLD.json
$taskInput=Get-Content -LiteralPath (Join-Path $taskRun 'INPUTS.json') -Raw | ConvertFrom-Json
python ../c3-native-context-launch-20261115.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs (Join-Path $taskRun 'initial') COD --phase-c-initial-world $taskInput.world
$env:APPDATA=(Resolve-Path ../c3-verifier-replay-cli-01592).Path
node ../c3-receipt-quote-seal-20261115.mjs $taskRun
node (Join-Path $taskRun 'judge.mjs') freeze $taskRun
python ../c3-receipt-quote-launch-20261115.py python ../c3-receipt-quote-session-20261115.py
node (Join-Path $taskRun 'audit.mjs') $taskRun
node ../c3-receipt-continuity-audit-20261115.mjs $taskRun
python ../c3-color-pending-summarize-20261115.py $taskRun
node (Join-Path $taskRun 'judge.mjs') prepare $taskRun
node (Join-Path $taskRun 'judge.mjs') run $taskRun
node ../c3-receipt-quote-identities-20261115.mjs $taskRun
```

Raw native requests/outputs and blind packets remain local; published evidence retains full customer conversations, public tool/receipt/verdict observations and hashes, without credentials or opaque model signatures. Historical Phase C **STOP** remains. The control regression is repaired; J4 does not meet the full five-attempt quality bar because the two malformed attempts are failures. Next investigation is the native function-call completion/admission boundary, not a prompt patch, blanket receipt acceptance or extra best-of-N sampling.
