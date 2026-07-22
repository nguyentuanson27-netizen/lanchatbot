# Phase 0 — Audit luồng chatbot P2.2 hiện tại

Ngày audit: 2026-07-13  
Phạm vi: chỉ đọc các workflow JSON trong workspace; không SSH, không kiểm tra trạng thái VPS/n8n/Redis/PostgreSQL thực tế và không bật workflow.

## 1. Kết luận điều hành

- Bộ `lana_catalog_p2_2` gồm 10 workflow, 179 node và tất cả đều có `active=false` trong file JSON.
- Có một workflow legacy riêng ở root workspace, `AI Agent Facebook Lana - Pancake only optimized.json`, đang có `active=true` trong file export và chứa Meta page token hard-code. Đây là rủi ro bảo mật/cutover; token phải được xoay vòng và workflow này không được chạy song song với app mới.
- P2.2 **không gửi tin qua Pancake**. Nó gửi text/ảnh đến endpoint nội bộ `GATEWAY_BASE_URL/webhook/gateway-facebook-send`. Pancake chỉ được dùng để:
  1. đọc message/conversation;
  2. kiểm tra tag chặn bot;
  3. gắn tag `Nhân viên` hoặc `Vận Đơn` khi HANDOFF.
- Source code của gateway không có trong workspace. Vì vậy chưa thể chứng minh từ mã nguồn rằng gateway xác thực chữ ký Meta, dedup `message_id` và gửi trực tiếp qua Meta Send API. Đây là điều kiện chặn trước khi đóng contract Phase 0.
- P2.2 có dedup cho **log phân tích**, nhưng chưa thấy inbox chống xử lý webhook lặp ở chính workflow chatbot. Cũng chưa thấy Meta outbox/idempotency bảo đảm không gửi trùng. Hai chức năng này có thể nằm trong gateway, nhưng chưa có bằng chứng.
- Quyền sở hữu hội thoại được fail-closed tương đối tốt: bot chỉ trả lời khi Pancake xác minh hội thoại thành công, không có tag `Nhân viên`/`Vận Đơn`, và Redis state không phải `HUMAN`.
- Giá, tồn, ETA đã được tách khỏi Qdrant và lấy từ snapshot POS/Sheets/Redis. Đây là invariant quan trọng cần giữ nguyên khi chuyển sang app.
- Trạng thái hội thoại/order draft đã dùng Lua merge ở bước sau AI, nhưng toàn luồng chưa có lock tuần tự theo hội thoại. Hai job cùng khách vẫn có thể chạy AI và gửi câu trả lời chồng nhau.
- Log tin nhắn đã ẩn danh được giữ ở Redis 20 ngày và archive PostgreSQL 6 tháng. Tuy nhiên câu trả lời bot đang được ghi log **trước khi Meta xác nhận gửi thành công**, `message_id` bot là UUID nội bộ, và chưa ghép kết quả đơn hàng. Không thể coi stream hiện tại là bằng chứng delivery/conversion chính xác.
- Các tool workflow `tim_kiem_san_pham_qdrant` và `lana_policy_search` đang có `workflowId=RESELECT_AFTER_IMPORT`; nếu import mà chưa chọn lại workflow thì agent không gọi được tool.

## 2. Nguồn bằng chứng và giới hạn

### Nguồn chính

- `lana_catalog_p2_2/00_P2_2_Qdrant_Payload_Index_Setup.json`
- `lana_catalog_p2_2/01_P2_2_Versioned_Catalog_Ingestion.json`
- `lana_catalog_p2_2/02_P2_2_Versioned_POS_Snapshot_Redis.json`
- `lana_catalog_p2_2/03_P2_2_Product_Tool_Versioned_Observed.json`
- `lana_catalog_p2_2/04_P2_2_AI_Agent_State_Privacy_Rollback.json`
- `lana_catalog_p2_2/05_P2_2_Policy_Tool_Versioned_Observed.json`
- `lana_catalog_p2_2/06_P2_2_Release_Control_Rollback.json`
- `lana_catalog_p2_2/07_P2_2_Redis_Log_Retention_Maintenance.json`
- `lana_catalog_p2_2/08_P2_2_Telegram_Alert_Test.json`
- `lana_catalog_p2_2/09_P2_3_Chat_History_Postgres_6_Months.json`

### Workflow legacy được đối chiếu

