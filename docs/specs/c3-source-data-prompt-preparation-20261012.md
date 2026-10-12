# C3 — tách dữ liệu nguồn khỏi prompt, chuẩn bị sau Round52

**Phạm vi:** bản chuẩn bị chưa kích hoạt, owner yêu cầu sửa kỹ và giữ kết quả các vòng trước. Không đăng ký Round53, không chạy provider, không nối nguồn thật hoặc làm post-A. Round52 vẫn STOP.

`preparationBaseSha = 4235f7d18cac0763b965e08b7a7522de8d98d8d5`. Đã refresh `origin/main`; `implementationBaseSha = 296cdcfbf5759f5bf9cbb24acf3dc63005589361`.

Áp dụng [parent spec](c3-single-agent-commerce-architecture-20261004.md), [boundary amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../tasks/plan.md) và [R52 findings](../../apps/worker/evals/single-agent-semantic-verifier/round-52/FINDINGS.md). Các điều khoản 7 ngày/thử trong nhà trong tài liệu và kết quả cũ là hợp đồng của population lịch sử; không phải policy được chọn cho lần chạy tương lai.

## Nguồn policy tìm được trong repo

| Nguồn | Điều đã xác nhận trong repo | Giới hạn sử dụng |
| --- | --- | --- |
| `docs/current/PRODUCTION_BASELINE_20260722.md`, mục Customer care policy r10.1 | `shop-policy-customer-care-v2`, version ID `24400b36-6d12-4e3c-b0ca-cf41014ed0d8`; chỉ được ướm, không mặc thử | Baseline lịch sử, không phải đọc lại pointer live hiện tại |
| `deploy/manifests/20260723-customer-care-policy-r10-1.json` | Identity/version/lifecycle PUBLISHED của bản lịch sử | Manifest không chứa toàn bộ policy payload |
| `apps/worker/src/pre-sale-policy.test.ts`, `packages/chat-runtime/src/runtime-policy-resolver.test.ts` | Bản fixture cấu trúc: đổi size/màu/mẫu 15 ngày, một lần, phí hai chiều 30k; trả do lỗi trong 5 ngày, shop chịu ship, hoàn 1–3 ngày làm việc sau xác nhận lỗi; `HOLD_UP_ONLY` | Fixtures hỗ trợ đối chiếu baseline, không tự chứng minh policy live hay chính sách mới |
| `packages/contracts/src/v4/admin-policy-control-base.ts` | Hợp đồng dữ liệu tách exchange/returns/inspection, inspection chỉ `HOLD_UP_ONLY` | Schema exchange hiện chưa có trường lý do lỗi shop; không thay schema/shared package ở Checkpoint A |
| Owner trong chat hiện tại | Chỉ được ướm, không mặc thử; chỉ chấp nhận đổi do lỗi shop, như lỗi sản xuất/giao sai size/mẫu | Ghi riêng thành dữ liệu chuẩn bị; không giả danh version Admin đã publish |

Như vậy repo **có** nguồn policy; thiếu bản nguồn đầy đủ khớp quy tắc đổi chỉ do lỗi shop vừa chốt. Không mang 15 ngày/30k của exchange, hoặc 5 ngày/hoàn tiền của returns sang quy tắc exchange mới. Thời hạn, phí, hoàn tiền của quy tắc mới chưa xác lập trong nguồn đã tìm thấy. Không lấy policy 7 ngày/thử trong nhà của corpus C3 làm policy shop mới.

[Dữ liệu chuẩn bị từ xác nhận owner](../../apps/worker/evals/single-agent-semantic-verifier/prompts/owner-policy-source-preparation-20261012.json) giữ riêng hai quy tắc đã chốt và các phần chưa xác lập. Đây là owner clarification, không phải Admin published snapshot. Chỉ `policyLiterals` được dùng làm dữ liệu fixture trong tests; audit/status/unknowns không vào request model. Chưa có observedAt/expiresAt cho run, chưa freeze một policy đầy đủ để chạy provider.

Trong A, policy là snapshot fixture được freeze và đưa vào `trusted.policyLiterals`; cả hai model đọc cùng nguồn. Trong B, reuse `RuntimePolicySourcePort.loadActivePointers` / `RuntimePolicyResolver` cùng version/content hash/pointer revision để nối nguồn thật. Không implement connector/policy migration hoặc ghi Admin trong bản chuẩn bị này.

## Thay đổi có giới hạn

