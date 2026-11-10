# Checkpoint A Round40 — căn cứ tư vấn và đánh giá quyết định mua

Owner yêu cầu ngày 2026-10-10: dựa vào nhận xét đã review, lập kế hoạch, fix và chạy đúng một vòng Checkpoint A mới. implementationBaseSha: 296cdcfbf5759f5bf9cbb24acf3dc63005589361; starting/spec SHA: 9b6622a883ed95b72d70ba034f7cb20530816198. Git SSH/SSH443/HTTPS timeout; GitHub connector đọc commit của ref main và xác nhận SHA này, trùng object/local origin/main. Không ghi fetch PASS. Tiếp tục branch implementation riêng và draft PR390. Dừng tại owner GO / STOP / BLOCKED; không tự Round41/post-A/merge/deploy/live send.

Nguồn: [architecture](c3-single-agent-commerce-architecture-20261004.md), [amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../tasks/plan.md), [todo](../../tasks/todo.md), [R39 findings](../../apps/worker/evals/single-agent-semantic-verifier/round-39/FINDINGS.md), [R39 protocol](c3-round39-decision-review-quota-20261010.md). Đã đọc AGENTS và Agent Skills của project. Dùng planning-and-task-breakdown + test-driven-development; không cần live ops.

## Chẩn đoán và lựa chọn treatment

R39 A2 PASS; A3 33/42 primary PASS, 5 semantic fallback và 4 eligible quality FAIL, provider errors0. Không chứng minh rằng model yếu, mọi hướng trả lời bị khóa, hoặc chênh lệch chủ yếu do ngẫu nhiên. Lỗi cụ thể: owner suy rộng kết quả mặc từ phép thử gấp; ví dụ phản đối giá chưa giải quyết điểm vướng; review vẫn áp thêm một lựa chọn màu vào câu hỏi chọn áo; một evaluator sân khấu vẫn đòi phương án thay thế dù chưa có căn cứ.

Round40 sửa ba phần cùng trong một treatment, không claim isolated causal improvement:
1. Tiêu chí prospective theo quyết định đang hỏi: chọn mẫu đúng, phối được, đúng ngân sách có thể hoàn tất yêu cầu chọn áo mà chưa chốt một màu. Không bắt tạo lập luận mới mỗi lần khách chê giá; được dùng lại căn cứ nếu giúp cân nhắc thật sự. Không yêu cầu luôn thuyết phục thành công, thắng đối thủ, chốt mua, thêm CTA hoặc bán món rẻ nhất.
2. Owner prompt viết gọn, đổi ví dụ giá sang một tình huống có căn cứ dùng được, giữ giọng tự tin tự nhiên; không chép case/câu đáp án corpus.
3. Giữ canonical facts và verifier nguyên R39. Một presentation record theo sản phẩm ST411 đổi cách viết material/limitations cho owner sang căn cứ tích cực và phạm vi phép thử. Giữ thành phần/co giãn/độ kéo chun/ít nhăn tương đối/vẫn có thể nhăn/chăm sóc/thiết kế/code-fit. Không thêm tính năng, ưu đãi, độ bền, kết quả mặc hay phép thử. Mọi profile khác và giới hạn quan sát như ánh sáng/màu/đổi hàng giữ nguyên.

Presentation record nằm trong manifest frozen, chỉ gồm subjectRef, source material/limitations và display material/limitations; áp khi exact source fields khớp, trường hợp khác dùng dữ liệu gốc. Đó là trình bày dữ liệu sản phẩm cho owner, không parse tiếng Việt/customer, không chọn facts theo case, không reply template hay semantic router. Canonical snapshot/request binding, verifier input và final gate không đổi. Không chuyển evaluator-only expectations sang provider request.

## Bảy ca dùng để kiểm tra tính hợp lý trước run — evaluator only

Các ca dưới đây dùng để rà soát yêu cầu, không gọi thử provider, không đưa vào prompt và không là đáp án mẫu:
- r5-competitor-price: cân nhắc giá trị hàng shop từ nhu cầu và dữ kiện; có thể nhấn lợi ích đã biết, hỏi điều quyết định còn thiếu hoặc nêu hướng mua phù hợp. Không đòi chứng minh đối thủ kém hay sản phẩm luôn đáng giá hơn.
- r7-price-ready-fit: vừa trả M đúng code vừa giúp cân nhắc giá; không tạo độ bền/miễn chăm sóc.
- r14-price-repeat-wear: trả size, kết nối căn cứ với việc mua mà khách còn phân vân. Lặp hợp lý không tự FAIL; giới thiệu lại catalogue không đáp ứng phản đối vẫn yếu.
- r15-value-use: khuyến nghị có lý do dùng được cho hai hoàn cảnh; không đảm bảo khách sẽ hài lòng hoặc sản phẩm bền hơn đối thủ.
- r5-budget-correction: chọn áo riêng phù hợp với quần navy, tổng524k trong550k. Một màu chốt/hỏi vòng ngực là lựa chọn tiếp theo nếu hữu ích, không phải điều kiện bắt buộc để lượt này PASS.
- r7-opacity-context-change: trả đúng nguy cơ/tồn và giúp quyết định theo ưu tiên tránh thấy bóng. Không cần bịa áo khác.
- r14-stage-light-change: khuyên tránh áo trắng này cho đèn ngược và trả tồn. Có thể hoàn tất lượt bằng lời khuyên đó; áo thay chỉ được giới thiệu nếu có căn cứ phù hợp. Thiếu dữ liệu áo thay là coverage gap riêng, không tự FAIL một quyết định đúng.

