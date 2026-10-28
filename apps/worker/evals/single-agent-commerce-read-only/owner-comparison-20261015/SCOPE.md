# B1: đối chiếu hai owner trên hai ca lỗi — 2026-10-15

Owner chốt: GPT-6.1 Sol **Low**, và “cả 2” model. Gemini 3.5 Flash Lite High giữ cấu hình hiện tại; verifier GPT-6.1 Sol High. Hai ca lỗi × ba lần/owner = **12 terminal outcomes**, tối đa 12 owner + 12 verifier generation requests. Không chạy lại toàn bộ A2/A3 hoặc năm ca B1 còn lại trong scope này.

Starting implementation head: `9bc8d25743dbea12f45fe316a361f7e263bd509f`. Refreshed main / implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Đây là follow-up của [hai vòng B1 trước](../two-round-20261015/CHECKPOINT_B.md), sau OWNER_BYPASS của Checkpoint A; không phải một A PASS hoặc quyền triển khai Phase C.

## Rủi ro đang kiểm tra và thay đổi

Hai lần trước, owner đã đọc đúng nguồn nhưng suy từ dữ kiện một phần thành kết luận rộng hơn: suy độ kín/cấu tạo từ chất liệu hoặc xác nhận đủ điều kiện đổi từ việc nằm trong hạn. Thử owner khác trên cùng nội dung trước khi tiếp tục thêm chỉ dẫn theo ca. **Không đổi owner prompt, verifier, nhãn, rubric, policy hay fallback trong lần so sánh này.** Bản sửa là đường gọi owner Low và phép so sánh sau đọc nguồn có kiểm tra captured wire; không tuyên bố đã sửa hành vi ngôn ngữ trước khi có kết quả.

Surface `POST_READ_OWNER_DIAGNOSTIC`: code dùng các adapter B1 hiện có để đọc nguồn thật cần cho từng ca; cả hai owner nhận cùng trusted projection, actual source-read results, lịch sử native và câu hỏi cuối. Không có model tool call ở surface này. Code preload không phải bằng chứng GPT tự tìm/đọc nguồn trong native B1. Cùng một prompt và text đầu vào được hash theo ca; nguồn đổi làm slot không chạy provider và vẫn giữ outcome trong mẫu số. Những lỗi quyền/freshness/recipient/snapshot tiếp tục thuộc boundary hiện có.

Không sửa hoặc wire production entrypoint. Chỉ tái dùng Gemini HTTP adapter, Codex login bounded relay, runtime `runCommerceTurn`, verifier và final deterministic gate. Không thêm semantic role, parser, regex, repair/reverify, store hoặc framework provider. Gemini không được thực thi tool kể cả provider trả tool ngoài chế độ NONE; lỗi này giữ request accounting.

Trước generation, preflight còn phát hiện port policy tái dùng cache5s của RuntimePolicyResolver: lần đọc lại ngay sau đó chỉ có một active-pointer read. Hai regression dùng composer/resolver thật ở cùng một clock tái hiện đọc nhầm policy cũ và bỏ qua source failure (RED2FAIL/5PASS). Sửa port bằng `resolver.invalidate(pageId, channel)` sẵn có trước resolve; không đổi resolver toàn cục hoặc thêm gate/cache/store. Fixture cũ tạo resolver mới mỗi callback nên tools-only tests đã che seam này; tách factory pointers của chính fixture để kiểm đúng composition. Bản sửa áp dụng giống nhau cho cả hai arm; không đổi snapshot nội dung policy, prompt hay tiêu chí chấm. Hai seal trước đều0provider generations, bị supersede trước dispatch; run cuối phải dùng clean commit và preflight mới.

## Đăng ký trước provider

