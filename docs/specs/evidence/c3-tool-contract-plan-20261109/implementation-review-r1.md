# Independent implementation review R1

Verdict: **REQUEST_CHANGES**. Scope: code/worktree diff against `36058803b95324d8888ef4e6c76773e01b61bb6f`; approved plan SHA256 `6495b49aff8016df34050d79f86b31330905ef2deb9714033b92ecde13cc3bdd`. No provider calls, source edits or git mutations performed by reviewer. Parent is still finishing implementation; this is not exact-head/run approval.

## Remaining findings

1. **IR1-F1 — P2, wrong-scope cart authority reference.** `apps/worker/src/single-agent-commerce-quote.ts:81` and `:161` attach `currentCartQuoteRef` whenever any current cartQuote exists. There is no comparison with the product/offer/quantity being quoted. For example, an existing negotiated cart for product A can be referenced by a pre-cart quote for product B, or another offer/quantity of A. Plan §4.2, line 70 requires a current same-target cart, and explicitly keeps other scopes independent. `appliesNegotiationReceipt:false` is helpful but does not make an unrelated reference correct. Required: publish a reference only after code proves the canonical target/cart selection correspondence and freshness; otherwise null. Check both owner result and trusted pre-cart literal. Acceptance: matching negotiated selection retains correct reference; different product/offer/quantity or changed/stale cart does not; pre-cart amount never acquires the concession.

2. **IR1-F2 — P2, W4 label-source admission is insufficiently verified.** The new branch at `apps/worker/src/single-agent-commerce-read-only-tools.ts:135`–`:143` reads titles from supplied initialProducts and enforces byte limits. Existing tests found by focused search cover null labels/BOM structure and owner-only opacity, but no positive exact-ref label/source case, label UTF-8 limit or aggregate bound, or actual owner/verifier admission. Required: focused deterministic tests with a bounded frozen-map positive source, unrelated/missing source, 128-byte label boundary and 1024-byte aggregate boundary, preserving component counts and numeric/binding evidence. Capture actual owner/verifier request admission for the bounded positive/unknown case. No new live source or backfill required.

3. **IR1-F3 — P2, W5 transport acceptance omits stream and timeout stages.** `apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs:1067` only injects errors from fetch before a response. Plan §7 requires errors before response, mid-body and timeout, all at most one generation request. Existing RESPONSE-invalid-JSON test is not a broken transport stream. Required: a response stream failing during body read and an abort/timeout test; assert safe failureStage/transportCause, no raw exception/secret, one request, unavailable model version if no completed body and no retry. Preserve committed state/receipt in the surrounding deterministic control.

## Issues caught and corrected during this review

- Native quote declaration described old two-unit/no-writer behavior. Parent changed the actual wire description to one quote primitive plus separately charged gate image and closed writer-first allowlist.
- Mixed preference writes incorrectly required sourceQuote even though native/domain preference contract permits omission. Parent changed batchShape and added structural/negative tests.
- Writer readback only checked authority/pending flags. Parent added pre/post readback state fingerprint comparison excluding factSnapshotVersion and tests for revision/profile/recipient/permission change.
- Returning/quantity quote constraints needed validation before writer dispatch. Parent added preflight and a no-commit negative test.

These closures were inspected in source. They still require the final targeted test/build evidence after the last changes.

## Non-blocking limits / run reporting

- Native `record_negotiation` remains callable only for cart/created context. The no-cart negotiation continuation can remain deterministic/PG coverage; report native NOT_EXERCISED if no registered sample exercises it. Do not count state-writer coverage as negotiation-source proof.
- S16 remains a prospective SOURCE_GAP control, not a newly implemented customer-wearing capability. Historic failure remains unchanged.
- Opening-photo code establishes source/product/constraint eligibility. It does not prove that final prose coherently introduces both selected products; keep native text/media review.
- No assertion of Phase C qualification, model stability or semantic safety proof is made.

## Checks actually performed

- Read-only git diff and targeted source/tests reads for W1–W5, actual native declaration/decoder, callable gates, state/effect readback, opening-media constraints, source projection and transport path.
- Verified exact approved plan hash and current code hashes (JSON companion).
- Read `../c3-tool-contract-node-20261109.log`: recorded 91/91 PASS before final follow-up changes. Reviewer did not execute that command.
- Read `../c3-tool-contract-pg-20261109/integration.json`: 11/11 PASS, generation0, disposable test DB dropped. Reviewer did not execute PG tests.
- Parent reported broad focused1072/1072 and worker checks; not independently rerun and not treated as proof for the missing controls above.
- No provider/model run; no broad tests rerun by reviewer; no secrets or live mutations.
