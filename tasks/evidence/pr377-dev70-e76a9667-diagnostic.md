# PR377 Luna DEV70 at `e76a96671c9e019c73240356602b7c19cabd2cf0`

Generator: GPT-6 Luna, medium. Frozen R2.9 DEV70 fixtures unchanged. Full
history, prompt, raw stage outputs and code reply/error are retained outside the
repository at `LUNA6_DEV70_C3_e76a966_20260929T142850Z/case-records.json`.
The registered evaluator source/rubric is unchanged from its pinned fingerprint
at this source, and every candidate replay must match the cached reply. Rubric
file SHA-256 `54437743f5e135f123e17c0de5a71fa5061c6eb54782defdd7bb3f70bd4aabf5`;
canonical rubric hash `60960a535a34fdc0296e58fc8c58a983c4bbaad522439e004fe4eb2b38b821a3`.

Generation counts: **52 completed Luna candidates, 16 generator/guard failures,
2 expected pre-model rejects**. These are execution outcomes, not quality
scores. The full output set and histories are retained in the external run
bundle.

Production guard failures:

- Promotion: Q017 proposed accepting 690.000đ with no authorized discount;
  Q021 asked whether extra discount exists but entered an unsupported promotion
  statement; Q026 correctly selected a 100.000đ cart promotion, while prose
  separately preserved the limitation about exact two-item eligibility and the
  guard still rejected the answer. This includes an important false positive.
- Size prose: Q033/Q034 gave fit advice from existing size-engine evidence but
  guard rejected it; Q035/Q036/Q037 contained explicit safe uncertainty around
  an unverified fit; Q043 included size/stock safe uncertainty; Q086 described
  a permitted split-size set; Q096 acknowledged a size correction; Q100 said
  checkout could not be concluded from the current context. This group mixes
  true positives and false positives; do not treat the reason code alone as
  proof of a false claim.
- Inventory/ETA: Q041 failed stock; Q046 answered unavailable similar-product
  evidence; Q063 said expected shipping days do not guarantee an exact delivery
  date. These outputs were blocked, not accepted claims.
- Contract: Q081 comparison prose did not use a bound factual realization.
- Q027 and Q066 were expected stale-capture rejections before provider call.

Accepted outputs reviewed include Q001–003 holding the fixed initial quote but
re-asking already given color at Q003; Q013–016 acknowledging price objections
without a useful next step; Q024 stating no free-shipping confirmation while
evidence lacks current cart binding (automated judge previously missed this);
Q046 alternative lookup is absent because it is blocked; Q051 relevant material
evidence; Q052 material plus an uncertain wrinkle answer without an overclaim;
Q054 uses awkward value-evaluation framing and repeats design information;
Q056 repeats customization limitation; Q071 correctly distinguishes inspection
from trying on; Q073 explicitly scopes the sale policy condition; Q074 states
the refund reporting window; Q075–076 payment wording repeats itself; Q082
resolves prior product reference; Q083 acknowledges SQ9012 without answering the
retained prior question. An accepted execution is not necessarily a good answer.

Source comparison to Luna at `5596631d`: all changed raw outputs are retained in
the bundle; upstream authority/guard changes made after 559 include excluding
unbound cart claims before model admission. The frozen generation adapter itself
is an offline C3 harness, not `RealtimeRunner`; the separate runtime journey and
server composition evidence are not conflated with these rows.

Registered scoring used the pinned repository stage judge (Gemini 3.6 Flash),
separate from the GPT-6 Luna generator, over the exact cached candidate and
unchanged rubric. The initial scoring and one bounded retry are retained in
`evidence-pr375-new-20260929/registered-judge-e76a966-final.json`; initial
errors and retry errors are preserved per case. Final result: **43/52 candidates
scored: 14 PASS, 23 PASS_WITH_NOTE, 6 FAIL; 9 remain JUDGE_ERROR after retry**.
The other 18 DEV70 rows have no candidate (16 generator/guard failures and 2
expected pre-model rejects). A JSON/provider error is not a quality failure, and
an execution marked completed is not a quality pass.

The six scored failures point to distinct root causes: Q013 robotic objection
language; Q024 mechanical/missing direct freeship eligibility answer (the
separate cart-authority invariant still takes precedence over the judge score);
Q045 and Q053 leakage/repetition of internal plan language; Q062 Strategist
failed to answer tomorrow-delivery feasibility despite a 2–4 day estimate; Q083
failed to bind the corrected product and resume the active question. The 9
remaining provider-format errors and 16 generation failures limit population
coverage. Preserve judge disagreements for human review; do not tune the rubric
or claim these numbers establish customer readiness.

Latest synthetic runtime is separate: full 7-turn cart path ended at
`PURCHASE_CONFIRMED`, edited size L persisted, fee 30.000đ was answered, and the
runner did not send externally. The runtime artifact was captured while source
`e76a9667` was HEAD; file hashes are retained and will be compared to the final
commit. The one-template-independent recovery control through the actual server
is scripted model input, not another Luna judgment.

Remaining: inspect all successful and rejected turns against their full history;
run exact final branch CI and verify all artifact-to-commit hashes; keep P02,
semantic guard/editorial, budget search, comparison, branched customer
decisions, long history, full fallback and live customer smoke open. No
merge/deploy/traffic/live writes.

Local verification after the recovery and binding test changes: worker benchmark
validators passed (100 cases, DEV70/holdout30, unchanged bundle); TypeScript
`--noEmit` passed; full worker suite passed **1,818 tests across 130 files**,
with one credentialed Luna realtime smoke test skipped by default. The selected
Luna runtime journey and actual-server recovery control are reported separately
above. Final-branch CI and final hash matching are still pending.
