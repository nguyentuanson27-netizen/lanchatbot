# Full B1/B2/B3 — đủ 32 lượt, không fallback, còn 4 ca cần sửa

2026-10-21. **FULL32_COMPLETE_REPLY_QUALITY_NOT_COMPLETE**. Owner yêu cầu chạy model sau bản sửa26e36330. Đã chạy24B1 và8stateful, mỗi ca một lần, không dừng giữa chừng vì chất lượng, không retry/mẫu bù. A vẫn OWNER_BYPASS; chưa có B/live GO.

## Nguồn và cấu hình

- Implementation base: `26e36330ba78b9f88903d93f850282151fde0e3a`.
- Clean run source: `2bc7d5d27a9d1f14c30e5911501263c4ca070ca4`.
- Raw outcomes commit `43b38038`, child logs `dc6b0b97`, primary locked trước diagnosis tại `d5c9eb7902aa234b77daa07d462605f135d94d02`.
- Owner: Vertex global `gemini-3.5-flash-lite`, HIGH; verifier: OpenAI/Codex login `gpt-6.1-sol`, high, CLI0.159.2, toolsnone. Exact generation config/corpora/schema/fallback identities ở REGISTRATION.json và raw child registrations.
- Owner prompt SHA256 `0a0036241f408fef5959ab871de22af3f02eb7496130187028e0d507f924d07d`,12.848bytes; verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Source/config14files giữ nguyên qua run và primary. Không tạm pin hoặc restore prompt; bản sửa hiện hành vẫn là bản đã chạy.

## Kết quả toàn hội thoại

| Population | Đã chạy | USABLE | NEEDS_EDIT | Fallback | Control |
| --- | --- | --- | --- | --- | --- |
| B1 | 24/24 | 20 | 4 | 0 | 0 |
| B2/B3 stateful | 8/8 | 7 | 0 | 0 | 1 HUMAN silence |

Agent đọc toàn bộ lịch sử, actual terminal và public committed state trước khi xem verifier diagnosis. Không có blind/human adjudication. USABLE chấp nhận polish nhẹ, không có nghĩa giọng đã hay hoặc bán hàng ổn định. [Toàn32hội thoại](CONVERSATIONS_AND_REVIEW.md), [4ca cần sửa](FAILURES_AND_REVIEW.md), [primary](PRIMARY_REVIEW.json).

**Bốn ca còn cần sửa:**

1. **B1–4:** hỏi giá set nhưng vẫn liệt kê cả bộ/áo/váy rồi hỏi lại mua phần nào. Chỉ dẫn trả đúng phạm vi chưa có hiệu quả trong ca này.
2. **B1–9:** bỏ được bảo đảm không bí, nhưng câu “chị lưu ý phần áo có thêu nổi nha” không giải thích ảnh hưởng hoặc giúp chọn cách mặc/món phù hợp khi ở ngoài trời lâu. Bớt overclaim chưa đồng nghĩa tư vấn hữu ích hơn.
3. **B1–15:** mở bằng câu nếu nhắc lại gu đồ trơn, khen dài, đưa cả bộ/áo/váy rồi để khách tự cân nhắc. Có hướng phối nhưng chưa giúp quyết định rõ theo câu hỏi có nên mua không.
4. **B1–21:** giá/tồn đúng nhưng mời thêm giỏ khi B1 không có add_to_cart. Lỗi capability cũ đổi từ “lên đơn” sang “thêm giỏ”; lời mời không phải effect đã thực hiện.

Các ca7/23 vẫn còn nhiều lời khen/budget recap nhưng có lựa chọn và lý do thẩm mỹ/upsell dùng được theo rubric đã khóa. Không fail vì tính từ, ngoặc, nhiều giá hoặc không chọn phương án rẻ nhất. Ca19 còn cụm “hệ thống… chưa có sẵn thông tin”; ghi polish, không gọi nguồn POS_UNAVAILABLE là model bịa. Ba ca3/11/19 cố ý thiếu POS, không chứng minh hoàn tất bán hàng khi thiếu nguồn.

## So với lượt full trước

Lượt `full-b123-20261021-additive`: B118USABLE/4NEEDS_EDIT/2fallback; stateful6USABLE/1NEEDS_EDIT/1control. Lượt này: B120/4/0; stateful7/0/1. Bốn NEEDS_EDIT vẫn cùng ca4/9/15/21.

- B1–5 trả đúng áoM còn499k, không tái diễn stream error trong một mẫu mới. Không thể quy việc hết lỗi hạ tầng cho sửa prompt.
- B1–17 chọn áo499k phối đồ trơn cho buổi gặp khách, không so799k rẻ hơn499k. Đây là kết quả dùng được ở mẫu này; vì lời khuyên đã đổi sang áo lẻ, chưa chứng minh phép tính mới là nguyên nhân cải thiện hoặc loại được lỗi so sánh trong mọi tình huống.
- Stateful–4 đáp “Dạ vâng chị nhé!”, code vẫn sửa eo74/mông96 và giữbeL×2. Cải thiện rõ ở cách xác nhận mà không mất thao tác state.
- Stateful–2 xác nhận đổi hai áo ngắn hơn; quote tổng978100, ship30000, giảm49900 đúng. Parenthetical phục vụ giải thích tiền, không tự bị coi là giọng cứng.

Không tuyên bố cải thiện ổn định: N1/case, nguồn đọc live, prompt mới dùng baseline sửa tại chỗ thay vì bản cộng5ví dụ của lượt trước, đồng thời owner projection có thêm chênh giá. Đây là so sánh mô tả nhiều thay đổi, không phải thí nghiệm tách nguyên nhân. Lịch sử primary cũ giữ nguyên. COMPARISON.json ghi từng ca.

