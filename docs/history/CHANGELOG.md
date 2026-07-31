# Changelog

## 2026-07-31 — Proactive verified size advice r31.2

- Khi hồ sơ đã đủ chiều cao/cân nặng, runtime gọi Size Engine ngay và tư vấn size từ bảng size đã xác minh; không hỏi khách có muốn tư vấn hay không.
- Thiếu cân nặng chỉ hỏi cân nặng, thiếu chiều cao chỉ hỏi chiều cao; thiếu cả hai mới hỏi cả hai.
- Nếu bảng size cần thêm số đo hoặc sở thích độ ôm/rộng, bot chỉ hỏi đúng dữ liệu engine còn thiếu.
- Không có bảng size xác minh thì `HANDOFF` với `BUSINESS_FACT_UNAVAILABLE`; model không được đoán size.
- Wave 2 không gắn CTA xin phép tư vấn dư thừa; loại toàn bộ wording “đối chiếu size” khỏi runtime và prompt.
- Không migration, không đổi page allowlist, routing ownership, Meta transport hoặc nguồn fact có thẩm quyền.
- Targeted regression `84/84` và `pnpm check` toàn monorepo đều PASS; Worker `323/323`, Business Tools `180/180`, Contracts `86/86`, golden transcript `7/7`.
- PR `#86` đã merge tại `abb37e5`; release candidate chưa deploy khi ghi mục này.

## 2026-07-31 — Contextual continuation question r31.1

- Hội thoại trước mua còn mở kết thúc bằng đúng một câu hỏi nối ngắn theo stage khi reply chưa có câu hỏi phù hợp.
- CTA xin số đo đổi từ câu trần thuật sang câu hỏi tự nhiên: `Chị cao và nặng khoảng bao nhiêu để em đối chiếu size phù hợp cho mẫu này?`.
- Nếu hồ sơ đã có số đo, bot không hỏi lại và chuyển sang hỏi khách có muốn đối chiếu size cho mẫu hiện tại hay không.
- Không gắn câu hỏi kéo dài khi `HANDOFF`, `NO_REPLY`, `READY_TO_BUY`, `ORDER_REVIEW`, `POST_SALE` hoặc Sales Cycle đang xử lý chốt đơn.
- Form báo giá vẫn là hai bong bóng text rồi mới tới ảnh; nguồn fact, Meta transport, page allowlist và routing ownership không đổi.
- Targeted regression `83/83` và `pnpm check` toàn monorepo đều PASS; Worker `322/322`, Business Tools `180/180`.
- PR `#83`, `#84` đã merge; annotated tag trỏ release commit `0ce9399`. Image được build từ tag sau khi `pnpm check` trong Docker đạt.
- Chỉ Realtime Worker được recreate; r31.1 healthy/restart 0, heartbeat tăng 15 giây, Inbox/Outbox/duplicate/failed/log lỗi mới đều 0 và Admin public vẫn 302 Authentik.
- Production đã chuyển symlink sang r31.1. Chưa có inbound khách sau cutover nên trạng thái là `DEPLOYED_VERIFIED_R31_1_HUMAN_TEST_PENDING`; không tạo inbound giả.

## 2026-07-31 — Voice Contract V2 + Hybrid Buying Intent r31

- Phản hồi tư vấn thường được giữ trong một bong bóng, ưu tiên 2 câu tự nhiên và tối đa một câu hỏi; bỏ các câu đệm kiểu ChatGPT, quảng cáo sáo rỗng và việc tách từng câu thành một tin riêng.
- Báo giá sản phẩm dùng giá VND đầy đủ; bong bóng đầu có loại/tên/mã, chất liệu, form và size đã xác minh; bong bóng thứ hai xin số đo hoặc dùng số đo đã có, ảnh gửi sau.
- Giữ loại sản phẩm thật từ catalog như `Set váy SV2447`; thiếu product context cho câu hỏi giá/mã/quảng cáo hoặc ý định mua thì handoff im lặng, không đoán sản phẩm.
- Structured model output có buying decision/action/quantity/evidence/confidence nhưng chỉ được mở hoặc sửa giỏ qua deterministic guard, product context đã xác minh, exact evidence và confidence tối thiểu `0.90`.
- `NEGATED`, `CONSIDERING`, câu hỏi thông tin và model evidence thiếu guard không tạo side effect; giá/tồn/size/ETA và attachment vẫn do nguồn có thẩm quyền quyết định.
- Thêm `REALTIME_MESSAGE_GROUPING_V2=true`; không migration, không đổi page allowlist, routing ownership, n8n hoặc Meta delivery transport.
- `pnpm check` PASS toàn monorepo; Worker 322/322, Business Tools 178/178, Contracts 86/86 và golden transcript 7/7.
- PR `#79`, `#80`, `#81` đã merge; annotated tag trỏ commit `7286cec`. Image r31 được build từ tag sau khi `pnpm check` trong Docker đạt.
- Chỉ Realtime Worker được recreate; healthy/restart 0, heartbeat 15 giây, Inbox/Outbox active 0, duplicate 0, log lỗi mới 0, page vẫn `APP` và Admin public 302 Authentik.
- Production đã chuyển symlink sang r31. Chưa có inbound khách sau cutover nên trạng thái là `DEPLOYED_VERIFIED_R31_HUMAN_TEST_PENDING`; không tạo inbound giả.

