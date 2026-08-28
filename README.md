# La.na Chatbot Platform

Ứng dụng chatbot Facebook Messenger cho La.na Design. Repository này là nguồn mã chuẩn cho app realtime, Admin, worker dữ liệu và các workflow n8n đã được chuẩn hóa.

## Operating mode hiện tại

- Mode: `ENGINEERING_PREPROD`.
- Process profile mặc định: `SOLO_PREPROD_MINIMAL`; tiếp tục có hiệu lực cho đến khi owner explicit thay đổi process profile hoặc operating mode.
- Live page `1198992073286645` được định nghĩa là `PREPROD_TEST_PAGE`, không phải public production.
- PR nhỏ + focused verification là đơn vị thay đổi mặc định; self-review đủ cho solo PREPROD, independent exact-head review chỉ là risk-triggered.
- Release Train không phải mặc định; chỉ dùng khi owner/risk boundary chọn rõ hoặc khi chuyển sang hardening cần ceremony mạnh hơn.
- Gate BF/E/F/U là engineering/architecture gates, không tự động đồng nghĩa production-ready.
- Chỉ owner mới có thể thay đổi process profile hoặc chuyển operating mode, bao gồm `PRODUCTION_HARDENING`.

**Vị trí chương trình hiện tại:** `GATE_F_PREPROD_ACCEPTED / DF_C_COMPLETE`. PREPROD test page đang chạy exact COMMERCE release với `stateReadMode=LEGACY`; controlled Messenger E2E và exact rollback/reactivation lifecycle đã PASS. Xem [DF13 / Gate F acceptance record](docs/current/architecture-program/DF13_GATE_F_PREPROD_ACCEPTANCE_20260828.md). BF-03 vẫn foundation-only/non-activatable, BF-04 vẫn `PARTIAL / KNOWN_GAP`, BF-10 vẫn còn natural-terminal residual, và `DATABASE_URL` remediation vẫn tách riêng; không residual nào được diễn giải là đã sửa. Đây không phải public-production promotion, page expansion, UR/State V2 approval hay quyền xoá LEGACY.

Nguồn governance authoritative: [Operating Mode](docs/current/architecture-program/OPERATING_MODE.md). Việc đổi mode không thay đổi verified-claim, side-effect authorization, SSRF, PII/secret, auth, database-safety, authority-transition, rollback hoặc release-integrity invariants.

## Nguồn chuẩn

- Repository: `github.com/nguyentuanson27-netizen/lanchatbot`.
- Exact running source được xác định từ resolved `current` release và release-local source identity; generated runtime-state/history là supporting evidence khi còn current. Unknown hoặc mismatched live identity phải fail closed.
- Page canary duy nhất: `1198992073286645`.
- Meta reply: app gửi trực tiếp qua Meta Send API.
- Pancake: chỉ quan sát/gắn tag và hỗ trợ handoff; không gửi reply cho khách.

Không sửa source trực tiếp trong `/opt/lana-chatbot/current`. Thay đổi source mặc định đi qua `branch -> focused verification -> PR -> exact-head verification -> merge`; backend verification theo [Operating Mode](docs/current/architecture-program/OPERATING_MODE.md). Merge không tự deploy. Khi owner yêu cầu deploy một commit/candidate cụ thể lên `PREPROD_TEST_PAGE`, chính yêu cầu đó là authorization cho scoped deploy. Deploy phải dùng exact merged commit, release/build identity mới, và giữ exact previous release/build/commit cho từng service bị tác động trong một release-local machine-readable record tối thiểu; nếu authority/config boundary thay đổi, record đó cũng giữ exact previous authority/config identity. Release Train/tag/full manifest/runtime-state promotion không phải gate mặc định nếu không có risk cụ thể yêu cầu.

Khi chạy coding agent trực tiếp trên VPS, hãy bắt đầu tại `/opt/lana-chatbot/repository`. Agent phải đọc `AGENTS.md` trước khi thao tác; working tree này không phải live runtime. User `lana-deploy` có deploy key GitHub read-only chỉ cho repository này; được phép `fetch` commit nhưng không được push.

## Snapshot runtime lịch sử ngày 2026-08-01

