# Production baseline — 2026-07-24

Đây là baseline sống của production. Mỗi release phải cập nhật tài liệu này trước khi tạo tag để bản trong release directory không lệch GitHub `main`.

## Runtime

- VPS: `156.67.214.197`.
- Current release: `/opt/lana-chatbot/releases/20260724-admin-dashboard-view-hotfix-r15.1`.
- Previous release: `/opt/lana-chatbot/releases/20260724-checkout-natural-confirmation-r15`.
- Source commit: `26322eb2f180d646134f00a91efcf667bf8cb848`.
- Source archive SHA-256: `1e78817f21e4b835ca8c68262df974488d8d5fd0f7f256c6f8e1b7208f5846da`.
- Compose SHA-256: `3315a96cfd6a121550e566c1bf393c23b70af4ad3ad28ece3cf9bad7dbe9c9c5`.
- Page app LIVE: `1198992073286645`.
- n8n: `2.28.6`.
- Migration mới nhất trong candidate: `0020_size_chart_extraction`.
- `lana-p23-daily.timer`: `disabled/inactive`.

Realtime Worker, Admin API, Admin Web và P2.3C healthy, restart count 0. Không có migration mới và không thay đổi webhook, delivery, POS, n8n hoặc page allowlist.

Admin API chạy image `lana-chatbot-app:admin-dashboard-view-hotfix-r15.1` (`sha256:198a77471346ada84d3d1bd79cb28a038b59c386d4412710fc6f09327c459ac8`). Realtime Worker, Admin Web và P2.3C tiếp tục dùng image r15 (`sha256:2598cb86c2e78873626644d40fc67de996e8bbaac413a8ad16a8dda21ea6ad4c`); các service khác giữ nguyên.

## Admin dashboard least-privilege hotfix r15.1

- Sửa `/admin/v1/dashboard` bị PostgreSQL từ chối `42501`: metric checkout mới đã đọc nhầm bảng gốc `conversation_events`.
- Truy vấn hiện chỉ đọc `admin_conversation_events_v`, giữ nguyên ranh giới dữ liệu ẩn danh; không cấp thêm quyền cho tài khoản Admin và không có migration.
- Admin API đạt `40/40` test, typecheck/build và toàn bộ Docker `pnpm check`; container healthy, restart count 0, không còn log `42501` mới sau cutover.
- Chỉ Admin API được recreate. Realtime Worker, Admin Web, P2.3C, Meta delivery và n8n không restart.

## Natural checkout + purchase confirmation r15

- Model trả `salesSignals` có cấu trúc cho thông tin nhận hàng và xác nhận mua; runtime chỉ nhận dữ liệu có bằng chứng nguyên văn trong inbound mới nhất, confidence tối thiểu 0,85 và vẫn chạy validation deterministic.
- Tin nhắn nhận hàng không nhãn như `Lan 098... 123 Lê Lợi ... ship COD` có thể đi tới order preview; số điện thoại và phương thức thanh toán vẫn ưu tiên parser deterministic.
- Cổng xác nhận mua nhận thêm các cách nói tự nhiên như “cho chị lấy”, “vâng em chốt đơn”, “lên đơn giúp chị”; câu hỏi, phủ định, do dự và yêu cầu ảnh không được coi là xác nhận.
- Nguồn intent được ghi đúng là `MODEL_STRUCTURED_OUTPUT` hoặc `DETERMINISTIC_CLASSIFIER`, không còn gắn nhãn model cho kết quả regex.
- Câu thương lượng được dựng từ chính adjustment thực tế trong cart/policy; không hard-code “20k” khi con số trong giỏ khác.
- Funnel Admin bổ sung `CHECKOUT_DETAILS_MISSING`, số hội thoại thiếu thông tin nhận hàng và số order preview chưa được xác nhận. Event chỉ chứa reason/source/field enum, không ghi PII.
- P2.3C dùng `http://139.162.18.93:7000/api/remove`; smoke thật trả ảnh PNG. Khoảng cách gọi Vertex tăng từ 4 lên 6 giây để giảm 429; lỗi retryable vẫn giữ lại cho chu kỳ sau.
- Cycle r15 đầu tiên xử lý 50 point trong khoảng 10 phút: thành công 48, lỗi retryable Vertex 429 là 2, lỗi fatal 0, lock được giải phóng và còn 839 point pending.
- Docker build chạy toàn bộ `pnpm check`: `806/806` test đạt, trong đó Worker `259/259`, Admin API `39/39`, Admin Web `23/23`, Contracts `72/72`, Database `36/36`.
- Rollback chỉ cần trả ba biến image và symlink về r14.3.1; không xóa Inbox, Outbox, Redis hoặc PostgreSQL.

