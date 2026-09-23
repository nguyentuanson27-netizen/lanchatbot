# C3 runtime and sales follow-up — 2026-09-24

## Decision

Keep PR #374 in draft. The canonical integration has executable runtime
evidence, and the defects below have concrete regression coverage. Sales
quality and automatic size editing are **not accepted**. Do not infer a sales
pass rate from guarded replies, CI, or a purchase-confirmed state alone.

This continues the contract in `track-c-c3-strategy-contract.md` and the earlier
`track-c-c3-sales-quality-evidence-20260923.md`. Reviewed PR371 commit
`88a1ce41c00522b4e901f7c9b464108d120aa5de` remains an ancestor. No merge,
deployment, model-pin change, traffic activation, customer message or live
data mutation was performed.

## Root causes fixed

| Boundary | Defect and change | Evidence |
|---|---|---|
| Runtime C3 entry | An advisory follow-up without a commerce mutation skipped C3. A persisted SalesCycle record now permits fresh C3 context; existing ownership, media and commerce checks remain. | Stateful runtime test includes an unchanged-commerce follow-up and then completes normal checkout. |
| Size extraction | ASCII boundaries treated Vietnamese words `sẽ` and `lấy` as sizes S/L before the actual token. NFC and Unicode letter/number boundaries now select the explicit size. | Four commerce-entry regressions include M, XL and decomposed Unicode. |
| Conversation ownership | After a size-related handoff, later details/COD/confirmation could still advance SalesCycle. The commerce entry now requires BOT ownership. | Test fails on the preceding code, passes after the one-line ownership check; HUMAN path leaves commerce unchanged and emits no bot reply. |
| Response composition | Every evidence segment carried a courtesy suffix and runtime sent segments separately. The validated reply is now one text unit, with nonfinal courtesy suffixes removed. The outgoing payload hash binds that actual text. | Editorial negative cases preserve price, negation, subject, conditions and effects; runtime output is inspected. |
| Writer/guard agreement | Writer choices were broader than the exact guard accepted. The schema now exposes bounded editorial variants, positional validation rejects wrong evidence, and partial factual arrays reject. | Core and guard regressions; final DEV70 has no guard failure. |
| Policy projection | Refund reasons were incorrectly conjoined. They are alternatives, while the reporting deadline remains mandatory. Multi-sentence policies no longer repeat `ạ` on every sentence. | Typed policy regression and Q071–Q077 transcripts. |
| Product reference | Multi-product facts without display names failed despite canonical IDs. IDs now label their own facts. | Q006/Q081 complete with each product bound to its price. |
| Preference wording | A confirmation question could assume a catalog color the customer never mentioned. Color confirmation now requires both authoritative evidence and a literal inbound mention. | Schema regression plus Q002/Q003. This does not mutate a cart. |

Complexity delta: reuse the existing producer, core, composer and ownership
boundary. No second state machine, durable status, migration or release gate.
The opt-in Luna harness uses existing runtime ports and writes local artifacts.

## Frozen DEV70 — full histories, real Luna

- Code: `333ad08b39888aa50ca9a649ef7bfc6c63d02457`.
- Model: GPT-6 Luna, medium; Strategist and Responder use the actual model.
- Frozen benchmark: R2.9, unchanged. All 70 histories were attempted.
- Result: **68 guarded replies, 2 expected pre-model stale rejects, 133 model
  calls, zero CLI/guard failures**. No quality judge ran.
- Owner-local folder: `LUNA6_DEV70_C3_333ad08_20260923T135445Z` under the parent
  workspace. `case-records.json` preserves original histories, final C3 replies,
  canonical inputs, selected evidence and failure state. Per-stage files retain
  prompt, schema and actual model output. `conversation-history.md` contains all
  70 readable histories and replies; `sales-voice-review.md` reviews every case;
  `manifest.json` hashes these artifacts.
- This is the compiled shared core, not realtime transport. Four cart fixtures
  use synthetic current-cart data. The later production change is confined to
  realtime HUMAN ownership; DEV70 core behavior is unchanged, so this run is
  not relabeled as a later-HEAD execution.

The 105845f intermediate run had 60 completed replies, eight real failures and
two stale rejects. The a2b5ba0 run had 43 completed replies, 25 CLI failures and
two stale rejects. They remain debugging artifacts; neither is the final run.

## Conversation review

All 70 input histories and resulting replies were read, including the two
histories rejected before generation. Improvement is specific, not universal:

| Dimension | Observed improvement | Remaining problem |
|---|---|---|
| Initial voice | Q001–Q003 have one final `ạ`; Q003 confirms the mentioned black preference. | The reply still sounds like joined factual sentences. This is bounded editing, not natural free realization. |
| Price objection | Q014 does not ask again for the known 700k budget; Q017 does not turn a conditional 690k offer into commitment at 849k. | Q013/Q014/Q016 merely acknowledge and stop. Q015 repeats the known price and appends a vague uncertainty sentence. |
| Relevant value | Q054 selects the design matching the customer's stated preference. | The reply only lists `eo suông, tay lửng`; it does not connect those facts naturally to her preference or resolve the price concern. |
| Fit continuity | Q031/Q032 ask only for the missing height/waist. | Q034/Q036 cannot explain comfort from a generic M/L result. Q036 repeats `Dạ`; its goal knows the belly concern but the final sentence loses that subject. |
| Compound questions | Q046 keeps the out-of-stock answer and acknowledges an unresolved part. | `phần này` does not name the missing alternative. Q026/Q037/Q086 have the same vague limitation problem. |
| Delivery | Q067 no longer substitutes delivery duration for dispatch time. | Q062/Q063 do not directly resolve the deadline; Q064 repeats both `Dạ` and uncertainty already present in the ETA text. |
| Policy | Q071–Q077 retain conditions, amounts and alternatives with fewer repeated suffixes. | Some replies end abruptly; several still sound like a policy excerpt. |
| Checkout | Q092 asks canonical missing fields; Q091/Q095 do not treat a neutral acknowledgement as a fresh purchase. | Q096 proves only acknowledgement of a correction, not cart mutation. Q100 has no effect receipt and cannot prove closing. |

### Root-cause work still required

1. **Realization loses the strategy's subject.** The Strategist can describe the
   budget, prior experience or missing property, but bounded `answerText` reduces
   it to a generic acknowledgement/uncertainty. Give the response stage a
   grounded way to express that specific concern and limitation. Preserve all
   factual and transaction authority; do not solve this by adding seventy reply
   templates. Remaining duplicate openings belong to this composition boundary.
2. **Facts and executable steps are missing or not expressible.** Variant stock
   in Q043 has no supported output projection; deadline comparisons, alternative
   product retrieval and effect receipts need their actual typed inputs/actions.
   Q024/Q035/Q096 also have frozen-fixture authority mismatches. Keep the frozen
   set intact and prove improvements through producer/runtime holdouts.
3. **A relevant attribute is not automatically a sales argument.** Approved
   attributes from catalog/Sheets must reach C3 with provenance. The response
   may relate them to an explicit customer preference, but cannot invent
   comfort, quality, comparative superiority, discount or availability.
4. **Checkout success requires the requested cart.** The runtime must either
   perform a verified variant mutation and invalidate/rebuild the old preview,
   or preserve the handoff and stop bot checkout. The latter is now enforced;
   automatic M-to-L editing is still missing in the realtime adapter.
5. **Legacy fact selection can override adaptive intent.** `Giá hơi cao` is
   classified as a price request by the old keyword path; its baseline PRICE
   then becomes mandatory for C3. A relevant acknowledgement/limitation is
   rejected and the old price card returns. Correct request-versus-objection
   interpretation and the scope of required facts together, while retaining
   factual validation and protected commerce output. Do not simply disable
   baseline-fact preservation to make the run green.
6. **Initial checkout wording has an older policy mismatch.** The SalesCycle
   cart-open template always offers COD or transfer, while canonical follow-up
   correctly asks only COD when bank policy is absent. Unify that wording with
   executable payment options; the frozen r31.3 historical baseline must remain
   intact and any deliberate behavior delta must be documented.

## Runtime evidence scope

The opt-in `track-c-c3-luna-runtime-smoke.test.ts` runs nine synthetic journeys
(29 turns) through `RealtimeRunner.processOne`. Histories accumulate between
turns; artifacts retain the history window actually sent to each C3 stage,
both model calls, fallback reasons, pre/post conversation and commerce state,
and the exact proposed commit/outgoing payload. Luna uses a clearly recorded
test-only provider-identity adapter; the production model pin stays Gemini.

