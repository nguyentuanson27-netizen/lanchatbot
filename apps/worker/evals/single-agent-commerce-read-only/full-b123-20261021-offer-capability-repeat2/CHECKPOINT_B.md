# Third full observation — không lỗi provider, còn hai fallback và hai câu cần sửa

2026-10-21. **FULL32_COMPLETE_QUALITY_NOT_COMPLETE**. Owner yêu cầu chạy thêm một lần, giữ nguyên code/prompt/model/config/corpus. Đủ24B1+8stateful, mỗi ca một lần, không retry/thay mẫu/quality early stop. A vẫn OWNER_BYPASS; chưa B/live GO.

## Identity và phạm vi

- Implementation `950d05b4d3279089b8c9a91d09e700f59731cdbb`; preparation base `47aa9e025e860ea88f0b49cdd944709167238a12`.
- Clean run source `a4e393e7c3084ac6ad29595c50f5925442c2f58c`.
- Raw commit `2c80adc2`; primary khóa tại `11019939`, trước verdict/rejected-draft diagnosis.
- Owner Vertex global `gemini-3.5-flash-lite`, HIGH; verifier OpenAI/Codex login `gpt-6.1-sol`, high, CLI0.159.2, không tool. Exact generation config/credential route trong REGISTRATION.json và child registrations.
- Owner prompt SHA256 `644d4535c9a2f73d5ef0203ddd2a6ce5b157a2cc51e62327ea5b14a623d1d361`,13.538bytes; verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
-14frozen files giữ nguyên. So với hai vòng trước, runtime/config/prompt/corpus không đổi; nguồn đọc live có thể khác theo thời điểm.

## Actual outcomes

| Population | Đủ outcome | USABLE | NEEDS_EDIT | UNUSABLE/fallback | Control |
| --- | --- | --- | --- | --- | --- |
| B1 | 24/24 | 20 | 2 | 2 | 0 |
| Stateful | 8/8 | 7 | 0 | 0 | 1 HUMAN |

[Toàn bộ32hội thoại](CONVERSATIONS_AND_REVIEW.md), [ca chưa đạt](FAILURES_AND_REVIEW.md), [primary](PRIMARY_REVIEW.json). Agent đọc actual/history/public state và khóa primary trước diagnosis; không blind/human adjudication. USABLE cho phép polish nhẹ, không đồng nghĩa giọng đã hay. Không chấm keyword/ngoặc/số tính từ, không ép áo lẻ hoặc phương án rẻ nhất.

**Hai fallback:**

1. **B1–2, đổi màu sau10ngày:** draft trả đúng15ngày/30k nhưng tự thêm “còn tem mác và chưa qua sử dụng là đủ điều kiện đổi màu”. Verifier FAIL/MATERIAL_CONDITION_LOSS. Source còn clean/undamaged/unwashed và giới hạn đổi theo policy. Điểm cần xem là bot đã chuyển từ trả thời hạn/phí sang tuyên bố điều kiện đủ; khác với việc một câu tóm tắt bình thường không liệt kê mọi điều kiện. Có cơ sở cho việc chặn lời khẳng định đủ này, nhưng không suy ra mọi câu trả thời hạn/phí phải đọc cả policy. Khách nhận fallback tĩnh, không nhận phần đúng.
2. **B1–17, cả bộ hay áo để gặp khách:** draft đã chọn áo499k phối quần âu/váy gọn, nhưng kết bằng “mặc đi làm rất vừa vặn và tiện”. Verifier FAIL/UNSUPPORTED_PROTECTED_ASSERTION, ref product:SV2447. Không có SIZE_FIT của khách trong ca này. “Vừa vặn” có thể được hiểu là vừa người, trong khi ý chính là chọn cách mặc đi làm. Đây là ca ranh giới ngữ nghĩa cần adjudication cả đoạn; schema verdict không trả span/lý giải, nên chưa chứng minh verifier chỉ dò keyword hoặc chắc chắn chặn sai. Không tự nới verifier hay viết lại rồi verify lại.

