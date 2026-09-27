# C3 70DEV Luna rerun — source HEAD 6039110

Frozen DEV70 was rerun on exact source HEAD
`60391109658cc43510c70aa8cac7deca2f06ff8f` with an empty source diff,
`gpt-6-luna` / `medium`, R2.9 bundle and `BEHAVIOR_SIMULATION` lane. Side
effects were disabled. The complete ordered dialogue and both model stage
outputs are in `c3-luna-dev70-6039110-full-history.md`. Raw case records and
each prompt/schema/output file remain in the adjacent workspace directory
`LUNA6_DEV70_C3_6039110_20260925T040850Z`.

| Outcome | Count |
|---|---:|
| Completed, not judged | 55 |
| Expected pre-model reject, zero provider calls | 2 |
| Failed | 13 |

Failed IDs: Q026, Q034, Q035, Q036, Q037, Q041, Q043, Q046, Q063,
Q072, Q077, Q096, Q100 (prefix `V5V4`). Most are final guard rejections of
free prose containing product, size, stock, promotion, deadline or transaction
claims. Q072 changed the selected policy wording and was rejected as unbound.
Q077 was a draft rejection: the generic PII detector mistook a redundant
model preface about the shop address for a customer address. Follow-up commit
`0476e38` discards that preface and keeps the bound fact under normal checks.

The failed set changed despite identical fixtures/model settings: Q044, Q067
and Q086 failed only in the first run; Q037, Q046 and Q072 failed only in this
run. Ten failed in both. This is a stability finding, not a pass-rate gain.
Q095 happened to avoid its earlier unverified order-effect wording; the
explicit guard regression in `2fa6a06` remains required.

No numeric rubric judge was run. The 55 completed outputs are not quality
passes. The DEV gate fails because 13 cases have no validated reply. This run
precedes `0476e38` and cannot serve as exact-HEAD evidence for that change.
