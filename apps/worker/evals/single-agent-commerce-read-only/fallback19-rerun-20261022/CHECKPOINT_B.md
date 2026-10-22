# Rerun 19 fallback — 2026-10-22

**COMPLETE: 19/19 target, N1; 18 SEND_ELIGIBLE, 1 FALLBACK. CHƯA B GO.** Không sửa prompt, model, policy, runtime hoặc verifier để có kết quả này. Không live send/deploy/POS mutation. Đây là rerun có chọn population theo fallback trước, không phải full B1/B2/B3 hoặc đánh giá độ ổn định.

## Identity và denominator

- Run source: `24d8ec62457f95865c80719a2e0c08fea697c657`, clean trước và sau dispatch. Previous full39 run: `6e38c54104010c7e137481a560b99da21e961e73`; previous report head: `ae9c0cb39f47b32d0dbd79da1d9e63aa8592c98b`.
- Owner: Vertex AI `gemini-3.5-flash-lite`, version cùng ID, HIGH/global. Verifier: OpenAI `gpt-6.1-sol`, version cùng ID, HIGH/Codex ChatGPT login, CLI `0.159.2`.
- Exact config/prompt/schema/corpus/runner hashes: [registration](REGISTRATION.json), [frozen inputs](frozen-inputs/manifest.json), từng cohort registration. Owner prompt `a7beafb9cf4ad14b0a76fe4213f46cece0bca1b3dff83ab0041eda5c316e89a6`; verifier prompt `0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- 19 target = 15 B1 + 1 opening + 2 stateful + 1 negotiation. Mỗi target đúng một lượt, giữ cả FAIL; không retry, không best-of, không dừng vì quality.
- 4 prerequisite provider turns riêng = mở giỏ + đổi biến thể/số lượng ở stateful; mở giỏ + phản đối giá ở negotiation. Các lượt này tạo cart/accepted history thật trong DB test. Không gán cart hoặc verdict provider giả. **Tổng 23 public turns; không gọi 23 là 19.**
- B1 giữ nguyên corpus history. Stateful/negotiation tạo lại history từ kết quả mới, nên cùng kịch bản nhưng không phải byte-identical transcript cũ. Không tự thêm 12 lượt thử ảnh hoặc ca full39 khác.

## Kết quả

| Population | Registered / recorded | SEND_ELIGIBLE | FALLBACK | Verifier PASS / FAIL |
| --- | --- | --- | --- | --- |
| Target rerun | 19 / 19 | 18 | 1 | 18 / 1 |
| Prerequisite | 4 / 4 | 4 | 0 | 3 / 1 |
| Toàn bộ lượt thực chạy | 23 / 23 | 22 | 1 | 21 / 2 |

Prerequisite `negotiation-price-objection` có verifier FAIL. Native code recovery trả `RECEIPT_BACKED_CART_SUMMARY` từ giỏ/quote hiện hành; không gửi draft bị chặn và không generation lại. Vì vậy 2 verdict FAIL không đồng nghĩa 2 terminal fallback.

Trong 19 target cũ: 17 fallback vì quota nay đều PASS; 2 fallback semantic cũ nay có 1 PASS (`b1-changed-occasion`) và 1 FAIL (`sales-discovery-advice:need`). Đây là fresh generation, không chứng minh verifier đã sửa hoặc chất lượng đã cải thiện. Không ghép kết quả mới vào full39 cũ thành một campaign PASS.

## Ca vẫn fallback

`sales-discovery-advice:need`

Khách: “Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.”

Actual customer capture:

> Phần này em chưa trả lời được, chị nhé.

Draft bị giữ lại giới thiệu Set quần Thạch Thảo 769.000đ và viết: “Thiết kế form áo quần nhẹ nhàng, thoải mái, **không lo bị bó bụng** mà vẫn giữ được nét thanh lịch, rất hợp để diện đi làm.”

Verifier trả `FAIL / UNSUPPORTED_PROTECTED_ASSERTION / product:SQ2447`. Schema không trả span hoặc diễn giải nguyên nhân, nên không quy chính xác một mệnh đề cho model. Đối chiếu context, phần cam kết “không lo bị bó bụng” là nghi vấn chính: chưa có measurements/SIZE_FIT hoặc thông tin độ ôm eo cụ thể; description chỉ mô tả dễ mặc/thoải mái. Đây là suy luận chẩn đoán của reviewer, không phải reason span do provider trả. Không đổi nhãn hoặc nới boundary trong rerun.

## Readback và vận hành

- Stateful quote đúng `978.100đ` = `998.000đ - 49.900đ + 30.000đ`.
- Correction lưu waist 74 / hips 96, giữ 2 áo be size L theo yêu cầu; không tự đổi size.
- Negotiation total đúng `499.000đ` = `499.000đ + 30.000đ - 30.000đ`; tier `HESITANT`, version 2, objection evidence count 1 không tăng ở câu hỏi tổng tiền.
- 70 generation HTTP requests = 47 owner + 23 verifier; target 58, prerequisite 12. 70 generation IDs và 70 captured wire bodies; tối đa 1 request/generation; 0 automatic retry.
- 0 HTTP error, 0 timeout, 0 evaluator-only label leak trong captured requests. [Accounting](REQUEST_ACCOUNTING.json), [metrics](METRICS.json).
- Verifier latency p50/p95: 7,327s / 15,242s; added verification latency p50/p95: 8,903s / 20,716s, nearest-rank trên đủ 23 lượt verifier.
- Tokens provider expose: owner input 225.339 / output 38.938 / thinking 36.365; verifier input 112.893 / output 1.852 / reasoning 1.264. Không cộng reasoning lần nữa vào output; cách provider báo token giữ nguyên. Cost không expose.
- 3/3 disposable PostgreSQL DB đã drop; chỉ read-only source connections, capture transport, không Meta socket/live send.

## Verification và giới hạn

- TDD selector eval: observed RED missing export, sau đó focused 4 PASS; toàn bộ Node eval 108 PASS, syntax check và diff check PASS. [Commands](COMMANDS.md).
- Complexity delta: một selector prefix 6 dòng, wiring preflight và 1 regression test để giữ prerequisite/dừng trước checkout; không thêm runtime layer, role, tool, parser, retry hay safety gate. Giữ nguyên 1 owner + 1 verifier.
- Worker runtime/shared source không đổi ở lượt này. Worker build được runner B1 thực hiện thành công trước hai range; không claim đã chạy lại worker typecheck/lint/full worker tests ở lượt này. Evidence của full39 trước vẫn là evidence lịch sử riêng.
- N1, cùng source/config, đánh giá target chọn từ fallback cũ. Không có independent quality panel hoặc phép đo ổn định mới. **SEND_ELIGIBLE không có nghĩa USABLE hoặc thuyết phục hơn.**
- Đọc actual replies vẫn thấy buying-concern dài/nhiều tính từ, câu partial-source kể việc “hệ thống/tra thông tin”, quote giải thích số tiền trong ngoặc, correction dùng “ghi nhận/giữ nguyên”. Không đổi rubric hoặc tuyên bố các vấn đề giọng này đã được giải quyết chỉ vì boundary PASS.
- A2 không chạy trong lượt này; A vẫn OWNER_BYPASS. T5 image comparison không dispatch trong phạm vi yêu cầu 19 target. Không tự chạy thêm hoặc fix tiếp.

## Whole-turn review sau yêu cầu owner

Đã review đủ 19 target và 4 prerequisite, gồm cả captured context/tool results: [đánh giá từng lượt, finding và root cause](REVIEW.md).

- Target: 15 dùng được (có polish), 3 cần sửa tư vấn/giọng (`b1-changed-occasion`, `b1-buying-concern-v2`, `stateful-correction`), 1 fallback.
- Prerequisite: actual cả 4 dùng được; một dựa vào native receipt recovery sau owner/verifier failure, không tính draft bị chặn thành quality PASS.
- Finding phân công: quote/receipt ưu đãi 30k đã có trong owner context nhưng không được dùng; data về eo/phom ở opening lại chưa đủ cho lời bảo đảm không bó. Phải phân biệt hai nguyên nhân này.
- Manual review N1, không blind/independent panel hoặc qualification; không đổi production prompt/code/verifier và không chạy thêm.

Recommendation: **STOP tại kết quả rerun; chưa B GO.** Hạn chế chất lượng và phần chưa nối/kiểm ở full39 vẫn giữ nguyên. [Toàn bộ actual conversations và rejected drafts](CONVERSATIONS.md).
