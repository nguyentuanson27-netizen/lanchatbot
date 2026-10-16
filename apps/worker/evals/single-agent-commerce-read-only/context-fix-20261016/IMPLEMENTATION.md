# Phase B context/native corrections — 2026-10-16

Owner authorizes “Thực hiện fix và chạy lại” against the [independently reviewed plan](../reviewed-fix-run-20261016/NEXT_FIX_PLAN.md). Intake `59bd75cae5e7eea60ef69ee24375c0153e393e1c`; refreshed main / implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Existing implementation branch and draft PR391. This report records implementation evidence; a later frozen registration owns provider results. No live source write, send, merge or deploy is authorized.

## Adapter correction, observed RED → GREEN

- P1 tests first: `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` exited1,21PASS/3FAIL. Failures demonstrate lost bounded availability reasons, offers under policy instead of products, and redundant missing checklist despite known content.
- Minimum P1: owner projection moves only code-owned offers literals to their product's availableOffers, including products without prose. Non-offer/read/filter literals and original verifier context stay intact. Native tool results preserve statuses plus allowlisted public source reasons; arbitrary diagnostics become SOURCE_UNAVAILABLE. Remove only owner-facing missing checklist; domain raw/source facts are unchanged. Same native signatures/IDs, changed evidence and32KB bound. Node adapter/protocol GREEN33PASS/0FAIL.
- P2 tests first: same adapter command exited1,23PASS/2FAIL. Generic OWNER_COMPLETION obscured known failure branches. Split existing failureCode into bounded candidate-count/finish/content-role/content-parts/empty-visible categories, retaining fail-closed parsing, usage and one request/no retry. Official FinishReason also includes FINISH_REASON_UNSPECIFIED and MODEL_ARMOR; keep future enum strings UNKNOWN. No raw provider body/thoughts/private error logging. Node adapter/protocol GREEN34PASS/0FAIL.

Official documentation checked before changing the adapter: [function calling/NONE](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling), [GenerateContentResponse/FinishReason](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerateContentResponse). Current serialized NONE/tools[]/native continuation matches the documented request surface; no demonstrated request-contract defect justifies changing client/history/model or opening another tool round. Actual provider adherence remains unresolved until the new authorized run; offline dispatch tests do not establish live compliance. The historical case15 subtype stays UNKNOWN.

## Source diagnosis in progress

Current index read finds SV2447 description with WEBSTORE_XML provenance and absent product_attributes, not an attribute discarded by the candidate. Registry read is separate and read-only. Current snapshot has zero-stock preparation5–8days and shipping MIEN-NAM3–6days, but private-address region mapping is not established by the existing resolver. A missing geographic/shop mapping is not missing numeric ETA and must not be filled with a case-specific parser/default. No source publication has occurred.

The first temporary source probe passed a structured address where the existing API requires a string/lineId and returned CART_SELECTION_FAILED; corrected the probe only. The corrected0generation read reproduces ETA_UNAVAILABLE/CART_ETA_UNAVAILABLE with the proper query. It does not reconstruct or rewrite earlier historical outcomes.

Implementation/tests/source diagnosis continue before freeze. Provider requests in this preparation so far:0. Full suites/build/typecheck/lint/current-run sales acceptance are not yet claimed PASS.
