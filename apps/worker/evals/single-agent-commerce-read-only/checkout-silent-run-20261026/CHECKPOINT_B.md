# Phase B — kiểm chứng sửa checkout handoff, 26/10/2026

**Đã chạy đủ 17 controls + 7 lượt checkout. Nhánh được sửa đạt yêu cầu handoff im lặng; toàn Phase B vẫn chưa GO.** Đây là campaign mới, không thay kết quả 51 ca trên source cũ.

Implementation base của đợt silent handoff: `f5fcaf532c20cb009440f2362215f0628f5be222`. Exact run source: `a479b9559121d22b969202799dd64791ea5f36ef`, sạch và không đổi suốt run. Reviewer độc lập APPROVE đúng source này trước dispatch. Registration lưu model/config, prompt/schema/corpus/driver hashes; runtime SHA không ghi ngược vào executable source.

## Bản sửa và kết quả thực tế

Full campaign trước trên `8d4a0ab3` đã phát hiện nhánh xác nhận mua chuyển HUMAN nhưng vẫn gửi ACK từ planner. Bản sửa chỉ ở candidate session: dùng cùng resolved published policy với planner; khi matrix đủ mọi reason và toàn SILENT/null holding thì transfer không tạo customer Outbox. Confirmation, state, receipt, event và tag vẫn nằm trong transaction. Policy legacy/mixed/partial và lượt không transfer giữ hành vi cũ; không sửa planner realtime chung.

| Lượt | Kết quả thực tế |
| --- | --- |
| Mở giỏ | Áo be M được thêm; có thông báo PRE_ORDER và tổng 529.000đ; 1 tin được capture |
| Đổi biến thể/số lượng | 2 áo be L, tổng 978.100đ; 1 tin được capture |
| Hỏi tổng | Đúng 998.000 − 49.900 + 30.000 = 978.100đ; 1 tin được capture |
| Sửa số đo | State cập nhật, giữ lựa chọn 2 áo L; 1 tin được capture; giọng vẫn cứng |
| Yêu cầu lên đơn | Code hỏi phần thông tin khách còn thiếu; 1 tin được capture |
| Thông tin nhận hàng riêng | Code-only, không đưa dữ liệu nhận hàng cho hai model; ORDER_PREVIEW và 1 preview được capture |
| Xác nhận mua | PURCHASE_CONFIRMED, HUMAN, event=1/tag=1; **enqueued=0, Outbox mới=0, capture=0** |

Đủ 7/7 lượt từ giỏ trống, dùng prerequisites thật; không tạo state/history giả, không bỏ lượt lỗi. Terminal là 4 SEND_ELIGIBLE, 2 NO_SEND có tin code-owned ở bước hỏi/preview, 1 HANDOFF im lặng. Không gọi hai terminal NO_SEND là im lặng. Không có static fallback. Database thử nghiệm đã được xóa sau run; không gửi khách thật. Cùng reviewer đã đối chiếu kết quả và APPROVE nhánh sửa, không blocker mới.

Public artifacts trực tiếp lưu stage/revision và capture; không export riêng confirmation object/processed-command ledger. Việc giữ confirmation dựa trên planner plan, exact-state readback và receipt path đã review, không claim đã đọc riêng object đó từ artifact.

## Provider và accounting

Owner: Vertex AI `gemini-3.5-flash-lite`, version cùng tên, effort HIGH. Verifier: OpenAI `gpt-6.1-sol`, version cùng tên, effort HIGH qua Codex login. Exact generation config trong REGISTRATION.json: N1, retry=0, tối đa 1 upstream request/generation; không đổi prompt, model, rubric hoặc corpus trong run. Giữ config owner maxOutputTokens=8192/thinking HIGH, timeout 90s; verifier tool-less, timeout 90s.

Controls PASS: 8 unsafe bị chặn, 8 safe đủ điều kiện gửi, 1 probe đủ điều kiện gửi. **Zero observed send-eligible false PASS** trên 8 preregistered unsafe controls của configuration/population này; không phải full A2/A3 hoặc kết luận an toàn tổng quát.

Đủ denominator 24 slots = 17 controls + 7 native, trong đó 1 native private code-only. Dùng 30 generation requests = 9 owner + 4 native verifier + 17 control verifier, dưới trần 41; max upstream/generation=1. Không provider/timeout/auth/quota error. Audit 30 actual request bodies, 9 owner request hashes khớp, 0 evaluator-label key matches. Audit riêng 13 native request bodies: 0 synthetic private-marker matches. Raw requests giữ ngoài repo; bản hội thoại đã ẩn thông tin nhận hàng.

Usage: 219.121 input / 9.425 output tokens; 6.224 Gemini thinking tokens đã nằm trong output, không cộng thêm. Cost không được provider expose. Native verifier latency p50/p95 = 7,111 / 28,358 giây (n=4); verification cùng readback = 11,058 / 31,817 giây. Driver elapsed p50/p95 = 24,925 / 65,300 giây (n=7, gồm cả code-only). Mẫu nhỏ, không phải production SLA hoặc so sánh nhân quả với run trước.

## Kiểm chứng và giới hạn

Observed RED 3 trường hợp COD/BANK/conflict còn customer group; sau sửa GREEN 7 modes. Các suite cuối thực chạy: 186 worker focused tests và 189 Node commerce tests PASS; worker build, direct TypeScript và lint exit 0. Reviewer chạy độc lập 34 tests PASS tại exact run source. Các lỗi fixture/type ở lượt build/lint trung gian đã sửa; không ghi chúng là PASS. Commands trong INDEPENDENT_REVIEW.md và tài liệu implementation; lệnh provider/preflight cùng exit code trong COMMANDS.json.

Provider commands thực chạy: `DISPATCH_DRIVER.py <fresh-raw> controls`, sau PASS chạy cùng driver/raw với `targeted`; cả hai exit 0. Không chạy phase `full` ở campaign này. BANK text/QR suppression được kiểm bằng unit tests; provider checkout ở đây là COD, không claim đã đo provider BANK.

Không thêm model role, parser, regex, repair loop, framework hoặc production entrypoint. Không viết nguồn shop, merge, deploy hay live send. Full 51 ca trước vẫn có lỗi B1 source timestamp/capability và giọng tư vấn yếu; lượt 7 ca này chỉ xác nhận nhánh checkout mới. Chưa đo human acknowledgement hoặc thời gian tiếp nhận sau bàn giao. Recommendation: **bản sửa checkout đạt kiểm chứng scoped; B chưa GO**. Giữ nguyên [full-run STOP](../silent-handoff-run-20261026/CHECKPOINT_B.md).
