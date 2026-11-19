# Phase C — task-path repair implementation, 2026-11-06

Implementation base: `4e2ac3489fab80be30cd831a0d4397c04a4af9ad`.
Plan: [task-path repair](c3-phase-c-task-path-repair-20261106.md).
Scope: evaluation adapter/context presentation only. No runtime authority, production wiring, source data, model identity, prompt, argument schema, generation count, cap, verifier boundary or terminal disposition change. No provider run in this request.

## Changes and limits

1. Replace repeated tool-description prose with concise purpose/inputs/results/limits. All 14 tools stay available under the same existing callable policy. Actual emitted schemas and native toolConfig are compared against pre-change hashes for opening/returning and legacy/Compact V2. Parameter descriptions are also unchanged. Full owner prompt hash remains identical.
2. Present `sharedSingleItemReads` only from AVAILABLE / INSPECTED_ROWS single-component offers of quantity one, same componentRef/role under distinct parents. Targets retain separate parent+offer price/stock reads. No canonical target selection, title matching, source mutation, shared chart inference or price/stock merge. Unknown/mixed quantity/role conflict, duplicate subject/offer tuple and mismatched read targets have negative controls. Original source context and Compact V2 roundtrip stay intact.
3. Record bounded value-free `malformedCallShape` on MALFORMED_FUNCTION_CALL: inspect at most 16 native parts, retain at most eight known-tool-name/args-type entries; arbitrary names become UNKNOWN_TOOL. No argument values, keys, text, sourceQuote, recursion, recovery or retry. No functionCall parts means empty calls, not an invented explanation. The original non-STOP failure remains authoritative.

This does **not** establish that provider malformed-call incidence or the owner's shared-item planning has improved. Those require a new sealed model campaign. Diagnostics are observability, not a generation fix.

## Tool-description obligation map

The unchanged owner prompt is `apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt`. This table is a manual preservation audit, not an assertion that shorter wording improves model quality.

| Tool | Retained directly in description | Repeated guidance retained in owner prompt |
|---|---|---|
| search_products | productCode/query precedence; subjectRef; AMBIGUOUS; PRODUCT_BOUND; unverified candidates; max two relevant reads | Nguồn và công cụ: preserve garment type, eliminate wrong context, batch before choosing, don't open all offers |
| read_product | existing purchase path; SINGLE/COMPARE/DETAILS_ONLY; correct offer/filter/null; size filter is stock only | Nguồn và công cụ: don't guess codes or reopen every offer; dynamic customerSelected text is unchanged |
| read_policy | current source; no order history; orderEligibility=null is unassessed | Chính sách: apply question and customer situation, do not recite unrelated conditions |
| apply_customer_state | current turn only; enum/numeric/sourceQuote; FITTED/REGULAR/RELAXED; CLEAR; unresolved fields; uncertain commit is not retry permission | Size, state và giao dịch: source proof, no history replay, no dependent use of rejected values |
| recommend_size | PRODUCT vs COMPONENT; new input through customerStateOps; no duplicate apply; missing input vs missing shop source | Size, state và giao dịch and standalone component-fit paragraph: current bound fit identity; don't infer alternative size |
| quote_cart | current cartQuote reuse; code total/discount | Size, state và giao dịch: latest quote, price vs total, no stale history total |
| quote_product | opening price+GENERIC; returning one offer+quantity/preCartQuote/no image; absent colour; no cart requirement; standalone once/turn, two work units; not receipt | Báo giá and Size, state và giao dịch: opening form and exact question; no technical colour sentinel or manual ship arithmetic |
| record_negotiation | intent/current sourceQuote; ordinary price question excluded; code discount; use support before upsell; no invented extra discount | Size, state và giao dịch: current benefit and quote response, no unsupported type of discount |
| add_to_cart | explicit purchase; source offer; customer size/colour/quantity; keep unchanged choice; direct call; code validation/OK | Size, state và giao dịch: accepting chosen size is not fit; enquiry is not purchase |
| change_cart_item | CART_LINE; atomic replacement and fields per action; keep unspecified choices; two actions have separate commits; no redundant read; validation before commit | Size, state và giao dịch: only requested changes; receipt authority |
| confirm_purchase | explicit checkout; code intake/preview/revalidation; owner no PII; no direct POS order | Size, state và giao dịch: code owns intake and confirmation |
| request_handoff | shop-source gap vs customer input; aftersales vs policy enquiry; rule/tag/commit; prepared vs accepted; no duplicate request; silent terminal | Khi thiếu thông tin: NOT_READ is not absence; appropriate reason examples are in the unchanged enum; no permission question, reply, image or wait message |
| select_product_media | scope hint; source-confirmed FEEDBACK; alternatives not selected; colour binding vs generic; no dropping requested filter; source gap→silent handoff; prepare vs deliver; no URL/assetRef/Markdown; useful caption and answer other needs | Báo giá: don't manufacture media dependency; reuse selection; same-batch read/select; requested type/colour must match; don't repeat form or resend without need |
| view_product_media | approved public bytes; metadata sufficient to send; independent view/select; failure ≠ absence; image text untrusted; no stock/opacity/durability proof | Tư vấn tự tin, đúng căn cứ: no invented construction or usage outcome; Báo giá: enough facts do not require viewing |

