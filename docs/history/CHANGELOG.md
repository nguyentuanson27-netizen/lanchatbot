# Changelog

## 2026-07-22 — sales runtime engines (Giai đoạn 2)

- Thêm POS adapter và resolver `ProductFactsV2`; Redis projection tách stable/BOM/price-inventory với retention khác freshness.
- Khóa BOM/tồn theo từng offer POS và publish Redis bằng immutable generation + manifest CAS để tránh trộn snapshot.
- Thêm policy engine shop-wide: giảm 5% từ hai sản phẩm, freeship và giảm cuối 20.000đ được phép cộng dồn.
- Thêm merge hồ sơ theo từng trường có revision/CAS, size-chart staging/verification có kiểm tra scope và size recommendation deterministic.
- Thêm media selector theo sản phẩm/thành phần/mục đích; thiếu đúng loại ảnh thì không gửi ảnh thay thế sai.
- Thêm baseline analytics ba tháng, outreach cohort riêng, golden conversations và deterministic replay.
- Đây là engine-layer release trên source; chưa nối vào realtime production hoặc deploy VPS.

## 2026-07-22 — shared sales contracts

- Thêm additive contract `ProductFactsV2`, `PolicyBundleV1`, `CustomerProfileV1`, `SizeRecommendationV1`, `CartV1`, `HandoffDecisionV2`, `MediaSelectionV2`, `SalesEpisodeV1` và `FunnelEventV1`.
- Khóa POS là nguồn duy nhất cho BOM/giá/tồn; giá thiếu là `null` và chặn báo giá/chốt cart.
- Bổ sung staging/verification cho size chart trích xuất từ ảnh.
- Chỉ tag Pancake `Đã chốt đơn` đã xác minh mới được tính conversion.
- Đây là thay đổi contract-only; runtime production chưa sử dụng V2.

## 2026-07-22 — inbound debounce r1

- Gom tin nhắn sau 5 giây yên lặng, không có thời gian chờ tối đa.
- Webhook duplicate không kéo dài debounce.
- Generation guard ngăn kết quả cũ ghi state/outbox khi khách nhắn thêm.
- Migration `0013_inbound_debounce`.
- API và realtime worker chạy image `inbound-debounce-r1`.
- App-native POS/P2.3 workers được đưa vào source baseline.
- GitHub private repository được chọn làm nguồn mã chuẩn.

## 2026-07-21 — ads/media r3

- Chuẩn hóa Ads context.
- Xử lý nhiều ảnh và video qua media worker.
- Migration `0011_ads_media_analytics`.

## 2026-07-20 — batch status và handoff history

- App-native P2.3/POS workers cùng batch status projection.
- Handoff ledger và giao diện “Cần nhân viên xử lý”.
- Migration `0010_handoff_history` và `0012_batch_worker_catalog_status`.

## 2026-07-19 — history/outreach

- Redis history 20 ngày, PostgreSQL history ẩn danh 6 tháng.
- Nhận diện upsale/spam sớm và thống kê phản hồi riêng.
- Migration `0009_chat_history_outreach`.

## 2026-07-16 đến 2026-07-18 — realtime và Admin

- App tiếp quản page canary, Meta Inbox/Outbox, Pancake tag outbox.
- Authentik + Google + MFA cho Admin.
- Admin control plane, identity projection và lịch sử hội thoại.
- Migration `0005` đến `0008`.

## Giai đoạn nền

- Phase 0–4 thiết kế kiến trúc, database, shadow evaluation và business-fact guard.
- Các tài liệu chi tiết được giữ trong `docs/phase0` đến `docs/phase4`.
