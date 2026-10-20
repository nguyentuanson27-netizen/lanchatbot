# Phase B — Policy + persisted handoff model run — 2026-10-20

**COMPLETE_5_MECHANISM_VERIFIED_REPLY_QUALITY_NOT_COMPLETE**. Đủ 5/5 ca, 12 generation requests (9 owner + 3 verifier), retry/error/timeout=0. Ba model final replies PASS và SEND_ELIGIBLE; hai ca HANDOFF đúng, không fallback/no-send. DB tạm đã drop. A vẫn OWNER_BYPASS; không phải A PASS/B live GO.

[Đủ hội thoại](CONVERSATIONS_AND_REVIEW.md), [primary](PRIMARY_REVIEW.json), [diagnosis](FAILURE_DIAGNOSIS.json). Primary khóa tại `a2493950` trước native tool/verifier diagnosis. Đánh giá riêng cơ chế và câu trả lời: cơ chế đúng ở 5 ca đã quan sát; actual reply 2 USABLE / 3 NEEDS_EDIT. Không dùng nhãn này như tỷ lệ trên toàn bot hoặc so thẳng với run tools OFF trước.

## Kết quả từng ca

| Ca | Terminal và thực thi | Nội dung khách nhận/đủ điều kiện gửi |
|---|---|---|
| Đã mặc thử | SEND_ELIGIBLE, BOT, không handoff | Từ chối đổi đúng tình huống. Dùng được, có thể gọn hơn. |
| Chỉ ướm, muốn đổi L | HANDOFF, HUMAN; event/tag/message=1/1/1 | Tin mặc định báo đã chuyển; chưa có kết luận/hướng dẫn đổi cụ thể theo hướng owner chốt. |
| “Thử rồi”, chưa rõ cách thử | SEND_ELIGIBLE, BOT | Hỏi đúng ướm hay mặc, nhưng đọc điều kiện/thời hạn/phí dài trước câu hỏi. |
| Hỏi thời hạn/phí | SEND_ELIGIBLE, BOT | Đúng 15 ngày từ nhận hàng / 30k hai chiều, ngắn gọn. |
| Báo lỗi đường may | HANDOFF, HUMAN; event/tag/message=1/1/1 | Tin mặc định báo chuyển vận đơn; chưa có hướng dẫn bước đổi/trả. |

Hai handoff đã commit/readback quyền HUMAN, event, tag intent và holding message. Dispatcher bắt đúng một tin mỗi ca, trùng nguyên văn terminal. Pancake tag delivery và phản hồi nhân viên thật không được đo. Ba tin SEND_ELIGIBLE được ghi để review, chưa gửi bằng dispatcher/Meta. Không có live customer effect.

## Finding chính

Model chọn đúng request_handoff với EXCHANGE và DEFECT. Không có model FINAL hoặc public text part sau các lệnh này. Actual text ở cả hai ca là **AFTER_SALES_HOLDING_REPLY_V2**:

> Em đã chuyển bộ phận vận đơn kiểm tra và hỗ trợ mình ngay ạ.

SOURCE.json xác nhận matrix=null. Đây là câu do code/cấu hình hiện hành quyết định; thay giọng trong owner prompt không thay được nó. Hướng xử lý tiếp là nội dung holdingReply theo reason trong cơ chế nguồn hiện có, không thêm parser/role hoặc tiếp tục bắt model viết thay câu code-owned.

Ca “thử rồi” hiểu đúng điều còn thiếu nhưng nói quá nhiều policy trước khi hỏi. Đây là chọn ý/thứ tự của owner, không thiếu context hoặc verifier chặn quá tay. Nhãn NEEDS_EDIT lần này theo yêu cầu ngắn gọn mới của owner; không quy một thay nhãn style thành lỗi hiểu mới.

## Identity và source

Implementation base `513072fe73846d38468d422b734696a7abfbf2f4`. Run source `b1a58d2da288ff510972008b5a505f98ffaeb4b9`; clean source trước preflight/provider. Inputs 5 ca cũ, một lần mỗi ca; max20 generations, không mẫu bù. Exact config/hashes trong REGISTRATION.json:

- Owner Vertex global `gemini-3.5-flash-lite`, HIGH, candidate1/plaintext/max8192/includeThoughts=false/default sampling/90s/retry0.
- Verifier OpenAI/Codex login `gpt-6.1-sol`, high, CLI0.159.2, tools=[], tool_choice=none, stream=true/store=false, 90s/retry0, một upstream request mỗi generation.
- Owner SHA `a667558ecd3f87bddcf46b9020745af6554b23bcef046f296753a6aeeae95474`; verifier SHA `8a75dec909a24acf8962b421a9a6cf1f1d208ec01b89401ce94c27ba1dc5299a`; schema SHA `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Input SHA `bdfb19ff86fb5d07001e8bb84a25defff7334b91b78ea992c9a06219fb703c20`; public policy/matrix projection SHA `b61f8ab518d0cac4e25ecf912ef01a23ea34c2df7e97ea5e278f0ee83c886ec7`. Policy sourceVersion 84302ec1478263a9e32739d767c0899d9f32b7ef22e8252774cbfe4c85941e86, không sửa upstream.

Nguồn policy/matrix đọc chỉ đọc. Mỗi read phải khớp snapshot đã freeze. PostgreSQL tạm dùng prefix c3_b_test_*, đã kiểm exact tên DB trước migration/drop. Cả scope/recipient/link/tag IDs là synthetic. Fence theo convention của test hiện có, chưa phải qualification lease domain live. Delivery transport chỉ capture; không socket Meta/Pancake.

Handoff code-owned terminal không gọi verifier, đúng cơ chế sẵn có; mọi free model final draft sống qua hard precheck đều verifier + final gate. Không classifier skip, repair loop hoặc model thứ ba. Fallback/terminal map giữ manifest.

## Request accounting, latency và usage

12 requests, mỗi generation đúng1; 9 owner (gồm tool continuations) +3 verifier. Errors/timeouts/retry=0, không bỏ attempt khỏi denominator. Ba verifier PASS; hai handoff không phải hai verifier PASS.18 wire captures là capture/checkpoint, không phải18 requests.

- Owner latency mỗi generation: n9, p50 2434.4ms / p95 7065.0ms.
- Verifier latency: n3, p50 6130.0ms / p95 8055.0ms.
- Added verification gồm current readback/final gate: n3, p50 7258.1ms / p95 9117.2ms. Không coi đây là latency live hoặc so tốc độ model trên cùng công việc.
- Owner tokens input32238/output7992; verifier input10906/output198; usage đủ, output có thể gồm reasoning. Cost NOT_EXPOSED.
- Fallback/no-send 0/5; handoff2/5 là xử lý có chủ đích, không lỗi fallback.

Audit:9 owner request/telemetry hashes,3 verifier bindings/full canonical policies,18 wire bodies/0 evaluator leaks,2 handoff state/event/tag intent/capture,10 raw files khớp Git,14 source identities giữ nguyên trong run, primary hash nguyên. Xem SOURCE_AND_WIRE_AUDIT.json. Tag intent không phải chứng từ Pancake đã nhận; holding capture không phải nhân viên đã trả lời.

## Commands thực sự chạy

- Chuẩn bị: `python %TEMP%/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/policy-handoff-run-20261020/prepare.mjs` → PREPARED5/0generation/matrix absent.
- `node --check apps/worker/evals/single-agent-commerce-read-only/policy-handoff-run-20261020/run.mjs` và `node --check apps/worker/evals/single-agent-commerce-read-only/policy-handoff-run-20261020/prepare.mjs` → PASS.
- `node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` →59PASS.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-read-only.test.ts` →37PASS.
- Source8bee957f: preflight PASS, setup dừng trước tạo DB/generation vì admin URL chỉ cấp runner cũ. SETUP_FAILURE.json giữ0generation/0completed/0DBcreated. Không phải retry model. Bổ sung đúng runner này vào allowlist của source-session.py, giữ live URLs read-only. `python apps/worker/evals/single-agent-commerce-read-only/source-session.test.py`: observed RED1FAIL/4PASS → GREEN5PASS, gồm original route và negative scripts/interpreters/inline commands.
- Source b1a58d2d: `python %TEMP%/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/policy-handoff-run-20261020/run.mjs %TEMP%/c3-policy-handoff-preflight-20261020-v2 --preflight` → PASS/0generation.
- Cùng command bỏ --preflight, output `%TEMP%/c3-policy-handoff-model-20261020-v2` → exit0,5/5,12requests, DB dropped.
- `python %TEMP%/c3-policy-handoff-metrics.py` → accounting PASS.
- `node %TEMP%/c3-policy-handoff-audit.mjs` → PASS sau khi sửa giả định audit: owner projection chỉ giữ ref/text theo contract hiện có, canonical verifier vẫn giữ provenance. Không sửa runtime/evidence để làm audit PASS.

Không chạy lại worker typecheck/build/lint cho eval-only JS/Python glue; không đổi TS/shared package/provider API. Tổng101 focused tests PASS. Không chạy full B1/B2/B3 hoặc source mutation/deploy/live send.

## Recommendation

**Cơ chế handoff đã được kiểm ở hai ca; chất lượng reply chưa hoàn tất.** Tiếp theo cần dùng cấu hình holdingReply hiện có để cung cấp bước xử lý hữu ích, và xử lý việc owner đọc dài policy trước câu hỏi cần thiết. Không sửa tiếp/chạy bù trong registration này. Không nhận toàn B đạt từ5ca; A OWNER_BYPASS vẫn nguyên.

Complexity delta: một runner/preparation eval tái dùng core handoff/DB/dispatcher và một entry allowlist credential bridge có test. Không đổi production entrypoint, model/provider API, schema, queue, gate, role hay state mới. DB mutations chỉ trong disposable database; không lưu secret hoặc thay policy/matrix upstream.
