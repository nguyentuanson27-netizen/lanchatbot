# Track C C3 V6 — directive plan role split (offline, draft)

Candidate `TRACK_C_C3_STRATEGIST_RESPONDER_V3`, prompt version `V6`.
Evaluation-only; independent of PR #357, which keeps tuning V5 prose in place.

## Problem

In V5 both passes carry the decision layer. The Strategist prompt and the
Responder prompt each contain the first-matching canonical rules, the objection
policy, the next-move policy and the fact-grounding rules, and the plan is
declared advisory: *"If the plan conflicts with those inputs or any existing
rule, ignore the plan."* The Responder therefore re-decides every turn from its
own copy of the rules, and nothing in the pipeline can tell whether it followed
the plan or overruled it.

Measured on the two DEV-70 runs at `b7cc233e` (same corpus, same rubric hash):

| Signal | flash-lite run | terra run |
| --- | --- | --- |
| plan `nextMove = NONE` → reply asks nothing | 51/51 | 56/56 |
| plan names a next move → reply ignores it | 10/11 | 10/12 |
| failures caused by exactly one stage | 15/20 | 7/7 |

The plan can forbid, never steer. Cases where the plan was right and the reply
was wrong (Q072, Q073 policy answers; Q013, Q016 price objections) still failed,
and cases where the plan was wrong but the reply recovered (Q007) failed anyway.

## Change

Strategist decides; Responder writes.

- Plan is a closed vocabulary: `rule`, `claimRefs`, `acknowledge`, `askFor`,
  `supportFacts`. No free-text field, so a plan cannot carry a factual value.
- `claimRefs` is enum-restricted at the provider schema to the references this
  request actually carries.
- Code derives `strategy`, `cta` and the required canonical segment pair from
  `rule`; the plan never states them, so plan and reply cannot disagree on shape.
- The Responder's `claimRef` enum is narrowed to the plan's selection: citing an
  unselected claim is a schema rejection, not a review finding.
- `assertTrackCV6PlanConformance` then proves the reply realises the plan: exact
  claim set, canonical segments, no effect claim, and a question only when
  `askFor` is not `NONE`.

Prompt style follows the same rule for both passes: short imperative lines,
closed vocabularies, no prose paragraphs, no sample replies. Strategist ~35
lines of decision vocabulary; Responder 15 lines with no decision rule in it.

## Scope

- `BEHAVIOR_SIMULATION` only. The production-contract guard path stays on V5.
- Not wired into C2 scoring. `track-c-c3-v5-benchmark-runner.ts` is a pinned
  bundle component, so that wiring needs a benchmark revision bump and lands
  separately.
- No runtime, deploy, persistence, delivery, corpus, rubric or gate change.
- No provider run yet: this is the mechanism, not evidence about it.

## Next

1. Run DEV-70 with the pinned generator, non-batched, V5 vs V6, judge fixed.
   That is the first controlled prompt comparison the programme can make.
2. Wire V6 into the C2 evaluator behind a benchmark revision bump.
3. Extend conformance to the production-contract lane.
