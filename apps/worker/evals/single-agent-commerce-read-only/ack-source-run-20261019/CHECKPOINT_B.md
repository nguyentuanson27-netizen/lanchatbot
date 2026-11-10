# ACK / unavailable-source wording model run

**Recommendation: BLOCKED — chưa đo được đủ mục tiêu do lỗi nguồn/kết nối.** Đây là trạng thái của đợt đánh giá, không phải đã xác định mọi ca lỗi do model. Không GO sales/live; A vẫn OWNER_BYPASS. Không full24B1/A2/A3, deploy/live send hoặc tạo đơn POS.

## Identity

- implementationBaseSha/origin main được refresh ở đợt implementation: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Prompt fix base `c1251ae6f478163e8304aeadf1fa95048a22c084`; runSourceSha **`1b6927849ba5339b0c06fc49940e15cb6bd25602`**. Clean executable/config worktree lúc dispatch; không đổiHEAD trong mọi provider generation, kể cả advice continuation. Source SHA chỉ lưu runtime output, không ghi ngược frozen registration.
- Primary/report artifacts savepoint `5aaad762`; operational triage trước primary để chẩn đoán exit13. Không claim blind review khóa trước diagnosis. Chưa có independent judge hoặc owner chấm tay.
- Owner Vertexglobal `gemini-3.5-flash-lite`, version cùng tên, HIGH; max8192out/candidate1/text/plain/no thoughts, default sampling, retry0/timeout90s. Verifier `gpt-6.1-sol` high/Codexlogin bounded relay0.159.2/Responses/tools[]/tool_choice:none/store:false/stream:true/one upstream request per generation/retry0/timeout90s. Không substitute models hoặc đổi API.
- Owner prompt9.435bytes SHA256 `81e187d379f017397897c513eeae0cad214f20cb7b05ad449ee69b7d84c9289f`; verifier `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Corpus/config/launcher hashes/models/generation config/rubric/review clarification freeze trong [REGISTRATION.json](REGISTRATION.json). [SCOPE.md](SCOPE.md) ghi16slots N1/max52/no retries. Reuse exact bytes runner/cases, không framework mới.

## Complete denominator

| Population | Registered | Recorded actual outcomes | BLOCKED chưa sinh | Requests | Kết quả review |
| --- | ---: | ---: | ---: | ---: | --- |
| Stateful | 8 | 8 | 0 | 16 | 7USABLE +1ownership control |
| Integrated B1 | 4 | 4 | 0 | 5 | 4UNUSABLE actual outcomes do nguồn/transport/readback |
| Captured advice | 4 | 2 | 2 | 4 | 1USABLE;1không trả được giá từ capture thiếu dữ kiện;2không chấm quality |
| Tổng | 16 | 14 | 2 | 25 | 8USABLE /5UNUSABLE /1control /2BLOCKED |

25generation requests:18owner/7verifier, mỗi generation record1request, retry0. Có1provider transport error (1/25=4%);0recorded provider timeout. Hai Qdrant source errors và một readback unavailable ghi riêng, không bị bỏ denominator. Helper metrics cũ bỏ sót transport khiHTTP/statusnull; supplemental scan generation.status/failureCode đã đếm đúng1error, không đổi raw. Usage owner17/18records có:input78.338/output14.828, còn1recordfailed không có usage; verifier7/7records input40.075/output780. Không suy token0 cho request thất bại; cost không expose.

Verifier6PASS/1FAIL. BốnPASS thuộc stateful, haiPASS thuộc advice; integratedFAIL là draft hứa treo vải tự phẳng, không được gửi. Terminal cuối integrated là CURRENT_READBACK_UNAVAILABLE do readback thất bại sau verdict, giữ cả hai facts. Không dùng PASS để cứu nguồn đã đổi/lỗi. Không có evidence falsePASS gửi lời hứa đó.

Terminal: SEND_ELIGIBLE6/16, HANDOFF3/16, NO_SEND4/16, FALLBACK1/16, BLOCKED2/16. Không coi mọi HANDOFF/NO_SEND là lỗi: haiNO_SEND stateful là code actual checkout invitation/private preview, haiHANDOFF stateful là confirmation/human control. Integrated handoff textnull không chứng minh actual handoff nhân viên. Fallback literal `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.”. Không thế terminal hỏng bằng rejected draft để chấm tốt hơn.

## Điều đã biết và chưa biết

Correction mới: **“Dạ em đã cập nhật lại số đo và giữ nguyên 2 áo size L theo ý chị rồi ạ!”**. Ngắn hơn bản trước, giữ đúng state và lựa chọn mua, không tự kết luận fit. Còn giọng cập nhật nhưng chỉ cần polish; không đếm số đo để chấm. Luồng giỏ/quote/checkout vẫn chạy đúng. Hai lượt partial-source cần kiểm giọng không có generation vì Qdrant lỗi, advice bị chặn theo; **chưa có kết luận fix giọng thiếu nguồn đã hiệu quả**.