1. Viết riêng hai prompt ứng viên. Bỏ thời hạn, quyền thử/đổi, phí, mốc ETA cụ thể và license lợi ích gắn với một loại sản phẩm khỏi chỉ dẫn. Giữ nguyên nguyên tắc tư vấn tự tin có căn cứ, phân biệt tóm tắt dịch vụ với cấp quyền cụ thể, và toàn bộ giới hạn claims/effects.
2. Chuẩn bị serializer dùng canonical projection hiện có: gom subject/profiles/claims theo productId, giữ đầy đủ giá trị nghiệp vụ từ nguồn, cả bảng size và giới hạn evidence, đọc trường JSON `CodeSizeInput` đã có. Canonical metadata/permission/privacy/binding vẫn nguyên vẹn trong code và input verifier; owner reuse view/state allowlist của V5 để tránh lặp metadata quản trị. Không dùng `ownerPolicyPresentation`/`ownerProfilePresentation`, không diễn giải tiếng Việt hoặc suy dữ kiện mới. Native history/tin cuối được giữ nguyên.
3. Builder chỉ phục vụ preview/tests, reuse envelope/config hiện có; không được runner hoặc production import. Verifier vẫn đọc exact draft + canonical trusted input; binding/freshness/final gate không đổi.
4. Test RED trước GREEN cho việc giữ nguồn và policy thay đổi, kiểm tra 42 fixture R52 như population **local compatibility**, không dùng chúng để đánh giá policy mới hoặc claim model đã PASS.

Giữ các kết quả đã mất công chốt: đúng missingInputs của món cần size, SIZE_FIT bound theo khách/revision/fingerprint, HEIGHT/WEIGHT khi được hỗ trợ; sửa lập trường khi hoàn cảnh đổi; phản đối giá theo lợi ích dùng đồ có căn cứ; upsell hữu ích không bị mặc định sai; dẫn một fact hợp lý không bị chấm như đọc lại toàn bộ hồ sơ. Không thêm forced CTA, câu cấm, rubric theo keyword, parser/router/template, repair/reverify, role hoặc gate mới.

Policy text/profile/history vẫn là dữ liệu, không được ghi đè system instructions hoặc cấp authorization. Thiếu kết quả kiểm nghiệm không tự phủ định ordinary advice có căn cứ; ordinary advice không cho phép tạo đặc tính/kết quả thử/bảo đảm mới. Không require phép thử riêng cho mọi lợi ích; không biến ít nhăn thành miễn chăm sóc hoặc tồn/màu thành bằng chứng công năng.

## Kiểm tra và điều kiện trước một run tương lai

Các checks local: focused preparation RED→GREEN; toàn Node eval suite với môi trường compatibility R39 và transport stub; worker boundary/provider; protected-claims/reply-assembler/size-engine; worker build/typecheck/lint; diff và lịch sử đối chiếu với preparation base. Lưu commands thực sự chạy và kết quả tại bản evidence chuẩn bị.

Trước provider phải có nguồn policy đầy đủ được chọn rõ, prospective corpus/nhãn/rubric khớp nguồn đó, prompt/context/protocol hashes và run authorization riêng. Đổi verifier prompt cần **fresh A2**; A2 PASS mới A3. Không kế thừa A2 qualification của R52, không đổi nhãn lịch sử, không claim chất lượng ngôn ngữ/safety model từ tests local. Model/provider/effort/bars/fallback/terminal/gate hiện có không bị thay trong bản chuẩn bị.

Không chỉ thay literal rồi giữ nguyên expectations: các lịch sử hứa được thử/đổi tự nguyện, câu hỏi, SAFE/UNSAFE labels và outcome rubric phải được chuẩn bị đồng bộ trong population mới. Các dữ kiện sản phẩm và ca đã tốt tiếp tục làm controls khi phù hợp. Đây là việc trước một run tương lai, chưa sửa corpus hoặc điểm lịch sử ở lần chuẩn bị này.

## Self-review và verification đã thực hiện

`preparationSourceSha = c75c7d1135305e07851d5e0668105d9735392071`: commit chứa source/test/prompt/data chuẩn bị, worktree clean tại savepoint. Không phải a2RunSourceSha/a3RunSourceSha và không cấp qualification cho một run.

Self-review sửa giả định không cần thiết rằng owner phải nhận toàn bộ metadata canonical. Bản preview đầu tăng max owner request lên 26.138 bytes; bỏ phần lặp bằng view/state allowlist V5, giữ canonical metadata ở code/verifier. Bản cuối max owner 17.323 bytes so với R52 15.710; phần tăng giữ nguyên hồ sơ/bảng size và chỉ dẫn dùng nguồn. Max verifier với draft 4.096 bytes: 29.993 so với 30.022 trước; cả 84 envelope local dưới 32.768 bytes. Không nới bounds/truncate hoặc lọc facts theo ý khách.

Hai prompt thay thế, không append chỉ dẫn cũ: owner 6.369 ký tự (R52 6.050), verifier 5.937 (R48 5.974). Độ dài không chứng minh chất lượng. Loại overlay làm các giới hạn evidence nguyên văn xuất hiện lại, nên vẫn có rủi ro model nhắc số đo/giới hạn quá mức; chưa thể kết luận cải thiện hay giữ nguyên chất lượng tư vấn khi chưa có provider outcomes.

