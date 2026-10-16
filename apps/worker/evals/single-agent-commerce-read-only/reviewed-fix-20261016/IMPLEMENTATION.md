# Reviewed Phase B root-cause correction — 2026-10-16

Owner requests implementation of the reviewed [plan](../../../../../tasks/plan.md#current-root-cause-fix-after-independent-review--2026-10-16). Start `7fe9643b747462a1c29a61308e365541be21bd19` on existing PR391. Refreshed main / implementationBaseSha remains `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.

Status: IN_PROGRESS. New provider generations: 0. Historical raw/primary/verdicts remain unchanged. No production wiring, live source/customer writes, merge, deploy or send. Existing one-owner/one-verifier, exact draft/current snapshot, permission/privacy, CAS/fencing, receipts and no retry remain required.

| Slice | Status |
| --- | --- |
| F1 bounded failure/recovery/checkout diagnostics | IMPLEMENTED; focused GREEN |
| F2 outbound payload/readiness producer and consumers | PENDING |
| F3 exact serialized provider request bound | PENDING |
| F4 typed tools and native final-only contract | PENDING |
| F5 named alias lookup | PENDING |
| F6 private-checkout prerequisite correction | PENDING |
| F7 sales task/context and code-owned receipt ACK | PENDING |
| Focused/full verification and self-review | PENDING |

## Commands actually run

- `git fetch origin main`: exit0; `git rev-parse origin/main`: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- F1 RED: `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs`:17PASS/1FAIL (missing bounded failure stage). `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-session.test.ts`:18PASS/2FAIL (lost recovery reason and private-checkout authority reason).
- F1 GREEN: same Node command18PASS. `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-effects.test.ts`:54PASS. Later private planner/commit edge coverage: `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-session.test.ts`:9PASS.

F1 retains allowlisted provider stage/failure/finish codes without copying arbitrary exception text; one failed generation still makes at most one provider request. Recovery reports its original disposition/reason separately from actual terminal. Private checkout distinguishes authority, absent plan/readiness reasons and transaction reasonCodes/status; ingress carries that diagnostic outside model context. Historical causes remain unknown until measured on a new attempt; these tests do not reconstruct a missing old response.

Record observed RED, subsequent GREEN, final commands and remaining unknowns below as they occur. A source fix or fake-HTTP assertion is not a fresh provider result. Checkpoint A remains OWNER_BYPASS and sales/live acceptance remains STOP.