- `AI Agent Facebook Lana - Pancake only optimized.json`
- `Subflow Pancake_tag - Lana.json`
- `lana_catalog_v2/04_AI_Agent_Facebook_Lana_Catalog_Facts_v2.json`
- `lana_catalog_p2_1/04_P2_1_AI_Agent_State_Privacy_Rollback.json`
- `Data_Ingestion_v2_Qdrant.json`
- `04 - POS Inventory To Google Sheets.json`

### Không có trong workspace

- Source/export của Meta gateway công khai nhận webhook và endpoint `gateway-facebook-send`.
- Cấu hình runtime trên VPS: container, reverse proxy, biến môi trường, Redis ACL, PostgreSQL, n8n credentials.
- Workflow `luu_thong_tin_khach_P0_atomic` mà P2.2 tham chiếu bằng ID `fovhbt2QuiCb5yjF`.
- Bản tool product/policy đã được import và gán ID thật; JSON hiện vẫn để `RESELECT_AFTER_IMPORT`.
- Bằng chứng end-to-end từ Meta: webhook signature, incoming `mid`, send response `message_id`, echo, delivery/read webhook.

Do các giới hạn trên, báo cáo phân biệt rõ `CONFIRMED` (có trong JSON) và `UNVERIFIED` (cần kiểm tra gateway/runtime).

## 3. Inventory workflow và mapping sang app mới

| Workflow hiện tại | Vai trò hiện tại | Module app/n8n mới | Quyết định |
|---|---|---|---|
| `00_P2_2_Qdrant_Payload_Index_Setup` | Tạo payload index `ma_sp`, `aliases`, `xml_group_id`, `shop_alias`, `active` | `catalog-admin` migration hoặc n8n maintenance | Giữ ngoài realtime app |
| `01_P2_2_Versioned_Catalog_Ingestion` | Sheets + XML + Vertex multimodal → Qdrant | n8n ETL, sau đó có thể tách thành `catalog-ingestion-worker` | Giữ ở n8n giai đoạn đầu |
| `02_P2_2_Versioned_POS_Snapshot_Redis` | POS + Sheets → snapshot giá/tồn/ETA trong Redis và Sheet | n8n ETL + `business-facts-store` | Giữ ETL ở n8n; app chỉ đọc contract canonical |
| `03_P2_2_Product_Tool_Versioned_Observed` | Exact/alias/text/image search + gắn facts Redis | `product-search` và `product-facts` | Chuyển sang package backend, test độc lập |
| `04_P2_2_AI_Agent_State_Privacy_Rollback` | Ingress nội bộ, buffering, ownership, AI, send, handoff, analytics | `webhook-api`, `conversation-worker`, `agent`, `policy-guard`, `meta-delivery`, `pancake-adapter`, `analytics` | Là trọng tâm cần chuyển khỏi n8n |
| `05_P2_2_Policy_Tool_Versioned_Observed` | Embedding + Qdrant policy search | `policy-search` | Chuyển sang backend; fail-closed |
| `06_P2_2_Release_Control_Rollback` | Active/previous release và rollback | `release-control` | Chuyển sang PostgreSQL/Redis control plane; giữ audit bất biến |
| `07_P2_2_Redis_Log_Retention_Maintenance` | Trim stream analytics/messages | `retention-worker` | Chuyển sang scheduled worker; n8n có thể tạm giữ |
| `08_P2_2_Telegram_Alert_Test` | Test cấu hình cảnh báo | `ops-cli`/healthcheck | Thay bằng healthcheck và test alert |
| `09_P2_3_Chat_History_Postgres_6_Months` | Archive Redis Stream → PostgreSQL | `history-archiver` | Chuyển sớm; PostgreSQL là kho phân tích chính |
| Legacy root active workflow | Chatbot đời cũ, direct Graph API và history text | Chỉ dùng làm parity reference | Không tái sử dụng secret/code gửi tin; loại bỏ sau cutover |

## 4. As-is sequence

### 4.1 Ingress realtime

```text
Meta webhook
  → [UNVERIFIED: gateway công khai ngoài workspace]
      - phải xác thực X-Hub-Signature-256 trên raw body
      - phải dedup page_id + message_id
      - forward kèm X-Internal-Key
  → n8n POST /webhook/messenger3-internal-p0
  → Code in JavaScript_phan_loai
      - kiểm tra AI_AGENT_INTERNAL_KEY
      - đọc entry[0].messaging[0]
      - xác định customer_id theo is_echo
      - HMAC(page_id:customer_id) bằng ANALYTICS_HASH_SALT
      - map page_id → page_name
  ├─→ P2.3 Log Incoming Message Redis 20d
  └─→ load conversation_state, context, profile
```

