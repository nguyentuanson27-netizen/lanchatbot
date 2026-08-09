# BF-03 correction-containment benchmark

`correction-containment-v1.json` is the governed synthetic acceptance corpus for
the temporary `CORRECTION_CONTAINMENT_V1` policy. It contains no production
conversation, customer identifier, secret, or PII.

Labels:

- `CONTAIN`: the turn contains a correction-shaped SIZE topic mention that must
  be removed from the legacy classifier view.
- `PASS_THROUGH`: the turn must retain the normal path because it is a genuine
  size request/control or does not contain the BF-03 defect.

The committed gate is zero false positives and zero false negatives. The worker
benchmark test also checks the exact non-SIZE intents preserved in mixed
PRICE/STOCK/ETA cases. The corpus is part of the worker test suite and therefore
runs in the canonical repository `pnpm check` gate.

BF-03 remains temporary and retires with DF-09 evidence plus the atomic DF-11
legacy-regex demotion/cutover.
