# Production baseline — 2026-07-23

Đây là baseline sống của production. Mỗi release phải cập nhật tài liệu này trước khi tạo tag để bản trong release directory không lệch GitHub `main`.

## Runtime

- VPS: `156.67.214.197`.
- Current release: `/opt/lana-chatbot/releases/20260723-realtime-wave1-canary-live-r11`.
- Compose SHA-256: `26bc319f13544f8caa3526948ade624b17c432c922e4c0df2b74b07416e4a18b`.
- Page app LIVE: `1198992073286645`.
- n8n: `2.28.6`.
- Migration mới nhất: `0018_shadow_verified_fact_payload`.
- `lana-p23-daily.timer`: `disabled/inactive`.

Mọi container `lana-chatbot-*` được quan sát đều healthy tại thời điểm kiểm kê. Danh sách image digest đầy đủ nằm trong release manifest.

Realtime page test và shadow worker đang chạy image `lana-chatbot-app:realtime-wave1-shadow-f27de9c` (`sha256:dbcab3412fdcc2343b6c8d23616250f8ab9ce53078e43665b5f79b0be3249d16`) từ commit `f27de9c9c7ad7dee7758dfc8c3487604bb782048`. Admin Web, Admin API và Admin Simulation Worker giữ image `lana-chatbot-app:customer-care-policy-r10`; P2.3B giữ image r9 và POS snapshot giữ image r6. API webhook, delivery worker và n8n không đổi.

## Realtime Wave 1 CANARY_LIVE

- Chỉ page `1198992073286645` được xử lý; page row là `owner=APP`, `app_send_enabled=true`, `kill_switch=false`.
- Realtime bật `REALTIME_BUYING_SIGNAL_GUARD_V1`, `REALTIME_DECISION_TELEMETRY_ENABLED`, `REALTIME_GROUNDED_DRAFT_V1` và `REALTIME_VERIFIED_FACT_ASSEMBLER_V1`.
- Runtime policy tiếp tục ở `PUBLISHED`; Sales Cycle tiếp tục bật. Judge v2 chỉ chạy ở shadow `DRY_RUN` và không điều khiển outbound.
- Preflight dependency đạt: Meta token trả đúng page `1198992073286645`, Qdrant có 917 points, Redis có 112 catalog snapshots, SV695 còn TTL gần 48 giờ và Pancake có đủ bốn tag `Nhân viên`, `Vận Đơn`, `Đã chốt đơn`, `KHÔNG UP SALE`.
- Sau cutover: `ambiguous_recent=0`, duplicate `reply_plan_id + sequence_no=0`; realtime và shadow heartbeat `IDLE`, không lỗi.
- Rollback/roll-forward thật riêng realtime `r10.1 → Wave 1 → r10.1 → Wave 1` đã đạt khi Inbox/Outbox active bằng 0.
- Chưa có bằng chứng hội thoại Messenger trực tiếp sau khi bật CANARY_LIVE; chủ dự án sẽ test trên page test trước khi coi release là PUBLISHED rộng hơn.

## Realtime Wave 1 shadow candidate

- Release directory: `/opt/lana-chatbot/releases/20260723-realtime-wave1-shadow-f27de9c`.
- GroundedReplyDraftV1, verified fact assembler và Judge v2 được bật riêng trong shadow; Judge chạy `DRY_RUN`, sample setting `0.1` chỉ áp dụng khi chuyển sang LIVE mode.
- `APP_SEND_ENABLED=false`, `CHATBOT_SEND_ENABLED=false`; role `lana_shadow_worker` không có quyền `INSERT` vào `meta_outbox`.
- Các feature flag mới trên realtime live vẫn OFF/không được inject; realtime r10.1 giữ nguyên image, started-at và restart count 0 trong suốt deploy/rollback test.
- Migration `0018_shadow_verified_fact_payload` đã restore-test theo chu kỳ `up → down → up`, sau đó áp dụng production. Runtime r10.1 vẫn healthy sau migration.
- Backup trước migration: `/opt/lana-chatbot/backups/20260723-realtime-wave1-shadow-f27de9c/lana_chatbot_pre_0018.dump`, SHA-256 `c488cd2f924a42e6430cca43d34bdaa857207c2c44353466531110cb095f9c7e`.
- Rollback/roll-forward riêng shadow `realtime-p1 → realtime-wave1-shadow-f27de9c` đã đạt; realtime live không restart.
- Shadow worker hiện `IDLE`, heartbeat không lỗi. Số `business_fact_payload` thực tế vẫn là 0 trước lượt test Messenger mới; cần kiểm tra lại sau khi tạo hội thoại test.

## Customer care policy r10.1

