# PR375 implementation: customer input and current-cart boundaries

Status: implementation in progress; this amendment does not close PR375 P00–P12.
Base: PR375 merge `7c1f10f2a27db2b6258581f21955d1bc62681821` on
`codex/c3-runtime-canonical-integration`. PR376 is closed and is not an ancestor
of this implementation branch.

## Owning boundaries

1. Trusted ownership, tags, event ordering, kill switch and admission precede
   model extraction. On the opt-in C3 lane, `REALTIME_CUSTOMER_INPUT_V1` reads
   current text and pre-turn state. It returns only the current message's delta.
2. Typed product/route/variant/preference/recipient inputs are source checked.
   The consumer does not select a queried size as the chosen size. Private
   checkout values are captured from the latest text, with role interpreted by
   the producer and format/source validated by code. History resolves references;
   it cannot authorize replaying an old edit or recipient value.
3. Canonical buying intent remains `authorization: NONE`. The new contributor
   `SOURCE_BOUND_CUSTOMER_INPUT` distinguishes this validated producer from a
   legacy model proposal. It may supply customer-request semantics to existing
   effect readiness; it does not replace POS freshness, product/offer/quantity,
   policy, cart state, revision, CAS or atomic receipt checks. Untyped model-only
   evidence remains blocked. Semantic misclassification remains a model risk
   requiring positive and negative runtime evaluation, not something span checks
   can prove. Quantities above one currently require the existing explicit
   numeric quantity parser; word-only quantities are a documented limitation.
4. C3 Strategist keeps its existing six-field strategy contract. A typed lane
   uses the extracted fact request through the existing fact assembler instead
   of calling the legacy proposal model to reinterpret it. The fixed first
   quotation is preserved. Commerce-owned previews/confirmation wording and some
   compatibility branches remain to be migrated; this is not full ownership closure.
5. Current cart readback is available independently of whether a policy or
   commerce transition branch ran. C3 accepts it only for the current message,
   pre-turn revisions, exact cart hash/version and freshness interval. Existing
   readiness is reused; no new store, operator or activation gate is introduced.
6. DRY_RUN records a validated/rejected C3 candidate separately from outbound
   selection. Candidate text is redacted in decision telemetry. No Meta plan is
   created by DRY_RUN. The server's existing local-test flag composes the typed
   lane; live activation remains outside this task.
7. Invalid extraction may be repaired once. Exhaustion/provider failure cannot
   mutate commerce state and cannot become a permanent inbox failure solely for
   schema invalidity. Neutral input allows verified quote facts to survive;
   quality of all other fallback responses remains an open acceptance item.

## Evidence and intentional deviations

- Legacy C3-off tests remain unchanged except source/revision identities in two
  cart fixtures, corrected to match their actual input messages and revisions.
- Added controls cover selected M with a separate S question; COD with Hội An;
  field-label rejection; fabricated quantity; product mismatch; stale source
  spans; bounded repair; current budget in the same-turn Strategist prompt;
  typed DRY_RUN with no outbound plan; and readiness with missing/stale/wrong
  product/quantity/action facts.
- The Luna runtime harness calls the real extractor and C3 through its test-only
  provider adapter. Any unexpected legacy proposal/grounding call throws. Full
  prompts, raw outputs, histories, state, fake commits and delivery acceptance
  are retained outside the repository. Business ports remain synthetic.
- Runtime r1 failed because the model returned invalid buying action combinations
  and replayed prior-turn inputs. Runtime r2 reached purchase confirmation but
  silently missed a shipping question. Neither is accepted as sales-quality pass.
  The assertion now checks every expected reply and unexpected C3 fallback.

## Outstanding plan work

### Follow-up boundaries (29 September)

- The server composition test now imports `realtime-server.ts`, retains the BF
  wrappers, replaces external IO and executes one actual runner turn. ON/OFF/HUMAN
  controls prove DRY_RUN candidate observability and no outbound plan. This is
  process composition evidence with scripted model transport, not a live service.
- Cart claims lacking an independently matched current-cart snapshot are omitted
  from selectable evidence before either model sees their values. They are not
  labelled merely as unsupported wording. This closes an observed goal/prose
  leak while retaining valid bound cart claims and independent product facts.
- Code-owned payment requests enumerate only allowed methods and request the
  customer's choice; they do not treat COD as missing recipient data. Conditional
  inspection policy no longer promises a lookup that the runtime cannot perform.
