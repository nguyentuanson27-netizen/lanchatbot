# BF-03 correction-containment benchmark

`correction-containment-v1.json` is the governed synthetic acceptance corpus for
the temporary `CORRECTION_CONTAINMENT_V1` policy. It contains no production
conversation, customer identifier, secret, or PII.

Labels:

- `CONTAIN`: the turn contains a correction-shaped SIZE topic mention that must
  be removed from the legacy classifier view.
- `PASS_THROUGH`: the turn must retain the normal path because it is a genuine
  size request/control or does not contain the BF-03 defect.

The committed corpus contains 86 synthetic cases: 36 `CONTAIN` positives and 50
`PASS_THROUGH` negatives. Its gate is zero false positives and zero false
negatives. Unicode and ASCII mixed PRICE/STOCK/ETA cases include punctuated and
natural no-punctuation forward/reverse forms. Topic-carried comparison, fit,
choice, rejected-answer and catalog controls cover punctuation, newlines and
residual-before/residual-after order. The worker benchmark checks exact canonical
intents. The runner suite loads the runtime-labeled rows to verify guarded SIZE,
correction-only fail-closed authorization, final action, fact/grounding calls and
decision events. Authorization mismatches are asserted independently from the
FP/FN gate. Both suites run in canonical repository `pnpm check`.

BF-03 remains temporary and retires with DF-09 evidence plus the atomic DF-11
legacy-regex demotion/cutover.
