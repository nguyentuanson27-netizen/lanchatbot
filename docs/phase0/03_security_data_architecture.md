# Đợt 0 — Kiến trúc bảo mật và dữ liệu

Trạng thái: **đặc tả thiết kế, chưa triển khai**  
Phạm vi kiểm kê: bộ workflow P2.2/P2.3 trong `lana_catalog_p2_2`  
Mục tiêu lưu trữ đã chốt: **Redis 20 ngày; PostgreSQL 6 tháng**

## 1. Quyết định kiến trúc bắt buộc

1. **Meta là kênh gửi và nhận tin nhắn.** App mới nhận webhook Meta, xác thực chữ ký Meta và gửi nội dung trực tiếp qua Meta Send API.
2. **Pancake không phải kênh gửi tin.** Pancake chỉ được dùng để đọc/đối chiếu hội thoại và gắn tag `Nhân viên` hoặc `Vận Đơn` phục vụ HANDOFF.
3. Redis là lớp realtime: queue, lock, trạng thái hội thoại, dedup nhanh và lịch sử phân tích 20 ngày. Redis không phải kho lịch sử dài hạn hay nguồn sự thật duy nhất.
4. PostgreSQL là kho bền vững cho inbox/outbox, audit và lịch sử chat đã loại bỏ PII trực tiếp. Lịch sử phân tích được giữ 6 tháng.
5. Nội dung chat sau redaction chỉ là **dữ liệu giả danh (pseudonymous)**, không được coi là ẩn danh tuyệt đối; câu chữ tự do vẫn có khả năng tái nhận diện. Vì vậy vẫn phải bảo vệ như dữ liệu mật.
6. Không token, app secret, customer/page access token, số điện thoại, địa chỉ, email, tên thật hoặc nội dung chat thô nào được ghi vào application log, trace, metric, Telegram hay audit detail.
7. AI không được nhận secret, không được gọi trực tiếp Meta/Pancake/POS, và không được tự quyết định giá, tồn, ETA, phí ship, khuyến mãi hoặc thao tác HANDOFF. AI chỉ trả structured proposal; policy/business layer quyết định hành động.

## 2. Hiện trạng P2.2 liên quan đến bảo mật và dữ liệu

Những điểm đang có và nên kế thừa:

- `customer_hash` là HMAC-SHA256 của `page_id:customer_id` với `ANALYTICS_HASH_SALT`.
- Trạng thái hội thoại được lưu tại `conversation_state:{customer_hash}`; order draft tách riêng và không chứa giá/tồn.
- `analytics:messages:v1` lưu tin CUSTOMER/BOT/HUMAN đã redaction; Redis trim theo 20 ngày và giới hạn an toàn 2 triệu entry.
- Workflow P2.3 chuyển Stream sang PostgreSQL và xóa bản ghi quá 6 tháng.
- Gửi text/ảnh đi qua gateway nội bộ; tag HANDOFF được thao tác qua Pancake.
- Tag `Nhân viên`/`Vận Đơn` và owner HUMAN chặn bot theo hướng fail-closed.

Khoảng trống app mới phải khắc phục:

- Endpoint chatbot nội bộ hiện dựa trên `X-Internal-Key`; app biên mới phải xác thực `X-Hub-Signature-256` trên **raw request bytes** trước khi parse JSON.
- Redaction hiện là regex một lớp, dễ bỏ sót địa chỉ/tên không có nhãn, số viết bằng chữ, dữ liệu trong ảnh và PII không chuẩn.
- Echo hiện có thể bị phân loại HUMAN dựa trên `is_echo` và fingerprint. Target phải ưu tiên đối chiếu Meta `message_id`, `app_id` và Meta Outbox; fingerprint chỉ là fallback ngắn hạn.
- Bot message hiện được ghi analytics từ quyết định AI trước khi chắc chắn Meta đã nhận. Target chỉ ghi trạng thái `SENT_ACCEPTED` khi Meta trả response hợp lệ có `message_id`; quyết định AI và kết quả gửi phải là hai event riêng.
- Workflow archive dùng cursor Redis. Target phải ghi PostgreSQL trực tiếp/durable và không được trim Redis nếu archive lag chưa an toàn.
- Token nhiều page hiện đi qua JSON env map. Target phải thay bằng secret registry có envelope encryption hoặc secret manager.
- Chưa có durable Webhook Inbox/Meta Outbox nên chưa xử lý đầy đủ replay, crash giữa các bước và timeout không rõ Meta đã gửi hay chưa.

## 3. Tài sản và ranh giới tin cậy

### 3.1 Tài sản cần bảo vệ

- Meta App Secret, Page Access Token, Pancake page token, POS/API keys, Qdrant key, database/Redis credentials.
- PSID/customer ID, phone, address, name, email, order details và nội dung hội thoại.
- Quyền gửi tin nhân danh page và quyền gắn/xóa tag HANDOFF.
- Trạng thái owner BOT/HUMAN, trạng thái đơn, price/stock/ETA facts và release/prompt version.
- Tính toàn vẹn của Webhook Inbox, Meta Outbox, Pancake Tag Outbox, audit log và model/tool events.