- `SHOP_POLICY` version 2 (`24400b36-6d12-4e3c-b0ca-cf41014ed0d8`) đã `PUBLISHED` cho page `1198992073286645`; source version là `shop-policy-customer-care-v2`.
- Policy cấu trúc hóa đổi size/màu/mẫu trong 15 ngày từ lúc nhận, một lần mỗi đơn, phí hai chiều tổng 30.000đ; hàng giảm từ 30% chỉ đổi size/màu.
- Đổi mẫu dùng giá niêm yết sản phẩm mới, không dùng sale hiện hành và khách bù chênh lệch dương. Đổi qua hình thức giao mẫu mới rồi nhận lại mẫu cũ.
- Trả hàng chỉ áp dụng lỗi vải, lỗi đường may do sản xuất hoặc giao sai; báo trong 5 ngày, shop chịu 100% phí ship và hoàn tiền sau 1–3 ngày làm việc kể từ khi xác nhận lỗi hợp lệ.
- FAQ có cấu trúc gồm ướm hàng khi nhận nhưng không mặc thử, phí từ chối nhận 30.000đ, chênh giá Shopee do trợ giá/voucher, sai khác màu do ánh sáng/màn hình và hướng dẫn giặt.
- Câu hỏi quy định trước mua ngắt trước product search/model và được renderer deterministic trả lời từ policy `LIVE_OUTBOUND`. Thiếu policy tin cậy thì fail-closed sang Nhân viên, không tự suy đoán.
- Yêu cầu có bằng chứng sau mua vẫn đi nhánh hậu mãi: một câu giữ chân, handoff và tag Vận Đơn. Các handoff còn lại giữ hành vi im lặng hiện hành.
- Smoke live đã xác minh “đổi trả”, “đổi size”, “đổi sang mẫu khác”, “đổi màu khác”, “mặc thử”, giá Shopee và giặt máy. Hai mẫu sau mua được xác nhận không bị classifier policy giữ lại.
- Full monorepo check của r10 đạt; hotfix r10.1 đạt `181/181` worker tests và worker typecheck. Không có migration mới.

## Sheets, media intent và policy routing r9

- Google Sheets client retry các request đọc/batch-update an toàn tối đa ba lần, chờ lần lượt 2, 5 và 15 giây. Append và tạo tab không blind-retry để tránh ghi trùng.
- P2.3B dùng chu kỳ lỗi 5 phút; chỉ sau một cycle thành công mới trở lại lịch thường 24 giờ.
- Lượt xác minh production hoàn tất `37/37`, lỗi `0`, `remaining=0`, `image_registry_rows=954`, sau đó cycle kế tiếp trả `NO_PENDING_WORK`.
- P2.3B bật heartbeat PostgreSQL. Admin hiển thị lỗi gần nhất là `degraded`; chỉ coi là mất kết nối khi trạng thái `down` hoặc không có heartbeat quá 26 giờ.
- Cụm “ảnh cận chất/cận vải” được nhận là `DETAIL`. Kiểm tra Qdrant cho SD398 xác nhận có hai ảnh `DETAIL/MATERIAL_CLOSEUP`; lỗi trước đây nằm ở intent classifier chứ không nằm ở `image_registry`.
- Câu hỏi policy trước mua không còn bị gắn Vận Đơn. Yêu cầu có bằng chứng sau mua hoặc hành động trên đơn mới vào hậu mãi; policy trước mua chưa có nội dung đổi/trả đã duyệt sẽ fail-closed sang Nhân viên.
- Toàn bộ monorepo check đạt; worker có `163/163` test pass. Không có migration mới.

## Product copy và thứ tự gửi r7

- Qdrant adapter giữ `title` và `DESCRIPTION_XML`; giá/tồn/size/ETA vẫn chỉ đến từ facts nghiệp vụ đã xác minh.
- Báo giá ưu tiên tên sản phẩm, chỉ dùng `mẫu <mã>` khi title không có tên thực.
- Câu form/chất liệu được dựng có kiểm soát từ `DESCRIPTION_XML`, có fallback an toàn khi metadata thiếu.
- Meta Outbox ghi text trước ảnh. Ảnh có `next_attempt_at` trễ 0,5 giây và sequence guard bảo đảm không vượt text.
- Realtime worker healthy trên page duy nhất `1198992073286645`; POS snapshot và n8n không bị restart.
- Toàn bộ monorepo check đạt; 44 test mục tiêu và 152 test worker đều pass. Không có migration mới.

### Runtime config hotfix r8

- `REALTIME_IMAGE_DELAY_MS` giảm từ `1500` xuống `500`.
- Realtime worker được recreate riêng và trở lại `healthy`; image r7 không đổi.
- POS snapshot, API, delivery và n8n không bị restart.

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
