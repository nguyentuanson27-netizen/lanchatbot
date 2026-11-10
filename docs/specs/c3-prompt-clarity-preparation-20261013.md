# C3 — chuẩn bị prompt rõ nghĩa (2026-10-13)

## Final candidate status — sau independent review

**APPROVE — preparation only**, reviewer gpt-6.1-sol/max/fresh context. Initial review found3required wording issues (protected scope, necessary code-fit, nullable protectedRef) and2optional suggestions (comparison scope/example spacing). All fixed; same reviewer read back exact prompt source **2ebb116c0c3bcf39538191cf24dbbe5bbe7d0cc5**, confirmed final hashes below and no remaining actionable finding. [Independent review record](c3-prompt-clarity-independent-review-20261013.md).

Final prompt identities:
- verifier 36fa1e8c5b1edf429e8d729ce70784e6fd37efafbf6b21f59e8bbf9c0393ba25, 6331chars versus6495control.
- owner e5a6e4beebdf80c53c77814e6fabe55c23d8918fc3395801a830d724c90f5b47, 6582chars versus6524control.

Revised local readback exit0, all229fixtures:228bodies unchanged exceptinstructions/1sameHISTORY_BOUND reject, maxbytes verifier27261/owner18038. Same data/snapshot/draft/role config/schema/bounds; evaluator labels absent; unregistered prompts still rejected for R63. Full368/368 earlier control regression remains valid because executable/control source unchanged; not rerun or represented as semantic validation of the new prompts.

0A2/A3 qualification generations in this preparation. The requested native developer reviewer did use gpt-6.1-sol/max for review/readback; it is outside the runtime/eval attempt denominator. Candidate quality/semantic safety/performance/most-effective wording unverified until a newly frozen authorized run. R63FAIL/STOP preserved; noRound64/source seal/A3/post-A/merge/deploy/live send performed. All earlier self-review identities/results below are the initial candidate stage, not the final prompt hashes.

Owner yêu cầu audit toàn bộ prompt, sửa, self-review rồi một review độc lập gpt-6.1-sol/max. Đây là preparation-only, không chạy A2/A3 hay mở Round64. R63 FAIL/STOP và toàn bộ historical prompts/manifests/corpora/labels/raw outcomes giữ nguyên.

Preparation main đã fetch: 296cdcfbf5759f5bf9cbb24acf3dc63005589361. Starting branch head: ed78e73dc54d53aa1cdf0f8c202f0e8171f7fdd4. Giữ branch implementation và draft PR390. Candidate mới chưa được runtime/admission registry chọn.

## Phạm vi và cách viết

Audit cả6 phần verifier và7 phần owner R63; thay toàn bộ candidate instructions bằng nhiệm vụ trực tiếp, nguồn rõ, mỗi đoạn một nhóm quyết định, giới hạn viết cạnh hành vi được phép. Giữ tiếng Việt tự nhiên; tên trường chỉ dùng khi cần đọc dữ liệu thực tế. Không đổi mục tiêu để giảm số ký tự hoặc dựa vào keyword/regex/template.

Verifier: đọc cả reply trong latest/history, so với nguồn hiện tại; quyền giới thiệu khác quyền áp dụng, lợi ích tư vấn thông thường khác công năng/kết quả sử dụng mới; kiểm tra subject/size/quote/ETA/ACK/receipt, JSON-only. Owner: một nhân viên bán hàng viết exact final text; chọn/giải quyết băn khoăn/đổi lời khuyên/trả phần đủ dữ kiện/hỏi phần thiếu, giọng chat,3ví dụ giả định ngoài fixtures.

Không hardcode policy shop, điều kiện/cửa sổ/phí/hoàn tiền. Giữ owner-approved legacy policy worlds riêng với repositoryv2; sourceSnapshot và code truth là authority. Giữ confident fit, ordinary neatness/comfort, grounded wrinkle/care advice, ordinary craft praise, useful single fact citation, permitted helpful upsell, revised recommendation, capability-bounded next step, refusal followed by independently wrong right remains unsafe.

## Ranh giới giữ nguyên

1 owner/max1runtime verifier; code soleauthority identity/truth/freshness/state/permission/effects/receipts/privacy. Verifier không tool/write/effect/retrieval riêng/rewrite/send; không chấm style/CTA/completeness. Every hard-precheck survivor vẫn verifier mandatory rồi final code gate; không repair/reverify loop/router/parser/production regex/template/framework.

