# Đợt 0 — Kết luận tích hợp và quyết định kiến trúc

Ngày lập: 2026-07-13  
Phạm vi: đặc tả và kiểm toán, chưa viết app, chưa SSH, chưa bật/publish/cutover.

## 1. Trạng thái Đợt 0

Ba nhánh kiểm toán đã hoàn tất:

1. `01_legacy_flow_audit.md`: kiểm kê và đối chiếu P2.2/legacy.
2. `02_architecture_contracts.md`: kiến trúc mục tiêu, event/state/API contract draft.
3. `03_security_data_architecture.md`: threat model, dữ liệu, secret, retention và kiểm thử bảo mật.

Kết quả: **đã hoàn thành phần phân tích và contract draft; chưa đủ bằng chứng để freeze live-send contract**. Có thể chuẩn bị skeleton repo và provider fake sau khi người sở hữu duyệt các quyết định mặc định, nhưng không được kết nối gửi thật trước khi xử lý các blocker ở mục 6.

Lưu ý thực thi: hệ thống sub-agent hiện tại không cung cấp tham số chọn model khi spawn. Ba agent được giao reasoning cao và kế thừa model phiên hiện tại; không có bằng chứng kỹ thuật để xác nhận chúng đã chạy đúng tên model `GPT-5.6 SOL High`.

## 2. Sự thật đã xác minh từ workspace

- Bộ `lana_catalog_p2_2/00–09` đều có `active=false` trong file JSON.
- P2.2 không dùng Pancake để gửi reply. Nó gọi gateway nội bộ tại `GATEWAY_BASE_URL/webhook/gateway-facebook-send`.
- Pancake hiện được dùng để đọc conversation/messages, kiểm tra tag chặn và gắn tag `Nhân viên` hoặc `Vận Đơn` khi HANDOFF.
- Source của gateway nội bộ không có trong workspace, vì vậy chưa xác minh được implementation thực tế của Meta signature, Inbox, direct Meta Send API, timeout/retry và provider response.
- P2.2 chưa có durable processing Inbox hay durable Meta Outbox trong bộ JSON đã kiểm tra.
- Bot reply analytics hiện được ghi ở thời điểm AI quyết định, trước khi có bằng chứng Meta accepted.
- Chưa có serialization/lock bền vững theo từng conversation cho toàn bộ pipeline.
- Product và policy tool reference trong JSON còn `RESELECT_AFTER_IMPORT`; cần resolve ở runtime trước khi parity test.
- Có một legacy export ở root workspace ghi `active=true` và chứa Meta token hard-code. Không sao chép token; phải kiểm tra runtime và rotate token theo quy trình riêng trước cutover.

## 3. Quyết định kiến trúc được khóa cho MVP

### D-01 — Kiến trúc triển khai

Xây modular monolith trong một repo, gồm API process và worker process. Không tách microservice ở MVP. n8n tiếp tục ETL, ingestion, lịch chạy và cảnh báo không-realtime.

### D-02 — Ranh giới kênh

- Meta Webhook là ingress tin nhắn khách.
- Meta Send API là kênh duy nhất gửi reply khách hàng.
- Pancake chỉ read/reconcile conversation/tag và add tag HANDOFF.
- Không module hay tài liệu nào được gọi Pancake là message sender.

### D-03 — Ba durable side-effect contract riêng

1. `Webhook Inbox`: chống replay/duplicate và cho phép resume sau crash.
2. `Meta Outbox`: gửi reply trực tiếp Meta và quản lý trạng thái không chắc chắn.
3. `Pancake Tag Outbox`: đưa tag về desired state, retry/reconcile độc lập.

Không dùng chung bảng/state machine giữa Meta send và Pancake tag.

### D-04 — Hai loại ownership độc lập

- `routing_owner = N8N | APP`: hệ thống nào được quyền xử lý/gửi trong migration.
- `conversation_owner = BOT | HUMAN`: bot hay nhân viên đang sở hữu hội thoại.

Một conversation chỉ có đúng một `routing_owner`. `routing_owner=N8N` trong shadow mode; app được đánh giá/log nhưng không được tạo Meta Outbox gửi thật.

### D-05 — HANDOFF fail-closed

- Tag Pancake `Nhân viên` hoặc `Vận Đơn` luôn chặn bot độc lập với Redis.
- Không đọc/xác minh được tag cũng phải chặn bot.
- HUMAN lease mặc định 1 giờ không được tự vượt qua tag Pancake còn tồn tại.
- HANDOFF không gửi tin cho khách; chỉ ghi state và yêu cầu Pancake Tag Outbox.

### D-06 — Business facts

