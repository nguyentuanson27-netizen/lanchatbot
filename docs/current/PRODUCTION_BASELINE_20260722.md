# Production baseline — 2026-07-22

Tài liệu này được tạo bằng kiểm kê chỉ đọc. Không container, workflow hoặc timer nào bị thay đổi trong quá trình thu thập.

## Runtime

- VPS: `156.67.214.197`.
- Current release: `/opt/lana-chatbot/releases/20260722-admin-policy-control-r3`.
- Compose SHA-256: `38253f99033136f33c8fd8633a9fa224c16f38c11aecb0078f9f31a9e1537011`.
- Page app LIVE: `1198992073286645`.
- n8n: `2.28.6`.
- Migration mới nhất: `0014_admin_policy_control`.
- `lana-p23-daily.timer`: `disabled/inactive`.

Mọi container `lana-chatbot-*` được quan sát đều healthy tại thời điểm kiểm kê. Danh sách image digest đầy đủ nằm trong release manifest.

Admin API và Admin Web đang chạy image `lana-chatbot-app:admin-policy-control-r3` (`sha256:9b94403c7746802326d93b46f4e57088ea62f5c5aad9e03143f11dffd6bccd3b`). Policy Control được bật riêng cho page canary `1198992073286645`; runtime chatbot vẫn chạy image `lana-chatbot-app:inbound-debounce-r1` và n8n không bị restart trong release này.

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
