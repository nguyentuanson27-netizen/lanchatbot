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

## Provider execution pending

Seal clean executable source and current initial state first. Reuse the preceding frozen world only while readiness succeeds. Preserve original scripts, J4 N=5 and two-units N=1 (6 attempts / 18 turns). No automatic extra sampling or full qualification. Run evidence and actual terminal review will be appended after all attempts complete.
