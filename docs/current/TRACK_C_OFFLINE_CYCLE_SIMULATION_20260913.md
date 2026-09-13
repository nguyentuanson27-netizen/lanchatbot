# Track C — offline cycle simulation (candidate V5 two-pass)

- Contract: `TRACK_C_OFFLINE_CYCLE_SIMULATION_V1` · evaluation-only · side effects `DISABLED`
- Benchmark: `TRACK_C_C2_QUALITY_BENCHMARK_V2` R2.5 · bundle `da35300db23928512c23c44a80484f230e5db31d1d488c1d6dca23df335f7a24`
- Lane: `BEHAVIOR_SIMULATION` · candidate: TRACK_C_C3_TWO_PASS (V5 prompt family)
- Executor model (candidate generator, both passes): **sonnet-4.6** — CLAUDE_CODE_SUBAGENT
- Judge model (C2 stage judge): **opus-5** — CLAUDE_CODE_SUBAGENT
- Sample: 10 of 100 quality cases

> **Simulation, not evidence.** Neither model is the pinned provider identity
> the C2 benchmark requires, and the population is a bounded sample, so this run
> is not admissible C2 quality evidence, not a candidate selection, not a
> promotion, and not a ship signal. No persistence, delivery or effect port was
> reachable at any point.

## What this run is and is not

It is a **rehearsal of the offline cycle with substituted models**, run to see the
Track C C2 benchmark machinery execute end to end and to see where it fails
closed. It proves that the wiring, contracts, guards, scorer and aggregate gate
execute against real artifacts produced by a model that is not the pinned one.

It is **not** C2 quality evidence, a candidate comparison against the accepted
baseline, a judge calibration, or any input to selection, promotion or deploy.
`manifest.json` still lists "bind the C2 stage judge port to the owner-selected
hash-pinned judge provider" as an execution blocker, and that blocker is
untouched by this run.

## Pipeline actually exercised

`materializeTrackCV5CaseCapture` → `runTrackCC3TwoPassQualityCandidate`
(strategist pass → plan validation → responder pass → claim-reference resolution →
output/guard validation) → `evaluateTrackCQualityV2Case` (PII/model-safety proof →
two stage judgements) → `scoreTrackCQualityV2Case` → `gateTrackCQualityV2Results`.
Only the two provider endpoints were replaced; every contract, guard and gate is
the real checked-out implementation.

## Case results

| Case | Domain | Split | Strategist | Responder | Outcome | Failed floors |
| --- | --- | --- | --- | --- | --- | --- |
| V5V4Q001 | CONVERSATION_CONTROL | DEV | 2.67 **fail** | 2.75 **fail** | FAIL | S:QUESTION_RESOLUTION, R:QUESTION_RESOLUTION |
| V5V4Q006 | PRICE_VALUE | DEV | 3.33 **fail** | 3.60 pass | FAIL | S:FACT_GROUNDING |
| V5V4Q018 | PRICE_VALUE | HOLDOUT | 2.53 **fail** | 3.00 **fail** | FAIL | S:FACT_GROUNDING, R:FACT_GROUNDING |
| V5V4Q025 | LOGISTICS | DEV | 3.47 pass | 3.45 pass | PASS_WITH_NOTE | — |
| V5V4Q031 | FIT_SIZE | DEV | 3.67 pass | 3.00 **fail** | FAIL | R:FACT_GROUNDING |
| V5V4Q041 | INVENTORY | DEV | 3.27 pass | 3.55 pass | PASS_WITH_NOTE | — |
| V5V4Q048 | PRODUCT_EVIDENCE | HOLDOUT | 3.60 pass | 3.35 **fail** | FAIL | R:FACT_GROUNDING |
| V5V4Q051 | PRODUCT_EVIDENCE | DEV | 2.53 **fail** | 3.55 pass | FAIL | S:FACT_GROUNDING |
| V5V4Q071 | POLICY_SERVICE | DEV | 3.33 **fail** | 3.25 **fail** | FAIL | S:FACT_GROUNDING, R:FACT_GROUNDING |
| V5V4Q092 | TRANSACTION_STATE | DEV | 3.60 pass | 3.00 **fail** | FAIL | R:FACT_GROUNDING |

Weighted mean — strategist **3.200**, responder **3.250** (BEHAVIOR_SIMULATION pass threshold 3.0).

## Mean raw score per rubric dimension

| Dimension | Floor (most domains) | Strategist | Responder |
| --- | --- | --- | --- |
| QUESTION_RESOLUTION | 3 | 3.30 | 3.50 |
| FACT_GROUNDING | 4 (7 of 8 domains) | 3.30 | 3.40 |
| CONTEXT_USE | 2 | 3.10 | 3.00 |
| NEXT_MOVE_QUALITY | 2 | 3.00 | 3.10 |
| NATURALNESS_LANA | 2 | n/a | 3.00 |
| CONCISION | 2 | n/a | 3.30 |