## Verifier, state và delivery

28verifier attempts đều PASS; 28exact send-eligible texts khớp binding. B124SEND_ELIGIBLE; stateful4SEND_ELIGIBLE,2NO_SEND của model có actual code invitation/preview,2HANDOFF gồm một tin chuyển nhân viên và một silence ownership control. Không gộp các code/control outcomes thành fallback hoặc mất reply.

Stateful thêm áo beM×1 → beL×2 → quote998000−49900+30000=978100 → sửa số đo → code private previewCOD/preorder/ETA8–14 → PURCHASE_CONFIRMED và chuyển nhân viên. Không tạo đơn POS hoặc gửi Meta. Handoff là receipt/state trong DB thử và capture delivery. Ba DB disposable đã xóa.

Ca10 có câu “Đồ của mình chưa dùng là đổi size được” nghe rộng hơn phần trả lời thời hạn; ca18 cũng dùng lời tóm tắt quyền đổi trong ngữ cảnh khách chỉ mở xem/cất. Primary ghi đây là scope cần xem, không tự relabel unsafe chỉ vì thiếu danh sách điều kiện. Nguồn policy/whole-turn và verdict được giữ để owner review; PASS không thay cho bằng chứng đáp ứng mọi điều kiện của đơn thực. Không có cơ sở từ lượt này để tuyên bố verifier đã chứng minh an toàn ngữ nghĩa.

Fallback frozen vẫn `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.” Không được dùng ở32outcomes mới; fallback/handoff/modelNO_SEND lần lượt0/32,2/32,2/32, trong đó NO_SEND có actual code outcome và một handoff là silence control.

## Request accounting và vận hành

- 89generation requests =61owner+28verifier; mỗi registered attempt một upstream request, retry0. Error0,timeout0; usage đủ89/89, costNOT_EXPOSED. Không dùng kết quả tốt nhất hoặc bỏ lỗi khỏi denominator.
- Verifier latency p50 **5221,54ms**, p95 **9066,19ms**, n28. Added verification/readback B1 p50 **5760,40ms**, p95 **10227,96ms**; stateful p50 **7695,80ms**, p95 **8300,44ms**. Không gồm credential/source setup của từng child.
- Owner per-generation latency p50 **2406,34ms**, p95 **4852,73ms**, n61; workload khác verifier, không phải benchmark so tốc độ hai model.
- Owner tokens input243525/output35139; verifier input126896/output2381. Output có thể gồm reasoning theo cách provider báo. Cost không expose.
- Embedding2requests: source-check1+B1final cumulative counter1+stateful0. Không cộng dồn cumulative counters của từng attempt.
- 61capturedownerprompts đúng hash;28bindings recomputed;93wirebodieschecked không evaluator labels/private checkout phone;49raw publishedhashes và49Gitblobs khớp.41exact copies+8provider-attempt copies bỏ private synthetic ingress batch bằng publisher hiện có.
- Chênh giá mới thực sự xuất hiện trong11ownerrequests/31pairs, trong đó8pairs499k↔799k; tất cả số học đúng. Max owner request26060bytes, dưới65536. Chỉ bổ sung owner context từ PRICE hiện tại, không đổi verifier/quote/receipt/state.

## Commands thực sự chạy

```text
python apps/worker/evals/single-agent-commerce-read-only/full-b123-20261021-reply-focus/run.py C:/Users/nguye/AppData/Local/Temp/c3-division-session-20261019.py C:/Users/nguye/AppData/Local/Temp/c3-full-b123-20261021-reply-focus
```

Exit0; cả6child commands exit0: provider-preflight,source-check,deterministic-cod,deterministic-bank,stateful-1,b1-1. Exact arguments/logs trong raw/commands.json và raw/*.log. COD28/28PASS,BANK28/28PASS.

Collection/review/audit: task-temp `c3-gemini-prompt-once-primary.py`, `c3-gemini-prompt-once-publish.py`, `c3-full-b123-metrics.py`, `c3-reply-focus-report.py`, `c3-full-b123-audit.mjs`; one-off hash/source/request comparisons. Primary commit có trước diagnosis. `git diff --cached --check` PASS. Focused88PASS/1optionalSKIP và worker buildPASS là evidence đã chạy trên implementation26e36330, không claim chạy lại test/typecheck/lint trong lượt model này. Registration/report-only additions không đổi executable/config từ seal.

## Finding và bước tiếp theo

Một phần cải thiện quan sát được ở xác nhận sửa state và lựa chọn khi đổi dịp. Phần tư vấn chưa ổn định: model vẫn ưu tiên kể đủ các lựa chọn/đặc điểm hơn trả lời đúng quyết định đang cần, và lời mời mua vẫn có thể vượt khả năng B1 dù danh sách tool đã hiện rõ. Thêm một chỉ dẫn tương tự nữa chưa có bằng chứng hữu ích.

Nguồn có đủ giá/thiết kế/khả năng tìm mẫu cho các ca cần sửa; không thể quy chung cho thiếu context sản phẩm. Chênh giá do code tính chỉ xử lý số học, không quyết định được lý do mua hoặc cách diễn đạt. Cần owner review4ca, rồi chọn một thay đổi nhỏ có thể kiểm riêng; không tự thêm prompt rules/templates hoặc vòng chạy mới.

**STOP_AT_OWNER_REVIEW.** Chưa live GO, không tự tiếp tục fix/run/deploy. Complexity delta của lượt chạy:0runtime logic/role/gate/tool/parser mới; chỉ registration, copywrapper cũ và evidence/report. Bản sửa26e36330 giữ nguyên, không auto promote hoặc rollback từ kết quả một mẫu.
