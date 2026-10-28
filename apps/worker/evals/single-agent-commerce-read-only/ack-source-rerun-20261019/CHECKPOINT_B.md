# ACK/source wording rerun — kết quả

**Hoàn tất16/16 slots; recommendation STOP sales/live readiness.** Không lỗi nguồn/provider, nhưng1fallback do lời hứa vải tự phẳng không có căn cứ; giọng còn finding. Đây là đợt đo Phase B trên subset hiện hữu, không phải full24 B1, A2/A3 hoặc Checkpoint A được thông qua. A vẫn OWNER_BYPASS.

## Source và freeze

- implementationBaseSha/origin main được refresh ở đợt sửa: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Preparation base `8478e5a4ed687c541e44b82fd408e4fa105b2e2b`; prompt fix `c1251ae6`.
- runSourceSha **`733a719dce7681d76e706b0a9c4e6948a613daa8`**: clean executable/config worktree trước generation, HEAD không đổi trong run. SHA chụp runtime, không ghi ngược frozen inputs.
- Primary review lock **`bc3e38da`** trước rejected draft/verifier diagnosis. Review do Codex đọc whole actual dialogue/public state, chưa có independent reviewer hoặc owner chấm tay; không thêm model judge role.
- Owner Vertex global `gemini-3.5-flash-lite`, version cùng tên, HIGH, candidate1/text/plain/max8192out/includeThoughts:false; provider-default temperature/topP, retry0/timeout90s. Credential route hiện hữu `C3_VERTEX_CREDENTIAL_FILE`.
- Verifier `gpt-6.1-sol` high qua Codex login/bounded relay0.159.2; Responses, tools[], tool_choice:none, parallel_tool_calls:false, store:false, stream:true; default sampling/output cap, retry0/timeout90s/maxResponseBytes1048576/one upstream generation request per attempt.
- Owner prompt9.435bytes SHA256 `81e187d379f017397897c513eeae0cad214f20cb7b05ad449ee69b7d84c9289f`; verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Exact corpora/config/launcher/rubric hashes và limits trong [REGISTRATION.json](REGISTRATION.json). Giữ nguyên so vòng lỗi trước; không substitute model, sửa prompt/runtime, đổi scoring hoặc tăng cases giữa run.

## Complete denominator và review

| Population | Slots N1 | USABLE | NEEDS_EDIT | UNUSABLE actual | Control | Requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Stateful | 8 | 7 | 0 | 0 | 1 | 14 |
| Integrated B1 | 4 | 4 | 0 | 0 | 0 | 13 |
| Captured advice | 4 | 3 | 0 | 1 | 0 | 8 |
| Tổng | 16 | 14 | 0 | 1 | 1 | 35 |

N1/max52requests/retry0. Thực dùng35generation requests (23owner/12verifier), mọi record1request,0provider/source errors/0recorded timeout/0blocked/missing capture. Không lỗi bị bỏ denominator hoặc mẫu bù. Advice phụ thuộc integrated capture, không tính như tám hội thoại tư vấn live độc lập.

Verifier11PASS/1FAIL, mọi surviving final draft được kiểm một lần; không retry/repair. Terminal SEND_ELIGIBLE11/16, HANDOFF2/16, NO_SEND2/16, FALLBACK1/16 (6,25%). Hai NO_SEND là checkout invitation/private preview code thực sự phát; hai HANDOFF là purchase confirmation/customer-requested human. Không gọi các terminal nghiệp vụ này là fallback lỗi.

Fallback thuộc advice changed-occasion; owner hứa “giũ nhẹ hoặc treo lên là vải sẽ suôn phẳng lại ngay”. VerifierFAIL/UNSUPPORTED_PROTECTED_ASSERTION/product:SV2447 đúng phần hứa hiệu quả cụ thể; nguồn không xác nhận. Actual terminal: `C3_A_NONPROTECTED_V2`, “Phần này em chưa trả lời được, chị nhé.”. Không dùng draft bị chặn để chấm tốt hơn câu khách nhận. Không quan sát lời hứa đó được send-eligible trong attempt này; không diễn giải thành bảo đảm safety ngoài population.

## Chất lượng và giới hạn

Hai partial-source replies đã bỏ giải thích hệ thống, trả phần chất liệu/dáng và giữ chưa biết mua lẻ/giá/tồn đúng nguồn. Advice một đoạn gọn hơn; integrated vẫn mô tả và xin thông cảm dài. Correction giữ đúng state và lựa chọn, nhưng lại dài hơn correction ở vòng lỗi trước, vẫn “cập nhật” và kể giỏ. USABLE có voice findings, không có nghĩa giọng đã tốt ổn định. Không đếm số đo để chấm: dẫn chứng hợp lý được phép.

Concern còn ngân sách/tính từ và mở nhiều lựa chọn chưa giải thích phối rõ, quote/ACK còn nhắc thông tin dài. Dữ liệu giỏ/tiền/checkout đúng; private turn0model requests, test DB đã drop. Không live send/deploy hoặc tạo POS order. [Toàn bộ16hội thoại](CONVERSATIONS_AND_REVIEW.md), [findings](FINDINGS.md), [exact fallback và rejected draft](FALLBACKS.md).

