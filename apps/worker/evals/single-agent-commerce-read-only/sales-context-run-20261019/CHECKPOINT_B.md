# Phase B — sales context model run

Đã chạy đủ16 slots sau bản sửa `cd5d4da0`. **Recommendation: STOP sales/live readiness**; không có fallback trong mẫu này nhưng còn3 actual replies cần sửa và chưa có evidence ổn định nhiều mẫu. A vẫn OWNER_BYPASS. Đây không phải full A2/A3 hoặc chứng nhận Checkpoint A.

## Identity và cấu hình

- implementationBaseSha / refreshed origin/main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Implementation savepoints: `5b75011c` (source/bound/code lookup), `cd5d4da0` (presentation/formatter/prompt).
- runSourceSha: `94cb47d2fbb17e87084373b25e1d39feefd62403`, clean executable/config worktree lúc chạy. HEAD không đổi trong generation; SHA chỉ ghi vào runtime output.
- Primary review lock: `64b2cd67`; diagnosis thực hiện sau lock. Raw34 files được giữ:26 exact byte copies,8 copies bỏ riêng synthetic private ingress batch. Hash34 staged Git blobs đã so khớp artifact index; raw không normalize EOL.
- Owner: Vertex AI global `gemini-3.5-flash-lite`, version cùng tên, HIGH; candidate1/text/plain/maxOutputTokens8192/includeThoughts:false; provider-default temperature/topP; retry0/timeout90s. Credential route `C3_VERTEX_CREDENTIAL_FILE` hiện hữu.
- Verifier: `gpt-6.1-sol`, high, installed Codex0.159.2 login/bounded relay; Responses/tools[]/tool_choice:none/parallel_tool_calls:false/store:false/stream:true; provider-default sampling/max output; retry0/timeout90s/maxResponseBytes1.048.576/one upstream request per generation attempt.
- Owner prompt SHA256 `5e9c85034ccf164274888093650db477b4e296b26dadc35642339993ad520824` (9.309 bytes); verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Exact models/config/corpus/input/launcher/rubric hashes: [REGISTRATION.json](REGISTRATION.json); actual child source identities và request body audit: [SOURCE_AND_WIRE_AUDIT.json](SOURCE_AND_WIRE_AUDIT.json).

## Complete denominator và kết quả

| Population | Slots | USABLE | NEEDS_EDIT | UNUSABLE | Control | Generation requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Stateful | 8 | 6 | 1 | 0 | 1 | 14 |
| Integrated B1 | 4 | 3 | 1 | 0 | 0 | 14 |
| Captured advice | 4 | 3 | 1 | 0 | 0 | 8 |
| Tổng | 16 | 12 | 3 | 0 | 1 | 36 |

N1; tối đa52generation requests, dùng36 (24owner/12verifier), mọi generation providerRequests=1, retry0/provider error0/timeout0. Không lỗi nào bị bỏ khỏi denominator hoặc lấy mẫu bù. Tất cả12 surviving final model drafts được verifierPASS; audit12bindings/exact eligible texts,24exact owner prompt captures,44wire bodies đã kiểm cấu trúc,0evaluator-label leaks,4advice capture hashes khớp,3child registrations cùng source/prompts. Không quan sát vi phạm protected mới theo ranh giới suy luận bán hàng đã được owner duyệt; đây không phải A2 unsafe-corpus result hay bảo đảm safety ngoài population này.

Primary là review do Codex đọc toàn bộ hội thoại/public state theo rubric đã freeze; chưa phải owner chấm tay hoặc một review độc lập. Không có thêm provider judge role hoặc generation request để chấm điểm.

Terminal model-route: SEND_ELIGIBLE12/16 (75%), HANDOFF2/16 (12,5%), NO_SEND2/16 (12,5%), FALLBACK0/16. Hai NO_SEND là checkout invitation/private preview đã thực sự phát bởi code; hai HANDOFF là purchase confirmation và customer-requested human. Không coi bốn outcome hợp lệ này là lỗi model hoặc mất phản hồi. Advice replay phụ thuộc integrated capture, không gộp thành tám hội thoại tư vấn độc lập.

Fallback trước3/16→nay0/16. Primary trước7USABLE/5edit/3UNUSABLE/1control→nay12/3/0/1. Clarification review đã preregistered; ít nhất concern integrated đổi cách gán nhãn dù cùng kiểu tư vấn, nên không quy toàn bộ chênh lệch là cải thiện model. [Đối chiếu](COMPARISON.json), [findings và giới hạn](FINDINGS.md), [đủ hội thoại](CONVERSATIONS_AND_REVIEW.md).

## Vận hành

