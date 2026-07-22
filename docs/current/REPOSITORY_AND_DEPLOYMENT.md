# Repository and deployment policy

## Vai trò

- GitHub private repository là nguồn mã chuẩn.
- Codex Windows làm việc trên checkout tạm, tạo branch và push.
- GitHub CI chạy kiểm tra.
- VPS chỉ pull/build hoặc nhận artifact từ commit/tag đã duyệt.
- Deploy key VPS chỉ có quyền đọc repository.

## Nhánh và tag

- `main`: release-ready, không force-push.
- Feature branch: `feat/*`, `fix/*`, `ops/*`, `docs/*`.
- Tag: `YYYYMMDD-<name>-rN`.
- Một tag trỏ đến một commit và một release manifest.

## Triển khai

1. Checkout tag vào thư mục release mới; không `git pull` trong `current`.
2. Xác minh manifest, checksum compose, migration và secret file hiện hữu.
3. Build image có tag mới; không ghi đè tag image đang chạy.
4. Nếu có migration: backup, restore-test, rồi migrate production.
5. Recreate đúng service cần đổi.
6. Kiểm tra health, restart count, Inbox/Outbox và page allowlist.
7. Chỉ sau smoke thành công mới đổi symlink `current`.

Rollback đổi về image/release trước; không xóa Inbox, Outbox, Redis hoặc PostgreSQL hàng loạt.

## Secret

- Production secret nằm ngoài repository tại thư mục secret của VPS.
- GitHub Actions chỉ giữ credential tối thiểu nếu sau này bật CD.
- Không dùng deploy key read-only để push.
- Không đưa private deploy key ra khỏi VPS.

## Source-of-truth

Mỗi miền dữ liệu chỉ có một writer được ghi trong production baseline. Thay đổi ownership là một release có kế hoạch cutover/rollback riêng, không phải thao tác bật thêm workflow.

