# Phase B — Flash Lite opening-quote comparison, 2026-10-24

**Đủ5/5, runner/preflight exit0, vẫn chưa đạt mục tiêu báo giá mở đầu. B chưa GO.** Owner yêu cầu chạy lại với3.5FlashLite. Source `aae7cf78f2745b63eef6bb74d8e010bad57a0976`, raw commit `27b540c6`. Owner Vertex `gemini-3.5-flash-lite` HIGH/global, candidateCount1,maxOutputTokens8192,timeout90000ms,retry0. Verifier vẫn Sol6.1High qua Codex login relay. Prompt/schema/corpus/sourceConfig/selection hashes và verifier config byte-equal với registration run3.8; chỉ model owner và candidateCount tương ứng API thay đổi. Không sửa bug ads hoặc prompt giữa hai run.

## Toàn bộ kết quả

| Ca | Flash Lite terminal | So với3.8 |
|---|---|---|
| ads có mã | FALLBACK/OWNER_TOOL_MODE | Cùng thiếu subject;3.8 hỏi lại,3.5 gọi tool quá pha |
| hỏi lại giá | SEND_ELIGIBLE | Hết request-bound failure; nhưng hỏi lại khách qua menu sản phẩm không đúng mẫu |
| organic hỏi set | FALLBACK/verifierFAIL | Owner chọn đúng SET_VAY và dùng card, ngắn hơn; size claim bị chặn |
| ads chưa có mã | SEND_ELIGIBLE | Không đoán giá nhưng đưa menu3mẫu không liên quan |
| giá bộ + áo lẻ | SEND_ELIGIBLE | Trả đủ2giá và2ảnh;3.8timeout. Còn ngoặc dài, tính từ thừa |

[Exact histories và nhận xét từng lượt](CONVERSATIONS.md). Ba SEND_ELIGIBLE không phải ba qualityPASS. Fallback2/5=40%; không handoff/no-send. Không thấy protected factual error rõ ở ba final texts được cho qua; không qualification ngoài dân số5lượt.

## Finding

- Root cause ads còn nguyên: ingress exact-code lookup đi vào adapter chỉ đọc sản phẩm `known`, seed[] bị UNBOUND_PRODUCT; owner không được nhận SV2447. Không dùng đổi model để sửa lỗi cấp context. Cả run đều xác nhận phần này chưa nối kín.
- Flash Lite dùng tool thêm sau final-only phase ở caads: 3owner HTTPgenerations, lần3 trả tool thay final, bị OWNER_TOOL_MODE. Không automatic retry; chưa có final text nên không verifier.
- **Lệch meaning/evidence size giữa card và trusted verifier.** Organic read_product(SET_VAY) trả openingQuote:799k + Size:S,M,L,XL. Owner nói “có sẵn các size từ S đến XL”. Verifier chỉ thấy STOCK tổng39, chặn vì thiếu dải/tồn từngsize. Danh sách size có trong card không chứng minh tồn từngsize; cũng không đúng khi nói owner tự bịa toàn bộ danh sách. Cần kiểm size catalog so với available stock và cách truyền evidence thống nhất, trước khi quyết nới verifier hay sửa lời owner. Không đổi verdict sau run.
- Giọng3.5 gọn hơn caorganic nhưng multipart vẫn nhồi vật liệu vào ngoặc; unresolved lại menu hàng. Chưa thể kết luận giọng tự nhiên ổn định chỉ từ5caN1.

## Tốc độ và accounting

| Đo thực tế |3.5FlashLite|3.8Flash|
|---|---:|---:|
| Whole-attempt p50 |29.38s|60.52s|
| Successful owner generation p50 |3.20s(n10)|18.59s(n8)|
| Verifier p50/p95 nearest-rank |6.22s/7.56s(n4)|4.81s/5.93s(n3)|
| Actual owner+verifier generation requests |11+4=15|9+3=12|
| Timeout |0|1|
| Fallback rate |40%|40%|

Đây là thời gian hoàn tất request/lượt, không TTFT. Hai run có actual tool paths/history/request bytes khác nhau và live source reads, không phải paired byte-identical prompt benchmark; chỉ kết luận3.5 nhanh hơn ở population đo được. Verifier latency khác dù model không đổi.15generation requests, không embedding (3embedding ghi riêng). Tất cả registeredattempts giữ denominator,0automaticretry. Owner mode failure được runtime gắn PROVIDER_ERROR nhưng không phải HTTP/timeout. Token usage reported102176input/9899output; cost không expose, không tự tính từ giá nhớ. [Metrics](METRICS.json).

15 actual owner/verifier request wires kiểm evaluator-only keys,0leak; audit wrapper caseId không vào wire. Raw hashes xác minh trước review. Registration/source/prompt/config rõ trong [registration](registration.json), [preflight](PREFLIGHT.json), [commands](COMMANDS.json), [firewall](LABEL_FIREWALL_AUDIT.json). Node adapter/protocol/registration86PASS trước seal; không chạy mới build/lint vì chỉ đổi manifest, executable worker không đổi.

Output ở ngoài source tree trong dispatch; final source/config checkPASS, runner statusCOLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW; sau đó mới archive raw vào repo. Isolated database dropped, no live send/deploy. Run3.8 giữ nguyên lỗi finalcleanliness của nó, không lấy successful run này xóa lỗi cũ.

**Recommendation STOP sửa bind nguồn và nghĩa size/evidence trước run mới.** BnotGO; không tự fix/retry/run thêm.
