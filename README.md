# La.na Chatbot Platform

Ứng dụng chatbot Facebook Messenger cho La.na Design. Repository này là nguồn mã chuẩn cho app realtime, Admin, worker dữ liệu và các workflow n8n đã được chuẩn hóa.

## Nguồn chuẩn

- Repository: `github.com/nguyentuanson27-netizen/lanchatbot`.
- Production hiện hành: `/opt/lana-chatbot/releases/20260722-inbound-debounce-r1`.
- Page canary duy nhất: `1198992073286645`.
- Meta reply: app gửi trực tiếp qua Meta Send API.
- Pancake: chỉ quan sát/gắn tag và hỗ trợ handoff; không gửi reply cho khách.

Không sửa source trực tiếp trong `/opt/lana-chatbot/current`. Mọi thay đổi phải đi qua branch, kiểm thử, review, tag release và thư mục release mới trên VPS.

Khi chạy coding agent trực tiếp trên VPS, hãy bắt đầu tại `/opt/lana-chatbot/repository`. Agent phải đọc `AGENTS.md` trước khi thao tác; deploy key trên VPS chỉ có quyền đọc và working tree này không phải runtime production.

## Trạng thái production ngày 2026-07-22

- API và realtime worker chạy image `lana-chatbot-app:inbound-debounce-r1`.
- Tin nhắn khách được gom sau 5 giây yên lặng; webhook trùng không kéo dài cửa sổ chờ.
- Durable Inbox, Meta Outbox, Pancake Tag Outbox và generation guard đang hoạt động.
- Lịch sử tư vấn được chiếu sang Redis 20 ngày và lưu bản ẩn danh trong PostgreSQL 6 tháng.
- Admin dùng Authentik, Google account và MFA.
- App-native workers đang sở hữu POS snapshot và P2.3A/B/C.
- Các workflow n8n P2.2/P2.3 tương ứng đang inactive; không được kích hoạt đồng thời với app-native worker.
- Timer `lana-p23-daily.timer` đang `disabled/inactive`.
- PostgreSQL đã áp dụng migration đến `0013_inbound_debounce`.
- n8n `2.28.6` vẫn chạy các workflow legacy cho các page/nhóm việc khác. Workflow chatbot n8n chính vẫn active nhưng page canary đã được tách sang app.

Chi tiết bằng chứng runtime và ownership nằm tại [Production baseline](docs/current/PRODUCTION_BASELINE_20260722.md). Manifest bất biến nằm tại [release manifest](deploy/manifests/20260722-inbound-debounce-r1.json).

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
- [Quy trình GitHub và triển khai](docs/current/REPOSITORY_AND_DEPLOYMENT.md)
- [Changelog](docs/history/CHANGELOG.md)
- [Kiến trúc nền](docs/phase0/02_architecture_contracts.md)
- [Shared sales contracts — Giai đoạn 1](docs/phase1/01_shared_contracts_v2.md)
- [Sales runtime engines — Giai đoạn 2](docs/phase2/01_sales_runtime_engines.md)
- [Bảo mật và dữ liệu](docs/phase0/03_security_data_architecture.md)
- [Admin runbook](docs/admin/04_CONTROL_PLANE_RUNBOOK.md)

Các tài liệu `docs/phase*` là hồ sơ thiết kế/lịch sử. Khi mâu thuẫn, README, production baseline và release manifest mới nhất có hiệu lực cao hơn.
