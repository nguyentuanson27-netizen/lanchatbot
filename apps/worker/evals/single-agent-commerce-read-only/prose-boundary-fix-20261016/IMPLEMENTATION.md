# Sửa cách phân biệt mô tả sản phẩm và dữ kiện — 2026-10-16

Owner: “tiếp tục tìm rootcase và fix”. Intake `1625cd30f2ec9e1ec9558414045c37841947381f`; refresh main vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361` (implementationBaseSha). Giữ branch/PR391 đang làm. Code savepoint `679c53432338254c29226524749dadc09b8cb1fb`. Đây là implementation và kiểm tra offline; **0 provider generations mới, không có run A2/A3/B mới**.

Nguồn đối chiếu: [kết quả sáu ca](../context-fix-run-20261016/CHECKPOINT_B.md), [toàn bộ nháp bị chặn và nguyên nhân](../context-fix-run-20261016/DIAGNOSTICS.md), 13captured owner requests cùng batch và prompt owner/verifier hiện hành. Đọc lại các finding về prompt/style/context ở owner-comparison-followup, owner-tools và context-presentation để tránh lặp việc thêm các lệnh hoặc ví dụ theo từng ca. Áp dụng debugging và TDD; self-review đủ cho scope này, không thêm reviewer/gate mới.

## Finding và mức độ chắc chắn

| Phần | Điều quan sát được | Kết luận và cách sửa |
| --- | --- | --- |
| Contract context của owner | `trusted.products[].content.description` chứa nguyên văn quảng cáo, trong khi prompt gọi toàn bộ trusted là dữ liệu code đã xác nhận. Typed attributes của món đang đo lại null. | Mâu thuẫn cách trình bày đã xác nhận trong code/request. Tách prose tham khảo khỏi typed facts, giữ nguyên source/provenance. Chưa chứng minh riêng mâu thuẫn này gây toàn bộ lỗi ngôn ngữ. |
| Tư vấn của owner | Ca7/15 dùng một chuỗi lời khen thay lựa chọn/cách mặc; ca1/9 dùng sự chắc chắn để giải quyết rủi ro chưa có căn cứ. | Sửa các đoạn hiện có cho rõ quyết định mua/mặc và ranh giới kết quả dùng. Không chỉ thêm lệnh “tự nhiên”/“không quảng cáo”, không ban từ hay nhét câu trả lời theo bài kiểm tra. Chất lượng sau sửa chưa đo bằng model. |
| Nguồn sản phẩm | Readback đã lưu cho thấy registry có attributes nhưng các Qdrant payload được trả về chưa có. Lining/opacity trong registry vẫn UNKNOWN. | Gap publication thực, không phải candidate đánh rơi field đã nhận. Giữ proposal dùng publisher hiện có; không bơm registry/fixture vào context, không parse quảng cáo thành facts. Đồng bộ attributes cũng không tự giải quyết mọi tình huống sử dụng. |
| Nguồn fulfillment | Prep/transit có số; mapping địa chỉ→region key shop chưa có nguồn có thẩm quyền được consumer dùng. | Checkout nguồn thật vẫn BLOCKED. Không vá địa danh theo ca, điền ETA mặc định hoặc mở quyền checkout. |
| Verifier ca15 | FAIL chỉ trả kind/ref; nhận xét thẩm mỹ được phép, nhưng nháp còn thêm “hoa nổi” mà nguồn chỉ ghi “họa tiết thêu nổi”. | Exact trigger chưa biết. Không kết luận verifier chắc sai và không nới chung để cho qua cả nháp. Verifier giữ nguyên. |
| Lỗi API/native cũ | Batch mới nhất chỉ có một final-only request, không lỗi. | Không đủ chứng minh nguyên nhân lịch sử đã hết. Giữ bounded diagnostics/no retry, không sửa client theo suy đoán. |

Lỗi lặp không chỉ vì thiếu một câu trong prompt: owner nhận văn bản quảng cáo rất sẵn để dùng lại, yêu cầu “tự tin” có thể đi thành trấn an công năng, và nguồn thiếu chưa được hoàn tất bằng publication. Thay câu chữ đã nhiều lần không chứng minh model sẽ tuân thủ. Bản sửa này xử lý contract trình bày và chỉ dẫn đang mâu thuẫn; không nhận là đã sửa xong khả năng bán hàng hoặc đã xác định được nguyên nhân nội tại của model.

## Thay đổi thực hiện

Trong `buildGeminiCommerceRequest`, phần mở đầu có `trusted` cho subjects/products typed attributes/presentation/sizeCharts/facts/policy/receipts/state/execution và một `catalogDescriptions` chứa `{subjectRef,content}` nguyên bản. Chỉ đổi owner projection. Metadata, nguyên văn mô tả và product association giữ nguyên; mô tả vẫn có thể cung cấp thông tin được nêu rõ, không bị phủ nhận toàn bộ chỉ vì chuyển vị trí. Không tự trích hay xác minh một đặc tính mới từ prose. TrustedContext gốc và input cho verifier/binding không đổi.

Native continuation vẫn giữ các nội dung đã đổi, call IDs/signatures và kết quả tool; cùng current evidence chỉ xuất hiện một lần như trước. Exact32KB bound, parsing/usage/accounting, tools, budgets và retry0 không đổi. Không thêm model role, parser, semantic router, rewrite/reverify hoặc guard dựa trên từ khóa.

Owner prompt thay đoạn mô tả nguồn và ba đoạn tư vấn hiện có, rút đoạn lặp ở phần mở đầu: với phân vân phong cách, giúp chọn cả bộ/món lẻ hoặc cách phối cụ thể; giữ confident recommendation nhưng không tạo công năng/kết quả mặc; một đặc tính quyết định chưa rõ thì không khuyên mua như đã giải quyết rủi ro. Không đẩy việc bổ sung dữ liệu shop sang khách. Không đưa policy/product literals, câu mẫu hoặc case IDs vào prompt.

Prompt10,316→10,395bytes, +79/+0.77%; SHA256 `e3157cf28eb75ea6020799e0e3e32efaeac0b036ef69c27518e3b8fe1ff41f75`. Active manifest chỉ đổi owner hash. Verifier SHA256 giữ `e8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d`. Không rút mạnh toàn prompt hoặc chỉnh các phần size/state/policy/receipt để cải thiện số liệu của sáu ca.

## Observed RED → GREEN và verification

`node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` trước code: **25PASS/3FAIL**, đúng ba test mới về vị trí prose, missing/null và captured HTTP. Test này chứng minh contract hiển thị, không chứng minh model hiểu/viết đúng. Sau code, ba test mới qua; combined protocol có3PROMPT_HASH failures do active hash chưa cập nhật. Cập nhật đúng hash, không nới hash guard; focused final49PASS.

| Exact command actually run | Kết quả |
| --- | --- |
| `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs` | 49PASS/0FAIL |
| `pnpm --filter @lana/worker test:evals` | 491PASS/2optionalSKIP/0FAIL; hai installed-Codex local-stub diagnostics không chạy provider |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-handoff.test.ts` | 8files/167PASS |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | 21PASS |
| `pnpm --filter @lana/worker typecheck` | exit0, gồm dependency build |
| `pnpm --filter @lana/worker build` | exit0, gồm dependency build |
| `pnpm --filter @lana/worker lint` | exit0 |
| `node C:/Users/nguye/AppData/Local/Temp/c3-prose-boundary-replay-20261016.mjs` | Offline13request bodies PASS, 0provider requests |