Phần này giữ nguyên thuật ngữ của bằng chứng lịch sử. Nó không định nghĩa operating mode hiện tại hoặc chứng minh public-production readiness.

- **Snapshot test-page canary (2026-08-01):** historical evidence only; inspect generated runtime state and its append-only evidence before making any current production-status assertion.
- **HISTORICAL_DEPLOYED_VERIFIED_R32_1:** bằng chứng deploy r32.1 được giữ nguyên cho audit, nhưng runtime Realtime đã bị supersede do incident compatibility; không dùng trạng thái này để khẳng định production hiện tại.
- Queue containment hiện giữ `1` Inbox `FAILED_PERMANENT`; 2 response group cũ đã được [operator CANCEL có audit](deploy/manifests/20260801-r32.2-outbox-cancellation.json), tạo `4` Outbox `FAILED_PERMANENT`. Actionable/MANUAL_REVIEW/stuck đều `0`, chưa record nào được requeue.
- Full evidence: [Realtime audit r32.1](docs/current/REALTIME_AUDIT_R32_1_20260731.md) and [deployment manifest](deploy/manifests/20260731-realtime-audit-safety-r32.1.json).
- **IMPLEMENTED_CANARY_CONTAINED:** [Release r32.2 — Compatibility First](docs/current/REALTIME_R32_2_COMPATIBILITY_FIRST_PLAN_20260731.md) đã deploy cho page test; owner đã cho phép mở outbound riêng page này nhưng chưa mở rộng allowlist và chưa requeue.
- **ROLLED_BACK_R31_3_OUTBOUND_LOCKED:** [execution manifest](deploy/manifests/20260801-realtime-r31.3-containment-rollback.json), [r32.1 incident addendum](deploy/manifests/20260801-r32.1-incident-containment.json) và [runbook](docs/current/REALTIME_R31_3_ROLLBACK_RUNBOOK_20260801.md) lưu trạng thái rollback lịch sử; trạng thái khóa này đã được supersede bởi lần mở page test ngày 2026-08-01. Không requeue record cũ.
- **R32.2 TEST-PAGE OUTBOUND ENABLED — CANARY OBSERVATION REQUIRED:** Artifact/runtime, backup/restore-test, migration 0028–0029, 40/40 post-cutover regression và target health đều đạt. Queue health đã về 200 sau [audited cancellation](deploy/manifests/20260801-r32.2-outbox-cancellation.json); outbound hiện mở cho duy nhất page test theo [gate-change evidence](deploy/manifests/20260801-r32.2-test-page-outbound-enabled.json). Chưa requeue Inbox lỗi và chưa tuyên bố full production promotion.


