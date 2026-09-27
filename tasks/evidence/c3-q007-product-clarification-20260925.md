# Q007 stale product clarification — 2026-09-25

Source commit: `6ca85e6c620219de3f0b219cf228e3f7e03b63d2`.
The previous exact-source Luna DEV70 at `c866729` recorded Q007 as a
final-guard failure. Its Strategist chose `ASK_PRODUCT`; the Responder
asked, “Chị gửi em tên hoặc ảnh mẫu chị đã xem hôm qua nhé.” A focused
reproduction of the shared guard returned `PREMATURE_ORDER_INFO_REQUEST`
because the recipient-name pattern treated “tên hoặc ảnh mẫu” as a checkout
name request.

The guard now treats a request for a product name paired with image/code
alternatives as product identification. Requests for “họ tên”, “tên người
nhận”, phone and delivery address retain the existing checkout boundary.
The exact previously recorded Luna stage outputs were replayed through the
current C3 compiler and final guard; Q007 returned the intended product
clarification with two recorded stage outputs and no external effects.
This is an output replay, **not** a fresh Luna run or a new DEV70 score.

Verification on this source change:

- `@lana/business-tools` focused suite: 39/39 passed, including both
  product-identification alternatives and the existing recipient-PII cases.
- C3 strategy-contract focused suite: 68/68 passed, including a stale-binding
  Strategist → Responder → final-guard case with the Q007 wording.
- Realtime golden transcripts: 12/12 passed.
- Worker and business-tools TypeScript checks passed.

The prior frozen 70DEV result remains 56 completed/unjudged, two expected
pre-model rejects and 12 guard failures at its own source HEAD. Q007 is the
only failure this change is intended to repair. The quality gate remains RED
until a new complete, judged run meets the acceptance thresholds.
