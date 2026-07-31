# Kế hoạch nâng cấp Realtime Sales Agent

## Thông tin tài liệu

| Trường | Giá trị |
|---|---|
| Trạng thái | APPROVED_FOR_IMPLEMENTATION |
| Phiên bản kế hoạch | 1.0 |
| Cập nhật lần cuối | 2026-07-23 |
| Baseline mã nguồn | main tại d270e72 |
| Baseline production | 20260723-customer-care-policy-r10-1 |
| Page canary duy nhất | 1198992073286645 |
| Phạm vi hoãn | Task 2.1 và Task 3.3 |

Tài liệu này là nguồn kế hoạch triển khai, không phải bằng chứng một tính năng đã có trên production. Chỉ cập nhật Production baseline, Changelog và release manifest sau khi tính năng đã được test, deploy và xác minh thực tế.

## 1. Mục tiêu

Nâng pipeline realtime từ mô hình có thể vừa quyết định vừa viết facts sang ranh giới rõ ràng hơn:

1. Model hiểu ý định, phản hồi phản đối và soạn phần tư vấn.
2. Code xác minh sản phẩm và dựng mọi facts nhạy cảm: giá, tồn, size, ETA, phí ship, ưu đãi và URL ảnh.
3. Sales Cycle deterministic điều khiển giỏ hàng, thương lượng, checkout và xác nhận mua.
4. Mọi quyết định quan trọng có audit, idempotency, telemetry và đường rollback.
5. Không làm thay đổi ngoài ý muốn các nhánh deterministic đang chạy ổn định.

Kết quả mong đợi:

- Không nuốt tín hiệu mua bằng NO_REPLY.
- Không để model tự gõ hoặc thay đổi facts nghiệp vụ.
- Tăng khả năng nối tiếp hội thoại nhờ hồ sơ số đo và biến thể có cấu trúc.
- Hỗ trợ nhiều facts hoặc nhiều sản phẩm trong một câu hỏi.
- Đo được funnel và nguyên nhân thất bại trước khi tối ưu thêm kịch bản.

## 2. Nguồn phải đọc trước khi triển khai

Agent triển khai phải đọc theo thứ tự:

1. AGENTS.md
2. README.md
3. docs/current/PRODUCTION_BASELINE_20260722.md
4. docs/current/REALTIME_AGENT_UPGRADE_PLAN.md
5. deploy/manifests/20260723-customer-care-policy-r10-1.json hoặc manifest mới hơn
6. docs/phase1/01_shared_contracts_v2.md
7. docs/phase2/01_sales_runtime_engines.md
8. docs/phase3/01_sales_cycle.md
9. docs/phase4/01_admin_policy_control_plane.md

Nếu tài liệu mâu thuẫn, ưu tiên yêu cầu mới nhất của chủ dự án, sau đó AGENTS.md, README.md, production baseline, manifest mới nhất, kế hoạch này và cuối cùng là tài liệu phase/history.

## 3. Baseline hiện tại

### 3.1 Luồng xử lý

Luồng production hiện tại:

1. Claim Inbox, lease và batch.
2. Load ConversationState; load SalesCycleRuntimeState nếu sales cycle bật.
3. Resolve sản phẩm theo selection, mã, ads, media, state rồi semantic search.
4. Apply inbound event với fence, revision và tag observation.
5. Chạy nhánh deterministic: chính sách trước mua, nhiều sản phẩm, ảnh, thẻ thông tin sản phẩm.
6. Nếu cần model: generate, resolve facts, groundWithFacts, guard.
7. Chạy Sales Cycle deterministic.
8. Atomic commit state, Inbox guard, Meta Outbox, tag/handoff và sales-cycle effects.

### 3.2 Cơ chế phải giữ nguyên

- Webhook signature, dedup message_id, Inbox và Outbox.
- Optimistic locking, state revision, fence và inboxBatchGuard.
- replyPlanId, responseGroupId và side-effect ID deterministic.
- Page allowlist chỉ có 1198992073286645.
- App gửi trực tiếp qua Meta; Pancake chỉ dùng quan sát/gắn tag/handoff.
- POS là nguồn chuẩn BOM, giá và tồn.
- Redis là projection realtime; Qdrant chỉ tìm sản phẩm/ảnh ổn định.
- Model không được tạo giá, tồn, size, ETA, khuyến mãi, phí ship, freeship, productId, variantId hoặc URL ảnh.
- Hậu mãi gửi đúng một câu giữ chân rồi handoff Vận Đơn; handoff khác vẫn im lặng.
- Text gửi trước, ảnh gửi sau 0,5 giây.
- Cart và sales-cycle state có TTL 48 giờ; PURCHASE_CONFIRMED không đồng nghĩa ORDER_CREATED.
- Không để app-native worker và n8n cùng ghi một miền dữ liệu.
- Không đưa PII, secret, raw token hoặc nội dung chat thô vào model context, log hay audit.

### 3.3 Khoảng trống đã xác nhận

- Prompt vẫn cho phép NO_REPLY với câu “đồng ý”, nên có thể nuốt câu chốt.
- Generate và Judge chưa retry 401 trong process; token refresh chưa single-flight.
- Generate và groundWithFacts đang dùng chung AgentProposalV1 schema.
- Grounded model vẫn có thể sinh lại action, productId, query và tự gõ facts.
- Judge chưa nhận verified facts.
- History gửi model vẫn đọc tối đa 30 tin; số đo chưa được nối vào runtime profile có cấu trúc.
- ConversationState và SalesCycleRuntimeState có field chồng lấn nhưng chưa có ownership map chính thức.
- Query nghiệp vụ vẫn là một businessFactQuery.
- Catalog đã có colors, materials, silhouettes, occasions và DESCRIPTION_XML nhưng chưa được khai thác nhất quán cho tư vấn có căn cứ.
- Audit/funnel đã có nền tảng nhưng chưa bao phủ đầy đủ từng lần gọi model, facts, guard và quyết định outbound.

### 3.4 Bản đồ code và cảnh báo chống làm trùng