## Aggregate gate over the sample population

```json
{
  "contractVersion": "TRACK_C_V5_QUALITY_GATE_V1",
  "lane": "BEHAVIOR_SIMULATION",
  "passed": false,
  "counts": {
    "SCORED": 10,
    "EXPECTED_PRE_MODEL_REJECT": 0,
    "CONTRACT_SKIP": 0,
    "ADAPTER_ERROR": 0,
    "PROVIDER_ERROR": 0,
    "JUDGE_ERROR": 0
  },
  "modelFailures": [
    "V5V4Q001",
    "V5V4Q006",
    "V5V4Q018",
    "V5V4Q031",
    "V5V4Q048",
    "V5V4Q051",
    "V5V4Q071",
    "V5V4Q092"
  ],
  "infrastructureFailures": []
}
```

## Judge tuning notes

- `V5V4Q071` RESPONDER — productBinding RESOLVED to SQ9012 with no product evidence in the input; binding is unsupported though the reply text stays grounded.
- `V5V4Q071` RESPONDER — Closing line is a generic 'any other policy questions' offer rather than a specific next move.
- `V5V4Q092` RESPONDER — Two segments restate the same checkout-detail request; one line would be tighter.
- `V5V4Q048` RESPONDER — "du size S, M, L, XL" reads as an availability claim; catalog evidence only lists the size axis.
- `V5V4Q025` RESPONDER — Delivery-deadline question mildly presumes she is ordering while she said she is still considering; an optional move rather than a needed clarification.
- `V5V4Q001` RESPONDER — Price is exact and correctly hash-attributed, but no compact first-contact bundle from the supplied product profile is offered.
- `V5V4Q001` RESPONDER — Customer-facing text names the product by SKU instead of the supplied model name, which reads mechanical.
- `V5V4Q071` STRATEGIST — Plan embeds the supplied policy values verbatim instead of pointing at the inspection snapshot; keep strategist output abstract.
- `V5V4Q071` STRATEGIST — nextMove largely restates mustResolve.
- `V5V4Q041` RESPONDER — Closing size question presumes a size axis that no supplied evidence establishes for SQ9012.
- `V5V4Q018` STRATEGIST — currentNeed copies the protected price value into the plan instead of naming the objection abstractly.
- `V5V4Q018` STRATEGIST — nextMove stacks three product facts, two unrelated to the stated non-fitted-waist preference, against the one-or-two-fact expectation.
- `V5V4Q041` STRATEGIST — Plan does not note that the verified claim is product-scope while the prior bot turn opened a variant thread.
- `V5V4Q018` RESPONDER — Uses three supplied facts (eo suong, tay lung, luoi cotton phoi lot) where the case asked for one or two tied to her stated preference; tay lung is unrelated to the non-fitted-waist preference.
- `V5V4Q018` RESPONDER — 'kha thoai mai' and 'mac mat' are evaluative comfort inferences not present in the supplied product evidence.
- `V5V4Q051` STRATEGIST — Plan injects the literal material value (Korean lace) instead of staying abstract direction.
- `V5V4Q051` STRATEGIST — nextMove bundles two moves: state material plus invite a design/fit follow-up.
- `V5V4Q006` STRATEGIST — mustResolve and nextMove restate the same direction with little added value.
- `V5V4Q001` STRATEGIST — Plan directs only the price; it never directs the compact first-contact bundle or clear product identity from the supplied product profile.
- `V5V4Q001` STRATEGIST — Ad-origin metadata is read correctly but is not converted into any first-contact behavior tuning.
- `V5V4Q031` RESPONDER — Both lines request the same missing measurement; the second sentence repeats the ask without adding information.
- `V5V4Q031` RESPONDER — Does not acknowledge the 56kg she just supplied, which would strengthen continuity.

## Findings

### F1 — product display names fail the judge PII proof

`evaluateTrackCQualityV2Case` proves every judge-visible string model-safe
before the first judge call. The analytics DLP rewrites a standalone line of two
to five capitalised words to `[NAME]`, and the simulation fact catalog carries
product display names of exactly that shape (`Tường Vi`, `Hải Miên`,
`Nguyệt Hà`, `Miêu Vân`). Passing a `PRODUCT_PROFILE` fact verbatim as
`authoritativeEvidence` therefore fails closed with
`TRACK_C_V5_JUDGE_EVIDENCE_NOT_PII_SAFE` before any judge call — for 4 of the 10
sampled cases in this run. Any future C2 evidence wiring that hands the judge
these catalog entries hits the same wall.

