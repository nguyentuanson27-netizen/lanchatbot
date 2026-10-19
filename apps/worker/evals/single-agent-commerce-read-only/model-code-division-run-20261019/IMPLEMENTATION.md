# Implementation and independent review — 2026-10-19

Plan: [revised model/code division](../../../../../../docs/specs/c3-phase-b-model-code-division-plan-20261019.md). Baseline runtime c2c535b0; candidate increments 21734771 (preparation), 61a19676 (wire field mapping), f9408330 (capture/intake). Not wired to production. A OWNER_BYPASS; B live STOP.

One owner and one verifier remain. Code prepares only static product evidence/offer literals/status, charges a logical call after privacy/permission checks, and revalidates the same projection. Price/stock/ETA and variants are not materialized by preparation. Native measurement enum maps mechanically to domain paths; raw function-call content/signatures/IDs remain intact. The existing state/CAS/effect executor is reused. Advice is a separate evaluation on a captured public world, not live send authorization.

## Observed RED and GREEN

- P1: 3 new failures /54 existing pass before implementation; reader/runner missing preparation and budget accounting. Then57/57 pass.
- P2: native field mapping failed (WAIST_CM remained WAIST_CM); then45 adapter tests pass.
- P3: advice capture module absent, test failed; then capture selection tests pass, including pre-dispatch exclusion.
- Independent review regression: withdraw attributes while content remains —1 fail/34 pass, then GREEN.
- Independent review regression: effect composition loses offers —1 fail/1 pass, then GREEN. Assertions after turn are essential because a throw inside verifier may be converted to a receipt-backed fallback.

## Independent reviewer

Fresh-context agent /root/review_division_implementation reviewed f9408330 read-only. Verdict **REVISE**, two local reproducers, no provider or live source mutation. Findings:

1. P1: preparation merge retained attributes withdrawn by the source; exact snapshot could remain unchanged and old PASS send-eligible. Fix replaces content/attributes of each fresh read; missing attributes are removed. Focused regression proves changed snapshot.
2. P1: effect composition replaced all base policy literals after any effect attempt, losing offers/preparation dependencies. Fix preserves non-policy literals while replacing only current shop policy.
3. P2: capture selector could choose callback requests that never dispatched. Fix joins generation telemetry and filters providerRequests>0 before fixed-order selection. No valid capture remains BLOCKED.
4. P2: stateful source I/O accounting missing. Fix counts catalog reads, POS reads, selector calls and read-policy port calls separately from logical tool budget. Policy count is the candidate reader port count, not all SQL statements or private domain policy resolution.

Reviewer did not independently verify the final fixes, collector or final seal; no new ACCEPT claim. Parent self-review and regressions verify the changes. The review noted no further blocker in raw/domain mapping or checkout trigger/checker.

## Commands actually run

From repository root:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/realtime-reply-differential.test.ts --maxWorkers=2 --minWorkers=1
# 253 PASS before independent-review fixes.
pnpm --filter @lana/worker exec vitest run src --maxWorkers=2 --minWorkers=1
# 1881 PASS/131 files before independent-review fixes.
pnpm --filter @lana/worker test:evals
# 511 PASS,2 optional SKIP before final dispatch selector test.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only.test.ts --maxWorkers=2 --minWorkers=1
# After review fixes:123 PASS/4 files.
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs
# Final:69 PASS.
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
# 21 PASS.
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
# Both exit0 after review fixes; lint is TypeScript noEmit.
```

No shared package source changed. Native adapter API calls, model identities/config, verifier prompt and fallback remain the existing approved routes. Owner prompt changed only the field-name contract sentence. Build of baseline runtime in a separate worktree also exited0. Baseline f60c87b2 adds only the shared bounded evaluation harness to c2c535b0; it is a descriptive live-source control, not a paired causal comparison.

## Registered execution

[REGISTRATION.json](REGISTRATION.json):51 slots/180 maximum generations, every error retained, no retry/best-of. Baseline opening3; stateful8×3 (human-request is a separate journey); B1 four cases×3; advice from matching captures×3. Source SHA captured by orchestrator at runtime after clean seal, never written back into this source. Capture hashes locked before advice dispatch. Source/config changes invalidate identity.

Runner source [run.py](run.py) records exact child commands, bounded two-process concurrency and each exit. Temporary existing credential helper is hashed in registration; only its repository override changes, secrets stay in memory/temp credential file and are never evidence. Provider evidence is not present at this implementation savepoint. No improvement or GO is claimed.
