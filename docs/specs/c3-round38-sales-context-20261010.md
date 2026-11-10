# Checkpoint A Round38 — dữ liệu tư vấn và giọng shop

Owner yêu cầu “fix và chạy vòng mới”. Scope: đúng một vòng Checkpoint A mới, một generation mỗi registered role slot, không retry/repair/substitute/adopt, A2 PASS mới chạy A3, rồi STOP tại owner. Không production wiring hoặc post-A.

`implementationBaseSha=296cdcfbf5759f5bf9cbb24acf3dc63005589361` sau fetch main ngày2026-10-10. Starting/spec SHA `38177a90f3d33edff3da0b198aaf8b4418717ebb`. Tiếp tục branch implementation riêng `feat/c3-semantic-verifier-checkpoint-a-20261005`, draft PR390. Spec/plan: [architecture](c3-single-agent-commerce-architecture-20261004.md), [boundary amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../tasks/plan.md), [todo](../../tasks/todo.md).

## Evidence và giả thuyết sửa

[Round37 findings](../../apps/worker/evals/single-agent-semantic-verifier/round-37/FINDINGS.md):22/42 primary PASS;14eligible replies chưa đạt, chủ yếu giọng đối chiếu hồ sơ;6fallback gồm3HTTP429 và3semantic rejects. Hai reply nói mặc M vừa khi code vẫn thiếu mông; một reply ngụ ý áo xanh giải quyết lộ áo lót dưới đèn nhưng chưa có căn cứ. Verifier giữ nguyên boundary, không nới để cứu các kết luận này.

Đầu vào owner37 đọc cùng bảng cơ thể/thành phẩm, provenance, customer/revision/fingerprint và facts trong dạng báo cáo. Prompt đã bảo không đọc lại số đo nhưng output vẫn làm vậy. Giả thuyết: cách trình bày dữ liệu khuyến khích tự đối chiếu bảng và giải thích việc khớp hồ sơ. Điều quan sát được là sự có mặt của những dữ liệu đó và lỗi output; chưa chứng minh quan hệ nhân quả riêng của prompt hay context.

## Treatment duy nhất của vòng này

- [Prompt owner38](../../apps/worker/evals/single-agent-semantic-verifier/prompts/fashion-sales-owner-round38.vi.txt): rút phần chỉ dẫn hội thoại/giọng thành các ý rõ, tập trung điểm mua còn vướng, lời trả trực tiếp, không thêm phần diễn giải hồ sơ. Giữ nguyên phần dữ kiện/phạm vi/khả năng/thẩm quyền của prompt37. Không thêm câu mẫu theo case, quota số câu hoặc bố cục/CTA cố định.
- Owner context `NATIVE_DIALOGUE_FACTS_V4`: presentation từ projection hiện có. Sản phẩm giữ ref/subject, thiết kế, chất liệu, màu, chăm sóc, giới hạn và machine-owned CodeSizeInput; mọi PRICE/STOCK/SIZE_FIT scope/value, policy/quote text, subjects và receipts được giữ. Không đưa raw size-chart rows hoặc provenance/source timestamps/hash vào owner text. State owner chỉ có conversationOwner/currentProductId/consideredSize/salesStage; request identity vẫn bind canonical snapshot. Không suy size hoặc chọn sản phẩm theo ngôn ngữ khách trong code.
- Canonical runtime projection/trusted snapshot/state allowlist vẫn đầy đủ và byte-equivalent37. Verifier vẫn nhận nguyên JSON projection đầy đủ, exact draft và bindings. Final gate, precheck, schema, verifier prompt32, fallback/disposition không đổi. Đây là formatter dữ liệu hiện có, không thêm authority, state, tool, semantic layer hay conversation plan surface.
- Bỏ chart ở owner áp dụng cho toàn bộ sản phẩm của treatment, không theo case/nhận diện protected-language. CodeSizeInput là JSON do existing size-input preparation tạo, không parse tiếng Việt. Không loại thiết kế, material hoặc limitations để làm lời bán hàng dễ hơn. Bộ42 hiện không yêu cầu trả riêng các thông số raw chart; phạm vi hỏi thông số thành phẩm ngoài bộ này chưa được chứng minh.
- Native history/latest giữ nguyên từng byte, không tóm tắt/chọn lượt. Toàn122A2,42A3,world/evaluator goals/families, auxiliary profiles/size/quote/context và references giữ exact37. Numeric bars/review procedure không đổi. Không rewrite khách để đạt điểm và không chấm lại evidence37.