Webhook verify trong file P2.2 đang `disabled=true`; P2.2 vì vậy chỉ phù hợp làm endpoint nội bộ sau gateway. Node phân loại trả mảng rỗng khi internal key hoặc analytics salt thiếu/sai; hành vi này im lặng, không trả lỗi/metric rõ ràng.

### 4.2 Phân loại echo, buffering và ownership

```text
is_real_message?
  → is_echo=false?
      → kiểm tra bot_sleep
      → gom text/ảnh vào giohang:{sender_id}, TTL 30 giây
      → bocso:{sender_id}, TTL 10 giây
      → chờ và tổng hợp message burst
      → lưu link_an_toan:{sender_id}, TTL 30 giây
      → gọi Pancake GET messages + GET conversations
      → tìm conversation page_id_sender_id
      → đọc tags
      → strict ownership gate

is_echo=true
  → nếu app_id khác app bot legacy thì coi là HUMAN
  → set bot_sleep và conversation_state owner=HUMAN, TTL 1 giờ
  → không chạy bot
```

Ownership gate cho bot đi tiếp chỉ khi đồng thời:

1. Pancake tìm thấy đúng conversation;
2. không có tag chuẩn hóa `Nhân viên` hoặc `Vận Đơn`;
3. `conversation_state.owner != HUMAN`.

Nếu Pancake API lỗi, không tìm thấy conversation hoặc không xác minh được tag, luồng fail-closed, giữ HUMAN 1 giờ và gửi cảnh báo Telegram.

### 4.3 AI và business tools

```text
allow_bot=true
  → tính readiness/stage/objection/next-best-action deterministic
  → load lana:release:active
  → AI Agent (Gemini model do release manifest chọn)
      ├─ product tool
      │    exact code → alias → semantic text/image
      │    Qdrant stable catalog + Redis business facts
      ├─ policy tool
      │    Vertex embedding → Qdrant policy
      └─ customer profile tool
  → structured output parser
  → parse/validate enum/schema
  → product/attachment/business gate
  → verify customer profile updates against raw customer text
  → merge order draft bằng Lua
  → validate closing sequence
  → merge conversation state bằng Lua
  → write analytics/tool logs
```

Structured output gồm intent, stage, objection, product, requested variant, next action, reply, attachments, customer/order updates, handoff reason và state updates. Giá/tồn/ETA không được phép nằm trong order draft.

### 4.4 Reply và HANDOFF

```text
action=handoff hoặc post-sale hoặc invalid/error
  → không gửi tin cho khách
  → bot_sleep_{sender_id}=HANDOFF, TTL 1 giờ
  → Pancake POST add tag
      POST_SALE/... → Vận Đơn
      còn lại       → Nhân viên
  → cảnh báo Telegram nếu gắn tag lỗi

action=reply / ask_product_selection
  → ảnh: POST gateway-facebook-send
  → từng dòng text: POST gateway-facebook-send
  → [UNVERIFIED trong workspace] gateway gọi Meta Send API trực tiếp
```

Pancake **không nằm trên đường gửi reply**. Tên module mới phải là `Meta Delivery + Pancake Tag/Handoff Reconciliation`, không phải Pancake Delivery.

### 4.5 Lịch sử và phân tích

```text
Incoming Meta message/echo
  → redact PII
  → dedup analytics key 20 ngày
  → XADD analytics:messages:v1

AI decision có reply
  → tạo bot:<event_uuid>
  → XADD analytics:messages:v1 trước khi send

Mỗi giờ
  → XRANGE sau cursor
  → transaction insert PostgreSQL
  → COMMIT
  → cập nhật cursor Redis
  → xóa PostgreSQL > 6 tháng

Hằng ngày
  → trim Redis message stream theo 20 ngày + MAXLEN safety
```

Vấn đề: bot reply log hiện phản ánh `AI_AGENT_DECISION`, không phản ánh `Meta accepted/delivered`. Cần tách `reply_decided`, `send_requested`, `send_accepted`, `send_failed`, `delivered`, `read`.

## 5. Redis keys, TTL và mục đích