- POS/snapshot nghiệp vụ là nguồn giá, tồn, size và trạng thái phân loại.
- Google Sheets giữ mapping/cấu hình/snapshot có cấu trúc.
- Qdrant chỉ giữ dữ liệu tìm kiếm tương đối ổn định, không cấp quyền báo giá/tồn/ETA/khuyến mãi.
- AI chỉ trả proposal có cấu trúc; deterministic guard quyết định hành động và side effect.
- Fact thiếu, stale, ambiguous hoặc lỗi không được AI suy đoán.

### D-07 — Dữ liệu và retention

- PostgreSQL là durable source cho Inbox, Outbox, audit, state recovery và lịch sử chat pseudonymous.
- Redis dùng cho queue, lock, cache/state realtime, fast dedup và analytics stream.
- State hội thoại Redis và lịch sử phân tích Redis: tối đa **20 ngày kể từ hoạt động**.
- HUMAN lease: 1 giờ; order draft: 24 giờ; tag Pancake vẫn là chốt chặn độc lập.
- Lịch sử chat PostgreSQL đã loại PII trực tiếp: tối đa **6 tháng**.
- Audit không chứa chat/PII có thể giữ 12 tháng nếu chính sách doanh nghiệp phê duyệt.
- Redis không lưu binary ảnh; chỉ metadata/URL đã loại signed token nhạy cảm.

Quyết định này sửa điểm không nhất quán trong contract draft: TTL state Redis mục tiêu là 20 ngày, không giữ 45 ngày như P2.2 hiện tại.

### D-08 — Identity và idempotency

- Canonical conversation identity bắt buộc chứa `page_id` và customer identity pseudonymous.
- Durable Inbox có unique constraint trên `page_id + event_key`.
- `event_key` ưu tiên Meta `message.mid`; event không có `mid` dùng canonical hash có version và loại event.
- Redis fast guard dùng `SET NX EX`, nhưng PostgreSQL Inbox mới là durable guard.
- Mọi tool/action/outbox row có idempotency key và correlation/trace ID.

### D-09 — Meta Outbox

Trạng thái tối thiểu:

```text
PENDING -> SENDING -> SENT_ACCEPTED -> DELIVERED | READ
                    -> AMBIGUOUS
                    -> RETRYABLE | FAILED_PERMANENT

AMBIGUOUS -> SENT_ACCEPTED khi echo/provider evidence khớp
          -> RETRYABLE chỉ khi có bằng chứng chưa gửi
          -> MANUAL_REVIEW khi hết cửa sổ reconcile
```

- Chỉ `SENT_ACCEPTED` khi Meta trả response hợp lệ có provider `message_id`, hoặc echo/provider evidence đủ mạnh.
- Timeout sau khi request có thể đã rời app phải thành `AMBIGUOUS`; không retry mù.
- Internal idempotency giúp app không tạo cùng action hai lần nhưng không được tuyên bố Meta bảo đảm exactly-once nếu API không có contract đó.
- Event `reply_decided`, `send_requested`, `send_accepted`, `delivered`, `read`, `send_failed` phải tách riêng.

### D-10 — Privacy và secret

- `customer_hash = HMAC-SHA256(page_id + sender_id, analytics salt)`; không dùng hash trần.
- Raw request bytes chỉ dùng transient để verify signature trước parse/queue.
- Operational payload chứa PSID/raw content phải mã hóa và có retention ngắn; không đưa vào analytics/log/Telegram.
- Redaction đồng bộ trước analytics và DLP/quality gate bất đồng bộ trước tập dữ liệu phân tích.
- Token per page dùng versioned envelope encryption; master key nằm ngoài PostgreSQL/Git.
- Không cache plaintext token trong Redis; cache decrypted token trong memory process tối đa 5 phút nếu cần.
- Meta sender không được dùng Pancake/POS token; Pancake adapter không có quyền gửi customer message.

## 4. Mặc định kỹ thuật đề xuất, cần owner duyệt

Các giá trị sau là đề xuất để unblock Đợt 1, chưa phải dữ liệu production đã xác minh:

| Mục | Mặc định đề xuất |
|---|---|
| Raw encrypted Inbox retention | 24 giờ; incident maximum 72 giờ |
| Meta ambiguous echo window | 60 giây, sau đó manual review/HANDOFF; không blind resend |
| HUMAN -> BOT | Chỉ khi lease hết, không còn blocking tag và có customer message mới |
| Redis | Tách queue/state khỏi analytics/cache nếu ngân sách cho phép; nếu dùng chung phải `noeviction` và có memory guard |
| PostgreSQL recovery | PITR, RPO <= 15 phút, RTO <= 2 giờ |
| Redis recovery | AOF everysec; RPO <= 1 phút, RTO <= 30 phút; rebuild từ durable Inbox/Outbox |
| Message history | PostgreSQL partition theo tháng, drop/crypto-erase sau 6 tháng |
| App migration model | Giữ provider/model chatbot hiện tại để đạt parity; không đổi model cùng lúc đổi runtime |