## Admin media + verified size guidance r14.3.1

- Public product media dùng mode thư mục/file `0755/0644`; private originals dùng `0750/0600`. Smoke thật qua `https://admin.lanadesign.vn/lana-public/products/...` trả `200 image/jpeg`.
- Upload có lock theo intake trong một process, xác thực MIME/magic bytes, giới hạn input/output và đối soát marker orphan sau 24 giờ. Đây chưa phải distributed lock cho nhiều replica Admin API.
- Docker build chạy `pnpm check`; Admin API đạt `39/39`, Worker `248/248`, Business Tools `158/158`, Contracts `71/71`. Test resize thật dùng FFmpeg cho JPG/PNG/WebP.
- Size guidance ưu tiên số đo mới nhất hoặc size từng xác nhận/mua trước đây, trả confidence và dùng nhãn thành phần dễ đọc.
- Ảnh size guide chỉ được gửi khi asset `APPROVED`, metadata verified, còn fresh, URL khớp artifact Admin và SHA-256 Qdrant khớp `sourceContentSha256` của chart đã xác minh.
- `image_registry` có 76 dòng `SIZE_GUIDE`; 73 dòng `APPROVED + ACTIVE` có point Qdrant tương ứng. Backfill payload-only đã cập nhật và verify đủ `73/73`, không tái tạo vector.
- P2.3C tự chạy batch sau recreate nhưng download ảnh Pancake vẫn đạt `200`; lỗi nằm ở kết nối tới `http://139.162.18.93:7000/api/remove` (`Connect Timeout`). Worker được dừng để tránh lặp 50 job lỗi.
- Cross-sell không nằm trong release này. Bản sau r15 sẽ dùng catalog quan hệ phối đồ được duyệt trong PostgreSQL/Admin, exact product/POS validation và analytics riêng.

## Admin funnel read grant r13.4

- `lana_admin_readonly` có SELECT riêng trên ledger ẩn danh `sales_cycle_events`; không có thêm quyền với PII, secret, giá hoặc tồn.
- Tám nguồn dashboard kiểm tra đạt 8/8; sau grant không còn log ACL `42501` trong nhịp tự làm mới.
- Không restart container và không thay image; release chỉ ghi nhận source-of-truth và trạng thái quyền production.

## Size Chart idempotent retry hotfix r13.3

- Source `5e4ec2b23d33cb6aeb4aaacb1c96fe7ce27727ba`; image `lana-chatbot-app:sizechart-idempotent-retry-5e4ec2b`, digest `sha256:0d4378bb84c389ab385e868f92f53bc54f462f332a413af05679a7540e526a36`.
- Pre-check identity `parent_product_id + image_sha256 + extractor_version` chạy trước download/Vertex; snapshot đã có không phát sinh chi phí AI.
- Full repo `746/746`; worker `243/243`. r13.2 không deploy; chỉ `size-chart-extractor` được thay từ r13.1 sang r13.3.

## Size Chart retry hotfix r13.2 (không deploy)

- Source `5794dde5369eb3e924b64708465270b2a03c7bec`; image `lana-chatbot-app:sizechart-retry-hotfix-5794dde`, digest `sha256:664586d227307d3f92fcb103119d5e17c2dee804eddc46912a32af026a1cc632`.
- Lỗi tạm thời 408/425/429/5xx và lỗi mạng được retry sau 5 phút; ảnh cần duyệt giữ lịch 24 giờ để tránh tốn phí.
- Full repo `745/745`; worker `242/242`. Chỉ `size-chart-extractor` thay image; realtime/Admin giữ r13.1.