Advice changed-occasion chọn một món shop để giải quyết ưu tiên mới và được verifierPASS; advice lookup truthful nhưng không có giá, chưa giải quyết việc mua. Draft integrated có lời hứa tự phẳng bị chặn đúng. [Đủ16slot và lời thực nhận](CONVERSATIONS_AND_REVIEW.md), [finding/root cause và giới hạn](FINDINGS.md), [diagnosis kỹ thuật](OPERATIONAL_DIAGNOSIS.json).

## Thời gian và kiểm chứng

- Verifier7records p50 **5,958s**, p95 **9,550s**.
- Added verification/readback7records p50 **7,800s**, p95 **1.059,966s** (khoảng17,67phút), max1.510,037s (khoảng25,17phút). Giữ cả outlier readback unavailable; không dùng để so tốc độ model của vòng khỏe. Có interruption trong phiên, chưa chứng minh nguyên nhân của quãng chờ/mạng.
- Source/prompt registrations3/3khớp; exact owner prompts18; verifierbindings7; exactPASStexts6; advicecapturehashes2;2missingcaptures giữBLOCKED. Audit31wire bodies cấu trúc0evaluatorlabelsleak,34publicartifacts hasheskhớp. Helper accounting đếm38wire audit events do bản ghi verifier trùng phase; không nhầm với25generation requests.
- Public raw34files:26exact byte copies,8providerattemptcopies bỏ riêng private ingress batch; toàn bộ exact text/state/usage không sửa. StagedGit raw hashes34/34đã kiểm. Private turn0model requests; testDatabaseDropped:true; delivery capture only/sendEnabled:false.

## Commands đã chạy và sự cố

1. Freeze/copy exact runner/corpus/active prompt/config và commit1b692784. Chạy `python apps/worker/evals/single-agent-commerce-read-only/ack-source-run-20261019/run.py <TEMP>/c3-division-session-20261019.py <TEMP>/c3-ack-source-run-20261019`.
2. Stateful preflight, B1 source-check/build và stateful provider-run exit0. B1 --range1:4 đã ghi đủattempts/completion nhưng **exit13**: unsettled top-level await ởcleanup database/redis; parentrunner exit1 trướcadvice. Retain log,25phút readback/outcomes vàcommands, không giả là toànrunexit0.
3. Đọc evidence sau interruption; không lặp B1/stateful. Chỉ tạo advice-input/CAPTURE_INPUT_HASHES bằng cùng capture rule và invoke stage advice chưa chạy, cùngsource/launcher; adviceexit0. Hai capture vắng → BLOCKED, không thay dữ kiện hoặc sinhbù. Exact argv/exit/continuationnote trong [raw/commands.json](raw/commands.json).
4. `python <TEMP>/c3-gemini-prompt-once-primary.py <TEMP>/c3-ack-source-run-20261019` exit0; whole-turn review14outcomes +2BLOCKED, giữ missing qualitylabelsnull. Publisher exit0/34files, Gitdiffcheck ban đầu phát hiện whitespace trong Markdown hiểnthị; làm sạch chỉ displaycopy, raw/PRIMARY exacttext giữ nguyên, stagedhashes34/34PASS; commit5aaad762.
5. Reuse metricshelper exit0; bổ sung erroraccounting từ generationstatus vì helper cũ thiếu transporterror. Offline diagnostics giữ1error/25requests/2sourceerrors/1readbackerror; không rerunprovider.
6. `node <TEMP>/c3-current-prompt-rerun-audit.mjs <TEMP>/c3-ack-source-run-20261019 apps/worker/evals/single-agent-commerce-read-only/ack-source-run-20261019 OPERATIONAL_TRIAGE_PRECEDED_PRIMARY` exit0. Marker minh bạch quy trình triage, không giảSHAreviewblind.
7. Offline validation đọc trực tiếp Git blob tại runSourceSha: owner/verifier/corpus/review clarification/runner hashes 5/5 khớp; 16 slots, 2 missing quality labels đúng BLOCKED, 25 request records mỗi record1request, 1 provider error, 6PASS/1FAIL; public Git artifacts34/34 hashes khớp. Tất cả PASS. `git diff --check` PASS. Việc bổ sung báo cáo không gọi provider.

Implementation prompt đã chạy515evalPASS/2opt-inSKIP tại c1251ae6; không rerun fullworker suite từ lượt chỉ thêmregistration/artifacts/report. Source-checkrunner đã build trên run source. Không thay runtime/prompt để cứu kết quả, không chạy retry/mẫu bù hoặc tự mởvòng mới.

## Disposition

**BLOCKED cho việc đánh giá đủ tác động bản sửa**, giữAOWNER_BYPASS/Bsales-livechưaGO. Không lấy điểm thấp do nguồn lỗi làm kết luận model kém đi; cũng không lấy correction một mẫu để nói fix đã ổn định. Muốn đo lại hai ca báo thiếu nguồn cần một run mới trên kết nối khả dụng; không sửa evidence hoặc nối lại attempt đã lỗi trong run này.
