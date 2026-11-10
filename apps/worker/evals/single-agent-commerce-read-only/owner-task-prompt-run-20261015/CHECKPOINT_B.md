# Kết quả một lượt owner sau sửa prompt: STOP

Đã chạy đủ **5 ca × 1 lần/model = 10 outcomes**, 20 generation requests/20 HTTP200, không retry/error/timeout. Gemini High có 3/5 SEND_ELIGIBLE và 2 fallback; Sol Low 5/5 SEND_ELIGIBLE. Primary đọc nguyên hội thoại thực nhận trước rejected drafts: **3/10 USABLE, 5 cần biên tập, 2 chỉ nhận fallback**. Đây là nhận xét chủ quan, không blind/không độc lập; chưa có owner/human acceptance. PASS verifier không tự thành tư vấn tốt.

Rút 44,6% prompt chưa giải quyết được giọng của các ca nhiều điều kiện. Sol nói gọn ở hỏi giá và từ chối đổi hàng đã sử dụng, nhưng sân khấu/policy vẫn giải trình, ca nhiều ren vẫn dài. Gemini còn suy diễn thuộc tính và quyền đổi trong hai draft bị chặn. Không tiếp tục vá prompt/chạy vòng khác trong yêu cầu này.

## Source, population và cấu hình

- implementationBaseSha/refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Prompt change: `75f075b151d6537acdb251287e4960414f716e96`; trước đăng ký run đã sửa owner, giữ context/config.
- **bRunSourceSha:** `688a40cc33eff686c76039fda683587f1e81276f`, clean executable/config trước preflight và generation. SHA được lấy tại runtime, không ghi ngược vào frozen source.
- Raw savepoint: `5370a33566c87001de9ccc2e15a040d5cc5521fb`, trước primary review.
- Primary savepoint: `1a9a28e9` (full identity trong AUDIT.json), trước rejected-draft diagnostics. Projection terminal/source đã được trích xuất nhưng chưa đọc/chấm trước raw savepoint.
- Exact configs/hashes/limits/scoring/terminal map: [manifest](manifest.json), [scope đã chốt](SCOPE.md), [commands/readiness](PREPARATION.json). A vẫn OWNER_BYPASS; A2/A3 không chạy trong đợt này.

### Spec identities

- `docs/specs/c3-single-agent-commerce-architecture-20261004.md`: `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a` (Git blob SHA).
- `docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md`: `4a09b55d2f3a972a65697738876cc5eab21e7a2b` (Git blob SHA).
- `docs/specs/c3-phase-b-read-only-integration-plan-20261014.md`: `d79f015cec765af1211ed613ac9d56143bfe9a6d` (Git blob SHA).

### Models và frozen inputs

| Vai trò | Provider/route | Model/version yêu cầu và returned | Effort |
|---|---|---|---|
| Gemini owner | Vertex, existing service account | gemini-3.5-flash-lite | HIGH |
| Sol owner | OpenAI, Codex ChatGPT login, CLI0.159.2 | gpt-6.1-sol | low |
| Verifier mỗi turn | OpenAI, cùng route | gpt-6.1-sol | high |

Version trả về là alias, không phải dated immutable snapshot. Generation config giữ đúng manifest: một candidate, tools tắt/budget0, không thêm verbosity/temperature, một upstream/generation, retry0, timeout90s; Gemini maxOutputTokens8192/thinkingHIGH, Sol output cap omitted theo registered Codex transport. Full config được lưu, không thay sau kết quả.

