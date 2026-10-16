# Reviewed Phase B root-cause correction — 2026-10-16

Owner requests implementation of the reviewed [plan](../../../../../tasks/plan.md#current-root-cause-fix-after-independent-review--2026-10-16). Start `7fe9643b747462a1c29a61308e365541be21bd19` on existing PR391. Refreshed main / implementationBaseSha remains `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.

Status: IN_PROGRESS. New provider generations: 0. Historical raw/primary/verdicts remain unchanged. No production wiring, live source/customer writes, merge, deploy or send. Existing one-owner/one-verifier, exact draft/current snapshot, permission/privacy, CAS/fencing, receipts and no retry remain required.

| Slice | Status |
| --- | --- |
| F1 bounded failure/recovery/checkout diagnostics | IMPLEMENTED; focused GREEN |
| F2 outbound payload/readiness producer and consumers | IMPLEMENTED; focused GREEN |
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

F2 RED: contracts focused59tests/2FAIL; business readiness33tests/1FAIL; ingress9tests/5FAIL; full database-runtime40tests/1FAIL. Commands were `pnpm --filter @lana/contracts exec vitest run src/v2/canonical-evidence-readiness.test.ts`, `pnpm --filter @lana/business-tools exec vitest run src/effect-readiness.test.ts`, `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts`, `pnpm --filter @lana/database exec vitest run src/realtime-runtime.test.ts`. An initial database `-t 'outbound'` selected0tests/40SKIP and is not verification.

F2 GREEN: contracts focused59PASS. Rebuild `pnpm --filter @lana/contracts build`, `pnpm --filter @lana/business-tools build`, `pnpm --filter @lana/database build` exit0 before consumers (first consumer rerun encountered stale dependency dist, not claimed PASS). Then business readiness/protected/reply54PASS; ingress/effects/session48PASS; database runtime40PASS with the same commands, adding `src/protected-claims.test.ts src/reply-assembler.test.ts` to business and `src/single-agent-commerce-effects.test.ts src/single-agent-commerce-session.test.ts` to worker.

F2 uses actual claim subjects rather than all search candidates. PROTECTED_OUTBOUND coverage follows the individual typed claims and still requires each declared type and each bound product to have actual coverage; cart effects retain their full per-line requirements. No schema fields, proof modes or gates were added. Productless payloads require empty actual claims/types, no cart and an exact payload hash; transaction source/hash/type/freshness checks remain. Static fallback/receipt ACK do not rebuild CART_READY; an existing-cart terminal instead reuses the unchanged sales readback lock/CAS so it cannot acknowledge a changed cart. Generated cart replies retain current source/parent readiness. Existing database missing-product, conflict, stale/payload/revision and cart-mutation rejection tests remain green.

Record observed RED, subsequent GREEN, final commands and remaining unknowns below as they occur. A source fix or fake-HTTP assertion is not a fresh provider result. Checkpoint A remains OWNER_BYPASS and sales/live acceptance remains STOP.
