# Changelog

## 2026-07-24 — Size Chart Vertex hotfix r13.1

- Sửa response schema để tương thích Vertex và đồng bộ enum boundary policy với contract runtime.
- Cho phép bảng đo quần áo `GARMENT` vào DRAFT để quản trị viên kiểm tra, nhưng chặn APPROVE và runtime; chỉ chart `BODY` đã xác minh mới được tư vấn size.
- Tách tài khoản PostgreSQL riêng cho worker Size Chart với quyền tối thiểu trên ba bảng staging/audit.
- Full build/typecheck/test đạt `744/744`; worker đạt `241/241`, gồm `30/30` kịch bản Messenger.
- Smoke Vertex thật tạo 1 DRAFT `GARMENT` từ tối đa 10 ảnh; kiểm tra xác nhận chưa có chart GARMENT nào được VERIFIED.
- Scheduler retry sau 5 phút khi còn lỗi tạm thời như Vertex 429/5xx hoặc lỗi mạng; ảnh cần duyệt không kích hoạt vòng retry tốn phí.
- Chỉ page test `1198992073286645` được phép xử lý; bằng chứng canary Messenger thật vẫn cần 100 inbound hoặc 48 giờ.

## 2026-07-23 — realtime Wave 2/3 CANARY_LIVE r12

- Nối CustomerProfileV1 vào runtime bằng extractor số đo deterministic, profile pseudonymous TTL 48 giờ và revision/CAS; size engine chỉ dùng chart đã xác minh.
- Thêm verified variant dựa trên POS snapshot; unknown/ambiguous không map ngầm và nhãn màu không được giả làm POS color ID.
- Giảm model context trên page test từ 30 xuống 10 tin, không thay retention lịch sử Redis/PostgreSQL.
- Thêm BusinessFactQueriesV2 tối đa ba sản phẩm, catalog advisory có cấu trúc và decision audit v2 không chứa raw model body/PII/secret.
- Áp dụng migration additive `0019_customer_profile_wave2` sau backup và restore-test `up → down → up`.
- Full build/typecheck và `739/739` test đạt; realtime LIVE/IDLE, restart count 0, ambiguous 0 và duplicate reply-plan sequence 0.
- Rollback/roll-forward sáu feature flag đạt trong 15 giây. Chỉ realtime worker được recreate; API, delivery, shadow, POS, P2.3 và n8n không restart.
- Page allowlist giữ duy nhất `1198992073286645`; test Messenger trực tiếp vẫn là gate trước khi promotion rộng.
- Theo quyết định D-007, số đo có `observedAt` mới nhất được ưu tiên khi xung đột; không yêu cầu khách xác nhận lại.

## 2026-07-23 — realtime Wave 1 CANARY_LIVE r11

- Bật grounded draft, verified fact assembler, buying-signal guard và decision telemetry trên realtime cho duy nhất page test `1198992073286645`.
- Giữ Judge v2 ở shadow `DRY_RUN`; Judge không điều khiển reply hoặc outbound.
- Xác minh Meta đúng page, Qdrant 917 points, Redis 112 snapshots, POS snapshot SV695 còn gần 48 giờ TTL và đủ bốn tag Pancake bắt buộc.
- Cutover/recreate riêng realtime worker; API, delivery, shadow, POS, P2.3 và n8n không restart.
- Queue sau cutover không có ambiguous mới hoặc duplicate reply-plan sequence.
- Rollback/roll-forward thật riêng realtime đạt; hệ thống kết thúc ở Wave 1 healthy, restart count 0.
- Chuyển symlink `current` sang `/opt/lana-chatbot/releases/20260723-realtime-wave1-canary-live-r11`.

## 2026-07-23 — realtime Wave 1 shadow

- Triển khai riêng GroundedReplyDraftV1, verified fact assembler, business guard và Judge v2 lên shadow worker từ commit `f27de9c`; realtime live r10.1 chưa bật các feature flag mới.
- Tách biến cấu hình và image của shadow khỏi realtime live để không thể bật nhầm candidate trên outbound worker.
- Áp dụng migration additive `0018_shadow_verified_fact_payload` sau khi backup và restore-test `up → down → up`.
- Shadow giữ `APP_SEND_ENABLED=false`, `CHATBOT_SEND_ENABLED=false`, Judge `DRY_RUN` và role DB không có quyền ghi Meta Outbox.
- Rollback/roll-forward riêng shadow đạt; realtime live, API, delivery, POS snapshot, P2.3 và n8n không restart.
- Full build, full typecheck và `727/727` test đạt. Shadow đang healthy/IDLE nhưng chưa có mirror evaluation mới để đánh giá chất lượng thực tế.