### 3.2 Ranh giới tin cậy

```text
Internet/Meta
  -> Edge webhook (raw signature verification)
  -> Durable Inbox / Queue
  -> Conversation worker + deterministic policy
  -> Meta Outbox -> Meta Send API

Conversation worker
  -> Business adapters (POS/Qdrant/policy)
  -> AI provider (không có secrets, chỉ context tối thiểu)
  -> Redis (realtime, 20 ngày)
  -> PostgreSQL (durable, 6 tháng cho chat)

Pancake adapter
  -> đọc hội thoại/tag
  -> Pancake Tag Outbox -> add tag idempotent
  X không gửi tin nhắn khách hàng
```

Mọi dữ liệu từ Meta, Pancake, XML, Google Sheets, Qdrant và khách hàng đều là **untrusted input**. Dữ liệu từ catalog cũng có thể chứa prompt injection và không được xem là system instruction.

## 4. Threat model và biện pháp kiểm soát

| Mối đe dọa | Kịch bản | Tác động | Kiểm soát bắt buộc |
|---|---|---|---|
| Meta webhook giả mạo | Kẻ tấn công POST payload giống Meta | Bot gửi nhầm, lộ dữ liệu, tốn chi phí | Kiểm tra `X-Hub-Signature-256=sha256=...` bằng HMAC App Secret trên raw bytes; constant-time compare; từ chối trước parse/queue; body-size limit; page allow-list |
| Replay webhook hợp lệ | Payload ký đúng bị gửi lại | Trả lời/gắn tag lặp | Durable Inbox có `UNIQUE(page_id, event_key)`; Redis dedup 20 ngày chỉ là lớp nhanh; event key ưu tiên Meta `mid`, fallback là canonical hash có version |
| Duplicate do Meta retry/app crash | Worker xử lý lại sau timeout/crash | Gửi trùng hoặc cập nhật state hai lần | Inbox state machine; action idempotency key; Meta Outbox durable; tất cả side effect phải có unique key |
| Tin đến sai thứ tự | Tin mới được xử lý trước tin cũ | State/CTA sai | Partition theo `page_id + customer_hash`; lưu `provider_occurred_at`, `received_at`; optimistic state version; event cũ không được ghi đè state mới; late event vẫn được archive |
| Hai tin đồng thời | Hai worker cùng sửa một cuộc chat | Lost update, hai câu trả lời | Per-conversation lease + fencing token; PostgreSQL state `version`; compare-and-swap; chỉ một owner có quyền tạo outbound action |
| Secret rò rỉ | Env dump, log request, exception, backup | Chiếm page/hệ thống | Envelope encryption/secret manager; redaction logger; không log headers/body; secrets không đưa vào n8n JSON/Git/Telegram; memory cache ngắn; rotation và revoke |
| Prompt injection từ khách/catalog | Khách yêu cầu bỏ policy hoặc catalog chứa instruction | AI bịa nghiệp vụ/gọi sai tool | Tách instruction/data; structured output schema; tool allow-list; deterministic policy gate; không cấp network/secret cho model; encode/limit retrieved content; test injection |
| PII bị lưu trong analytics/log | Regex bỏ sót phone/address/name | Vi phạm riêng tư, rò rỉ khách | Redaction hai lớp; DLP/quarantine; raw payload mã hóa và crypto-erase nhanh; analyst chỉ xem pseudonymous; sampling log không chứa content |
| Outbound ambiguity | Timeout sau khi request Meta đã tới server | Retry có thể gửi hai lần | Meta Outbox `AMBIGUOUS`; không retry mù; đối chiếu echo/Meta message id; alert/manual review; correlation nội bộ không được xem là idempotency do Meta bảo đảm |
| Meta token của một page bị chiếm | Kẻ xấu gửi tin dưới danh nghĩa page | Thiệt hại thương hiệu | Token per-page, blast-radius isolation; least privilege; health check; 401/403/volume anomaly alert; kill switch page; rotate/revoke ngay |
| Pancake token bị chiếm | Tag bị sửa hoặc hội thoại bị đọc | Bot/HUMAN ownership sai, lộ chat | Token Pancake tách khỏi Meta; scope tối thiểu; Pancake adapter chỉ read/tag; allow-list endpoint; audit tag operation; kill switch |
| HANDOFF lệch giữa Redis/Pancake | Redis mất state hoặc tag thay đổi ngoài app | Bot chen vào nhân viên | Pancake tag là tín hiệu chặn độc lập; reconciliation định kỳ và trước send ở trường hợp rủi ro; fail-closed khi không đọc được tag; HUMAN TTL 1 giờ không tự bỏ qua tag |
| Redis đầy/mất dữ liệu | Lịch sử/queue tăng nhanh hoặc eviction | Mất state, treo chatbot | `maxmemory-policy=noeviction` cho Redis nghiệp vụ; tách instance nếu có thể; MINID 20 ngày + MAXLEN safety; memory alerts 70/85/95%; PostgreSQL durable |
| SQL/NoSQL injection | Field khách được dùng trong query/key | Đọc/sửa dữ liệu trái phép | Parameterized SQL; schema validation; key builder không nhận raw free text; size/length limits; không dựng query động từ model |
| SSRF qua ảnh/URL | Khách/catalog đưa URL nội bộ | Truy cập mạng nội bộ | URL allow-list, HTTPS, DNS/IP re-check, chặn private/link-local/metadata IP, download proxy, size/type/time limit |
| Supply-chain/dependency | Package bị cài cắm | RCE/secret theft | Lockfile, dependency scanning, image pin digest, SBOM, non-root container, read-only FS, CI signed artifact |
| Lạm dụng dashboard/API | Tài khoản nội bộ xem/xuất lịch sử | Rò rỉ dữ liệu | SSO/MFA, RBAC, export disabled by default, audit immutable, IP/session controls, least privilege |
| Backup bị lộ | Snapshot chứa DB hoặc ciphertext | Rò rỉ lịch sử/secret | Mã hóa backup bằng key riêng, immutable storage, access audit, restore environment cô lập, crypto-erasure key theo partition |