| Miền | Code hiện có | Điều agent phải nhớ |
|---|---|---|
| Prompt/Vertex | apps/worker/src/vertex.ts | Generate/ground đang dùng chung schema; auth token chưa single-flight |
| Orchestrator live | apps/worker/src/realtime-runner.ts | Điểm nối outbound/state chính; tránh nhiều agent sửa cùng lúc |
| Sales Cycle | apps/worker/src/realtime-sales-cycle.ts và packages/chat-runtime/src/sales-cycle-runtime.ts | Cart/negotiation/confirmation đã live; không tạo engine thứ hai |
| Conversation state | packages/conversation-engine/src/types.ts và engine.ts | Sở hữu routing/current product; Task 2.1 đang hoãn |
| Facts/guard | packages/business-tools/src/guard.ts và các adapter facts | BusinessFactEnvelopeV1 vẫn là adapter production hiện hành |
| ProductFactsV2 | packages/contracts/src/v2/product-policy-media.ts và packages/business-tools/src/product-facts-v2.ts | Đã có contract/engine; tái sử dụng, không tạo ProductFactsV2 khác |
| Profile/size | packages/contracts/src/v2/customer-size-cart.ts, customer-profile.ts, size-engine.ts | Contract/engine đã có nhưng chưa có persistence/live wiring |
| Catalog/Qdrant | packages/business-tools/src/qdrant.ts và StableProductDocument | Đã có colors/materials/silhouettes/occasions; chưa có stretch/body suitability verified |
| Funnel/replay | packages/contracts/src/v2/handoff-sales-funnel.ts và analytics-replay.ts | Giữ FunnelEventV1 ổn định; telemetry kỹ thuật dùng schema riêng |
| Atomic commit | packages/database/src/realtime-runtime.ts | Telemetry/audit ảnh hưởng quyết định phải gắn với transaction/idempotency hiện có |
| History/audit | packages/database/src/chat-history.ts | Mở rộng additive; không ghi PII/raw prompt |

Không được tuyên bố CustomerProfileV1, size engine hoặc ProductFactsV2 đã nối production chỉ vì contract/unit test đã tồn tại. Phải có adapter, runtime wiring, test và deploy evidence trong Progress ledger.

## 4. Quyết định thiết kế đã duyệt

### D-001 — Hoãn Task 2.1

Không hợp nhất ConversationState và SalesCycleRuntimeState ở đợt này. Tạm giữ:

- ConversationState sở hữu routing, owner, tag gate, currentProductId, product selections và context tư vấn.
- SalesCycleRuntimeState sở hữu cart, checkout, negotiation, preview và confirmation.
- Customer profile và verified variant được tích hợp bằng projection/writer có ownership rõ ràng; không tạo state thứ ba tùy tiện.

Task 2.1 vẫn nằm trong backlog bắt buộc nhưng chỉ thực hiện sau khi có field-ownership map, replay concurrency và bằng chứng state drift.

### D-002 — Hoãn Task 3.3

Không đổi mặc định sang “mỗi lượt chỉ hỏi một câu”. Chỉ thiết kế A/B sau khi funnel có baseline đủ tin cậy. Biến thể này phải default OFF.

### D-003 — Buying signal không tự động silent handoff

Khi model trả NO_REPLY nhưng tin khách có tín hiệu mua:

- Nếu sản phẩm và facts đủ: chuyển vào Sales Cycle để hỏi đúng trường còn thiếu hoặc tiến tới cart.
- Nếu chưa xác định sản phẩm: hỏi chọn sản phẩm.
- Nếu thiếu màu/size/thông tin nhận hàng: hỏi đúng trường còn thiếu.
- Chỉ handoff khi dependency/facts thật sự không khả dụng hoặc business rule yêu cầu người xử lý.

Không dùng handoff như fallback mặc định chỉ vì câu chốt chưa đủ dữ liệu.

### D-004 — Không cấm mọi con số trong phần tư vấn

Guard chỉ chặn mẫu facts nghiệp vụ như tiền, tồn, danh sách size hoặc ETA. Không chặn mù các mô tả hợp lệ như “3D”, “2 lớp”, “6 tà”. Thuộc tính thiết kế có số chỉ được dùng khi có trong catalog đã xác minh.

### D-005 — Feature flag và migration

- Mọi thay đổi hành vi model/reply phải có feature flag, mặc định OFF ở LIVE.
- Migration chỉ additive và backward-compatible.
- Runtime cũ phải bỏ qua được field mới.
- Không có down migration khẩn cấp làm mất dữ liệu; rollback ưu tiên flag hoặc image.

### D-006 — Judge không điều khiển outbound

Judge chỉ đánh giá và tạo telemetry. Judge không được thay đổi reply, action, facts, state hoặc side effect.

## 5. Kiến trúc đích sau kế hoạch

Ranh giới dự kiến:

1. Initial model trả AgentProposal: intent, stage, tham chiếu khách dùng và fact request.
2. Resolver xác minh productId, variant và từng business query.
3. Business tools trả typed facts.
4. Grounded model chỉ trả GroundedReplyDraftV1: phần tư vấn, xử lý phản đối, câu hỏi gợi ý và index ảnh.
5. Fact assembler dựng facts bằng code rồi ghép advisory đã guard.
6. Sales Cycle xử lý buying signal, cart, negotiation và checkout.
7. Runtime guard kiểm tra stage/action, facts, ảnh, PII request và ownership.
8. Atomic commit state, audit, funnel, Inbox/Outbox và handoff.

## 6. Chiến lược nhánh, PR và thứ tự release

Không gộp toàn bộ vào một release. Mỗi PR phải nhỏ, test được và rollback độc lập. “Wave” là thứ tự rollout; một wave có thể gồm nhiều PR được merge lần lượt.

| PR/Wave | Phạm vi | Phụ thuộc | Có thể song song |
|---|---|---|---|
| PR-A / Wave 0 | Task 0.1 + golden cases buying signal | Baseline r10.1 | Song song PR-B/PR-C |
| PR-B / Wave 0 | Task 0.2: Vertex auth/retry/jitter | Baseline r10.1 | Song song PR-A/PR-C |
| PR-C / Wave 0 | Task 0.3: golden runtime harness | Baseline r10.1 | Song song PR-A/PR-B |
| PR-D / Wave 0 | Task 0.4: telemetry contract/DB, flag OFF | Thống nhất final commit plan | Schema có thể làm song song; integration làm sau |
| PR-E / Wave 1 | Task 1.1–1.2: grounded schema + fact blocks/assembler | Wave 0 gate | Contract/Vertex và assembler có thể chia worktree |
| PR-F / Wave 1 | Task 1.3–1.4: guard + Judge v2 | PR-E + telemetry | Guard và Judge có thể code song song |
| PR-G / Wave 2 | Task 2.2: profile/measurements | PR-E | Song song PR-H |
| PR-H / Wave 2 | Task 2.3: verified variant | PR-E | Song song PR-G |
| PR-I / Wave 2 | Task 2.4: context 30 → structured state + 10 | PR-G/PR-H đã canary ổn | Không |
| PR-J / Wave 3 | Task 3.1: multi-fact/multi-product | Wave 1; nên sau PR-H | Song song PR-K/PR-L |
| PR-K / Wave 3 | Task 3.2: catalog advisory | Wave 1 | Song song PR-J/PR-L |
| PR-L / Wave 3 | Task 3.4: audit + order-intent idempotency | PR-D + Wave 1 | Migration có thể chuẩn bị song song |
| DEFERRED-2.1 | Unified reducer | Sau toàn bộ PR-2/3 và có evidence | Không làm hiện tại |
| DEFERRED-3.3 | One-question-per-turn A/B | Funnel ổn định ít nhất 14 ngày | Không làm hiện tại |

