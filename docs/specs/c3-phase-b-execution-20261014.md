# Phase B execution — B1, B2, B3

Owner authorizes “thực hiện b1 b2 b3”. This supersedes the earlier planning-only/pause-between-slices wording for these source changes. No deployment, live customer send, live cart/order mutation, policy publication, migration or qualification is authorized.

Implementation branch: `feat/c3-phase-b-commerce-20261014`.
Refreshed main / bImplementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
Candidate foundation: `dd5c9d46f41f1514982210034f551a95cd356f68` (PR390, unmerged at intake).
Planning source: [B1 plan and B roadmap](c3-phase-b-read-only-integration-plan-20261014.md).

## Execution order and concrete scope

1. **B1 context and tools:** extend the existing verifier boundary for policy-only absence, variant/cart scope and existing real product evidence types. Add narrow context and read-only tools modules. Reuse RuntimePolicyResolver without pin/audit ports; ProductSearchService; RedisBusinessFactsReader/catalog resolvers; protected-claim builders. Test stale sources, tampering, source swaps and missing input before continuation/provider code.
2. **B1 owner loop:** a bounded local runner for native tool calls, exact final text, mandatory verifier, current readback and final gate. Maximum 3 owner generations / 2 tool rounds / 6 calls, one verifier, no generation retry. Add a B-only Gemini adapter, leaving frozen A prompts/config/corpora intact. No import from production entrypoint.
3. **B2 effective customer state:** reuse CustomerProfileV1 and mergeCustomerProfile, current profile CAS, and the existing measurement/fit/preference fields. Add only missing CLEAR/REPLACE handling in the candidate adapter. Source message, expected revision and provenance come from code. Reject identity/business/cart/receipt fields. Accepted state precedes dependent size/quote; conflicted state cannot leak a result from the old profile. Code supplies the size target/chart and produces SIZE_FIT through recommendSize/createVerifiedSizeRecommendationClaim. Quote uses evaluateShopPolicy and current trusted cart/price/policy data, never model arithmetic or invented cart identity.
4. **B3 effects:** integrate the existing SalesCycleStateRepositoryV1 and executePersistedSalesCycleCommand / canonical cart engine through scoped tools. Reuse code-owned permission and trusted reference resolution; commands/operation identity/revisions originate in code. Cover cart open/change and existing purchase-confirmation path, preserving its revalidation/atomic effect-intent contract. A purchase confirmation is not proof of an external POS order; do not claim an order API exists or was executed. Do not add a durable operation store.
5. **B3 recovery:** after transport ambiguity, reconcile the same operation against committed state before any retry. Build a receipt only from committed state/readback. Verifier/generation failure after commit never replays an effect; allow only code-owned receipt/current-state acknowledgement or handoff/no-send. Exact final state/revision/recipient remain binding.
6. **Verification and delivery:** focused RED→GREEN savepoints, worker suite/typecheck/build/lint, relevant shared checks, self-review and draft stacked implementation PR. Eight B1 provider scenarios N1 / max32 generations only with frozen source/config and available required source/credentials; no automatic run expansion. A evidence remains historical and immutable.

## Files and checks

- B1: `single-agent-commerce-read-only-context.ts`, `single-agent-commerce-read-only-tools.ts`, `single-agent-commerce-read-only.ts` and focused tests in worker; narrow changes in `single-agent-semantic-verifier-boundary.ts` and its tests.
- B2: candidate `single-agent-commerce-state.ts` and tests, reusing existing profile/size/policy packages. Any existing database adapter extension must use current tables and its CAS boundary, with focused database tests; no schema migration.
- B3: candidate `single-agent-commerce-effects.ts` and tests, using the existing sales-cycle repository/executor and typed trusted ports. Repository implementations are responsible for atomic state plus effect intents; no fake receipt from an uncommitted pure transition.
- Provider/demo: `apps/worker/evals/single-agent-commerce-read-only/`, native adapter/tests, source configuration outside Git, immutable run inputs/accounting/results. Live versus replay/fake verification must be labeled separately.

Each implementation increment runs its focused tests before commit. New behavior starts with an observed failing test. Final commands include the focused list in the B1 plan, `pnpm --filter @lana/worker test`, `typecheck`, `build`, `lint`, and shared package tests/typecheck/build for any changed package. Record actual commands/results; never reuse earlier A tests as new B verification.

## Availability at intake

The initial local process lacked DATABASE_URL / REDIS_URL / QDRANT_BASE_URL / QDRANT_API_KEY / RUNTIME_POLICY_DATABASE_URL. This did not establish source unavailability: compose already contains their routes/index settings and the project ops plugin has an available SSH credential route. Follow-up read-only PostgreSQL/Redis/Qdrant checks succeeded; [actual readback and candidate limits](../../apps/worker/evals/single-agent-commerce-read-only/RESULTS.md#availability-metrics-and-recommendation). Reuse the observed PUBLISHED channel and existing1408dimension index configuration; do not ask the owner to configure them again. Local candidate composition, source-backed inputs/provider evaluation and real B2/B3 adapter behavior remain NOT_RUN. Do not substitute a fixture and call it real integration or log credentials.

## Completion reporting

Latest owner request “làm đi, xác định những gì còn thiếu để hoàn thành mục B và thực hiện” authorizes the [bounded completion scope](../../apps/worker/evals/single-agent-commerce-read-only/B_COMPLETION.md): source-backed B1 and real B2/B3 transactions in uniquely named disposable test databases on existing infrastructure. This supersedes the earlier NOT_RUN intake status when actual new evidence is saved. No live migration/customer mutation/delivery or Phase C qualification is implied.

Report code/tests delivered separately from real-adapter/provider evidence. B2/B3 isolated repositories prove candidate integration behavior, not production persistence or an external order. Retain any BLOCKED source/run boundary explicitly. No A PASS, replacement readiness, sealed qualification, migration/removal, deploy or live send follows from this implementation request.