- Live runtime status is generated runtime-state evidence; do not use this README to identify the current release.
- r30 đã **DEPLOYED_VERIFIED_R30**; bản vá đứng giao diện, C1, B2, B3 và B4 đã qua backup/restore-test, guarded cutover và canary thật.
- r31 đã **DEPLOYED_VERIFIED_R31_HUMAN_TEST_PENDING**: Voice Contract V2, form báo giá hai bong bóng và Hybrid Buying Intent có guard đã live; chưa có inbound khách sau cutover nên còn chờ human test Messenger.
- Hotfix câu hỏi nối r31.1 đã **DEPLOYED_VERIFIED_R31_1_HUMAN_TEST_PENDING**: đúng một câu hỏi nối cho pre-sale còn mở, không hỏi lại số đo; chốt đơn, hậu mãi và handoff không bị kéo dài. Chưa có inbound khách sau cutover nên còn chờ human test Messenger.
- r31.2 đã **DEPLOYED_VERIFIED_R31_2_HUMAN_TEST_PENDING**: đủ chiều cao/cân nặng thì Size Engine tư vấn ngay từ bảng size đã xác minh; thiếu trường nào chỉ hỏi trường đó, thiếu bảng size thì handoff. Chưa có inbound khách sau cutover nên còn chờ human test Messenger.
- r31.3 đã **DEPLOYED_VERIFIED_R31_3** với quota `500` lượt AI/giờ và `2.000` lượt AI/ngày cho mỗi page; quota chỉ tính lượt gọi AI, không tính reply deterministic hoặc Meta message unit.
- r31 không có migration và chỉ recreate Realtime Worker; giá/tồn/size/ETA, attachment và side effect vẫn do nguồn deterministic đã xác minh quyết định.
- Realtime phân loại need/barrier/decision factor/strategy, áp dụng stage playbook và đúng một câu hỏi nối khi pre-sale còn mở. Deterministic guard vẫn là quyền quyết định cuối cho fact, offer, media, checkout, handoff và outbound.
- Realtime và Delivery r32.2 đều healthy/restart 0; Delivery live/ready trả 200. Queue health trả 503 do 2 descendant cũ bị giữ, nên outbound chưa được mở. Shadow, Admin, POS, P2.3, Size Chart, n8n và các service ngoài phạm vi không bị recreate.
- Mọi vị trí Gemini Flash-Lite đang hoạt động hoặc được định nghĩa trong release dùng `gemini-3.5-flash-lite`: realtime, Shadow, media reranker, P2.3B và Size Chart.
- Migration production mới nhất là `0029_meta_outbox_handoff_ordering`; backup trước r32.2 SHA-256 `da85c24…637c`, restore-test và migration idempotency đạt. Migration 0027–0029 đều additive; không down migration hoặc xóa dữ liệu.
- Admin API/Web trả 200 nội bộ và public route trả 302 sang Authentik. FE1–FE3 bổ sung UX ổn định, server-side search/pagination, Handoff SLA Console và Conversation Inspector PII-safe.
- Rollback target của r32.2 là Realtime r31.3 và Delivery r27.1; migration 0027–0029 additive được giữ lại. Qdrant, dữ liệu hội thoại, audit, Inbox/Outbox và page allowlist không bị xóa.
- Khi Media Selector V2 trả `NONE`, bot giữ text đã xác minh và không fallback sang ảnh `PRICE_CARD` cũ; attachment không hợp lệ bị loại mà không làm mất text.
- r26.2 khôi phục contract tiếng Việt có dấu, chặn product-info theo mẫu cũ không dấu, giữ mỗi câu/dòng là một Meta Outbox unit riêng và bắt đầu dòng chất liệu đã xác minh bằng `Chất liệu`.
- Wave 1 r21 chạy từ merge commit `5f817bbc`: official benchmark vẫn khóa 1.955 hội thoại hợp lệ, split 1.173/391/391, leakage 0; holdout chưa mở.
- Wave 1 r21 vẫn là nền benchmark/replay; tại thời điểm snapshot, realtime dùng binary r32.2 trong containment và chưa mở locked holdout.
- Semantic candidate vẫn `NOT_PROMOTED`: validation `BUYING_COMMITTED` precision `42,41%`, recall `57,26%`. Production replay đang `WAITING_FOR_ELIGIBLE_TRAFFIC`; không tạo inbound giả và locked holdout vẫn đóng.
- Admin API chạy image r32.1, Admin Web chạy image r30, Realtime/Delivery chạy image r32.2; Simulation Worker giữ image cũ. Admin FE/API nội bộ đều 200 và public route trả 302 sang Authentik.

