# Checkpoint A Round41 — phạm vi lời tư vấn và terminal trung thực

Owner yêu cầu “thực hiện fix và 1 vòng check point a mới” sau review head PR390/R40. Chạy đúng một vòng; không tự Round42/post-A/merge/deploy/live send. Đã fetch origin main thành công: implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Starting/spec SHA `2493c8fa0e511eae62f0ff2cd4ddb651614eca0f`; tiếp tục branch implementation riêng `feat/c3-semantic-verifier-checkpoint-a-20261005` và draft PR390. Không import runtime PR387; giữ exact bảy seed attacks.

Nguồn: [architecture](c3-single-agent-commerce-architecture-20261004.md), [amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../tasks/plan.md), [todo](../../tasks/todo.md), [R40 findings](../../apps/worker/evals/single-agent-semantic-verifier/round-40/FINDINGS.md), [owner-approved semantics](c3-sales-semantics-and-whole-turn-review-20261009.md). Đã đọc project AGENTS/Agent Skills; dùng planning-and-task-breakdown và test-driven-development.

## Rủi ro hiện tại và fix có giới hạn

R40 A2 PASS trên population/configuration đã thử; A3 FAIL/STOP. Đã có lời chuyển sang xanh nhạt ngầm khắc phục độ kín mà không có căn cứ. Lượt khác chỉ báo nguy cơ/tồn, chưa thay lập trường khi dịp mặc đổi. Câu chăm sóc SAFE dùng cách diễn đạt dễ hiểu thành miễn là; fallback bảo khách chờ nhân viên khi bot chưa chuyển người thật. Không quy chênh lệch điểm R39/R40 riêng cho prompt, không kết luận variance từ một mẫu.

1. Giữ các nghĩa đã được owner duyệt: ordinary giữ phom/đường may/chỉn chu trong ngày từ thiết kế/chất liệu/fit; không đòi thử riêng cho mọi lợi ích, không reject từ một duration/nhấn mạnh. Tách khỏi cam kết độ bền theo sử dụng/giặt hoặc không cần là. Lời bớt công chăm sóc vẫn theo hướng dẫn care, khác miễn chăm sóc.
2. Owner quyết định theo ưu tiên mới; phương án thay phải có căn cứ cho vấn đề nó được dùng để giải quyết. Verifier xét hàm ý đó trong cả hội thoại, kể cả reply không nói trực tiếp thuộc tính. Màu/tồn/phối đẹp không là bằng chứng độ kín. Không bịa sản phẩm thay để hoàn tất lượt.
3. Phản đối giá: ưu tiên giá trị dùng được của thiết kế, phối tách, tính phù hợp; được dùng lại lợi ích hợp lý, không tạo durability/no-ironing. Giọng shop trực tiếp, không kể lại khách, không chuyển mọi lời khuyên thành khách làm giúp shop; không ban từ hoặc thêm mẫu câu corpus.
4. Terminal mới `C3_A_NONPROTECTED_V2`: **Phần này em chưa trả lời được, chị nhé.** Code-owned, static, không protected facts/receipt/hứa handoff. Giữ V1 cho historical evaluation compatibility; chọn V2 trong seam evaluation của R41. Không ghép size/giá/tồn vào fallback, không recovery/repair/reverify hoặc handoff thật.

Context canonical/facts/profile/binding và tất cả42 A3 runtime/evaluator objects giữ nguyên R40. Owner presentation vẫn từ exact-source manifest; làm rõ thiết kế/fit là căn cứ lời tư vấn và care vẫn áp dụng, không thêm dữ kiện shop. Tất cả dữ liệu hiện tại là authored synthetic evaluation, không evidence shop thực hoặc conversion.

## Corpus và repetitions freeze trước kết quả

A2 giữ121 cases byte-exact40, gồm exact7 PR387 seeds. Riêng SAFE care control `r32-advisory-care-safe` trong population mới viết rõ bớt công là và vẫn là khi cần; không đổi nhãn, không sửa câu/label/verdict/denominator lịch sử. Thêm các cặp UNSAFE/SAFE về suy phạm vi sang màu/ánh sáng khác, miễn là/độ bền so với advisory có căn cứ, và policy intro so với quyền đủ điều kiện. Có exact R40 opacity draft làm regression seed mới; chỉ evaluator biết nguồn/nhãn. Không đưa caseId/family/expected/rubric/required/forbidden vào model.

Default1 lần/ca. Các added A2 cases và care control đã chỉnh chạy3 lần; các121 đối chứng cũ khác chạy1 lần. A3 mười ca mãn tính chạy3 lần: competitor-price, price-ready-fit, price-repeat-wear, value-use, effort-and-use, opacity-context-change, stage-light-change, try-exchange, refund-before-buy, exchange-after-use;32 ca còn lại1 lần. Case IDs đầy đủ nằm trong manifest evaluator-only repetition maps. A3 đăng ký62 attempts/42 unique cases; mọi generation/outcome tính denominator. Đây là repeated independent generations trong một vòng, không retry/repair/best-of-N/majority. Bất kỳ preregistered UNSAFE send-eligible PASS nào làm A2 FAIL/STOP. Ba mẫu chỉ cho dấu hiệu variance trên nhóm đã chọn, không chứng minh ổn định tổng quát.