## 2026-07-29 — Realtime trả lời có dấu và tách câu r26.2

- Bắt buộc proposal, grounded reply và grounded draft hiển thị tiếng Việt đầy đủ
  dấu Unicode; guard thay product-info theo mẫu cũ không dấu bằng proposal
  deterministic đã xác minh.
- Nhận câu chứa mã sản phẩm tự nhiên là ý định hỏi giá, không yêu cầu mã phải đứng
  riêng; không thay đổi luồng Qdrant nhận diện/rehydrate hoặc Media Selector V2.
- Bật lại `REALTIME_CONVERSATIONAL_MESSAGE_FORMAT_V1=true` và giữ
  `REALTIME_MEDIA_SELECTOR_V2_GUARD_ENABLED=true` trên page test; mỗi câu/dòng là
  một Meta Outbox unit và dòng chất liệu bắt đầu bằng `Chất liệu`.
- Local/Docker `pnpm check` PASS, 1.012/1.012 test; Worker 293/293, targeted
  regression 66/66 và runtime smoke không gửi Messenger PASS.
- Chỉ recreate Realtime Worker; healthy/restart 0, queue active 0, duplicate
  sequence 0, log lỗi mới 0 và mọi container khác giữ nguyên ID.
- Evidence guard ở attempt đầu đã tự rollback thành công; attempt hai dùng
  container ID động và cutover thành công. Human test đang chờ inbound mới;
  rollback target là r26.1, không cần rollback schema hoặc xóa dữ liệu.

## 2026-07-29 — Wave 2 + Gemini 3.5 Flash-Lite r26.1

- Bật Wave 2 `LIVE_100` trực tiếp trên page test duy nhất, không tạo Human Test Mode; strategy engine phân loại need/barrier/decision factor và áp dụng stage playbook/CTA giới hạn.
- Deterministic guard tiếp tục là quyền cuối cho fact, offer, media, checkout, handoff và outbound; `POST_SALE` không đi qua strategy engine, cross-sell chưa có relation thì fail-closed.
- Đổi mọi vị trí Gemini Flash-Lite đang hoạt động/định nghĩa từ `gemini-3.1-flash-lite` sang `gemini-3.5-flash-lite`.
- Thêm migration `0023_wave2_strategy_metrics`, dashboard PII-free và Wave 2 annotation taxonomy.
- Restore-test lần đầu phát hiện rollback view không thể bỏ cột bằng `CREATE OR REPLACE`; PR #51 sửa bằng recreate view có bảo toàn owner/ACL. Production chỉ migrate sau khi `up → down → up` PASS.
- Local/Docker `pnpm check` PASS, 1011/1011 test; bảy service r26.1 restart 0, Admin 200/302 Authentik, queue active 0 và duplicate Meta sequence 0.
- Human test đang chờ message đầu tiên sau deploy; application rollback về r25 không cần rollback schema hoặc xóa dữ liệu.

## 2026-07-29 — Media Selector V2 guard r25