| Key/stream | TTL/retention mặc định | Mục đích | Nhận xét |
|---|---:|---|---|
| `giohang:{sender_id}` | 30 giây | Buffer burst text/ảnh | Tên gây nhầm là giỏ hàng; nên đổi `message_batch` |
| `bocso:{sender_id}` | 10 giây | Counter điều phối burst | Không phải lock hội thoại |
| `link_an_toan:{sender_id}` | 30 giây | URL ảnh đầu tiên cho product tool | Chứa raw sender ID |
| `lana:context:{sender_id}` | 600 giây | Product context gần nhất | Chứa raw sender ID và payload sản phẩm |
| `profile_{sender_id}` | Không TTL | PII operational profile | Cần policy retention/encryption/access audit riêng |
| `bot_sleep_{sender_id}` | 3.600 giây | Dừng bot/HANDOFF/HUMAN | Song song với owner trong conversation state |
| `conversation_state:{customer_hash}` | BOT: 3.888.000 giây (45 ngày); HUMAN: 3.600 giây | State có cấu trúc và ownership | Hai TTL khác nhau; sticky note cũ ghi 4 giờ nhưng code là 1 giờ |
| `order_draft:{customer_hash}` | 86.400 giây | Draft product/offer/color/size/qty | Không chứa giá/tồn/PII |
| `dedup:analytics:message:{page}:{mid}` | 1.728.000 giây (20 ngày) | Chống log trùng | Không chứng minh chống xử lý webhook lặp |
| `dedup:bot_echo:{page}:{text_hash}` | 600 giây | Tránh ghi echo bot lần hai | Text fingerprint có thể va chạm nghiệp vụ và không dùng Meta `mid` |
| `catalog:offer:{shop}:{product}` | mặc định 7.200 giây | Canonical price/stock/fulfillment facts | POS/Sheets/Redis là nguồn business facts |
| `catalog:shipping_eta` | mặc định 7.200 giây | Transit config | Đồng thời shipping data cũng được nhúng trong từng catalog snapshot |
| `lock:pos_snapshot:v2` | 1.200.000 ms (20 phút) | Single POS snapshot run | Token-safe release bằng Lua |
| `lock:ingest:lana_multimodal_data_v2` | 7.200.000 ms (2 giờ) | Single ingestion run | Tên lock hard-code collection v2, không theo active release |
| `lana:release:active` | Không TTL | Active manifest | Source cho prompt/catalog/policy/model version |
| `lana:release:previous` | Không TTL | Rollback target | Chỉ giữ một previous release |
| `lana:release:history` | Không TTL | Release history list | Không thấy trim/giới hạn |
| `analytics:messages:v1` | 20 ngày + MAXLEN 2.000.000 | Message history đã redact | MAXLEN có thể cắt sớm hơn 20 ngày khi volume tăng |
| `analytics:conversation_events:v2` | MAXLEN 500.000 | Stage/intent/action event | Không có time-based retention |
| `observability:tool_calls:v2` | MAXLEN 1.000.000 | Tool/AI latency và lỗi | Không có trace ID xuyên suốt toàn request |
| `observability:release_events:v2` | MAXLEN 10.000 | Promote/rollback audit | Redis không phải immutable audit store |
| `archive:messages:postgres:last_id` | Không TTL | Cursor archive | Cập nhật sau COMMIT là đúng |

## 6. Data sources và business rules

### Qdrant: chỉ dữ liệu tìm kiếm ổn định

- Ingestion lấy `product_registry` từ Google Sheets và XML từ `lanadesign.vn`.
- Point ID là UUID deterministic từ `normalized brand | MA_SP | normalized image URL`.
- Ba named vectors: `image_raw`, `image_cutout`, `product_text`; mỗi vector 1.408 chiều, model `multimodalembedding@001`.
- Payload chứa code, alias, tiêu đề, mô tả, link, ảnh, material/category/search descriptors, size/classification từ feed và version metadata.
- Không đưa giá, tồn, promotion, fulfillment hoặc ETA vào Qdrant.
- Exact search gom theo product và ưu tiên `EXACT_CODE` trước `ALIAS`.
- Semantic image dùng `image_cutout`; semantic text dùng `product_text`.
- Ngưỡng mặc định sau search: image score 0,72/gap 0,05; text score 0,58/gap 0,04. Kết quả không tự tin trả tối đa ba lựa chọn, không báo giá.

### POS + Google Sheets + Redis: nguồn nghiệp vụ