- Page allowlist vẫn chỉ có `1198992073286645`; API giữ binary r27.1, Delivery r32.2 thêm group gate/health và outbound database gate đã mở cho page test này. POS, P2.3A/C và n8n không thay đổi ownership.
- Dashboard đọc checkout drop-off qua view ẩn danh `admin_conversation_events_v`; không mở quyền bảng hội thoại gốc cho tài khoản Admin.
- Checkout tự nhiên dùng structured extraction có evidence/confidence và deterministic guard; app không đưa PII vào decision telemetry.
- Xác nhận mua hiểu thêm các cách nói tự nhiên nhưng vẫn chặn câu hỏi, phủ định, do dự và yêu cầu ảnh. `OK` chỉ xác nhận khi cart đang ở đúng bước order preview.
- Nội dung thương lượng lấy trực tiếp từ adjustment thật của cart/policy; dashboard có thêm chỉ số thiếu thông tin nhận hàng và preview chưa chốt.
- Ảnh upload thủ công dùng quyền public `0755/0644`, private `0750/0600`; có khóa chống ghi trùng trong một process và cơ chế đối soát orphan sau 24 giờ.
- Tư vấn size ưu tiên số đo mới nhất, trả độ tin cậy và chỉ đính kèm ảnh size guide khi URL cùng SHA-256 với size-chart artifact đã xác minh.
- 73/73 point `SIZE_GUIDE` đã duyệt được backfill hash provenance trong Qdrant mà không tạo lại embedding.
- P2.3C đang chạy với endpoint tách nền `139.162.18.93:7000`, khoảng cách gọi Vertex 6 giây và giữ nguyên lỗi retryable cho chu kỳ sau.
- P2.3C Hash v3 đang `LIVE` trên image redacted: `956/956` point đã có ba hash; migration giữ nguyên `889` vector payload/provenance, tạo `38` point thiếu và tạo lại đúng `29` vector semantic; `error_sample` không còn log URL ảnh.
- Cross-sell được để cho bản sau r15, dùng quan hệ phối đồ được duyệt trong PostgreSQL/Admin; không dùng similarity để tự gợi ý.
- API webhook chạy image `lana-chatbot-app:ad-acquisition-r27.1`; routing/ownership và send guard giữ nguyên.
- Realtime page test chạy image r32.2 với quota `500/2.000`, Wave 2 `LIVE_100`, Voice Contract V2, Compatibility First cho size/Vertex/CTA, group gate fail-closed, Hybrid Buying Intent và Media Selector V2; outbound đã mở cho page `1198992073286645` để chạy canary Messenger có kiểm soát.
- Shadow worker chạy image r26.1 với Gemini 3.5 Flash-Lite và Judge v2 ở `DRY_RUN`; send false và role DB không có quyền ghi Meta Outbox.
- Admin API chạy image r32.1, Admin Web chạy image r30, Realtime/Delivery chạy image r32.2; Simulation Worker giữ image cũ. Admin FE/API nội bộ đều 200 và public route trả 302 sang Authentik.
- Runtime Policy Resolver đang `PUBLISHED` và bị hard-gate chỉ cho page `1198992073286645`; page khác bị từ chối trước khi đọc policy.
- Bốn policy runtime (shop, offer, closing, payment) đang trỏ tới các version `PUBLISHED` bất biến; `SHOP_POLICY` v2 chứa chính sách chăm sóc khách hàng có cấu trúc và mọi lần chuyển trạng thái đều có audit.
- Chu trình bán hàng production đã nối cart 48 giờ, thương lượng deterministic, giảm 5% từ hai sản phẩm, freeship/giảm cuối theo policy, thu thông tin nhận hàng, order preview và `PURCHASE_CONFIRMED`.
- COD và chuyển khoản MB Bank được đọc từ `PAYMENT_POLICY`; app không hard-code tài khoản. Ảnh bill luôn chuyển nhân viên kiểm tra.
- Sales-cycle state được mã hóa trong PostgreSQL; event là append-only. Giá/tồn/size/ETA được kiểm tra lại trước preview và xác nhận.
- Simulation Worker chạy side-effect-free. Baseline trước publish là `HISTORICAL_ACTUAL` và kết quả `INSUFFICIENT_EVIDENCE`; owner đã chủ động override điều kiện này khi phát hành r4.
- Câu hỏi tiếp nối về ảnh/giá/tồn/size/ETA dùng `state.currentProductId` đã xác minh khi khách không nêu mã mới; mã mới không tìm thấy không được lùi về sản phẩm cũ.
- Câu trả lời số đo thuần như `90-60-90`, `1m60 52kg`, size hoặc màu được coi là lượt tư vấn size của sản phẩm đang xem. Mã trong state luôn được exact-match lại; AI chỉ được gợi lại đúng mã đang lưu và không thể vượt guard khi khách nêu mã mới.
- Customer Profile số đo dùng khóa khách đã băm, merge theo field bằng revision/CAS và tự hết hạn sau 48 giờ; không chứa tên, số điện thoại hoặc địa chỉ. Size engine chỉ dùng size chart đã xác minh, thiếu dữ liệu thì hỏi tiếp hoặc handoff, không đoán.
- Mention màu/size được map qua POS snapshot; nhãn màu không bị ghi giả thành POS color ID. Context gửi model giảm từ 30 xuống 10 tin nhưng retention Redis 20 ngày và PostgreSQL 6 tháng không đổi.
- Một lượt có thể hỏi tối đa ba sản phẩm và nhiều facts giá/tồn/size/ETA; mỗi fact vẫn lấy từ typed business adapter. Catalog advisory ưu tiên metadata có cấu trúc, chỉ dùng `DESCRIPTION_XML` làm fallback được kiểm soát.
- Decision audit v2 lưu hash của proposal/guard/reply, source version, latency và kết quả từng fact query; không lưu raw model body, secret hay dữ liệu định danh.
- Hậu mãi ngắt sớm trước product search/model, gửi đúng một câu giữ chân qua Meta Outbox rồi handoff/gắn tag Vận Đơn. Handoff khác vẫn im lặng.
- Tin nhắn khách được gom sau 5 giây yên lặng; webhook trùng không kéo dài cửa sổ chờ.
- Báo giá dùng tên sản phẩm từ Qdrant; `DESCRIPTION_XML` chỉ làm ngữ cảnh cho câu mô tả form/chất liệu. Mỗi câu/dòng text là một lần gửi, phần chất liệu có tiền tố `Chất liệu`, ảnh đủ điều kiện gửi sau text và vẫn bị chặn bởi thứ tự Outbox.
- Ý định “ảnh cận chất/cận vải” được định tuyến rõ sang nhóm `DETAIL`, không còn rơi về ảnh `GENERIC`.
- P2.3B retry Google Sheets tối đa ba lần với khoảng chờ 2–5–15 giây. Nếu cả chuỗi vẫn lỗi, worker chạy lại sau 5 phút; thành công mới trở về lịch 24 giờ.
- Admin phân biệt lỗi gần nhất (`degraded`) với mất heartbeat quá 26 giờ (`down`); P2.3B đã bật status reporting vào PostgreSQL.
- Câu hỏi chính sách trước mua được trả lời deterministic từ `shop-policy-customer-care-v2`, không gọi model hoặc Qdrant. App phân biệt hỏi quy định với yêu cầu xử lý đơn sau mua; hậu mãi vẫn gửi câu giữ chân, handoff và gắn tag Vận Đơn.
- Durable Inbox, Meta Outbox, Pancake Tag Outbox và generation guard đang hoạt động.
- Lịch sử tư vấn được chiếu sang Redis 20 ngày và lưu bản ẩn danh trong PostgreSQL 6 tháng.
- Admin dùng Authentik, Google account và MFA.
- App-native workers đang sở hữu POS snapshot và P2.3A/B/C.
- Admin có mục `Ảnh sản phẩm`: chọn tối đa 20 ảnh cho cùng `BRAND + MA_SP`; UI và API cùng kiểm tra mã trong `product_registry`, tải tối đa hai ảnh song song và ghi idempotent vào `manual_image_intake`.
- Người vận hành không chọn loại ảnh. Ảnh mới có `MEDIA_PURPOSE=AI_AUTO`, `STATUS=PENDING_AI`; P2.3B gắn metadata AI vào `image_registry` nhưng không ghi `MANUAL_OVERRIDE`. P2.3C chỉ publish hàng `APPROVED + ACTIVE` sang Qdrant.
- Ảnh upload manual được giữ đúng tỉ lệ và thu cạnh dài về tối đa 1.600 px trước khi tạo URL/ghi Sheet. Ảnh gốc nằm ở vùng private, tự dọn sau 24 giờ; bản resize không bị dọn theo TTL này.
- Canary Messenger 100 inbound thật bắt đầu lúc `2026-07-23T19:14:08Z` (`2026-07-24 02:14:08 +07:00`) cho duy nhất page `1198992073286645`; không tạo inbound giả.
- Các workflow n8n P2.2/P2.3 tương ứng đang inactive; không được kích hoạt đồng thời với app-native worker.
- Timer `lana-p23-daily.timer` đang `disabled/inactive`.
- PostgreSQL đã áp dụng migration đến `0029_meta_outbox_handoff_ordering`; migration 0024 vẫn tạo `admin_acquisition_sessions_v` với funnel/dimension Meta Ads nhưng ẩn `customer_hash`, raw message và raw event metadata.
- n8n `2.28.6` vẫn chạy các workflow legacy cho các page/nhóm việc khác. Workflow chatbot n8n chính vẫn active nhưng page canary đã được tách sang app.