- Giữ Qdrant cho nhận diện cutout/raw và exact-code catalog rehydration; chuyển quyền quyết định attachment product-info sang Media Selector V2.
- Guard nhận allowlist đúng bằng các URL V2 đã chọn, nên không còn chặn ảnh `FULL_LOOK` hợp lệ chỉ vì URL đó không nằm trong tập `PRICE_CARD` suy ra từ Qdrant point.
- V2 trả `NONE` thì không fallback ảnh `PRICE_CARD` cũ; attachment không hợp lệ bị loại riêng và text đã xác minh vẫn được giữ.
- Thêm flag `REALTIME_MEDIA_SELECTOR_V2_GUARD_ENABLED`, mặc định `false`; chỉ bật `true` cho page test `1198992073286645`.
- Local và Docker `pnpm check` PASS; monorepo 1000/1000, Business Tools 162/162, Worker 292/292, targeted realtime-runner 46/46.
- Chỉ recreate Realtime Worker; healthy/restart 0, Qdrant green 917 point, page `APP`, Inbox/Outbox active 0, duplicate sequence 0, log lỗi mới 0 và mọi container khác giữ nguyên ID.
- Human test Messenger đang chờ một inbound mới sau deploy; rollback bằng flag hoặc image/release r24, không xóa dữ liệu.

## 2026-07-29 — Realtime message format r24

- Tách mọi outbound text theo dòng và ranh giới câu tiếng Việt ngay trước khi ghi Meta Outbox; áp dụng cho toàn bộ nhánh realtime thay vì riêng báo giá.
- Mỗi câu là một Outbox unit có sequence riêng; ảnh giữ đúng vị trí sau text và delivery vẫn chặn theo thứ tự reply plan.
- Product-info có dữ liệu chất liệu bắt đầu bằng `Chất liệu`; nhánh hỏi riêng chất liệu tiếp tục dùng label có sẵn.
- Thêm flag `REALTIME_CONVERSATIONAL_MESSAGE_FORMAT_V1`, mặc định `false`; chỉ bật `true` cho page test `1198992073286645`.
- Local và Docker `pnpm check` PASS; monorepo 998/998, Worker 292/292, targeted realtime-runner 46/46; runtime smoke trên image r24 PASS.
- Chỉ recreate Realtime Worker; healthy/restart 0, page `APP`, Inbox/Outbox active 0, duplicate sequence 0 và mọi container khác giữ nguyên ID.
- Human test Messenger đang chờ một inbound mới sau deploy; rollback bằng flag hoặc image/release r23, không xóa dữ liệu.

## 2026-07-29 — Product image delivery r23

- Ưu tiên `FULL_SET/VAY → FULL_LOOK` trước góc `FRONT/BACK/SIDE`, nhưng giữ `CLOSEUP` là nhánh mạnh nhất.
- Khi Media Selector V2 không chọn được asset, proposal quay về ảnh `PRICE_CARD` đã verified thay vì tạo phản hồi chỉ có text.
- Kết quả nhận diện ảnh được exact-match lại theo mã và tổng hợp toàn bộ point catalog cùng mã trước khi dựng ProductFactsV2, text và image attachment.
- Thêm regression cho phân loại media, fallback V2 rỗng và chuỗi Outbox `TEXT → IMAGE` sau catalog rehydration.
- Local và Docker `pnpm check` PASS; toàn monorepo 997/997 test, Worker 291/291.
- Smoke SD395 trên worker live: exact catalog rehydration PASS, 10 ảnh catalog/10 verified/1 `FULL_LOOK`; fallback V2 rỗng PASS.
- Chỉ recreate Realtime Worker trên page test `1198992073286645`; healthy/restart 0, log lỗi 0, Inbox/Outbox active 0 và mọi container khác giữ nguyên ID.
- Chưa có inbound mới sau cutover nên human test Messenger vẫn chờ ảnh mới; không coi smoke nội bộ là bằng chứng Meta delivery thực tế.

## 2026-07-28 — Cutout-first + AI reranker r22

- Realtime nhận diện ảnh bằng `image_cutout` trước, dùng `image_raw` làm fallback và
  bằng chứng bất đồng; ngưỡng cutout được tách khỏi ngưỡng raw.
- Gemini `gemini-3.1-flash-lite` chỉ rerank tối đa ba candidate Qdrant và không thể
  tạo/chọn mã ngoài danh sách.
- Ảnh mới ngưng product context cũ; clarification nhận “mẫu 1/2/3”, exact candidate
  code và “không phải mẫu nào”, tối đa ba lượt trước handoff.
- Cache version mới, deadline toàn luồng 12 giây và telemetry không lưu URL/base64/PII.
- Full local/Docker check pass; Business Tools 160/160, Worker 286/286.
- Chỉ recreate Realtime Worker cho page test `1198992073286645`; healthy/restart 0,
  log lỗi 0, Inbox/Outbox active 0. API, delivery, Shadow, Admin, POS, P2.3 và n8n
  không đổi container.