## 5. Acceptance gate trước khi viết runtime có khả năng gửi thật

- Signature sai/thiếu bị từ chối trước parse/queue/persist business payload.
- Durable Inbox được commit trước khi ACK thành công cho event cần xử lý.
- Replay cùng `page_id + message_id` không tạo decision/send/tag thứ hai.
- Hai message cùng conversation được serialize và cập nhật state revision nguyên tử.
- `routing_owner=N8N` tuyệt đối không tạo Meta Outbox send trong shadow mode.
- Blocking Pancake tag hoặc tag status unverified tuyệt đối không tạo Meta Outbox.
- Meta timeout ambiguous tuyệt đối không blind retry.
- Bot history chỉ ghi `SENT_ACCEPTED` sau provider evidence; draft/decision không được tính như đã gửi.
- Giá/tồn/ETA/ship/khuyến mãi thiếu authority bị guard chặn.
- Redis/PostgreSQL analytics không chứa phone, email, CCCD, tên/địa chỉ trực tiếp hay secret.
- Redis state/history hết hạn trong 20 ngày; PostgreSQL chat hết hạn trong 6 tháng.
- Redis restart không làm mất durable Inbox/Outbox; pending work có thể rebuild.

## 6. Blocker phải xử lý trước Đợt 1 hoặc trước live-send

| ID | Blocker | Chặn | Owner cần cung cấp/xác minh |
|---|---|---|---|
| B-01 | Thiếu source/repo/export gateway hiện tại | Freeze ingress/send contract | Kỹ thuật: vị trí source hoặc quyền read-only audit gateway |
| B-02 | Chưa có runtime inventory VPS và workflow ID thật | Migration/cutover plan | Kỹ thuật: danh sách workflow active/inactive và gateway deployment |
| B-03 | Chưa biết Meta App/Page mapping và Graph API version | Signature, token registry, sandbox send | Chủ hệ thống Meta; không gửi secret trong Git/chat công khai |
| B-04 | Chưa có bằng chứng echo/app_id/message_id cho text và image | AMBIGUOUS reconciliation | Sandbox/test Page capture |
| B-05 | Chưa xác minh Pancake conversation ID và tag ID đủ mọi Page | Ownership/HANDOFF | Page registry/tag catalog export không chứa token |
| B-06 | Chưa chốt order/POS outcome feed và join key | Conversion analytics/A-B | Chủ POS/nghiệp vụ |
| B-07 | Chưa chốt operational PII retention/xóa | Data schema/DLP | Chủ dữ liệu/nghiệp vụ |
| B-08 | Chưa chọn KMS/Vault, PostgreSQL topology và Redis topology | Production security/backup | Chủ hạ tầng |
| B-09 | Tool references còn `RESELECT_AFTER_IMPORT` | Parity test | n8n runtime inventory/tool workflow IDs |
| B-10 | Legacy export có token hard-code | Security/cutover | Rotate/revoke và xác minh runtime; không thực hiện trong Đợt 0 |

B-01 đến B-05 chặn live-send. B-06 chặn đo conversion/A-B. B-07 đến B-10 chặn production approval. Skeleton repo chỉ được bắt đầu nếu không hard-code các quyết định chưa xác minh và mọi provider đều mặc định `send=false`.

## 7. Đầu vào cần người dùng cung cấp để đóng Đợt 0 hoàn toàn

1. Vị trí source/repo của gateway hoặc cho phép audit read-only deployment hiện tại.
2. Page được chọn làm sandbox/shadow đầu tiên.
3. Danh sách Meta App ID -> Page ID; secret/token cung cấp qua secret manager, không dán vào tài liệu.
4. Export mapping Page ID -> Pancake conversation convention -> tag IDs `Nhân viên`/`Vận Đơn`.
5. Endpoint/webhook POS cung cấp order outcome và khóa ghép conversation/customer/order.
6. Xác nhận năm mặc định ở mục 4 hoặc nêu giá trị thay thế.

## 8. Kết luận

Đợt 0 đã tạo đủ ba tài liệu nền và một bản quyết định tích hợp. Kiến trúc mục tiêu đã thống nhất về ranh giới Meta/Pancake, Inbox/Outbox, ownership, nguồn business facts, privacy và retention. Contract hiện ở trạng thái **provisional/frozen-for-scaffolding**, chưa phải **approved-for-live-send** vì gateway/runtime/provider evidence còn thiếu.