Khi dùng nhiều agent, mỗi agent phải dùng branch/worktree riêng hoặc chỉ sửa module không trùng. Chỉ integration owner được sửa đồng thời apps/worker/src/realtime-runner.ts để tránh ghi đè.

Flag cấp pipeline đề xuất:

- REALTIME_AGENT_PIPELINE_V2_MODE=OFF|SHADOW|LIVE.
- REALTIME_AGENT_PIPELINE_V2_ROLLOUT_BPS cho rollout ổn định theo page + conversation.
- Các flag capability ở từng task để rollback riêng.
- Page allowlist vẫn là hard gate, không phụ thuộc rollout percentage.
- CANARY_SHADOW của policy không tự động tạo code-path shadow; runner phải có nhánh shadow riêng, không side effect.

## 7. PR-0 — Revenue safety và nền đo lường

### 7.1 Task 0.1 — Chặn NO_REPLY nuốt tín hiệu mua

Mức ưu tiên: P0.

Phạm vi code dự kiến:

- apps/worker/src/vertex.ts
- apps/worker/src/realtime-runner.ts
- apps/worker/src/realtime-sales-cycle.ts
- packages/conversation-engine/src/sales-stage.ts
- packages/conversation-engine/src/index.ts
- packages/contracts/src hoặc contract reason-code tương ứng
- test worker/conversation-engine liên quan

Thiết kế:

1. Tạo containsBuyingSignal(text) dùng chuẩn hóa tiếng Việt hiện có.
2. Nhận diện động từ chốt/lấy/đặt/mua/ship và lựa chọn rõ màu/size/sản phẩm.
3. Phân biệt phủ định hoặc chưa sẵn sàng: “không lấy”, “chưa chốt”, “để chị xem”.
4. Sửa prompt NO_REPLY: chỉ cảm ơn/kết thúc khi không có buying signal, lựa chọn hay câu hỏi chưa giải quyết.
5. Trong runner, tính buying signal deterministic trước khi chấp nhận NO_REPLY.
6. Nếu NO_REPLY bị override, ghi NO_REPLY_OVERRIDE_BUYING_SIGNAL và BUYING_SIGNAL_DETECTED.
7. Cho Sales Cycle xử lý trường còn thiếu; không tạo câu chứa facts chưa xác minh.
8. Retry cùng eventKey không được tạo thêm reply, event hay cart command.

Golden bắt buộc:

- “Ok lấy màu đen”
- “Được, size M nhé”
- “Chốt mẫu này”
- “Ship cho chị mẫu trên”
- “chị lấy áo thôi”
- “cảm ơn, lấy size L”
- “dạ em cảm ơn shop” vẫn NO_REPLY
- “cảm ơn, bao giờ nhận được hàng?” không NO_REPLY
- Có dấu, không dấu và viết tắt
- Câu phủ định không được nhận nhầm là chốt

Tiêu chí hoàn thành:

- NO_REPLY trên buying-signal fixtures bằng 0.
- Câu kết thúc thật vẫn NO_REPLY 100%.
- Không bịa reply khi facts thiếu.
- Không duplicate side effect khi replay cùng eventKey.

Feature flag đề xuất: REALTIME_BUYING_SIGNAL_GUARD_V1.

### 7.2 Task 0.2 — Vertex 401 retry và token single-flight

Mức ưu tiên: P0.

Phạm vi code dự kiến:

- apps/worker/src/vertex.ts
- apps/worker/src/vertex.test.ts
- apps/worker/src/realtime-runner.ts
- packages/durable-messaging/src/retry.ts nếu helper dùng chung phù hợp

Thiết kế:

1. Thêm tokenRefreshPromise vào VertexShadowModel.
2. Nhiều caller cùng hết token phải await cùng một refresh promise.
3. Tạo helper gọi endpoint có auth và chỉ retry đúng một lần khi 401.
4. Áp dụng helper cho generate, groundWithFacts, judge và embedding.
5. 401 lần hai phải dừng; 429/5xx không tạo retry loop dài trong client.
6. Tầng Inbox tiếp tục exponential backoff nhưng thêm jitter ±20%.
7. Jitter nên deterministic theo eventKey/attempt hoặc có RNG inject được để test ổn định.
8. Log có endpoint logic, status, attempt, retryable, errorCode; không log token, assertion, request body hay transcript.

Test bắt buộc:

- Generate 401 rồi 200.
- Judge 401 rồi 200.
- Embedding vẫn giữ hành vi đúng.
- 3, 10 và 100 caller đồng thời chỉ tạo một OAuth refresh.
- 401 hai lần không loop.
- 429/5xx chuyển retry ra Inbox.
- Delay jitter trong ±20%, tối thiểu 1 giây và tối đa 300 giây.

Tiêu chí hoàn thành:

- Synthetic 401 recovery 100%.
- Một concurrent refresh wave chỉ có một OAuth request.
- Không có nested retry amplification.
- Log không chứa secret/PII.

### 7.3 Task 0.3 — Golden transcript harness

Mức ưu tiên: P0.

Không viết lại framework analytics đã có. Mở rộng:

- apps/worker/src/realtime-runner.test.ts
- Tạo apps/worker/src/realtime-golden-transcripts.test.ts nếu file hiện tại quá lớn
- packages/conversation-engine/src/analytics-golden-conversations.ts
- packages/conversation-engine/src/analytics-replay.test.ts
- fixtures test không chứa PII thật

Mỗi fixture phải mô tả:

- InboundMessageV1 và state ban đầu.
- Product/facts/policy/tag adapters giả.
- metaMessages kỳ vọng.
- nextState fields chính.
- handoff/tag/reason codes.
- audit/funnel events kỳ vọng.
- số lần gọi model/tool.

Ma trận tối thiểu:

- Mã sản phẩm → thẻ giá đúng format, đúng tên, text trước ảnh.
- FEEDBACK, DETAIL, BACK, SIZE_GUIDE, PRODUCT_ONLY, GENERIC.
- Thiếu đúng loại ảnh → không lấy ảnh loại khác thay thế.
- Hai đến ba sản phẩm và productSelections.
- Chính sách trước mua có/không có nguồn.
- Toàn bộ taxonomy post-sale.
- STALE, NOT_FOUND, ERROR, DELIVERY_REGION_REQUIRED.
- Batch superseded → INBOX_ONLY.
- Echo bot, echo nhân viên, tag verified/unverified.
- Buying signal, objection và order preview.
- Prompt injection trong transcript.