## 5. Phân loại dữ liệu

| Lớp | Ví dụ | Nơi được phép lưu | Quy tắc |
|---|---|---|---|
| C0 — Công khai | Mã SP, mô tả công khai, URL ảnh, policy công khai | Qdrant/PostgreSQL/Redis cache | Kiểm tra toàn vẹn; vẫn coi là untrusted đối với prompt |
| C1 — Nội bộ | release id, prompt version, latency, error code, page alias | PostgreSQL/metrics/log | Không kèm PII/secret; page alias thay page token |
| C2 — Mật giả danh | `customer_hash`, chat đã redaction, intent, stage, outcome | Redis 20 ngày; PostgreSQL 6 tháng | Analyst được xem có giới hạn; không công khai/export tự do |
| C3 — Hạn chế/PII trực tiếp | PSID, phone, address, name, email, raw chat, order recipient | Chỉ vùng xử lý mã hóa ngắn hạn hoặc hệ thống POS/Pancake có thẩm quyền | Không đưa vào analytics, model log, trace, Telegram; crypto-erase nhanh; app không tạo kho CRM song song nếu không cần |
| C4 — Tối mật/secret | Meta App Secret, Meta Page Token, Pancake/POS/Qdrant/DB key | Secret manager hoặc ciphertext envelope | Không hiển thị lại; không ghi log/backup plaintext; rotate/revoke/audit |

`customer_hash = HMAC-SHA256(analytics_salt_version, page_id + ':' + PSID)`; không dùng SHA thuần. Lưu `hash_key_version`, không lưu PSID cùng bảng analytics. Đổi salt phải có kế hoạch dual-read có thời hạn hoặc chấp nhận đứt chuỗi phân tích; không giữ mapping ngược cho analyst.

## 6. PostgreSQL: schema tối thiểu

Schema dưới đây mô tả contract, không phải migration hoàn chỉnh. Mọi timestamp dùng UTC `timestamptz`; ID nội bộ dùng UUID/UUIDv7. Field enum phải được ràng buộc bằng enum/check constraint.

### 6.1 `pages`

- `page_id text primary key`
- `page_alias text not null`
- `status`: `ACTIVE | PAUSED | COMPROMISED | DISABLED`
- `meta_app_id text not null`
- `meta_send_secret_ref uuid not null`
- `pancake_read_tag_secret_ref uuid null`
- `handoff_employee_tag_id text null`
- `handoff_post_sale_tag_id text null`
- `created_at`, `updated_at`

Không lưu token plaintext. `secret_ref` trỏ tới secret manager/secret registry.

### 6.2 `webhook_inbox`

- `inbox_id uuid primary key`
- `provider = 'META'`
- `page_id text not null`
- `event_key text not null`
- `provider_message_id text null`
- `conversation_hash text not null`
- `provider_occurred_at`, `received_at`
- `signature_key_version text not null`
- `status`: `RECEIVED | QUEUED | PROCESSING | PROCESSED | REJECTED | DEAD`
- `payload_ciphertext bytea null`, `payload_key_ref text null`
- `attempt_count`, `last_error_code`, `processed_at`
- `unique(page_id, event_key)`

Chỉ request đã xác thực chữ ký mới được insert. Payload thô, nếu cần cho crash recovery, phải mã hóa ứng dụng và crypto-erase tối đa 24 giờ sau khi xử lý; backup không được làm kéo dài khả năng giải mã.

### 6.3 `conversations`

- `conversation_id uuid primary key`
- `page_id text not null`
- `customer_hash text not null`
- `hash_key_version text not null`
- `owner`: `BOT | HUMAN`
- `state_version bigint not null`
- `last_provider_occurred_at`, `last_received_at`, `last_message_id`
- `first_seen_at`, `updated_at`, `expires_at`
- `unique(page_id, customer_hash)`

Không lưu phone/name/address. Snapshot phục vụ recovery chỉ chứa state có cấu trúc không PII; full realtime state vẫn ở Redis.