- The stage evaluator attaches error handling to both concurrent judge calls
  immediately. A faster Strategist error previously terminated the process while
  the evaluator was awaiting Responder; it now propagates as a case error.
- The server's Redis search wrapper now forwards the rejected product ID to
  the existing text search service. Previously the service implemented exclusion
  but the production composition silently dropped it. Real-service composition
  controls cover another match and no result, including exact-code lookup.
  This does not yet implement budget filtering or multi-product comparison.
- Typed text product selection/search/rejection now precedes legacy code scanning.
  An explicit rejected code cannot reselect itself; failed search clears obsolete
  current product/variant/clarification state without touching the separate cart.
  Server tests cover alternatives, no result and an adapter ignoring exclusion.
  Multi-fact references retain the existing bounded lookup. Media/URL semantic
  resolution still has legacy branches and is not covered by this text slice.
- In LIVE C3, if the Strategist selected supported evidence and the Responder's
  final answer fails validation, the runtime may recompile only those selected
  code facts. Recovery is unavailable for ACKNOWLEDGE, unresolved/partial
  evidence, checkout/customer requests or effects. Telemetry labels
  `C3_SELECTED_FACTS_RECOVERY` and preserves the original guard reasons. Frozen
  evaluation remains a rejection. This protects the verified delivery fee from
  disappearing after an unrelated size-prose false positive; it does not turn
  the prose into an accepted answer or clear the guard defect.
- Luna runtime at `e76a9667` re-ran the complete size-edit/checkout journey:
  7 turns, 13 model calls, L remained selected, fee 30.000đ answered, final
  state `PURCHASE_CONFIRMED`. In this run commerce answered the fee directly.
  `C3_RECOVERY` at the actual server entrypoint separately injects an unauthorized
  XL fit claim and confirms the candidate is rejected then recovered to the
  already selected verified price with the guard reason retained. Both use fake
  business/runtime ports and DRY_RUN; no outbound send.
- CI at `e76a9667` exposed a stale evaluator fingerprint after the concurrent
  promise fix. The manifest now pins evaluator blob `731a9029` and quality-harness
  fingerprint `633d96fc2557bb1853ea01a30ab1ab133b2234d5d0a6e983c234730e7159e9b2`.
  DEV70/holdout content, bundle facts, rubric and scoring thresholds are unchanged.
- A finite two-sided guard experiment at `5596631d` exposed five defects in twelve
  controls, including both false positives and false negatives. See
  `tasks/evidence/pr377-guard-finite-review.md`. Arbitrary factual prose is not
  newly authorized; remaining guard/editorial acceptance stays open.

- A typed UNCLEAR/REJECT purchase-confirmation result cannot be overridden by a
  legacy positive acknowledgement. A typed positive still requires the existing
  deterministic confirmation authority and current-cart checks. This is a
  conservative compatibility constraint, not complete semantic confirmation coverage.
- Provider failure skips commerce and C3 generation; verified facts survive and
  an admitted request without facts receives a recoverable retry response.
- C3 failure diagnostics retain registered production-guard reason codes. The
  harness preserves each attempt separately and records candidate selection from
  runtime decision telemetry rather than counting a Responder call as acceptance.
- Catalog tests cover registry/XML producer, serialized index payload, adapter
  readback and C3 selection for approved/unknown/unapproved material. The index
  HTTP transport is simulated. This is not a real isolated Qdrant collection or
  a measurement of current catalog coverage; P02 remains open.
- Runtime r3 at `fa8024b30444401903c605ccbd81b8e88dbe34b8` answered shipping from the
  edited size-L cart. Luna provider quota failed at the final confirmation and
  subsequent journey. It is incomplete evidence, not a sales-quality pass.

Remaining: P00 corrected-finding integration and Luna DEV70 judging; P02 isolated real producer/index
readback coverage; P03/P04 guard editorial experiment and two-sided factual
controls; remaining P06 consumer/confirmation/cart wording ownership; P07 sales
objections/tone; P08 retrieval/comparison; P09 long-history recovery; P10 full
failure telemetry/fallback coverage; P11 full frozen DEV70 plus branched real-model
runtime evaluation; P12 exact-head evidence/CI and residual report. See
`tasks/plan.md` and `tasks/todo.md`; no whole P task is closed by this slice.

Complexity delta: one bounded input producer, an additional contributor enum on
the existing evidence contract, and reuse of cart readback outside transition
branches. No deployment, live data write, routing switch or migration.
