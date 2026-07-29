# Task 2.0A — Meta Ads Entry Context & Lead Qualification

Trạng thái: `PLANNED`
Phiên bản kế hoạch: `1.0`
Baseline áp dụng: `20260729-wave2-strategy-gemini35-r26.1`
Page triển khai đầu tiên và duy nhất: `1198992073286645`

Tài liệu này cụ thể hóa phần acquisition attribution còn thiếu của Wave 2 cho thực tế đa số hội thoại La.na bắt đầu từ Meta Ads. Task 2.0A là một lớp analytics sidecar: ghi nhận nguồn vào, hành vi sau phản hồi đầu tiên và mức độ qualified; không thay đổi nội dung trả lời, checkout, handoff, offer, ownership hoặc quyền gửi outbound.

## 1. Tài liệu nguồn và thứ tự ưu tiên

Agent triển khai phải đọc theo thứ tự:

1. [README](../../README.md).
2. [Production baseline](PRODUCTION_BASELINE_20260722.md).
3. [Realtime Sales Agent upgrade plan](REALTIME_AGENT_UPGRADE_PLAN.md).
4. [Wave 1 & Wave 2 implementation plan v1.2](WAVE1_WAVE2_IMPLEMENTATION_PLAN_v1.2.md).
5. [Wave 2 + Gemini 3.5 r26.1 status](WAVE2_GEMINI35_R26_1_STATUS_20260729.md).
6. [Manifest r26.1](../../deploy/manifests/20260729-wave2-strategy-gemini35-r26.1.json).

Khi có mâu thuẫn, yêu cầu mới nhất của chủ dự án, `AGENTS.md`, README, production baseline và manifest mới nhất có hiệu lực cao hơn tài liệu này.

## 2. Kết luận thiết kế

Phương án được chọn:

```text
Meta inbound + Ads referral
  → normalizer hiện có
  → acquisition session + structured events
  → projection một dòng/acquisition session
  → Admin funnel

Realtime hiện có
  → semantic/runtime events đã guard
  → lead qualification deriver deterministic
  → cùng acquisition projection

POS acknowledgement
  → ORDER_CREATED_ACK
  → chỉ triển khai khi có source-of-truth thật
```

Không tạo CRM, event platform, worker gửi tin hoặc classifier/model thứ hai. Task này tái sử dụng Inbox, canonical message history, Meta Outbox, `conversation_events`, sales-cycle events và Admin read-model hiện có.

## 3. Capability/delta map trên r26.1

| Năng lực | Trạng thái | Bằng chứng/ghi chú |
|---|---|---|
| Xác minh Meta signature, page allowlist và dedupe inbound | `DONE` | API + durable Inbox hiện hành |
| Parse `message.referral` và `ads_context_data` | `PARTIAL` | Đã có `source`, `adTitle`, `postId`, `adId`, `ref`; chưa có `referralType`; không cần persist `photo_url` ở đợt đầu |
| Persist Ads context theo inbound message | `DONE` | `message_ad_contexts`, migration `0011_ads_media_analytics` |
| Dùng ad title để exact-resolve mã sản phẩm | `DONE` | Realtime chỉ nhận mã exact-match; Ads text không phải business fact |
| Acquisition session cho từng Ads entry | `MISSING` | Chưa có contract, table hoặc resolver |
| Canonical outbound chỉ ghi sau Meta accepted | `DONE` | `recordAcceptedOutboundBotMessage`; Outbox có `replyPlanId`, `responseGroupId`, `sequenceNo` |
| Join initial reply với Ads entry | `MISSING` | Chưa có acquisition/reply-plan causal link |
| Delivery/read receipt | `PARTIAL` | Outbox có trạng thái/cột tương ứng; chỉ dùng khi receipt join chính xác theo provider message |
| `BUYING_SIGNAL_COMMITTED` và `PURCHASE_CONFIRMED` | `DONE` | Runtime r26.1 phát structured decision events |
| `BUYING_CANDIDATE` đáng tin cậy | `PARTIAL` | Không suy ra chỉ từ Ads entry hoặc model text tự do |
| `ORDER_CREATED` từ POS | `DEFERRED` | Production dừng ở `PURCHASE_CONFIRMED`; chưa có POS acknowledgement |
| Lead qualification projection | `MISSING` | Chưa có stage/disposition/acquisition grain |
| Admin funnel PII-free | `PARTIAL` | Có `admin_conversation_events_v` và Wave 2 metrics; chưa có acquisition funnel |

