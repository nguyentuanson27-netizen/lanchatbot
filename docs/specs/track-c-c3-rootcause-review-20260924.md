# C3 root-cause review — 2026-09-24

Starting HEAD: `7c6623a4f4a4b3575e55ba4255f312c51e06241e` (clean tree).
Draft PR: #374. Reviewed PR371 ancestry is retained. No deployment, traffic,
customer send or live data mutation is part of this work.

## Findings and changes

| Observed problem | Owning cause | Correction |
| --- | --- | --- |
| Fit strategy lacks available size evidence | `buildRealtimeC3Input` hardcoded `sizeClaim: null`, dropping the verified runtime recommendation | Forward the existing claim through the same product/freshness/provenance boundary |
| Advisory fit cannot ask for needed measurements before purchase | Canonical measurement barrier derived only from commerce stage | Recompute an ephemeral barrier from the current fit request's verified Size Engine `ASK_MORE`, without advancing commerce |
| Non-checkout clarification appears as missing checkout details | Context producer treated every clarification reason as checkout | Require `CHECKOUT_DETAILS_MISSING`; retain downstream current-cart/stage/commitment checks |
| Prior-experience question lands in `answerText` and leaves empty progression | Two writable prose fields compete for a question-only task | No-fact ASK has one authored body in `progressionText`; schema and compiler agree |
| Q046 drops the requested alternative; Q054 gives an isolated attribute | The preface/null instructions compete with partial coverage and customer context | Require the writer to read all requested parts of the goal; `SUPPORTED` does not imply complete coverage; allow grounded customer context without inventing a benefit |
| Useful qualification gets suppressed | “Executable with current evidence” was interpreted as knowing relevance before learning the customer's criterion | Clarify that qualification may establish relevance; retain the prohibition on promising unavailable facts/effects |

These are general producer and task-contract changes. DEV70 inputs, expected
results and first-contact quotation templates are not rewritten. No adaptive
sentence bank or case-specific response rule is added.

## Evidence and its limits

The review uses the retained full DEV70 histories and nine realtime journeys
listed in `track-c-c3-natural-response-evidence-20260924.md`. A crucial correction
to the prior diagnosis: that Luna runtime fit journey has an empty size-chart
catalog and customer profiles disabled. Missing measurements are not its only
missing prerequisite. Widening `ASK_MEASUREMENTS` for every product would violate
the spec and hide this source gap.

Regression coverage runs through `RealtimeRunner.processOne`, the real producer,
canonical context, both C3 stages, final guard and proposed outgoing payload,
using in-memory ports and deterministic model outputs. Cases cover:

- Verified chart + missing measurement: one authored request, same commerce
  stage/revision, no cart, same blocker in capture.
- Verified chart + sufficient measurements: Size Engine recommendation reaches
  selectable evidence and the final protected reply.
- No chart and unrelated preference: no measurement permission.
- Free prose remains authored, while invented facts, effects, PII and duplicate
  requests remain rejected; invalid C3 retains the verified runtime fallback.
- Fixed first-contact, current-cart checkout and C3-off r31.3 differential paths.

The focused verification log is retained outside the repo as
`c3-rootcause-regression.log`. Exact commit, CI run, fresh Luna run directory and
measured results are recorded in the draft PR handoff after execution. Full
Luna input/output histories are retained outside source control; no credentials
are included. Model generations, guard acceptance and human quality review must
be reported separately.

## Still required for sales smoke acceptance

1. Review fresh Luna output for partial-answer coverage, relevant next questions,
   natural em/chị wording and repeated courtesy markers. Prompt instructions and
   passing schema do not certify these outcomes.
2. The prose guard remains heuristic, with known false positives/negatives. This
   change does not add new keyword exemptions or claim semantic completeness.
3. Current Size Engine recommendation basis does not by itself resolve every
   body-part-specific fit concern. Do not request data that an available chart
   cannot use or claim a body-profile estimate proves a particular waist fit.
4. Automatic M-to-L cart editing, initial payment-option consistency and missing
   media/alternative/variant capabilities remain disclosed gaps from the prior
   runtime evaluation. Response wording cannot supply those effects or sources.

Status: candidate for controlled offline evaluation and review; no claim of
readiness for customer traffic. Complexity delta is optional producer inputs
and one task-shape restriction, reusing existing claims, barriers and validators;
no new durable workflow, approval layer or operational gate.

## Actual Luna follow-up on 304e214

