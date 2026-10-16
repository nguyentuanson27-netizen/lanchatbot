# Reviewed Phase B root-cause correction — 2026-10-16

Owner requests implementation of the reviewed [plan](../../../../../tasks/plan.md#current-root-cause-fix-after-independent-review--2026-10-16). Start `7fe9643b747462a1c29a61308e365541be21bd19` on existing PR391. Refreshed main / implementationBaseSha remains `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.

Status: IN_PROGRESS. New provider generations: 0. Historical raw/primary/verdicts remain unchanged. No production wiring, live source/customer writes, merge, deploy or send. Existing one-owner/one-verifier, exact draft/current snapshot, permission/privacy, CAS/fencing, receipts and no retry remain required.

| Slice | Status |
| --- | --- |
| F1 bounded failure/recovery/checkout diagnostics | IMPLEMENTED; focused GREEN |
| F2 outbound payload/readiness producer and consumers | IMPLEMENTED; focused GREEN |
| F3 exact serialized provider request bound | IMPLEMENTED; focused GREEN |
| F4 typed tools and native final-only contract | IMPLEMENTED; offline focused GREEN; live behavior NOT_RUN |
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

F3: initial reproduction fixture omitted the product read and did not reach the intended size; corrected fixture materializes its source content first. Observed RED: `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts`:13PASS/1FAIL, third generation blocked before the transport. Minimum fix removes only the internal-representation guard; transport owns the actual serialized bound. Same command GREEN14PASS, including internal body>32768 with all projected requests<=32768 and mandatory verifier. Existing hard-precheck trusted-context/input/history/tool-result bounds remain.

`node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs`:19PASS, including exact32767/32768 wire bytes and32769 rejection before auth/generation (0dispatch), duplicate-source preservation and native signatures/call identity. This is offline evidence, not a claim the historical oversized request would fit or that real provider behavior improved.

F4 checked current official [Vertex function-calling modes](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling), [FunctionDeclaration JSON schema](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/Shared.Types/FunctionDeclaration), and [native signatures/call IDs](https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures) before the adapter change. NONE prohibits new calls and is documented as equivalent to no function declarations; current signatures and function responses must remain intact. No preview mode, model/effort/generation-budget change or retry was introduced.

F4 RED: Node adapter22tests/3FAIL for callable product identity, confusing output-only field and actual final-only wire. Minimum GREEN: per-request declaration enums use bound PRODUCT refs (cart changes use CART_LINE); noncallable subjects expose evidenceRef; projection omits redundant requestedOfferType while retaining the actual offerType/facts/native calls. Field description requires the existing full measurement path. add_to_cart documents its existing code-owned resolution so a redundant read is not a permission prerequisite. Final-only sends NONE/tools[] and records exact serialized request hash/bytes/mode/count plus an unexpected-tool-call flag; it still returns the observed call to the runtime budget gate without executing/retrying it.

`node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs`:43PASS. `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts`:82PASS, including invalid state/ref rejection, accepted dependencies, effects and no extra rounds. Fake HTTP proves emitted bytes/accounting, not that the real provider will obey NONE. Historical API/client attribution remains UNKNOWN; a fresh registered run can compare actual dispatched request hashes without logging private data.

Record observed RED, subsequent GREEN, final commands and remaining unknowns below as they occur. A source fix or fake-HTTP assertion is not a fresh provider result. Checkpoint A remains OWNER_BYPASS and sales/live acceptance remains STOP.
