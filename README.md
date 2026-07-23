# La.na Chatbot Platform

Ứng dụng chatbot Facebook Messenger cho La.na Design. Repository này là nguồn mã chuẩn cho app realtime, Admin, worker dữ liệu và các workflow n8n đã được chuẩn hóa.

## Nguồn chuẩn

- Repository: `github.com/nguyentuanson27-netizen/lanchatbot`.
- Production hiện hành: `/opt/lana-chatbot/releases/20260723-customer-care-policy-r10-1`.
- Page canary duy nhất: `1198992073286645`.
- Meta reply: app gửi trực tiếp qua Meta Send API.
- Pancake: chỉ quan sát/gắn tag và hỗ trợ handoff; không gửi reply cho khách.

Không sửa source trực tiếp trong `/opt/lana-chatbot/current`. Mọi thay đổi phải đi qua branch, kiểm thử, review, tag release và thư mục release mới trên VPS.

Khi chạy coding agent trực tiếp trên VPS, hãy bắt đầu tại `/opt/lana-chatbot/repository`. Agent phải đọc `AGENTS.md` trước khi thao tác; working tree này không phải runtime production. User `lana-deploy` có deploy key GitHub read-only chỉ cho repository này; được phép `fetch` tag/commit nhưng không được push.

## Trạng thái production ngày 2026-07-23

- API webhook tiếp tục chạy image `lana-chatbot-app:inbound-debounce-r1`.
- Realtime chạy image `lana-chatbot-app:customer-care-policy-r10-1`; Admin Web, Admin API và Simulation Worker chạy image `lana-chatbot-app:customer-care-policy-r10`. P2.3B giữ image r9 và POS snapshot giữ image r6.
- Wave 1 đang chạy riêng trên `shadow-worker` bằng image `lana-chatbot-app:realtime-wave1-shadow-f27de9c`. Shadow bật grounded draft, verified fact assembler và Judge v2 ở `DRY_RUN`; `APP_SEND_ENABLED=false`, `CHATBOT_SEND_ENABLED=false` và role DB không có quyền ghi Meta Outbox.
- Realtime live chưa bật các feature flag Wave 0/Wave 1 và vẫn giữ nguyên image/digest r10.1.
- Runtime Policy Resolver đang `PUBLISHED` và bị hard-gate chỉ cho page `1198992073286645`; page khác bị từ chối trước khi đọc policy.
- Bốn policy runtime (shop, offer, closing, payment) đang trỏ tới các version `PUBLISHED` bất biến; `SHOP_POLICY` v2 chứa chính sách chăm sóc khách hàng có cấu trúc và mọi lần chuyển trạng thái đều có audit.
- Chu trình bán hàng production đã nối cart 48 giờ, thương lượng deterministic, giảm 5% từ hai sản phẩm, freeship/giảm cuối theo policy, thu thông tin nhận hàng, order preview và `PURCHASE_CONFIRMED`.
- COD và chuyển khoản MB Bank được đọc từ `PAYMENT_POLICY`; app không hard-code tài khoản. Ảnh bill luôn chuyển nhân viên kiểm tra.
- Sales-cycle state được mã hóa trong PostgreSQL; event là append-only. Giá/tồn/size/ETA được kiểm tra lại trước preview và xác nhận.
- Simulation Worker chạy side-effect-free. Baseline trước publish là `HISTORICAL_ACTUAL` và kết quả `INSUFFICIENT_EVIDENCE`; owner đã chủ động override điều kiện này khi phát hành r4.
- Câu hỏi tiếp nối về ảnh/giá/tồn/size/ETA dùng `state.currentProductId` đã xác minh khi khách không nêu mã mới; mã mới không tìm thấy không được lùi về sản phẩm cũ.
- Hậu mãi ngắt sớm trước product search/model, gửi đúng một câu giữ chân qua Meta Outbox rồi handoff/gắn tag Vận Đơn. Handoff khác vẫn im lặng.
- Tin nhắn khách được gom sau 5 giây yên lặng; webhook trùng không kéo dài cửa sổ chờ.
- Báo giá dùng tên sản phẩm từ Qdrant; `DESCRIPTION_XML` chỉ làm ngữ cảnh cho câu mô tả form/chất liệu. Text được gửi trước, ảnh đủ điều kiện gửi sau 0,5 giây và vẫn bị chặn bởi thứ tự Outbox.
- Ý định “ảnh cận chất/cận vải” được định tuyến rõ sang nhóm `DETAIL`, không còn rơi về ảnh `GENERIC`.
- P2.3B retry Google Sheets tối đa ba lần với khoảng chờ 2–5–15 giây. Nếu cả chuỗi vẫn lỗi, worker chạy lại sau 5 phút; thành công mới trở về lịch 24 giờ.
- Admin phân biệt lỗi gần nhất (`degraded`) với mất heartbeat quá 26 giờ (`down`); P2.3B đã bật status reporting vào PostgreSQL.
- Câu hỏi chính sách trước mua được trả lời deterministic từ `shop-policy-customer-care-v2`, không gọi model hoặc Qdrant. App phân biệt hỏi quy định với yêu cầu xử lý đơn sau mua; hậu mãi vẫn gửi câu giữ chân, handoff và gắn tag Vận Đơn.
- Durable Inbox, Meta Outbox, Pancake Tag Outbox và generation guard đang hoạt động.
- Lịch sử tư vấn được chiếu sang Redis 20 ngày và lưu bản ẩn danh trong PostgreSQL 6 tháng.
- Admin dùng Authentik, Google account và MFA.
- App-native workers đang sở hữu POS snapshot và P2.3A/B/C.
- Các workflow n8n P2.2/P2.3 tương ứng đang inactive; không được kích hoạt đồng thời với app-native worker.
- Timer `lana-p23-daily.timer` đang `disabled/inactive`.
- PostgreSQL đã áp dụng migration đến `0018_shadow_verified_fact_payload`; migration 0018 chỉ bổ sung payload facts đã xác minh cho shadow evaluation và tương thích ngược với runtime r10.1.
- n8n `2.28.6` vẫn chạy các workflow legacy cho các page/nhóm việc khác. Workflow chatbot n8n chính vẫn active nhưng page canary đã được tách sang app.