### 6.4 `messages` — partition theo tháng

- `message_pk uuid`
- `page_id text not null`
- `conversation_id uuid not null`
- `customer_hash text not null`
- `provider_message_id text null`
- `outbox_id uuid null`
- `direction`: `INBOUND | OUTBOUND`
- `sender_type`: `CUSTOMER | BOT | HUMAN | SYSTEM`
- `message_type`: `TEXT | IMAGE | MIXED | EVENT`
- `text_redacted text not null default ''`
- `attachment_count integer not null default 0`
- `product_id`, `sales_stage`, `intent`, `outcome`
- `prompt_version`, `model_version`, `policy_version`, `catalog_version`
- `provider_occurred_at`, `received_at`, `created_at`
- uniqueness: inbound `unique(page_id, provider_message_id)` khi có `provider_message_id`; outbound `unique(outbox_id)`

Không lưu attachment binary hoặc URL có signed token. Chỉ lưu loại/count hoặc URL công khai đã chuẩn hóa nếu thực sự cần.

### 6.5 `conversation_events`

- `event_id uuid primary key`, `conversation_id`, `page_id`, `customer_hash`
- `event_type`, `intent`, `stage`, `action`, `handoff_reason`, `owner`
- `readiness_score`, `product_id`, `order_outcome`
- version fields và `occurred_at`

Không lưu prompt/response thô. Nếu cần QA mẫu, tạo dataset duyệt riêng, đã DLP và có TTL/approval.

### 6.6 `meta_outbox`

- `outbox_id uuid primary key`
- `idempotency_key text unique not null`
- `conversation_id`, `page_id`, `customer_hash`
- `recipient_ciphertext bytea`, `payload_ciphertext bytea`, `payload_key_ref text`
- `sequence_no integer`, `status`
- `attempt_count`, `lease_owner`, `lease_until`
- `meta_message_id text null`
- `request_started_at`, `accepted_at`, `delivered_at`, `read_at`
- `ambiguity_reason`, `last_error_code`, `next_attempt_at`, `created_at`, `updated_at`

Trạng thái:

```text
PENDING -> LEASED -> SENDING -> SENT_ACCEPTED -> DELIVERED -> READ
                         |             |
                         v             v
                     AMBIGUOUS       FAILED_PERMANENT

PENDING/LEASED -> RETRY_WAIT -> PENDING
```

Quy tắc:

- Chỉ `SENT_ACCEPTED` khi Meta Send API trả response thành công hợp lệ có `message_id`.
- `DELIVERED/READ` chỉ được cập nhật từ event delivery/read tương ứng, không suy luận từ HTTP 200.
- Timeout/mất kết nối sau khi request có thể đã rời app phải chuyển `AMBIGUOUS`, **không retry mù**.
- Đối chiếu `AMBIGUOUS` bằng echo webhook, `app_id`, Meta message ID và local outbox correlation. Nếu không xác minh được trong ngưỡng cấu hình, cảnh báo và chuyển review/HANDOFF.
- `idempotency_key` ngăn app tạo lại cùng action, nhưng không được tuyên bố Meta cung cấp exactly-once nếu API không có idempotency contract. Mục tiêu là **effectively-once trong app, ambiguity được kiểm soát**.
- Text và từng ảnh là các outbox item có `sequence_no`; item sau không gửi trước item trước trong cùng response group.

### 6.7 `pancake_tag_outbox`

- `operation_id uuid primary key`
- `idempotency_key text unique`
- `page_id`, `conversation_id`, `desired_tag`: `NHAN_VIEN | VAN_DON`
- `status`: `PENDING | APPLYING | APPLIED | RETRY_WAIT | FAILED | RECONCILE_REQUIRED`
- `pancake_tag_id`, `attempt_count`, `last_error_code`, timestamps

Trước khi add, đọc/đối chiếu tag hiện có nếu API cho phép. Add cùng tag phải idempotent. Bảng này tuyệt đối không chứa nội dung gửi khách.

### 6.8 `tool_calls`, `secret_versions`, `audit_log`

- `tool_calls`: tên tool allow-listed, success, latency, error code, data source/version; không query/result thô.
- `secret_versions`: chỉ metadata/ciphertext hoặc external secret ref, provider, page, version, trạng thái, created/activated/revoked timestamps; không plaintext.
- `audit_log`: actor/service, action, resource type/id giả danh, before/after metadata đã lọc, IP/session, timestamp, correlation id và hash-chain/append-only control.

## 7. Redis: vai trò, key và TTL

Prefix phải có environment, ví dụ `lana:prod:` để tránh dev/staging đụng production.