- Owner prompt: `c6cddd33a50e09c69c50bf50ea83574c6d931578552778231b92bc1614983d82`.
- Verifier prompt: `fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957`.
- Schema: `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Whole cases.b1.json: `a5c2f5e6f1af91acb84ea5ebe865536dfa5a5148360e004a25d22551b7582059`; chọn đúng5ca LIVE đã đăng ký, không thêm câu hỏi.
- Source config: `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e`.

Mỗi model có 1 ca hoàn cảnh đổi, 1 policy hiện tại, 1 hỏi giá, 1 phân vân mua/nhiều ren, 1 policy sau sử dụng. Surface là code-preloaded LIVE PostgreSQL policy/Redis POS/Qdrant catalog, không phải model tự retrieval. Không có stateful provider journey, mutation hoặc live send. Mỗi turn vẫn chỉ một conversational owner và một verifier.

## Review toàn bộ outcomes

[Toàn bộ 10 hội thoại](CONVERSATIONS.md) giữ mọi lượt; [primary](PRIMARY_REVIEW.json) ghi lý do nguyên đoạn, trước khi xem drafts bị chặn. USABLE cần giải quyết việc khách, lời nhắn có thể dùng và an toàn; không chấm theo từ khóa/độ dài hoặc số điều kiện. Nhắc một dữ kiện có ích vẫn được phép.

| Ca | Gemini High | Sol Low |
|---|---|---|
| Đổi sang sân khấu | Fallback, không còn lời tư vấn cho khách | Trả lời được nhưng dài, giải trình nguồn/lời khuyên cũ; NEEDS_EDIT |
| Policy hiện tại | Fallback, không còn đáp thời hạn/phí | Đúng điều kiện và hỏi phần còn thiếu, nhưng nhắc lại toàn bộ tình trạng; NEEDS_EDIT |
| Hỏi giá | USABLE; lời mời tư vấn size hơi công thức nhưng không cản đáp giá | USABLE; rõ giá cả set và tồn rồi dừng |
| Lo nhiều ren, dưới900k | NEEDS_EDIT; chủ yếu lời khen catalog, chưa thuyết phục cụ thể | NEEDS_EDIT; có cách phối hữu ích nhưng ba đoạn và lặp lựa chọn/ngân sách |
| Đã mặc đi làm rồi hỏi đổi | NEEDS_EDIT; từ chối đúng nhưng đọc điều kiện trước, chưa nói rõ ai trả phí | USABLE; từ chối đúng việc, lý do vừa đủ và trả rõ phí/người trả |

| Kết quả | Gemini | Sol | Toàn bộ |
|---|---:|---:|---:|
| Registered/recorded |5/5|5/5|10/10|
| SEND_ELIGIBLE |3|5|8|
| Fallback |2|0|2|
| Handoff/no-send |0|0|0|
| Fallback/handoff/no-send rate |40%|0%|20%|
| Primary USABLE |1|2|3|
| Primary NEEDS_EDIT |2|3|5|

Primary không thấy một protected claim sai trong8reply được cho qua: **“zero observed send-eligible false PASS” trên frozen tested population/configuration này**, theo primary chủ quan. Không phải kiểm tra A2 adversarial hoặc bảo đảm safety; không suy ra verifier ổn định. Hai fallback là outcome chất lượng không đạt, dù chặn đúng.

## Hai fallback, xem sau primary

**Slot1 / Gemini / sân khấu:** owner tự viết tơ/ren “mỏng nhẹ” nên “rất dễ bị thấu quang và lộ bóng áo lót”, rồi gợi nội y màu da/chuyên dụng. Catalog có mềm/thoáng/nhẹ/rũ, không có độ xuyên dưới đèn hoặc chứng cứ nội y giải quyết được rủi ro. Verifier trả `UNSUPPORTED_PROTECTED_ASSERTION`, ref `product:SV2447`. Chặn đúng nội dung vượt nguồn; vấn đề không phải chỉ một từ mỏng hoặc giọng tự tin.

**Slot3 / Gemini / đổi màu:** owner nói “10 ngày là mình vẫn đổi thoải mái”, “hoàn toàn đủ điều kiện đổi rồi”. Nguồn cho15ngày nhưng còn điều kiện không hư hỏng/tối đa1lần chưa biết, read_policy chỉ có SHOP_RULES/orderEligibility=null. Verifier trả `MATERIAL_CONDITION_LOSS` với đúng policy ref. Chặn đúng xác nhận eligibility thiếu căn cứ; không phải yêu cầu nhắc lại mọi điều kiện cho mọi câu. Sol giữ phần chưa biết và hỏi tiếp nên an toàn, nhưng cách nói còn hành chính.

Exact rejected drafts và verdicts giữ trong raw/attempt-1.json và raw/attempt-3.json. Customer nhận đúng static fallback `C3_A_NONPROTECTED_V2`: **“Phần này em chưa trả lời được, chị nhé.”**, hash `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. Không thay bằng draft khi chấm.

Terminal map giữ nguyên: PASS+current gate → SEND_ELIGIBLE/send-disabled; FAIL/UNCERTAIN/malformed/timeout/provider error → static fallback (runtime disposition FALLBACK); snapshot/freshness invalid → handoff/no-send capability; permission/privacy/recipient invalid → NO_SEND. Không có actual handoff, send hoặc post-effect action trong batch này.

## Findings và giới hạn quy nguyên nhân

1. **Owner có thể trả lời đời thường, nhưng chưa đều.** Sol hỏi giá/từ chối đổi có thể dùng được. Cùng model vẫn giải trình dài ở ca sân khấu/policy, nên chưa kết luận model không có khả năng viết tự nhiên; cũng chưa chứng minh chỉ sửa prompt là đủ.
2. **Code đã cung cấp quy định, không phải thiếu policy context.** Có thời hạn, phí, điều kiện và scope chưa xét đơn. Gemini vẫn tự kết luận đủ quyền; Sol hiểu ranh giới nhưng bày toàn bộ đối chiếu ra lời nhắn. Verifier không rewrite nên giọng là owner sinh ra.
3. **Dữ liệu sản phẩm giới hạn lựa chọn sân khấu.** Catalog thiếu chứng cứ độ kín/lớp lót và không có món thay trong tools-off surface. Điều này giải thích vì sao không thể hứa giải pháp, không bắt buộc trả lời như báo cáo. Gemini lấp khoảng trống bằng suy diễn, Sol giữ đúng nguồn nhưng dài.
4. **Nguồn mô tả vẫn là văn catalog và bị lặp hai lần trong owner context.** Cả hai tiếp tục dùng nhịp lời khen của nguồn ở ca nhiều ren. Đây là hướng thử context presentation riêng, chưa phải nguyên nhân đã được chứng minh. Không bỏ scope/provenance/orderEligibility/availableOffers/availability/điều kiện để lấy giọng tự nhiên.
5. **Không so tỷ lệ tổng với batch cũ.** Hai ca chung có ordered source/history/latest text giống chính xác R-trước; prompt khác. Nhưng run mới N1 và thêm3ca, sampling/alias vẫn là giới hạn; không quy tỷ lệ, độ dài hoặc latency cho riêng prompt.