Chi tiết bằng chứng runtime và ownership nằm tại [Production baseline](docs/current/PRODUCTION_BASELINE_20260722.md). Manifest production live nằm tại [r10.1](deploy/manifests/20260723-customer-care-policy-r10-1.json); manifest shadow Wave 1 nằm tại [Wave 1 shadow](deploy/manifests/20260723-realtime-wave1-shadow-f27de9c.json).

## Kiến trúc dữ liệu

| Dữ liệu | Nguồn có thẩm quyền |
|---|---|
| Webhook và gửi tin | Meta |
| Tag hội thoại | Pancake |
| BOM, giá, tồn | Pancake POS |
| Snapshot vận hành hiện tại | Google Sheets → app worker → Redis/PostgreSQL |
| Tìm sản phẩm và ảnh ổn định | Qdrant |
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

Không dùng credential production trong môi trường phát triển. Chỉ copy `.env.example` và các file `deploy/.env.*.example`; secret thật nằm ngoài repository.

## Quy trình release

1. Tạo branch từ `main`.
2. Thay đổi code và migration theo hướng additive/backward-compatible.
3. Chạy `pnpm check` và smoke test cần thiết.
4. Review thay đổi về source-of-truth, ownership, secret và dữ liệu khách.
5. Merge `main`, tạo tag release.
6. Build release mới vào `/opt/lana-chatbot/releases/<tag-or-commit>`.
7. Backup/restore-test nếu có migration.
8. Canary trên page `1198992073286645`.
9. Chỉ đổi symlink `current` sau khi health/smoke đạt.

Không recreate toàn bộ compose khi chỉ cần cập nhật một service; các service production hiện dùng nhiều image digest khác nhau.

## Quy tắc an toàn repository

- Không commit `.env`, token, key, database, Redis dump, nội dung chat thô hoặc PII.
- Không commit `node_modules`, `dist`, `outputs`, backup và artifact tạm.
- Workflow n8n chỉ được commit sau khi kiểm tra không có token hard-code.
- Deploy key trên VPS là read-only và chỉ gắn với repository này.
- GitHub là nguồn chuẩn; VPS là runtime, không phải nơi phát triển source.

## Tài liệu

- [Production baseline và ownership](docs/current/PRODUCTION_BASELINE_20260722.md)
- [Kế hoạch nâng cấp Realtime Sales Agent](docs/current/REALTIME_AGENT_UPGRADE_PLAN.md)
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