## Size Chart + ProductFactsV2 candidate r13.1

- Hotfix source: `8f2de6f75295edbee31d4e7a4f6e4cf70a78228c`; image Node 22 `lana-chatbot-app:sizechart-facts-v2-vertex-hotfix-8f2de6f`, digest `sha256:e1cd443cd407fbfba9828743959a184eb320610b25ec532711aeaf8dc8f3e6aa`.
- Vertex response schema đã tương thích API thật. Smoke tối đa 10 ảnh tạo 1 DRAFT `GARMENT` với confidence 0.9; chart GARMENT bị chặn APPROVE/runtime, chỉ chart BODY đã VERIFIED được tư vấn size.
- Worker Size Chart dùng role PostgreSQL riêng `lana_size_chart_worker`, chỉ có SELECT/INSERT trên extraction, artifact version và artifact event.
- Full repo đạt `744/744`; worker `241/241`, gồm `30/30` kịch bản Messenger. Canary Messenger thật vẫn chưa được tính.

- Source code: `5d401b26792c1705ab6c76f452484f2c7a2d4232`; image Node 22 `lana-chatbot-app:sizechart-facts-v2-5d401b2`, digest `sha256:2cbc3fcc7d14e321730531e9af92ce6cca4ab5b64057796f1ea09035c8e464f4`.
- Size Chart chạy app-native: đọc ảnh `SIZE_GUIDE/SIZE_CHART/BANG_SIZE` từ `image_registry`, resize trong app, trích xuất có schema bằng Vertex, chỉ staging bảng số đo cơ thể đủ confidence thành `DRAFT`. Runtime chỉ dùng chart đã được Admin duyệt và đánh dấu `VERIFIED`.
- Realtime đã nối ProductFactsV2 từ POS snapshot + Qdrant stable + policy đã duyệt. POS vẫn là nguồn chuẩn BOM/giá/tồn; Media Selector V2 chọn đúng mục đích và thành phần, không lấy ảnh loại khác thay khi thiếu.
- Đã sửa profile tiếng Việt có/không dấu, bằng chứng variant chỉ từ chữ khách nhập và phân tách fact theo từng mã trong tin nhiều sản phẩm.
- Admin có funnel 48 giờ: hỏi giá → tư vấn size → mở giỏ → xem trước → `PURCHASE_CONFIRMED`.
- Full monorepo đạt `744/744` test; bộ mục tiêu đạt `30/30` kịch bản Messenger và `78/78` test realtime liên quan. Docker build Node 22 đạt.
- Backup trước migration: `/opt/lana-chatbot/backups/20260723-sizechart-productfacts-v2-canary-r13/lana_chatbot_pre_0020_20260723T163507Z.dump`, SHA-256 `5fb8c606aeab172687a5cb63faf507c54adbdcc747c5879aeecc6f2caa9d707d`. Restore-test `up → down → up` đạt trên database tạm.
- Compose đã khôi phục khai báo P2.3A/P2.3C app-native đang chạy để tránh orphan ownership; không bật lại workflow n8n tương ứng.
- Sau cutover chỉ page `1198992073286645` được phép outbound. Canary kết thúc khi đạt 100 inbound xử lý hoặc đủ 48 giờ, điều kiện nào đến trước; 30 replay không được tính vào bằng chứng live.

## Realtime Wave 2/3 CANARY_LIVE

