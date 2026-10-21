# Full B1/B2/B3 — B1 cải thiện, checkout bị lỗi provider

2026-10-21. **FULL32_COMPLETE_JOURNEY_NOT_COMPLETE**. Đã ghi đủ24B1+8stateful, một lần/ca, không quality early stop, retry hoặc mẫu bù. A vẫn OWNER_BYPASS; chưa B/live GO.

## Nguồn và cấu hình

- Implementation base `950d05b4d3279089b8c9a91d09e700f59731cdbb`.
- Clean run source `76d821bb3dce1ee335d2210203e9ff8750762755`.
- Raw commit `a79d549d`; primary khóa trước diagnosis tại `552260a7` (commit này đồng thời giữ exact CRLF raw metadata bằng run-scoped attributes).
- Owner Vertex global `gemini-3.5-flash-lite`, HIGH; verifier OpenAI/Codex login `gpt-6.1-sol`, high, CLI0.159.2, không tool. Exact config ở REGISTRATION.json và raw child registrations.
- Owner prompt SHA256 `644d4535c9a2f73d5ef0203ddd2a6ce5b157a2cc51e62327ea5b14a623d1d361`,13.538bytes; verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
-14frozen files giữ nguyên qua run. Không sửa prompt/model/corpus giữa lượt.

## Kết quả whole-turn

| Population | Đủ outcome | USABLE | NEEDS_EDIT | UNUSABLE | Blocked phụ thuộc | Control |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | 24/24 | 23 | 1 | 0 | 0 | 0 |
| Stateful | 8/8 | 4 | 0 | 1 | 2 | 1 HUMAN |

[Toàn bộ32hội thoại](CONVERSATIONS_AND_REVIEW.md), [các ca chưa đạt/blocked](FAILURES_AND_REVIEW.md), [primary](PRIMARY_REVIEW.json). Reviewer là agent, không human/blind adjudication. Đọc actual terminal, history và public committed state trước verdict/rejected-draft diagnosis. USABLE cho phép polish nhỏ; không có nghĩa giọng đã hay hoặc ổn định.

**B1–9 còn cần sửa:** khách đổi tiệc ra ngoài trời lâu, dễ nóng. Bot vẫn liệt kê tơ/ren/thoáng nhẹ để trấn an rồi khuyên đứng bóng râm hoặc mang quạt mini. Chưa giải quyết lựa chọn trang phục/cách mặc; đây là lỗi tư vấn còn lặp. Không dùng việc này để cấm mọi suy luận chất liệu hoặc yêu cầu thêm test riêng cho mọi lợi ích.

**Stateful–5 thất bại vận hành:** owner generation trả HTTP429, không có draft được verifier đánh giá. Recovery gốc là FALLBACK/PROVIDER_ERROR, nhưng final actual là NO_SEND/EGRESS_WORLD_CHANGED, khách không nhận tin mời checkout. Stage giữ CART_OPEN. Lượt6/7 bị CHECKOUT_INVITATION_NOT_COMPLETED, không gọi model thêm; giữ đủ denominator, không tính thành ca code thành công. Không kết luận có inbound mới hoặc catalog đổi: log chỉ ghi nhóm lỗi egress, chưa chỉ rõ trường binding/revision mismatch. HTTP429 chưa phân biệt quota với capacity. [Diagnosis](OPERATIONAL_DIAGNOSIS.json).

Stateful1–4 thêm beM×1 → đổi beL×2 → quote998000−49900+30000=978100 → sửa eo74/mông96, vẫn đúng giỏ và tổng. Lượt8 là HUMAN ownership silence đúng trong journey riêng. Không tạo đơn POS, không gửi Meta. Ba DB thử đều đã xóa.

## So với full reply-focus trước

Trước: B120USABLE/4NEEDS_EDIT; stateful7USABLE/1control. Lần này: B123USABLE/1NEEDS_EDIT; stateful4USABLE/1UNUSABLE/2dependent blocks/1control.

- **B1–4:** báo799k cả bộ trước, bỏ câu hỏi lại mua bộ hay lẻ. Vẫn thêm499k/449k không được hỏi và mã sản phẩm: cải thiện một phần, còn polish; không fail chỉ vì có hai giá thêm khi câu hỏi chính đã được trả rõ.
- **B1–15:** chọn áo499k phối đồ trơn khách có; không còn đưa cả ba cách mua rồi để khách tự cân nhắc. Có lựa chọn và cách xử lý lo quá điệu. Còn mở đầu dài, nếu/em gợi ý và câu lấy thử chưa gọn.
- **B1–21:** trả bán lẻ/cònM/499k rồi dừng; không mời thêm giỏ ngoài capability B1.
- **B1–9:** vẫn chưa chuyển lời nhắc chung thành lời khuyên mua hữu ích; bản sửa chưa giải quyết được ca này.
- **Stateful–4:** thao tác state đúng nhưng lời xác nhận quay lại báo cập nhật số đo/giỏ giữ nguyên. Không đọc lại cả ba vòng và không bịa fit, nên USABLE có polish; kém gọn hơn câu đáp của vòng trước.
- B1–17 lần này chọn cả bộ với lý do đồng bộ/lịch sự; không phạt vì upsell hay không chọn áo lẻ. Lý do còn chung, nhiều tính từ. B1–23 chọn áo tận dụng váy đen dùng được, đoạn thêm bộ/ngân sách còn thừa. B1–3/11/19 cố ý thiếu POS; không bịa giá/tồn, nhưng văn phong hệ thống/tham khảo chất liệu giúp em còn kém.

