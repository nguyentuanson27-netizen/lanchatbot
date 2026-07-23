# Production baseline — 2026-07-23

Đây là baseline sống của production. Mỗi release phải cập nhật tài liệu này trước khi tạo tag để bản trong release directory không lệch GitHub `main`.

## Runtime

- VPS: `156.67.214.197`.
- Current release: `/opt/lana-chatbot/releases/20260723-sales-cycle-production-r6`.
- Compose SHA-256: `da3da8e9f22d8207f414d42dae0f5ff9918f743d6470fa4c8dbc5360a9dde650`.
- Page app LIVE: `1198992073286645`.
- n8n: `2.28.6`.
- Migration mới nhất: `0017_sales_cycle_runtime`.
- `lana-p23-daily.timer`: `disabled/inactive`.

Mọi container `lana-chatbot-*` được quan sát đều healthy tại thời điểm kiểm kê. Danh sách image digest đầy đủ nằm trong release manifest.

Admin API, Admin Web và Admin Simulation Worker đang chạy image `lana-chatbot-app:runtime-policy-published-r4`. Realtime và POS snapshot worker chạy image `lana-chatbot-app:sales-cycle-production-r6` (`sha256:cae918d5dc9d505ccdd88b670abdc5b337b169cabe36cd33220fd6c475a054d2`). API webhook và delivery worker không đổi; n8n không bị restart trong release này.

## Runtime Policy published

- Bốn policy runtime `SHOP_POLICY`, `OFFER_POLICY`, `CLOSING_STRATEGY`, `PAYMENT_POLICY` đã qua `DRAFT → VALIDATED → APPROVED → CANARY_SHADOW → CANARY_LIVE → PUBLISHED` bằng Admin API có audit.
- Kênh `PUBLISHED` chỉ áp dụng cho page `1198992073286645`; runtime hard-gate cả `CANARY_LIVE` và `PUBLISHED` theo đúng page này.
- `CANARY_SHADOW` đã được xác nhận không ảnh hưởng outbound. `CANARY_LIVE` chỉ đi vào helper deterministic; policy không được đưa vào prompt/model.
- Rollback pointer và roll-forward đã pass; last-known-good pass khi giả lập nguồn PostgreSQL lỗi.
- Có `4` pointer active `PUBLISHED`; các pointer canary cũ đã được thay thế.
- Admin và runtime đều bật cờ publish. Smoke test resolver trả `LIVE_OUTBOUND` cho page test và `PUBLISHED_PAGE_FORBIDDEN` cho page khác.
- Simulation trước publish dùng baseline `HISTORICAL_ACTUAL` và trả `INSUFFICIENT_EVIDENCE` với `0` cuộc hội thoại đánh giá được. Owner đã chủ động override blocker này trong release r4; kết quả được giữ lại để audit.
- Backup trước migration: `/opt/lana-chatbot/backups/20260722-runtime-policy-canary-r3/lana_chatbot_pre_0015_0016.dump`, SHA-256 `13717540cfa2a85b19ab0127133a5f34d62dafc1bad1251e991b4d8cc3363fdd`.
- Restore test đã chạy đủ chu kỳ `up 0015/0016 → down 0016/0015 → up 0015/0016` trên database tạm.

## Sales cycle production r6

- Realtime đã nối canonical cart, negotiation và checkout vào atomic conversation commit; cart có TTL 48 giờ.
- Giá/BOM/tồn lấy từ POS snapshot. POS worker được đưa vào compose chính thức, chạy 30 phút/lần, Redis TTL 48 giờ và không ghi ngược Google Sheets.
- Mỗi lần mở/sửa cart đều tính lại ưu đãi shop-wide. Giảm 5% từ hai sản phẩm được phép cộng với freeship và giảm cuối 20.000đ; retry cùng bằng chứng không nâng mức nhượng bộ.
- Trước order preview và trước xác nhận, runtime kiểm tra lại giá, tồn, size và ETA. Thay đổi hoặc thiếu dữ liệu sẽ handoff, không tự chốt.
- “Ok” chỉ xác nhận khi hội thoại đang ở `ORDER_PREVIEW`; kết quả là `PURCHASE_CONFIRMED`, chưa được gọi là `ORDER_CREATED`.
- `PAYMENT_POLICY` hỗ trợ COD và chuyển khoản; QR được phục vụ tại URL versioned trên `admin.lanadesign.vn`. Ảnh bill luôn chuyển nhân viên.
- State/PII 48 giờ được mã hóa; sales-cycle event là append-only. Migration `0017_sales_cycle_runtime` đã áp dụng.
- POS smoke thực tế: 112 sản phẩm, 1.202 biến thể, 112 snapshot, 0 cảnh báo. Runtime resolver đọc đủ 4 policy `PUBLISHED`.
- Smoke test trên đúng image production đạt `71/71`.
- Backup trước migration: `/opt/lana-chatbot/backups/20260723-sales-cycle-production-r6/lana_chatbot_pre_0017_20260723T032748Z.dump`, SHA-256 `9a350ef69690597227f9e74e9cbe66e6f749bdd87a5b0d242771c4bf17812fd3`.
- Restore test migration `0017` đã chạy chu kỳ `up → down → up` thành công trên database tạm.