Tiêu chí hoàn thành:

- Nhánh tuyên bố không đổi hành vi phải structural-equivalent 100%.
- Test không phụ thuộc mạng, thời gian thực hoặc secret.
- Fixture có ID ổn định để dùng lại cho replay/shadow.

### 7.4 Task 0.4 — Funnel và operational telemetry

Mức ưu tiên: P0/P1.

Giữ FunnelEventV1 cho bốn mốc kinh doanh hiện có:

- PRICE_ASKED
- SIZE_CONSULTED
- PURCHASE_CONFIRMED
- SALE_CONVERTED

Không nhét event kỹ thuật vào FunnelEventV1. Tạo RealtimeDecisionEventV1 cho:

- PRODUCT_RESOLVED
- PRICE_CARD_SENT
- SIZE_CONSULT_STARTED
- BUYING_SIGNAL_DETECTED
- ORDER_INFO_REQUESTED
- ORDER_INTENT_CREATED
- HANDOFF
- GUARD_BLOCKED
- NO_REPLY

Contract tối thiểu:

- eventId deterministic từ eventKey + eventType + schemaVersion.
- conversationHash và eventKeyHash; không dùng ID thô làm analytics dimension.
- origin, reasonCodes, releaseId, promptVersion, modelVersion, mode, occurredAt.
- Không có raw text, tên, điện thoại, địa chỉ hoặc secret.
- Unique constraint trên eventId.

Phạm vi code dự kiến:

- packages/contracts/src/v2/handoff-sales-funnel.ts hoặc file operational-event mới
- Tận dụng conversation_events hiện có nếu đáp ứng đủ atomicity/idempotency; chỉ tạo migration 0018 additive nếu schema/index hiện tại chưa đủ
- packages/database/src/chat-history.ts hoặc repository audit mới
- apps/worker/src/realtime-runner.ts
- Admin/analytics read model nếu cần

Quy tắc:

- PRICE_CARD_SENT không đồng nghĩa PRICE_ASKED.
- SIZE_CONSULT_STARTED chưa đồng nghĩa SIZE_CONSULTED.
- ORDER_INTENT_CREATED chưa đồng nghĩa PURCHASE_CONFIRMED.
- SALE_CONVERTED chỉ từ tag Đã chốt đơn đã xác minh.
- Tách cohort outreach/upsale khỏi organic funnel.
- Event liên quan quyết định outbound nên commit atomically hoặc có idempotency đủ để không mất/nhân đôi.

Baseline cần thu:

- REPLY/HANDOFF/NO_REPLY.
- Lỗi model/schema/guard.
- Latency p50/p95 và token usage.
- Từng bước funnel theo SalesEpisodeV1.
- Handoff theo reason.
- Inbox lag/retry/permanent failure và Outbox duplicate/ambiguous.

Nếu chưa có đủ lịch sử, bật telemetry trước và thu tối thiểu 7 ngày; không tuyên bố tăng conversion khi chưa đủ mẫu.

### 7.5 Gate PR-0

Hard gate:

- pnpm check xanh.
- NO_REPLY buying-signal violation bằng 0.
- Duplicate decision/funnel event bằng 0.
- Event chứa PII/raw text bằng 0.
- 401 recovery và single-flight đạt 100% synthetic tests.
- Nhánh deterministic regression bằng 0.

Canary gate:

- CANARY_SHADOW tối thiểu 24 giờ và 100 generation đánh giá được, hoặc replay ít nhất 500 episode cộng 30 kịch bản Messenger nếu traffic thấp.
- Error rate không tăng quá 1 điểm phần trăm.
- p95 processing không tăng quá 10% so với baseline.

## 8. PR-1 — Khóa ranh giới grounded và facts

### 8.1 Task 1.1 — GroundedReplyDraftV1

Mức ưu tiên: P1.

Tạo contract riêng:

- schemaVersion
- advisoryText
- objectionResponse
- suggestedQuestion
- suggestedNextStep
- attachmentImageIndices

Grounded draft tuyệt đối không có:

- action
- productId/variantId
- intent/conversationStage
- businessFactQuery
- URL ảnh tự do
- facts giá/tồn/size/ETA

Phạm vi code dự kiến:

- packages/contracts/src/index.ts hoặc contract version mới
- apps/worker/src/vertex.ts
- apps/worker/src/shadow-runner.ts
- apps/worker/src/realtime-runner.ts
- tests tương ứng

Runner giữ AgentProposal ban đầu làm nguồn quyết định. attachmentImageIndices chỉ được map vào facts.imageUrls; index ngoài phạm vi bị bỏ và ghi GROUNDED_IMAGE_INDEX_OUT_OF_RANGE.

Feature flag đề xuất: REALTIME_GROUNDED_DRAFT_V1.

### 8.2 Task 1.2 — Verified fact assembler

Mức ưu tiên: P1 cao.

Tạo business helper:

- buildVerifiedFactBlocks(facts, intent, product)
- assembleReply(factBlocks, groundedDraft)
- validateAdvisoryAgainstFacts(advisory, facts, productMetadata)

Vị trí ưu tiên:

- packages/business-tools/src/reply-assembler.ts
- packages/business-tools/src/guard.ts
- apps/worker/src/realtime-runner.ts chỉ orchestration

Quy tắc:

- Giá format bằng shortPrice từ salePriceVnd hoặc listPriceVnd.
- Tồn, size, ETA lấy đúng typed fields của envelope.
- Tên, form, chất liệu lấy từ StableProductDocument đã xác minh.
- Advisory không được viết tiền/tồn/size/ETA.
- Pattern guard phải theo loại facts, không chặn mọi chữ số.
- URL ảnh chỉ từ verified image set.
- Một facts block luôn truy được về source field và source version.

Test:

- Model chèn “500k”, “còn 2”, “size S M”, “3 ngày” → strip hoặc block đúng reason.
- “thêu 3D”, “áo 2 lớp”, “thiết kế 6 tà” chỉ được giữ khi metadata catalog có giá trị đó.
- Reply giá phải exact từng ký tự với assembler.
- Không lẫn fact giữa hai sản phẩm.

Feature flag đề xuất: REALTIME_VERIFIED_FACT_ASSEMBLER_V1.

### 8.3 Task 1.3 — Guard nghiệp vụ mở rộng

Thêm kiểm tra:

- READY_TO_BUY + NO_REPLY → block.
- Không xin tên/SĐT/địa chỉ khi chưa có buying signal.
- Không dùng fact block sai product/query.
- Không gửi ảnh sai intent/component.
- Không cho grounded draft thay action hoặc state.
- Reason code mới phải vào audit và handoff mapping có chủ đích.

Reason code dự kiến:

- NO_REPLY_OVERRIDE_BUYING_SIGNAL
- PREMATURE_ORDER_INFO_REQUEST
- MODEL_FACT_IN_ADVISORY
- GROUNDED_IMAGE_INDEX_OUT_OF_RANGE
- GROUNDED_SCHEMA_INVALID
- CROSS_PRODUCT_FACT_BLOCKED

Không biến mọi guard violation thành silent handoff. Ưu tiên deterministic fallback có thể trả lời an toàn; handoff chỉ khi không còn đường an toàn.

### 8.4 Task 1.4 — Judge v2 có verified facts

Mở rộng judge input:

- Redacted context.
- Actual reply không tin cậy.
- VERIFIED_FACTS_JSON.
- Proposal summary.
- Guard outcome.

Thêm điểm 0–5:

- factGrounding
- objectionResolution
- salesProgression
- ctaStageFit

Yêu cầu:

- Schema v2 đọc tương thích record v1.
- 100% DRY_RUN; LIVE mặc định 10% và cấu hình được.
- Judge output không ảnh hưởng outbound.
- improvedReply không được thêm facts ngoài verified envelope.
- Facts block phải có marker trusted; transcript/reply vẫn nằm trong marker untrusted.

Feature flags/config:

- REALTIME_JUDGE_V2_ENABLED
- REALTIME_JUDGE_LIVE_SAMPLE_RATE

### 8.5 Gate PR-1

- Unverified price/stock/size/ETA/URL bằng 0.
- Cross-product fact bằng 0.
- Fact assembler exactness 100% golden/property tests.
- Invalid image index không gửi ảnh.
- Grounded schema không còn decision fields.
- Customer-visible failure do schema invalid bằng 0 vì có fallback.
- grounded_schema_invalid_rate không quá 0,5% ở canary.
- Handoff không tăng quá 2 điểm phần trăm nếu không có lý do an toàn.
- p95 không tăng quá 10%.

Rollback: tắt feature flag schema/assembler và quay về renderer cũ; không down migration dữ liệu.

## 9. PR-2A — Hồ sơ số đo và verified variant

Task 2.1 không được triển khai trong PR này.

### 9.1 Task 2.2 — Nối CustomerProfileV1 và Size Engine

Repo đã có:

- CustomerProfileV1 và SizeChartV1 contracts.
- packages/business-tools/src/customer-profile.ts.
- packages/business-tools/src/size-engine.ts.

Thiếu chính là production adapter và orchestration.

Thiết kế:

1. Extractor deterministic đọc chiều cao, cân nặng, vòng ngực, eo và mông từ tin khách.
2. Mỗi field có value, source, observedAt, confidence và sourceEventHash.
3. Merge theo field; null không ghi đè; khi hai giá trị xung đột thì ưu tiên giá trị có `observedAt` mới nhất theo quyết định D-007.
4. Dùng revision/CAS để hai tin gần nhau không mất dữ liệu.
5. Persist projection số đo có cấu trúc theo pseudonymous customer key với retention ban đầu tối đa 48 giờ hoặc retention ngắn hạn đã được duyệt.
6. Không đưa tên, SĐT, địa chỉ vào CustomerProfileV1.
7. Project summary số đo đã xác minh vào model context.
8. Size engine dùng category, component, form, material và size chart VERIFIED.
9. Thiếu chart/dữ liệu → hỏi tiếp hoặc handoff theo policy; không đoán.
10. verifiedProductInfoProposal đọc profile snapshot thay vì quét lại 30 tin.
11. Hồ sơ định danh dài hạn, lịch sử mua, tên, SĐT và địa chỉ không nằm trong task này; đó là dự án riêng và không được mở rộng ngầm.

Phạm vi code dự kiến:

- packages/business-tools/src/customer-profile.ts
- packages/business-tools/src/size-engine.ts
- packages/contracts/src/v2/customer-size-cart.ts
- packages/database migration/repository profile mới
- apps/worker/src/realtime-runner.ts
- apps/worker/src/realtime-server.ts

Test:

- 1m60, 160cm, 50kg, 50 ký, ba vòng, không dấu.
- Tin đến lệch thứ tự và concurrent merge.
- Số đo mới hơn ghi đè số đo cũ; số đo cũ đến trễ không được ghi đè ngược.
- Đổi sản phẩm giữ measurements.
- Thiếu chart không đề xuất size.
- Boundary chart đúng policy.
- PII không vào profile/model/log.

Feature flag đề xuất: REALTIME_CUSTOMER_PROFILE_V1.

### 9.2 Task 2.3 — Verified variant V2

State đích:

- selectedColorId
- selectedColorLabel
- selectedSizeCode
- mentionedColorText
- mentionedSizeText
- component/offer reference đã xác minh

Quy tắc:

- Text khách là mention, không phải catalog ID.
- Resolver map mention sang POS/catalog.
- Model không sinh colorId, sizeCode hoặc variantId.
- Unknown/ambiguous không silently map.
- Đổi product reset variant nhưng giữ measurements.
- Component áo, chân váy, quần không lẫn.
- ALLOW_MIXED_SIZES và ALLOW_COMPONENT_SALE áp dụng độc lập.
- Không suy tồn component từ parent hoặc ngược lại.

Migration:

- Bump schema theo hướng additive.
- Loader đọc được state v1 và migrate in-memory.
- Writer chỉ ghi V2 sau khi flag bật.
- Runtime cũ vẫn đọc được phần field cũ cần thiết trong thời gian canary.

Feature flag đề xuất: REALTIME_VERIFIED_VARIANT_V2.

### 9.3 Ownership tạm thời khi 2.1 bị hoãn

| Dữ liệu | Writer có thẩm quyền |
|---|---|
| currentProductId | Product resolver + ConversationState |
| selected/mentioned variant | Verified variant reducer/projection |
| measurements/profile | Customer profile repository |
| cart lines/variant đã mua | SalesCycleRuntimeState |
| checkout/preview/confirmation | SalesCycleRuntimeState |

Không được viết cùng field từ grounded model hoặc hai reducer khác nhau.

### 9.4 Gate PR-2A

- Sai size trong boundary fixtures bằng 0.
- Đề xuất size khi thiếu chart/data bằng 0.
- Profile field mất do concurrency bằng 0.
- Verified variant fixtures exact 100%.
- Unknown variant mapping sai bằng 0.
- Không hỏi lại chiều cao/cân nặng đã lưu quá 2% trong replay.
- Không có PII leak.