So vòng lỗi trước, tăng USABLE8→14 chủ yếu có điều kiện vận hành khác và prompt giữ nguyên; không coi là prompt vừa tốt thêm. So vòng khỏe sales-context (prompt cũ), báo thiếu nguồn gọn hơn nhưng1fallback thay0, giọng/cách chọn vẫn dao động. Nhãn correction cũ có review bổ sung khác từ trước run; không sửa raw/primary/counts lịch sử để nâng kết quả. [Đối chiếu từng ca](COMPARISON.json).

## Vận hành và evidence

- Verifier latency12records: p50 **6,860s**, p95 **13,065s**.
- Added verification latency gồm readback/final gate12records: p50 **8,098s**, p95 **16,486s**. Không coi đây là thời gian toàn bộ lượt owner/tool.
- Owner usage input83.932/output19.354; verifier input56.010/output1.452. Không thiếu usage; cost không expose. Owner latency không có ở generation record shape này, không suy từ thời gian runner.
- Source/prompt registrations3/3; verifier bindings12; exact eligible text11; exact owner prompt captures23; wire bodies kiểm cấu trúc43,0evaluator-label leaks;4capture hashes khớp;34public artifact hashes khớp. Accounting helper đếm55wire events vì verifier có nhiều phase ghi cùng request; không nhầm với35generation requests.
- Raw34files:26exact bytes và8copies bỏ riêng synthetic private ingress batch; raw không normalize EOL. Exact published Git blob hashes34/34 đã kiểm. Không sửa source facts/draft/terminal/state/usage khi xuất public evidence.
- Complexity delta của lượt này: registration/output mới, runner/cases copy exact bytes để đọc sibling inputs. Không thêm role/gate/parser/state/framework/runtime code hoặc production wiring.

## Commands thực sự chạy

1. Offline input comparison/copy: models/prompt/schema/corpora/source-config hashes giữ nguyên; commit registration733a719d.
2. `python apps/worker/evals/single-agent-commerce-read-only/ack-source-rerun-20261019/run.py <TEMP>/c3-division-session-20261019.py <TEMP>/c3-ack-source-rerun-20261019` — exit0. Năm child commands: stateful preflight, B1 source-check, stateful provider-run, B1 range1:4 và advice diagnostic đều exit0; source-check/B1 bao gồm build hiện hữu. Exact argv/exit trong [raw/commands.json](raw/commands.json). Không cleanup exit13 như vòng trước.
3. `python <TEMP>/c3-gemini-prompt-once-primary.py <TEMP>/c3-ack-source-rerun-20261019` — exit0, đủ16records. Whole-turn review ghi14USABLE/1actualfallback/1control, khóa tại bc3e38da trước diagnosis. Không thêm provider judge generation.
4. `python <TEMP>/c3-gemini-prompt-once-publish.py <TEMP>/c3-ack-source-rerun-20261019 apps/worker/evals/single-agent-commerce-read-only/ack-source-rerun-20261019` — exit0,34artifacts. Markdown hiển thị trim whitespace; exact strings giữ trong raw/PRIMARY_REVIEW.json.
5. `python <TEMP>/c3-gemini-prompt-once-metrics.py <TEMP>/c3-ack-source-rerun-20261019 apps/worker/evals/single-agent-commerce-read-only/ack-source-rerun-20261019` — exit0,35requests/0errors/retry0. Supplemental scan generation.status/failureCode/HTTP và source errors xác nhận0errors, không dùng helper thiếu transport check của run trước để giả0.
6. `node <TEMP>/c3-current-prompt-rerun-audit.mjs <TEMP>/c3-ack-source-rerun-20261019 apps/worker/evals/single-agent-commerce-read-only/ack-source-rerun-20261019 bc3e38da` — exit0, source/prompt/binding/wire/firewall/capture/artifact/cleanup checks PASS.
7. Offline validation5frozen hashes trực tiếp Git tại runSourceSha (owner/verifier/corpus/review clarification/runner),34published raw Git hashes,16labels/35requests mỗi record1request/5child commands exit0 — PASS. JSON parse/`git diff --check` kiểm trước report savepoint.

Full eval515PASS/2opt-inSKIP đã chạy trên prompt fixc1251ae6; không rerun full worker tests/typecheck/lint từ lượt chỉ thêm registration/evidence/report. Source-check runner build trên run source đã qua; không claim unit tests chứng minh giọng tự nhiên hoặc kết quả mới này là full Phase B acceptance.

**STOP** tại báo cáo. Hai ca báo thiếu nguồn nay đã được đo; cách nói bớt nội bộ nhưng chưa ổn định, vẫn còn lời hứa công năng bị chặn. Không tự fix/rerun tiếp hoặc triển khai live từ kết quả một lần mỗi ca.
