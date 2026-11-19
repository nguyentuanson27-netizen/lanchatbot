# Smoke PREPROD ca 2 — vì sao handoff sau khi thêm giỏ

**Đã tái hiện `HARD_PRECHECK → PROTECTED_CLAIM_VARIANT_SCOPE_MISMATCH → STALE → HANDOFF/DEPENDENCY_FAILURE`** trên PostgreSQL cô lập. Tập trung đúng lượt thêm giỏ, dùng prefix tư vấn size đã quan sát và thực thi prefix bằng transport kịch bản. Gửi bên ngoài tắt.

1. Size Engine cấp `SIZE_FIT` M cho phần áo `TOP` của `SM613`. Claim lưu scope `PRODUCT/SM613`, `variantId: null`. `fitTarget` gắn phần áo và hồ sơ đã xác minh.
2. Lượt mua ghi đúng một áo navy M, receipt `CART_OPENED/SUCCESS`. Snapshot sau commit thêm `VARIANT cart-variant:<lineId>`, dùng scope đó cho `PRICE` và `STOCK`. Claim `SIZE_FIT` vẫn đi cùng snapshot.
3. Trước giỏ, subject `PRODUCT SM613` không có field `variantId`, nên không dựng danh sách variant bắt buộc. Sau commit, dòng giỏ làm danh sách scope cho SM613 chỉ chứa `cart-variant:<lineId>`. Shared protected-claim guard kiểm fit target đúng rồi vẫn áp tiếp so khớp variant lên claim fit có null. Cùng một claim fit qua trước commit và fail sau commit. Giá và tồn đã khớp scope dòng giỏ.
4. Owner đã sinh câu xác nhận thêm giỏ và tổng 529.000đ. Precheck dừng trước verifier vì claim scope lệch. Hai snapshot hash giống nhau, revision đều 4. Recovery đổi mã `STALE` thành handoff im lặng `DEPENDENCY_FAILURE`. Giỏ vẫn `CART_OPEN`. Các lượt checkout sau đó bị chặn do hội thoại đã thuộc HUMAN.

[Code dựng claim theo dòng giỏ](../../../../apps/worker/src/single-agent-commerce-effects.ts#L143) · [Hard precheck](../../../../apps/worker/src/single-agent-semantic-verifier-boundary.ts#L135) · [Shared protected-claim guard](../../../../apps/worker/src/realtime-protected-claim-boundary.ts#L65) · [Recovery sang handoff](../../../../apps/worker/src/single-agent-commerce-handoff.ts#L232).

## Cách tái hiện và giới hạn

- Trace từ đầu hành trình `f23878d4` vướng `AUTH_UNAVAILABLE` ở verifier của lượt tư vấn size. Hai owner HTTP, zero verifier HTTP. Giữ nguyên kết quả lần này, chưa tới lượt mua.
- Trace mua `4c7825a0` thực thi prefix kịch bản với fit M, rồi sinh đúng lượt mua bằng owner thực. Hai owner HTTP, zero verifier. Quan sát receipt và mã precheck nêu trên.
- Replay `c0b8199b` dùng lại hai owner output của trace mua, tái hiện receipt, mismatch và handoff với **0 generation**. Probe xác nhận chỉ `SIZE_FIT` scope null nằm ngoài danh sách variant. DB cô lập của cả ba lần đã dọn. Thiếu raw trace ở smoke ban đầu, nên kết luận dựa trên lỗi được tái hiện trong đúng luồng, kèm so khớp terminal và trạng thái giỏ.
- Exit 1 ở các lượt trace khi kỳ vọng `SEND_ELIGIBLE` gặp handoff. Không đổi nghiệp vụ hoặc trạng thái trang test.

```powershell
$env:APPDATA=(Resolve-Path ../c3-verifier-replay-cli-01592).Path
python ../c3-current-cart-choice-launch-20261119.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs '../c3-preprod-fit-checkout-add-trace-20261119081513820' COD --candidate-handoff --check-prefix 'PREPROD smoke ' --preprod-smoke-fit-only '../c3-preprod-send-disabled-smoke-20261119075537182/integration.json' --preprod-smoke-trace-add
python ../c3-current-cart-choice-launch-20261119.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs '../c3-preprod-fit-claim-probe-20261119081942321' COD --candidate-handoff --check-prefix 'PREPROD smoke ' --preprod-smoke-fit-only '../c3-preprod-send-disabled-smoke-20261119075537182/integration.json' --preprod-smoke-trace-add --preprod-smoke-replay-add '../c3-preprod-fit-checkout-add-trace-20261119081513820/integration.json'
```

## Hướng sửa

Phân biệt thẩm quyền fit với thẩm quyền giá/tồn của biến thể trong giỏ. Fit dùng đúng sản phẩm/phần áo và đúng hồ sơ tại revision hiện tại. Giá/tồn vẫn phải khớp biến thể đã chọn. Dùng hồi quy fit → thêm giỏ để kiểm receipt, exact reply qua verifier, tổng vào Outbox và checkout đi tiếp. Giữ đối chứng chặn fit sai phần hoặc hồ sơ cũ, giá/tồn sai biến thể.
