# Phase C — task-completion implementation, 02/11/2026

**APPROVE IMPLEMENTATION for the bounded implemented scope at `fdbb3cf425078f66794cdda3ebf28f0b3df0bca1`. P1/P2a remain unresolved; Phase C qualification is BLOCKED.**

Owner requested implementation of the approved revision2 plan, then the same independent reviewer → fixes → review until approved. Implementation base `33c80efdba2eed221ced1b1485c0546421364e93`; runtime/PostgreSQL source `5ca28f5ad00cd0140acb3cbc8d007b14176aefb8`; final reviewed executable (offline reporting + assertion delta) `fdbb3cf425078f66794cdda3ebf28f0b3df0bca1`. Plan SHA256 `3fcfb9e42faa96f38af50a375788f1a722332d217ec29a73f280443fac30c9fd`.

## Result and limits

| Item | Implemented / observed | Remaining gate |
|---|---|---|
| P0 atomic replacement | `REPLACE_LINE` replaces one existing cart line in a single command/CAS/receipt, retaining line identity and binding both old line and target source | 94/94 actual PostgreSQL +7/7 validator PASS; independently approved for implemented scope |
| P1 callable tool schemas | One conservative reachability manifest used by request schemas and runtime admission; legal same-batch paths retained | **BOUND_BLOCKED**: s08 raw text frame67436/65536 bytes, all14 tools legitimately reachable |
| P2a required opening quote+image | Trusted-producer trace completed; optional `quote_product` is retained | **DESIGN_BLOCKED**: firstContact/fromAd alone does not identify a quote task; owner can still FINAL without selecting the quote wrapper |
| P2b read selection | Shared SINGLE/COMPARE/DETAILS_ONLY schema/decoder; bounded safe error shape | Actual provider behavior **MODEL_NOT_RUN** |
| P2c owner over-action | Native callable controls retained | s15/ACK behavior **MODEL_NOT_RUN**; code does not classify customer prose |
| P3 task readiness / judge | New registrations need evaluator-only task scope; component-fit unsupported, exact BOM-role and quote-source/media checks; public judge context and separate task outcome attribution | No newly frozen population, public packet or provider run; historical grades unchanged |

The current implementation does not complete Phase C qualification. No new owner/verifier provider generation, shop-data write, TTL renewal, deployment or live send occurred. Models/prompts/caps/retry policy and official qualification thresholds remain unchanged.

## P0 authority and transaction chain

Kernel reducer, shared action/payload/authority/receipt/readiness contracts, negotiation reprice, native preparation, effects and PostgreSQL locked replay now carry replacement consistently. The target keeps the existing lineId; old product/offer/beforeLineHash must match the locked before-cart. Target product/offer/size/colour/quantity and source proof are independently checked. Authority/payload/cart hashes, revision and receipt bind the full transition; modifying either side fails before persistence.

Malformed replacement shape is rejected at VALIDATION before authorization/policy/source reads. Selection mismatch is SOURCE; subject/permission/recipient/privacy changes are AUTHORITY; native CART_EMPTY is DOMAIN; CAS and uncertain commit/readback remain distinct. Diagnostics use closed safe reasons, no raw exception/private argument retention. A committed mutation is not retried because reply generation or verification fails.

Observed RED before implementation: replacement was unsupported in the native seam; last-line remove was rejected. Frozen P08 pure replay at final executable source retains the actual cart, policy and clock: remove returns DOMAIN/CART_EMPTY; SET_VAY→AO replacement advances cart once and produces one receipt, without changing the original cart. The reconstructed domain envelope is **not** the complete historical state, so this does not prove the sole inner cause of the old NATIVE_MUTATION_REJECTED.

Acceptance covers unchanged ADD/quantity/component paths, two→one removal, sole-line replacement, exact variant rejection, old/target/cart/receipt tampering, unavailable/expired target, multi-line untouched-line preservation, aggregate component stock, transaction rollback and concurrent one-winner commit. Actual runtime/native batch controls cover state→size, REPLACE→quote and two effects. The no-cart add→confirm control proves callable/admission continuity and reaches the existing DOMAIN/CONFIRMATION_OUTSIDE_ORDER_PREVIEW guard; it does **not** prove checkout initiation or detail collection.

## P1 and P2 proof gates

P1 uses structured refs/state/configuration/budget only. It conservatively retains tools reachable through existing legal batch predecessors; callable visibility grants no effect authority. Proposed work retains existing budget/debit accounting, then non-callable names reject before tool I/O. No semantic router/parser or customer-keyword filter was added.

Combined-source s08 constructed replay keeps the captured native output/tool results and11024-character opaque signature, unchanged instructions/config, all facts and legal tools. Raw text-frame bytes, checked before rendering/presented wire: system22000 + schemas19352 + trusted10815 + dialogue15009 =67436, limit65536. All14 configured tools remain callable, so the current structural projection does not solve this case. It fails before rendering/auth/HTTP; final presentedTextFrameBytes are not measured. The original failed second request body was not captured; this is a constructed replay, not exact historical wire. No cap increase, evidence truncation or removal of needed capabilities was used.

P2a trace: ingress builds firstContact/fromAd and verified binding hints; explicit quote wrapper can perform read+eligible-media selection when owner calls it; egress uses selected media and final delivery binding. There is no trusted source signal that distinguishes an opening quote task from a non-quote ETA/ACK using the same firstContact flag. No new owner-declared intent, evaluator label or Vietnamese classifier is introduced as authority. P02 free-text FINAL bypass remains unresolved. Required design work must be reviewed before it can close; optional wrapper tests are not proof of that guarantee.

