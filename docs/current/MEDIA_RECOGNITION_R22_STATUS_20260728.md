# Cutout-first + AI reranker r22 — trạng thái triển khai 2026-07-28

## Kết quả

Release `20260728-media-cutout-ai-r22` đã chạy LIVE 100% trên page test
`1198992073286645`. App tiếp tục là owner duy nhất của page; n8n không được bật lại làm
writer. Chỉ `realtime-worker` được recreate.

- PR: `#42`.
- Merge commit: `078dae266a39e5172eb8ea96cbb1367821a8ea91`.
- Image: `lana-chatbot-app:media-cutout-ai-r22`.
- Image ID: `sha256:fd9810c6acb196f96329bc5ac57d446d1a901fd3b48c63b4b7379eb8cff37184`.
- Release path: `/opt/lana-chatbot/releases/20260728-media-cutout-ai-r22`.
- Rollback path: `/opt/lana-chatbot/releases/20260728-wave1-recorded-replay-r21`.

VPS không có GitHub deploy key khả dụng ở checkout triển khai. Source được chuyển dưới
dạng Git bundle đầy đủ tạo từ annotated tag, kiểm tra SHA-256 và `git bundle verify`,
sau đó clone thành release directory sạch. Không có source nào bị sửa trực tiếp trên VPS.

## Luồng đang bật

1. Tải ảnh từ host được phép và chuẩn hóa bằng FFmpeg, cạnh dài tối đa 768 px.
2. Tách nền qua rembg rồi tìm vector `image_cutout`.
3. Tìm `image_raw` song song để fallback và làm bằng chứng phụ.
4. Tự nhận diện khi cutout đủ mạnh và có khoảng cách an toàn.
5. Gọi `gemini-3.1-flash-lite` khi top-gap nhỏ, hai kênh bất đồng hoặc kết quả sát ngưỡng.
6. Gemini chỉ được chọn một candidate trong top 3, hoặc trả `none`/`ambiguous`.
7. Nếu chưa chắc, bot hỏi khách chọn mẫu 1/2/3 hoặc nhập đúng mã; tối đa ba lượt rồi mới handoff.

Ảnh mới xóa/ngưng ngữ cảnh sản phẩm cũ. Runtime không được fallback về
`currentProductId` cũ, không ép ảnh ngoài catalog vào một mã và không handoff ngay khi
Gemini timeout/429/schema lỗi.

## Flag production-test-page

```text
REALTIME_MEDIA_ENABLED_PAGE_IDS=1198992073286645
REALTIME_MEDIA_CUTOUT_MODE=LIVE
REALTIME_MEDIA_CLARIFICATION_ENABLED=true
REALTIME_MEDIA_AI_RERANK_MODE=LIVE
REALTIME_MEDIA_AI_RERANK_MODEL=gemini-3.1-flash-lite
REALTIME_MEDIA_AI_MAX_CANDIDATES=3
REALTIME_MEDIA_AI_TIMEOUT_MS=8000
REALTIME_MEDIA_AI_MAX_OUTPUT_TOKENS=250
REALTIME_MEDIA_TOTAL_DEADLINE_MS=12000
```

Ngưỡng cutout độc lập với raw: strong `0,82`, minimum `0,74`, gap `0,025`. Raw fallback
giữ `0,78` và gap `0,04`. Cache dùng namespace `media-resolution:v2` và có version của
pipeline/model/prompt.

## Kiểm thử và hậu kiểm

- Full `pnpm check` local: PASS.
- Full `pnpm check` trong Docker build trên VPS: PASS.
- Business Tools: 160/160.
- Worker: 286/286.
- Realtime r22: healthy, restart 0, log lỗi mới 0.
- Page: `ACTIVE`, owner `APP`, send enabled, kill switch tắt.
- Worker ledger: `IDLE`, `LIVE`, heartbeat bình thường.
- Inbox active: 0; Outbox active: 0; duplicate response-group/sequence: 0.
- Qdrant: green, 917 points, đủ `image_cutout`, `image_raw`, `product_text`.
- ID/image của mọi container ngoài realtime-worker không đổi trong cutover.

Sự kiện Messenger mới nhất tại thời điểm hậu kiểm là sự kiện cũ trước cutover, đã
`PROCESSED` lúc `2026-07-28 11:33:43` (Asia/Ho_Chi_Minh), quyết định
`PRODUCT_AMBIGUOUS`. Vì chưa có ảnh mới sau cutover, human test Messenger vẫn là gate
đang chờ.

## Human test còn phải thực hiện

Ưu tiên gửi lại SD395 và SD443, rồi kiểm tra:

- ảnh nguyên bản, ảnh Messenger nén, screenshot và crop;
- câu trả lời “mẫu 1”, “mẫu 2”, “mẫu 3” và mã như `SD395`;
- “không phải mẫu nào”;
- giữ sản phẩm cũ rồi gửi ảnh mới;
- ảnh ngoài catalog, collage, cutout lỗi và tình huống Gemini timeout/schema lỗi;
- replay cùng event không tạo thêm Outbox.

Chưa mở cho page có khách thật cho đến khi hard-negative không nhận sai mã, ảnh ngoài
catalog không bị ép chọn, state cũ không bị tái sử dụng và p95 toàn luồng dưới 12 giây.

## Rollback

Rollback theo mức độ nhỏ nhất:

1. `REALTIME_MEDIA_AI_RERANK_MODE=OFF`.
2. Nếu state clarification lỗi, đặt `REALTIME_MEDIA_CLARIFICATION_ENABLED=false`.
3. Nếu cutout lỗi hệ thống, đặt `REALTIME_MEDIA_CUTOUT_MODE=OFF`.
4. Nếu lỗi code, recreate riêng realtime-worker bằng image r21 và chuyển `current` về
   release r21.

Không rollback migration và không xóa Inbox, Outbox, Redis, PostgreSQL hoặc cache.

Manifest: `deploy/manifests/20260728-media-cutout-ai-r22.json`.
