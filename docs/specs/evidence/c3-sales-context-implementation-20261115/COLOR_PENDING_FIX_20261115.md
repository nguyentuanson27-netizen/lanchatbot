# J4 colour context and deferred support repair

Base: `8a4ecf8da3caf3dc84ea6890d09068bb8821b133`. Scope: the two owner-requested failures, candidate-only isolated execution. No live sends, deployment or qualification GO.

## Root cause established before changing code

The preceding run used `9d5108ca1c3f4c576c86d43108b09b3744609690`. J4 turn 0's refused cart selection supplied current `CANDIDATE_SELECTION_V3` evidence for white IN_STOCK / beige PRE_ORDER. The next turn constructed a new tools instance: its `selectionObservations` map was empty and its prepared product exposed the base catalog's unlabelled rows. The durable profile retained the pending purchase query, but preparation did not re-read that query. The verifier therefore lacked the colour authority supporting the reply. One repetition called `quote_product` and reacquired the evidence; that exception explains the intermittent result.

For the two-shirt control, support was recorded before cart creation. On turn 1 Gemini sent `APPLY_PENDING` mixed with RECORD's `sourceQuote`, `intent` and target fields. Closed runtime validation correctly refused it. Although the previous adapter schema separated alternatives with `anyOf`, both operations still shared one function and the model continued mixing their arguments. Activation happened only on turn 2 after a valid call. Loosening argument validation or adding examples would retain that ambiguity.

## Code change

- Rehydrate bounded, current, product-bound pending purchase queries through the existing selection port during preparation. A stored note is a query, not stock/colour authority. Charge before every source read within the existing six-unit budget; use the same source-bound evidence merger, admission and final readback. Expired notes and unbound products do not trigger reads. No cart write occurs during preparation.
- Expose separate `apply_pending_negotiation` / `cancel_pending_negotiation` functions accepting only `pendingRef`. Both enter the existing guarded pending command path, preserving original source/time, cart receipt, permission, revision, CAS and idempotency. Keep legacy internal RECORD/APPLY/CANCEL compatibility. A pending activation remains an explicit counted effect, never an automatic hidden concession.
- Extend existing writer-first quote, handoff receipt validation, callable reachability and adapter result projection for those two commands. No additional semantic role, parser, retry, repair loop or source content.
- Owner prompt changes only the two tool names; no sales/style examples added. Manifest owner hash refreshed. Verifier prompt/model/config unchanged.

## Observed verification

TDD: the two reproductions first failed (`preparePendingSelections` absent; new activation command `UNKNOWN_TOOL`), then passed. Source/budget/age/scope/changed-world coverage added alongside existing receipt/duplicate/mutation tests.

Commands actually run:

```powershell
pnpm exec vitest run apps/worker/src/single-agent-commerce-effects.test.ts apps/worker/src/single-agent-commerce-quote.test.ts apps/worker/src/single-agent-commerce-callable.test.ts apps/worker/src/single-agent-commerce-handoff.test.ts apps/worker/src/single-agent-commerce-ingress.test.ts apps/worker/src/single-agent-commerce-preparation.test.ts apps/worker/src/single-agent-commerce-read-only.test.ts apps/worker/src/single-agent-commerce-selection-evidence.test.ts apps/worker/src/single-agent-commerce-diagnostics.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
pnpm --filter @lana/worker build
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker lint
git diff --check
```

Results: 531/531 worker tests, 83/83 adapter tests, worker build/noEmit/lint PASS. No shared package source changed. Self-review checked argument closure, counted preparation/effects, no persisted source renewal, unchanged final verifier gate and old receipt compatibility.

## Provider execution complete — targeted causes improved, end-to-end still STOP

Clean sealed executable source: `247ecf7bce47bf13689685a336b2f1e09044390e`. Current initial-state capture and both preflights PASS. Same world as the preceding run: `6b0c5c9f78bcaea8e53ee53776be6be72e8926ebe271c376db2523938344af10`. Original scripts retained: J4 N=5, two-units N=1, all 6 attempts / 18 turns executed. No extra sampling, baseline dispatch, full qualification or live send. Both native test databases dropped.

Owner: Gemini `gemini-3.5-flash-lite`, High. Verifier and offline blinded judge: `gpt-6.1-sol`, High, pinned CLI 0.159.2. Exact identities/configuration/hashes: [identities](COLOR_PENDING_IDENTITIES_20261115.json), [preflight](COLOR_PENDING_PREFLIGHT_20261115.json).

Results:

| Observation | Previous `9d5108ca` | This source |
|---|---:|---:|
| J4 turn 2 sent, with current colour authority | 1/5 | 5/5 |
| Two-shirt pending activation | Turn 3 | Turn 2, immediately after cart creation |
| Actual terminal SEND_ELIGIBLE | 10/18 | 14/18 |
| HANDOFF / NO_SEND | 4 / 4 | 3 / 1 |

All five J4 turn-2 verifier requests contain a current M/quantity-1 selection proof: TRẮNG IN_STOCK / BE PRE_ORDER. One repetition performs no quote read in that turn and still has the proof, directly exercising the repaired preparation path. The two-shirt control executes `apply_pending_negotiation` successfully in turn 2, consumes the pending evidence once, and produces the current cart total 948,100đ. The repeated add call has the same operation and does not double the quantity.

