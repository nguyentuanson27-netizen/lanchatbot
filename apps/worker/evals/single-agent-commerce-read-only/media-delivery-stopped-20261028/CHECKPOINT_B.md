# Stopped diagnostic — media delivery freshness

Source: `342c1e97be0a7ca7462d53e151fa66cc6d435e00`, clean and unchanged through child cleanup. Registered 51 native outcomes plus 17 controls, N1/retry0. Controls passed; 12 native outcomes completed and 39 were not run. This is an incomplete diagnostic, not a full acceptance result.

The selector accepted the newly bound revalidation proof, but the durable media delivery gate still compared the selected observation against publication time. The generic ProductFacts media projection also used publication time. Thus some SEND_ELIGIBLE results enqueued messages but produced no capture and MANUAL_REVIEW rows. Eligibility is not delivery success.

Only the parent dispatcher was stopped. Active children finished; both disposable databases were dropped. The parent's final dispatched command has no recorded exit code; final child integration evidence is retained separately. Original registration/dispatch logs were not rewritten. [Observed terminals](OBSERVED_TERMINALS.json), [stop record](STOP_DIAGNOSTIC.json), [42-request accounting](ACCOUNTING.json), [controls](CONTROLS_SUMMARY.json). Raw artifacts remain outside the repo in `c3-b-media-revalidated-model-20261028`.

The follow-up change uses the shared effective media observation in both consumers. Product content, price, identity and publication observations are unchanged. Revoked/expired proofs still fail closed. No TTL increase, prompt/corpus change, extra semantic role, production deployment or live send.

Observed downstream RED: 2 failed /26 passed in the delivery-gate and ProductFacts tests. Minimum fix: 28/28 passed. Final affected suite:1128/1128 across54files; Node eval228/228. Worker build and lint/typecheck passed.

Commands actually run:

```text
pnpm exec vitest run apps/worker/src/single-agent-commerce-media-delivery.test.ts apps/worker/src/realtime-product-facts-v2.test.ts --reporter=dot
pnpm exec vitest run packages/business-tools/src apps/worker/src/single-agent-commerce apps/worker/src/realtime-product-facts-v2.test.ts apps/worker/src/single-agent-semantic-verifier-boundary.test.ts apps/worker/src/p23c-media-revalidation.test.ts apps/worker/src/p23c-publisher.test.ts apps/worker/src/p23c-hash-v3.test.ts --reporter=dot
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
pnpm exec tsc -p apps/worker/tsconfig.json
pnpm --filter @lana/worker lint
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-media-delivery-regression-20261028" COD --candidate-handoff --check-prefix "B composed revalidated media "
git diff --check
```

The real PostgreSQL regression completed both cases: expired publication + fresh proof sends the exact text/image once after dispatcher restart; proof revoked after enqueue sends nothing and places both rows in MANUAL_REVIEW. Both use capture transport only, zero provider generations; the isolated DB was dropped. [Evidence](DELIVERY_REGRESSION.json). The SQL composition uses a permissive base business gate; the real generic ProductFacts projection is covered separately by its focused test.

Recommendation: STOP/B_NOT_GO for this incomplete source. Commit and seal a new source before a fresh 17-control/51-native campaign; retain every observed attempt above. No automatic acceptance or deployment.