| Key/prefix | Vai trò | TTL/giới hạn |
|---|---|---|
| `state:conversation:{page_id}:{customer_hash}` | State bot có cấu trúc, không PII | Tối đa 20 ngày kể từ hoạt động; owner HUMAN có TTL điều khiển 1 giờ nhưng tag Pancake vẫn chặn độc lập |
| `state:order_draft:{page_id}:{customer_hash}` | SP/offer/màu/size/số lượng, không phone/address/price tự tạo | 24 giờ |
| `dedup:meta:{page_id}:{event_key}` | Fast replay guard | 20 ngày, `SET NX EX 1728000`; PostgreSQL Inbox là guard bền vững |
| `lock:conversation:{page_id}:{customer_hash}` | Lease xử lý đồng thời | 30–120 giây, token ngẫu nhiên, renew có giới hạn, release compare-token |
| `fence:conversation:{...}` | Fencing counter chống worker cũ ghi state | Không TTL hoặc đồng bộ version PostgreSQL |
| `stream:analytics:messages:v1` | Lịch sử chat đã redaction | Trim `MINID` 20 ngày + `MAXLEN ~ 2,000,000` safety; chỉ trim khi archive lag an toàn |
| `stream:analytics:conversation_events:v2` | Intent/stage/action/outcome | 20 ngày thay vì chỉ MAXLEN nếu yêu cầu đồng nhất retention |
| `stream:observability:*` | Event kỹ thuật không content | 20 ngày hoặc ngắn hơn theo volume |
| `map:meta_echo:{page_id}:{meta_message_id}` | Phân biệt BOT echo/HUMAN | 20 ngày; key theo provider message id |
| `fallback:echo_fp:{page_id}:{fingerprint}` | Fallback fingerprint ngắn | 10 phút; không dùng làm nguồn phân loại chính |
| BullMQ keys | Queue/lease/retry | completed/failed job tối đa 7–20 ngày; payload không được chứa secret/raw PII lâu dài |
| `cache:catalog:*`, `cache:policy:*` | Dữ liệu nghiệp vụ ổn định | Theo nguồn, thường 10 phút–2 giờ; versioned |

Redis production cho queue/state nên dùng `maxmemory-policy=noeviction`. Nếu hạ tầng cho phép, tách Redis queue/state khỏi Redis analytics/cache để cache/history không làm nghẽn xử lý realtime. Không cache plaintext token trong Redis; ưu tiên cache decrypted token trong memory tiến trình tối đa 5 phút, không dump.

## 8. Redaction và pseudonymization hai lớp

### Lớp 1 — Đồng bộ trước khi persist/log/model analytics

- Chuẩn hóa Unicode, khoảng trắng và các cách viết số tiếng Việt phổ biến.
- Phát hiện/replace phone, email, CCCD/CMND, bank/card, name có nhãn, address có nhãn và địa chỉ heuristic.
- Xóa query string/token khỏi URL; chỉ giữ host/path công khai cần thiết.
- Không OCR ảnh trong luồng realtime chỉ để analytics; lưu `attachment_count/type`, không binary.
- Cắt độ dài hợp lý nhưng phải redaction **trước** truncate để không làm vỡ pattern.
- Tạo `customer_hash` bằng HMAC và lưu `hash_key_version`.
- Logger thực hiện redaction lần nữa ở sink; cấm serialize toàn bộ request/error/config.

Nếu redactor lỗi hoặc không load được rule, hành vi là fail-closed cho analytics: chatbot vẫn có thể xử lý trong vùng transient có thẩm quyền, nhưng không ghi content vào Stream/PostgreSQL/log.

### Lớp 2 — Bất đồng bộ DLP/quality gate

- Worker DLP quét lại record mới bằng rule mở rộng và entity recognition.
- Record nghi chứa PII chuyển `quarantine`, thay content bằng `[REDACTION_PENDING]`; analyst không nhìn thấy bản nghi vấn.
- Chỉ nhóm Privacy/Security được xem quarantine qua giao diện kiểm soát; mặc định không hiển thị plaintext, không export.
- Theo dõi `redaction_miss_rate` trên bộ test tổng hợp và mẫu đã được phê duyệt; cập nhật rule có version/rollback.
- Dữ liệu lịch sử P2.2 cũ phải chạy migration redaction/DLP trước khi nhập PostgreSQL mới.

Phân tách mục đích:

- **Operational PII** để giao hàng thuộc POS/Pancake hoặc một PII service riêng có mã hóa và policy riêng.
- **Analytics history** không được chứa phone, address, name, email hay PSID.
- AI runtime chỉ nhận trường PII khi tác vụ được phép và thật sự cần; provider logging/training phải tắt theo cấu hình khả dụng. Không ghi lại prompt thô trong observability.

## 9. Retention và xóa dữ liệu

### Redis — 20 ngày

- State hội thoại và analytics history hết hạn tối đa 20 ngày.
- Dedup Meta giữ 20 ngày để chống replay trong cửa sổ vận hành.
- Order draft 24 giờ; owner HUMAN 1 giờ nhưng tag Pancake vẫn là chốt chặn.
- Job retention chạy ít nhất hằng ngày và có alert nếu trễ > 26 giờ.
- Archive lag phải được kiểm tra trước trim; nếu PostgreSQL chưa nhận đủ đến cutoff, tạm dừng trim history và cảnh báo dung lượng.

### PostgreSQL — 6 tháng

