# Đợt 1 — Báo cáo triển khai nền tảng

Ngày: 2026-07-13  
Trạng thái: hoàn tất code nền và kiểm thử local; chưa nối provider/production.

## Phạm vi đã hoàn thành

### Monorepo và contract

- pnpm workspace, TypeScript strict, build/test/typecheck chung.
- `@lana/contracts` định nghĩa routing owner, conversation owner, Inbox status, Meta Outbox status, Pancake Tag Outbox status và canonical inbound schema.
- Mặc định an toàn: `APP_SEND_ENABLED=false`, `GATEWAY_ROUTING_MODE=SHADOW`.

### API và Meta webhook boundary

- Fastify health/live và readiness.
- Meta verification challenge.
- Nhận raw JSON bytes, xác thực `X-Hub-Signature-256` bằng constant-time HMAC trước `JSON.parse`.
- Body limit, Page allow-list, schema validation.
- Chuẩn hóa event thành `InboundMessageV1`.
- Event thiếu `mid` dùng canonical versioned hash.
- Conversation ID dùng HMAC salt, không dùng SHA-256 trần.
- Router `SHADOW | N8N | APP`; Phase 1 luôn `customerSendEnabled=false`.
- Endpoint gateway gửi cũ trả HTTP 410 và không có provider client.
- Server mặc định dùng unavailable queue: readiness 503 và webhook 503 cho tới khi durable adapter được wiring.

### Durable messaging

- Webhook Inbox port và fake repository có unique `page_id + event_key`, lease, recovery và terminal state.
- Meta Outbox state machine có ordered send units, `AMBIGUOUS`, echo evidence gate, known-not-sent gate và manual review; không blind retry.
- Pancake Tag Outbox riêng và idempotent.
- Queue abstraction có deterministic BullMQ-compatible job ID.
- Redis conversation-lock port có fencing, renew và compare-and-release Lua.
- Worker Phase 1 dùng literal `sendEnabled: false`, không có Meta/Pancake adapter.

### PostgreSQL và retention

- Migration runner có checksum và transaction; rollback bị khóa mặc định.
- Durable schema: pages, secret versions, webhook Inbox, conversations, Meta Outbox, Pancake Tag Outbox, message identity, partitioned messages/events và append-only audit.
- Trang `PAUSED` có thể scaffold không secret; trang `ACTIVE` bị database chặn nếu thiếu Meta verify/send secret, Pancake read/tag secret hoặc tag ID.
- Recipient/payload ciphertext bắt buộc bundle nonce/auth-tag đầy đủ hoặc cùng NULL sau crypto-erasure.
- PostgreSQL chat retention 6 tháng; operational encrypted payload mặc định 24 giờ sau terminal state.
- Redis policy được tài liệu hóa: state/history 20 ngày, noeviction và AOF everysec.

### Secret layer

- AES-256-GCM envelope encryption.
- AAD bind environment/provider/page/secret type/version/row.
- Key-provider port cho KMS/Vault/HSM.
- Memory key provider chỉ dùng local/test.
- Test tamper ciphertext, auth tag, wrapped key, wrong AAD, rotation và revoke.

### Local deployment

- Docker Compose local chỉ gồm PostgreSQL và Redis.
- Chỉ bind `127.0.0.1`, không có secret thật, không publish app.
- Redis AOF everysec, `noeviction`, healthcheck và volume.

## Xác minh

Lệnh tích hợp đã chạy thành công:

```text
pnpm check
  -> typecheck toàn bộ workspace: PASS
  -> unit test: 31/31 PASS
  -> build toàn bộ workspace: PASS
```

Các nhóm test:

- Contracts: 3.
- Database migration static contracts: 2.
- Envelope encryption: 4.
- Durable messaging/lock/outbox/worker: 12.
- Meta signature/normalization: 5.
- Worker safety: 2.
- Fastify API: 3.

Secret scan không phát hiện token/credential thật trong mã Đợt 1. Không có URL Meta Send API hay Pancake API trong implementation runtime.

## Các sửa lỗi do main integration review

1. Đổi conversation pseudonym từ SHA-256 trần sang HMAC-SHA256 có salt.
2. Thống nhất biến môi trường `GATEWAY_ROUTING_MODE=SHADOW` và hỗ trợ đọc alias cũ.
3. Bắt buộc `ANALYTICS_HASH_SALT` trong readiness.
4. Cho phép Page PAUSED scaffold không secret nhưng chặn Page ACTIVE thiếu cấu hình live.
5. Bổ sung database checks cho recipient/payload encryption bundle.
6. Allow-list duy nhất build script `esbuild`; không cho dependency tùy ý chạy lifecycle script.

## Chưa được xác minh trong Đợt 1

- Chưa chạy migration trên PostgreSQL thật vì máy local không có Docker/PostgreSQL server.
- Chưa chạy integration test Redis/BullMQ thật; hiện có port, Lua contract và in-memory fake.
- API chưa wiring PostgreSQL Inbox/BullMQ adapter, nên readiness cố ý trả 503.
- Chưa có production KMS/Vault provider.
- Chưa audit source gateway hiện tại hoặc runtime VPS.
- Chưa có Meta sandbox evidence cho echo/app_id/message_id.
- Không có Meta Send client, Pancake client, POS/Qdrant business adapter hay AI runtime trong Đợt 1.

## Gate trước Đợt 2

Đợt 2 chỉ được nối business/AI trong chế độ replay/shadow sau khi:

1. Chạy migration và repository integration test trên PostgreSQL staging/local.
2. Wiring API -> durable Inbox -> queue -> send-disabled worker.
3. Chạy Redis lock/queue integration test có crash và lease expiry.
4. Chọn KMS/Vault implementation hoặc mock staging có boundary rõ.
5. Xác nhận Page sandbox và gateway/runtime inventory.

Không nội dung nào trong Đợt 1 cho phép gửi tin thật, bật workflow hoặc cutover.
