# Phase C — opening product media implementation, 02/11/2026

Implementation base `9b6fec45abec3c3e98f5505504842ac4755fa0a3`; implementation `58d06b497472a8e4f8ac247413def7a7b243d4e0`; actual PostgreSQL/final Node source `41ad8e2f57d7a2b9f6200ed3efb8c6633a8c8318`. The latter changes one synthetic fixture argument only; worker/packages are byte-identical.

The owner selected **every opening response for an identified product includes a photo, including ETA/ACK**. This replaces the previous ETA/ACK no-photo control for this activated candidate. [Plan and owner decision](c3-phase-c-opening-product-media-plan-20261102.md) · [Exact commands, source blobs and artifact hashes](c3-phase-c-opening-product-media-verification-20261102.json).

## Implemented behavior

- Fixed code-owned `FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1`, bound to current candidate identity, seal/preflight and actual Phase C provider driver. Existing unscoped paths remain compatibility controls. Production entrypoint is not wired.
- First contact uses a durable page/conversation/customer-scoped proof of prior accepted shop output. The cutoff precedes the earliest source occurrence and Inbox receipt in the current batch. CUSTOMER-only history, pending output and acceptance at the cutoff do not prove returning; a previous accepted output survives truncated history. Missing/error proof fails closed for an identified product.
- Every admitted product, including a newly discovered product or cart product, needs an eligible selected product photo. After a valid/public FINAL, code reuses matching media or debits one primitive before each internal count1 selection, before snapshot/binding/verifier. No new owner round. Existing cap6 calls,2 rounds,3 owner generations and4 images stay unchanged.
- Cart colour is derived from exact `components[].color`, normalized with the existing catalog function. Generic, wrong-colour and chart-only media do not prove a known choice. Conflicting colours or failed colour lookup hand off without generic retry. Existing selected images are preserved.
- Egress independently checks the actual required products and response-group images; existing exact source/snapshot/readback, freshness, revision, permission, recipient, privacy and receipt gates remain. No text sequence0 may escape an invalid image group.
- Missing media/history/capacity/budget goes to real silent handoff, or NO_SEND if handoff is unproved. First-opening private/code-only checkout and add→confirm are fenced before checkout advancement/batch effects. Returning checkout remains supported.

No owner/verifier prompt, model, effort, verifier schema, provider API, retry policy, request bound or shop source changed. One owner and at most one verifier remain. Added one code-owned media rule module and one scoped durable history read; zero semantic roles/layers, customer-language parsers, case regex/templates or repair loops.

## Readiness and comparison attribution

The shared readiness guard runs at normal native seal and each generation dispatch. SALES_READY requires media for initial products, declared discovery pool and task product scope. Source-unavailable controls remain separate; evaluator declarations never enter model requests.

The pinned-main C3 wrapper prepares opening media BEFORE_STRATEGIST; candidate prepares it AFTER_OWNER_FINAL. This information/timing difference is **not proved equivalent**. The coverage witness reports `INFORMATION_PARITY_NOT_ESTABLISHED`, and qualification independently blocks replacement for the active rule even if a witness claims structural parity. An absolute candidate result can still be evaluated separately. Pinned main internals/orchestration are unchanged.

## Observed verification

- Required opening tests: corrected RED6FAIL/1PASS before implementation → GREEN; later expanded19/19PASS. Initial malformed test setup and intermediate handoff-reason/type/legacy-fixture/cap-fixture failures remain in retained logs.
- Worker commerce/boundary/protected focused regression: **883 PASS**. Database suite: **267 PASS /30 existing opt-in SKIP**. Protected claims/reply assembly: **21 PASS**. Counts overlap.
- Final full Node at41ad: **817 PASS /0 FAIL /2 existing SKIP**. Canonical worker build (including database dependency build), direct worker/database typecheck and worker/database lint PASS. Runtime is byte-identical to the58d snapshot used for the worker checks.
- Actual unfiltered disposable PostgreSQL: **110/110 PASS** =94 retained regressions +16 new opening controls; **7/7 named real-adapter invariants PASS**, clean source, database dropped, provider0, live-sendfalse. The30 skipped database suite tests are not relabelled as covered by this distinct matrix.
- Original PG01 at58d: **12PASS/1FAIL**,3 opening cases not reached; DB dropped/provider0/livefalse. The failing replacement fixture used DIRECT while its selected line required SM613-DIRECT, so the mutation was correctly rejected before exercising changed-colour media. The sole fixture argument was corrected, then the full matrix rerun. Original evidence remains FAIL.
- The16 new PostgreSQL cases cover quote/ETA/ACK atomic text+photo acceptance, missing photo, customer-only and truncated HUMAN history, pending/same-time acceptance, returning output, private-first, add-confirm zero effects, add/replace chosen colour, returning private preview, invalidation after verifier and cancellation before sequence0.

No new provider evaluation or conversational quality measurement occurred. Provider latency, token/cost and safety population results are NOT_RUN, not inferred from local stubs.

## Independent review and disposition

**APPROVE IMPLEMENTATION P2** at `41ad8e2f57d7a2b9f6200ed3efb8c6633a8c8318`, same independent reviewer. All45 artifact byte hashes and25 source SHA256/Git blobs matched; actualPG110/110+7invariants/cleanup/provider0/livefalse and final checks independently verified. R1-R4 closed; no remaining blocking implementation finding. Approval excludes model quality, qualification GO, matched comparison, deployment and live send.

P1 continuation implementation remains approved at8eb074ef: the constructed envelope presented65143/65536,393bytes headroom. This remains a bounded replay, not a guarantee for all possible continuations. P2 owner-choice/design gate is now implemented; neither P1 nor P2 is still waiting for an owner contract decision.

First-direct-checkout and conflicting-component-colour cases currently hand off; media/data readiness and model quality under the new rule need a fresh source-bound campaign when separately requested. Qualification remains **BLOCKED**, C3 comparison **NOT_RUN/information parity unestablished**, B_NOT_GO. No merge, deploy, live send or automatic next model campaign.