- `messages` và `conversation_events` partition theo tháng; purge hằng ngày theo `occurred_at < now() - interval '6 months'` hoặc drop partition khi đủ điều kiện.
- Tool-call analytics gắn với hội thoại giữ tối đa 6 tháng. Metrics tổng hợp không có customer hash/content có thể giữ lâu hơn theo chính sách riêng.
- Raw inbox payload/outbox payload và recipient ciphertext bị crypto-erase tối đa 24 giờ sau terminal status; metadata không PII có thể giữ để audit/dedup theo bảng tương ứng.
- `audit_log` không chứa chat/PII; đề xuất giữ 12 tháng. Nếu chính sách doanh nghiệp bắt buộc mọi dữ liệu chỉ 6 tháng, giảm audit xuống 6 tháng nhưng không bỏ audit.
- Xóa theo yêu cầu khách: xác định bằng HMAC trong service có thẩm quyền, xóa/ẩn danh messages/events/state; ghi audit không PII.

### Backup và retention thực tế

Backup có thể làm dữ liệu đã xóa tồn tại vật lý lâu hơn. Để đáp ứng giới hạn 6 tháng theo khả năng giải mã, dùng key mã hóa theo partition/tháng và hủy key khi partition hết hạn. Backup chứa ciphertext cũ sẽ không còn giải mã được. Không tái sử dụng partition key cho secret hoặc dữ liệu khác.

## 10. Secret nhiều page: envelope encryption và rotation

### 10.1 Mô hình

- KEK nằm trong cloud KMS/Vault/HSM, app không lưu KEK trong DB/Git/env file.
- Mỗi secret version có DEK ngẫu nhiên; plaintext mã hóa `AES-256-GCM`.
- Lưu `ciphertext`, `nonce`, `auth_tag`, `encrypted_dek`, `kek_version` và metadata.
- AAD bắt buộc gồm `environment | provider | page_id | secret_type | secret_version | row_id` để chống tráo ciphertext giữa page/môi trường.
- Service identity chỉ có quyền decrypt đúng secret type cần dùng. Meta sender không được decrypt Pancake/POS token; Pancake adapter không được decrypt Meta Page Token nếu tách process.
- Secret chỉ được decrypt just-in-time; memory cache tối đa 5 phút; không trả plaintext qua admin API.

Secret type tối thiểu:

- `META_APP_SECRET`: xác minh webhook, theo Meta App/version.
- `META_PAGE_ACCESS_TOKEN`: gửi tin Meta, riêng từng page.
- `PANCAKE_PAGE_TOKEN`: chỉ đọc hội thoại/tag, riêng từng page.
- `POS_SHOP_TOKEN`, `QDRANT_API_KEY`, AI provider credential, DB/Redis credential.

### 10.2 Rotation không gián đoạn

1. Security Admin tạo version mới qua secret UI/CLI bảo mật; client-side không log.
2. App mã hóa và lưu trạng thái `PENDING_VALIDATION`.
3. Health check không lộ dữ liệu: Meta page identity/permission, Pancake read/tag capability phù hợp.
4. Atomic chuyển active pointer sang version mới; worker mới dùng version mới.
5. Theo dõi 401/403 và canary page; version cũ giữ grace tối đa 24 giờ chỉ để rollback.
6. Revoke version cũ tại provider; đánh dấu `REVOKED`; xóa cache; audit đầy đủ.
7. Với Meta App Secret rotation, verifier hỗ trợ current + previous trong cửa sổ ngắn đã định nghĩa, sau đó bỏ previous.

### 10.3 Token bị nghi xâm phạm

- Đặt page `COMPROMISED/PAUSED`, chặn Meta Outbox mới cho page đó.
- Hủy token tại Meta/Pancake, tạo version mới, kiểm tra quyền và audit.
- Kiểm tra outbox/audit theo page và thời gian, cảnh báo chủ hệ thống.
- Không đưa token hoặc bốn ký tự đầu/cuối token vào alert; chỉ dùng `secret_version_id`.

## 11. RBAC và audit

| Vai trò | Quyền chính | Không được phép |
|---|---|---|
| `Owner` | Bật/tắt page, approve release/cutover, xem dashboard tổng hợp | Xem plaintext secret/PII |
| `SecurityAdmin` | Tạo/rotate/revoke secret, quản lý role, xử lý incident | Sửa nội dung chat/metric kinh doanh |
| `Operator` | Xem queue/error không PII, retry safe item, pause page, HANDOFF | Xem secret, export lịch sử, retry `AMBIGUOUS` mù |
| `Analyst` | Query dataset pseudonymous/aggregate 6 tháng | Xem PSID/raw PII/secret, gửi tin/gắn tag |
| `Reviewer` | Xem mẫu đã redaction/quarantine theo approval | Secret và thao tác production |
| `Service` | Quyền máy tối thiểu theo adapter | Login tương tác, quyền chéo provider |

Yêu cầu:

- SSO + MFA cho người dùng; session ngắn cho tác vụ nhạy cảm.
- Separation of duties: người nhập secret không tự approve cutover production nếu có thể.
- Break-glass có MFA, reason, time limit và alert ngay.
- Audit append-only cho login, secret lifecycle, page enable/disable, release, replay/retry, export, retention, data deletion, HANDOFF/tag và RBAC change.
- Audit detail chỉ chứa resource ID giả danh, error code và version; không request/response body, token hoặc PII.

## 12. Backup, restore, RPO/RTO

### PostgreSQL

- PITR với WAL liên tục; base backup hằng ngày; backup mã hóa bằng key khác secret envelope key.
- Mục tiêu ban đầu: **RPO <= 15 phút, RTO <= 2 giờ**.
- Backup immutable tối thiểu 7 ngày; tổng backup retention đề xuất 35 ngày, nhưng chat partition key phải crypto-erase ở mốc 6 tháng.
- Restore test hằng quý vào network cô lập, bằng dữ liệu tổng hợp hoặc masked; kiểm tra row count, constraints, inbox/outbox uniqueness và khả năng đọc partition còn hạn.

### Redis

- Redis không là nguồn lịch sử chính. Queue/state dùng AOF `everysec` và replica nếu có điều kiện.
- Mục tiêu: **RPO <= 1 phút cho queue/state, RTO <= 30 phút**; app phục hồi pending work từ PostgreSQL Inbox/Outbox.
- Không backup analytics Stream vượt retention; không đưa decrypted secrets vào RDB/AOF.

### Runbook restore

1. Pause nhận/gửi theo page hoặc toàn hệ thống; vẫn ACK Meta chỉ khi đã durable inbox theo thiết kế.
2. Restore PostgreSQL tới điểm nhất quán; kiểm tra outbox `SENDING/AMBIGUOUS` trước khi mở sender.
3. Khởi tạo Redis sạch; rebuild state/cache, requeue Inbox/Outbox chưa terminal bằng idempotency key.
4. Reconcile Meta echo và Pancake tag; không tự retry ambiguous outbound.
5. Canary một page, theo dõi, rồi mở dần; audit toàn bộ thao tác.

## 13. Observability và cảnh báo

Metric/log/trace chỉ dùng `page_alias/page_id`, correlation ID, outbox/inbox UUID, customer hash rút gọn khi thật sự cần; không content/PSID/token/PII.

Cảnh báo Telegram/Pager:

- Invalid Meta signature > 5/phút/page hoặc tăng đột biến; replay/duplicate ratio bất thường.
- Inbox lag > 60 giây, queue backlog vượt ngưỡng, dead-letter > 0.
- Per-conversation lock timeout/race/CAS conflict tăng cao.
- Meta Outbox `AMBIGUOUS > 0` cảnh báo tức thì; `FAILED_PERMANENT > 0`; send error > 1%; p95 send latency vượt SLO.
- Meta/Pancake 401/403: pause adapter/page và cảnh báo mức nghi token lỗi/xâm phạm.
- Sai sender classification BOT/HUMAN; bot attempt khi Pancake có tag chặn phải bằng 0.
- Pancake tag apply/reconcile thất bại; HUMAN owner giữ > 1 giờ nhưng tag vẫn còn cần báo nhân viên, không tự cho bot trả lời.
- Redis memory 70% warning, 85% critical, 95% emergency; eviction phải bằng 0; retention job trễ > 26 giờ.
- PostgreSQL archive/direct-write lag > 5 phút; retention/DLP job trễ; connection exhaustion; disk 70/85/95%.
- DLP quarantine tăng bất thường hoặc redaction rule error; PII detector canary xuất hiện trong log là critical incident.
- Backup/PITR stale > 24 giờ; restore test quá hạn; audit hash-chain gap.
- Prompt/tool policy violation, model structured-output invalid hoặc AI cố gọi action ngoài allow-list.

Telegram alert chỉ ghi page alias, error code, count, execution/correlation ID và thời gian; không conversation text, phone/address/name, token hoặc raw provider response.

## 14. Security acceptance tests

Tất cả test dưới đây phải chạy ở CI/integration và đạt trước shadow mode. Test production chỉ dùng page/test user được phép.

### Webhook/Inbox

1. Payload đúng nhưng thiếu/sai `X-Hub-Signature-256` bị trả 401/403, không tạo Inbox/Redis job/log body.
2. Signature được tính trên raw bytes; thay một byte/encoding làm verification thất bại.
3. Cùng `page_id + mid` gửi 100 lần chỉ tạo một Inbox và tối đa một conversation action.
4. Hai event cùng customer đến đồng thời không lost update; `state_version` tăng tuần tự.
5. Event cũ đến muộn được archive nhưng không ghi đè product/stage mới hơn.
6. Body quá kích thước, schema sai, page ngoài allow-list bị chặn trước worker.

### Meta Outbox