## 4. Mục tiêu và phạm vi

### 4.1 Mục tiêu

- Phân biệt Ads entry được Meta xác nhận với nguồn không xác định.
- Tạo một acquisition session idempotent cho mỗi Ads entry mới.
- Xác định phản hồi đầu tiên của bot bằng causal ID, không ghép mơ hồ theo timestamp.
- Đo khách quay lại, trả lời meaningful và tiến tới buying commitment hay không.
- Tách `maxStageReached` khỏi trạng thái hiện tại của lead.
- Nối acquisition với sales cycle và `PURCHASE_CONFIRMED`.
- Chuẩn bị điểm nối `ORDER_CREATED_ACK` nhưng không phát sự kiện giả.
- Cung cấp dashboard theo ad/post/product và điểm rơi của funnel, không lộ PII.

### 4.2 Ngoài phạm vi

- Marketing API, campaign/ad-set, spend, impression, click hoặc ROAS chính thức.
- Sửa quảng cáo hoặc tối ưu creative tự động.
- Thay đổi initial reply, CTA, offer, playbook, checkout, handoff hoặc outbound.
- Gọi thêm model bắt buộc trên inbound.
- Dùng Ads entry đơn lẻ để kết luận need, barrier, qualified hoặc buying candidate.
- Gọi `PURCHASE_CONFIRMED` là đơn POS đã tạo.
- Follow-up/no-response outbound.

## 5. Quyết định kiến trúc bắt buộc

### ADQ-D001 — Analytics sidecar, không tạo state machine thứ ba

Acquisition session có table/projection riêng. Không nhét toàn bộ lead state vào `ConversationState` hoặc `SalesCycleRuntimeState`. Runtime chỉ mang `acquisitionSessionId` ở điểm nối cần attribution.

Mọi lỗi ghi analytics phải fail-open trong savepoint có kiểm soát: Inbox/Outbox và phản hồi khách không được rollback vì dashboard acquisition lỗi.

### ADQ-D002 — Không có referral không đồng nghĩa Organic

Nguồn chuẩn:

```text
META_ADS_CONFIRMED
OTHER_REFERRAL
UNKNOWN
```

Chỉ `message.referral.source`, sau khi normalize uppercase, bằng `ADS` mới tạo `META_ADS_CONFIRMED`. Thiếu referral là `UNKNOWN`; dashboard không được đổi nhãn thành `ORGANIC`.

### ADQ-D003 — Ads entry là bằng chứng yếu

Tin đầu từ Ads vẫn được semantic pipeline dùng để trả lời, tìm sản phẩm, báo giá, tư vấn size hoặc hỏi clarification. Tuy nhiên tin này có:

```text
acquisitionRole = AD_ENTRY_MESSAGE
evidenceStrength = WEAK_ENTRY
maxStageReached = UNQUALIFIED_ENTRY
```

Không dùng riêng tin đầu để derive `QUALIFIED_INTEREST`, `BUYING_CANDIDATE`, need/barrier mạnh hoặc strategy outbound.

### ADQ-D004 — Session idempotent và attribution window rõ ràng

Một Ads entry mới có `message.mid` mới tạo một session mới. Retry cùng message chỉ trả session cũ.

```text
acquisitionSessionId = deterministic UUID/HMAC(
  pageId
  + entryMessagePk
  + normalizedAdId-or-unknown
  + derivationVersion
)
```

Session active đến điều kiện đầu tiên:

- Có Ads entry được xác nhận mới trong cùng conversation.
- Sales cycle hiện hành đạt terminal state.
- Hết `AD_ACQUISITION_WINDOW_HOURS`, mặc định `168` giờ.

Phải lưu cả first-touch và last-eligible-touch. Báo cáo này là attribution nội bộ, không được mô tả như attribution chính thức của Meta.

### ADQ-D005 — Stage lịch sử và disposition hiện tại là hai trục khác nhau

`maxStageReached` chỉ tăng:

```text
UNQUALIFIED_ENTRY
→ REENGAGED
→ QUALIFIED_INTEREST
→ BUYING_CANDIDATE
→ BUYING_COMMITTED
→ PURCHASE_CONFIRMED
→ CONVERTED
```

