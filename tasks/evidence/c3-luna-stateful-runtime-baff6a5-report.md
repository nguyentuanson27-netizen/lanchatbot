# Stateful C3 Luna runtime smoke — source `baff6a5`

Source HEAD `baff6a56c862b4873b7f7e35a45f0422d617ff5e`; GPT-6 Luna medium; 9 synthetic RealtimeRunner conversations, 29 ordered turns, 43 completed model calls. The opt-in test passed with fake product, policy, history, database and delivery ports; outbound delivery was disabled. The provider identity adapter was test-only and did not claim a Gemini run. This is a stateful runtime check, separate from the frozen DEV70 cases and from live traffic.

All customer messages, actual replies, commerce stages, C3 choices, fallback reasons and completed stage outputs are in [the full runtime history](c3-luna-stateful-runtime-baff6a5-full-history.md). The full raw artifact also records source fingerprints, prompts, schemas, commit snapshots and the fake delivery boundary.

| Journey | Result |
| --- | --- |
| Price and promotion follow-up | 2/2 C3 chosen; does not invent an offer. |
| Budget objection | 2/2 chosen; response acknowledges budget but offers no supported next decision. |
| Fit concern | First turn chosen; second falls back with `TRACK_C_STRATEGIST_PROGRESSION_INVALID` to “Em đang hỗ trợ chị đây ạ.” The customer's concern is unanswered. |
| Color preference | 2/2 chosen; preference is acknowledged, with repetitive product wording. |
| Delivery question | 2/2 chosen; no region-bound delivery evidence was available for a customer ETA, so no date was promised. |
| Comparison | 2/2 chosen; no second-product evidence was available for a grounded comparison. |
| Prior experience | 2/2 chosen; asks what caused discomfort. |
| Cart size and checkout | 7 turns; cart opens once, changes M to L, asks remaining details, previews and reaches internal `PURCHASE_CONFIRMED`. |
| Objection, material, checkout | 8 turns; cites cotton material, opens one cart, previews and reaches internal `PURCHASE_CONFIRMED`. |

The two cart journeys found an inconsistent deterministic cart reply: it offered “COD hoặc chuyển khoản” despite a `null` payment policy, while the later checkout step offered COD only. This was fixed at `8cd20ab` by binding the initial/cart-edit wording to the resolved payment policy. The `baff6a5` transcript remains immutable evidence of the defect; it is not evidence that the fix passed. Both final stages are internal purchase confirmation, not a POS order receipt or revenue claim.

Owner-local raw archive: `C:/Users/nguye/Documents/Sản phẩm AI/LUNA6_RUNTIME_C3_baff6a5_20260926.zip`, 593,175 bytes, SHA-256 `66FC6F27E008BD35B715F5F24CCE0D81DB6BD8C048B56C3C26DB4B9FE56EB805`. Its 174 raw files contain synthetic checkout names, phone numbers and addresses; the committed ordered history masks them. The JSON source artifact SHA-256 is recorded in that history.
