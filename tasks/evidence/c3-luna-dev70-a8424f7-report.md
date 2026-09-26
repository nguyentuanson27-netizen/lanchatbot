# C3 DEV70 on source HEAD a8424f7 — 2026-09-26

Source: `a8424f73b0f1300d87d6bb0bc0ef8dfdbc56bbd7`; source diff SHA-256 at run: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. `gpt-6-luna`, reasoning `medium`, 70 frozen DEV cases, `BEHAVIOR_SIMULATION`, external effects disabled. Frozen DEV70 SHA-256: `9256db31a3155e642afe9f9dbaeef7cf7f5818c764dbdc5933cb31dff231f643`. The run used the existing two-stage C3 harness and kept independent cases independent; it did not turn the 70 fixtures into one conversation.

| Outcome | Cases |
| --- | ---: |
| Completed through final guard, not judged | 54 |
| Expected pre-model stale reject | 2 (Q027, Q066) |
| Final guard reject | 14 |

All model stages completed where admitted; Q001–Q003 used one fixed-first-contact stage and the other 65 admitted cases used two stages, for **133 completed model stages**. There is no registered provider-backed stage-judge score for this run, and the guard failures already fail the quality gate. **Status: RED.** Passing the final guard is not a claim that a reply satisfies the rubric.

Guard-rejected IDs (prefix `V5V4`): Q014, Q026, Q034, Q035, Q036, Q037, Q042, Q043, Q046, Q063, Q072, Q086, Q096, Q100. Q072 failed `TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT`; the other 13 failed `TRACK_C_V5_PRODUCTION_GUARD_FAILED`.

## Review of all 70 ordered conversations

The complete ordered customer/bot history, both executed model stages, chosen evidence, final reply or failure for each case is in [the full-history artifact](c3-luna-dev70-a8424f7-full-history.md). Raw prompts, schemas and outputs are in the owner-local archive below. I read each case outcome and compared its actual reply with the latest customer request and previous dialogue.

- Q001–Q007 and Q011–Q012: first-contact form stays stable; two-product price wording in Q006 is still clumsy. Q007 now asks to identify the stale product without a premature recipient-PII rejection. Q011 adds an unnecessary prior-decision preface to a direct price question.
- Q013–Q017: price resistance remains weak. Q013/Q015/Q016 acknowledge concern without a supported way to decide. Q014 is newly rejected because free prose describes the budget gap and unavailable offer; Q017 correctly refuses an unauthorized lower price. The exact Q014 wording is in the full history.
- Q021–Q027: Q022/Q023/Q025 state current-cart facts. Q024 now passes by saying a freeship status cannot be confirmed, but this is not proof that the negative freeship wording has a properly bound cart source. Q026 repeats a promotion in prose and fails. Q027 is the expected stale rejection.
- Q031–Q037: Q031/Q032 ask for missing measurements; Q033 states verified M with L as an option. Q034–Q036 repeat or infer size/fit in unbound prose and fail. Q037 newly fails by combining a valid split-size sale policy with unsupported fit discussion.
- Q041–Q047: Q041/Q044/Q047 state stock. Q042/Q046 duplicate the out-of-stock assertion in prose and fail; Q043 still lacks a variant-level stock realization. Q045 adds unnecessary framing before the bound low-stock fact. No invented urgency was accepted.
- Q051–Q057: material and design answers are mostly source-bound. Q052 correctly declines to infer wrinkle resistance. Q053/Q054/Q055/Q056 contain repetitive prefaces or restate facts; Q057 says images cannot be sent, so the requested media action remains unavailable.
- Q061–Q067: Q061/Q062/Q064 repeat ETA uncertainty; Q063 still fails by drawing a deadline-feasibility conclusion in prose. Q065 correctly reports missing ETA. Q066 is the expected stale rejection. Q067 now distinguishes unknown dispatch date from verified delivery duration and passes the guard.
- Q071–Q077: Q071 states a source-projected promise to check try-on status without a runtime effect receipt; that source/capability gap remains. Q072 is rejected for changed policy wording. Q073 risks applying a sale-category condition to a specific product without proof that product is in the category. Q074–Q076 repeat policy facts in the preface; Q077 states the verified public shop address.
- Q081–Q087: Q081 passes while computing “SQ9012 thấp hơn SV9031” in free prose from two price facts; this is a **guard false negative / missing comparison realization**, not accepted authority. Q082/Q083 retain referents. Q084/Q085 add details beyond the customer's narrow question. Q086 wrongly turns split-size sale permission into body-fit advice and fails. Q087 correctly distinguishes discontinued stock.
- Q091–Q100: Q091 does not mistake “Ok” for a purchase; Q092 requests checkout details but the redacted history displays `[NAME]` (the owner-local raw synthetic record retains original text). Q093 asks for product identification; Q094 asks for missing measurements but remains vague. Q095 gives a neutral thanks with no unverified order receipt. Q096 implies a size change without the cart effect and fails. Q100 claims a checkout inability in prose while the transaction state is incomplete and fails.

Against the prior `c866729` run, Q007 and Q067 now pass, while the set of failed cases has shifted. Q024/Q081 passing does not resolve their authority gaps. A model run is nondeterministic; this comparison is a diagnostic, not a controlled pass-rate improvement.

## Artifacts and limitations

Owner-local directory: `C:/Users/nguye/Documents/Sản phẩm AI/LUNA6_DEV70_C3_a8424f7_20260926T024145Z` (400 files). Archive: `C:/Users/nguye/Documents/Sản phẩm AI/LUNA6_DEV70_C3_a8424f7_20260926T024145Z.zip`, 1,281,292 bytes, SHA-256 `6578F1C8ACDB65C5BB0E29AEE33A88D14A4530C9C9248269F15FF55CEEE452B4`. The full history is also committed in this repository. All customer examples are frozen synthetic fixtures; this is not live customer traffic, a POS receipt or an actual send. No holdout was opened or scored.