Model/runtime config vẫn verifier gpt-6.1-sol/high/Codex login và owner gemini-3.5-flash-lite/HIGH/Vertex; schema, source context serialization, allowlist, bounds, bindings, max1request/no retry, fallback/terminal map và numericbars giữ nguyên. Review độc lập dùng gpt-6.1-sol/max theo owner, là developer review ngoài runtime, không thêm semantic role.

## Kiểm tra và review

Đọc specs/plan/todo/AGENTS/project skill trước sửa. Guidance đã fetch chính thức OpenAI model/clear instructions và Google clear instructions/few-shot. Candidate là best-supported design ở thời điểm này; chưa có evidence rằng là cách hiệu quả nhất cho model thực tế.

Local readback: dùng existing projectRuntime/buildRequest với candidate prompts chỉ trong memory, so mọi giá trị input/config/schema/binding với control, không gọi provider. Các quá-bound inputs giữ fail-closed. Check evaluator sentinels/caseIds không xuất hiện; R63 protocol vẫn từ chối prompt bị sửa. Existing focused/full tests dùng frozen controls; không test language quality bằng keyword hoặc fake model semantics.

Self-review trước independent review: đối chiếu đủ13sections, các owner decisions và unsafe boundaries; kiểm tra ví dụ không lộ evaluator labels/không cấp facts shop; source retention/diff/readback. Một reviewer fresh context gpt-6.1-sol/max đọc candidate/control/spec/core decisions, báo actionable findings và limitations. Resolve findings trong đúng prompt scope; nếu thay candidate sau review, reviewer readback cùng agent theo owner authorization. Không claim A2PASS hoặc A3quality từ review/localchecks.

## Official guidance