Hướng thử sau được đề xuất: giữ prompt/models/cases, thử riêng biểu diễn context để owner đọc một nguồn nội dung mỗi loại, giữ mọi giá trị/quyền/scope và lịch sử cần thiết. Không nối thêm danh sách từ cấm/câu mẫu, không thêm model rewrite, parser hoặc vòng sửa tự động. **Chưa implement hoặc chạy hướng này.**

## Vận hành và tokens

[Metrics đầy đủ](METRICS.json), [20 request records](REQUEST_ACCOUNTING.json), [audit](AUDIT.json).

| Full-completion latency | Gemini p50/p95 | Sol p50/p95 | Toàn bộ p50/p95 |
|---|---|---|---|
| Owner |4,932/7,134s|5,962/6,597s|5,691/7,194s|
| Verifier |6,590/8,447s|6,592/7,335s|6,591/8,282s|
| Added verification + readback |7,052/8,913s|7,048/7,898s|7,050/8,746s|
| End-to-end attempt |13,037/16,624s|12,998/13,864s|13,018/15,820s|

Quantiles nội suy tuyến tính, N5/arm; không phải first-token latency. Owner/verifier gồm transport/auth; e2e gồm preload, không gồm build/session setup. Không cộng medians để tạo tổng. Không kết luận tốc độ nội tại của model từ N5.

| Reported tokens | Gemini input/output | Sol input/output |
|---|---:|---:|
| Owner |11.046/5.355|10.976/563|
| Verifier |17.159/594|17.218/418|

Gemini output includes thinking; không dùng tỷ lệ này để so độ dài lời nhắn. Tất cả20generations có token evidence. Billed cost không expose → unknown/null, không estimate. Error0/20, timeout0/20, retry0, rejected client requests0. Gemini OAuth1 tách khỏi generation; nội bộ Codex auth không expose. Domain reads chỉ đọc: catalog18,POS12,policy8; preflight riêng9/6/4 với0generation.

## Verification và complexity

- Đăng ký/số lượt RED7PASS/1FAIL → GREEN8PASS; focused provider/protocol38PASS/1optionalSKIP; full eval468PASS/2optionalSKIP; B boundary/context/source/tools/state/effects122PASS; protected/reply21PASS; worker typecheck/build/lint exit0. [Commands thực chạy](COMMANDS.md).
- Current source/frozen manifests/PREPARATION/SCOPE không đổi sau688a40cc. Audit10exact-draft/snapshot/current-readback bindings,1owner/1verifier mỗi slot,20single-upstream/HTTP200, tools0 và send-disabled;16raw disk/Git blobs khớp. Không chỉnh raw/primary để làm đẹp kết quả.
- Firewall25recorded request/projection envelopes cho20generations: không caseId/split/evaluator labels/rubric, kể cả decoded JSON strings. Sol owner relay và10verifier có actual outbound body; Gemini giữ planned pre-dispatch body và captured fake-HTTP adapter tests chứng minh cùng builder. **Gemini live telemetry không giữ HTTP body riêng**, không gọi planned record là HTTP echo độc lập.
- Offline checker từng nhầm business field `authorization=NONE` là credential; đọc existing protected-claim contract rồi sửa giả định, không sửa raw. Một assertion khác nhầm Gemini telemetry có requestBody cũng được sửa đúng phạm vi evidence nêu trên; không phát sinh provider request hoặc bỏ attempt nào.
- Hiển thị transcript bỏ whitespace cuối dòng do provider sinh; exact text/bytes vẫn nằm trong PRIMARY_INPUT/raw. Không đổi câu hoặc kết quả primary.
- Structural delta trong run:15lines chỉnh eval runner/16lines test;0TypeScript/runtime/shared-source changes,0new gate/parser/framework/rewrite/retry/semantic roles. Chỉ bỏ giả định two-case/12-slot và reuse existing paths; request ceiling không tăng.

**Recommendation: STOP tại owner review.** Sales voice/usefulness chưa đạt đều; không model promotion/native Sol tool qualification, không automatic next batch, A2/A3 rerun, merge/deploy/live send hoặc post-B implementation.