| Artifact chuẩn bị | SHA-256 |
| --- | --- |
| `fashion-sales-owner-source-data-preparation-20261012.vi.txt` | `57227860314f649a2f7e0d4d3cde34aacc388947eb84a60b5ecf10f90654f21b` |
| `semantic-verifier-source-data-preparation-20261012.vi.txt` | `01e76dca4bf8ba9fff4c31b3a82a3a64b6447f8d1938fd5ae4d6f72707fd6c59` |

Các lệnh dưới chạy từ repo trong PowerShell. Node tests dùng `$env:C3_CHECKPOINT_A_ROUND='39'; $env:C3_TEST_CODEX_TRANSPORT='1'` cho môi trường compatibility suite hiện có; test chuẩn bị đọc manifest/corpus **R52 explicit**, không chạy lại provider R39/R52. Installed Codex transport dùng localhost stub, không upstream generation.

| Command thực sự chạy | Kết quả |
| --- | --- |
| `git fetch origin main` / `git rev-parse origin/main` | exit0; exact main SHA ở đầu tài liệu |
| `node --test apps/worker/evals/single-agent-semantic-verifier/preparation-20261012.test.mjs` | Initial RED exit1: 3 PASS/4 FAIL khi dùng builder cũ; minimum GREEN exit0: 7/7; sau self-review/data fixture, final GREEN 7/7, 0 skip |
| `node --test C:/Users/nguye/AppData/Local/Temp/c3-source-data-preparation-red-20261012.mjs` | Refined-contract control RED exit1: 3 PASS/4 FAIL; dùng actual builder cũ thay import preparation. Quan sát raw material/limitations bị override, chart không còn trong owner input, chỉ giữ một profile, và prompt mang điều khoản 7 ngày |
| `node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` | exit0, final 284/284, 0 skip; chạy lại sau thay đổi source/test fixture. Gồm protocol, A2/A3 mechanics, provider adapters và các round lịch sử |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` | exit0, 79/79 |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts` | exit0, 41/41 |
| `pnpm --filter @lana/worker build` | exit0, gồm dependency builds của script chuẩn |
| `pnpm --filter @lana/worker typecheck` | exit0 |
| `pnpm --filter @lana/worker lint` | exit0 |
| `git diff --check` | exit0 |
| `rg -n 'preparation-20261012\|source-data-preparation-20261012' apps packages` | Chỉ module/test chuẩn bị tham chiếu; không production/runner import |
| `git diff 4235f7d18cac0763b965e08b7a7522de8d98d8d5 --numstat` | Chỉ 8 file chuẩn bị/tài liệu/task; 5 file code/test/prompt/data mới +270/-0 physical lines |

Các kiểm tra mới chứng minh giữ đầy đủ **business fields** của canonical source trong owner view, giữ nguyên canonical verifier input/schema/config/exact draft/binding, native history và quote/size subjects; data/audit/evaluator/private labels không lẫn vào request. Test swap policy/ETA dùng hai fixture đối chứng, không là kết quả ngữ nghĩa của model. Không claim sourceVersion/observedAt của fixture lịch sử là thời điểm live hiện tại.

Đối chiếu Git với preparationBaseSha: **1.113 tracked files trong các round folders không đổi**; protocol/runner/provider adapters/boundary, hai prompt R52/R48, mọi corpus/nhãn/rubric/score/evidence cũ giữ nguyên. Inline Node audit còn kiểm tra byte hashes của R52 `manifest.json`, `a2-evidence.json`, `a3-evidence.json`, `a3-regression-scores.json`: đều giữ exact hashes trước chuẩn bị. Import search trong `apps`/`packages` chỉ thấy builder ở test chuẩn bị; không runner/entrypoint dùng nó. Không có credentials/PII mới trong diff đã self-review.

Complexity: một helper preview 43 dòng, hai prompt thay thế, một data fixture riêng và 7 test local. Không thêm semantic role/layer/gate/runtime state/provider abstraction; không có per-SKU/ref overlay, parser, retry hoặc repair. Không đổi model: owner Gemini 3.5 Flash Lite/HIGH; verifier GPT-6.1 Sol/high, cấu hình R52 chỉ được reuse làm local envelopes.

**Kết quả chuẩn bị:** local verification PASS; provider generations 0, fresh A2/A3 NOT_RUN, Checkpoint A vẫn STOP theo R52. Còn thiếu nguồn đầy đủ khớp policy mới, prospective population được freeze và quan sát chất lượng/an toàn/latency/usability mới. Không GO hoặc tự tiếp tục B/post-A.
