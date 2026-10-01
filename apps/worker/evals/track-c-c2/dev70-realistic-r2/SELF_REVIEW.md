# Self-review — DEV70 realistic R2

## Correctness

- 70/70 DEV IDs are the same population as main R2.5.
- Used fact values are identical to the main R2.5 source.
- 19 context amendments are explicit rather than hidden; they fix reachability/checkout/intent contradictions and are enumerated in `coverage.json`.
- Buying-intent evidence remains source-bound to customer dialogue.
- Q027/Q066 remain stale pre-model controls; Q024/Q043 retain intentional capability/binding gaps.
- Four histories remain >15 messages, preserving the continuity objective.

## Naturalness

After the owner's PR379 fixes:

- Shop history messages: 126 (R1) → 102 (R2).
- Shop question rate: 57.1% → 6.9%.
- Latest <=5 words: 4 → 6.
- Latest >=15 words: 24 → 19.
- Average latest length: 12.67 → 11.84 words.
- Maximum exact repeated shop line remains 2.

The previously flagged evaluator-facing phrases were removed or rewritten. Q036/Q082 remain long but no longer read like a questionnaire. Q095/Q096 no longer use system-like wording. No new blocking naturalness finding was found in this review.

## Scope

This rebase changes benchmark corpus/provenance only. Runtime, prompt, guard, aggregate gate and HOLDOUT are intentionally untouched. No model output was used to tune R2.