Chỉ sửa evaluator của budget-correction và hai opacity-context/stage cases để đồng bộ điều trên. Giữ lời khách/history/trusted của42 và toàn122A2 byte-exact39; không sửa lịch sử/điểm R39. Other39 evaluator objects nguyên trạng.

## Protocol và review freeze

Models/config/routes nguyên39: owner VERTEX_AI gemini-3.5-flash-lite HIGH, global, local service account đã approve; verifier OPENAI gpt-6.1-sol high, Codex ChatGPT login CLI0.159.2. Repetitions1 theo yêu cầu hiện hành; max1 generation/registered role slot, retry0/repairfalse. Không model thay thế hay generation probe.

Freeze trước provider result: prompt/schema/corpus/config/presentation/review hashes, bounds/allowlists, canonical snapshot/state/fact/request/draft binding, terminal IDs/text/hashes, repetition/scoring/measurement. Numeric bars và10% usability nguyên39. Giữ verifier32 exact. Không sửa fallback để giữ giá/size/tồn: Checkpoint A chỉ cho fallback static non-protected/handoff/no-send. Hiện bot chưa chuyển người xử lý thật, không hứa đã handoff.

Mỗi hard-precheck survivor phải gọi verifier; PASS phải qua final deterministic gate ngay trước eligibility. Không third role/tool/state/effect/rewrite/send/repair/parser/router/framework/production wiring.

Review từng whole conversation/actual terminal; đánh giá quyết định mua, khả năng dùng lời đáp và giọng cả lượt, rồi mới10 diagnostic scores. Cấm keyword/quote checklist/reference matching/compulsory CTA. Chọn lại một màu hoặc lời khen thêm chỉ là cải thiện nếu yêu cầu đã giải quyết. Thay đổi hoàn cảnh phải có lập trường có ích; không đánh giá qua riêng một từ.

Giữ raw commit trước primary review; không xem rejected candidate/verdict trước khi chấm terminal. Primary Codex review vẫn subjective/nonblind, không gọi là blind/independent/human/owner acceptance. Một mẫu mỗi ca không đo variance; thử nhiều mẫu/chấm blind/đổi model cần treatment riêng sau này, không thêm lượt ẩn vào run40. Ghi riêng lỗi owner, semantic reject, deterministic invalidation, provider availability và context gaps; mọi lỗi vẫn ở denominator.

Capacity policy nguyên39: read-only account limits trước A2/A3, zero generation; confirmed usage_limit_reached/insufficient_quota giữ failed attempt rồi dừng, remainder registered/unexecuted/null; generic401/429/5xx/timeout fail-closed attempt không retry. Nếu provider/route cần thiết không available: BLOCKED, không substitute/simulate. Current official [Google inference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference) và [Codex app-server](https://developers.openai.com/codex/app-server) checked2026-10-10; không đổi API/auth/retry semantics.

## Thứ tự thực hiện và tiêu chí hoàn tất

T1: lưu prompt/presentation/evaluator/review/manifest và hashes, plan/todo; commit trước provider. Acceptance:42 runtime/122A2/canonical/verifier/config/fallback/bars nguyên39,3 evaluator changes only; nguồn mới không có PII/secrets, mẫu giả định không trùng corpus.
T2: test request capture RED observed trước minimum GREEN cho owner presentation/source matching, canonical/verifier invariance, evaluator firewall, fixed40 protocol/native adapter admission; reuse boundary/final gate tests. Self-review diff và readability. Acceptance: no parser/router/repair/third role/production/shared change; test meaningful tại boundary thay đổi.
Readiness commands thực chạy:
- node --test apps/worker/evals/single-agent-semantic-verifier/round-40.test.mjs
- node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs
- C3_TEST_CODEX_TRANSPORT=1 focused protocol/conversation-context/codex-inference/gemini-inference tests
- pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts
- pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts
- pnpm --filter @lana/worker typecheck/build/lint
- C3_CHECKPOINT_A_ROUND=40 protocol.mjs và inspect approved clients, zero generation.
T3: commit clean executable/config; HEAD runtime a2RunSourceSha; preflight A2; chạy fresh122once; validate evidence/captured requests/request counts/source hashes. Any preregistered unsafe send-eligible PASS => FAIL và STOP; A2 BLOCKED/FAIL => không A3.
T4: chỉ freshA2PASS: commit clean A3 source; HEAD runtime a3RunSourceSha; preflight; fresh42once; giữ raw hashes/commit trước review. Chấm từng actual terminal; report operational tokens/cost exposed/latency/fallback/error và limitation.
Delivery: CHECKPOINT_A.md, full conversations/failures/findings/commands, todo, incremental commits và draft PR390/readback. STOP owner. Nếu network chặn publish, giữ local commit, ghi rõ chưa publish; không tạo retry generation.

Complexity budget: hai evaluation executables protocol/native adapter, một small presentation override trong formatter hiện có, một owning-risk test file, frozen data/docs/artifacts. Không thêm provider framework/gate/operator/durable proof/state. Không thêm dữ kiện sản phẩm chưa xác minh. Không giảm ngưỡng để đạt.

