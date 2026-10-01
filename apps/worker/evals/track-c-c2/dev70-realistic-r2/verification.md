# Verification — DEV70 realistic R2

Verified after rebase review against `main` `a28bd12a8b15c4bbf65914c52236adac4ac41594` (benchmark source R2.5):

- PR379 current corpus: 70/70 DEV IDs preserved; all used fact values match main R2.5.
- R2.5 and the prior R2.9 source have identical DEV dialogue text for all 70 IDs, so the naturalness rewrite remains comparable after moving the base to main.
- 19 canonical-context amendments are intentionally retained from PR379 because they remove source contradictions in buying intent, checkout completeness, measurement reachability, or fact availability. They are listed in `coverage.json` and do not introduce facts outside `facts-used.json`.
- Evaluator expectations remain unchanged from the reviewed R2 corpus.
- Buying-intent evidence is still required by `validate.mjs` to occur in customer dialogue.
- Q027/Q066 remain stale pre-model controls; Q024/Q043 remain intentional capability/binding gaps.
- Naturalness review after the owner's fixes found no remaining blocking wording issue: shop-question rate is 6.9%, exact shop-line repetition max is 2, and evaluator-facing phrasing called out in the R1 review is absent.

Static validator contract after this rebase pins the main R2.5 manifest/facts/rubric hashes and the source DEV population hash. It does not call a provider, network service, catalog, transaction port, or customer channel.

Not run in this change: GPT-6 Luna, judge scoring, live catalog, transaction runtime, or customer smoke. CI on the rebased exact head is required after the branch rewrite.

Rebase verification note: PR379 is now based directly on `main`; this follow-up commit exists only to create a normal synchronize event so repository CI can evaluate the rebased corpus on its exact head.
