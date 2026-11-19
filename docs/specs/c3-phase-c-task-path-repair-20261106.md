# Phase C — task-path repair, 06/11/2026

Implementation base `4e2ac3489fab80be30cd831a0d4397c04a4af9ad`. Owner authorized fixes following B–C review. Keep the current branch; no provider run, source publication, merge or deploy in this fix-only task. Historical failures and NOT_RUN slots remain immutable.

## Scope and evidence

Latest R2 failures: p09/s15 exceed the 65,536-byte text request cap after reads/profile update; p04/j4 return HTTP200 MALFORMED_FUNCTION_CALL; s13 searches despite a shared component; s03 lacks confirmation that its DETAIL photo shows lace. Last quote repair has actual N1 evidence for j1T3. Preserve it and B's price/policy/size/media/cart/checkout capabilities.

Deeper inspection corrected one proposed optimization: `omitCurrentProductDuplicates` already factors read selection evidence. Do not add redundant compaction. A proposed state-schema refactor made the wire larger; discard it. Keep argument schemas/validators and owner/verifier prompts unchanged.

## Implementation

1. **Tool instructions:** replace verbose repeated tool descriptions with purpose, arguments, result and material limits. Keep operational instructions already in the owner prompt. Do not remove tools reachable in an ordered batch, modify schemas, cut current facts or signed native parts, raise caps, retry or rewrite model outputs. Review the description diff against the old descriptions and unchanged prompt. Target at least4KiB saved on the full tool surface; measure both raw and presented wire, not just text files.
2. **Shared purchase presentation:** expose explicit read/quote targets for single logical components already linked by current AVAILABLE/INSPECTED_ROWS source. Require one component with quantity1, same componentRef and role across distinct parents; ambiguous identity/quantity is not linked. Never infer by title, merge parent price/stock/chart, auto-select a parent, or grant purchase authority. Preserve original source and per-parent paths. This improves the information needed for s13; model selection remains unproved without a run.
3. **Malformed diagnostics:** record bounded value-free known tool/argument shapes before rejecting non-STOP completions. No raw values, customer/sourceQuote text, unknown names or credentials; never parse guessed arguments, repair or retry. Absence of function parts is explicitly recorded as absent, not diagnosed as a specific wrong field.
4. **Regression acceptance:** observed RED before source edits; wire tests retain source facts, signatures, callIDs/order, schema instances, current total and all reachable tools. Offline reconstruct actual p09/s15 from frozen source/outputs, mark reconstruction separately from historical captured request. Pin reusable synthetic continuation controls and run existing quote/size/cart/media/checkout/semantic-boundary suites. Inspect B controls with equal source/clock; do not call these matched full model evidence.

## Acceptance and limits

- Both failed continuation reconstructions must fit unchanged raw/presented cap; report measured headroom, no universal bound or model stability claim. Include a large-signature synthetic continuation and limit±1 tests.
- JSON argument schema and native execution permissions unchanged. Preserve current source/readback/final gate, partial effect receipts and silent handoff. A committed profile update followed by reply failure is never replayed as a mutation retry.
- Existing return quote, component fits, atomic replacement, policy, opening media and private checkout checks stay green. Any runtime/shared source change additionally requires relevant actual PostgreSQL acceptance; adapter-only changes require full captured/mocked HTTP wire tests and preserve existing runtime identity.
- s03 remains unresolved source readiness for the requested detail: no invented label or photo verification, no changed historical FAIL, no counting honest handoff as completed sales service. The original customer scripts remain unchanged.
- Build/typecheck/lint, focused worker and full Node eval suite, self-review, same independent reviewer until scoped implementation approved. Engineering approval does not authorize or replace new model evidence. Freeze a fresh source/world/registration before any later authorized model campaign.

Official API checked before adapter edits: [Function calling](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling) and [FunctionDeclaration parametersJsonSchema](https://docs.cloud.google.com/java/docs/reference/google-cloud-vertexai/latest/com.google.cloud.vertexai.api.FunctionDeclaration). Retain the existing schema surface; no new API fields or schema dialect introduced.
