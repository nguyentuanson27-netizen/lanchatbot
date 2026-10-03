# PR377 — Finite guard experiment and source-boundary fix

Probe source: `5596631d73b76b81e43a28fb5100833a690c266f`. Unmodified compiled
C3 contract with injected drafts; full diagnostic JSON stays in the local evidence
directory. No model calls, generator tuning, case routing or new regex rules in
this experiment. Twelve variations change assertion/uncertainty, polarity,
condition membership and an added benefit independently. This is finite evidence,
not a proof about all Vietnamese wording.

| Probe | Intended | Observed | Result |
|---|---|---|---|
| fit_unknown_safe | ALLOW | BLOCK | DEFECT |
| fit_invented | BLOCK | BLOCK | MATCH |
| fit_negation_switch | BLOCK | BLOCK | MATCH |
| fit_uncertainty_plus_claim | BLOCK | BLOCK | MATCH |
| fee_unbound_negative | BLOCK | ALLOW | DEFECT |
| fee_unbound_positive | BLOCK | ALLOW | DEFECT |
| fee_unknown_safe | ALLOW | ALLOW | MATCH |
| sale_conditional | ALLOW | ALLOW | MATCH |
| sale_membership_leak | BLOCK | ALLOW | DEFECT |
| attribute_unknown_safe | ALLOW | ALLOW | MATCH |
| attribute_invented | BLOCK | BLOCK | MATCH |
| attribute_uncertainty_plus_claim | BLOCK | ALLOW | DEFECT |

Seven controls match; five expose defects. The unsafe accepted controls include
positive AND negative unsupported freeship, promotion-category membership and a
comfort benefit added after an uncertainty clause. A safe fit uncertainty is
blocked. These counts are not DEV70 scores and are not statistically generalizable.

## Root cause demonstrated

1. `buildTrackCSelectableEvidence` previously kept a CART claim's value selectable
   when its independent current-cart binding was absent, and merely omitted its
   wording. The Strategist could copy that value into `goal`, and the Responder
   could restate it in ordinary prose. This confuses absent authority with absent
   presentation capability. **Fixed after the probe:** use the existing cart
   identity/version/value/freshness check before admitting the claim to the model
   evidence list. No new gate/store/regex. Independent product facts survive;
   valid cart readbacks continue to supply shipping/freeship/promotion evidence.
2. Free prose still uses lexical claim detection. It cannot establish that a
   conditional shop policy applies to this product, distinguish every uncertainty
   from an assertion, or recognize every benefit paraphrase. The source fix in
   (1) removes one leak; it does not certify the remaining prose.
3. Fixed fact slots plus prose that repeats their answer create duplication and
   inconsistent blocking. Selected claim refs do not authorize factual prose.

## Per-group current boundary

| Group | Owning source/check | Editorial proven here | Residual |
|---|---|---|---|
| PRICE | POS product/offer claim and exact value realization | Existing courtesy/spacing only | Derived comparison not yet a code-owned fact |
| STOCK | Product/variant claim and variant label mapping | Existing realization only | Missing mapping and safe uncertainty false positives |
| FIT | Size Engine + product/measurement binding | Existing realization only | Size mentions/uncertainty collide with lexical guard |
| ETA | Current bound ETA; dispatch is separate | Existing realization only | Free prose deadline inference and numeric repetition |
| POLICY | Verified policy including conditions | Existing realization only | Product membership cannot be inferred from policy existence |
| ATTRIBUTES | Approved registry/catalog fields | Existing realization only | Added benefits can escape free-prose detection |
| EFFECT | Kernel/readiness/atomic commit authority | No expanded model permission | Commerce output ownership still partly legacy |

## Decision and explicit limit

Do not widen arbitrary fact paraphrasing based on these results. Keep existing
bounded factual realization while repairing data admission and commerce consumers.
Do not turn a safe uncertainty whitelist or a claim annotation into authority.
P03/P04 remain open for natural adaptive writing, and customer smoke remains blocked.

The plan's finite design fork is now concrete:

- Bounded factual composition can preserve truth for admitted facts with deterministic
  checks, but restricts how a unified reply can be written and still needs a policy
  for free-prose facts/uncertainty.
- A semantic verifier can assess a complete natural reply against scoped evidence,
  but introduces additional model latency/cost and probabilistic errors. It needs
  its own positive/negative evidence; it cannot replace cart/effect checks.

Neither tradeoff is presented as already implemented. No semantic model, sentence
bank, new operational gate or live activation was added by this slice.
