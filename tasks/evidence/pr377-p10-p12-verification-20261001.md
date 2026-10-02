# PR377 P10-P12 verification - 2026-10-01

## Identity and scope

Patch applies to the verified PR377 head `bff00e05c0eba2bf3ea656a9ff46b910d4ae0041`.
The P06-P09 follow-up files from `11f045ed` and evidence-only head `bff00e05` are
already part of this baseline. Patch was applied locally; this record captures
verification from the current full-history Windows checkout. Local checks below
are not remote CI evidence. The exact resulting head and CI run are tracked in
the PR description after push.

Environment: Node v24.19.0, pnpm 10.12.4, TypeScript 5.9.3, Vitest 3.2.7 on
Windows. Existing workspace dependencies were used; no fresh network install.
No live model, POS, customer messaging, production catalog or database was used.
The isolated Qdrant tests and credentialed Luna test remain opt-in skips in the
full worker suite.

## Observed checks

| Check | Observed result |
|---|---|
| Workspace build (`pnpm --config.enable-pre-post-scripts=false -r build`) | PASS |
| Admin-web typecheck | PASS |
| 17 focused worker suites listed below | 422 passed, zero failed |
| Full worker command including frozen benchmark validators | 1,912 passed, zero failed, 4 skipped |
| `pnpm check:dataset-boundary` | PASS |
| `git diff --check` | PASS |

Four skips are the opt-in Luna runtime test and three isolated Qdrant tests. No
worker test failed, was excluded, or was loosened to obtain this result.

### Skips and limits

The credentialed Luna runtime smoke and three isolated Qdrant tests are opt-in
and were skipped locally. Real-model DEV70 generation/judging was not run by
instruction. Scripted runtime tests establish code paths and state, not model
understanding, conversational quality or conversion. Exact-head CI remains
required after push.

### Focused command

```sh
pnpm --config.enable-pre-post-scripts=false --filter @lana/worker exec vitest run \
  src/realtime-c3-call-telemetry.test.ts src/realtime-runner.test.ts \
  src/realtime-server-c3.test.ts src/track-c-c3-strategy-contract-runner.test.ts \
  src/track-c-c3-projection-egress.test.ts src/unbounded-multi-product-text.test.ts \
  src/realtime-alternatives.test.ts src/realtime-c3-dialogue.test.ts \
  src/realtime-customer-input-purchase.test.ts src/realtime-customer-input.test.ts \
  src/realtime-sales-cycle.test.ts src/track-c-c3-evidence-scope.test.ts \
  src/track-c-c3-fact-realization.test.ts src/track-c-c3-price-comparison.test.ts \
  src/track-c-c3-checkout-reachability.test.ts src/realtime-product-facts-v2.test.ts \
  src/realtime-reply-differential.test.ts
```

## Regression evidence and boundaries

- Responder transport/schema/PII faults reproduced before recovery was added;
  after the change selected facts and an incomplete-answer limit survive. Missing
  evidence, caller abort, provider mismatch and frozen evaluation still reject.
- A null prose field is not whole-question coverage. A guard-failed factual draft
  cannot silently degrade a compound question to a facts-only complete answer.
- Actual RealtimeRunner tests inject Strategist, Responder and commit faults;
  inspect final Outbox plan and state, not only model JSON. Model faults on Inbox
  attempt five do not become permanent failures when verified fallback exists.
- An individual fact read failure no longer aborts all other requested reads.
  The error envelope has no facts; remaining reads and the rendered reply retain
  the other product/stock evidence. The test uses fake IO, not real POS.
- Whole-PR quota review reproduced four failing assertions before the fix:
  normal/recovered C3 did not reserve quota, and denied/error quota did not block
  calls. The nine server composition cases now pass, including no-call HUMAN.
- Telemetry tests prove response/error passthrough, no retries, separate actual
  attempts, all three roles, invalid/missing usage as null, and no payload or
  exception text in recorded fields. Server tests prove event wiring.
- Commit-fault tests prove no local state acceptance/Inbox completion and use the
  existing retry policy. They are not a substitute for PostgreSQL atomicity tests.

Fixture/setup mistakes found while authoring tests (an invalid empty dialogue,
a non-existent RECOVERED status, and expecting `100.000` instead of the existing
`100k` formatter) were corrected in tests, not counted as application defects.

## Delivery status

P10 bounded runtime changes and P12 same-agent review are included. P11 is
DEFERRED, not PASS. Full-plan closure and real-model acceptance remain open.
Exact-head CI status is tracked in the PR description. No merge, deploy, traffic
or provider change was performed.