P2b uses one closed branch definition shared by provider schemas and runtime decoding. Invalid/extra/null/conflicting fields fail without source/effect work or argument repair/retry. Diagnostic values retain allowed enums or INVALID/type/presence only. Official [Google function-calling documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/function-calling) was checked before the adapter change; no transport or generation retry behavior changed.

## P3 task and evaluation boundary

New non-safety registration requires version2 evaluator-only task metadata. PRODUCT fit cannot authorize COMPONENT fit; component tasks remain explicit unsupported/handoff controls. A valid product chart is insufficient to label component sizing SALES_READY. Combo composition needs exact required garment roles, not merely several variant references. Quote readiness checks price and eligible generic media for the same product. Real source TTL/approval/identity constraints remain unchanged.

The public offline judge receives allowed shop facts/policy/state/capabilities/source inventory and normative task rules. It does not receive sourceReadiness/cohort/expected requirements, model arm or private scoring labels. Both absolute and paired packets use the same projection. No candidate-only capability limitation is imposed on the C3 baseline; product results never authorize component fit for either arm.

Development attribution separates sales completion, customer clarification and proper silent handoff, with registered case repetitions as its unit. Missing, duplicate, blocked, NOT_RUN and ERROR attempts have separate counters. Failed generations and unknown grades are counted before status branching, including ERROR after actual provider work. qualityUnknown covers uniquely matched registered attempt rows with no complete grade, including NOT_RUN/BLOCKED/ERROR. Missing/duplicate slots have separate counters and are excluded before that calculation; it is not a completed-only rate. This is additional reporting; it does not change qualification grades, thresholds or historical results. The new metadata has not yet been populated/frozen for a fresh model population.

## Review and verification

Exact commands/source identities, prior failures and artifact hashes are recorded in [verification](c3-phase-c-task-completion-verification-20261102.json); the [review record](c3-phase-c-task-completion-implementation-review-20261102.md) records the same-reviewer findings and disposition. Raw logs and actual PostgreSQL artifacts remain outside the repository at the paths recorded in that inventory. Preliminary failed assertions and setup errors are preserved with their fixes; no command is counted PASS until its result exists. Independent review initially required target-size/colour matching, nullable colour schema parity, accurate failure stages/commit uncertainty, and validation before prework; those changes have been checked by the same reviewer. A later review requested an exact expected DOMAIN result in the add→confirm test, rather than only excluding SUBJECT_REF, and found an ERROR-after-provider hole in development attribution. Four observed RED fixtures cover provider ERROR, nonprovider ERROR, NOT_RUN and BLOCKED; the fix separates errors and accounts generation failure/unknown grades before completion branching. Actual code applied at fdbb3cf4: GREEN5 reporting tests and110/110 effects tests PASS; official evaluator unchanged.

Worker932 focused tests and shared packages contracts79/kernel11/business88/runtime23/database56 PASS at sealed5ca. Lint PASS; worker typecheck/build PASS at sealed5ca, shared package typechecks/builds PASS at1adf878b with unchanged shared source. Full Node at clean5ca:789PASS/0FAIL/2 existing SKIP (791total). Final PostgreSQL at clean5ca:94/94 PASS and existing validator7/7 PASS, cleanup true/provider0/sendfalse. Final fdbb qualification107/107 PASS and direct worker TypeScript compilation PASS; final full Node793PASS/0FAIL/2 existing SKIP (795total). Earlier PG00948c18:85/85 PASS; expanded PG1adf878b:94/94 PASS, both cleanup true/provider0/sendfalse. The same independent reviewer approved final fdbb implementation and evidence; counts overlap across focused/qualification/full Node runs and must not be summed. These are implementation checks, not observed conversation improvement or a semantic safety proof.

The remaining run must not start from an old identity: complete the P1/P2 design gates, review/freeze genuine task histories and current source/media prerequisites, seal clean executable/config source, preflight and obtain required independent dispatch review. Phase C qualification BLOCKED / C3 NOT_RUN / B_NOT_GO remains. No merge/deploy is authorized.



### Source identity and proof boundaries

PostgreSQL ran at clean5ca through completion/cleanup, before the final reporting/assertion change. The exact diff5ca→fdbb has only `task-outcomes.mjs`, its test and `single-agent-commerce-effects.test.ts`; non-test files in the shared packages/worker runtime/read adapter scopes have identical Git blobs. The parity artifact records this explicitly. No claim is made that the PostgreSQL run itself used fdbb. Final Node/qualification checks run at cleanfdbb.

The two inherited ingress assertions formerly expected a customer holding/partial quote text. They now assert the owner-required silent handoff: no text/Outbox, committed HUMAN ownership and internal verified coverage retained. Runtime handoff source did not change to satisfy these tests.

Earlier failed commands remain distinct: PowerShell argument splatting setup, pure replay helper without the actual shop-alias binding, a safe diagnostic exact-shape expectation, and four broad worker failures before the final accounting/expectation fixes. Preliminary failures are not deleted from evidence. Shared package build/typecheck ran through the canonical worker dependency build and direct package checks, with unchanged shared sources thereafter. Focused shared tests include the existing protected claims/reply assembler.

This adds zero online semantic roles. Structural additions are one conservative callable helper, one closed failure-stage type, one shared native read decoder, and offline readiness/judge/report helpers. No product-specific production template/regex, generic agent framework, generation retry or prompt cleanup was added.


Independent final review checked all63 artifact hashes,42 source Git-blob entries and all16 command records, including all three PostgreSQL reports and their7/7 existing invariants. Approval covers implementation correctness within the stated scope. It does not close P1/P2a, certify new model quality, authorize inference dispatch, qualify a C3 replacement or permit rollout. Remote CI on the delivery commit is not yet verified.