`CONVERTED` chỉ dùng sau `ORDER_CREATED_ACK` từ POS.

`currentDisposition` được cập nhật độc lập:

```text
ACTIVE
NEGATED
RETRACTED
STALE
PURCHASE_CONFIRMED
CONVERTED
```

Khách từng có nhu cầu nhưng sau đó từ chối vẫn giữ lịch sử stage đã đạt, đồng thời hiển thị disposition `NEGATED` hoặc `RETRACTED`.

### ADQ-D006 — Initial reply phải theo causal chain

Initial reply là reply plan đầu tiên được tạo cho Ads entry và Outbox unit đầu tiên của plan đó được Meta chấp nhận.

```text
entry message
→ acquisitionSessionId
→ replyPlanId
→ sequenceNo = 0
→ outboxId
→ SENT_ACCEPTED
→ providerMessageIdHash
```

Tên event chuẩn là `BOT_INITIAL_AD_REPLY_ACCEPTED`, không phải `SENT` khi mới enqueue. `DELIVERED` và `READ` là mốc riêng, nullable. Timestamp không được dùng để quyết định khi có nhiều reply plan cạnh nhau; ca mơ hồ mang outcome `ATTRIBUTION_AMBIGUOUS`.

### ADQ-D007 — No-response là projection-derived ở bản đầu

`NO_RESPONSE_1H` và `NO_RESPONSE_24H` được tính từ timestamp trong projection, không tạo timer/worker hoặc outbound mới ở Task 2.0A1. Chỉ materialize thành event sau này nếu có nhu cầu vận hành rõ ràng và vẫn phải idempotent.

### ADQ-D008 — POS là quyền duy nhất tạo conversion cuối

Funnel production của Task 2.0A1/2.0A2 dừng ở `PURCHASE_CONFIRMED`.

`ORDER_CREATED_ACK` và `CONVERTED` bị hard-disable cho tới khi POS/order source-of-truth cung cấp acknowledgement có `orderId`, `salesCycleId`, trạng thái và idempotency key đáng tin cậy.

### ADQ-D009 — Wave 2 chỉ đọc acquisition ở shadow trước

Task này có thể bổ sung acquisition dimensions cho baseline/dashboard. Không truyền raw ad title, ad image hoặc weak entry vào prompt. Downstream Wave 2 chỉ được đọc:

```text
entrySource
evidenceStrength
maxStageReached
currentDisposition
firstMeaningfulLabel
firstBarrier đã qua evidence guard
```

Việc dùng các field trên để đổi CTA/offer/playbook là experiment riêng.

### ADQ-D010 — Giới hạn dữ liệu

- Tái sử dụng `customer_hash`; không lưu raw sender ID.
- `ad_id`, `post_id`, bounded `ad_title` chỉ nằm trong bảng acquisition/restricted read model cần thiết cho Admin.
- Không persist `photo_url` ở đợt đầu. Nếu sau này cần preview creative, phải dùng proxy/allowlist và TTL riêng.
- Ad title/referral content là input không tin cậy, không phải fact về giá, tồn, size, ETA, ưu đãi hoặc chính sách.
- Admin view không lộ `customer_hash`, raw `event_metadata`, raw message, PII hoặc checkout payload.

## 6. Contract và event

### 6.1 Contract mới

Tạo `packages/contracts/src/v2/ad-acquisition.ts` với:

```text
AcquisitionEntrySourceV1
AcquisitionMessageRoleV1
AcquisitionEvidenceStrengthV1
LeadQualificationStageV1
LeadDispositionV1
AcquisitionEventV1
AcquisitionSessionV1
```

Mở rộng additive `MetaAdsContextV1` bằng `referralType: string | null`. `photoUrl` không thuộc contract persistence của đợt đầu.

### 6.2 Event mới

Ghi vào `conversation_events` với event ID deterministic:

```text
AD_ENTRY_RECEIVED
BOT_INITIAL_AD_REPLY_LINKED
BOT_INITIAL_AD_REPLY_ACCEPTED
BOT_INITIAL_AD_REPLY_SEND_FAILED
BOT_INITIAL_AD_REPLY_DELIVERED
BOT_INITIAL_AD_REPLY_READ
CUSTOMER_REENGAGED
CUSTOMER_MEANINGFUL_REPLY
CUSTOMER_AMBIGUOUS_ACK
LEAD_QUALIFICATION_STAGE_CHANGED
LEAD_DISPOSITION_CHANGED
ACQUISITION_ATTRIBUTION_AMBIGUOUS
```

Reuse:

```text
PRODUCT_MATCHED
BUYING_SIGNAL_COMMITTED
BUYING_SIGNAL_RETRACTED
READY_TO_BUY
ORDER_PREVIEW_CREATED
PURCHASE_CONFIRMED
HANDOFF_REQUESTED
```

Không thêm `ORDER_CREATED` cho tới khi có POS acknowledgement.

Event metadata chỉ chứa ID nội bộ/đã băm, enum, version và timestamp:

```text
acquisitionSessionId
entryMessagePk
triggerMessagePk
replyPlanId nullable
outboxId nullable
salesCycleId nullable
previousStage nullable
nextStage nullable
previousDisposition nullable
nextDisposition nullable
qualifyingLabels[]
derivationVersion
```

Không đưa `customerId`, raw sender ID, raw message, ad title, image URL hoặc PII vào event metadata.

## 7. Meaningful reply và lead derivation

Chỉ xét customer message mới sau `BOT_INITIAL_AD_REPLY_ACCEPTED`.

### 7.1 Re-engagement

Tạo `CUSTOMER_REENGAGED` khi message có identity mới, không phải page echo/retry/duplicate và join đúng acquisition session còn active. Emoji, sticker, reaction hoặc “dạ/ok” không rõ target vẫn có thể là re-engagement.

### 7.2 Meaningful

Meaningful khi message làm thay đổi tư vấn/funnel và có source event/evidence được allowlist, ví dụ:

- Product info, ảnh, giá có ngữ cảnh mới.
- Size, số đo, màu, variant hoặc so sánh sản phẩm.
- Price/fit/style/material/trust/delivery objection.
- Câu hỏi chính sách trước mua.
- Continuation có thông tin mới.
- Buying commitment, negation hoặc retraction rõ.

Attachment chỉ meaningful khi resolver xác định được giá trị sử dụng. Empty, emoji/sticker/reaction-only, duplicate/retry/echo hoặc acknowledgement không rõ target không meaningful.

Acknowledgement chỉ được nâng khi state xác minh target, ví dụ bot hỏi “chốt size M đúng không?” và khách trả lời “ok”. Nếu target không rõ, ghi `CUSTOMER_AMBIGUOUS_ACK` và giữ stage `REENGAGED`.

### 7.3 Quy tắc phủ định

`BUYING_NEGATED` hoặc `BUYING_RETRACTED` có thể tạo `CUSTOMER_MEANINGFUL_REPLY`, nhưng không tự nâng `QUALIFIED_INTEREST`; thay vào đó cập nhật disposition. Chỉ nâng qualified nếu cùng message có evidence thương mại độc lập được allowlist.

`PRE_SALE_RETURN_POLICY_QUESTION` có thể là qualified interest nhưng không được đổi sang post-sale terminal.

### 7.4 Buying candidate

Không phát `BUYING_CANDIDATE` từ Ads entry, ad title hoặc model text tự do. Trong 2.0A2 chỉ dùng signal deterministic/reviewed. Nếu r26.1 chưa có source đủ tin cậy, stage có thể đi thẳng từ `QUALIFIED_INTEREST` đến `BUYING_COMMITTED`; không tạo candidate giả để làm đẹp funnel.

## 8. Lưu trữ và migration

Migration dự kiến:

```text
0024_ad_acquisition_analytics.up.sql
0024_ad_acquisition_analytics.down.sql
```

Migration phải additive/backward-compatible.

### 8.1 `message_ad_contexts`

- Thêm nullable `referral_type`.
- Giữ dữ liệu hiện có.
- Không thêm `photo_url` trong đợt đầu.

### 8.2 `acquisition_sessions`

Grain một dòng/acquisition session:

```text
acquisition_session_id
page_id
conversation_id
customer_hash
entry_message_pk + entry_message_occurred_at
entry_source
referral_type
ad_id
post_id
ad_title
extracted_product_id
sales_cycle_id nullable
attribution_expires_at
initial_reply_plan_id nullable
initial_outbox_id nullable
initial_reply_accepted_at nullable
initial_reply_delivered_at nullable
initial_reply_read_at nullable
reengaged_at nullable
meaningful_at nullable
qualified_at nullable
committed_at nullable
purchase_confirmed_at nullable
order_created_at nullable
max_stage_reached
current_disposition
first_meaningful_label nullable
first_barrier nullable
derivation_version
created_at
updated_at
```

Ràng buộc/index:

- Unique entry message identity và acquisition session ID.
- Index `page_id + created_at` và `conversation_id + created_at desc`.
- Index `page_id + ad_id + created_at desc`.
- Partial index `sales_cycle_id` khi khác null.
- Check constraint cho stage/disposition/source.

`order_created_at` nullable để tương thích tương lai nhưng không writer nào được ghi trong 2.0A1/2.0A2.

### 8.3 Admin read model

Tạo `admin_acquisition_sessions_v` với `security_barrier=true`. View chỉ lộ dimension bounded cần cho dashboard, không lộ `customer_hash`, raw event metadata hoặc message content. Migration down phải khôi phục đúng owner/ACL như pattern `0023_wave2_strategy_metrics`.

## 9. Điểm nối code dự kiến

| Miền | File hiện có/dự kiến |
|---|---|
| Contract | `packages/contracts/src/index.ts`, `packages/contracts/src/v2/ad-acquisition.ts` |
| Meta normalize | `packages/meta-webhook/src/normalize.ts`, `normalize.test.ts` |
| Persistence | `packages/database/src/ad-acquisition.ts`, `ad-acquisition.test.ts` |
| Canonical history | `packages/database/src/chat-history.ts`, `chat-history.test.ts` |
| Migration/ACL | `packages/database/migrations/0024_*`, migration test mới |
| Runtime event/link | `apps/worker/src/realtime-runner.ts`, `packages/database/src/realtime-runtime.ts` |
| Meta accepted/receipt | `apps/worker/src/meta-outbox-dispatcher.ts` và store tương ứng |
| Lead deriver | `apps/worker/src/ad-lead-qualification.ts` và test mới |
| Admin API | `apps/admin-api/src/store.ts`, `store.test.ts`, `app.ts` |
| Admin Web | `apps/admin-web/src/api.ts`, `main.ts`, `styles.css` và UI tests |
| Config/deploy | `.env.example`, `deploy/.env.infrastructure.example`, `deploy/docker-compose.vps.yml` |
| Release evidence | baseline, changelog và manifest mới chỉ cập nhật sau deploy thật |

Coding agent phải xác nhận lại file-map ở đầu mỗi PR; không sửa source trực tiếp trên VPS.

## 10. Trình tự triển khai

### 2.0A1 — Acquisition foundation

1. Contract + Meta normalization:
   - Normalize source uppercase.
   - Bổ sung `referralType`.
   - Giữ nullable behavior khi thiếu `ad_id`/`ads_context_data`.
2. Migration `0024` + repository:
   - Session idempotent.
   - Restricted Admin view và ACL test.
3. Entry/session wiring:
   - Tạo session trong savepoint sau khi canonical inbound được dedupe.
   - Không ảnh hưởng reply khi analytics lỗi.
4. Initial reply causal link:
   - Link session với `replyPlanId` trong atomic runtime commit.
   - Chỉ ghi accepted khi Outbox unit đầu có provider evidence.
5. Re-engagement:
   - Join inbound tiếp theo vào active session.
   - Lọc echo/retry/duplicate.
6. Dashboard top funnel:
   - Ads entry, accepted reply, re-engaged.
   - No-response 1h/24h derive theo query.

Rollout: `SHADOW` 100% trên page test. Outbound phải plan-equivalent với r26.1 khi so cùng fixture.

### 2.0A2 — Meaningful reply và lead qualification

1. Xây deriver deterministic từ source event/evidence allowlist.
2. Ghi meaningful, stage và disposition events.
3. Join `BUYING_SIGNAL_COMMITTED`, `ORDER_PREVIEW_CREATED` và `PURCHASE_CONFIRMED`.
4. Hoàn thiện dashboard:

```text
AD_ENTRY
→ INITIAL_REPLY_ACCEPTED
→ REENGAGED
→ MEANINGFUL
→ QUALIFIED
→ BUYING_COMMITTED
→ PURCHASE_CONFIRMED
```

5. Breakdown theo ad ID, post ID, bounded ad title, sản phẩm, first meaningful label, first barrier, playbook/version và thời gian.
6. Cho Wave 2 baseline/opportunity analysis đọc acquisition dimension ở shadow; không đưa vào outbound strategy.

### 2.0A3 — Order attribution, đang bị chặn

Chỉ mở sau khi có POS acknowledgement contract:

```text
orderId
salesCycleId
status = CREATED
providerEventId/idempotencyKey
occurredAt
```

Khi đó mới thêm `ORDER_CREATED_ACK`, `CONVERTED` và các tỷ lệ `order_created/ad_entry`, `order_created/qualified`. Không suy diễn từ tag `Đã chốt đơn`, order preview hoặc `PURCHASE_CONFIRMED`.

## 11. Feature flags

```text
AD_ACQUISITION_ANALYTICS_MODE=OFF|SHADOW|LIVE
AD_ACQUISITION_PAGE_ALLOWLIST=1198992073286645
AD_ACQUISITION_DERIVATION_VERSION=ad-acquisition-v1
AD_ACQUISITION_WINDOW_HOURS=168
AD_ACQUISITION_WAVE2_INPUT_ENABLED=false
```

- `OFF`: không tạo session/event mới; runtime r26.1 giữ nguyên.
- `SHADOW`: persist và hiển thị nội bộ, không cho downstream behavior sử dụng.
- `LIVE`: analytics được xem là nguồn dashboard production; outbound vẫn không đổi.
- `AD_ACQUISITION_WAVE2_INPUT_ENABLED` chỉ cân nhắc sau 2.0A2 gate và vẫn chỉ cấp context cho shadow experiment trước.

Page allowlist là hard gate trước mọi mode.

## 12. Test plan

### Meta/contract

- Ads referral đủ trường, thiếu `ad_id`, thiếu `ads_context_data`, source khác case.
- Referral không phải Ads và không có referral.
- Trường quá dài/bad URL không làm lộ raw payload.
- Echo, retry cùng `mid`, message không có `mid`.

### Session/attribution

- Retry tạo đúng một session/event.
- Hai Ads entry khác nhau trong cùng conversation tạo hai session.
- Ads entry mới đóng attribution session trước.
- Hết 168 giờ không attribution nhầm follow-up.
- Thiếu referral luôn là `UNKNOWN`, không phải `ORGANIC`.
- Multiple inbound trong một debounce batch chọn session của Ads entry mới nhất.

### Initial reply/receipt

- Enqueue chưa được tính accepted.
- Chỉ sequence đầu tiên của initial reply plan được tính.
- Meta accepted, retry dispatcher và callback lặp không tạo duplicate.
- Failed/ambiguous không bị tính thành initial reply thành công.
- Delivery/read chỉ cập nhật khi provider message join chính xác.

### Lead qualification

- Emoji/ack mơ hồ chỉ re-engaged.
- Ack có state-confirmed target được nâng đúng.
- `BUYING_NEGATED`/`BUYING_RETRACTED` không nâng qualified/candidate.
- Pre-sale return-policy không thành post-sale.
- Tracking/exchange/return không mở checkout mới do Task 2.0A.
- Commitment và purchase confirmation join đúng sales cycle/session.
- Không có writer `ORDER_CREATED` trong 2.0A1/2.0A2.

### Security/admin

- Không raw sender ID, phone, address, checkout payload hoặc `photo_url`.
- Admin acquisition view không có `customer_hash` hoặc raw `event_metadata`.
- Page-scoped RBAC và Authentik boundary giữ nguyên.
- Migration `up → down → up` giữ owner/ACL; runtime r26.1 đọc được schema mới.

### Regression

- `pnpm install --frozen-lockfile`.
- `pnpm check`.
- Targeted contract, Meta webhook, database, worker, Admin API/Web tests.
- Replay r26.1 xác nhận reply plan, handoff, checkout, ownership và Outbox không đổi.
- Shadow/Simulation tiếp tục không có quyền ghi Meta Outbox.

## 13. Exit gate và rollout

### Hard gate

