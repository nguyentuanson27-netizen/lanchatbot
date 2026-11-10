# Independent implementation review R2

Verdict: **REQUEST_CHANGES**. Base `36058803b95324d8888ef4e6c76773e01b61bb6f`; approved plan SHA256 remains `6495b49aff8016df34050d79f86b31330905ef2deb9714033b92ecde13cc3bdd`. Code/test review only, no provider request or executable edit by reviewer.

All three R1 findings are closed in the inspected implementation: same-target currentCartRef plus five matching/unrelated/binding controls; positive exact-source label and UTF-8/aggregate/owner-verifier admission controls; mid-body reset and abort single-request transport controls. Public flat-read 0/1/2/3-offer differential tests were added. Last-REPLACE feasibility now removes earlier photo credit, preserving the required-photo reservation.

## IR2-F1 — P1: legitimate negotiated writer still cannot reach sibling quote

Evidence: `../c3-tool-contract-pg-final-20261109/integration.json` records **FAIL**, four executed controls, three PASS and one FAIL; disposable DB dropped. Failing case: `C tool contract mixed negotiated has durable ordering, source proof and exactly-once delivery`. Its NEGOTIATION_EVENT committed, yet quoteTaskWork is empty and one tool was rejected. The second synthetic owner asserted the expected quote result, surfaced PROVIDER_ERROR, and actual terminal was silent HANDOFF with no send. This is a deterministic adapter/contract acceptance failure, not an observed provider outage.

The whole-state writer-readback fingerprint in `apps/worker/src/single-agent-commerce-quote.ts` compares snapshots through nested authority caches. `apps/worker/src/single-agent-commerce-handoff.ts:68` overrides conversationRevision with its cached authority, while `:229` refreshes it only during readback. `single-agent-commerce-effects.ts:391` has already refreshed inner authority after the writer's own commit. Therefore a legitimate authority advance from that exact receipt can appear between before/after readback snapshots. This is a concrete code-based explanation to verify; the artifact does not record the differing field, so do not claim the exact field was observed.

Required amendment: distinguish the proved writer's own authority/revision advance from an out-of-band mutation without weakening permission/recipient/binding/revision checks. Refresh the composed view against the exact commit/readback receipt or compare a code-owned expected post-commit authority identity. Do not ignore conversationRevision or all revision fields globally. Safe changed-field names/hashes may establish the mismatch; do not log raw customer state.

Acceptance: negotiated writer+quote reaches the quote with exact currentCartQuoteRef and unchanged pre-cart concession semantics; accepted delivery once; out-of-band state/authority change still stops; unknown commit still skips quote without effect replay. Complete the preregistered real-PG controls with final generation0/DB cleanup evidence before implementation approval. Old 11-PASS artifact predates this final failure and cannot replace it.

## Checks actually performed

- Read final source and added tests for the three R1 fixes and REPLACE reservation.
- Read `../c3-tool-contract-node-final-20261109.log`: 101/101 PASS.
- Read `../c3-tool-contract-focused-final-20261109.log`: 36 files, 1085/1085 PASS.
- Read final PG artifact: FAIL as described above, testDatabaseDropped=true.
- `git diff --check`: one minor trailing whitespace at `isolated-integration.mjs:835`; no semantic concern.
- Read prospective screen scope/helper: 13 cases/27 turns/N1/retry0, S16 evaluator-only source-gap distinction retained; pending registration/world/input review is a separate gate, not approved here.
- No test/provider command executed by reviewer; logs reviewed as existing evidence. No approval for model run or qualification.