Chi tiết bằng chứng runtime và ownership nằm tại [Production baseline](docs/current/PRODUCTION_BASELINE_20260722.md). Runtime chung theo [Performance/UI Stability r30](deploy/manifests/20260730-performance-ui-stability-r30.json); P2.3C theo [Hash v3](deploy/manifests/20260730-p23c-hash-v3-compose.json). Rollback P2.3C tắt `P23C_HASH_V3_MODE` và recreate riêng publisher; không xóa Inbox/Outbox, Redis, PostgreSQL hoặc Qdrant.

## Kiến trúc dữ liệu

| Dữ liệu | Nguồn có thẩm quyền |
|---|---|
| Webhook và gửi tin | Meta |
| Tag hội thoại | Pancake |
| BOM, giá, tồn | Pancake POS |
| Snapshot vận hành hiện tại | Google Sheets → app worker → Redis/PostgreSQL |
| Tìm sản phẩm, vector nhận diện và catalog rehydration | Qdrant |
| Ảnh product-info gửi ra | Media Selector V2 từ catalog đã xác minh |
| Hội thoại, Inbox/Outbox, audit | PostgreSQL |
| Cache và projection realtime | Redis |
| Prompt/model | Release manifest |

Giá, tồn, size, ETA, phí ship, freeship và ưu đãi không được model tự tạo. Model chỉ hiểu ý và soạn câu; lớp nghiệp vụ deterministic quyết định facts và hành động nhạy cảm.