- Sheets tabs: `config_shop_id`, `product_registry`, `component_mapping`, `fulfillment_policy`, `shipping_eta`, output `inventory_current`.
- POS endpoint lấy variations theo shop. Token POS đến từ `PANCAKE_POS_SHOPS_JSON`, không lấy raw API key từ Sheet.
- Size hiện giới hạn `S/M/L/XL`.
- `SV`: set áo + chân váy; `SQ`: set áo + quần; `CB`: set CV và set quần; mã khác tra trực tiếp.
- Tồn set dùng `MIN` hai component theo cùng màu/size.
- Quantity ưu tiên `available_quantity`, fallback `remain_quantity`; có thể lọc warehouse theo cấu hình.
- Parent fulfillment policy áp dụng cho tất cả offer/color/size.
- ETA = prep days + transit days; chỉ tính khi region, dữ liệu và hiệu lực policy đầy đủ.
- Product tool chỉ phát hành canonical fields: `product_id`, `offer_type`, `list_price`, `sale_price`, `sizes`, `stock_status`, `stock_quantity`, `can_order`, `fulfillment_type`, `delivery_eta`, `eta_status`, `business_fact_status`.

### Policy

- Policy query dùng `gemini-embedding-001`, named vector `vector`, collection mặc định `lana_policies`.
- Top 3 được đưa vào context AI.
- Không thấy score threshold/citation ID bắt buộc; nội dung policy có thể thấp liên quan nhưng vẫn được dùng.
- Post-sale bị deterministic gate thành silent HANDOFF trước khi policy response được dùng.

## 7. Prompt, model và versioning

- Model chatbot thực tế trong P2.2 là Google Vertex model do `lana:release:active.model_name` chọn; mặc định `gemini-3.1-flash-lite`.
- Release mặc định: `p2-default`, prompt `p2.2.0-closing`, catalog `catalog-v2`, policy `policy-v1`.
- Release control hỗ trợ `STATUS`, `PROMOTE`, `EVALUATE`, `ROLLBACK`; promote kiểm tra tồn tại Qdrant collections rồi đổi active/previous.
- Prompt quy định structured JSON, stage, objection, next-best-action, business-tool-only facts, không tự tạo giá/tồn/khuyến mãi/freeship/phí ship/ETA.
- Có deterministic gates sau model để sửa/chặn output không hợp lệ.
- Manifest có `model_name/model_version`, nhưng n8n node dùng Vertex; không thể chuyển tùy ý sang model provider khác chỉ bằng tên.
- Yêu cầu dùng GPT-5.6 SOL High là yêu cầu dành cho sub-agent triển khai dự án, không phải trạng thái model chatbot P2.2 hiện tại.

## 8. Secrets và biến môi trường

### Nhóm bắt buộc đã tham chiếu