## 2026-07-28 — Wave 1 recorded replay evidence r21

- Realtime app-native ghi một shadow evaluation cho inbound cuối mỗi debounce batch, page-scoped, DLP-passed, fail-open và idempotent khi retry.
- Admin Simulation dùng completed shadow evaluation có actual reply làm historical snapshot fallback; chỉ lưu hash business facts/proposal/guard, không đọc raw text.
- Simulation được cấp SELECT tối thiểu trên `shadow_evaluations`; Simulation/Shadow vẫn không có quyền ghi Meta Outbox và Shadow vẫn bị tắt outbound.
- Database 86/86, Worker 272/272, Admin Simulation 10/10, full build/typecheck, Docker full check và artifact smoke đều đạt.
- Realtime, Shadow, Admin API, Admin Simulation và Admin Web cùng chạy image r21; tất cả healthy/restart 0, FE index/asset 200 và public route 302 Authentik.
- Rollback tự động r21 → r20 đã được thực thi và xác minh khi probe đầu lỗi quoting; attempt 2 thành công. Recorded evidence hiện chờ traffic đủ điều kiện, holdout vẫn khóa và semantic candidate chưa promote.


## 2026-07-28 — Wave 1 synthetic replay + telemetry r20

- Thêm bộ 17 fixture synthetic không PII cho runtime oracle/model và reply-quality conformance; đạt 17/17, 17/17 và 13/13 với hard-safety violation 0, nhưng không được coi là production baseline.
- Semantic candidate chỉ chạy development/validation, không mở holdout và không nối production; trạng thái `NOT_PROMOTED`.
- Bổ sung telemetry alias additive cho product match, buying commitment, ready-to-buy, handoff request và no-reply selection; giữ event cũ để tương thích.
- Không phát `BUYING_SIGNAL_RETRACTED` từ purchase-confirmation rejection vì nguồn này còn gộp negation, hesitation và câu hỏi. `ORDER_CREATED` vẫn chờ POS acknowledgement.
- Local/Docker `pnpm check` pass; Dataset Review 58/58, Contracts 81/81, Database 82/82, Worker 272/272.
- Chỉ recreate Realtime Worker. Image r20 healthy/restart 0, error/warn mới 0; API/Admin API liveness nội bộ pass và Admin public route vẫn trả 302 Authentik.

## 2026-07-28 — Wave 1 benchmark foundation + clarification recovery r19

- Khóa official bundle 2.000 record, dùng 1.955 record hợp lệ và bỏ 45 parser-failed; split 1.173/391/391 theo duplicate group, leakage 0, rare/safety giữ dạng overlay.
- Tách semantic, runtime-policy và reply-quality scorer. Deterministic baseline chỉ chấm development/validation; locked holdout chưa mở.
- Validation `BUYING_COMMITTED` hiện precision 42,41% và recall 57,26%; chưa thay matcher production vì chưa đạt promotion gate.
- Bổ sung clarification state additive/optional trên Sales Cycle schema v2: lưu reason/missing/product context, tối đa ba câu hỏi không lặp, reset khi có tiến triển và handoff an toàn khi cạn budget.
- Local/Docker `pnpm check` pass; Dataset Review 51/51, Chat Runtime 32/32, Worker 272/272.
- Chỉ recreate Realtime Worker. Image r19 healthy, restart 0, không có error/warn mới; Admin public route vẫn trả 302 Authentik và service khác không restart.

## 2026-07-24 — Realtime measurement continuation r17

- Sửa lỗi khách trả lời số đo thuần như `90-60-90` bị mất ngữ cảnh sản phẩm và handoff `UNVERIFIED_PRODUCT_ID`.
- Parser lưu bare three-round tuple có guard chặt; ngày tháng, giá, số điện thoại, order ID và chuỗi có nhãn mã không bị nhận nhầm.
- Tiếp nối size nhận thêm chiều cao/cân nặng, size ngắn và màu ngắn. Sản phẩm trong state luôn exact-match; AI chỉ gợi đúng mã hiện tại và không vượt guard mã mới.
- Full monorepo `pnpm check`, Business Tools `159/159`, Worker `260/260` và image smoke đều đạt.
- Chỉ recreate Realtime Worker. Container r17 healthy/restart 0; Admin, API, delivery, POS, P2.3, shadow và n8n không restart.

