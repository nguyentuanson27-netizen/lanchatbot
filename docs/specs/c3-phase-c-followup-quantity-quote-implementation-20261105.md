# Phase C — sửa báo tổng ở lượt sau khi chưa đủ lựa chọn giỏ

Implementation base `4530be07cc442333138c432b3a8ae7b4a8503509`; clean executable `94911899adaaceef5b314518a4d6bb237d8f2208`. Yêu cầu owner: sửa j1 lượt3, không tự chạy model campaign hoặc mở R2.

Ca lỗi: khách đã nói hai áo M/L, chưa chọn màu, rồi hỏi tổng cả ship. Owner thử thêm giỏ với sentinel và gọi quote_cart sau thất bại; verifier không có current colour proof nên handoff. Audit code chỉ ra nguyên nhân hạ tầng bị bỏ sót trong nhận xét trước: `quote_product` chỉ expose ở firstContact=true. Lượt3 thực tế không có capability báo tổng trước giỏ này, dù mô tả tool đã nói tới preCartQuote.

## Thay đổi

- Reuse `quote_product` ở firstContact=false đã được code xác nhận, có read/policy/handoff capabilities. Bắt buộc đúng một offer và quantity; runtime kiểm riêng, native schema cũng yêu cầu quantity/maxItems1 từ code-owned conversation-entry. Unknown history vẫn không mở tool; first-contact giữ đường quote+ảnh cũ.
- Lượt sau đọc giá hiện hành và dùng policy calculator hiện có để tính tiền hàng/ưu đãi/ship. Không cần tạo giỏ, chọn màu hoặc ảnh khi giá chung đã được nguồn xác nhận. Không tự pick màu; không coi mã kỹ thuật là lựa chọn khách. Nguồn không đủ để có giá được bảo vệ vẫn fail-closed.
- Không chọn/gửi lại ảnh cho follow-up quote. Giữ standalone, một quote/lượt và hai reserved primitive units; actual read1/media0 không được dùng để lách cap6/2rounds/3owner/1verifier. Opening photo requirement không đổi.
- preCartQuote vẫn là proof của đúng subject/offer/quantity/price/policy/cart-state/binding/recipient, không phải receipt. Readback tái kiểm/recompute; policy/price expiry/revision thay đổi không được oldPASS cấp quyền gửi. Không ghi cart, checkout, profile, mutation receipt hay state mua hàng từ việc báo giá.
- Owner prompt thêm một bullet phân biệt báo tổng trước giỏ với mutation/quote_cart và bỏ dùng sentinel. Tool description đồng bộ hai phạm vi, không còn vừa giới thiệu pre-cart total vừa cấm dùng ở lượt hỏi lại. Không thêm ví dụ benchmark, giá/chính sách hardcode hay sửa giọng hàng loạt. Owner prompt tăng507bytes (21.403→21.910); manifest hash cập nhật, verifier prompt giữ nguyên.

Không thêm model role, parser/router, semantic classifier, retry/repair/reverify loop, cap, production entrypoint hoặc source shop write. Không gộp cart khác vào quote của một offer hoặc chứng minh đã hoàn tất giỏ.

## Verification

Quan sát runtime RED6FAIL/26PASS trước fix. Final focused worker **418PASS/6files**, trong đó quote35 và ingress178; actual native egress kiểm returning quote không ảnh/giỏ và chặn sau revision change. HTTP mock wire **6PASS**, có RED thiếu quantity trước narrowing, giữ exact preCartQuote/signed parts và không evaluator labels. Coverage lặp không cộng thành test độc lập.

Full Node trên clean executable94911899: **859PASS /2SKIP /0FAIL**. Worker build/typecheck/lint exit0; focused418 và build chạy trước commit trên implementation worktree, runtime được build giữ nguyên byte ở94911899. Typecheck/lint chạy sau source commit. Worker build có shared prebuild hiện hữu; không sửa shared package. Không claim full worker suite hoặc root pnpm check/remote CI trong lượt này.

Real PostgreSQL **1/1PASS**, clean source, provider0, DB dropped: ghi nhận prior accepted shop reply thật→quote quantity2 khi chưa có màu→current price/policy proof→verifier stub→actual transaction/Outbox→text once sau delivery restart; cart/processed effect commands/checkout không thay đổi, không ảnh được gửi thêm. Đây là synthetic/scripted transport, không model result.

Replay đúng world của ca lỗi và captured clock `2026-11-05T14:14:04.200Z`: AOqty2 đọc thành công, subtotal998.000−ưu đãi49.900+ship30.000=**978.100đ**. Current colour evidence có Trắng IN_STOCK và Be PRE_ORDER; không dùng tin shop cũ làm authority. Không cart/effect/media/generation, readback proof khớp. Đây là historical component replay, không dùng clock cũ để cấp quyền cho model hay live send hiện tại.

[Exact commands/logs/results](evidence/c3-followup-quantity-quote-20261105/verification.json), [source hashes](evidence/c3-followup-quantity-quote-20261105/source-manifest.json), [PG](evidence/c3-followup-quantity-quote-20261105/pg.json), [failed-world replay](evidence/c3-followup-quantity-quote-20261105/failed-world-replay.json). Giữ các log RED và test-fixture/assertion failures, không nới runtime để làm test xanh.

## Trạng thái

Đã sửa đường code và chỉ dẫn cho owner; **chưa chạy model lại**, chưa chứng minh model tự chọn đúng tool hoặc giọng/chất lượng cải thiện. R1 model FAIL trước vẫn nguyên trạng, R2/R3/R4 30ca/48lượt NOT_RUN. Không tự tiếp tục campaign, merge/deploy hoặc live send. Cùng reviewer độc lập **APPROVE scoped implementation** tại94911899, không còn material finding: [approval/source/evidence hashes](evidence/c3-followup-quantity-quote-20261105/engineering-review.json). Reviewer tự chạy thêm6wire+35quote tests; đây là coverage lặp, không cộng vào tổng. Approval không thay model acceptance. Báo cáo/evidence accuracy được review riêng.
