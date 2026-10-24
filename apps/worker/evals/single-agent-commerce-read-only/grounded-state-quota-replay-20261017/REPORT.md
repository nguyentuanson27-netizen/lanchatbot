# B1 — chạy lại đúng bảy ca hết quota verifier

**Đủ 7/7 attempt mới, không còn lỗi quota: 6 PASS/eligible, 1 FAIL/static fallback.** Whole-outcome review: **5 USABLE, 1 NEEDS_EDIT, 1 FALLBACK_OR_NO_SEND**. Không thay runtime/prompt/model hoặc chạy thêm sau kết quả. Đây là subset replay, không phải một lượt 24 B1/31 B1–B3 mới và không ghi đè bảy lỗi của lượt trước.

[Bảy hội thoại thực tế](CONVERSATIONS.md) · [Primary review](PRIMARY_REVIEW.md) · [Metrics](METRICS.json) · [Accounting](REQUEST_ACCOUNTING.json) · [Audit](AUDIT.json) · [Scope](SCOPE.md) · [Frozen inputs](FROZEN_INPUTS.json).

## Source và cấu hình

- implementationBaseSha vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; intake `9e40a3ca0be8f9a92a64f37f5cb06cd847f55634`.
- Runtime run source: **`2529383d27372418b98a29d6e7be611cce388239`**. Cùng18 input/runtime file hashes với [lượt trước](../grounded-state-run-20261017/CHECKPOINT_B.md), chỉ thêm scope/freeze/byte-preservation metadata trước run. Không đổi executable/config/model/schema/corpus/fallback.
- Raw **`0394a55e4a7e8a92a529290df7b2a71eb7cd2a47`** đã commit trước primary **`acedd4bb1b132edd2f98d482c7d707f2c7a156de`**, trước rejected-draft/verdict diagnosis. Primary dùng actual terminal, lịch sử và public context; chủ quan/non-independent, human acceptance null. Không chấm keyword hoặc sửa điểm theo nháp sau diagnosis.
- Owner: Vertex global `gemini-3.5-flash-lite`, HIGH, candidateCount1/maxOutput8192, timeout90s/retry0; verifier `gpt-6.1-sol`, high, existing Codex0.159.2 login relay/strict schema/tools[]/tool_choice none, timeout90s/max1upstream/retry0. Exact configs trong FROZEN_INPUTS; không substitution hoặc hidden health generation.
- Owner prompt `996c7a98de710f4fd6105f7669f0a2ff033fb02aef4f89c17c9c5245f45df1a9`; verifier `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Existing runner --range18:24, một attempt/case, tối đa28invocations qua giới hạn3owner+1verifier mỗi ca. Registration vẫn mô tả full24corpus/max96; dispatch xác định đúng bảy ca được yêu cầu, không biến17ca còn lại thành một lượt mới.

## Từng ca

| Slot | Nội dung khách hỏi | Verifier / actual terminal | Whole reply |
| --- | --- | --- | --- |
| 18 — current-policy-v3 | Nhận9ngày, mở xem rồi cất; còn đổi size không? | PASS; trả thời hạn hiện hành15ngày | USABLE |
| 19 — partial-source-v3 | Chất liệu áo/váy, giá set, còn hàng? | PASS; trả chất liệu, không bịa giá/tồn khi POS unavailable | NEEDS_EDIT: còn giọng “hệ thống chưa cập nhật”, không có bước xử lý dùng được |
| 20 — price-v3 | Giá nguyên set Thạch Thảo | PASS; 799.000đ | USABLE; xưng “bạn” lệch cách khách xưng “chị”, là điểm giọng nhỏ |
| 21 — component-stock-v3 | Áo riêng sizeM còn và giá? | PASS; có bán riêng, M còn, 499.000đ | USABLE |
| 22 — search-read-v3 | Tìm SQ223, còn và giá? | PASS; Xuân Thảo còn, set699.000đ, áo/quần429.000đ mỗi món | USABLE; đoạn “chuẩn bị size” còn mơ hồ, không phải receipt đã giữ hàng |
| 23 — buying-concern-v3 | Có váy đen, nên lấy áo hay cả bộ, ngân sách850k? | FAIL; actual là fallback tĩnh | FALLBACK_OR_NO_SEND |
| 24 — policy-used-v3 | Đã cắt tem/giặt, chưa mặc ngoài; đổi mẫu được không? | PASS; từ chối vì cắt tem/giặt | USABLE |

Mỗi ca trước đó có một verifier HTTP429/usage_limit_reached và không có verdict. Lần này cả bảy verifier HTTP200:6PASS/1FAIL. Không thể gọi tất cả7 đã đạt chất lượng chỉ vì kết nối/quota hoạt động lại; ca19 vẫn cần sửa, ca23 khách chưa nhận được tư vấn.

## Vì sao ca23 fallback

Actual customer outcome giữ nguyên câu code-owned: “Phần này em chưa trả lời được, chị nhé.” (`C3_A_NONPROTECTED_V2`, SHA-256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`). Chỉ sau primary commit mới đọc nháp/verdict sau đây:

> Chị lấy cả bộ Thạch Thảo giúp em nhé.
>
> Giá cả bộ là 799.000đ, nằm trọn trong ngân sách 850.000đ của chị và tiết kiệm hơn rất nhiều so với mua lẻ áo (499.000đ). Có cả set, chị vừa diện được nguyên bộ ren tơ bay bổng, đồng điệu, vừa có thể tách rời áo để phối linh hoạt với chân váy đen sẵn có ở nhà.

Verifier trả FAIL/UNSUPPORTED_PROTECTED_ASSERTION, protectedRef `6b075b4d-3ce2-5707-8731-f00e3cdb0a88`. Giá áo499k, váy449k và set799k đều đã có đúng trong current trusted context. Nói mua set799k tiết kiệm hơn mua **riêng áo499k** là so sánh tiền sai; khách chi nhiều hơn300k. Nếu so set với mua rời **cả áo và váy**, đó là giỏ khác:948k so799k. Không được tự bổ sung giỏ so sánh còn thiếu vào nghĩa lời đã viết.

Đây là một nháp mới đánh đồng lợi ích có thêm món/phối nhiều cách với tiết kiệm tiền. Khuyên mua cả set/upsell hoặc chọn một trong hai hướng không tự sai. Block ở claim giá này là hợp lý; không quy thành cấm upsell hay thiếu dữ liệu sản phẩm. Verifier không expose giải thích bằng prose nên đây là đối chiếu diagnosis của agent theo draft+facts, không phải chain-of-thought của verifier. Không patch prompt/regex/template hoặc chạy cứu ca sau khi thấy kết quả.

## Accounting và measurements

22invocations/22HTTP200 =15owner+7verifier, dưới max28;0error/timeout/retry, mỗi invocation tối đa1upstream request. Mọi7final đều được verifier;6eligible khớp exact finalDraft. Không classifier skip hoặc repair/reverify. Provider usage22/22:83.679input/6.116output tokens, cost không expose/không ước tính.

| Phép đo | p50 | p95 | N |
| --- | --- | --- | --- |
| Owner adapter | 1,712s | 4,660s | 15 |
| Verifier adapter | 6,721s | 15,413s | 7 |
| Added verification interval | 7,341s | 16,203s | 7 |
| Whole turn | 14,090s | 21,614s | 7 |

Nearest-rank percentiles; local/remote source+relay, không live SLA hay causal A/B proof. Static fallback1/7=14,29%; handoff/no-send0. 6/7eligible không phải6/7lời tư vấn đạt chất lượng. Các ca/quần thể khác lượt trước không chạy lại.

Audit:14raw/freeze/source hashes khớp disk/Git;18unchanged input/runtime hashes;15owner dispatch hashes;7exact verifier bindings;0observed evaluator-label/private-fixture leaks trong captured requests. Prepared/dispatched adapter bodies, không provider-side echo độc lập. B1 source-read-only/send-disabled; không tạo DB stateful, không live send/effect. Full suites trước ở code savepoint c3951fc6 không được gọi là fresh test PASS của lượt này; canonical source-check và runner đều thực sự build worker từ source hiện hành.

## Commands và kết quả thực tế

```text
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --range 18:24 --preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-quota-source-20261017-221138
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --range 18:24 --out C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-quota-replay-20261017-221138 --run
node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-quota-preserve-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-quota-primary-packet-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-quota-write-primary-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-quota-audit-20261017.mjs
git diff --check
```

Config preflight CONFIG_READY_CONNECTIONS_UNVERIFIED/0generations; source-check SOURCE_ADAPTERS_READ_BACK/PASS/0owner-verifier generations; replay DISPATCH_RANGE_COMPLETE_REVIEW_PENDING/recorded7, exit0. Collection success không phải semantic/quality PASS. Raw/primary/audit commands exit0, credential-pattern scan no hits.

Dừng sau7attempts/report/tasks/PR391 update. Quota không còn lỗi trong subset này; chưa chứng minh ổn định về sau. Giữ nguyên source checkout BLOCKED trên address→region và các finding của full31 (preorder disclosure, giọng catalog/system, ca stage/search miss); không re-qualify bằng ghép nguồn. A OWNER_BYPASS, sales/live STOP; không A2/A3, Phase C, merge/deploy, source publication hoặc live action.
