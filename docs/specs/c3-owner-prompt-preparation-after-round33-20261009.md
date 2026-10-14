# Chuẩn bị prompt tư vấn sau Round33

Chuẩn bị bắt đầu2026-10-09, hoàn tất kiểm tra2026-10-10, Asia/Saigon. Owner yêu cầu sửa và review prompt để chuẩn bị vòng tiếp theo, đọc lại finding để tránh sửa lặp và không đánh đổi chất lượng hội thoại lấy độ ngắn. Phạm vi lần này là **một prompt tư vấn lưu riêng**, chưa đăng ký/chạy Round34. Kết quả Round33 vẫn A2 PASS / A3 FAIL 27/42 / STOP.

Preparation base SHA: `084b39e9354c6f0e4b74f156cf585db0263f364a`. Đã refresh main; `implementationBaseSha` vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Tiếp tục branch implementation riêng và draft PR390. Không rebase/import runtime PR387.

## Nguồn và finding chi phối bản sửa

- [Spec kiến trúc](c3-single-agent-commerce-architecture-20261004.md), [amendment §7.0–7.0.4 và Checkpoint A](c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../tasks/plan.md), [todo](../../tasks/todo.md), project Agent Skills.
- [Quyết định về tư vấn và claims](c3-sales-stance-and-observable-claims-20261008.md), [phạm vi nghĩa và review toàn lượt](c3-sales-semantics-and-whole-turn-review-20261009.md).
- [Finding Round25](../../apps/worker/evals/single-agent-semantic-verifier/round-25/FINDINGS.md): status rõ không bảo đảm model chọn đúng bước; tránh thêm tầng xử lý hoặc biến mọi lời lợi ích thành kết quả kiểm nghiệm.
- [Review đủ42 hội thoại Round31](../../apps/worker/evals/single-agent-semantic-verifier/round-31/WHOLE_CONVERSATION_REVIEW_20261009.md), [Round32 treatment](c3-round32-whole-turn-sales-and-advisory-calibration-20261009.md), [review đủ42 hội thoại Round33](../../apps/worker/evals/single-agent-semantic-verifier/round-33/WHOLE_CONVERSATION_REVIEW_20261009.md).

Các finding gần nhất cần phân biệt: owner đọc số đo/lặp lời giải thích, chọn sai sản phẩm cho câu hỏi tiếp, không tạo thay đổi khi khách giao phối khác; verifier còn ba rejection lợi ích cần calibration; một replacement vượt bằng chứng độ kín bị chặn đúng; hai provider errors; review r7-opacity giữa31/33 chưa nhất quán. Chỉnh prompt owner không tự giải quyết tất cả các nhóm này.

Lịch sử mỗi ca Round33 có0–4tin, dưới bound8; request không mất các tin đó. Không quy lỗi hiện tại cho thiếu cửa sổ context. Owner32 đã có chỉ dẫn tự nhiên/gọn/không đọc facts, nên thêm lại các câu chung ấy không phải một giả thuyết fix mới. Chạy lại cùng prompt không làm model tự học review cũ.

## Bản sửa có giới hạn

[Owner34 đã chuẩn bị](../../apps/worker/evals/single-agent-semantic-verifier/prompts/fashion-sales-owner-round34.vi.txt) thay cấu trúc giao việc và làm rõ điều kiện chọn bước tiếp. Giữ model owner `gemini-3.5-flash-lite` / Vertex global / HIGH, verifier `gpt-6.1-sol` / high / Codex login, **verifier32 byteexact**, READABLE_FACTS_V2, corpora122A2/42A3, facts/history/evaluators, provider config, schema/bounds/gates/terminals/bars. Không đổi serializer/native message roles hay executable trong lần chuẩn bị này; làm đồng thời sẽ khó phân biệt hiệu quả của prompt.