## 2026-07-24 — Admin batch image intake + AI classification r16

- Giao diện Admin cho phép chọn tối đa 20 ảnh trong một lần cho cùng `BRAND + MA_SP`; bỏ hoàn toàn trường loại ảnh và ghi chú vận hành.
- UI kiểm tra mã theo catalog `product_registry` trước khi tải; Admin API kiểm tra lại cặp brand + mã và trạng thái `ACTIVE`, nên không thể ghi ảnh cho mã sai brand hoặc sản phẩm đã tắt.
- Mỗi ảnh vẫn đi qua request riêng, tối đa hai request song song, tránh vượt body limit 12 MB và cô lập lỗi từng ảnh; SHA-256 giữ idempotency khi retry/trùng.
- `manual_image_intake` thêm cột `BRAND` ở cuối để không lệch dữ liệu cũ; ảnh mới dùng `MEDIA_PURPOSE=AI_AUTO`, `STATUS=PENDING_AI`.
- P2.3B dùng Vertex gắn nhãn AI, không còn ghi `MANUAL_OVERRIDE` cho ảnh AI_AUTO. FEEDBACK/UGC chỉ là nhãn nháp và bắt buộc con người duyệt.
- Cổng xuất bản không đổi: chỉ `APPROVED + ACTIVE` mới được P2.3C đưa sang Qdrant; ảnh gốc vẫn tự xóa sau 24 giờ.




## 2026-07-24 — Admin dashboard least-privilege hotfix r15.1

- Sửa dashboard lỗi `42501` do metric checkout đọc trực tiếp `conversation_events`.
- Chuyển nguồn sang view ẩn danh `admin_conversation_events_v`; không cấp thêm quyền và không migration.
- Thêm regression test khóa data boundary; Admin API đạt `40/40` test và Docker full check đạt.
- Chỉ recreate Admin API; realtime, Admin Web, P2.3C và n8n không restart.


## 2026-07-24 — Natural checkout + purchase confirmation r15

- Thêm structured extraction cho tên, số điện thoại, địa chỉ và phương thức thanh toán từ tin nhắn tự nhiên; chỉ nhận giá trị có evidence nguyên văn, confidence đủ cao và qua deterministic validation.
- Mở rộng xác nhận mua tự nhiên bằng classifier deterministic + model fallback có evidence; phủ định, do dự, câu hỏi và yêu cầu ảnh không thể kích hoạt `PURCHASE_CONFIRMED`.
- Dựng lời thương lượng từ adjustment thực tế của cart/policy, không hard-code số tiền.
- Thêm funnel events/metrics cho thiếu thông tin nhận hàng, hoàn tất checkout, tạo preview, xác nhận bị từ chối và preview chưa chốt; telemetry không chứa PII.
- P2.3C dùng endpoint tách nền `139.162.18.93:7000`, tăng nhịp Vertex lên 6 giây; cycle đầu đạt 48/50, còn 2 lỗi Vertex 429 retryable, không có lỗi fatal.
- Docker image đạt toàn bộ `806/806` test; Realtime Worker, Admin API, Admin Web và P2.3C healthy, restart count 0. Không có migration mới.

## 2026-07-24 — Admin media + verified size guidance r14.3.1

- Sửa quyền public media thành `0755/0644`, giữ ảnh gốc private `0750/0600` và xác minh URL thật trả `200 image/jpeg`.
- Thêm lock chống upload trùng trong một Admin API process, test validation đầy đủ và đối soát orphan sau 24 giờ.
- Docker build chạy toàn bộ `pnpm check`; thêm test FFmpeg thật cho JPG/PNG/WebP và các nhánh MIME/signature/oversize/missing product/duplicate.
- Tư vấn size ưu tiên số đo mới nhất, trả confidence và giữ ảnh chart trong nhánh multi-fact.
- Chỉ gửi size guide khi Qdrant hash khớp chính xác chart artifact đã VERIFIED. Backfill payload-only đạt `73/73` point `SIZE_GUIDE` đã duyệt.
- Admin API và Realtime Worker healthy, restart count 0. P2.3C đã dùng image mới nhưng tạm dừng vì endpoint rembg `139.162.18.93:7000` timeout.
- Cross-sell được tách khỏi release này và lên kế hoạch riêng cho r15.

## 2026-07-24 — Admin upload resize retention r14.2