Rollback: tắt read-path mới; giữ dữ liệu additive đã ghi, không xóa profile/state.

## 10. PR-2B — Cắt model context

### 10.1 Task 2.4

Chỉ bắt đầu khi PR-2A đã ổn định.

Context mới:

- Structured ConversationState cần thiết.
- Product/variant đã xác minh.
- CustomerProfile summary không PII.
- Purchase commitment, unresolved question, owner và Sales Cycle stage.
- 10 tin gần nhất đã redacted.
- Tin mới nhất.

Không thay đổi retention:

- Redis history vẫn 20 ngày.
- PostgreSQL lịch sử ẩn danh vẫn 6 tháng.
- Chỉ giảm số tin gửi model.

Rollout:

1. Default vẫn 30.
2. Shadow so sánh 30 với structured + 10.
3. Review mismatch.
4. Canary page test với 10.
5. Chỉ đổi default sau khi gate đạt.

Metrics:

- Prompt tokens.
- p50/p95 latency.
- Product continuity.
- Tỷ lệ hỏi lại số đo/variant.
- Decision parity.
- Judge/funnel.

Gate:

- Structural decision parity ít nhất 98%, hoặc 100% mismatch đã review và chấp nhận.
- Product/measurement/variant continuity regression bằng 0.
- Prompt token giảm ít nhất 30%.
- p95 không tăng.

Feature config: REALTIME_CONTEXT_HISTORY_LIMIT, mặc định 30 cho đến khi canary duyệt.

## 11. PR-3A — Multi-fact và catalog advisory

### 11.1 Task 3.1 — BusinessFactQueries V2

Contract mới là mảng có giới hạn, đề xuất tối đa ba query:

- queryId deterministic.
- productRef là text khách dùng.
- requestedFacts gồm PRICE, STOCK, SIZE, ETA.
- qualifiers gồm offer/color/size/region.
- productResolution gồm RESOLVED, AMBIGUOUS, MISSING.

Quy tắc:

- Resolver xử lý từng query độc lập.
- productId chỉ do resolver xác minh.
- Preserve thứ tự sản phẩm xuất hiện trong câu.
- Một query lỗi không làm facts query khác bị lẫn.
- AMBIGUOUS → hỏi làm rõ, không đoán.
- Single query tương thích hành vi cũ.
- Không fan-out không giới hạn; timeout và concurrency có trần.

Case bắt buộc:

- Một sản phẩm hỏi giá + tồn + size + ETA.
- Hai sản phẩm, mỗi sản phẩm hỏi fact khác.
- Một query OK, một query ambiguous.
- Một query missing.
- Retry cùng eventKey không duplicate event/tool side effect.

Feature flag: REALTIME_MULTI_FACT_QUERY_V2.

### 11.2 Task 3.2 — Catalog advisory có cấu trúc

Tận dụng fields đã có trong StableProductDocument:

- colors
- materials
- silhouettes
- occasions
- descriptionXml

Thiết kế:

- Exact code trước, alias sau, similarity cuối.
- Dùng fields cấu trúc trước; DESCRIPTION_XML chỉ fallback deterministic có kiểm soát.
- Không để model tự suy độ co giãn, vóc dáng phù hợp hay dịp mặc nếu catalog không có.
- So sánh sản phẩm chỉ theo thuộc tính đã xác minh.
- Qdrant không bao giờ là nguồn giá/tồn/ETA.
- Thiếu thuộc tính phải nói không có hoặc hỏi nhu cầu khác, không bịa.

Data quality:

- Lập bộ truy vấn catalog đã duyệt.
- Exact-code recall phải 100%.
- Precision@3 mục tiêu ít nhất 90%.
- Ambiguous search không tự chọn Top 1 nếu độ tin cậy/khoảng cách không đạt.

Feature flag: REALTIME_CATALOG_ADVISORY_V1.

### 11.3 Gate PR-3A

- Cross-product fact leakage bằng 0.
- Multi-fact golden đúng đủ requested facts 100%.
- Single-query regression bằng 0.
- Exact-code recall 100%.
- Precision@3 ít nhất 90% trên bộ đã duyệt.
- Không phát sinh giá/tồn từ Qdrant.

## 12. PR-3B — Audit đầy đủ và order intent idempotent

### 12.1 Task 3.4

Mỗi generation/customer-affecting decision cần audit:

- auditId deterministic.
- previousStateRevision và nextStateRevision.
- proposal/agent plan đã redacted.
- resolvedFacts status/reason/source version; không lưu PII.
- guard outcome và reason codes.
- rendered reply đã qua redaction phù hợp chính sách lưu trữ.
- promptVersion, schemaVersion, modelVersion, releaseId.
- latency và token usage.
- mode, eventKeyHash, conversationHash.

Không lưu:

- Secret/token/assertion.
- Raw tên, điện thoại, địa chỉ.
- Request body Vertex nguyên bản.
- Unbounded facts payload hoặc ảnh base64.

Order intent:

- ID từ deterministicUuid(planSeed + “:order-intent”).
- Unique constraint/idempotent insert.
- Duplicate webhook/retry → no-op.
- Một cart version chỉ có một PURCHASE_CONFIRMED.
- Không gọi ORDER_CREATED nếu chưa có mã đơn POS thật.
- Meta Outbox, tag intent, sales event và state commit không được tách thành side effect dễ nhân đôi.

Repo đã có một phần idempotency trong Sales Cycle; task này phải audit gap trước, chỉ bổ sung phần thiếu, không viết lại cơ chế đã ổn.

Feature flag: REALTIME_DECISION_AUDIT_V2.

### 12.2 Gate PR-3B

- Duplicate order intent, PURCHASE_CONFIRMED và Outbox bằng 0.
- Audit completeness cho quyết định ảnh hưởng khách đạt 100%.
- PII/secret leak bằng 0.
- Replay cùng eventKey không tạo record thứ hai.
- Migration up/down test xanh; runtime cũ bỏ qua bảng/field mới.

## 13. Hạng mục hoãn

### 13.1 Task 2.1 — Unified reducer

Trạng thái: DEFERRED, vẫn bắt buộc xem xét sau.

Điều kiện bắt đầu:

- PR-2A/2B chạy ổn định.
- Có field-ownership map được duyệt.
- Có evidence state drift hoặc chi phí duy trì đủ lớn.
- Có golden replay cho fence, concurrent messages, cart mutation và confirmation.

Hướng thực hiện sau:

1. Viết ADR, không code ngay.
2. Xác định aggregate root và transaction boundary.
3. Dual-read state cũ/mới.
4. Shadow reducer so sánh next state.
5. Backfill/migration additive.
6. Canary read path.
7. Chỉ chuyển writer sau parity.