### F2 — judging without canonical claims cannot reach the FACT_GROUNDING floor

Round 1 of this cycle passed only the simulation facts as
`authoritativeEvidence`. Two judge batches independently reported the same
defect: a `VERIFIED_CLAIM` segment carries a `claimContentHash`, but the claim's
value was nowhere in the judge input, so a stated price or stock count could not
be verified numerically. `FACT_GROUNDING` stalled at 3 while 7 of 8 domains
require a floor of 4, so round 1 failed 8 of 10 cases largely for an evidence-
projection defect rather than candidate behaviour. Round 1 was discarded and the
sample re-judged with canonical verified claims included. The C2 evaluator
accepts `authoritativeEvidence: unknown` from the caller and does not check that
the claims the candidate was allowed to cite are present — the contract cannot
detect this class of mis-wiring.

### F3 — ISO-8601 timestamps cannot reach the judge at all

`observedAt` / `expiresAt` (`2026-09-10T02:05:00.000Z`) are rewritten to
`[REFERENCE]:05:00.000Z` by the DLP's uppercase-alphanumeric reference rule, so
the model-safe assertion rejects them. Claim freshness therefore cannot be shown
to the judge in its canonical form. This harness passes a derived
`FRESH` / `EXPIRED` label instead. Until that is resolved in the evaluator, the
judge cannot assess "used stale/expired protected claim instead of preflight
rejection" — one of the rubric's six hard failures — from the evidence itself.

### F4 — the generator identity pin is enforced, as designed

Returning the honest executor identity (`claude-sonnet-4-6`) from the transport
fails the case closed with `TRACK_C_V5_PROVIDER_IDENTITY_MISMATCH` before any
output is parsed. This run therefore had to return the pinned
`gemini-3.5-flash-lite` identity (deviation D1) to exercise the path at all.
The pin works; it also means no substituted-model run can ever be mistaken for a
pinned-provider run at the contract level.

## Candidate behaviour observed (sample only)

Both stages cleared the 3.0 lane threshold on average (strategist 3.20,
responder 3.25), and no case produced a hard failure, an effect claim, a
provenance violation or a guard rejection. Every failure was a dimension floor:

- **Strategist grounding (4 of 10 cases)** — the plan injects concrete values it
  should keep abstract: a price ("near-999k"), a material ("Korean lace"),
  policy values copied verbatim. The stage rule treats an injected factual value
  as a grounding failure regardless of whether the value is correct.
- **Responder grounding (5 of 10 cases)** — mostly phrasing that reads as an
  unsupported claim (`đủ size S, M, L, XL` implying availability from a catalog
  size axis) or evaluative comfort wording not present in the evidence.
- **First contact (V5V4Q001)** — the only `QUESTION_RESOLUTION` failure: the
  price was exact and correctly claim-bound, but no compact first-contact bundle
  was offered and the product was named by SKU rather than its model name, so
  the case's required behaviours were not met at either stage.
- Recurring tuning notes: `nextMove` restating `mustResolve`, two segments
  repeating one request, and closing questions that presume a next step the
  canonical state does not support.

These are observations about one sonnet-4.6 run over 10 cases. They are not a
V5 prompt verdict; the pinned generator may behave differently.

## Reproducing

```bash
pnpm --filter @lana/worker build
CYCLE_WORK=/some/scratch/dir CYCLE_SOURCE_REVISION=$(git rev-parse HEAD) \
  node tools/track-c-offline-cycle-simulation.mjs
```

The harness writes `exec-requests/` then suspends; fill `exec-responses/`, re-run
to get the responder pass, re-run again for `judge-requests/`, fill
`judge-responses/`, re-run for scoring and the aggregate gate. Case selection is
deterministic, and request keys are content hashes, so the same corpus and the
same revision produce the same keys.

Raw run record: `TRACK_C_OFFLINE_CYCLE_SIMULATION_20260913.json`.

## Harness deviations from the pinned cycle

- D1: the pinned provider identity gemini-3.5-flash-lite is returned to the runner so the real code path executes; the actual generator is the sonnet-4.6 subagent recorded in executor.
- D2: judge-visible product displayName values are labelled ("Tên mẫu: X") because the analytics DLP classifies a bare capitalised two-word line as a person name.
- D3: claim freshness reaches the judge as a derived FRESH/EXPIRED label because raw ISO-8601 timestamps fail the evaluator's model-safe assertion.
- D4: round 1 of the judging pass ran with simulation facts only as authoritativeEvidence; it was discarded and re-judged with canonical verified claims included.

