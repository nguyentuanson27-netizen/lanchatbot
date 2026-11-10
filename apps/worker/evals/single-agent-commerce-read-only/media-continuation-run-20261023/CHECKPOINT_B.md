# Phase B — bảy lượt media và tư vấn mua hàng

**COMPLETE 7/7; B chưa GO.** Source `4564b7fb5016cd636533697227ae9700d8a66591`, executable/config worktree sạch; preflight PASS trước dispatch. N1, tối đa 28 generations, thực tế 25 = 18 owner + 7 verifier. Gemini 3.5 Flash Lite HIGH / GPT-6.1 Sol HIGH, config/prompt/schema/corpus/tool hashes trong [registration](current-source/registration.json) và [outer registration](REGISTRATION.json). Không sửa source giữa run, không retry/rerun hoặc loại lỗi khỏi denominator.

Nguồn ảnh hiện tại, không bật `--assume-feedback`. Owner xác nhận feedback sẽ nằm cùng nguồn ảnh nhưng chưa bổ sung; lượt này đo cả nhánh thiếu dữ liệu. Capture delivery qua ingress/DB riêng, không live Meta send. [Toàn bộ hội thoại và draft chưa gửi](CONVERSATIONS.md), [metrics](METRICS.json), [outcomes/ảnh](OUTCOMES.json).

## Kết quả từng lượt

| Lượt | Actual terminal | Review |
|---|---|---|
| feedback → tổng thể: hỏi feedback | FALLBACK / FAIL | Owner tra đúng feedback, nhận NO_VERIFIED_MATCHING_MEDIA cùng các lựa chọn khác; đã chọn ảnh chi tiết thay. Verifier chặn draft báo set hiện chưa có ảnh khách mặc. Actual chỉ là static fallback, không giao ảnh đã chuẩn bị. |
| feedback → tổng thể: xin ảnh cả bộ | SEND_ELIGIBLE | Dùng lịch sử fallback thực, gửi hai ảnh FRONT/BACK đúng mẫu theo metadata đã duyệt. Lời dẫn ngắn, dùng được. |
| feedback → chi tiết: hỏi feedback | FALLBACK / FAIL | Cùng vấn đề báo chưa có feedback; verifier trỏ media-lookup. Owner đề nghị ảnh chi tiết nhưng actual là fallback. |
| feedback → chi tiết: xin cận phần thêu | SEND_ELIGIBLE | Đúng ảnh DETAIL/CLOSEUP của áo, lời dẫn ngắn, không hỏi lại mẫu/loại ảnh. Dùng được. |
| ảnh + giá áo lẻ | SEND_ELIGIBLE | Giá AO 499.000đ đúng nguồn; gửi hai ảnh mẫu mặc cả bộ, không gọi là feedback khách. Không bỏ phần giá vì thiếu feedback; lời dẫn dùng được. Tuy vậy chưa giải thích trực tiếp rằng đang thay feedback bằng ảnh mẫu, chỉ phân biệt bằng cách gọi tên. |
| ảnh + size từ 1m58/52kg | FALLBACK / FAIL | NO_VERIFIED_CHART, recommendedSizes rỗng và action HANDOFF. Owner vẫn khẳng định vừa vặn/thoải mái, không trả size hoặc xử lý handoff. Verifier chặn đúng khẳng định fit chưa có căn cứ; actual fallback lại chỉ hỏi ảnh nên bỏ yêu cầu size. |
| concern ren đi cưới buổi trưa | NO_SEND / EGRESS_WORLD_CHANGED | Verifier PASS nhưng egress binding/revision check không khớp. Không có tin/ảnh được giao. Draft nhiều tính từ, hai hướng mua rồi chưa giúp chọn rõ; không được dùng draft này tính chất lượng actual reply. |

3 SEND_ELIGIBLE / 3 FALLBACK / 1 NO_SEND; fallback 42,9%, no-send 14,3%, cộng 57,1%. Semantic verifier 4 PASS / 3 FAIL; một PASS không trở thành send eligibility vì code chặn egress. Đánh giá actual: 3 lượt dùng được, 3 fallback chưa giải quyết nhu cầu, 1 không có câu trả lời. Không diễn giải 3/7 là conversion hoặc kết luận tính ổn định từ N1.

## Findings và phạm vi nguyên nhân

