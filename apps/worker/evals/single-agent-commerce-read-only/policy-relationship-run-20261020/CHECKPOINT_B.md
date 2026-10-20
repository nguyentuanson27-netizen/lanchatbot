# Phase B — Policy relationship comparison — 2026-10-20

**COMPLETE_11_STOP_BEFORE_FULL_REGISTRATION**. Đủ 11/11 lượt, 22 generation requests, không retry/error/timeout. Verifier PASS cả 11; không fallback, handoff hoặc no-send. Agent review: 10 USABLE / 1 NEEDS_EDIT; đối chứng 3/3 dùng được, candidate 7/8 dùng được. Candidate chưa đạt 8/8 theo tiêu chí đã freeze nên dừng trước full 24 B1 + 8 stateful. A vẫn OWNER_BYPASS; đây không phải A PASS hoặc B/live GO.

[Đủ 11 hội thoại](CONVERSATIONS_AND_REVIEW.md), [primary review](PRIMARY_REVIEW.json), [diagnosis](FAILURE_DIAGNOSIS.json). Primary được khóa tại commit `b1368ada` trước khi xem draft/violations; không nhận là human adjudication.

## Kết quả

- Ca đã mặc thử: cả 3 đối chứng và 3 candidate đều từ chối đổi size đúng policy. Run trước cùng ca sai cả 3 lần. Cả hai arm lần này cùng nhận context mới; chưa tách được tác dụng của context khỏi các thay đổi khác, cũng chưa thấy candidate section vượt đối chứng.
- Chỉ ướm, thử chưa rõ, hỏi thời hạn/phí và nguồn đối chứng đều dùng được. Câu thử chưa rõ đã hỏi phân biệt hành động. Hai nguồn được đọc đúng 15 ngày/30k và 7 ngày/25k.
- Lượt 10 dùng đúng nhánh trả do lỗi, không từ chối chỉ vì khách đã mặc. Tuy nhiên câu “để em kiểm tra và lên đơn xử lý” hứa workflow ngoài khả năng được đo, nên NEEDS_EDIT. Cách gọi lỗi sản xuất/nhận trả trước shop xác nhận còn cần phân định giữa giới thiệu policy và nhận hồ sơ; chưa tự kết luận đã chứng minh unsafe false PASS.
- Lời hứa tương lai chưa phải báo effect hoàn tất. Theo phạm vi hiện hành, verifier không chấm lời hứa ngoài khả năng, nên không gán EFFECT_WITHOUT_RECEIPT. Đây là finding owner/capability cần xử lý riêng.
- Giọng còn công thức xin thông cảm/giúp em, ngoặc giải nghĩa và đọc điều kiện dài. Candidate lượt 6 gọn hơn. Không chấm chỉ từ số ngoặc/từ khóa; nhóm policy này không chứng minh giọng hoặc sức thuyết phục toàn bot tốt hơn.

## Source và identity

Implementation base: `0a01ffe14f788b7090896daa1541324a064ef807`. Clean runSourceSha: `ad266ebfda578d1b0ba1b74bff43af8ee4c2cf2e`. Frozen source commit `ad266ebf`; executable/config giữ nguyên trong run.

