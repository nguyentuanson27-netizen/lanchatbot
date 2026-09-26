# C3: authored follow-up response — evidence 2026-09-24

## Scope and source

Owner request: preserve the first-contact quote form, minimize response templates,
and fix underlying causes rather than matching DEV70 phrases. Draft PR #374
inherits reviewed PR371 `88a1ce41c00522b4e901f7c9b464108d120aa5de`.

Code commits in this slice:

- `1d803743f3564cb52c68df52559fff704122bc9e`: free adaptive prose and strategy
  ownership in realtime; fixed acquisition form retained.
- `015e577115ef4f2c23811c51b921bb0b2bd6ff78`: distinguish nonfactual preface from
  fact slots, trim prose whitespace, narrow promotion uncertainty handling.
- `1abb30f640a8e97fb73e488ef52b0d6b656e2e84`: accept polite requests without a
  question mark and unconfirmed freeship questions. **Latest code; no fresh
  complete Luna run at this commit because provider quota was exhausted.**

The delivery commit adds this evidence only. PR metadata identifies its exact
HEAD and CI run. No merge, deploy, traffic activation or live customer/data
mutation was performed.

## What changed and why

1. The previous adaptive response schema made the writer select sentence enums.
   It could not express the specific concern or remaining uncertainty described
   by the Strategist. Adaptive `answerText`/`progressionText` now allow authored
   prose. Adaptive question banks and compiler-inserted generic uncertainty were
   removed. The Strategist contract and two-stage division remain unchanged.
2. Realtime required every fact type selected by the legacy reply to appear in
   C3. A price objection could therefore fall back to a repeated price card even
   when C3 correctly chose no price. A successful validated adaptive strategy now
   owns evidence selection. Fixed first contact retains preservation checks;
   C3 failure still retains the already-built verified fallback. Integration
   tests exercise both success and invalid-prose fallback through `processOne`.
3. Free prose exposed existing guard assumptions: mentioning an unconfirmed
   promotion/freeship was treated as asserting an offer. Only narrowly bounded
   uncertainty clauses may pass those C3 keyword checks. Amounts, promises,
   separate positive offers and other guard failures remain rejected. This does
   not change the shared baseline guard or grant promotion authority.
4. A polite request does not require `?` in Vietnamese. The single progression
   slot remains exclusive, with obvious multiple-question punctuation rejected.
   This is not a proof of semantic request cardinality.

Factual text still uses bound projections with only courtesy edits. Arbitrary
factual paraphrase is **not** implemented. Checkout missing fields/payment
options remain code-owned. No new model judge, durable state or effect port was
added. Existing cart revision/hash, freshness and ownership boundaries remain.

## Verification

- 382 focused tests passed, worker TypeScript build passed. Includes C3,
  RealtimeRunner, SalesCycle, reply differential and r32.2 compatibility shield.
  The opt-in Luna runtime acceptance test is skipped in ordinary local/CI runs.