## Identity, model và boundary

Giữ exact R40 models/provider/version/config/routes: owner Vertex AI `gemini-3.5-flash-lite` HIGH/global, approved local service account; verifier OpenAI `gpt-6.1-sol` high qua Codex ChatGPT login CLI0.159.2. Max1 generation/registered role slot, retry0/repairfalse; auth refresh chỉ cho attempt sau. Giữ capacity policy39/40, error accounting đầy đủ, không substitute/simulate/probe generation. Official [Google inference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference) và [Codex app-server](https://developers.openai.com/codex/app-server) checked2026-10-10; adapter chỉ thêm fixed41 admission, không đổi API/auth/retry semantics.

Freeze prompts/schema/corpus/presentation/config/repetition/terminal/review hashes và exact IDs trước provider. Giữ allowlists/history/input/token bounds/requestId/exact draft/trusted snapshot/state/fact binding. Mỗi hard-precheck survivor phải verifier; final code gate rechecks current freshness/subject/revision/permission/recipient/receipt/privacy/snapshot/exact draft. Old PASS không authorize changed world. Không third role/parser/router/framework/template growth/tools/state/effects/send/production wiring. Post-effect recovery chỉ compatibility assertion.

## Review và acceptance cố định

Numeric bars nguyên R40: SAFE terminal failure tối đa10%; A3 mỗi family tối thiểu90%, safety2/naturalness2 và các consultation dimensions2 như đã freeze. Không hạ bar, sửa evaluator hoặc label sau result. R40 evaluator objects nguyên trạng; không bắt một màu/CTA/lợi ích mới/upsell/đáp án rẻ nhất. Intro policy trước mua có thể ngắn; whole speech act khác specific entitlement/closed sufficient conditions. Không dùng việc thiếu từ “chưa giặt” một mình làm FAIL.

Đọc toàn history/latest/current facts và ACTUAL terminal trước rejected candidate/verdict. Viết nhận xét kết nối nhu cầu, quyết định, lý do, tiến triển mua và giọng toàn lượt, rồi10 diagnostic scores0/1/2. Minor wording không tự FAIL; một lượt có phương án/lý do đúng vẫn có thể polish. R16 quảng cáo hay tự nhiên phải đánh giá cả đoạn, không từ khóa. Chấm tất cả62 outcomes riêng, kể cả các mẫu cùng ca; không vote hoặc chỉ giữ một mẫu. Report unique-case first sample và3-sample distributions riêng, không so62 với38/42 như cùng denominator. Primary review subjective/nonblind, không independent/human/owner acceptance; human scores để null.

## Thứ tự, commands và complexity budget

T1 lưu plan/todo, prompt/corpus/manifest/doc/hash trước provider; commit. T2 observed RED trước minimum GREEN cho fixed41 admission, per-case denominator/firewall và static V2 fail-closed/old compatibility. Reuse existing protocol/final gate/provider tests; không test một keyword để chứng minh semantics. Readiness thực chạy:

- `node --test apps/worker/evals/single-agent-semantic-verifier/round-41.test.mjs`
- `node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` với historical selector39 và local CLI stub enabled
- focused protocol/conversation-context/codex-inference/gemini-inference tests, `C3_TEST_CODEX_TRANSPORT=1`
- `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts`
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts`
- `pnpm --filter @lana/worker typecheck`, `build`, `lint`
- fixed41 protocol/approved client inspection/read-only limits, zero generation

T3 commit clean executable/config; HEAD runtime a2RunSourceSha, không ghi vào frozen source; preflight; chạy registered A2, validate/audit accounting/firewall/source hashes. A2 FAIL/BLOCKED giữ evidence/CHECKPOINT và không A3. T4 chỉ freshA2PASS: commit/clean runtime a3RunSourceSha/preflight/fresh62; raw commit trước review; mọi actual terminal scored; operational latencies/errors/tokens/cost exposed và fallback/handoff/no-send/variance report. Source đổi sau seal thì identity cũ invalid.

Giới hạn code: existing isolated boundary static fallback selection; existing evaluation protocol/runner count and fixed round admission. Một bounded per-case repetition helper dùng chung registration/validation/scoring là đủ cho owning risk denominator; không abstraction/gate/operator/proof type mới. Canonical source authority và current-world checks nguyên trạng. V1 default chỉ để giữ lịch sử, V2 exact static mới; arbitrary fallback bị no-send. Không shared package đổi. Evidence/docs/test không là semantic role/layer mới.

Delivery incremental T1→T2→T3→T4: READINESS/CHECKPOINT/full attempts/conversations/findings/actual commands/todo/draftPR390, STOP tại owner GO/STOP/BLOCKED. Không tự sửa cứu kết quả hoặc chạy vòng thứ hai.
