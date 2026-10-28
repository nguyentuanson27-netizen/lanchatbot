# Independent review — media revalidation and final delivery

User requested independent review, fixes and re-review until approval. Scope: the change from `57fb94deaf906d575f352f9b5422e1ad8c117c5a`, including producer/proof binding, projection, final consumers, bounded operator and run evidence. Review does not authorize deploy or establish Phase B acceptance.

## Review 1 — REQUEST_CHANGES

Reviewer `/root/media_revalidation_independent_review` inspected clean HEAD `cf0a61e388c30f074f58b0e0df48317f9ad57730`, ran128tests/8files independently (allPASS), and demonstrated two P1 findings on compiled code:

1. Media gate retained its entry clock across async reads. With expiry at10:00:01 and catalog read advancing to10:00:02, it still returnedALLOWED.
2. Registry revocation observed after a successful VERIFIED proof write returnedWRITE_UNCONFIRMED, but left that own proof consumerVALID. An error status alone did not quarantine persisted authority.

Reviewer confirmed the BLOCKED report and51NOT_RUN accounting were correct. No provider, remote source write or deploy was performed during review.

## Implementation response

- R1: re-evaluate bound observation/expiry/TTL and time-dependent policy validity with the current clock after reads, before the base gate, and after the awaited base gate. Do not refresh any binding or TTL. Tests cross expiry during catalog, policy, authority and base reads; another test expires only policy while the image remains fresh.
- R2: add a required conditional quarantine port to the helper. Only a positive readback with the exact own VERIFIED proof and changed/revoked source dispatches an INVALID write. It is a separate safety action, not a retry of the earlier write. Check readback before reporting invalidated. The HTTP operation targets exactly one point and matches all4proof fields, preserving a concurrent newer proof. Publisher refuses enabling refresh without this capability; bounded operator wires the same port.
- Tests demonstrate consumerINVALID after positive revocation, preservation of a concurrent proof, one quarantine dispatch on response loss, and unavailable readback staying explicitly unconfirmed. The last case can leave a persisted VALID proof: no atomic Sheet/Qdrant transaction or blanket failclosed guarantee is claimed for unknown outcomes. Both sources remain subject to their existing trust boundary and TTL; candidate is not deployed.

The Qdrant conditional payload operation uses official documented [set-payload filtering](https://api.qdrant.tech/api-reference/points/set-payload) and [point ID/nested-field filtering](https://qdrant.tech/documentation/search/filtering/). No new service/client framework or external API was added. The filtered wire is tested locally; no live Qdrant mutation or server concurrency test was run this turn.

## Verification actually performed

ObservedRED before implementation:6failed/26passed in media-delivery +producer tests (4expiry,2positive source-change cases). MinimumGREEN:52/52 across3files. Additional concurrency/error/filtered-wire/policy-only tests then passed. An intermediate policy-only test initially used the wall clock to create its binding; corrected to the test clock, then21delivery tests passed. That setup failure is not claimed as another runtimeRED.

Final affected suite1139/1139 across54files, Node eval228/228. Workerbuild/typecheck and lint passed. Commands:

```text
pnpm exec vitest run apps/worker/src/single-agent-commerce-media-delivery.test.ts apps/worker/src/p23c-media-revalidation.test.ts --reporter=dot
pnpm exec vitest run apps/worker/src/single-agent-commerce-media-delivery.test.ts apps/worker/src/p23c-media-revalidation.test.ts apps/worker/src/p23c-publisher.test.ts --reporter=dot
pnpm exec vitest run apps/worker/src/single-agent-commerce-media-delivery.test.ts --reporter=dot
pnpm exec vitest run packages/business-tools/src apps/worker/src/single-agent-commerce apps/worker/src/realtime-product-facts-v2.test.ts apps/worker/src/single-agent-semantic-verifier-boundary.test.ts apps/worker/src/p23c-media-revalidation.test.ts apps/worker/src/p23c-publisher.test.ts apps/worker/src/p23c-hash-v3.test.ts --reporter=dot
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
pnpm exec tsc -p apps/worker/tsconfig.json
pnpm --filter @lana/worker lint
git diff --check
```

No shared package executable changes this review turn. Earlier real PostgreSQL2PASS remains earlier evidence; it was not rerun or reattributed to this revision. New provider runs0, source store writes0, live sends0. Existing artifacts/sourceSHAs remain unchanged; the49731e77campaign is stillBLOCKED, native0/51.

## Re-review

Pending exact-source re-review by the same reviewer. Approval, if granted, will apply only to implementation/evidence in this scope, not the unrun native campaign or production readiness.