[Offline result](OFFLINE_REPLAY.json) reconstructs the owner-visible data of13captured requests, preserving known null/default semantics and native subject-ref projection, then passes it through the new builder. Besides current instructions and catalog relocation, all facts/policy/state/receipts/tools/history/native parts equal their captured representation. Largest new request17,560bytes; maximum body delta133bytes; all under32KB. Unit controls cover exact32767/32768/32769-byte behavior, source changes, null/unknown, original-context immutability and captured-request evaluator separation. This is serializer compatibility evidence; neither provider behavior nor sales quality is measured.

Initial offline helper incorrectly treated projected null/[] defaults and native subjectRef fields as internal evidence, so assertions failed; corrected only the helper reconstruction and reran13/13. No runtime fix was made to satisfy this probe. Preliminary read-only inspections also used a nonexistent stateful log/comparison filename and Windows path glob; actual files were located with rg. These are local inspection/probe failures, not provider outcomes. Raw/historical files remain unchanged.

Worker/shared `.ts` source did not change: full worker1779PASS and COD/bank12/12each from the preceding recorded checks are reused, not claimed rerun. Current focused tests cover the affected consumer/semantic boundary; the full changed Node-eval suite actually ran above. No source/registry/preflight reads, DB creation, publication or live action in this task; no full-repository `pnpm check` or remote CI PASS claim.

## Self-review, complexity và trạng thái còn lại

Self-review checked no extraction, replacement or de-duplication loss of changed source content; trusted source object unchanged before verifier; every selling option/quote/receipt/state fact retains its typed slot; historical source/config/cases/verifier/primary labels unchanged. Instruction-like descriptions remain data, not systemInstruction. Tests prove representation/immutability, not semantic immunity to prompt injection. Old whole-terminal judgments are not rescored against this new prompt.

Delta: adapter+4/-2lines; three new regressions and two existing reference-path assertions updated; owner+79bytes, one active manifest hash. One owner-only JSON field replaces the former nested location of the same content; no worker/business/persisted schema field, new gate/store/operator, source, model role, framework or fallback. Primary technical risk is model adherence to the revised organization; it requires a future separately identified run, not more deterministic scoring layers.

**IMPLEMENTED / CODE_VERIFICATION_PASS; model-quality verification NOT_RUN.** The prior six-case replay remains2USABLE/1NEEDS_EDIT/3fallback with25heldNOT_RUN. Sales/live recommendation stays STOP, source checkout BLOCKED, A OWNER_BYPASS. No automatic provider run, merge, deploy, serving mutation or customer send follows from this fix request.