1. **Luồng tiếp nối hoạt động trong cả hai nhánh đã chạy.** Provider nhận history terminal thực và product hiện tại; reply sau fallback gửi đúng ảnh theo metadata/capture. Không cần synthetic shop history hoặc parser định tuyến.
2. **Thông tin thay thế đã đến owner/verifier, nhưng chưa giải quyết cách hiểu câu thiếu feedback.** Hai request đều chứa FEEDBACK không giới hạn component/color, danh sách loại ảnh khác và scoped observation. Verifier FAIL với ref media-lookup. Khả năng bất đồng giữa “chưa có ảnh khách mặc mẫu này” và “không có asset đủ điều kiện trong nguồn đang tra” là giả thuyết mạnh; verdict không có clause/explanation nên chưa quy chính xác sole cause hay tự gọi false reject. Không phải lỗi chưa cấp negative evidence như trước.
3. **Size có hai nguyên nhân rõ:** nguồn không có chart đã duyệt, owner bỏ kết quả NO_VERIFIED_CHART để suy fit từ chiều cao/cân nặng và mô tả chất liệu. Ban đầu quote chứa nhiều giá trị bị từ chối; owner sửa patch trong native continuation rồi recommend_size, tất cả generation vẫn giữ accounting. Hai bản toolResponses có thể lặp cùng call vì mỗi request giữ transcript, không được đếm chúng như nhiều execution/retry độc lập. Đây không phải automatic generation retry.
4. **Concern có lỗi egress cần chẩn đoán riêng.** EGRESS_WORLD_CHANGED bao gồm revision/current binding/snapshot mismatch, chưa lưu đủ hai binding tại đúng thời điểm để xác định field nào đổi. Chưa đủ bằng chứng nói nguồn thật đổi hay snapshot không ổn định; không nới gate. Cần tái hiện với trace binding đã làm sạch trước/sau readback trước khi chọn bản sửa.
5. **Giọng concern còn yếu:** “bay bổng thanh nhã”, “sang trọng và vừa vặn”, “đồng bộ và tôn dáng nhất”; phần trả lời chưa tập trung vào một lý do mua liên quan, vẫn thiên mô tả/quảng cáo. Đây là draft chưa giao, chưa có bằng chứng sửa được giọng qua lượt này. Ba reply thực được gửi thì ngắn và không có đoạn nhồi mô tả.
6. **Fallback chỉ hỏi ảnh vẫn thiếu cho yêu cầu hỗn hợp khi whole draft FAIL.** Test trước chứng minh PASS giữ giá; run này cho thấy FAIL có thể mất phần size. Không tách câu từ draft bị chặn để gửi; chưa giải quyết được hạn chế này.

Hướng tiếp theo cần dựa trên evidence: chẩn đoán egress bằng hai binding; đối chiếu semantic scope của negative media observation với verifier; xử lý NO_VERIFIED_CHART đúng khả năng/handoff đã nối. Không thêm regex hoặc tiếp tục thêm một đoạn giọng chung để chữa cả ba. Chưa tự sửa/rerun tiếp hoặc chạy full B1/B2/B3 trong campaign này.

## Vận hành và kiểm chứng

- 25/28 requests, 0 provider error/timeout, không retry; cả 7 verifier đều thực sự chạy. Không generation để dò quota.
- Verifier latency p50 9,08s / p95 10,18s; đoạn verification + readback p50 13,04s / p95 14,51s theo telemetry của runner. N nhỏ.
- Input 149.715 / output 12.245 tokens; provider không expose cost. [Metrics](METRICS.json).
- Recursive scan captured OWNER_REQUEST/VERIFIER_REQUEST value: không caseId/evaluator/purposeId/expectedSafe/qualityScore hoặc credential keys. Metadata ngoài request vẫn giữ caseId để audit.
- Cả 7 provider attempt files giữ nguyên; ảnh có public URL/type/sequence trong capture. Không đánh giá pixel/ảnh mặc thực từ metadata; không tải ảnh để lách hiển thị.
- DB test đã drop: `testDatabaseDropped=true` trong [integration](current-source/integration.json). Không mutation nguồn shop, không deploy/live send.
- Exact lệnh launcher, arguments và exit codes: [commands.json](commands.json); preflight và run đều exit 0. Đã chạy `python ../c3-b-media-continuation-run-20261023/run.py` và `python ../c3-b-media-continuation-run-20261023/collect.py`, recursive audit, số file/DB-drop checks và git diff/hash verification.
- Source không thay đổi nên không lặp test suite/build/lint đã PASS tại source commit. Không claim CI hoặc full regression mới. Run reports không thay frozen source để ghi source SHA ngược vào nó.

Recommendation: **STOP để xử lý findings; B chưa GO.** A vẫn OWNER_BYPASS. Không coi PASS semantic là đạt mục tiêu bán hàng.
