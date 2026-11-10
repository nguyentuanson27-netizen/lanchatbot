# Sales voice run — 2026-10-19

Owner authorized a new model run after selective voice changes at ba51204b. Reuse the previous runtime, models, configs, corpora and whole-turn rubric. Only owner prompt goal, choice explanation and voice changed. No new verifier policy or product facts.

Register 48 outcomes: stateful 8×3, B1 selected 4×3 and same-attempt captured advice 4×3. Maximum 156 generation requests; retry 0. No automatic expansion or rerun. Historical baseline openings are retained for reference, not generated again. Source SHA is captured at runtime after this registration commit and clean executable/config checks; do not write it back to frozen inputs.

Compare actual terminal outcome, decision/usefulness, context use and naturalness; distinguish minor polish from unusable advice. Read whole conversations, not keyword counts. Review customer outcomes before diagnosing verifier/rejected drafts. Replays use captured worlds and are not live eligibility evidence. Current live reads make cross-run comparisons descriptive. Keep all failures and blocked slots in the denominator. No delivery or deployment.