All business ports, commits and delivery ports are in memory. Baseline intent
extraction is a deterministic test double, not Luna. There is no real Outbox
sender, database CAS exercise, remote catalog lookup or order placement. A
proposed commit is not evidence that the production transaction would accept
it. Existing transaction/authority tests and CI cover their own boundaries.

At `333ad08`, all 40 C3 stage calls completed: 18 turns selected C3, two fell
back under baseline-fact preservation and nine did not call C3. The size-edit
journey **failed**: M stayed in the cart. It also exposed the ownership bug:
after HUMAN handoff, later checkout turns reached PURCHASE_CONFIRMED with M.
The second journey reached PURCHASE_CONFIRMED with its requested M. Neither
state alone establishes good objection handling or conversion.

The initial harness omitted `readCatalogSnapshot` and typed attributes. Its
material/color limits cannot be generalized to a correctly fed production
catalog. The follow-up harness supplies a synthetic V3 snapshot and
`buildProductAttributesV1` output, so the actual catalog-to-ProductFactsV2-to-C3
producer is exercised. It adds no invented sales benefit, size chart, deadline
or alternative-product evidence.

Early harness runs also had an executable-versus-JavaScript CLI invocation
error, price expiry beyond the permitted freshness window, and synthetic
future timestamps. Those runs are retained as invalid harness evidence, not
counted as model-quality failures. The corrected run uses actual turn time,
48-hour price authority and the proper CLI invocation.

### Corrected ownership and canonical catalog runs

`LUNA6_RUNTIME_F7792D3_20260923` reran all nine journeys on ownership-fix code
`f7792d3fd01598279b22ba8031f61c204fb9deb4`. All 40 Luna calls completed. The
four HUMAN-owned turns preserved commerce and produced no bot reply; the
previous three ownership violations disappeared. The size-edit journey stayed
at CART_OPEN, while ordinary checkout reached PURCHASE_CONFIRMED. The
automatic size-edit acceptance test remained red as intended.

`LUNA6_RUNTIME_F33875F_CATALOG_20260924` then ran all nine journeys / 29 turns
at `f33875fc6072a44f014ca928a92aa899dd15cb72` with the canonical catalog
fixture. All 40 Luna stage calls completed: 18 C3-selected turns, two
baseline-fact fallbacks and nine turns without C3. The first Strategist input
contains canonical cotton/color attributes and M/L variants. All 11 recorded
source fingerprints matched the working tree after the run.

The material turn now answers `Dạ mẫu này có chất liệu cotton.` instead of
claiming the material cannot be confirmed. Current-cart shipping answers 30k.
After name/phone/address, only COD is requested; COD creates the preview and
the subsequent explicit confirmation reaches PURCHASE_CONFIRMED with M.
The size-edit journey still hands off, keeps M, and stops all subsequent bot
commerce advancement. Its failed acceptance is retained, not marked passed.
This verifies the ownership repair and canonical catalog/checkout path, but
does not prove successful automatic variant editing.

All resulting runtime conversations were read. Budget, comparison and prior
experience turns still stop at generic acknowledgement. The lack of an
authoritative size chart and pre-checkout ETA remains explicit in this fixture.
Supplying material evidence fixes the material answer but does not by itself
make those conversations persuasive. The price/offer follow-up and price
objection still hit baseline-fact fallback. No conversion claim is warranted.

Both final folders contain `conversation-history.md`, `review-summary.json`,
raw model and state evidence, and `manifest.json`. Core artifact SHA-256:

- DEV70 `case-records.json`:
  `403e22e9657bd004084a708f0ae078671e2f878c2029a5bc3f0de2fb8dee3b25`.
- Catalog runtime `runtime-smoke-artifacts.json`:
  `31588f380cac6eab84f13a119799072064e27d9f043dedd59dbed2e2ece0d484`.

The subsequent documentation commit does not change runtime code or these
fingerprints. Exact final draft HEAD and its CI readback are recorded in PR
#374; the model runs keep their actual source commits above.

## Local and remote verification

- 338 focused tests passed: 200 C3 tests and 138 runtime/SalesCycle/reply tests;
  the network-backed Luna acceptance test is opt-in and skipped in ordinary CI.
- Worker TypeScript compilation and `git diff --check` passed.
- Full CI passed on code `333ad08`: GitHub Actions run `35870449990`.
- Full CI passed on ownership-fix code `f7792d3`: run `35892432796`.
- Runtime acceptance remains separate from CI. A red size-edit journey is not
  hidden by the default skip or reclassified as a successful sale.