Không làm big-bang rewrite và không tạo state thứ ba.

### 13.2 Task 3.3 — One-question-per-turn A/B

Trạng thái: DEFERRED, default OFF.

Điều kiện bắt đầu:

- Funnel telemetry ổn định ít nhất 14 ngày.
- Có ít nhất 200 qualified sales episode mỗi nhánh; thiếu mẫu phải báo INSUFFICIENT_EVIDENCE.
- Không còn lỗi hard-gate ở các batch trước.

Thiết kế sau:

- Split ổn định theo conversation hash.
- Control giữ hành vi hiện tại.
- Variant hỏi tối đa một câu theo product → color → size → measurements → order info.
- Primary metric: tiến sang bước tiếp theo trong 24 giờ và PURCHASE_CONFIRMED.
- Guardrail: handoff, negative reply, số lượt đến chốt, drop-off và latency.
- Không đổi default nếu uplift không rõ hoặc guardrail xấu đi.

## 14. Kế hoạch test tổng

### 14.1 Test layers

1. Contract/Zod tests.
2. Business-tool unit/property tests.
3. Conversation-engine reducer/ownership tests.
4. Worker orchestration tests.
5. Database migration/repository/idempotency tests.
6. Golden transcript replay.
7. Concurrency/fence/batch superseded tests.
8. Prompt-injection và PII tests.
9. Docker smoke trên đúng image candidate.
10. CANARY_SHADOW rồi CANARY_LIVE trên page test.

### 14.2 Hard safety gates

Không được owner override:

- Buying signal cuối cùng thành NO_REPLY.
- Facts hoặc URL không truy về verified source.
- Sai sản phẩm, variant, component hoặc loại ảnh.
- Duplicate Meta Outbox, order intent hoặc confirmation.
- PII/secret trong model context, log hoặc audit.
- Outbound ngoài page allowlist.
- Regression webhook signature, message_id dedup, Inbox hoặc batch guard.

### 14.3 Ngưỡng canary

Rollback tức thì khi gặp một hard safety violation.

Pause/rollback theo ngưỡng khi có ít nhất 20 generation trong cửa sổ:

- Model/schema failure trên 5% trong 15 phút.
- Error rate trên 2% trong 15 phút.
- p95 trên 12 giây hoặc trên hai lần baseline.
- Inbox lag trên 60 giây liên tục 10 phút.
- Handoff hoặc NO_REPLY tăng trên 10 điểm phần trăm không có lý do nghiệp vụ.
- Ba lỗi liên tiếp cùng loại trên page test.

Chất lượng giọng văn và funnel là soft gate; không dùng riêng Judge score để publish.

## 15. Quy trình canary và deploy

Cho từng PR có thay đổi runtime:

1. Tạo branch từ main mới nhất.
2. Chạy targeted tests.
3. Chạy pnpm check.
4. Rà secret, PII, ownership và migration.
5. Merge main, tạo tag và manifest.
6. VPS fetch bằng deploy key read-only vào release directory mới.
7. Backup/restore-test nếu có migration.
8. Build image mới, không ghi đè image đang chạy.
9. Chạy replay baseline/candidate.
10. Bật CANARY_SHADOW 100% trên page test.
11. Chạy ít nhất 30 scripted Messenger conversations bao phủ hard gates.
12. Bật CANARY_LIVE trên page test 48 giờ hoặc tối thiểu 100 generation.
13. Xem Inbox/Outbox, guard, handoff, funnel, latency và error.
14. Chỉ publish khi gate đạt.

Không recreate service không liên quan. Không restart n8n, POS snapshot hay P2.3 nếu release chỉ đổi realtime worker.

## 16. Rollback

Thứ tự:

1. Tắt feature flag candidate hoặc đổi policy pointer về last-known-good.
2. Nếu lỗi code, trả riêng realtime worker về image digest trước.
3. Không xóa Inbox, Outbox, Redis, PostgreSQL, Qdrant hoặc audit.
4. Giữ migration additive; runtime cũ phải chạy được.
5. Kiểm tra Inbox lease, Outbox pending/ambiguous, policy resolver, page allowlist và health.
6. Chạy smoke không gửi; chỉ gửi Messenger page test khi cần xác minh.

Mục tiêu:

- Flag rollback không quá 10 phút.
- Image rollback không quá 20 phút.
- RPO Inbox/Outbox bằng 0.

Last-known-good ban đầu của kế hoạch là release 20260723-customer-care-policy-r10-1; phải cập nhật khi một batch mới đã được xác minh và trở thành baseline.

## 17. Progress ledger

Agent chỉ đổi trạng thái sau khi có bằng chứng. Giá trị hợp lệ: NOT_STARTED, IN_PROGRESS, CODE_COMPLETE, SHADOW, CANARY_LIVE, DEPLOYED, BLOCKED, DEFERRED.