- Verifier latency12/12 records: p50 **5,332s**, p95 **8,741s**.
- Added end-to-end verification latency (gồm phần readback/gate hiện hữu,12 records): p50 **6,694s**, p95 **10,061s**.
- Owner tokens: input89.943 / output18.935; verifier input60.594 / output1.143, usage không thiếu. Đây là giá trị do adapter ghi lại; cost không expose. Owner latency không có trong generation record shape này, không suy từ tổng thời gian runner.
- Captured products của changed-occasion:1→4→4, không overflow rejection ở mẫu chạy. Lookup truyền đúng productCode và MATCHED. [Boundary diagnosis](BOUNDARY_DIAGNOSIS.json).
- Private checkout0model requests, testDatabaseDropped:true, delivery capture only/sendEnabled:false, không live POS order/deploy/send. Nguyên bản output task-temp giữ; public artifact chỉ bỏ private ingress batch, không đổi terminal/draft/receipt/usage.

## Commands thực sự chạy

1. Chuẩn bị registration bằng active manifest/hash và copy exact bytes runner/cases cũ, assert corpus/config/launcher identity; commit registration94cb47d2.
2. `python apps/worker/evals/single-agent-commerce-read-only/sales-context-run-20261019/run.py <TEMP>/c3-division-session-20261019.py <TEMP>/c3-sales-context-run-20261019` — exit0. Năm child commands: stateful provider preflight, B1 source-check/build, stateful provider-run, B1 --range1:4 --run/build, advice diagnostic — tất cả exit0; exact argv trong [raw/commands.json](raw/commands.json).
3. `python <TEMP>/c3-gemini-prompt-once-primary.py <TEMP>/c3-sales-context-run-20261019` — exit0; đọc đủ16actual outcomes, chấm từng whole turn theo rubric đã đăng ký; commit primary64b2cd67 trước diagnosis.
4. `python <TEMP>/c3-gemini-prompt-once-publish.py <TEMP>/c3-sales-context-run-20261019 apps/worker/evals/single-agent-commerce-read-only/sales-context-run-20261019` — exit0,34artifacts. Diff whitespace của Markdown hiển thị được làm sạch; exact text giữ trong PRIMARY_REVIEW.json/raw. Raw staged blob hashes34/34 khớp sau áp dụng thuộc tính giữ bytes.
5. `python <TEMP>/c3-gemini-prompt-once-metrics.py <TEMP>/c3-sales-context-run-20261019 apps/worker/evals/single-agent-commerce-read-only/sales-context-run-20261019` — exit0, đủ16/36/0retry và retained request/usage evidence.
6. `node <TEMP>/c3-current-prompt-rerun-audit.mjs <TEMP>/c3-sales-context-run-20261019 apps/worker/evals/single-agent-commerce-read-only/sales-context-run-20261019 64b2cd67` — exit0, source/prompt/binding/capture/artifact/evaluator-firewall/DB-cleanup audit PASS.
7. Offline latency inspection đầu thử sort cả owner records có null và fail TypeError; không gọi provider. Sau đó báo đúng verifier12records và owner latency NOT_POPULATED, không bỏ generation nào khỏi accounting. Boundary/source comparison inspection tiếp theo exit0.
8. Offline validation so5 frozen hashes trực tiếp từ Git blob tại runSourceSha (owner/verifier/corpus/review clarification/runner),16slots/36request records/12PASS, private turn0generation vàDB cleanup — PASS. `git diff --check` — PASS.

Worker tests/build/typecheck/lint đã chạy trên implementation trước run: [verification](../../../../../docs/specs/c3-phase-b-sales-context-fix-20261019.md). Không claim chạy lại full worker tests sau run chỉ thêm registration/evidence/report; source-check runner đã build và preflight trên run source.

## Còn lại

Ba NEEDS_EDIT đều về cách owner nói: correction mang giọng báo cáo; hai partial-source kể “hệ thống” và phần nguồn quá dài. Còn góp ý về tính từ/lặp ngân sách/thời gian, từ “phân loại” và preview dùng mã. Không có verifier rejection trong run này để làm cơ sở nới verifier. Nguồn retail fault vẫn thiếu theo đăng ký; model giữ unknown đúng hơn nhưng chưa biến thành lời báo gọn, tự nhiên.

Giữ một owner/một verifier, code sole authority. Run này không thêm semantic role/layer/state/gate; runner/corpus copy exact chỉ phục vụ registration mới. Không sửa executable/config giữa vòng, sửa điểm cũ, thử thêm provider/model, chạy bù hoặc tự mở vòng sau. Chưa đủ ổn định để GO sales/live; không tự sửa tiếp từ báo cáo này.