| Finding/rủi ro | Cách xử lý trong prompt | Điều được giữ để tránh giảm chất lượng |
| --- | --- | --- |
| Lượt đang hỏi quần nhưng bước tiếp quay về áo | Đọc tin mới với history, xác định việc/món đang hỏi; state giúp hiểu snapshot, không thay yêu cầu khách. Facts vẫn đúng binding. | Không bỏ state/truth hoặc để khách sửa permission/subject bằng lời nhắn. |
| Vừa giới thiệu món đã xin đo | NEEDS_MEASUREMENTS mô tả đầu vào thiếu; hỏi đúng món khi cần chọn size/khách đã nhận phương án mua. Giải quyết băn khoăn trước. | Vẫn hỏi input dùng được khi giúp quyết định mua; không cấm hỏi tiếp sau chọn màu/phối, không bắt kết thúc mọi lượt. |
| Đọc hồ sơ thay vì tư vấn | Dùng dữ kiện để quyết định; trả kết quả/lý do liên quan, không kể lại dữ liệu đã rõ để chứng minh hiểu. | Khách hỏi kiểm tra/sửa/giải thích vẫn nhận phần số đo liên quan; nhiều yêu cầu vẫn trả đủ. |
| Giọng dài, nối nhiều tính từ/dè dặt | Chỉ dẫn giọng chat cụ thể, trực tiếp, tự tin; mỗi ý dễ theo dõi. | Không quota câu/từ, không công thức reply/CTA bắt buộc; giữ cả4ví dụ giả định đa dạng từ owner32. |
| Phối khác nhưng lặp bộ cũ | Yêu cầu thay đổi có ích về màu/món/cách mặc, một phương án chính khi được giao chọn. | Không bắt tự chọn mọi thuộc tính hoặc có alternative chưa có căn cứ. |
| Bán thêm bị chấm như làm sai nhu cầu | Giữ upsell/cross-sell liên quan giá trị món, chi phí có căn cứ, ngân sách cứng và yêu cầu dừng. | Không mặc định rẻ nhất, luôn upsell hoặc freeship là lý do đủ để mua thừa. |
| Giảm prompt làm mất quyền tư vấn/authority | Gom hợp đồng dữ kiện, size, lợi ích và policy trong một vùng; giữ nguyên capability/authority. | Code-fit tự tin, H/W khi chart hỗ trợ, partial fit, lợi ích thiết kế/fit, công sức/đường may, short7-day policy, ACK vẫn được phép; facts/test/benefit/effect vượt nguồn vẫn bị giới hạn. |

Prompt không chứa caseId, split, expected labels, yêu cầu/rubric theo ca hoặc câu trả lời của42ca. Bốn ví dụ minh họa vẫn ở các sản phẩm giả định khác, cùng một chú thích không cấp facts; không thêm ví dụ cho từng failure. Không yêu cầu xuất intent/plan/obligation hoặc cấu trúc trung gian. Conversational owner tự hiểu việc khách giao và viết exact customer-visible final text.

## Self-review về chất lượng và phạm vi

Review do primary Codex thực hiện, không phải independent/human/owner acceptance và không phải scoring provider output. Đã đối chiếu owner32 và các quyết định owner, đọc finding và full-turn reviews trước sửa.

- Giữ khả năng hỏi tiếp hữu ích cho bán hàng. Điều kiện xin size được gắn với việc khách đang cần và đúng món; không dùng một lệnh dừng chung cho mọi lượt hỏi màu, nhận lựa chọn hoặc hỏi giá trị.
- Giữ ví dụ giọng chat, trả nhiều phần, partial answer, một lựa chọn khi được giao, lý do mua và alternative có căn cứ. Không lấy độ ngắn hoặc đủ từ khóa làm proxy chất lượng.
- Giữ đúng chủ thể giá/tồn/quote, SIZE_FIT binding và distinction summary/local comparison/full fit; H/W chỉ khi supportedInputs cho phép; ETA dự kiến; policy material conditions; effort rhetoric khác invented process/test; ACK khác completed effect/receipt.
- Thay prompt tư vấn duy nhất. Chưa chỉnh verifier để cứu fallback, chưa bổ sung chart/sản phẩm/giao hàng giả, chưa thay scoring bars/evaluator interpretation hoặc điểm cũ.
- Structural delta:1inactive prompt + documentation/task tracking; executable/shared/package/provider/source projection changes0; roles/layers/gates/state/parser/router/templates/repair0. Không production wiring hoặc post-A work.