The full run completed without quota failures: 70 records, 55 guarded replies,
13 final-guard rejections, 2 expected stale preflight rejections; 133 actual Luna
stage calls. These are execution counts, not sales-quality scores. Retained at
`LUNA6_DEV70_C3_304e214_20260924T091647Z`.

Nine realtime journeys / 29 turns also completed and are retained at
`LUNA6_RUNTIME_304E214_ROOTCAUSE_20260924`. The size-edit acceptance remains RED:
the cart stays open after handoff. Ordinary checkout reaches confirmation.
The prior-experience follow-up now produces one relevant question, but several
objections still terminate in empathy or source limitations. New evidence also
exposed two boundary defects requiring correction before another evaluation:

- A price concern mentioning a product code before `kỹ` was interpreted as
  money: ASCII `k\b` matches the beginning of the Vietnamese word. Money units
  now require a Unicode token boundary. The bare-price keyword fallback also
  excludes whole verified catalog identifiers, while currency-bearing amounts
  are still parsed from the original text. No response phrase is allowlisted;
  regression cases retain rejection of invented amounts and unknown identifiers.
- A fit question without canonical measurement permission was labeled ordinary
  `ASK SIZE`, then realized as a waist measurement request. The existing compiler
  now rejects `SIZE_FIT` without supporting evidence combined with `ASK SIZE`.
  `SIZE` still means a purchase size selection; measurement requests retain
  their canonical permission path. This typed check does not claim to detect
  every possible semantic mislabeling in unrestricted prose.

Final code HEAD and the second fresh Luna evaluation are recorded in the PR
handoff. The 304e214 outputs remain intact and are not relabeled as final-HEAD
results. A higher completion count alone cannot establish improved selling.

## Delivery evidence: code 38e3d94

Code commit: `38e3d94f11833bc63b43ecf7287346da2442f078`.
**465 focused tests pass**, worker TypeScript build passes. Exact code HEAD full
CI passes: https://github.com/nguyentuanson27-netizen/lanchatbot/actions/runs/35981104526.
The subsequent delivery commit changes evidence documents only; its exact HEAD
CI is linked in draft PR #374. No final-model result is attributed to a different
code snapshot.

| Actual evaluation | Guarded replies | Post-generation rejects | Provider-missing cases | Expected stale rejects | Completed / failed model stages |
| --- | ---: | ---: | ---: | ---: | ---: |
| DEV70, 304e214 | 55 | 13 | 0 | 2 | 133 / 0 |
| DEV70, 38e3d94 | 24 | 8 | 36 | 2 | 64 / 36 |

Final DEV70 directory: `LUNA6_DEV70_C3_38e3d94_20260924T092533Z`.
The Luna agent ran both model evaluations, then itself hit the provider usage
limit. Root read all 70 histories and every available decision/raw/final output
from both runs and completed 70 individual review notes in `sales-voice-review.md`.
No output exists for the 36 failed DEV stages, so they have no language-quality
assessment. The DEV runner retained exit code 1 but discarded stderr; quota is
confirmed in concurrent runtime stderr and the Luna agent failure, not proven
individually for every DEV failure. This logging limitation is disclosed rather
than inferring a successful generation or a per-case provider diagnosis. The provider reported retry at 21:07 local time. No alternate model
was substituted and no older reply fills a missing final-HEAD result.

Final runtime directory: `LUNA6_RUNTIME_38E3D94_ROOTCAUSE_20260924`.
All nine journeys / 29 turns ran: **9 C3 chosen, 11 fallback, 9 C3 not called**;
20 model stages completed and 10 failed on quota. Of the 11 fallbacks, one is a
real guard rejection and ten follow provider failures. The earlier 304e214 run
has 18 chosen, 2 fallback, 9 not called and all 40 stages completed. These runs
cannot be compared as if both had complete provider output.

Both runtime runs retain the same RED size-edit sales acceptance: M-to-L hands
off and remains `CART_OPEN`. Subsequent HUMAN-owned turns do not mutate the cart.
Ordinary checkout reaches `PURCHASE_CONFIRMED`, partly through deterministic
fallback in the final run; that is not proof of Luna's ability to close a sale.
Initial checkout still offers bank transfer when later policy permits only COD.

## Quality verdict after reading every conversation

**Not ready for customer sales smoke. No demonstrated overall sales improvement.**

- **First quote:** Q001–Q003 final replies retain the exact first-contact form in
  both runs, with one closing courtesy marker. No new adaptive templates exist.