FAILURE_DIAGNOSIS.json giữ exact drafts/verdicts sau primary. Không có timeout/provider error trong hai ca này. Fallback frozen `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.”

**Hai câu gửi được nhưng cần sửa:**

- **B1–15:** khách nhờ shop chọn có nên mua vì sợ quá điệu. Bot khen dài, đưa áo lẻ và cả set, rồi kết “chị cân nhắc”. Lỗi cũ trả quyết định cho khách quay lại. Vấn đề là chưa giúp chọn, không phải do có hai phương án hoặc vài từ nối riêng lẻ.
- **B1–23:** khuyên cả bộ để tách phối/mặc nhiều dịp là upsell có lý do. Nhưng trong câu hỏi áo499k hay bộ799k, “tiết kiệm hơn hẳn so với mua lẻ” không nói đang so mua riêng cả hai món. Dễ làm khách hiểu bộ rẻ hơn lựa chọn áo đang cân nhắc. Cần phân biệt trả thêm300k để có thêm váy với tiết kiệm tiền. Ghi rủi ro comparator trong primary; không gắn nhãn cứ upsell là sai, không khẳng định có phép tính799<499 được viết trực tiếp.

## Stateful, freshness và recovery

Hành trình hoàn tất: beM×1 → beL×2 → tổng978100 (998000−49900+30000) → sửa eo74/mông96 giữL → code checkout invitation → private ORDER_PREVIEW/COD/pre-order/ETA8–14 → PURCHASE_CONFIRMED và tin chuyển nhân viên. Lượt8 là HUMAN silence control trong journey riêng. Không tạo đơn POS hoặc gửi Meta. DB thử mới đã xóa.

**Lượt2 dùng recovery có sẵn:** verifier trả PASS nhưng final gate phát hiện CURRENT_SNAPSHOT khác, expected/current revision đều6, reasonCodes rỗng. Model reply không được gửi bằng PASS cũ. Code dùng receipt-backed cart summary với đúng2áobeL/tổng978100/hàng đặt trước; actual dùng được dù giọng cơ học. Không generation retry, không làm lại mutation hoặc repair/reverify loop. Log chưa chỉ rõ trường làm snapshot đổi, không suy ra có inbound mới hay hàng đổi. RECOVERY_DIAGNOSIS.json giữ dấu vết.

Stateful–4 vẫn có “em đã cập nhật lại số đo”, bị động “vẫn được giữ nguyên”; không đọc lại số đo hoặc bịa fit nên USABLE có polish, giọng chưa đều. Hai model NO_SEND ở checkout có actual code-owned invitation/preview, không phải khách không nhận phản hồi.

## So sánh ba vòng cùng bản sửa

| Vòng/source | B1 USABLE | B1 NEEDS_EDIT | B1 fallback | Stateful USABLE | Lỗi hành trình/control |
| --- | --- | --- | --- | --- | --- |
| offer-capability /76d821bb | 23/24 | 1 | 0 | 4/8 | 1checkout error +2dependent blocks +1control |
| repeat /89c6965c | 20/24 | 1 | 3provider errors | 7/8 | 1control |
| repeat2 /a4e393e7 | 20/24 | 2 | 2verifier FAIL | 7/8 | 1control |

THREE_RUN_COMPARISON.json giữ đủ96registered outcomes và series từng case; COMPARISON.json so với vòng ngay trước. Không chọn best-of hoặc sửa historical primary. Tổng B1:63USABLE/4NEEDS_EDIT/5UNUSABLE trên72outcomes. Stateful:18USABLE/1UNUSABLE/2dependent blocks/3controls trên24outcomes.262generation requests,4provider errors, retry0. Các lượt dependent/control không phải model generations độc lập.

- B1–21 trả bán lẻ/cònM/499k rồi dừng ở cả3mẫu, không mời giỏ ngoài khả năng B1. B1–4 cả3mẫu trả799k trước và bỏ câu hỏi lại, nhưng vẫn tự thêm giá lẻ/bảng giá/mã: sửa được một phần, chưa gọn ổn định.
- B1–9 hai vòng trước không giúp chọn hoặc bảo đảm không bí khi đứng lâu. Lần này đưa áo499k phối đồ gọn thay set; không còn cam kết đứng lâu không bí. Primary USABLE có polish về nếu/hoặc/bóng râm, không coi một mẫu này đã giải quyết triệt để.
- B1–15 hai mẫu trước có lựa chọn chính, lần này lại trả hai cách mua rồi “chị cân nhắc”: lỗi quyết định tái diễn dù code/prompt không đổi.
- B1–17 hai vòng trước gửi được; lần này fallback ở diễn đạt có thể lẫn aesthetic appropriateness với fit. B1–2 cũng chuyển từ gửi được sang fallback khi owner tự thêm lời điều kiện đủ.
- Giọng B1–12/20/21 ngắn đúng trọng tâm. B1–3/11/19 vẫn còn văn phong hệ thống; B1–1 còn “chuyển giúp em” và lời khen dài; B1–15 có cách phủ định “lồng lộn/sến sẩm” chưa cần thiết. Không tạo blacklist từ hoặc bắt mọi câu theo một khuôn.

Kết quả chưa ổn định ở quyết định, phạm vi lời khẳng định và cách verifier hiểu câu tự nhiên. Hai vòng sau đi trọn checkout nhưng vẫn chỉ là ít mẫu; nguồn đọc live và review chủ quan. Không kết luận prompt tốt hơn theo số điểm tổng hoặc provider đã hết lỗi.

## Request accounting và audit

-89generation requests=61owner+28verifier; mỗi attempt1upstream, retry0. Provider error0/client timeout0. Verifier26PASS/2FAIL/0UNCERTAIN. Một PASS bị snapshot gate invalidated và được code recovery, không gửi model draft.
- B122SEND_ELIGIBLE+2FALLBACK; stateful4SEND_ELIGIBLE(gồm1receipt summary)+2NO_SEND(có code messages)+2HANDOFF(gồm1silence control). Final fallback2/32=6,25%, hoặc2/24B1=8,33%. Handoff2/32, modelNO_SEND2/32.
- Owner tokens253867input/36940output; verifier124795/2461. Usage đủ89/89, costNOT_EXPOSED.
- Verifier latency p50 **7778,70ms**, p95 **14750,43ms**, n28; owner per-generation p50 **2505,17ms**, p95 **7200,03ms**, n61. Hai workload khác nhau, không phải benchmark tốc độ hai model cùng nhiệm vụ.
- Added verification/readback B1 p50 **8582,37ms**, p95 **15897,40ms**, n24; stateful p50 **15854,34ms**, p95 **17474,01ms**, n4. Không gồm setup/source builds của child.
- Embedding2requests: source-check1+B1final cumulative1+stateful0. Không cộng lặp cumulative counters.
-61exact owner prompt captures/28verifier bindings recomputed/93wire bodies audit/0evaluator-label leaks/25exact generated eligible text matches. Code-owned receipt summary kiểm riêng với committed cart; không ép nó khớp model draft.45published raw hashes/45Git blob hashes đúng:37exact copies+8public attempts chỉ bỏ private synthetic ingress batch, originals giữ task-temp.14frozen files unchanged; public secret/private-phone scan PASS.
- Fresh provider/source preflight và fresh isolated stateful DB cleanup PASS. Reuse COD28/28+BANK28/28 của76d821bb vì implementation/config không đổi; không claim chạy lại hai job này.147tests/build trên implementation950d05b4 là evidence cũ; entrypoint vẫn tự build worker khi chạy, không claim chạy thêm full suite/lint/typecheck.

## Commands và disposition

```text
python apps/worker/evals/single-agent-commerce-read-only/full-b123-20261021-offer-capability-repeat2/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-full-b123-20261021-offer-capability-repeat2
```

Exit0;4child commands exit0: provider-preflight/source-check/stateful-1/b1-1. Exact commands/logs trong raw. Collector exit0 nghĩa là thu đủ outcomes, không có nghĩa tất cả câu trả lời đạt.

Collection/review/audit thực sự dùng task-temp c3-gemini-prompt-once-publish.py, c3-gemini-prompt-once-primary.py, c3-full-b123-metrics.py, c3-offer-capability-repeat2-report.py, c3-full-b123-repeat-audit.mjs; one-off hash/secret/Git-blob/public-state comparisons và tổng hợp3primary đã khóa. Không đọc rejected draft/verdict trước primary. Runtime source/config không thay trong run.

**STOP_AT_OWNER_REVIEW.** Không tự sửa/chạy thêm hoặc rerun hai fallback. Những gì cần phân biệt nếu owner yêu cầu xử lý tiếp: câu hỏi thời hạn/phí với lời xác nhận điều kiện đủ; lời khuyên cách mặc với fit cá nhân; trả thêm tiền để có thêm đồ với comparator tiết kiệm; quyết định mua với liệt kê lựa chọn. Không tự thêm regex/template/role/gate để xử lý các ca này. Complexity delta của vòng này:0runtime logic/role/state/tool mới, chỉ registration/copywrapper/evidence/report. Không deploy/live send/promotion; không tuyên bố safety proof hoặc stability GO.
