# Acceptance findings and scoped repairs

Evaluated baseline: `4e4ecbf5f39e02925573c999d91636aa860494a3`.
DEV70 R2 corpus: PR379 `1d89fd80041e3d563f4a163d975c06545e59b265`.
Rubric file SHA-256: `54437743f5e135f123e17c0de5a71fa5061c6eb54782defdd7bb3f70bd4aabf5`.

The baseline's registered judge found an accepted-but-wrong first-contact reply:
the product profile contained the selling unit, but its deterministic projection
omitted it. The bounded Responder therefore could not explain whether the price
covered a set or a component. The projection now retains the same authoritative
profile's optional selling unit. No selling unit is inferred when it is absent.

A separate baseline guard false positive rejected epistemic wrinkle wording
whose subject was a fabric question complement. The existing closed nominal
grammar now recognizes that bounded complement. Positive/negative controls keep
independent assertions, causal conclusions, other properties and dispatch
promises blocked. No topic confers factual or effect authority.

Both source defects were reproduced with deterministic RED tests before repair.
The affected five suites then passed 173 tests with zero skips or failures. This
is precommit deterministic evidence, not exact-new-head model acceptance.
The corpus, expectations, facts, rubric, model and thresholds are unchanged.

Complexity delta: one optional authoritative field is retained in its existing
renderer; one finite topic grammar is extended at its existing boundary. No new
gate, operator, store, authority, provider, dependency or production case ID.

Other baseline real-model findings remain OPEN, including Producer product-ID
omission, selected-M/queried-S interpretation and incomplete checkout journeys.
The baseline's model results must not be attributed to this repair commit.
New source identity, affected real-model journeys and a complete DEV70 rerun are
required. P11 remains OPEN; P12 remains BLOCKED; PR377 stays DRAFT.
No merge, deployment, traffic or live business mutation is authorized here.