- Ingress/send: `AI_AGENT_INTERNAL_KEY`, `GATEWAY_BASE_URL`, `ANALYTICS_HASH_SALT`.
- Redis/data: `REDIS_URL`, `MESSAGE_HISTORY_REDIS_DAYS`, `MESSAGE_HISTORY_STREAM_MAXLEN`.
- Pancake: `PANCAKE_PAGE_TOKENS_JSON`, `PANCAKE_HANDOFF_TAG_IDS_JSON`, `PANCAKE_POS_SHOPS_JSON`, `PANCAKE_POS_BASE_URL`.
- Qdrant: `QDRANT_BASE_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION_INGEST_V2`.
- Sheets/catalog: `DATA_INGESTION_V2_SHEET_ID`, `LANA_PRODUCT_FEED_URL`, `CATALOG_BUILD_VERSION`.
- PostgreSQL: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, SSL options.
- Alerts: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`.

### n8n credentials được tham chiếu

- Google Vertex/Google API credential `la-clothing-vertex`.
- Google Sheets OAuth credential `nguyentuanson27`.
- Redis credential `Redis account lanadesign` ở một số Redis nodes; Code nodes lại dùng `REDIS_URL` trực tiếp.

### Rủi ro

- Legacy active export có Meta token hard-code trong URL. Không copy token này sang app; phải rotate và xóa khỏi lịch sử Git/artifact.
- JSON env map cho nhiều page/shop thuận tiện nhưng khó rotation, audit và phân quyền. App mới nên dùng page registry trong PostgreSQL, secret mã hóa hoặc secret manager, chỉ trả token trong bộ nhớ cho adapter cần dùng.
- Code nodes cần `NODE_FUNCTION_ALLOW_EXTERNAL=redis,pg`, mở rộng bề mặt thực thi của n8n.
- Raw sender ID vẫn xuất hiện trong operational keys và profile; analytics hash không đồng nghĩa toàn hệ thống đã pseudonymous.

## 9. Invariants bắt buộc giữ khi chuyển app

1. Reply customer đi qua **Meta Send API trực tiếp**; Pancake không dùng làm kênh gửi reply.
2. Pancake chỉ đọc conversation/tag và gắn `Nhân viên`/`Vận Đơn` cho HANDOFF.
3. HANDOFF hoàn toàn im lặng với khách.
4. Có tag `Nhân viên` hoặc `Vận Đơn` thì bot không được trả lời.
5. Không xác minh được tag Pancake thì fail-closed, không trả lời.
6. Human echo hoặc HANDOFF chuyển owner sang HUMAN; TTL owner tạm thời 1 giờ, nhưng tag Pancake tiếp tục là nguồn chặn độc lập.
7. Giá, tồn, ETA, freeship, phí ship và promotion không bao giờ do model tự suy đoán.
8. Qdrant chỉ chứa/search dữ liệu ổn định; business facts đến từ POS/Sheets/Redis service.
9. Exact product code trước alias; semantic uncertainty trả tối đa ba ảnh để khách chọn và không báo giá.
10. Parent fulfillment policy áp dụng cho mọi offer/variant; ETA chỉ là tổng số ngày đến khách.
11. Không thu PII giao hàng trước khi xác nhận product và size.
12. Order draft không chứa giá, tồn hoặc PII.
13. Message/customer analytics phải pseudonymous và redact PII trước khi lưu.
14. Redis giữ message analytics 20 ngày; PostgreSQL giữ 6 tháng.
15. Mọi release phải có prompt/catalog/policy/model version và rollback được.
16. Không để n8n và app cùng sở hữu quyền gửi trong một hội thoại.

## 10. Technical debt và rủi ro

### P0 — chặn migration an toàn

1. **Gateway source thiếu:** chưa audit được Meta signature, raw body, processing inbox, send API, retry và idempotency.
2. **Không có durable processing inbox trong P2.2:** dedup hiện tại chỉ chống ghi log trùng; webhook lặp vẫn có thể chạy AI/gửi lại nếu gateway không chặn.
3. **Không có Meta outbox có trạng thái:** n8n gọi HTTP trực tiếp; timeout có thể tạo trạng thái gửi mơ hồ. Không lưu request id/idempotency key/Meta response `message_id`.
4. **Bot log trước send:** `AI_AGENT_DECISION` được archive như message bot trước khi Meta accepted; làm sai dữ liệu phân tích.
5. **Không có per-conversation serialization:** buffering 30 giây không thay thế queue + lock; hai execution có thể chạy đồng thời.
6. **Legacy export active và token hard-code:** nguy cơ double reply và lộ secret.
7. **Tool IDs chưa gán:** product/policy tool dùng `RESELECT_AFTER_IMPORT`.

### P1 — sai lệch nghiệp vụ/vận hành

1. `P2 Save Conversation State` dùng `SET NX` cho bot ở bước đầu; state mới được merge về sau. Cách này khó hiểu và không tạo optimistic concurrency/version check.
2. Có hai nguồn biểu diễn owner: `bot_sleep_` và `conversation_state.owner`; chúng có thể lệch nhau.
3. Handoff tag retry POST tối đa ba lần nhưng không GET-check tag trước khi retry; cần chứng minh API add tag idempotent.
4. Sticky note P0 nói Redis pause 4 giờ trong khi code và yêu cầu hiện tại là 1 giờ.
5. Page ID/name map hard-code trong Code node; thêm page cần sửa workflow dù token đã externalized.
6. `is_echo=true` được log là HUMAN trừ khi text fingerprint trùng bot reply. Không dựa trên Meta sent `message_id`, nên có thể phân loại sai.
7. Bot response nhiều dòng được gửi thành nhiều HTTP request; giữa các request có thể lỗi một phần, làm câu trả lời thiếu/đảo trạng thái.
8. Không có event schema chung cho inbound, decision, tool call, outbound và Pancake tag.
9. Policy search không có minimum score và không ép nguồn/citation trong response contract.
10. Không thấy workflow ghép `order_id/outcome` từ POS vào message history; chưa đo được confirmed/delivered conversion.

### P2 — dữ liệu, bảo trì và chất lượng

1. `profile_{sender_id}` chứa PII không TTL; chưa có retention/deletion workflow.
2. `analytics:messages:v1` có MAXLEN 2 triệu; ở lưu lượng cao có thể giữ ngắn hơn 20 ngày.
3. Archive cursor là một key; chưa có consumer group, retry queue, lag metric hoặc cảnh báo trước khi trim.
4. PostgreSQL cleanup chỉ chạy nếu archive workflow chạy thành công; chưa có job độc lập/partitioning.
5. `conversation_id` analytics dùng `page:customer_hash`, Pancake dùng `page_sender`; cần canonical ID contract.
6. Incoming messages để trống `product_id`, `sales_stage`, `prompt_version`; phải enrich theo event/state hoặc join được bằng trace.
7. Không có session boundary; một customer có thể có nhiều lần mua trong 6 tháng nhưng cùng conversation ID.
8. Một số chuỗi tiếng Việt trong export bị mojibake; cần kiểm tra charset khi port prompt/template.
9. Product ingestion tìm registry bằng `Object.values(...).find` cho từng XML group; độ phức tạp O(n×m), chưa đáng ngại hiện tại nhưng không phù hợp catalog lớn.
10. Release history chỉ ở Redis list và previous chỉ một bản; rollback/audit dài hạn nên nằm PostgreSQL.

## 11. Failure paths hiện tại

| Failure | Hành vi hiện tại | Đánh giá/mục tiêu app |
|---|---|---|
| Internal key/salt thiếu | Trả `[]`, im lặng | Trả 401/500 phù hợp, metric và alert; không log secret |
| Pancake token thiếu/API lỗi/conversation không thấy | Fail-closed, HUMAN 1 giờ, Telegram | Giữ; thêm reconciliation job và reason code chuẩn |
| Có tag blocking | HUMAN 1 giờ, không reply | Giữ; tag vẫn chặn sau khi TTL hết |
| Product tool lỗi hoặc facts thiếu | Tool trả HANDOFF | Giữ fail-closed cho giá/tồn/ETA |
| Policy tool lỗi | HANDOFF + Telegram | Giữ; thêm threshold/citation |
| Structured output invalid | HANDOFF `INVALID_CLOSING_SCHEMA` | Giữ; lưu raw output đã scrub để debug có kiểm soát |
| Meta/gateway send lỗi | Telegram rồi dừng | Chưa đủ: cần durable outbox và trạng thái ambiguous |
| Pancake tag apply lỗi | Telegram, Redis vẫn HANDOFF | Bot vẫn im lặng là an toàn; cần retry/reconciliation lâu dài |
| POS config/shop lỗi | Snapshot row lỗi + Telegram | Giữ old snapshot đến TTL; app phải từ chối stale facts |
| Ingestion đang chạy | `RUN_LOCKED`/no-op | Hợp lý; cần lock key theo collection/version |
| Archive PostgreSQL lỗi | Rollback transaction, cursor không tiến | Hợp lý; cần alert lag và tránh Redis trim mất dữ liệu |

## 12. Open questions cần chốt trước khi freeze contract

### Gateway/Meta

1. Source/repo hoặc export chính xác của gateway nhận Meta webhook và `gateway-facebook-send` ở đâu?
2. Gateway có xác thực `X-Hub-Signature-256` trên **raw request body** trước khi parse JSON không?
3. Processing inbox có dùng chính xác `SET dedup:fb:{page_id}:{message_id} 1 NX EX 604800` không? Xử lý event không có `mid` thế nào?
4. Gateway gửi direct endpoint/version nào của Meta Graph API? Có dùng `messaging_type`, `recipient.id`, page token theo page registry không?
5. Khi Meta send timeout, gateway phân biệt `FAILED` và `AMBIGUOUS` thế nào? Có đối chiếu echo/Meta message ID trước retry không?
6. Gateway có trả và lưu Meta `recipient_id`, `message_id`, HTTP status/error code không?
7. Echo từ bot và echo từ nhân viên được phân biệt bằng `app_id`, `metadata`, sent message ID hay cách nào?

### Ownership/Pancake

8. Tag add của Pancake có idempotent khi POST cùng `tag_id` nhiều lần không?
9. Khi nhân viên xóa tag, bot được quyền tiếp quản ngay hay vẫn phải chờ HUMAN TTL 1 giờ?
10. Có page nào tên/tag khác chính tả `Nhân viên`, `Vận Đơn` không? Tag ID đầy đủ của mọi page đã có chưa?
11. Pancake conversation ID có luôn là `{page_id}_{facebook_user_id}` cho mọi page/event type không?

### Data/business

12. Source of truth cho order outcome (`CONFIRMED`, `DELIVERED`, `CANCELLED`, `RETURNED`) là POS endpoint/webhook nào và join bằng khóa gì?
13. `profile_{sender_id}` cần giữ bao lâu, cơ sở nghiệp vụ nào cần raw PII và quy trình xóa theo yêu cầu khách là gì?
14. 2 triệu stream entries tương đương bao nhiêu ngày theo volume thật? Có metric message/day và kích thước trung bình không?
15. Shipping regions canonical gồm những giá trị nào? Cách map tỉnh/thành khách nói sang region?
16. Khi POS snapshot stale hoặc Redis mất key, app luôn HANDOFF hay có reply không chứa business fact?

### Release/cutover

17. Workflow nào đang thực sự active trên VPS? Giá trị `active` trong export không đủ chứng minh runtime.
18. Một page thử nghiệm nào được chọn cho shadow/canary?
19. Router ownership được đặt ở gateway theo `conversation_id`, `page_id` hay feature flag nào?
20. Model chatbot mục tiêu khi port app là giữ Vertex/Gemini để parity hay đổi provider sau parity? Không nên đổi engine và runtime cùng một lần.

## 13. Acceptance checklist cho Phase 0

### Audit legacy

- [x] Inventory 10 workflow P2.2 và workflow legacy liên quan.
- [x] Xác nhận JSON P2.2 đều inactive.
- [x] Xác nhận reply path gọi internal gateway, không gọi Pancake send.
- [x] Xác nhận Pancake chỉ GET conversation/messages và POST tag trong P2.2.
- [x] Ghi nhận Redis keys/TTL, business sources, prompt/version và failure paths.
- [x] Ghi nhận workflow legacy export active có hard-coded token nhưng không sao chép secret vào báo cáo.
- [ ] Có source gateway để audit signature/inbox/outbox/Meta send.
- [ ] Có inventory runtime thật trên VPS và danh sách workflow ID active/inactive.
- [ ] Có export của `luu_thong_tin_khach_P0_atomic`.
- [ ] Product/policy tool workflow IDs đã được resolve và test.

### Điều kiện freeze contract trước khi code app

- [ ] Canonical inbound event schema đã chốt, gồm `event_id`, `page_id`, `message_id`, `sender_id`, `conversation_id`, timestamp, echo/app metadata và attachment metadata.
- [ ] Inbox key/idempotency và xử lý event không có `message_id` đã chốt.
- [ ] Canonical conversation owner state và precedence giữa Meta echo, Pancake tag, Redis TTL đã chốt.
- [ ] Meta outbox state machine đã chốt: `PENDING → SENDING → SENT_ACCEPTED → DELIVERED/READ`, có `AMBIGUOUS`.
- [ ] Pancake tag command/reconciliation contract đã chốt riêng, không dùng chung Meta outbox.
- [ ] Product facts và policy tool request/response schemas đã chốt.
- [ ] PII classes, redaction, profile retention, message retention và deletion procedure đã chốt.
- [ ] Event taxonomy cho decision/send/tag/tool/order outcome đã chốt.
- [ ] Shadow/canary ownership invariant đảm bảo mỗi conversation chỉ có một sender đã chốt.
- [ ] Golden dataset/replay acceptance metrics đã chốt.

## 14. Đề xuất contract boundary cho đợt tiếp theo

Không viết implementation trước khi giải quyết các câu hỏi P0. Khi đủ bằng chứng, nên freeze tối thiểu các boundary sau:

1. `MetaInboundEvent`: canonical hóa webhook nhưng vẫn lưu `raw_body_hash`, không lưu raw PII trong log.
2. `InboxRecord`: unique `(page_id, message_id)`, processing lease, attempts, final status.
3. `ConversationCommand`: một command tuần tự cho mỗi conversation.
4. `ConversationState`: state version + optimistic version, owner và owner reason thống nhất.
5. `ProductFacts`: canonical schema duy nhất từ POS/Sheets/Redis.
6. `AgentDecision`: structured output không chứa business fact tự sinh.
7. `MetaOutboxMessage`: payload hash, sequence, status, Meta IDs và ambiguous resolution.
8. `PancakeTagCommand`: desired tag, observed tags, reconciliation status.
9. `AnalyticsEvent`: pseudonymous, traceable từ inbound → decision → send → outcome.
10. `ReleaseManifest`: immutable record trong PostgreSQL, active pointer trong Redis và rollback đã kiểm thử.

Kết luận Phase 0: kiến trúc nghiệp vụ P2.2 đủ tốt để làm parity baseline, đặc biệt ở business-fact separation và silent HANDOFF. Phần cần tái thiết kế triệt để trong app là durable inbox/outbox, per-conversation serialization, delivery truth, secret/page registry và event/data contracts.