Không quy cải thiện cho một thay đổi riêng: prompt/tool description và execution projection cùng đổi, nguồn đọc live, mỗi ca N1. Cần giữ khác biệt giữa biểu hiện đã cải thiện, lỗi vận hành và chất lượng giọng. Lịch sử primary cũ bất biến. COMPARISON.json ghi từng ca.

## Verifier và terminal accounting

28verifier attempts đều PASS,28exact eligible replies khớp binding. B124SEND_ELIGIBLE; stateful4SEND_ELIGIBLE/3NO_SEND/1HANDOFF. Final fallback0/32 nhưng có1provider failure dẫn NO_SEND và2dependent blocks: **không diễn giải fallback0 là toàn hành trình thành công**. HUMAN control là1/32, không phải một lượt model chốt đơn thành công.

Fallback frozen `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.” Không được gửi trong32actual outcomes. Không có lỗi timeout hoặc verifier reject; PASS không chứng minh toàn bộ protected semantics an toàn ngoài tested population/configuration. Không thay rubric/verifier để làm đẹp kết quả.

## Vận hành và provenance

-88generation requests =60owner+28verifier; mỗi attempt1upstream, retry0.1owner HTTP429/88requests (1,14%),timeout0; owner usage thiếu đúng1lượt lỗi. CostNOT_EXPOSED.
- Owner token input244001/output38802 từ59lượt có usage; verifier124486/2038 đủ28lượt. Không ước tính token của429 bị thiếu.
- Verifier latency p50 **5849,80ms**, p95 **8483,44ms**, n28. Owner per-generation p50 **2738,05ms**, p95 **6651,21ms**, n60; không phải benchmark tốc độ hai model trên cùng workload.
- Added verification/readback B1 p50 **6573,04ms**, p95 **9911,46ms**; stateful p50 **9115,21ms**, p95 **10189,78ms**, chỉ4lượt có measurement. Không gồm setup/source build của child.
- Embedding2requests: source-check1+B1final cumulative1+stateful0; không cộng cumulative counters mỗi attempt.
-60owner exact prompt captures/28bindings recomputed/92wire bodies audit/0evaluator-label leaks/28exact eligible text matches.49published raw hashes và49Git blob hashes đúng.43exact copies+6public attempt copies chỉ bỏ private synthetic ingress batch; task-temp originals giữ lại. Hai raw metadata CRLF được giữ bằng scoped `raw/** -text`, không đổi model/source.
- COD28/28 vàBANK28/28PASS,3DB disposable dropped. Nguồn live read-only, mutation chỉ trong DB thử, capture-only delivery. Không PII/secrets trong published artifacts theo kiểm tra đã ghi.

## Commands thực sự chạy

```text
python apps/worker/evals/single-agent-commerce-read-only/full-b123-20261021-offer-capability/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-full-b123-20261021-offer-capability
```

Exit0; cả6child commands exit0: provider-preflight,source-check,deterministic-cod,deterministic-bank,stateful-1,b1-1. Exit0 của collector nghĩa là thu đủ outcome, không có nghĩa checkout thành công. Exact commands/logs trong raw/commands.json và raw/*.log.

Collection/review/audit thực sự dùng task-temp `c3-gemini-prompt-once-publish.py`, `c3-gemini-prompt-once-primary.py`, `c3-full-b123-metrics.py`, `c3-offer-capability-report.py`, `c3-full-b123-audit.mjs`; one-off frozen-input/secret-scan/Git-blob comparisons. Primary commit trước diagnosis. Initial staged diff check báo10 dòng trailing spaces do exact provider text trong hai transcript Markdown; giữ nguyên lời model và thêm scoped whitespace attributes cho đúng hai artifact đó. Full-run diff check còn nhận CRLF của92 dòng metadata gốc là trailing whitespace; khai báo raw whitespace=cr-at-eol, giữ exact bytes. Final full-run diff check PASS.147focused tests và worker build là evidence trên implementation950d05b4; không claim chạy lại full tests hoặc riêng lint/typecheck trong lượt này. Runner tự build worker trước các child dùng dist.

## Finding và hướng tiếp theo

Tách hai việc nếu owner yêu cầu sửa tiếp: (1) availability/recovery của HTTP429 và lý do final recovery bị egress chặn, giữ fail-closed/no-retry; (2) khả năng tư vấn khi hoàn cảnh đổi, tránh lời khuyên sinh hoạt thay cho lựa chọn trang phục. Không lấy lỗi429 làm căn cứ sửa prompt hoặc nới verifier. Với phần giọng, ưu tiên đúng trọng tâm; không thêm blacklist từ, cấm tính từ/ngoặc hoặc ví dụ benchmark.

**STOP_AT_OWNER_REVIEW.** Chưa hoàn tất hành trình B2/B3 trong run này, chưa live GO; không tự chạy lại429 hay dependent slots, không auto fix/run/deploy. Complexity delta của lượt chạy:0runtime logic/role/gate/tool/parser mới; registration/copywrapper, bằng chứng và attributes giữ raw bytes. Bản implementation hiện hành giữ nguyên.
