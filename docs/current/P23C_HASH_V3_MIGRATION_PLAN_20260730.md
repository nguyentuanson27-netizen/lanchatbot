# P2.3C Hash v3 — tách hash và migration không tái tạo vector

Trạng thái: `DEPLOYED_LIVE_MIGRATION_COMPLETE`

Ngày: `2026-07-30`

Phạm vi: app-native `P2.3C Qdrant Publisher`.

Không thay đổi realtime agent, Meta outbound, page allowlist, POS, P2.3B hoặc ownership n8n.

## Vấn đề đã xác minh

P2.3C hiện dùng một `content_hash` cho cả input embedding, payload Qdrant và provenance ảnh. Khi `image_content_sha256` được bổ sung vào payload, hash tổng thay đổi dù mã sản phẩm, URL và vector vẫn hợp lệ.

Đối chiếu production trước thay đổi:

- `956` job được dựng từ Sheet/XML.
- `917` point đã tồn tại trong Qdrant.
- `39` point chưa tồn tại.
- `312` point có `content_hash` khớp.
- `605` point có `content_hash` không khớp.
- `559` point có khác biệt ở `image_content_sha256`; số này có thể giao với thay đổi catalog khác.
- `45` point có canonical payload giống nhau nhưng `content_hash` lịch sử stale.

Không được mặc định toàn bộ `559` point chỉ đổi SHA. Dry-run Hash v3 phải phân loại lại từng point dựa trên input embedding thực tế.

## Hợp đồng Hash v3

Qdrant payload có ba hash độc lập:

- `embedding_hash`: ảnh hoặc SHA đáng tin cậy, contextual text thực gửi Vertex, model, dimension, preprocessing version và cutout pipeline version.
- `payload_hash`: payload phục vụ filter, hiển thị và rerank.
- `provenance_hash`: SHA, URL, trạng thái duyệt/xác minh và nguồn metadata.

Các trường schema:

```text
hash_schema_version=p23c-hash-v3
embedding_hash_schema=lana-qdrant-embedding-v1
payload_hash_schema=lana-qdrant-payload-v1
provenance_hash_schema=lana-qdrant-provenance-v1
```

`content_hash` v2 được giữ trong giai đoạn chuyển tiếp để worker cũ có thể rollback mà không tạo backlog giả.

## Chuẩn hóa

- Chuỗi dùng Unicode NFC, trim và gom khoảng trắng.
- URL bỏ fragment/tracking, chuẩn hóa scheme/host và sort query.
- Object sort key.
- Mảng không có ý nghĩa thứ tự được loại trùng và sort.
- Contextual text Hash v3 dùng chính chuỗi canonical được gửi sang Vertex, sau đó cắt tối đa `900` byte UTF-8.

## Action classifier

| Action | Ý nghĩa |
|---|---|
| `NOOP` | Không gọi ảnh, RemBG, Vertex hoặc Qdrant write |
| `PAYLOAD_ONLY` | Qdrant set-payload; không chạm vector |
| `FULL_EMBED` | Tải ảnh, cutout, tạo ba vector và upsert |
| `DELETE` | Xóa point đã bị vô hiệu hóa |

### Quy tắc SHA

| Trạng thái | Action |
|---|---|
| SHA rỗng → có SHA, URL và input embedding khác giữ nguyên | `PAYLOAD_ONLY / SHA_BASELINE` |
| SHA cũ = SHA mới | Không embedding vì ảnh |
| SHA cũ khác SHA mới | `FULL_EMBED / IMAGE_CONTENT_CHANGED` |
| URL đổi, SHA đáng tin cậy giống nhau | `PAYLOAD_ONLY / URL_CHANGED_SAME_CONTENT` |
| URL đổi, không có SHA đáng tin cậy | `FULL_EMBED / URL_CHANGED_UNVERIFIED` |

SHA chỉ được dùng làm bằng chứng giữ vector khi hợp lệ và `metadata_verified=true`.

Nếu URL đổi làm point ID dẫn xuất thay đổi nhưng `brand + MA_SP + SHA` khớp đúng một point cũ, worker tái sử dụng point ID cũ và ghi lại ID đó về Sheet. Trường hợp không duy nhất không được tự chọn point cũ.

## Phân loại field

Các field đang đi vào contextual text và có thể đổi `embedding_hash`:

- `title`, `category`, `description`, `material`;
- `style_primary`, `style_secondary`;
- visual colors/materials;
- image type/intents/angle/detail/parts visible.

Các field chỉ đổi payload theo input hiện tại:

- `aliases`, `size_options`, `product_link`;
- `image_sort_order`, `image_role`;
- các metadata filter/hiển thị không nằm trong contextual text.

Không thay đổi nội dung semantic embedding ngoài việc canonical hóa thứ tự mảng trong migration này.

## Batch và telemetry

Hai hạn mức độc lập:

```text
INGEST_POINT_BATCH_SIZE=50
P23C_MAX_PAYLOAD_UPDATES_PER_RUN=500
```

`FULL_EMBED` được chọn trước `PAYLOAD_ONLY`, nên point mới không bị backlog migration hash chặn.

Telemetry:

- `noop_count`
- `payload_only_count`
- `full_embed_count`
- `delete_count`
- reason counts như `SHA_BASELINE`, `LEGACY_CONTENT_HASH_STALE`, `EMBEDDING_TEXT_CHANGED`

Không log URL ảnh, Base64, nội dung ảnh, secret hoặc PII.

## Feature flags

```text
P23C_HASH_V3_MODE=OFF|DRY_RUN|LIVE
P23C_PAYLOAD_ONLY_ENABLED=true|false
P23C_LEGACY_HASH_MIGRATION_ENABLED=true|false
P23C_MAX_PAYLOAD_UPDATES_PER_RUN=500
P23C_IMAGE_PREPROCESS_VERSION=ffmpeg-max-width-800-v1
P23C_CUTOUT_PIPELINE_VERSION=rembg-u2netp-v1
```

Mặc định trong code:

- `P23C_HASH_V3_MODE=OFF`
- payload-only và legacy migration không tự bật.

Vì vậy build/deploy code không tự ghi Hash v3 nếu chưa cấu hình rõ ràng.

## Test gates

- SHA baseline không gọi tải ảnh, RemBG hoặc Vertex.
- SHA thay đổi thật phải `FULL_EMBED`.
- URL đổi/SHA giống phải giữ vector.
- URL đổi không SHA phải `FULL_EMBED`.
- Title/description đổi phải `FULL_EMBED`.
- Size/link/thứ tự/vai trò ảnh chỉ `PAYLOAD_ONLY`.
- Legacy stale hash chỉ sửa payload/hash.
- Sort lại mảng unordered không làm đổi hash.
- Payload-only dùng Qdrant set-payload và không gửi vector.
- Worker cũ vẫn đọc `content_hash` v2 để rollback.

Kết quả local trước dry-run:

- Targeted P2.3C: `30/30` test đạt.
- Worker: `311/311` test đạt.
- Monorepo typecheck, test và build: đạt.

## Quy trình production

1. Merge code từ branch riêng vào GitHub `main`.
2. Build image/tag chức năng riêng; không dùng tên release `r19`.
3. Tạo snapshot Qdrant và xác minh snapshot.
4. Deploy code với `P23C_HASH_V3_MODE=DRY_RUN`.
5. Recreate duy nhất `lana-chatbot-p23c-publisher`.
6. Ghi lại exact action/reason counts.
7. Chỉ bật `LIVE` khi nhóm `FULL_EMBED` đúng với point mới hoặc input thực sự thay đổi.
8. Bật payload-only và legacy migration.
9. Kiểm tra payload-only không làm tăng Vertex/RemBG call count.
10. Kiểm tra checksum/vector sample trước và sau.

## Rollback

1. Đặt `P23C_HASH_V3_MODE=OFF`.
2. Recreate duy nhất P2.3C publisher.
3. Nếu cần, trả riêng image P2.3C về image trước thay đổi.
4. Không xóa Qdrant, Sheet, Redis hoặc vector.

Các field Hash v3 là additive. Worker cũ bỏ qua chúng và tiếp tục dùng `content_hash` v2.

## Kết quả production

Release chức năng:

```text
tag=20260730-p23c-hash-v3-compose
commit=3fa386a6a35daaf64d3b27c8ee0a26bf8b5993e4
image=lana-chatbot-app:p23c-hash-v3-20260730
service=p23c-publisher
mode=LIVE
```

DRY_RUN trên `956` job:

- `889` `PAYLOAD_ONLY`.
- `67` `FULL_EMBED`: `38` point thiếu và `29` input embedding thay đổi.
- `0` delete.
- `0` Qdrant/Sheet write trong DRY_RUN.

LIVE hoàn thành trong hai cycle:

- Cycle 1: `549/550` thành công; một `VERTEX_HTTP_429` retryable.
- Cycle 2: `407/407` thành công; retry point trước thành công.
- `remaining=0`; Qdrant có `956/956` point Hash v3.

Đối chiếu checksum vector trước/sau:

- `38` point mới.
- `29` vector hiện hữu thay đổi đúng nhóm semantic.
- `889` vector hiện hữu không đổi đúng nhóm payload/provenance.
- `0` point bị xóa.

Snapshot Qdrant được tạo và kiểm tra lại sau migration. `26` container ngoài P2.3C giữ nguyên ID/image; symlink runtime chung vẫn ở Admin Frontend r28 vì release này chỉ recreate P2.3C.

Bằng chứng đầy đủ: [manifest P2.3C Hash v3](../../deploy/manifests/20260730-p23c-hash-v3-compose.json).