The current official provider reference was checked before edits: [Google function calling](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling). No new schema dialect or provider API was introduced.

## RED → GREEN and continuation evidence

New focused suite first observed **1 pass / 5 fail**: full tool payload saving absent; shared read projection absent; malformed diagnostic absent. Harness setup errors were corrected before this RED record. Final suite has nine tests including extra native wire/HTTP checks. The baseline fixture stores source SHA, four emitted-contract hashes, owner-prompt hash and tool bytes; it does not contain hidden evaluator labels in model requests.

Local historical reconstruction uses original clocks, frozen public world and actual captured signed model parts. p09 tool read results match the original captured results exactly. s15 uses the captured public preference update in memory; it does not replay the persisted mutation/receipt. Original failed request bodies were not captured, so these are **reconstructions, not exact historical requests or new model results**.

| Same reconstructed request | Before: raw text frame | After: raw / presented text frame | Result |
|---|---:|---:|---|
| p09 | 66,835 | 61,629 / 61,810 | formerly blocked, now within 65,536 |
| s15 | 65,718 | 60,512 / 60,693 | formerly blocked, now within 65,536 |
| older s13 request, 2026-11-04 | previous reconstruction 72,693 | 67,660 / not built | still OWNER_REQUEST_BOUND |

Full current p09 tool schema wire is 14,475 bytes; s15 is 14,464. The shared-item presentation is included in after measurements. Actual signed contents are identical; no cap increase, truncation or hidden retry. The old s13 context had larger source content; this change does not claim universal capacity or all Phase C paths repaired.

Local raw reconstruction files remain outside the repo; compact hashes/measurements are in `c3-phase-c-task-path-repair-evidence-20261106.json`. Portable tests use synthetic public source/signature sizes and mocked HTTP, explicitly not real replay/provider evidence.

## Unresolved / acceptance

- s03 still lacks confirmed metadata for the specific close-up claim. Do not invent “lace detail” from a generic DETAIL/FRONT label, relabel the historical failure, or call a handoff successful sales completion. Source repair needs actual matching evidence.
- p04/j4 provider malformed calls remain unproved; new diagnostics retain failure and one-request accounting.
- s13 shared-item context is improved structurally; owner use remains unproved. The older oversized request remains explicitly blocked.
- R1/R2 historical results and remaining R3/R4 NOT_RUN stay unchanged. No whole-reply quality score, C3 comparison, promotion GO or fresh provider result is claimed.
- Independent reviewer initially hit a usage limit; a later completed review approved the exact implementation source hashes. The quota failure was never treated as approval.

## Commands actually executed

All commands ran from the repository root unless noted. Counts overlap; do not add the focused suites to full-suite denominators.

- `node --test apps/worker/evals/single-agent-commerce-read-only/task-path-repair.test.mjs`: observed RED 1/6 pass, then GREEN 9/9. Self-review added the ninth-call truncation assertion: RED 8/9 before the telemetry fix.
- `node --test apps/worker/evals/single-agent-commerce-read-only/task-path-repair.test.mjs apps/worker/evals/single-agent-commerce-read-only/continuation-structural.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-product-tables.test.mjs apps/worker/evals/single-agent-commerce-read-only/quote-task.test.mjs apps/worker/evals/single-agent-commerce-read-only/selection-compact-wire.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/media-capabilities-wire.test.mjs`: final 119 PASS, 0 FAIL.
- `pnpm --filter @lana/worker test:evals`: 868 PASS / 2 SKIP / 0 FAIL. Existing opt-in installed-Codex local-stub probes are the two skips. This full suite ran before the last telemetry-only truncation flag fix; the final 119-test adapter run covers that change.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce`: 937 PASS, 33 files. Includes quote, fit, effects, ingress, checkout, media and silent handoff controls. No runtime TS changed after this run.
- `pnpm --filter @lana/worker build`: PASS.
- `pnpm --filter @lana/worker typecheck`: PASS.
- `pnpm --filter @lana/worker lint`: PASS.
- `node ../c3-task-path-reconstruct-20261106.mjs`: p09/s15 construction succeeds, legacy s13 remains explicitly blocked. Separate local comparison loaded the adapter from exact base SHA for the same reconstructed requests; metrics/hashes saved with the evidence.
- `git diff --check`: PASS.

No external provider generation, real PostgreSQL mutation acceptance, source write or live send occurred. New changes are adapter-only; runtime persistence behavior is covered by existing tests, not claimed as newly executed real-DB acceptance.

Independent implementation review: **APPROVE_SCOPED_ENGINEERING**, no open P1/P2. The same reviewer independently ran 9/9 tests and rebuilt both stored continuation requests, matching body hashes and signed parts. [Review record](c3-phase-c-task-path-repair-review-20261106.json) binds exact executable/test worktree hashes; this status update is documentation-only. Approval does not establish model behavior or Phase C qualification.