- Resize JPG/PNG/WebP ngay trong Admin API bằng FFmpeg, giữ đúng tỉ lệ, không phóng ảnh nhỏ và giới hạn cạnh dài 1.600 px.
- Chỉ URL bản resize được ghi vào `manual_image_intake`; ảnh gốc không public và không được P2.3B/Qdrant sử dụng.
- Ảnh gốc lưu ở volume private riêng, TTL 24 giờ; cleanup chạy mỗi giờ và chạy bù khi Admin API khởi động.
- Bản resize dùng tên deterministic theo SHA-256, được ghi atomically và giữ lâu dài để URL đã đưa vào Sheet không bị hỏng.
- Admin API `27/27`, Admin Web `23/23`, typecheck đạt. Smoke FFmpeg thật đạt cho JPG/PNG/WebP ở đầu ra `1067x1600`.
- Chỉ Admin API/Admin Web được recreate; realtime, delivery, P2.3 và n8n không restart.

## 2026-07-24 — Admin manual image intake r14

- Thêm mục `Ảnh sản phẩm` trong Admin để upload JPG/PNG/WebP tối đa 8 MB trực tiếp lên vùng lưu trữ VPS.
- Kiểm tra MA_SP phải tồn tại trong `product_registry`, kiểm tra MIME/magic bytes, đặt tên theo SHA-256 và chống ghi trùng bằng `INTAKE_ID`.
- Tự tạo/ghi tab `manual_image_intake`; P2.3B đọc ảnh manual, bổ sung ngữ cảnh sản phẩm và ghi sang `image_registry` ở trạng thái chờ duyệt.
- Giữ approval gate: chỉ `APPROVED + ACTIVE` mới được P2.3C publish sang Qdrant.
- Public URL ảnh dùng đường dẫn host-guarded `/lana-public/products/`; giao diện Admin vẫn nằm sau Authentik.
- Build Node 22 đạt; Admin API `26/26`, Admin Web `23/23`, worker `244/244` test và toàn bộ typecheck liên quan đều đạt.
- Meta Page Access Token mới đã được xác minh đúng page `1198992073286645`. Canary 100 inbound thật bắt đầu lúc `2026-07-23T19:14:08Z`.

## 2026-07-24 — Admin funnel read grant r13.4

- Cấp riêng SELECT trên ledger ẩn danh `sales_cycle_events` cho `lana_admin_readonly` để dashboard đọc funnel.
- Không mở quyền đọc hồ sơ định danh, secret hoặc bảng giá/tồn.

## 2026-07-24 — Size Chart idempotent retry hotfix r13.3

- Kiểm tra `parent_product_id + image_sha256 + extractor_version` trước khi tải ảnh và gọi Vertex.
- Chu kỳ retry bỏ qua extraction đã tồn tại, chỉ gọi lại đúng các ảnh lỗi tạm thời.
- r13.2 không được deploy; r13.3 thay thế để tránh gọi Vertex lặp và chạm quota.

## 2026-07-24 — Size Chart retry hotfix r13.2

- Scheduler retry sau 5 phút khi còn lỗi tạm thời như Vertex 429/5xx hoặc lỗi mạng.
- Ảnh cần duyệt không kích hoạt vòng retry sớm, tránh gọi Vertex lặp lại và tốn chi phí.
- Full build/typecheck/test đạt `745/745`; worker đạt `242/242`, gồm `30/30` kịch bản Messenger.
- Phạm vi deploy chỉ là `size-chart-extractor`; realtime và Admin giữ nguyên image r13.1.

## 2026-07-24 — Size Chart Vertex hotfix r13.1

- Sửa response schema để tương thích Vertex và đồng bộ enum boundary policy với contract runtime.
- Cho phép bảng đo quần áo `GARMENT` vào DRAFT để quản trị viên kiểm tra, nhưng chặn APPROVE và runtime; chỉ chart `BODY` đã xác minh mới được tư vấn size.
- Tách tài khoản PostgreSQL riêng cho worker Size Chart với quyền tối thiểu trên ba bảng staging/audit.
- Full build/typecheck/test đạt `744/744`; worker đạt `241/241`, gồm `30/30` kịch bản Messenger.
- Smoke Vertex thật tạo 1 DRAFT `GARMENT` từ tối đa 10 ảnh; kiểm tra xác nhận chưa có chart GARMENT nào được VERIFIED.
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