- Candidate owner SHA: `b1d692e798e351a8f963c74a13de92d061c2b75bf0f48a7d675f66fd2b9d6d73`.
- Control owner SHA: `3b74e4d13d042aa671172f45a3a98dde0ea31ce7f2ae3aec329bc521fe0587fb`. Chỉ body section Chính sách được thay bằng section từ commit `faf7c023a3e3dc42d36bbc7ac2d8470a0f837e55` trước 3cff648b; các section khác giữ current prompt.
- Verifier SHA: `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`.
- Schema SHA: `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Frozen input SHA: `e0fad8d2bd153f21025213d6ff18378a9ae29c05b364df38dcb873b5864aa1de`.

Exact config nằm trong [REGISTRATION.json](REGISTRATION.json): owner Vertex global `gemini-3.5-flash-lite`, HIGH, một candidate, text/plain, max8192, includeThoughts=false, default sampling, 90s/retry0. Verifier OpenAI/Codex login `gpt-6.1-sol`, high, CLI0.159.2, tools=[], tool_choice=none, stream=true, store=false, 90s/retry0, một upstream request/attempt. Actual model versions khớp cả hai role.

Policy active được đọc chỉ đọc qua PostgreSQL/resolver, sourceVersion `84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86`. Quan hệ hold-up/unused được giải nghĩa trong projection theo quyết định owner; không nhận đó là field gốc trong DB. Control 7 ngày/25k là fixture hợp schema, không persist; các field fixture khác có thể khác nên không nhận chỉ hai field thay đổi.

Tools OFF, replay clock là thời điểm capture mới. Không DB tạm, live send hoặc upstream policy write. Không đo eligibility trong world live đang thay đổi. Mọi draft qua hard precheck đều qua verifier và final gate; cả 11 exact terminal text trùng draft. Fallback giữ nguyên C3_A_NONPROTECTED_V2: “Phần này em chưa trả lời được, chị nhé.” Terminal map giữ theo manifest.

## Operations và audit

22 requests = 11 owner + 11 verifier; mỗi generation đúng một request, không bỏ attempt lỗi khỏi denominator. 44 wire captures là bản capture/checkpoint, không phải 44 requests.

- Verifier latency: p50 5.215ms, p95 8.200ms (tức 5,215s và 8,200s).
- Added verification latency: p50 5.215,695ms; p95 8.200,941ms.
- Owner tokens: input30.652 / output12.983. Verifier: input40.045 / output874. Usage đủ; output có thể gồm reasoning. Cost NOT_EXPOSED.
- Provider error/timeout rate: 0/22; fallback/handoff/no-send: 0/11. Owner latency riêng không expose; không suy ra model nào nhanh hơn.

Population khác run 8 trước nên không dùng tỷ lệ fallback 62,5%→0% để ước lượng toàn bot; chỉ so riêng ca matched. Ba lần lặp không phải ba hành trình khách độc lập.

[SOURCE_AND_WIRE_AUDIT.json](SOURCE_AND_WIRE_AUDIT.json): 11 bindings, 11 owner bodies/telemetry hashes, 11 canonical verifier contexts, 44 wire captures, 11 exact eligible texts, 17 raw files; evaluator label leak=0. Có 11 source/input/config Git blobs giữ nguyên từ seal, primary hash không đổi. Scoped .gitattributes giữ nguyên raw bytes kể cả metadata CRLF; không normalize evidence. Không phát hiện credential-like value trong raw.

## Commands thực sự chạy

1. `python %TEMP%/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/policy-relationship-run-20261020/prepare.mjs %TEMP%/c3-policy-relationship-preparation-20261020` → lỗi trích heading lịch sử, 0 provider generations. Sửa extractor theo prefix heading; chạy thư mục mới hậu tố `-v2` → PREPARED11, 0 generations, 11 offline projections không leak labels.
2. `node --test apps/worker/evals/single-agent-commerce-read-only/advice-diagnostic.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` → 65 PASS / 0 FAIL / 0 skip.
3. `python apps/worker/evals/single-agent-commerce-read-only/policy-relationship-run-20261020/run-targeted.py %TEMP%/c3-division-session-20261019.py %TEMP%/c3-policy-relationship-run-20261020` → exit0; preflight PASS/0 generations, targeted đủ11/22 requests. Exact argv trong raw/commands.json. Preflight hiện metadata 8 stateful vì reuse generic preflight; không có 8 stateful generations trong run này.
4. `python %TEMP%/c3-policy-relationship-metrics.py %TEMP%/c3-policy-relationship-run-20261020 apps/worker/evals/single-agent-commerce-read-only/policy-relationship-run-20261020` → đủ denominator/accounting, 0 errors/timeouts/leaks.
5. `node %TEMP%/c3-policy-relationship-audit.mjs` → PASS. Final hashes/diff/source checks trong VALIDATION.json.

Không chạy lại typecheck/build/lint của fix 0a01ffe1 trong lượt chỉ thêm eval input/wrapper; không thay runtime/provider API. Không chạy full suite, full B1/B2/B3 hoặc deploy.

## Recommendation

**STOP trước full**: candidate 7/8 dùng được, còn hứa xử lý lỗi ngoài khả năng. Bản sửa có bằng chứng cải thiện ca mặc thử và làm rõ câu “thử rồi”; chưa đủ để nhận toàn B đạt. Hướng tiếp theo là làm khớp bước hỗ trợ sau báo lỗi với capability thực tế, không thêm keyword/đáp án hoặc sửa verifier để cứu điểm. Không patch hoặc chạy bù trong registration này.

Complexity delta của lượt chạy: 0 production/runtime/prompt/provider API/model/schema changes; 0 role/layer/gate/state/parser mới. Chỉ thêm frozen inputs/control section/preparation wrapper tái dùng runner và raw/review reports. Chưa xác minh workflow xử lý đổi/trả thật hoặc live handoff.
