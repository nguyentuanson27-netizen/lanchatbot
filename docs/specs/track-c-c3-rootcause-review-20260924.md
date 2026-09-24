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