| Hạng mục | Trạng thái | Branch/PR | Commit/tag | Test evidence | Deploy evidence | Ghi chú |
|---|---|---|---|---|---|---|
| 0.1 NO_REPLY buying signal | CANARY_LIVE | feat/realtime-wave0-safety-telemetry | `f27de9c` | buying-signal 19; sales-cycle 6; golden 6; toàn repo 727 pass | Flag ON chỉ page test; health/rollback đạt | P0 |
| 0.2 Vertex 401/single-flight/jitter | CANARY_LIVE | feat/realtime-wave0-safety-telemetry | `f27de9c` | Vertex 19; concurrent 3/10/100; 401/429/503/jitter | Có trong image realtime CANARY_LIVE | P0 |
| 0.3 Golden transcripts | CANARY_LIVE | feat/realtime-wave0-safety-telemetry | `f27de9c` | runtime 38 + golden 6; toàn repo 727 test pass | Candidate image đã build/deploy đúng commit | P0 |
| 0.4 Funnel/operational telemetry | CANARY_LIVE | feat/realtime-wave0-safety-telemetry | `f27de9c` | contract 3; DB atomic/idempotent 7; worker golden 6 | Decision telemetry ON; duplicate sequence 0 | P0/P1 |
| 1.1 GroundedReplyDraftV1 | CANARY_LIVE | feat/realtime-wave1-grounded-facts | `f27de9c` | contract 7; Vertex 19; golden 6; toàn repo 727 test pass | Flag ON chỉ page test; rollback đạt | Schema strict không có action/product/query/fact |
| 1.2 Verified fact assembler | CANARY_LIVE | feat/realtime-wave1-grounded-facts | `f27de9c` | assembler 12; exact price/cross-product/image index/schema fallback golden | Flag ON; migration 0018; direct Messenger test pending | Facts và URL chỉ lấy từ envelope/catalog đã xác minh |
| 1.3 Business guard | CANARY_LIVE | feat/realtime-wave1-grounded-facts | `f27de9c` | guard 17; buying signal 19; golden 6; full typecheck/build | Flag ON; ambiguous 0, duplicate sequence 0 | Chặn NO_REPLY khi có buying signal, xin PII sớm và ghi reason code kể cả khi fallback |
| 1.4 Judge v2 | SHADOW | feat/realtime-wave1-grounded-facts | `f27de9c` | Judge/Vertex 19; shadow 6; migration suite 16; toàn repo 727 test pass | Shadow `DRY_RUN`, send disabled, role không ghi Meta Outbox | Persist verified envelope; chưa đủ evidence để CANARY_LIVE |
| 2.1 Unified reducer | DEFERRED | — | — | — | — | Làm sau |
| 2.2 Profile/measurements | CANARY_LIVE | feat/realtime-wave2-profile-variant-context | `b29725d` / `20260723-realtime-wave23-canary-r12` | release: profile merge 8; regression D-007 trên main: profile merge 9/9 | Migration 0019; flag ON chỉ page test; profile TTL 48h | CAS và PII gate đạt; số đo có `observedAt` mới nhất thắng theo D-007 |
| 2.3 Verified variant | CANARY_LIVE | feat/realtime-wave2-profile-variant-context | `b29725d` / `20260723-realtime-wave23-canary-r12` | verified snapshot 5; worker 209; toàn repo 739 pass | Flag ON chỉ page test; rollback/roll-forward đạt | Mention chỉ map qua POS snapshot; không giả nhãn màu thành POS color ID |
| 2.4 Context trim | CANARY_LIVE | feat/realtime-wave2-profile-variant-context | `b29725d` / `20260723-realtime-wave23-canary-r12` | worker 209; full build/typecheck | Context limit 10 chỉ page test | Redis/PostgreSQL retention không đổi |
| 3.1 Multi-fact/multi-product | CANARY_LIVE | feat/realtime-wave2-profile-variant-context | `b29725d` / `20260723-realtime-wave23-canary-r12` | contract 3; worker 209; toàn repo 739 pass | Flag ON chỉ page test; max 3 product query | Facts cùng product chạy có thứ tự; tối đa 3 product chạy song song |
| 3.2 Catalog advisory | CANARY_LIVE | feat/realtime-wave2-profile-variant-context | `b29725d` / `20260723-realtime-wave23-canary-r12` | structured advisory fixtures trong worker 209 | Flag ON chỉ page test | Qdrant fields trước; DESCRIPTION_XML chỉ fallback được kiểm soát |
| 3.3 One-question A/B | DEFERRED | — | — | — | — | Làm sau |
| 3.4 Audit/order intent | CANARY_LIVE | feat/realtime-wave2-profile-variant-context | `b29725d` / `20260723-realtime-wave23-canary-r12` | DB atomic/idempotent 7; contracts 71; toàn repo 739 pass | Decision audit v2 ON; duplicate plan sequence 0 | Không lưu raw model body, PII hay secret; order intent giữ idempotency hiện có |

## 18. Decision log

| Ngày | ID | Quyết định | Lý do |
|---|---|---|---|
| 2026-07-23 | D-001 | Hoãn unified reducer 2.1 | Rủi ro refactor lớn; hai state hiện có ownership khác nhau |
| 2026-07-23 | D-002 | Hoãn one-question A/B 3.3 | Chưa có funnel baseline đủ tin cậy |
| 2026-07-23 | D-003 | Buying signal thiếu dữ liệu không tự động handoff | Ưu tiên Sales Cycle hỏi đúng phần còn thiếu |
| 2026-07-23 | D-004 | Guard số theo typed business facts, không cấm mọi số | Tránh chặn mô tả hợp lệ như 3D/2 lớp/6 tà |
| 2026-07-23 | D-005 | Mọi thay đổi hành vi qua feature flag | Canary và rollback độc lập |
| 2026-07-23 | D-006 | Judge chỉ đánh giá | Không cho mô hình đánh giá điều khiển outbound |
| 2026-07-31 | D-008 | Every new handoff case has an explicit 30-minute SLA plus a database default | A missing SLA must never turn a valid handoff into a permanent Inbox failure. |
| 2026-07-31 | D-009 | Any grounded-draft Vertex error uses a deterministic verified-facts fallback | Preserve a safe customer reply without retaining raw provider errors or changing the proposal decision. |
| 2026-07-31 | D-010 | Size Engine composes with an existing verified reply | Size advice must not replace verified price, stock, ETA, or attachments. |
| 2026-07-31 | D-011 | Reused handoff timestamps are explicitly cast as timestamptz | PostgreSQL must not infer incompatible parameter types when the timestamp is both stored and used to calculate SLA. |
| 2026-07-23 | D-007 | Số đo mới nhất được ưu tiên khi xung đột | Chủ dự án muốn dữ liệu khách vừa cung cấp thay thế giá trị cũ, không cần bước xác nhận |

Mọi quyết định mới làm đổi phạm vi, source-of-truth, retention, handoff hoặc safety gate phải ghi thêm một dòng trước khi code.

## 19. Checklist bàn giao cho agent tiếp theo

Khi tiếp tục kế hoạch:

- Đọc các nguồn ở mục 2.
- Kiểm tra git status, branch và manifest mới nhất.
- Chọn đúng hạng mục đầu tiên có dependency đã đạt.
- Không tự chuyển DEFERRED thành IN_PROGRESS.
- Tạo branch/PR đúng wave.
- Ghi feature flag và rollback trước khi sửa runner.
- Không để hai agent cùng sửa realtime-runner.ts trong một working tree.
- Chạy targeted tests và pnpm check.
- Cập nhật Progress ledger bằng commit/test evidence.
- Chỉ cập nhật production baseline/changelog/manifest sau deploy thật.
- Không đưa secret hoặc dữ liệu khách hàng thật vào commit/test.

## 20. Definition of Done toàn chương trình

- Tất cả golden tests xanh.
- NO_REPLY với buying signal bằng 0.
- Mọi facts nhạy cảm và ảnh truy được về typed verified source.
- Model không thay action/product/query ở bước grounded.
- Không có duplicate Inbox/Outbox/order intent/confirmation.
- Profile/variant không mất dữ liệu khi concurrency.
- Multi-fact không lẫn sản phẩm.
- Audit đầy đủ, không PII/secret.
- Hard safety gates đạt trên CI, replay, shadow và page canary.
- README, AGENTS, production baseline, changelog và manifest không lệch trạng thái.
- Task 2.1 và 3.3 vẫn được theo dõi rõ là DEFERRED cho đến khi đủ điều kiện.