- Unauthorized outbound/handoff/ownership change: `0`.
- Duplicate acquisition session/event: `0`.
- Echo/retry bị tính re-engagement: `0`.
- `UNKNOWN` bị báo cáo thành Organic: `0`.
- `BUYING_NEGATED`/`RETRACTED` bị nâng qualified/candidate sai: `0`.
- Raw PII/sender ID/raw payload trong event hoặc Admin view: `0`.
- `ORDER_CREATED` không có POS acknowledgement: `0`.
- Migration phá backward compatibility hoặc ACL: `0`.

### Accuracy gate

- Initial reply eligible join chính xác: `100%` trên fixture/control set; ca mơ hồ phải thành `ATTRIBUTION_AMBIGUOUS`, không đoán.
- Qualification precision tối thiểu `95%` trên nhãn đủ support.
- Negation false-elevation phải bằng `0`; khi đánh giá semantic classifier vẫn giữ gate Wave 1: precision `≥98%`, recall `≥95%`, positive support `≥50`.
- Label thiếu support mang `INSUFFICIENT_SUPPORT`; không dùng tỷ lệ đẹp từ mẫu nhỏ để promotion.

### Shadow evidence

Analytics có thể chuyển `SHADOW → LIVE` sau:

```text
≥ 7 ngày
VÀ ≥ 200 META_ADS_CONFIRMED sessions
```

Lead qualification cần thêm:

```text
≥ 50 re-engaged sessions
≥ 30 meaningful sessions
representative control set đã review
```

Human test trên page live xác minh chức năng và causal join, nhưng không thay thế traffic evidence cho tỷ lệ kinh doanh. Nếu thiếu mẫu, giữ trạng thái `INSUFFICIENT_EVIDENCE`.

## 14. Dashboard và cách đọc

Dashboard phải hiển thị:

- Tổng Ads entry được Meta xác nhận.
- Tỷ lệ initial reply accepted/failed/ambiguous.
- Re-engagement và meaningful reply.
- Qualified, committed và purchase confirmed.
- No-response 1h/24h.
- First-touch và last-eligible-touch.
- Điểm rơi theo ad/post/product/first barrier.

Không hiển thị `ad_entry_to_order` trước 2.0A3. Thay bằng:

```text
purchase_confirmed / ad_entry
purchase_confirmed / qualified
```

và ghi rõ đây là “khách xác nhận mua”, chưa phải “đơn POS đã tạo”.

## 15. Rollback

1. Đặt `AD_ACQUISITION_ANALYTICS_MODE=OFF`.
2. Recreate tối thiểu các service đã thay đổi; không recreate toàn bộ compose.
3. Chuyển application về release r26.1 nếu cần.
4. Không xóa acquisition session/event đã ghi; schema additive có thể được giữ lại.
5. Chỉ rollback migration khi restore-test đã đạt và không còn binary mới dùng schema.
6. Không xóa Inbox, Meta Outbox, PostgreSQL, Redis, Qdrant hoặc audit.

## 16. Definition of Done

- Meta Ads referral được normalize và session hóa idempotent.
- Initial reply chỉ được ghi sau Meta accepted và có causal join.
- Re-engagement/meaningful/qualification không dùng tin Ads entry làm evidence mạnh.
- Stage lịch sử và disposition hiện tại tách riêng.
- `BUYING_NEGATED`/`RETRACTED` không tạo lead nóng giả.
- Funnel truy được đến `PURCHASE_CONFIRMED`.
- `ORDER_CREATED_ACK` vẫn bị chặn cho tới khi POS cung cấp source-of-truth.
- Admin view/dashboard không lộ PII hoặc raw metadata.
- Wave 2 không thay đổi outbound do Task 2.0A.
- Full check, migration restore-test, shadow evidence và rollback smoke đạt.
- Baseline/changelog/manifest chỉ cập nhật sau deploy thật, không cập nhật trong PR kế hoạch này.

## 17. Thông tin cần bổ sung sau này

Không cần thêm thông tin từ chủ dự án để bắt đầu 2.0A1 và 2.0A2. Trước 2.0A3 cần cung cấp hoặc chốt contract acknowledgement từ POS/order source-of-truth, gồm `orderId`, `salesCycleId`, trạng thái tạo đơn và idempotency key.