- [OpenAI GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol): xác nhận exact model và effort max cho reviewer; không đổi model runtime.
- [OpenAI reasoning best practices](https://developers.openai.com/api/docs/guides/reasoning-best-practices): chỉ dẫn trực tiếp, tách dữ liệu, ví dụ nếu cần và nhất quán; không yêu cầu xuất chain-of-thought.
- [Google clear instructions](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/prompts/clear-instructions): nhiệm vụ/context/output rõ.
- [Google few-shot](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/prompts/few-shot-examples): ít ví dụ đa dạng khớp chỉ dẫn; quá nhiều ví dụ có thể overfit.

Không sửa provider API; no provider qualification generations/no post-A/merge/deploy/live send. Kết quả candidate hashes/tests/self-review/independent review được bổ sung vào báo cáo preparation sau khi thực hiện.

## Audit toàn bộ và self-review đã thực hiện

| Đoạn R63 | Vấn đề | Candidate |
|---|---|---|
|Verifier: nhiệm vụ|Nhiều thuật ngữ authority/protected meaning trước khi nêu việc phải làm.|Nêu rõ kiểm tra báo sai facts/hứa quyền/báo thao tác xong; code vẫn sole authority, verifier chỉ nghĩa của exact draft.|
|Verifier: policy|Intro/áp dụng quyền bị giải thích qua nhiều phủ định và ngoại lệ.|Tách giới thiệu chung, xác nhận cho tình trạng khách, từ chối đúng, quyền sai nói thêm và mất điều kiện làm quyền rộng hơn nguồn.|
|Verifier: tư vấn|Dáng mặc/cảm giác và giữ chất lượng qua sử dụng gần nhau, dễ diễn giải lệch.|Giữ lời tư vấn tự tin được phép cạnh ranh giới kỹ thuật/kết quả/độ bền; nguồn chưa đo không tự bác lợi ích thông thường.|
|Verifier: đúng đối tượng|Công năng/ETA/size/tiền bị dồn chung.|Mỗi bullet một nhóm; đọc vai trò lời gợi món thay trong cả reply, giữ đúng món/màu/điều kiện.|
|Verifier: thao tác|ACK/durable operation còn là thuật ngữ thay cho hành vi.|Phân biệt đồng ý lựa chọn và báo hệ thống đã làm; receipt đúng operation/subject/revision/recipient.|
|Verifier: verdict|Định nghĩa lại bằng protected assertion/consistency/material.|Nêu PASS/FAIL/UNCERTAIN bằng nghĩa của facts/quyền/kết quả/thao tác; giữ JSON/schema/kind/ref.|
|Owner: công việc|Mục tiêu đúng nhưng cần ưu tiên rõ hơn.|Nhân viên thời trang giúp chọn và mua món phù hợp; exact customer-visible text only.|
|Owner: đọc hội thoại|“Trách nhiệm” chưa thể hiện điều phải xử lý ở lượt kế.|Theo lựa chọn/băn khoăn/thông tin đổi; lời cũ không thay nguồn; currentProductId không chặn khách chuyển món.|
|Owner: quyết định|Lựa chọn/lập luận/partial/next step dùng nhiều chỉ dẫn bao quát.|Chọn một hướng có ích, đổi lời khuyên khi cần, trả các phần khách hỏi có căn cứ, hỏi đúng phần thiếu và kết thúc đúng nhịp.|
|Owner: policy|Nguyên tắc nguồn và quyền khó áp dụng vào câu trả lời ngắn.|Kết luận đúng tình huống trước, rồi các chi tiết khách hỏi; intro ngắn đúng nguồn, không tạo quyền từ phần chưa biết.|
|Owner: căn cứ|Size/quote/ETA/material/benefit/lighting trong cùng đoạn dài.|Tách size+money, advice và policy+ETA; giữ nguyên authority/measurement/quote/ETA boundaries.|
|Owner: giọng|Tính từ/các điều cấm nhiều, ví dụ còn thiên về giải thích.|Câu chat trực tiếp; fact citation có ích, không đọc bộ số đo/nhu cầu để chứng minh hiểu;3toy examples cho so giá/partial/ACK, không dùng caseId/expected/rubric.|
|Owner: khả năng|Nhiều thuật ngữ quyền chen vào luồng bán hàng.|Liệt kê khả năng thực tế A, ACK khác completed operation; không tạo/hứa đã order/handoff/retrieval ngoài khả năng.|

Self-review đã sửa trước independent review:
- Dùng đúng customerProfileRevision thay cho revision mơ hồ; scope.productId thay cho product.
- Tách bỏ một món khỏi yêu cầu dừng tư vấn; giữ helpful upsell trong phạm vi/ngân sách khách muốn.
- Partial answer chỉ trả các phần khách hỏi có căn cứ, tránh đọc hết known facts.
- Citation không bị giới hạn cứng một fact; dẫn số đo/nhu cầu khi giúp quyết định, giữ multi-part completeness.
- Ví dụ không có dữ kiện policy shop hoặc bất kỳ caseId/evaluator label nào; source dữ kiện thật không bị thay bằng ví dụ.
- Giữ nghĩa của cả câu/hội thoại, không bắt keyword, không chấm giọng/completeness trong verifier. Không đổi các labels cũ để cứu kết quả.
- Không rút ngắn bằng cách bỏ giới hạn đã chốt. Verifier 6495→5945chars; owner6524→6578chars. Số ký tự là mô tả, không phải quality bar.

## Local evidence (0 A2/A3 qualification generations)

Candidate prompt hashes:
- verifier: 55e4dd6ee25e1d216bf455eb79b2f82120f6fa4c24a5b6a4d8ce64c7d3f7b528
- owner: 9cc2c61ca90538fd511250a4c20a1c246ecaeb1df2fe41ab70852133d93ed759

Exact commands actually run:
~~~powershell
node C:/Users/nguye/AppData/Local/Temp/c3-check-prompt-clarity.mjs
$env:C3_CHECKPOINT_A_ROUND='39'
$env:C3_TEST_CODEX_TRANSPORT='1'
node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/*.test.mjs
git diff --check
~~~

Readback command exit0:187A2fixtures/186built verifier requests,1unchanged HISTORY_BOUND rejection;42/42A3owner requests. All228 constructed bodies differ from control only in instructions. Exact inputs/trusted facts/history/latest/draft/requestId/snapshot/hash/role config/schema unchanged; evaluator sentinel/all corpus caseIds absent. Candidate remains within32768bytes (max verifier26751/owner18034). validateProtocol still rejects changing the frozen R63 prompts.

Full tests actual **368/368 PASS**,0failed/0skipped, duration91557.1686ms, process exit0. Existing local Codex transport tests use a local stub, not provider semantic results. The full suite covers unchanged protocol/projection/adapter/control round boundaries; candidate readback is separately the check above. Earlier worker TS/shared/build/typecheck/lint evidence is reused only because no such source changes; not claimed rerun here.

No new semantic behavior tests by regex/keyword; no pretend RED→GREEN semantic proof. Candidate-only instructions have not been validated by A2/A3. Existing hard A2FAIL/STOP and historical falsePASS remain.

Non-blocking reads: attempted READINESS.json was absent, then actual DETERMINISTIC_READINESS.md read. Web .md endpoints unsupported by browser, then exact official HTML pages fetched. No API/client/input/evidence mutation in these corrections.

## Independent review

Requested reviewer: **gpt-6.1-sol / max / fresh context**, one developer reviewer outside runtime. Completed: initial CHANGES_REQUESTED, then APPROVE after narrow fixes/readback of exact source2ebb116c. See final status above and independent review record. No A2/A3 run authorized by this preparation.
