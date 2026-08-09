# BF-03 correction-containment benchmark

`correction-containment-v1.json` is the governed synthetic acceptance corpus for
the temporary `CORRECTION_CONTAINMENT_V1` policy. It contains no production
conversation, customer identifier, secret, or PII.

Labels:

- `CONTAIN`: the turn contains a correction-shaped SIZE topic mention that must
  be removed from the legacy classifier view.
- `PASS_THROUGH`: the turn must retain the normal path because it is a genuine
  size request/control or does not contain the BF-03 defect.

The committed corpus contains 66 synthetic cases: 36 `CONTAIN` positives and 30
`PASS_THROUGH` negatives. Its gate is zero false positives and zero false
negatives. Unicode and ASCII mixed PRICE/STOCK/ETA cases include punctuated and
natural no-punctuation forward/reverse forms. The worker benchmark checks their
exact canonical non-SIZE intents, and the BF-03 runner integration suite loads
the same labeled cases to verify final outbound action, fact calls, and the
absence of SIZE calls/events with a compliant model stub. Both suites run in the
canonical repository `pnpm check` gate.

BF-03 remains temporary and retires with DF-09 evidence plus the atomic DF-11
legacy-regex demotion/cutover.