- **Useful clarification:** Q004/Q007/Q031/Q032 produce specific single requests
  without repeating known inputs. The 304e214 prior-experience runtime follow-up
  asks which aspect was uncomfortable. Final-HEAD repetition of that journey is
  quota-blocked, so this is evidence on 304e214 only.
- **Partial answers:** Q046 on 304e214 now includes both out-of-stock and the
  absence of a verified alternative. Q054 connects the stated loose-cut preference
  to design evidence. Both still need final-HEAD model evidence; neither proves
  that the model can justify value or offer a real alternative.
- **Selling:** Q013/Q014/Q016 still mostly acknowledge hesitation. Q015 repeats
  price on a price objection. Missing approved value/alternative evidence can be
  a real source limitation, but an available material/color alone does not
  justify superiority, durability or value. Do not force irrelevant discovery
  questions to inflate progression counts.
- **Voice:** em/chị and fewer repeated ạ improve politeness rhythm, but “em ghi
  nhận”, “thông tin được xác nhận”, excessive product-code repetition and
  commentary about the conversation still sound administrative. Q011 drags an
  older stock concern into a direct price question. Q017 literally joins
  “giá ... vẫn là Giá hiện tại ...”; Q022 adds a redundant lead-in. These are
  valid-schema failures of composition and relevance.
- **Fact/prose boundary:** Q023/Q034/Q036/Q037/Q042 repeat facts in free prose
  and are rejected; Q026 has a topic-mention false positive. Q035/Q043 have
  uncertainty rejected by legacy claim detection. In the final runtime, a valid
  uncertainty about promotion is rejected and falls back to the old price card.
  The fallback loop is therefore reduced at one ownership boundary, not solved.
- **False negatives:** Q024 at 38e3d94 states negative freeship eligibility in
  GENERAL text although its current-cart realization is unavailable. Changing
  to “miễn phí vận chuyển” escapes the keyword guard. Q053/Q056/Q071 on 304e214
  also restate facts in GENERAL despite the prompt prohibition. Completion is
  not authority or semantic correctness. No additional phrase exceptions were
  added to make these cases pass.
- **Capability versus language:** exact variant stock, media, alternate products,
  comparative price realization and automatic cart size edits remain gaps.
  Q043/Q057/Q100 expose implementation terms to the customer; Q094 asks vaguely
  for “số đo cần thiết” instead of identifying the missing chart inputs.

## Remaining root-cause work, in priority order

1. **Complete source-to-task handoff.** Reuse existing Size Engine missing-input
   results, scoped variant facts and current-cart capabilities; pass the input
   actually needed for the current task. A boolean fit barrier grants permission
   but does not tell the writer which chart measurement is missing. Separate
   absent shop evidence from absent customer data. Verify new producers through
   realtime, with missing/wrong-scope/complete data as well as positive examples.
2. **Align authoring with final composition.** The writer must reason over the
   actual final, subject-labeled facts and the unresolved customer request. Current
   preface-then-facts composition encourages duplicated assertions and broken
   sentence joins. Keep exact factual authority and first quote; use freely
   authored complete conversational clauses, not sentence menus. A correct
   factual response should not need another factual claim in a GENERAL slot.
3. **Repair assertion classification at its owning boundary.** A mention of an
   offer/size is not necessarily its assertion, and a lexical synonym must not
   bypass authority. The current legacy keyword guard cannot prove this. Reuse
   typed claim/proposition boundaries, with contrastive checks for uncertainty,
   positive assertion, negative assertion, and source scope. Do not add a phrase
   whitelist, relax all GENERAL text, or count a wording workaround as a fix.
4. **Complete commerce behavior independently of the writer.** Size edits require
   canonical cart mutation/revalidation; every checkout request must derive
   payment options from the same policy. A natural sentence does not implement
   either operation. Retain HUMAN ownership and exact current-cart boundaries.
5. **Repeat model review once quota permits.** Fresh unchanged DEV70 and stateful
   runtime journeys on the candidate code, with all histories. Judge answer
   coverage, source correctness, useful next step and natural wording separately.
   Do not accept solely on schema, guard count, or one ordinary checkout success.

All four run folders, scripts and logs are retained in the owner workspace.
`C3_ROOTCAUSE_FULL_HISTORY_20260924.zip` contains the histories and per-file hash
manifest. Credentials and live customer data are excluded.