## Thành phần chính

```text
apps/api                    Meta webhook và internal API
apps/worker                 Realtime, delivery, media, POS và P2.3 workers
apps/admin-api              API quản trị
apps/admin-web              Giao diện quản trị
apps/admin-control-worker   Lệnh quản trị và đồng bộ tag
apps/admin-simulation-worker Replay policy side-effect-free trên lịch sử ẩn danh
packages/contracts          Schema dùng chung
packages/database           Migration và repository PostgreSQL
packages/dataset-store      Dataset persistence encrypted/review/import/annotation/prelabel
packages/business-tools     Facts và policy guard
packages/conversation-engine Trạng thái, ownership và handoff
packages/meta-delivery      Meta Outbox
packages/pancake-handoff    Pancake tag observation/outbox
n8n                         Workflow export tham khảo/vận hành
deploy                      Compose, smoke, rollback và manifest
```

## Thiết lập phát triển

Yêu cầu Node.js `>=22` và pnpm `10.12.4`.

```bash
pnpm install --frozen-lockfile
pnpm check
```

Không dùng credential live trong môi trường phát triển. Chỉ copy `.env.example` và các file `deploy/.env.*.example`; secret thật nằm ngoài repository.

## Quy trình release

Trong `ENGINEERING_PREPROD`, `SOLO_PREPROD_MINIMAL` là mặc định cho đến khi owner explicit đổi profile/mode:

1. Tạo branch từ `main`.
2. Giữ PR nhỏ và chạy focused verification theo contract/risk boundary bị tác động.
3. Exact PR head phải có verification evidence theo [Operating Mode](docs/current/architecture-program/OPERATING_MODE.md) rồi mới merge `main`; independent exact-head review là risk-triggered, không phải gate mặc định.
4. Merge không tự deploy. Khi owner yêu cầu deploy candidate/commit cụ thể lên `PREPROD_TEST_PAGE`, chính yêu cầu đó là scoped deploy authorization.
5. Deploy exact merged commit vào release/build mới cho các service bị tác động; trước activation lưu selected source commit, new release/build identity và exact previous release/build/commit **cho từng affected service** trong một release-local machine-readable record tối thiểu. Nếu authority/config boundary thay đổi, record đó cũng lưu exact previous authority/config identity.
6. Backup trước migration có rủi ro; migration/authority switch/routing/page-allowlist/destructive data action ngoài scope deploy vẫn cần authorization riêng.
7. Trước activation/switch, chạy candidate readiness/health check có ý nghĩa khi chưa phục vụ live traffic. Sau activation, chạy live health/smoke/readback/controlled check; check chỉ có nghĩa sau activation không bị ép chạy trước. Fail hoặc unknown thì dừng mutation tiếp theo và rollback affected service(s) về đúng previous identity.

