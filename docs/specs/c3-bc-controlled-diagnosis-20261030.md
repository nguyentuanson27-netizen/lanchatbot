# Đối chứng B–C trên các ca B từng gửi được

Owner yêu cầu dựng đối chứng giữ nguyên dữ liệu/context để tách hồi quy code, freshness, context/search và độ không ổn định owner. Đây là development diagnosis; không matched C3 architecture comparison, không qualification, không sửa runtime/prompt hoặc dữ liệu shop.

## Source và quần thể khóa trước kết quả

- B: `4efbea67356f1e3e4f7fa886dec48d58c4ab1474`, full media/size repeat27/10; build trong detached worktree riêng.
- C: `ec46829325378e4a2d5fc126a0cd4224e6febbcf`, executable giống run89070980/code97c6ce86. Diagnostic scripts mới có implementation/source SHA riêng lúc seal.
- Sáu actual B SEND_ELIGIBLE: b1-price, b1-search-read-v2 (Khánh Trang), b1-current-policy, sales-size-advice:height-weight, media-and-size:ask, stateful-quote. Eligibility cũ không tự là sales-quality PASS.
- Exact old runtime request, replies, verifier trusted frame và historical clock lấy từ raw B đã hash. Không viết lại câu khách, history, model prompt hoặc đáp án. Không dùng kết quả mới để chọn lại sáu ca.
- Frozen world C107products dùng chung cho cả code arms khi cần replay source ports. Đây là cùng dữ liệu giữa hai arms, **không nhận là full historical B database snapshot**; lịch sử không giữ đầy đủ POS/search của mọi case.

## Bốn phép tách

1. **Code:** cùng captured trusted/draft/clock qua hardPrecheck B và C; cùng world/query/clock qua read_product/read_policy, tuple selector và size engine hiện hữu. Clock capture là turn start, không phải final gate time: kiểm tra thêm mốc suy ra ngay sau mọi observedAt, ghi rõ DERIVED_LOWER_BOUND_NOT_CAPTURED_FINAL_GATE_TIME. Scripted tool calls không phải generation hoặc E2E outcome mới. Lưu cả source-derived response, bytes, disposition/reason và authority checks. Không stub PASS/receipt để nhận thành eligibility.
2. **Freshness:** cùng ảnh, cùng code; chỉ đổi evaluation clock quanh expiry và mốc capture/run thực. Không sửa observedAt/hash/source. Đây là offline time counterfactual cho media; không dời clock toàn bộ POS/policy để giả dữ liệu hiện hành.
3. **Context/search:** cùng world/clock/tools, thay đúng initial binding một sản phẩm vs hai sản phẩm hoặc đọc đủ policy vs chưa đọc. Ghi field/source coverage trước owner; không suy model chắc chắn sẽ hành động theo coverage. Với search, đối chiếu exact original C query/result và known bound refs; không gọi frozen exact-cosine là parity với lịch sử live Qdrant HNSW. Lịch sử không lưu đủ index/vector thì giữ causal attribution của search algorithm UNRESOLVED.
4. **Owner:** replay nguyên body request đầu của từng sáu ca B, Gemini3.5FlashLite HIGH, ba registered attempts/case, max18generation requests. Mỗi request cùng byte hash trong một case; không sửa prompt/context/time/tools/generation config, không thêm labels vào body. Kết quả tool chỉ ghi lại, **không thực thi**; không verifier/send/effect. Đây là one-step owner variability, không whole-turn quality/stability qualification. Khác opaque thought signature/call ID không tính là khác quyết định; normalize chỉ những field vận chuyển này ở analysis copy, raw giữ nguyên. Cùng output3lần không chứng minh ổn định tổng quát. Không majority vote/best-of.

## Accounting và điều kiện chạy

Build exact B/current C trước dist-consuming offline checks. Source files và input/artifact/body hashes vào registration; seal sạch trước inference. Tối đa1 generation HTTP/registered attempt, retry0; auth/error/timeout giữ trong denominator. In-flight/pending accounting hoặc source identity thay thì dừng; không gọi lại attempt. Auth refresh chỉ attempt sau; giữ request/error/usage/latency/cost-null accounting. Raw/config/results ngoài checkout, create-once. Model route giữ existing scoped Vertex credential, không print/commit secret.

Provider API giữ exact captured native body và existing endpoint/JWT helper/parser. Đã kiểm official Google generateContent reference trước implementation: https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/projects.locations.publishers.models/generateContent . Không dùng framework/provider mới. Offline tests dùng local stub rõ ràng, không claim provider evidence.

Verification: focused diagnostic tests cho tampering/evaluator-label firewall/body equality/attempt denominator/retry/opaque-signature normalization; current worker dist byte compatibility; offline paired results trên hai source builds; owner repeats chỉ sau seal. Không tăng test population sau kết quả. Không auto fix candidate sau diagnosis. Final report tách measured/code-determined/source-supported và unknown, không gộp tỷ lệ B/C khác mẫu số.