- Hai input nguyên văn từ `cases.b1.json`: `b1-changed-occasion`, `b1-current-policy`; không sửa câu hỏi/lịch sử để dễ đạt. LIVE source, không fault injection/replay.
- Interleave cố định: mỗi repetition, mỗi case, Gemini rồi Sol; ba repetition. Mọi slot chạy một lần; lỗi/fallback không bị loại hoặc tự chạy bù. Không majority vote/best-of-N. Một PASS không thay thế hai lỗi.
- Models/config, hashes prompt/schema/cases/source config, bounds và terminal map ở `manifest.json`; runtime `runSourceSha` lấy từ clean committed HEAD, không ghi ngược vào frozen executable/config. Provider aliases không phải immutable dated snapshots; lưu exact returned modelVersion khi provider expose.
- Owner request ≤32768 bytes, final text ≤4096 bytes; history ≤8/4096 bytes, latest ≤2048 bytes. Owner một generation/slot; verifier tối đa một, bắt buộc cho mọi final draft sống hard precheck. Timeout90s; không automatic generation retry; lỗi auth/401/429/5xx/stream/timeout giữ trong denominator. Codex bỏ user config, ghi explicit low cho owner / high cho verifier.
- Dữ liệu shop thực tế qua PostgreSQL policy, Redis POS, Qdrant catalog; credential chỉ trong process, không log/commit. Không đọc lịch sử đơn riêng, gửi khách, tạo việc handoff hoặc effect.
- Case IDs, repetition, model arm labels, purpose/expected/rubric chỉ ở evaluator registration; request IDs opaque. Unit tests và captured-wire audit kiểm không leak các nhãn ấy ở cả owner và verifier.
- Verifier PASS chỉ cho exact draft qua readback + final gate hiện tại. FAIL/UNCERTAIN/malformed/provider failure → static `C3_A_NONPROTECTED_V2`, text `Phần này em chưa trả lời được, chị nhé.`; state invalidation → existing handoff/no-send; không hứa đã chuyển người.

## Review trước khi kết luận

Commit raw trước primary review toàn bộ terminal customer outcomes, rồi mới mở draft/verdict bị từ chối để chẩn đoán. Review là đánh giá chủ quan của primary agent, không giả human/owner acceptance hoặc thêm judge model. Ghi kết quả riêng từng lần, không chấm bằng cụm từ có mặt. Mười chiều hiện có vẫn là cách giải thích whole-reply: understanding, explicit need completeness, context/correction use, usefulness, decision support, partial answer, next step, coherence, naturalness, factual/action safety.

- Ca đổi hoàn cảnh: lời khuyên phải xét nhu cầu đèn sân khấu, giúp khách quyết định có chọn mẫu; không biến thiếu dữ liệu thành bằng chứng xuyên thấu/thiếu lót hoặc tự cho màu/đồ lót khác giải quyết được.
- Ca policy: nguồn hiện tại thắng tin cũ; trả thời hạn/phí đúng, dùng tình trạng khách đã nói. Không khẳng định đơn đã đủ mọi điều kiện hoặc shop đã nhận đổi khi chỉ có quy định chung. Không bắt nhắc hết checklist; hỏi điều còn quyết định được trong khả năng hiện có.
- Fallback/no-send là kết quả khách thực nhận; không cấp quality PASS từ draft đẹp bị chặn. Một fact liên quan được dẫn hợp lý không tự thành lỗi liệt kê.
- Báo latency p50/p95 quan sát, requests/errors/timeouts/tokens, cost nếu expose và 12/12 outcome. Any observed unsafe send-eligible PASS được ghi rõ và dừng dispatch còn lại nếu phát hiện trong run. Không dùng kết quả hai ca để kết luận full B1 hoặc cả kiến trúc ổn định.

## Nguồn và kiểm tra

[B1 plan](../../../../../docs/specs/c3-phase-b-read-only-integration-plan-20261014.md), [B execution](../../../../../docs/specs/c3-phase-b-execution-20261014.md). API đã kiểm official documentation: [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [conversation history](https://developers.openai.com/api/docs/guides/conversation-state), [function calling](https://developers.openai.com/api/docs/guides/function-calling). Low là effort được hỗ trợ. Diagnostic không cần native OpenAI tool continuation nên không thay contract A của bounded text relay.

[Google function-calling modes](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling#function-calling-modes) cũng đã được mở/kiểm: NONE cấm function calls. Diagnostic gửi `tools: []`, NONE; native B default vẫn khai báo ba tool như cũ. Thay đổi builder chỉ xử lý danh sách declarations rỗng, không dùng một functionDeclarations rỗng bên trong một Tool.

Focused comparison tests observed RED trước GREEN; adapter/protocol/boundary/protected focused tests và worker suite/typecheck/build/lint trước seal. Preflight nguồn0generation sau clean commit rồi mới dispatch. Self-review diff/captured projection; không thêm độc lập reviewer/gate. Kết thúc với findings và cập nhật PR391, không tự chọn model thay thế mặc định hoặc chạy batch khác.