- Historical [CI at 015e577](https://github.com/nguyentuanson27-netizen/lanchatbot/actions/runs/35951877749)
  passed. This is not the final delivery HEAD; see current PR CI for that HEAD.
- Q001–Q003 fixed first-contact prompts and schemas match the prior 333ad08 run.
  In both new runs their actual replies also match. Trusted acquisition is still
  required; customer wording alone does not classify first contact.
- No frozen DEV70 fixtures or rubric were rewritten.

### Actual Luna executions

| Run | Case/turn outcomes | Model calls |
| --- | --- | --- |
| DEV70 at 1d80374 | 50 guarded replies; 18 post-model rejects; 2 expected stale preflight rejects | 133 completed |
| DEV70 at 015e577 | 46 guarded replies; 5 post-model rejects; 17 provider-quota failures; 2 expected stale rejects | 99 completed; 17 failed attempts |
| Runtime at 1d80374 | 9 journeys / 29 turns: 14 C3 selected, 6 fallback, 9 C3 not called | 40 completed |
| Runtime at 015e577 | 9 journeys / 29 turns: 15 C3 selected, 5 fallback, 9 C3 not called | 35 completed; 3 failed attempts |

These are execution counts, **not sales scores**. Do not combine earlier outputs
with quota-missing cases and call the newer run complete. After quota exhaustion
the runtime still traversed its fallback/checkout branches, but that is not
evidence of successful Luna generation on those turns.

Runtime used `RealtimeRunner.processOne` with persisted in-memory state,
synthetic canonical catalog/cart/policy inputs and real Luna generation for C3.
Baseline intent extraction and business/commit ports are test doubles. The
test-only provider identity adapter is recorded. No message sender or live
transaction is involved.

## Reading the conversations: voice and sales ability

All 70 input histories and all available raw/final outputs of both runs were
read; the owner-local report contains 70 individual notes. Seventeen latest-run
cases have no generated answer; their earlier-run observations are labelled.

- **First quote:** preserved. Price, useful product information and one color
  question compose one reply; repeated final `ạ` is removed. This requirement
  has concrete unchanged-input/output evidence for Q001–Q003.
- **Voice:** shorter and less repetitive. Q007 explains which product is
  unresolved; Q031 remembers weight and asks only height; Q032 asks waist after
  the customer already gave height/weight. However `em ghi nhận`/`chưa có thông
  tin xác nhận` remains overused, and product projections remain stiff.
- **Price objections:** Q013–Q016 mostly restate the concern. They neither invent
  benefits nor repeat the old price, but do little to help the decision. Q015
  loses the competitor/form comparison context. Q054 selects relevant design
  evidence but reads attributes without connecting them naturally to the stated
  preference. This is not adequate value explanation or proven conversion.
- **Incomplete answers:** Q046 answers sold-out status but drops the question
  about alternatives. Q026 states an existing cart offer without clarifying
  whether it is conditional on buying two. Q063 repeats ETA without resolving
  the customer's five-day decision. Guard success does not detect these losses.
- **Safety/contract gaps:** Q035/Q043 unconfirmed size/variant wording still
  encounters guard failures. Q036 repeats a source fact in the unbound preface
  and is correctly rejected under the current split. Q062's model-authored
  `không kịp` is stronger than “not guaranteed in time” and passes the heuristic
  prose guard. Thus free-prose semantic safety is **not proven**. Do not weaken
  guards to turn all failures into passing counts.
- **Continuation:** runtime comparison/budget responses often name a missing
  decision factor but ask no useful follow-up. The prior-experience turn at
  015e577 put its request in `answerText` with empty `progressionText`, causing
  rejection and an unhelpful fallback. This is model slot compliance, not a
  punctuation false positive.
- **Checkout:** ordinary synthetic checkout reaches `PURCHASE_CONFIRMED`;
  latest-run fee/payment steps include quota fallback. M-to-L edit still hands
  off and remains `CART_OPEN`. All four later HUMAN-owned turns preserve
  commerce state. Initial checkout still mentions transfer even when later
  canonical payment choices permit only COD. These are unresolved capabilities.

## Remaining work and acceptance

**Not accepted for customer traffic or live sales smoke.** Suitable for code
review and further controlled offline testing.

1. After provider quota returns, run unchanged DEV70 and all nine runtime
   journeys on the exact latest code HEAD with full histories. Do not substitute
   compiler replay or a different model for the requested Luna evaluation.
2. Fix the continuation decision where a missing, answerable customer input can
   enable a real next step. Preserve KEEP_OPEN when no executable next step
   exists; do not ask generic questions just to keep talking.
3. Resolve the prose/factual boundary for grounded explanations, uncertainty and
   partial answers without expanding sentence banks or adding semantic regex
   exemptions case by case. The current checks are conservative heuristics with
   observed false positives and false negatives, not a complete safety proof.
4. Complete the separately identified commerce/media/variant capabilities:
   canonical cart size edit, consistent initial payment options, exact variant
   stock realization, and media/alternative retrieval where authorized sources
   exist. Response wording alone cannot implement these effects or producers.

## Retained owner-local evidence

Under `C:\Users\nguye\Documents\Sản phẩm AI`:

- `LUNA6_DEV70_C3_1d80374_20260924T032227Z`
- `LUNA6_DEV70_C3_015e577_20260924T033231Z`
- `LUNA6_RUNTIME_1D80374_NATURAL_20260924`
- `LUNA6_RUNTIME_015E577_NATURAL_20260924`

Each retains input history, raw per-stage output, final accepted reply or failure,
and hashes. Runtime folders also retain before/after state and proposed outgoing
payload. `sales-voice-review.md` in the second DEV folder has fresh per-case
notes. Raw synthetic checkout histories are preserved; no service credential is
included. `C3_NATURAL_RESPONSE_FULL_HISTORY_20260924.zip` packages these folders,
the evaluation scripts and verification logs. Earlier evidence remains intact.
