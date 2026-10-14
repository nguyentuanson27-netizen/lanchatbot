# Sửa toàn bộ nhóm lỗi đã xác định — chuẩn bị 2026-10-14

Owner hỏi vì sao bản trước chỉ sửa size trong khi các finding khác còn nguyên. Bản này sửa đồng thời chỉ dẫn của owner và verifier cho các nhóm đó, giữ nguyên bản sửa hỏi đủ đầu vào size. Đây là chuẩn bị trước provider; không phải Round68 hoặc một lần Checkpoint A đã chạy. R67 A2 PASS/A3 FAIL/STOP và diagnostic 11 ca vẫn giữ nguyên.

Starting HEAD `4845def1cfa49cd70c8f2ac10cb0e13ec0b11174`; refreshed main/implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; spec SHA `3a12b167cff56ef839aa7160b5238c8bfd105e21`. Giữ branch implementation hiện tại và draft PR390. Nguồn bắt buộc: [architecture](../../../../../docs/specs/c3-single-agent-commerce-architecture-20261004.md), [amendment](../../../../../docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../../../../tasks/plan.md), [todo](../../../../../tasks/todo.md). Bằng chứng lỗi: [R67 findings](../round-67/FINDINGS.md), [toàn bộ diagnostic](../failure-recheck-20261014/REPORT.md).

## Phạm vi sửa và bằng chứng cần có

| Nhóm lỗi | Thay đổi | Đối chiếu để tránh hỏng ca khác |
| --- | --- | --- |
| Cho đổi sau hành động nguồn không cho phép | Cả hai prompt phải đối chiếu chính hành động khách hỏi, đọc cùng quy định kiểm tra/thử và điều kiện nhận đổi. Hàng còn mới/nguyên tem không cấp thêm quyền thử bị loại trừ; từ chối đi tiệc không cứu quyền mặc thử sai. | V2 HOLD_UP_ONLY khác legacy cho thử trong nhà. Không cấm chữ thử, không áp policy v2 lên legacy, không bắt mọi giới thiệu đọc toàn bộ điều kiện. Không coi chưa biết là đã đủ điều kiện; giữ original PR387 dropped-condition và summary/entitlement contrasts. |
| Chặn lời trấn an từ thiết kế và code-fit | Cả hai prompt phân biệt tư vấn thoải mái/phom/vẻ gọn gàng có căn cứ với bịa cấu tạo, phép đo/thử, độ bền hay bảo đảm trong mọi điều kiện. Không yêu cầu giọng dè dặt hoặc phép thử mặc riêng. | Giữ đúng SIZE_FIT theo món/hồ sơ. Độ kéo chun tối đa không đo lực ép; ít nhăn không thành miễn là ủi. R13 SAFE comfort và hai A3 comfort phải được đọc cùng unsafe technical/guarantee controls. |
| ETA thiếu mốc xác nhận nhưng suy kịp sáng cụ thể | Owner trả rõ chưa bảo đảm deadline, rồi ETA đã biết; không suy khả năng kịp từ thứ hiện tại khi chưa có mốc bắt đầu. Verifier ETA contract vốn chặn đúng được giữ nguyên. | Không kết luận chắc trễ từ một khoảng dự kiến, không coi mọi từ có thể là lời hứa. Không bịa mốc xác nhận hoặc ưu tiên giao; không tự làm mất ETA hợp lệ. |
| Đưa màu khác sau cảnh báo khiến khách hiểu là giải pháp độ kín | Owner chỉ giới thiệu món thay khi có căn cứ cho đúng lo ngại; chưa có thì kết luận về món hiện tại. Verifier đọc vai trò của lời đề xuất trong cả đoạn, kể cả hàm ý. | Trả tồn màu khách hỏi không tự là hứa công năng. Không cấp độ kín từ màu/tồn/phối đồ; thiếu món thay không tự là safety FAIL. Câu blue-stock trong diagnostic trước vẫn giữ điểm lịch sử và caveat, không chấm lại. |
| Thiếu đầu vào nhưng gợi size từ một vòng | Giữ nguyên toàn bộ phần size đã sửa trước; hỏi phần thiếu rồi mới tư vấn size. | Hỏi đúng supportedInputs/missingInputs; giữ giá/tồn/quote; code-fit hiện tại cho phép chọn tự tin; không bắt mọi món ba vòng hoặc ép thu size ở lượt giá/stock/defer. |
| Báo cáo token Gemini bằng 0 | Sửa đúng một dòng tổng hợp trong `operational`: nhận camelCase của adapter Gemini bên cạnh snake_case OpenAI. | Tôn trọng số 0 thật, không cộng hai alias, không cộng thinking lần hai, không bỏ timeout/missing usage khỏi mẫu số. Không đổi adapter, generation/retry hay frozen raw/report cũ. |

Không đổi policy shop trong prompt. Thời hạn, phí, lý do, cách kiểm tra/thử và quyền lợi vẫn do policyLiterals/text/sourceData hiện tại quyết định. Không thêm caseId, nhãn SAFE/UNSAFE, đáp án mẫu theo ca hoặc rubric vào hai prompt. Giữ nguyên giọng shop, ba ví dụ giả định, khả năng hiện có, authority và schema; không gắn kết quả mới vào manifest R67 hoặc diagnostic cũ.

## Prompt và kiểm tra cơ học

