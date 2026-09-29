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

P00 complete historical classification/judging; P02 isolated real producer/index
readback coverage; P03/P04 guard editorial experiment and two-sided factual
controls; remaining P06 consumer/confirmation/cart wording ownership; P07 sales
objections/tone; P08 retrieval/comparison; P09 long-history recovery; P10 full
failure telemetry/fallback coverage; P11 full frozen DEV70 plus branched real-model
runtime evaluation; P12 exact-head evidence/CI and residual report. See
`tasks/plan.md` and `tasks/todo.md`; no whole P task is closed by this slice.

Complexity delta: one bounded input producer, an additional contributor enum on
the existing evidence contract, and reuse of cart readback outside transition
branches. No deployment, live data write, routing switch or migration.