7. Crash sau insert Outbox nhưng trước gửi: worker khác resume và chỉ gửi một action.
8. Meta trả success có `message_id`: Outbox thành `SENT_ACCEPTED`, message outbound liên kết đúng `outbox_id`.
9. Meta HTTP 200 nhưng thiếu/malformed `message_id`: không đánh dấu accepted; chuyển failure/ambiguous theo policy.
10. Timeout sau khi request đã được ghi ra socket: chuyển `AMBIGUOUS`, không auto retry.
11. Echo webhook khớp `meta_message_id/app_id` reconcile `AMBIGUOUS` thành accepted và phân loại BOT.
12. Echo không khớp Outbox/app bot được phân loại HUMAN; fingerprint giống bot không được phép ghi đè bằng chứng provider mạnh hơn.
13. Text + nhiều ảnh giữ đúng `sequence_no`; item sau không vượt item trước.
14. Meta Outbox gọi trực tiếp Meta Send API; test network allow-list chứng minh không có endpoint Pancake trong sender.

### Pancake/HANDOFF

15. Pancake adapter chỉ cho phép endpoint đọc hội thoại/tag và add/check tag; mọi send-message endpoint bị deny.
16. Add tag `Nhân viên`/`Vận Đơn` lặp lại không tạo side effect khác; operation idempotent và được audit.
17. Có tag chặn hoặc không verify được tag thì bot fail-closed, Meta Outbox không được tạo.
18. Redis mất owner HUMAN nhưng Pancake còn tag chặn: bot vẫn không trả lời.

### Privacy/logging

19. Bộ test gồm phone có `+84`, dấu cách/dấu chấm; email; CCCD; tên; địa chỉ không dấu/có dấu: PostgreSQL/Redis analytics không còn PII trực tiếp.
20. PII không chuẩn bị lớp 1 bỏ sót phải bị DLP lớp 2 quarantine trước khi Analyst đọc.
21. Attachment có signed URL/token không được lưu; binary không xuất hiện trong PostgreSQL/Redis history/log.
22. Quét toàn bộ log/trace/Telegram test không tìm thấy token, App Secret, authorization header, PSID, phone, address, email hoặc raw chat.
23. AI prompt/tool log không chứa PII/secret; model không thể truy cập Meta/Pancake credential hay arbitrary URL.
24. Analyst không đọc được secret/PSID/quarantine; Operator không export chat; SecurityAdmin không xem plaintext token.

### Secret/incident

25. Ciphertext bị đổi `page_id`/AAD không giải mã được; auth tag sai bị fail-closed.
26. Rotate token atomic: in-flight job hoàn tất có kiểm soát, job mới dùng active version; old version bị revoke và cache bị xóa.
27. Meta 401/403 lặp lại tự pause page theo policy, không in token/provider body ra alert.
28. Compromised page kill switch ngăn Meta Outbox mới nhưng vẫn cho phép audit/incident handling.

### Retention/recovery

29. Clock-controlled test chứng minh Redis state/history hết hạn ở 20 ngày, order draft 24 giờ, HUMAN TTL 1 giờ; tag Pancake vẫn chặn sau TTL.
30. PostgreSQL record quá 6 tháng bị purge/drop partition; partition key bị hủy khiến backup ciphertext cũ không giải mã được.
31. Khi archive/DLP lag, Redis trim history tạm dừng và phát alert thay vì làm mất bản ghi chưa bền vững.
32. Restore drill phục hồi Inbox/Outbox; `SENDING/AMBIGUOUS` không bị retry mù; uniqueness constraint vẫn ngăn duplicate.
33. Redis restart không làm mất durable Inbox/Outbox; state/cache có thể rebuild trong RTO.

## 15. Tiêu chí nghiệm thu kiến trúc bảo mật Đợt 0

Đợt 0 chỉ được coi là khóa contract khi:

- Contract chung phân biệt rõ `Webhook Inbox`, `Meta Outbox` và `Pancake Tag Outbox`.
- Không tài liệu/code nào mô tả gửi tin khách qua Pancake.
- Dữ liệu và status enum thống nhất với event/state contract của nhóm kiến trúc.
- Có owner rõ cho page, secret, retention, DLP, incident và restore runbook.
- Quyết định nơi đặt KMS/Vault, PostgreSQL và Redis production được ghi ADR trước khi code.
- Các acceptance test ở mục 14 được chuyển thành test plan có người chịu trách nhiệm.
- Chưa bật/publish/cutover workflow hoặc app nào trong Đợt 0.

## 16. Các quyết định còn phải chốt trước Đợt 1

1. KMS/Vault cụ thể và service identity cho từng môi trường.
2. PostgreSQL managed hay self-hosted; phương án PITR/object storage.
3. Một Redis hay tách `queue/state` và `analytics/cache`.
4. Meta delivery/read/echo event nào khả dụng trên từng page/app và cơ chế reconcile `AMBIGUOUS` đã kiểm thử thực tế.
5. Chính sách operational PII cho việc lên đơn: giữ hoàn toàn ở Pancake/POS hay cần PII service riêng. Không được mặc định đưa vào analytics database.
6. Ngưỡng SLO/alert chính thức theo lưu lượng 1.000 khách/ngày và ngân sách hạ tầng.
7. Backup retention và cơ chế crypto-erasure theo partition để bảo đảm giới hạn 6 tháng theo khả năng giải mã.