Độ dài là quan sát, không là mục tiêu: owner32 `6544`ký tự / `8419`UTF-8bytes → owner34 `6242`ký tự / `8043`bytes, giảm4.61%ký tự. Không cắt mạnh các hợp đồng và ví dụ để đạt tỷ lệ rút gọn. Các hướng dẫn công khai được dùng theo mục tiêu này: [OpenAI](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6.1-sol) nói mỗi rule một lần/giữ style examples có ích; [Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) phân biệt context có ích với tích tụ ngoại lệ; [Google](https://ai.google.dev/gemini-api/docs/prompting-strategies) ưu tiên chỉ dẫn trực tiếp và cấu trúc rõ. Không áp dụng mẫu grounding chỉ chép facts cho toàn bộ tư vấn bán hàng.

Owner34 SHA256: `5552b3b1ddde4b0a4633495945ba4049bb14314f7c0473011cf65e17b9f59435`.

Verifier giữ nguyên SHA256: `deb7508ebe97ec9ff0f9827ba13f5608390406a8ca32b9406d925a8d175aa9a5`.

## Kiểm tra thực sự đã chạy

Từ repository root, không gọi provider:

```powershell
git fetch origin main
git rev-parse origin/main
node C:/Users/nguye/AppData/Local/Temp/c3-owner-prompt-preparation-round34-20261009.mjs
$env:C3_CHECKPOINT_A_ROUND = '33'
$env:C3_TEST_CODEX_TRANSPORT = '1'
node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/conversation-context.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-33.test.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-owner34-delivery-check.mjs
git diff --check
git diff --cached --check
```

- Refresh/readback exit0, main đúng implementationBaseSha ở trên.
- One-off local check exit0:84constructed/captured envelopes,42ca×2roles; chỉ owner system prompt thay. Projection/truth/history/request/draft/snapshot binding và verifier body không đổi. Injected evaluator/private labels bị loại. Request owner tối đa27364bytes; verifier32295bytes khi dùng draft ở bound4096bytes; đều trong32768.750tracked evaluation files/157170386bytes khớp HEAD, gồm toàn bộ historical inputs/evidence/executable. Frozen protocol33 từ chối dùng prompt mới chưa đăng ký.
- Existing focused protocol/context/adapter/round33 tests **41/41PASS,0skip**, exit0. Installed Codex transport test dùng upstream local stub; provider generations0. Những check này chứng minh compatibility/firewall/bounds/retention, không chứng minh chất lượng hoặc semantic behavior mới.
- Chưa chạy lại worker/shared build/typecheck/lint hoặc boundary/protected-claims suites cho inactive text/docs; không executable/package change. Khi đăng ký run mới phải thực hiện đầy đủ readiness commands trong plan, không chuyển kết quả kiểm tra lịch sử sang run mới.

Local link/hash/secret-pattern check exit0:11relative links tồn tại, prompt hash khớp,0secret-pattern matches. `git diff --check` và `git diff --cached --check` exit0, staging đúng4files. Draft PR390 lưu preparation source commit và trạng thái delivery; không tạo thêm receipt/gate/commit chỉ để ghi SHA của chính tài liệu này.

## Giới hạn và lần chạy kế tiếp

Provider generations0, registered attempts0, a2RunSourceSha/a3RunSourceSha mới0. Chưa có kết quả hội thoại mới, chưa biết naturalness/decision quality/variance tốt hơn hay kém hơn. Chưa sửa context salience thực tế của nhiều sản phẩm, ba disputed advisory rejection của verifier, dữ liệu alternative sân khấu/giao trước hạn hoặc sự không nhất quán của review cũ. Không dùng prompt để bổ sung facts còn thiếu hoặc sửa evaluator sau kết quả.

Khi owner yêu cầu chạy, đăng ký/freeze riêng cấu hình mới và chỉ thay owner prompt so với33; giữ các control/unsafe contrasts và review toàn lượt. Thực hiện readiness đầy đủ, commit/clean source/runtime a2RunSourceSha/preflight/fresh A2; chỉ A2 PASS mới seal A3 source và chạy42ca, một generation mỗi role slot, không retry/repair/substitute. Chấm actual terminal outcome và phân biệt owner quality/verifier/provider/input coverage. A2 unsafe eligiblePASS → STOP/no A3; failed A3 → tổng hợp finding và STOP, không tự nối một vòng sửa mới. Đây là chuẩn bị cho vòng tiếp theo, **chưa là Checkpoint A GO**.
