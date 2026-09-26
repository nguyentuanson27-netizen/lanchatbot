# Q067 unconfirmed dispatch date — 2026-09-25

The exact-source Luna DEV70 at `c866729` recorded Q067 as a final-guard
failure. The customer asked when the shop would send SQ9012. The Responder
said: “Em chưa có thông tin xác nhận ngày shop sẽ gửi SQ9012; thời gian giao
dự kiến chưa cho biết ngày gửi hàng.” The future-effect regex had treated the
embedded unknown dispatch date as a promise to send the item.

The C3 prose guard now allows a future shipment mention only when the same
clause explicitly says the dispatch day/time is unconfirmed. A separate
affirmative promise still fails, including one after the uncertainty clause.
The completed-effect guard is unchanged.

Verification:

- The exact two previously recorded Luna stage outputs for Q067 replayed
  through the current compiler and final guard and returned the bounded
  uncertainty sentence. This offline replay has no model call or external
  effect and is not a fresh DEV70 score.
- The C3 strategy-contract suite passed 69/69. Its new regression checks
  the safe uncertainty sentence, a plain future shipping promise, and a
  promise after an uncertainty clause.
- The worker TypeScript build passed.

The previous frozen DEV70 result remains 56 completed/unjudged, two expected
pre-model rejects and 12 guard failures at its own source. Q007 and Q067 now
pass targeted replay at later source, leaving ten of those prior failures
unrepaired. The quality gate remains RED until a new full judged run passes.