## 2026-07-23 — customer care policy r10.1

- Mở rộng `SHOP_POLICY` bằng policy chăm sóc khách hàng có cấu trúc, version/audit/publish qua Admin; không nhúng nội dung FAQ vào prompt.
- Thêm câu trả lời deterministic cho chính sách đổi/trả, phí đổi, mặc thử, từ chối nhận, giá Shopee, độ giống ảnh và hướng dẫn giặt.
- Phân loại trước mua trước product search/model; hậu mãi thật vẫn dùng holding reply, handoff và tag Vận Đơn.
- Sửa hotfix nhận đúng cách hỏi tự nhiên “đổi sang mẫu khác được không” và “đổi màu khác được không”.
- `SHOP_POLICY` v2 được publish cho page test; smoke resolver live đạt, runtime r10.1 và ba dịch vụ Admin r10 healthy, restart count 0.
- Full monorepo check đạt; hotfix đạt `181/181` worker tests và typecheck. n8n, API webhook, POS snapshot và P2.3 không bị restart.

## 2026-07-23 — Sheets, media intent và policy routing r9

- Retry Google Sheets ba lần với backoff 2–5–15 giây; cycle P2.3B thất bại được chạy lại sau 5 phút thay vì chờ 24 giờ.
- Admin tách “Lỗi gần nhất” khỏi “Mất kết nối”; P2.3B ghi heartbeat/trạng thái vào PostgreSQL.
- Sửa “ảnh cận chất/cận vải” thành intent `DETAIL`; nguyên nhân ảnh sai là classifier rơi về `GENERIC`, không phải phân loại trong `image_registry`.
- Tách câu hỏi chính sách trước mua khỏi yêu cầu hậu mãi thực tế; chỉ hậu mãi mới dùng holding reply và tag Vận Đơn.
- Production cycle P2.3B xử lý thành công 37 ảnh, 0 lỗi, không còn pending. Realtime, Admin Web và P2.3B healthy; n8n, POS snapshot và Admin API không bị restart.
- Toàn bộ monorepo check và `163/163` worker test đạt; không có migration.

## 2026-07-23 — image delay 500 ms config r8

- Giảm khoảng nghỉ giữa text và ảnh từ 1,5 giây xuống 0,5 giây.
- Giữ nguyên sequence guard: ảnh vẫn không được gửi trước text.
- Recreate riêng realtime worker; image r7, POS snapshot và n8n không đổi.
- 33 test mục tiêu và typecheck database/worker đạt.

## 2026-07-23 — product copy và text-first delivery r7

- Báo giá dùng tên sản phẩm thay cho mã khi Qdrant có title hợp lệ.
- Đưa `DESCRIPTION_XML` vào stable product document để viết câu form/chất liệu tự nhiên hơn; không dùng XML làm nguồn giá/tồn/size/ETA.
- Đổi thứ tự Meta Outbox thành text trước ảnh; ảnh được lập lịch sau 1,5 giây và vẫn tuân theo sequence guard.
- Realtime worker chuyển sang image r7 và healthy; POS snapshot giữ r6, API/delivery/n8n không đổi.
- Toàn bộ monorepo check, 44 test mục tiêu và 152 test worker đạt; không có migration.

## 2026-07-23 — sales cycle production r6

- Nối cart, negotiation và checkout thật vào realtime production; state/outbox/tag intent được commit atomically với CAS.
- Thêm migration `0017_sales_cycle_runtime`: state mã hóa, TTL 48 giờ và event append-only.
- POS snapshot trở thành service được quản lý trong compose, chạy 30 phút/lần, Redis TTL 48 giờ và không ghi ngược Sheet.
- Nối giá/BOM/tồn/size/ETA từ snapshot thật; revalidate trước preview và trước xác nhận.
- Bật ưu đãi deterministic: giảm 5% từ hai sản phẩm, HESITANT freeship, CAUTIOUS freeship + 20.000đ; retry không nâng concession.
- Thu đủ tên/số điện thoại/địa chỉ/phương thức thanh toán trước preview; “ok” chỉ xác nhận ở `ORDER_PREVIEW`.
- Publish `PAYMENT_POLICY` cho COD/chuyển khoản MB Bank và QR versioned; ảnh bill luôn chuyển nhân viên kiểm tra.
- Trạng thái cuối là `PURCHASE_CONFIRMED` + tag Đã chốt đơn, không giả là đơn POS đã được tạo.
- Image production đạt 71/71 smoke test; realtime/POS healthy, API/delivery/n8n không đổi.