- [Owner candidate](../prompts/fashion-sales-owner-whole-turn-preparation-20261014.vi.txt): 8.985 byte, tăng310 so bản size8.675; SHA256 `2deeed8d63bbc3343e7f6e2e4c0e9e74c25ebbf20ad9a24aa66281b88771227f`. Thay phần đổi hoàn cảnh/món thay, tư vấn sản phẩm, policy/ETA; giữ nguyên size và phần còn lại.
- [Verifier candidate](../prompts/semantic-verifier-whole-turn-preparation-20261014.vi.txt): 9.018 byte, tăng36 so R67 8.982; SHA256 `477cb8536055e25eda9bdff18eaec661b3db594805f7232488ee1c3a6bd5a02d`. Thay policy, product advice và cách đọc món thay; giữ nhiệm vụ, nguồn/untrusted, size, tiền/ETA, receipts và output schema.
- [Readback](READBACK.json): dựng42 owner và179 verifier bodies local từ đúng nguồn/draft R67; khác duy nhất system instructions. Một history-bound reject giống control. Poison toàn bộ evaluator fields không xuất hiện trong request. Nguồn legacy/v2 còn riêng; raw A2/A3/primary và diagnostic hashes không đổi. Đây không phải captured provider request-count evidence mới.
- Token RED quan sát0/2 trước sửa: aggregate12 thay vì22, owner0 thay vì10. Minimum GREEN2/2 sau sửa một dòng. Test này chứng minh báo cáo số, không chứng minh model hiểu policy hoặc hết fallback.

## Self-review

Đã đối chiếu các phần sửa với toàn bộ11 kết quả diagnostic, các contrast policy/comfort hiện có và các control size/product/correction. Bỏ cách vá một câu bằng keyword hoặc thêm quy định shop vào prompt; dùng lại hai role và dữ liệu đã đủ. Không thêm role, layer, runtime module, state, tool, gate, classifier, parser, regex/template, repair/reverify hay dependency. Complexity delta: hai candidate prompt riêng để giữ frozen history; một dòng thống kê và hai regression tests trong một file. Không có production/shared source hoặc provider API change.

Self-review phát hiện cần giữ câu phân biệt một giải thích có điều kiện với danh sách đủ điều kiện; đã khôi phục câu đó trước readback cuối để tránh lặp việc chặn nhầm giới thiệu policy ngắn. Đây là sửa chỉ dẫn, chưa có quan sát model mới. Không dùng một từ như thử, thoải mái, cả ngày hoặc tên màu để quyết định kết quả.

Các rủi ro còn phải kiểm chứng bằng provider: model có phân biệt đúng legacy/v2 trong lời cho phép thực tế không; lời trấn an có còn bị từ chối hay bị cho qua quá rộng không; đề xuất thay có còn hàm ý công năng thiếu căn cứ không; tổng thể lời tư vấn có gọn, hữu ích và tự nhiên không. Cùng request từng có verifier variance; test local/readback không chứng minh ổn định. Không gọi bản chuẩn bị là đã fix xong hành vi model, không chuyển STOP thành GO.

Không có generation mới trong task này, không đăng ký thêm ca/lượt hay đổi model/config/threshold/corpus/nhãn/scoring/fallback. Một run mới phải có freeze, source seal và readiness riêng; verifier candidate không kế thừa A2 PASS cũ. Không merge/deploy/live send hoặc post-A.

## Commands thực sự chạy

| Command | Kết quả |
| --- | --- |
| `git fetch origin main`, `git rev-parse origin/main` | Exit0; main SHA như trên. |
| `node --test apps/worker/evals/single-agent-semantic-verifier/operational-usage.test.mjs` | RED0/2 exit1 trước sửa; GREEN2/2 exit0 sau sửa; 0skip. |
| `node --test --test-concurrency=1` với9file focused dưới đây | 52/52 PASS, 0skip, exit0. |
| `node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` | 422/422 PASS, 0skip, exit0;113702.1072ms. |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` | 79/79 PASS, exit0. |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | 21/21 PASS, exit0. |
| `pnpm --filter @lana/worker build` | Exit0. |
| `pnpm --filter @lana/worker typecheck` | Exit0. |
| `pnpm --filter @lana/worker lint` | Exit0. |
| Local readback script và `git diff --check` | Exit0. |

Node tests/readback đặt `C3_CHECKPOINT_A_ROUND=39` theo test stack hiện hành; tests đặt `C3_TEST_CODEX_TRANSPORT=1` để bật transport stub, không gọi provider thật. Các9file focused: `operational-usage.test.mjs`, `protocol.test.mjs`, `policy-meaning-preparation.test.mjs`, `size-input-context.test.mjs`, `size-input-context-decision.test.mjs`, `preparation-20261012.test.mjs`, `codex-inference.test.mjs`, `gemini-inference.test.mjs`, `failure-recheck-20261014.test.mjs`, dưới thư mục eval này. Build/typecheck có chạy prebuild phụ thuộc của worker, không sửa shared source.

Logs thực tế tại `C:/Users/nguye/AppData/Local/Temp/c3-whole-turn-preparation-{focused,full,worker,protected,build,typecheck,lint}.{stdout,stderr}.log`. Readback command: `node C:/Users/nguye/AppData/Local/Temp/c3-whole-turn-preparation-check.mjs <absolute-repository-path>`. Hai lệnh `git diff --no-index` dùng để review cặp prompt trả exit1 do có khác biệt, không phải test FAIL. RED được giữ trong tool output; không có file log RED riêng. Không claim remote CI PASS hoặc acceptance của owner/independent reviewer.