## Realtime fixes r5

- Resolver sản phẩm ưu tiên mã/selection/ads/media của tin mới. Khi không có mã xung đột và khách đang hỏi tiếp về ảnh, giá, tồn, size, ETA hoặc đặc điểm mẫu, runtime xác minh lại `state.currentProductId` bằng exact lookup rồi mới dùng.
- `proposal.productId` đã xác minh không còn bị bỏ mất trong fallback; thứ tự là `resolved product → proposal product → state.currentProductId`.
- Tin hậu mãi ngắt sớm trước Qdrant/model, tạo đúng một holding reply qua Meta Outbox trong cùng atomic commit với state handoff và Pancake tag Vận Đơn.
- Handoff không thuộc hậu mãi tiếp tục `SILENT_HANDOFF`, không tạo `metaPlan`.
- Clean build, toàn bộ `145` worker test và worker typecheck đều pass. Không có migration mới.

## Ownership hiện hành

| Miền | Writer/processor hiện hành | Trạng thái n8n tương ứng |
|---|---|---|
| Page canary webhook/reply | App API + realtime/delivery worker | Chatbot n8n chính không sở hữu page canary |
| POS snapshot | `lana-chatbot-pos-snapshot-worker` | `P2POSV3LANA0001` inactive |
| XML registry | `lana-chatbot-p23a-registry-sync` | `P23REGSYNCLANA01` inactive |
| Image metadata staging | `lana-chatbot-p23b-metadata-staging` | `P23IMGMETALANA01` inactive |
| Approved Qdrant publish | `lana-chatbot-p23c-publisher` | `P23QDRANTLANA001` inactive |
| Meta send | `lana-chatbot-delivery-worker` | Không gửi qua Pancake |
| Pancake tag | App tag outbox/control worker | Pancake chỉ dùng cho tag/handoff |

Không được bật workflow n8n P2.2/P2.3 khi app-native worker cùng miền đang active. Nếu đổi owner phải có release riêng, dừng writer cũ, kiểm tra lock/outbox và mới mở writer mới.

## Workflow n8n liên quan

| ID | Active | Tên | Vai trò |
|---|---:|---|---|
| `C4Qn7aNuUNCHJJ9c` | true | `1. AI Agent - Facebook(sản phẩm lana)` | Legacy chatbot cho các page còn thuộc n8n; page canary đã tách |
| `P2POSV3LANA0001` | false | `P2.2 - POS Snapshot + Telegram Alerts` | Đã được thay bởi app-native worker |
| `P23REGSYNCLANA01` | false | `P2.3A - XML Registry Sync` | Đã được thay bởi app-native worker |
| `P23IMGMETALANA01` | false | `P2.3B - Image Metadata Staging to Google Sheets` | Đã được thay bởi app-native worker |
| `P23QDRANTLANA001` | false | `P2.3C - Approved Image Metadata to Qdrant` | Đã được thay bởi app-native worker |
| `P2INGESTLANA0001` | false | `[ARCHIVE] P2.3 Combined Registry + Qdrant` | Superseded, không dùng |
| `2Ssi4PG0SV2rs687` | true | `lana_policy_search` | Legacy policy subflow |
| `oHM3xlIaDecKKkX1` | true | `Sub_tim_kiem_san_pham_qdrant` | Legacy product-search subflow |

Các workflow active khác trên cùng n8n phục vụ page/brand hoặc automation khác; không thuộc quyền sở hữu app page canary.

## Drift đã xử lý trong baseline GitHub

- Nhập 21 file worker/tool app-native đang có ở live nhưng thiếu local.
- Đồng bộ 9 file contract/Admin/package/lockfile đang khác live.
- Đưa ba artifact smoke/rollback của release vào `deploy/smoke` và `deploy/rollback`.
- Thay README tích lũy lịch sử bằng README trạng thái hiện hành và changelog riêng.

## Release blockers

- Không để app và n8n cùng ghi một miền dữ liệu.
- Không deploy nếu migration ledger khác checksum manifest.
- Không commit secret hoặc workflow có token hard-code.
- Không dùng symlink `current` như bằng chứng duy nhất; phải đối chiếu service image digest.
- Không gọi trạng thái khách xác nhận là đơn POS đã tạo nếu chưa có `ORDER_CREATED` từ POS.