## 2026-07-23 — realtime context and after-sales handoff r5

- Giữ sản phẩm đang xem qua các generation bằng exact lookup từ `state.currentProductId` cho câu hỏi tiếp nối; chặn fallback về sản phẩm cũ khi khách nhập mã mới không hợp lệ.
- Giữ `proposal.productId` trong safe fallback thay vì ép về `null`.
- Nối `handoff-fallback-v2` vào realtime: chỉ hậu mãi nhận một câu giữ chân, các handoff khác vẫn im lặng.
- Hậu mãi ngắt trước product search/model; holding reply, handoff state và tag Vận Đơn cùng đi qua atomic commit/outbox có generation guard.
- Clean build, `145/145` worker test và worker typecheck đạt; không có migration.

## 2026-07-22 — runtime policy published r4

- Owner chủ động phát hành dù simulation trước đó là `INSUFFICIENT_EVIDENCE`; quyết định override được ghi trong baseline và manifest.
- Thêm hard gate để `PUBLISHED` chỉ được runtime sử dụng cho page `1198992073286645`; mọi page khác trả `PUBLISHED_PAGE_FORBIDDEN` trước khi đọc policy.
- Publish ba policy lõi qua Admin API có audit và chuyển realtime worker từ `CANARY_LIVE` sang `PUBLISHED`.
- Clean build, 31 test của chat-runtime, typecheck và smoke resolver đều đạt; bốn service r4 healthy với restart count bằng 0.
- API webhook, delivery worker và n8n không đổi.

## 2026-07-22 — runtime policy canary r3

- Cài deploy key GitHub read-only riêng cho repository trên VPS; private key chỉ tồn tại dưới user `lana-deploy`.
- Giới hạn vòng đời Admin ở `DRAFT/VALIDATED/APPROVED/CANARY_SHADOW/CANARY_LIVE`; `PUBLISHED` vẫn bị khóa ở cả Admin và runtime.
- Thêm Runtime Policy Resolver với kiểm tra schema/hash/version, cache, immutable pin, append-only audit và last-known-good có giới hạn.
- Chạy `CANARY_SHADOW`, kiểm tra không ảnh hưởng outbound, sau đó mở `CANARY_LIVE` chỉ cho page `1198992073286645`.
- Thêm Simulation Worker side-effect-free, lease/fencing/retry và baseline `HISTORICAL_ACTUAL`; kết quả hiện là `INSUFFICIENT_EVIDENCE`, nên chưa đủ điều kiện publish.
- Kiểm thử rollback/roll-forward pointer, last-known-good và chu kỳ migration `up → down → up` thành công.
- Áp dụng migration `0015_runtime_policy_resolution` và `0016_admin_simulation_worker`; n8n, API webhook và delivery worker không đổi.

## 2026-07-22 — sales cycle engines (Giai đoạn 3)

- Thêm cart/order-intent 48 giờ, optimistic concurrency theo `cart_id + cart_version` và preview binding.
- Thêm negotiation deterministic `READY/HESITANT/CAUTIOUS`, chống retry nâng ưu đãi và tính lại giảm 5% khi khách bớt món.
- Thêm handoff/fallback theo reason code; revalidation thay đổi trước xác nhận và bill chuyển khoản đều chuyển nhân viên.
- Thêm payment policy COD/chuyển khoản, QR có version và trạng thái `PURCHASE_CONFIRMED` không giả thành đơn POS.
- Thêm canonical CartV1: mọi tổng tiền/ưu đãi được tính lại từ giá POS và policy; sửa/bớt món tự hủy preview và tính lại điều kiện giảm 5%.
- Khóa trusted boundary bằng content-addressed reference/resolver; giá POS bind đúng shop/sản phẩm/offer, đổi biến thể cập nhật SKU-size-màu atomically và final revalidation không còn đi từ command.
- Bind negotiation, xác nhận mua và bill vào inbound Meta CUSTOMER đúng page/hội thoại/thời điểm; ID xác nhận và idempotency key được runtime tự sinh.
- Thêm sales-cycle runtime với state CAS, negotiation tích hợp, confirmation idempotency và kiểm tra lại giá/tồn/size/ETA.
- Thêm cổng transaction CAS cho persistence; hai lệnh đồng thời chỉ một lệnh được ghi và chỉ lệnh thắng được phát effect intent.
- Đây là engine-layer release trên source; chưa có adapter PostgreSQL/outbox production hoặc deploy VPS.

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