Release Train, annotated tag/full manifest, runtime-state promotion ceremony và exhaustive attestation chỉ dùng khi một risk boundary cụ thể yêu cầu, khi owner chọn rõ, hoặc trong profile/hardening khác.

Không recreate toàn bộ compose khi chỉ cần cập nhật một service; các service production hiện dùng nhiều image digest khác nhau.

## Quy tắc an toàn repository

- Không commit `.env`, token, key, database, Redis dump, nội dung chat thô hoặc PII.
- Không commit `node_modules`, `dist`, `outputs`, backup và artifact tạm.
- Workflow n8n chỉ được commit sau khi kiểm tra không có token hard-code.
- Deploy key trên VPS là read-only và chỉ gắn với repository này.
- GitHub là nguồn chuẩn; VPS là runtime, không phải nơi phát triển source.

## Tài liệu

- [Architecture Program — active BF/DF/UR context index](docs/current/architecture-program/README.md) — nguồn định tuyến context gọn; không tự cấp quyền merge hoặc deploy
- [Operating Mode — ENGINEERING_PREPROD governance](docs/current/architecture-program/OPERATING_MODE.md) — định nghĩa `SOLO_PREPROD_MINIMAL`, Gate semantics, PREPROD_TEST_PAGE và trigger thay đổi process/mode
- [DF13 / Gate F PREPROD acceptance](docs/current/architecture-program/DF13_GATE_F_PREPROD_ACCEPTANCE_20260828.md) — exact COMMERCE runtime, rollback/reactivation và Messenger E2E evidence
- [DF13 operational-acceptance preparation](docs/current/architecture-program/DF13_OPERATIONAL_ACCEPTANCE_PREPARATION.md) — preparation/runbook retained for traceability
- [Production baseline và ownership](docs/current/PRODUCTION_BASELINE_20260722.md)
- [Kế hoạch nâng cấp Realtime Sales Agent](docs/current/REALTIME_AGENT_UPGRADE_PLAN.md)
- [Kế hoạch triển khai Wave 1 & Wave 2 v1.2](docs/current/WAVE1_WAVE2_IMPLEMENTATION_PLAN_v1.2.md)
- [Kế hoạch cải thiện Admin Frontend và bổ sung tính năng](docs/current/ADMIN_FRONTEND_IMPROVEMENT_PLAN_20260730.md) — `FE1_FE2_FE3_DEPLOYED_R28`, `FE4_DEPLOYED_VERIFIED_R29`
- [Trạng thái Admin Frontend FE1–FE3 r28](docs/current/ADMIN_FRONTEND_FE1_FE3_R28_STATUS_20260730.md)
- [Trạng thái triển khai Admin Frontend FE4](docs/current/ADMIN_FRONTEND_FE4_STATUS_20260730.md) — `DEPLOYED_VERIFIED_R29`, không migration, không đổi outbound
- [Trạng thái ổn định giao diện và hiệu năng r30](docs/current/PERFORMANCE_UI_STABILITY_R30_STATUS_20260730.md) — bản vá đứng giao diện, C1, B2, B3, B4; `DEPLOYED_VERIFIED_R30`
- [Trạng thái Voice Contract V2 và Hybrid Buying Intent r31](docs/current/REALTIME_VOICE_HYBRID_R31_STATUS_20260731.md) — báo giá hai bong bóng, handoff sản phẩm chưa xác định và model evidence có deterministic guard; `DEPLOYED_VERIFIED_R31_HUMAN_TEST_PENDING`
- [Trạng thái hotfix câu hỏi nối r31.1](docs/current/REALTIME_CONTINUATION_QUESTION_R31_1_STATUS_20260731.md) — đúng một câu hỏi nối cho pre-sale còn mở, không hỏi lại số đo và không chen vào chốt đơn/hậu mãi; `DEPLOYED_VERIFIED_R31_1_HUMAN_TEST_PENDING`
- [Trạng thái tư vấn size chủ động r31.2](docs/current/REALTIME_PROACTIVE_SIZE_R31_2_STATUS_20260731.md) — đủ số đo thì tư vấn ngay bằng Size Engine, thiếu trường nào chỉ hỏi trường đó và thiếu bảng size xác minh thì handoff; `DEPLOYED_VERIFIED_R31_2_HUMAN_TEST_PENDING`
- [Trạng thái quota lượt AI realtime r31.3](docs/current/REALTIME_GENERATION_QUOTA_R31_3_STATUS_20260731.md) — `500` lượt AI/giờ và `2.000` lượt AI/ngày cho mỗi page; `DEPLOYED_VERIFIED_R31_3`
- [Kế hoạch Task 2.0A — Meta Ads Entry Context & Lead Qualification](docs/current/TASK_2_0A_AD_ENTRY_CONTEXT_AND_LEAD_QUALIFICATION_PLAN.md) — `DEPLOYED_SHADOW_EVIDENCE_PENDING`, analytics sidecar, không thay đổi outbound
- [Kế hoạch nhận diện ảnh Cutout-first + AI reranker](docs/current/MEDIA_RECOGNITION_CUTOUT_AI_IMPLEMENTATION_PLAN.md)
- [Kế hoạch migration P2.3C Hash v3](docs/current/P23C_HASH_V3_MIGRATION_PLAN_20260730.md) — tách `embedding_hash`, `payload_hash`, `provenance_hash` để tránh embedding lại khi chỉ bổ sung SHA hoặc cập nhật payload
- [Canary Size Chart + ProductFactsV2 + Media Selector V2](docs/current/SIZE_CHART_PRODUCT_FACTS_V2_CANARY.md)
- [Trạng thái triển khai nhận diện ảnh r22](docs/current/MEDIA_RECOGNITION_R22_STATUS_20260728.md)
- [Trạng thái gửi ảnh sản phẩm sau nhận diện r23](docs/current/MEDIA_IMAGE_DELIVERY_R23_STATUS_20260729.md)
- [Trạng thái định dạng mỗi câu một tin r24](docs/current/REALTIME_MESSAGE_FORMAT_R24_STATUS_20260729.md)
- [Trạng thái Media Selector V2 guard r25](docs/current/MEDIA_SELECTOR_V2_GUARD_R25_STATUS_20260729.md)
- [Trạng thái Wave 2 + Gemini 3.5 r26.1](docs/current/WAVE2_GEMINI35_R26_1_STATUS_20260729.md)
- [Trạng thái Realtime trả lời có dấu và tách câu r26.2](docs/current/REALTIME_ACCENTED_SPLIT_R26_2_STATUS_20260729.md)
- [Trạng thái Meta Ads acquisition analytics r27.1](docs/current/TASK_2_0A_R27_1_STATUS_20260729.md)
- [Quy trình GitHub và triển khai](docs/current/REPOSITORY_AND_DEPLOYMENT.md)
- [Changelog](docs/history/CHANGELOG.md)
- [Kiến trúc nền](docs/phase0/02_architecture_contracts.md)
- [Shared sales contracts — Giai đoạn 1](docs/phase1/01_shared_contracts_v2.md)
- [Sales runtime engines — Giai đoạn 2](docs/phase2/01_sales_runtime_engines.md)
- [Chu trình bán hàng — Giai đoạn 3](docs/phase3/01_sales_cycle.md)
- [Admin Policy Control Plane — Giai đoạn 4](docs/phase4/01_admin_policy_control_plane.md)
- [Bảo mật và dữ liệu](docs/phase0/03_security_data_architecture.md)
- [Admin runbook](docs/admin/04_CONTROL_PLANE_RUNBOOK.md)

Các tài liệu `docs/phase*` là hồ sơ thiết kế/lịch sử. Khi mâu thuẫn, README, production baseline và release manifest mới nhất có hiệu lực cao hơn.

## Generated runtime state

Do not update this README to record a current release. For live status, resolve the exact running commit/release and rollback target from the resolved `/opt/lana-chatbot/current` release, release-local `.release-source.json`, and any available generated runtime-state/history evidence. Under `SOLO_PREPROD_MINIMAL`, runtime-state promotion/reconciliation is not a default deploy gate; when generated runtime-state is relied on as authority it must pass source/service/migration/routing/config/readback parity. Unknown or mismatched live identity fails closed. The A0 reconciliation artifact `deploy/manifests/20260802-r32.2.2-runtime-reconciliation.json` remains historical evidence.