- Chỉ page `1198992073286645` có `routing_owner=APP`, `app_send_enabled=true`, `kill_switch=false`; không mở thêm page.
- Wave 2 bật Customer Profile số đo pseudonymous TTL 48 giờ, merge theo field bằng revision/CAS, verified variant qua POS snapshot và model context 10 tin. Retention Redis 20 ngày/PostgreSQL 6 tháng không đổi.
- Size engine chỉ dùng size chart đã xác minh. Thiếu chart/dữ liệu thì hỏi thêm hoặc handoff; không đoán size. Tên, số điện thoại và địa chỉ không vào profile này.
- Wave 3 bật BusinessFactQueriesV2 tối đa ba product query, catalog advisory từ metadata có cấu trúc và decision audit v2 bằng hash/source version/reason code, không lưu raw model body/PII/secret.
- Migration `0019_customer_profile_wave2` đã backup, restore-test `up → down → up` và áp dụng production. Backup: `/opt/lana-chatbot/backups/20260723-realtime-wave23-canary-r12/lana_chatbot_pre_0019.dump`, SHA-256 `4e163ffbf6bbc4239035c3086d7bf51ba37b6067bf2f70c268e995d529b0ab76`.
- Full build/typecheck và `739/739` test đạt. Sau cutover worker `LIVE/IDLE`, heartbeat fresh, restart count 0, `ambiguous_recent=0`, duplicate `reply_plan_id + sequence_no=0`.
- Rollback/roll-forward sáu feature flag đạt trong 15 giây; migration additive và profile đã ghi được giữ nguyên khi rollback.
- Khi số đo xung đột, runtime ưu tiên giá trị có `observedAt` mới nhất; bản ghi cũ đến trễ không được ghi đè ngược. Test hội thoại Messenger trực tiếp vẫn là gate trước promotion rộng.

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

## Admin manual image intake r14

- Release live: `/opt/lana-chatbot/releases/20260724-admin-manual-image-intake-r14`, source commit `8ee39ac936b3d2262c6ebbed8d73f5f062900a13`.
- Admin API, Admin Web và P2.3B dùng image digest `sha256:889e3c88d0e7fc66db3079072b6cc2a7e083a56ed0c72d622437aeab6b429275`; cả ba healthy và restart count 0 sau cutover.
- File upload được lưu tại volume Nginx Proxy Manager `public-assets/products` và chỉ public trên host `admin.lanadesign.vn` qua `/lana-public/products/`.
- `manual_image_intake` là hàng đợi staging. Upload không đi thẳng Qdrant; P2.3B ghi `image_registry`, quản trị viên duyệt, rồi P2.3C mới publish.
- Meta token được xác minh qua Graph API đúng page `1198992073286645`. Bộ đếm canary 100 inbound thật bắt đầu lúc `2026-07-23T19:14:08Z`; phạm vi page không đổi.
- Rollback ứng dụng về r13.4 không yêu cầu xóa file, Redis hoặc PostgreSQL; giữ lại intake/audit để phân tích.

## Admin upload resize retention r14.2

- Release live: `/opt/lana-chatbot/releases/20260724-admin-upload-resize-retention-r14.2`, source commit `737568e5c64a6481eb6c14ab9eb65700f1dcb4bf`.
- Admin API/Admin Web dùng image digest `sha256:279a937ccc2c2187552bcfe5df45d2a813bd400742e6d294026939682c5cc4d5`; cả hai healthy và restart count 0 sau cutover.
- Ảnh manual được resize bằng FFmpeg, giữ đúng tỉ lệ, không upscale và giới hạn cạnh dài 1.600 px. Smoke thật đạt JPG/PNG/WebP ở `1067x1600`.
- URL ghi vào `manual_image_intake` luôn trỏ tới bản resize trong vùng public. Ảnh gốc nằm tại `/var/lib/lana-chatbot/product-media-originals`, không public.
- Cleanup chạy mỗi giờ và xóa ảnh gốc quá 24 giờ; khi Admin API khởi động sẽ dọn bù. Bản resize không bị xóa theo TTL ảnh gốc.
- Chỉ Admin API/Admin Web được recreate. Realtime, delivery, P2.3 và n8n giữ nguyên, đều không restart trong release này.
- Rollback về r14 không cần xóa file hay dữ liệu Sheet; giữ nguyên bản resize để các URL đã phát hành không hỏng.
