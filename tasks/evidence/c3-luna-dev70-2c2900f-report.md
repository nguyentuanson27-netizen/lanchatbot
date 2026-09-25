# C3 70DEV Luna diagnostic run (not a quality pass)

This is the first frozen DEV70 run on source HEAD
`2c2900f79f3080873f26bbc83cda427370e36fd2`, 2026-09-25 03:41 UTC.
The source working-tree diff hash was the empty SHA-256. Model was
`gpt-6-luna`, reasoning `medium`; lane was `BEHAVIOR_SIMULATION` with side
effects disabled. Benchmark revision R2.9; expanded DEV70 SHA-256
`9256db31a3155e642afe9f9dbaeef7cf7f5818c764dbdc5933cb31dff231f643`.
Rubric SHA-256 was
`54437743f5e135f123e17c0de5a71fa5061c6eb54782defdd7bb3f70bd4aabf5`.

Raw record, every model prompt/schema/output, and the full ordered dialogue
are stored in the adjacent workspace artifact directory
`LUNA6_DEV70_C3_2c2900f_20260925T034153Z`. Its
`full-conversation-history.md` is also copied into this repo as
`c3-luna-dev70-2c2900f-full-history.md`; it includes all 70 cases, including
failed and pre-model-rejected cases. These are independent frozen scenarios, **not** a
70-turn stateful runtime conversation. Synthetic fixture content only; no
customer traffic or external effects.

| Raw outcome | Count | Interpretation |
|---|---:|---|
| Completed, not judged | 55 | Candidate returned a reply; no quality pass is inferred. |
| Expected pre-model reject | 2 | Q027 and Q066, with zero provider calls. |
| Failed | 13 | 12 final guard rejections and one Responder draft parse rejection. |

The failed IDs are Q026, Q034, Q035, Q036, Q041, Q043, Q044, Q063,
Q067, Q077, Q086, Q096, and Q100 (all prefixed `V5V4`). In most of these,
Luna placed a product, stock, size, delivery, discount, or cart assertion in
`answerText` rather than the bound `factualTexts`. The final guard correctly
refused the free-standing assertion. Q077 had a verified public shop address
but the generic customer-PII detector blocked its bound projection; fixed in
`33759c6`. The original failure remains in the raw record.

Whole-dialogue inspection also found material defects among the 55 completed
cases:

- Q095: the customer said the shop had confirmed an order, and the bot echoed
  that as a completed order without an effect receipt. This is a hard-failure
  candidate. A focused regression reproduced it and `2fa6a06` now rejects
  that wording. The old output is retained.
- Q013, Q015, Q016: price objections receive acknowledgement but little or no
  supported next move. They do not establish that the objection was resolved.
- Q053, Q061, Q071, Q072, Q074, Q075: factual text is preceded by needless
  restatement or repeated uncertainty. Naturalness and concision need rubric
  scoring; a successful guard is insufficient.
- Q092: the redacted diagnostic `finalReply` contains `[NAME]`, whereas the
  separate `runtimeReply` contains the correct code-owned request for name,
  phone, address, and payment. The redacted display must not be scored as the
  delivered text.

No rubric judge was run on this artifact, so no numeric score or PASS count is
reported. The gate remains failed because 13 cases had no validated reply and
Q095 made an unverified effect statement. Later code changes require another
frozen run on the final HEAD; this artifact remains a regression baseline.
