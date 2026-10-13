# Policy meaning fix — preparation only, 2026-10-13

Owner yêu cầu fix → self-review → fix → independent review bằng gpt-6-astra/high, cung cấp đủ context. Không có yêu cầu chạy một vòng A2/A3 mới trong bước này. Giữ branch implementation/draft PR390; refreshed main/preparationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`, starting head `0e14bd289b16ba628c66c31e2c4701313642ecaf`.

Round66 vẫn A2 FAIL/STOP: 1 unsafe send-eligible PASS, 29/378 thực hiện, 349 NOT_RUN, A3 NOT_RUN. Không sửa historical inputs/labels/prompts/requests/scores hoặc dùng review để rescue run. Không đăng ký Round67, source-seal provider run, production wiring hay post-A.

## Bản sửa

- Candidate [verifier prompt](../prompts/semantic-verifier-policy-meaning-preparation-20261013.vi.txt): thay đúng phần policy, mọi phần còn lại nguyên byte R66. Bắt đầu từ quyền shop nói trong toàn draft, kể cả khi khách không hỏi policy; câu hỏi chỉ giúp hiểu nghĩa. Giữ tóm tắt có điều kiện và lời tự tin được phép. Nêu trực tiếp invariant đã có trong amendment §7.0: khi nguồn còn giới hạn, không hợp/không vừa không tự đủ cấp quyền đổi. Xác nhận eligibility cần tình trạng đã có căn cứ; không lấy policy tồn tại hoặc chưa thấy vi phạm làm bằng chứng đủ điều kiện.
- [Evaluator-only label review](label-review.json): một nhãn tương lai của r48-trial-incomplete-reordered-unsafe đề xuất UNSAFE→SAFE, giữ exact runtime/history/source/draft/ID. Cùng contract với r47/r4/prebuy introduction: lời đáp từ chối cách dùng đi làm rồi tóm tắt phạm vi đổi, không rõ nghĩa miễn điều kiện hay xác nhận hàng cụ thể đã đạt. Đây là adjudication để reviewer độc lập kiểm tra, không tự chứng minh nhãn đúng. Không quyết định từ là/thì hoặc số điều kiện.
- 187 ca tương lai: 107 UNSAFE/80 SAFE; không thêm/bỏ ca. Exact seven PR387 fixtures và nhãn giữ nguyên. Mọi ca explicit waiver, known washed/outdoor permission, thời hạn sai, phí/refund giả, receipt và product protections giữ nguyên. Sidecar chỉ áp dụng trong test/offline review; chưa có runtime/corpus loader hoặc admission chọn nó.
- Owner prompt/model/config/schema/allowlists/bounds/serialization/binding/gates/fallback/usability10%/A3 bars không đổi. Verifier runtime vẫn gpt-6.1-sol/high; owner Gemini3.5-flash-lite/HIGH. Independent gpt-6-astra/high là developer review theo yêu cầu, không phải third runtime model role.

## Self-review và sửa tiếp

1. Sửa test guard vốn có thể fail chỉ vì hash serialization: kiểm riêng prompt-only admission và label-only admission, giữ baseline validateProtocol PASS. Quan sát RED của contract trước thay candidate: 2/4 fail (candidate chưa có correction và prompt còn identity cũ); log cả initial3/4 và final2/4 được giữ ở temp. Đây là mechanical isolation/admission checks, không test hiểu policy.
2. Rà whole-context 64 policy cases, original seven attacks, cùng reply đổi context washed/bounded, refused outdoor và reply có quyền sai nói thêm. Xét nguồn có điều kiện và trường hợp source thật sự cho quyền rộng hơn; prompt không tự áp điều khoản shop. Không đòi mọi đoạn có checklist hoặc cụm “theo chính sách”.
3. Loại ngoại lệ diễn đạt “giữ phạm vi trong nguồn/hội thoại” vì có thể bị hiểu là chỉ có nguồn là đủ để backfill lời hứa. Candidate chỉ cho xác nhận ngắn khi tình trạng khách đã đủ điều kiện nguồn; service introductions vẫn được nói ngắn.
4. Sửa rationale SAFE: không dùng absence-of-violation để chứng minh eligibility. Rationale chỉ ra speech act là tóm tắt dịch vụ với giới hạn, không xác nhận một món hàng đã đạt tất cả điều kiện. Độ trực tiếp/vòng vo thuộc A3.
5. Delta sau self-review: verifier8982bytes so với8850 (+132), policy section only; zero owner/nonpolicy/runtime/framework/gate/operator/semantic-role changes. Một sidecar nhỏ thay vì copy lại187fixtures. Một test file4tests bảo vệ source/runtime/evaluator firewall/frozen admission/historical raw. Không code regex/parser/template/router, rewrite/reverify, generation retry hoặc sửa production.

## Kiểm tra local và giới hạn

Candidate tests 4/4 GREEN sau sửa. 186/187 verifier requests dựng được, cùng một HISTORY_BOUND rejection như control; mọi constructed body khác đúng instructions, inputs/config/schema/binding giữ nguyên. Labels/reasons/caseIds không leak. All42 owner requests nguyên byte. Protocol từ chối candidate prompt và candidate labels nếu gắn vào frozen R66. Raw hash `916de2fe520ef3d1e13d4f7211485a8fe066f16a1bbf2062b6b7612352b3acc7` và hard FAIL/349NOT_RUN được giữ.

Actual focused **60/60 PASS**, full **409/409 PASS**, không skip, native process exit0, stderr0bytes. Focused12494.0126ms/full92486.0438ms. Worker/shared/build artifacts không đổi; previous actual Round66 worker79/21/build/typecheck/lint chỉ được reuse kèm unchanged-source readback, không claim chạy lại. Compiled boundary SHA256 `344035c06c67ecfae317d385ee07c96aed86aac37c27bbc497aca69c40260b37` giữ nguyên. Không provider API/adapter/model change; không cần API implementation mới. Local tests và developer review không chứng minh candidate semantic reliability, conversational quality hoặc Checkpoint A GO. Có observed same-request FAIL/PASS/FAIL ở R63/R64; immutable backend version/inner reasoning chưa biết.

Candidate verifier SHA256 `8288e06dc59da5f7f5ff98923ce2fa2192e8f4047adff4986cb0d884322a2a81`; label sidecar `73206bdcdc3507b6f8de80d1c5d4bbd50e96c6deb0b7465899ff3bbc83ab6468`. Không ghi hash này vào frozen manifest, không capture a2/a3RunSourceSha mới.

Exact checks đã chạy (PowerShell):

~~~powershell
git fetch origin main
git rev-parse origin/main
$env:C3_CHECKPOINT_A_ROUND='39'
node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/policy-meaning-preparation.test.mjs
# Baseline RED3/4; self-review test guard → RED2/4; candidate sửa → GREEN4/4.
$env:C3_TEST_CODEX_TRANSPORT='1'
node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/policy-meaning-preparation.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-59.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-66.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-65.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-64.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-63.test.mjs apps/worker/evals/single-agent-semantic-verifier/a2-evidence-persistence.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference-diagnostics.test.mjs
node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/*.test.mjs
git diff --exit-code 0e14bd289b16ba628c66c31e2c4701313642ecaf -- apps/worker/src packages apps/worker/evals/single-agent-semantic-verifier/round-66 apps/worker/evals/single-agent-semantic-verifier/protocol.mjs apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs apps/worker/evals/single-agent-semantic-verifier/run-staged-round52.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.mjs
git diff --check
~~~

Logs `C:/Users/nguye/AppData/Local/Temp/c3-policy-meaning-preparation-{red,red-final,focused,full}.stdout.log` giữ observed failures và final results. Transport test flag chỉ dùng localhost mocks; không có A2/A3 qualification provider generation.

## Independent review

Pending exact committed source và requested gpt-6-astra/high review. [Context packet](REVIEW_CONTEXT.md) cung cấp norms/evidence/changes/risks. Root sẽ sửa actionable findings và yêu cầu cùng reviewer readback nếu cần; không tự chạy A2/A3.