These timing/context improvements are not an end-to-end PASS. Blinded whole-conversation judging: J4 3/5 PASS, two-shirt control 0/1 PASS. All 6 judge requests return valid results. Factual/action safety was accepted for the actual terminal outcomes in all 6; this does not certify the blocked drafts or the wider population. [All 18 terminal conversations, including rejected drafts](COLOR_PENDING_CONVERSATIONS_20261115.md), [judge findings](COLOR_PENDING_JUDGE_RESULTS_20261115.json), [run summary with tool/receipt/verdict evidence](COLOR_PENDING_RUN_SUMMARY_20261115.json).

### Remaining failures and exact cause

1. **J4 repetition 1, turn 3:** quote 529,000đ is correct, but the draft promises to “áp dụng mức hỗ trợ” although support remains NOT_EVALUATED. Verifier rejects that promise; customer receives silent handoff. This is an owner benefit assertion, not missing colour context.
2. **J4 repetition 3, turn 3:** owner calls RECORD again with the preceding customer's objection as `sourceQuote`, while the new message only asks the delivered total. The current-message source guard rejects `NEGOTIATION_SOURCE_OR_CART`; dependent quote is stopped. The next generation attempts another tool under NONE and ends `OWNER_TOOL_MODE`. The old recorded request exists; no new valid support event is committed. This is unnecessary owner action planning, not the repaired pending command mixing.
3. **Two-shirt control, turn 2:** pending activation succeeds immediately. The final snapshot nevertheless exposes only the latest `NEGOTIATION_UPDATED` receipt, replacing the earlier `CART_OPENED` receipt. The reply acknowledges both adding the shirts and applying support. Verifier cannot find the add receipt in its input and rejects `EFFECT_WITHOUT_RECEIPT`. Both effects really exist in the durable evidence; this is a remaining receipt projection defect, not failed or late support activation. Silent handoff changes owner to HUMAN; turn 3 then correctly NO_SEND. The control's customer outcome is therefore worse than the preceding run despite earlier activation.

The control's subtotal is 998,000đ. The recorded 79,900đ adjustments consist of 49,900đ price discount plus 30,000đ shipping waiver. `shippingFeeVnd=30000` is the base fee; subtracting the total adjustments produces 948,100đ. Do not diagnose the correct grand total as an arithmetic error or require rewriting the base fee to zero.

Next repair should supply a validated, revision-bound set/chain of committed effect evidence for replies acknowledging sequential operations. It must preserve each original receipt and invalidate superseded cart facts; simply rebasing an old receipt, changing the final gate, suppressing the rejection or adding a case-specific ACK is not accepted. The unnecessary RECORD-on-total-query remains a separate owner-planning failure. Neither is silently marked resolved by this run. Phase C remains STOP; no widening of verifier acceptance or automatic follow-on provider run.

### Accounting and operations

- 52 native generation requests: 36 owner, 16 verifier; all transport status OK. 6 independent judge generation requests, all OK. Total 58; complete attempt denominator remains 6, not 58 cases. Every captured generation has one provider request; all started requests accounted for.
- Native owner tokens: 474,960 input / 36,354 output. Verifier: 170,747 input / 2,196 output. Native provider timeout/error: 0/52; judge 0/6. Provider cost not exposed.
- Verifier generation latency, nearest-rank percentiles over 16 measurements: p50 9.283s, p95 20.322s. These are adapter generation measurements, not an isolated estimate of total added end-to-end latency.
- [Audit](COLOR_PENDING_NATIVE_AUDIT_20261115.json) checks actual terminal text against the exact verified draft/hash, model identity, per-generation request accounting, runtime evaluator-label firewall, source cleanliness and test-database cleanup. Audit creates no provider request.

Execution commands actually run (the pointer resolves to the local run directory identified below):

```powershell
$taskRun=Get-Content ../c3-color-pending-active-20261115.txt
$taskInput=Get-Content -LiteralPath (Join-Path $taskRun 'INPUTS.json') -Raw | ConvertFrom-Json
python ../c3-native-context-launch-20261115.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs (Join-Path $taskRun 'initial') COD --phase-c-initial-world $taskInput.world
$env:APPDATA=(Resolve-Path ../c3-verifier-replay-cli-01592).Path
node ../c3-color-pending-seal-20261115.mjs $taskRun
node (Join-Path $taskRun 'judge.mjs') freeze $taskRun
python ../c3-color-pending-launch-20261115.py python ../c3-color-pending-session-20261115.py
node (Join-Path $taskRun 'audit.mjs') $taskRun
python ../c3-color-pending-summarize-20261115.py $taskRun
node (Join-Path $taskRun 'judge.mjs') prepare $taskRun
node (Join-Path $taskRun 'judge.mjs') run $taskRun
```

The launcher dispatches only the registered CANDIDATE and CONTROLS subsets via `sales-context-screen.mjs native-dispatch`; clean run identity, same-world selection and limits are in the linked preflight/identities. Local run directory: `c3-color-pending-model-247ecf7b-20261115-221100`. Source/credential databases are not mutated by this replay; all effect writes are confined to disposable native test databases. Raw native artifacts remain local; the linked artifacts publish the complete customer history, public tool/receipt/verdict evidence and offline review without credentials.