Một conversational owner Vertex `gemini-3.5-flash-lite`, global HIGH, existing service account; tối đa một verifier Codex ChatGPT login `gpt-6.1-sol`,high/CLI0.159.2. Config/generation defaults, effort, version/route, bounds, repetition1/variance policy, cost policy, usability10%, family90%, ten dimensions/min1/mean1.5/safety2/naturalness2 và consultation requirements giữ37. Prompt/schema/corpus/config/serialization/hash được freeze trong manifest38 trước provider.

## Ranh giới giữ nguyên

Code sole authority identity/truth/freshness/state/permission/effects/receipts/privacy. Every hard-precheck survivor bắt buộc verifier; PASS chỉ eligible sau gate recheck freshness/subject/revision/permission/recipient/relevant receipt/privacy/snapshot/draft. Không third role/router/generic Vietnamese parser/rewrite/repair/reverify loop/framework/case-specific production regex/template. Fallback `C3_A_NONPROTECTED_V1` giữ exact text/hash37; stale HANDOFF, privacy/permission/recipient NO_SEND. Post-effect recovery chỉ compatibility assertion, không implement.

CaseId/split/family/expected/required/forbidden/quality/rubric/reference/review labels evaluator-only. Test captured local requests cả hai roles/all42, semantic size authority, fact/condition retention, immutable snapshots và actual encoded bounds. Tests không chấm tiếng Việt bằng keyword hay bằng việc prompt chứa câu cấm.

## Kiểm tra và run policy

T1freeze/commit → T2 observed RED trước formatter minimum GREEN → full readiness/self-review → clean committed A2 source/HEAD capture/runtime `a2RunSourceSha`/preflight →122A2once → nếu PASS clean A3 source/HEAD capture/runtime `a3RunSourceSha`/preflight →42A3once →commit raw/five fingerprints trước primary whole-conversation review → CHECKPOINT/tasks/draftPR390 →STOPowner. Source/config thay đổi sau seal làm identity cũ invalid; không ghi source SHA ngược vào frozen input.

Commands đã preregister (chỉ ghi PASS khi thực sự chạy):

```powershell
$env:C3_CHECKPOINT_A_ROUND='38'
$env:C3_TEST_CODEX_TRANSPORT='1'
node --test apps/worker/evals/single-agent-semantic-verifier/round-38.test.mjs
node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs
node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/conversation-context.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2
node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2
# Conditional on fresh A2 PASS:
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3
node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3
```

Mọi unsafe send-eligible PASS →A2FAIL/STOP/khôngA3;không majority/best-of-N/error exclusions. Không provider/model/credential →BLOCKED/không substitute/simulate. Operational nearest-rank p50/p95, latency/tokens/cost when exposed, errors/timeouts/request counts, fallback/handoff/no-send giữ protocol37. Google [GenerateContent contract](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/inference) và [429 guidance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/deploy/error-code-429) đã kiểm tra2026-10-10 trước sửa adapter admission. Existing global/sequential transport giữ nguyên; lỗi429 không chứng minh rõ loại quota/capacity. Không generation retry, quota mutation, generation probe hoặc tự thay cadence/config.

Review đọc42 full history/latest/trusted/ACTUAL terminal trước connected buying assessment rồi420 điểm chẩn đoán riêng. Chấm lựa chọn/giải quyết băn khoăn/giọng/bước dùng được và an toàn, không chỉ facts đúng. Không checklist từ khóa/quote rời/reference matching/forced CTA/cheapest/always upsell. Legitimate use of customer info khi sửa/giải thích/tính tổng được phép; không tự fail mọi lần nhắc budget. Reject candidate chỉ diagnostic sau điểm actual fallback. Primary subjective nonblind, không independent/human/owner acceptance hoặc third provider judge. All42 inputs identical37 nhưng bundled prompt+context/one observation/no blind paired scoring không xác lập isolated causality, variance, model ranking hoặc sales conversion.

Complexity budget: chỉ existing protocol formatter/fixed38 admission và native adapter admission, focused tests/data/evidence. Không production/shared source. Source/readback/test evidence tái dùng, không thêm gate/operator/proof layer hay ceremony. STOP tại owner sau đúng một vòng; không automatic39 hoặc post-A.
