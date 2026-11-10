# Phase B — model run sau sửa binding/size, 2026-10-24

**5/5 SEND_ELIGIBLE,0fallback,0timeout/error. Cải thiện rõ về luồng giao dịch; chất lượng còn phần thừa. B chưa GO.** User yêu cầu một run trên bản đã được review. Run source `56884a58f54c4d383258483cfdc8086970d9c5e6` (executable reviewed `0383a4e8`); raw commit `d4d4fcf7` trước whole-terminal review.

Owner Vertex `gemini-3.5-flash-lite` HIGH/global, candidateCount1,maxOutputTokens8192,timeout90000ms,retry0. Verifier Sol6.1High qua bounded Codex login relay. N1 trên cùng5registered cases; runtime/corpus/fallback không đổi trong run. Source/prompt/schema/config/selection hashes trong [registration](registration.json), [preflight](PREFLIGHT.json). No provider substitution.

## Toàn bộ outcomes

| Ca | Kết quả thực | Nhận xét |
|---|---|---|
| ads có mã | Giá799k,sizeS/M/L/XL,2ảnh | Đã bind đúng từ seed[]; ngắn, đúng câu hỏi |
| hỏi lại giá | Giá799k,sizeS/M/L/XL,2ảnh | Giá đúng; lặp size và gửi lại ảnh dù firstContact=false |
| organic hỏi set | Giá799k +áo499k/chânváy449k,2ảnh | An toàn, nhưng vẫn mở thêm offer và CTA chung chung |
| ads thiếu mã | Xin ảnh/tên mẫu | Đúng hướng, không search menu gần nghĩa |
| giá bộ +áo lẻ | Giá799k/499k, thêm ngoặc449k,2ảnh | Trả đủ hai ý; còn giá phụ khách chưa hỏi |

[Exact terminal và review từng hội thoại](CONVERSATIONS.md). PRICE799000/499000/449000 và in-stock sizes S/M/L/XL đối chiếu đúng từng offer trong tool responses/trusted literals; không thấy protected factual error rõ ở năm replies. Đây là quan sát5caN1, không phải broad safety/quality qualification. Không tự coi send eligibility là whole-reply quality PASS. Media chỉ là capture delivery, không gửi khách thật.

## So với Flash Lite trước sửa

- Eligible3→5, fallback2→0, OWNER_TOOL_MODE1→0, verifier rejection1→0. Không timeout ở cả hai run.
- Ads giờ có subjects/currentProductId đúng ngay từ đầu, không search gần nghĩa; embedding3→0. Owner requests11→9. Điều này xác nhận đường binding đã hoạt động qua adapter thật ở run này.
- Organic run trước có openingQuoteS–XL nhưng verifier chỉ thấy stock tổng; run mới trusted sizeAvailability cùng list, verifier cho qua. Không sửa verdict cũ hoặc coi cũ tự động PASS.
- Giá/size/ảnh và reply ngắn cải thiện; **chọn offer và hành vi gửi lại ảnh chưa ổn định**. Organic vẫn read_product offerType=null dù khách hỏi set; vì vậy không có openingQuote ở ca này. Repeat có actual history và firstContact=false nhưng vẫn chọn ảnh. Đây là lỗi dùng dữ liệu/lựa chọn nội dung, không còn thiếu nguồn ads hay thiếu evidence size.
- Không thể quy toàn bộ mức cải thiện riêng cho code hay prompt từ hai runN1 với live reads/history khác nhau. Chưa kiểm ổn định nhiều mẫu hoặc fullB1/B2/B3.

## Accounting/verification

9owner+5verifier=14actual generation requests; tất cảHTTP200/OK và exact model versions.0automaticretry/0generationerrors/0timeouts. Fallback/handoff/no-send0/5. Verifier latency p50=4.596s,p95nearest-rank=5.579s,n5; wholeattemptp50=26.324s (trước29.382s), ownergenerationp50=3.411s. Không phải TTFT hoặc paired latency benchmark. Input97904/output7004 tokens theo telemetry; cost không expose, không tự tính. [Metrics](METRICS.json).

14actual requestwires kiểm evaluator-only keys:0leak; audit caseId wrapper không được gửi. Raw files hash khớp [RAW_HASHES](RAW_HASHES.json). Không sửa source/config giữa seal/preflight/dispatch; final clean/config checksPASS, output ngoài source rồi mới archive sau run. Isolated test database dropped; sendEnabled=false. [Commands](COMMANDS.json); preflight0generation/exit0, dispatch exit0/COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW. Lượt này không chạy lại unit/build/lint; implementation checks/reviewer evidence thuộc source0383a4e8, không mới hóa thành CI/providerfullPASS.

## Recommendation

Chấp nhận bằng chứng run này cho việc nối mã ads và chia sẻ size. Tiếp theo đánh giá phần nội dung còn thừa: ưu tiên đúng offer khi khách đã nói rõ; gửi ảnh theo nhu cầu và ảnh đã có trong actual history; tránh tự thêm bảng giá/CTA chung. Không thêm case regex, semantic router hoặc code viết lại reply. Không mở rộng toànB hay tự chạy thêm trong lượt này. B chưa GO; no live send/deploy.
