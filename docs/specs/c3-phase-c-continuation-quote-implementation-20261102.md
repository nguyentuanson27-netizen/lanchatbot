# Phase C — continuation bound repair and quote-contract decision

Implementation base `43211d7d97097a52901316f550871b4b90b31fee`; P1 executable `8eb074ef98e6a125ce7985ca992d26b50699f60e`. [Plan](c3-phase-c-continuation-quote-fix-plan-20261102.md). Status: **APPROVE IMPLEMENTATION P1** at8eb074ef; P2a remains pending owner contract choice. No model run is included.

## P1 result

| Constructed frozen s08 continuation | Before | After |
|---|---:|---:|
| Raw text frame | 67436 bytes | 64966 bytes |
| Actual presented dispatch frame | 67613 bytes | 65143 bytes |
| Unchanged text limit | 65536 bytes | 65536 bytes |
| Remaining presented headroom | exceeded by2077 | 393 bytes |
| Callable tools | 14 | 14 |
| Opaque signature | 11024 characters | 11024 characters |

Before-presented measurement used an isolated diagnostic copy to reach rendering after the original raw rejection; no provider request was made. After measurement uses the actual committed adapter, unchanged world/clock/native output/results, original instructions/config and both existing guards. The historical failed second request body was not captured; these are constructed continuations, not a claim of exact historical wire recovery.

Three structural changes apply only to existing CompactV2. Known state-operation schemas no longer repeat an outer envelope whose constraints are already enforced by four closed branches. Single exact sellingOptions results carry their mirrored default data once with a bounded defaultFromOption:0 reference. When actual ordered declaration names equal both configured/callable inventories, a bounded DECLARED_TOOL_SCHEMAS reference replaces the two duplicate lists; differing/duplicate/empty inventories remain literal. Original raw tool results, call IDs, model parts and signatures are preserved.

The single-option fold requires full equality of every removed field, including sizeAvailability, plus matching provenance wherever present on the original default, before reason sanitization. Partial/conflicting results and explicit identity among multiple options remain literal. Both references have strict expanders; invalid/mixed references are rejected. Expanding the actual new frame yields exact old non-schema data. AJV4810 comparisons independently validate identical accepted/rejected state-schema instances, including CLEAR, null/extra/value/sourceQuote and array bounds. No price/fact reference compression was used.

The result closes the observed s08 bound failure. Only393 bytes of headroom remain on this tested envelope; larger requests still fail closed before auth/HTTP. This is not evidence that every theoretical continuation fits or that model tool decisions/quality improved.

## Verification and independent review

[Exact commands and hashes](c3-phase-c-continuation-quote-verification-20261102.json). Structural TDD observed10PASS/3FAIL before fix, then15/15GREEN; first test-launch version also had an incorrect expectation about the provider error wrapper, retained separately. Focused adapter/presentation98PASS, worker348PASS, direct worker TypeScript/lint/build PASS. Counts overlap. Final full Node suite at8eb:808PASS/0FAIL/2 existing SKIP (810total).

The first broad Node run produced805PASS/3FAIL/2SKIP. Two old final-text presentation controls expected literal empty inventories; the new marker had no size advantage there, so empty inventories stay literal. The third native-wire control now expands the bounded reference before comparing data semantics; signature/history/tool declaration and local-stub HTTP equality assertions remain. These failures are preserved, not relabeled as passing old runs.

Same independent reviewer approved P1 design, checked source and independently ran15 structural tests plus two native tests, verified raw-body hashes and full round-trip. Same reviewer subsequently verified all39 artifact hashes,5 source hashes/Git blobs,12 command records and final808PASS/2SKIP; **APPROVE IMPLEMENTATION P1** at exact8eb074ef. No remaining P1 blocker. No PostgreSQL rerun is needed for this presentation/schema-only change: worker TypeScript, shared contracts/kernel/persistence and effects implementation are unchanged.

The official [Google function-calling guide](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling) was checked before the adapter change. Existing API fields, models, effort, generation settings and retry0 remain unchanged; no cache, extra provider request or signature shortening was introduced.

## P2a remains an explicit contract decision

Upstream audit found no trusted quote-task producer. The normalized inbound contract retains ad metadata; postback/quick-reply quote signals are not retained. Ingress binds product identity and firstContact/fromAd only. openingQuote follows an optional read and quote_product is an optional owner tool. Legacy price-card intent uses prose matching and is outside this architecture. A new button/postback route alone would not close the existing free-text bypass.

The owner was asked to choose between two materially different behaviors. Recommendation: retain one verifier and extend only its protected-language observation of the exact final reply with PRICE PRESENT/ABSENT/UNCERTAIN and existing price refs. Code applies the image requirement and verifies exact product/offer/source/media/group/revision/recipient bindings. Missing observation/proof or uncertainty fails closed; ETA/ACK with no price remains unforced. This needs a reviewed schema/boundary revision and focused semantic safety coverage before any new provider claim. An incorrect semantic ABSENT remains verifier risk.

The other option attaches an image to every first-contact response for a bound product, including ETA/ACK. That changes the existing customer behavior and cannot be silently selected. No option has been activated without the required answer. P2a is not marked fixed; no trusted source signal was fabricated from evaluator labels or an owner self-declared marker.

## Disposition

P1 code does not add a semantic router, language parser, case regex/template, role, generation retry, prompt rewrite or production wiring. No source-shop write, TTL renewal, provider evaluation, merge, deploy or live send occurred. Existing final draft/snapshot/freshness/permission/privacy/receipt gates remain unchanged. P2a/Phase C qualification stay BLOCKED pending the specified contract decision and subsequent implementation; model quality NOT_RUN / C3 NOT_RUN / B_NOT_GO remains. Continue P2a once the owner choice is available.

