# Web quản trị La.na Design

Trang quản trị tại `https://admin.lanadesign.vn` hiện gồm hai lớp:

- giám sát hội thoại, chất lượng AI, dữ liệu và vận hành;
- control plane giới hạn cho hội thoại thuộc page test `1198992073286645`.

Đăng nhập vẫn qua Google OAuth + Authentik và MFA. Chỉ tài khoản OWNER đã
allowlist được gọi API điều khiển. API, worker, PostgreSQL và Redis không public.

Control plane chỉ có handoff, pause/resume bot, đồng bộ tag và thêm/xóa bốn tag
cố định. Không có gửi tin thủ công, thao tác hàng loạt, sửa giá/tồn, tag tùy ý
hoặc giao diện xem secret.

Tài liệu:

1. [Thiết lập Authentik, DNS, Google OAuth và MFA](./01_AUTHENTIK_SETUP_VI.md)
2. [Checklist bảo mật](./02_SECURITY_CHECKLIST.md)
3. [Runbook backup và rollback](./03_BACKUP_ROLLBACK_RUNBOOK.md)
4. [Runbook control plane](./04_CONTROL_PLANE_RUNBOOK.md)

Tài liệu Cloudflare cũ chỉ được giữ làm lịch sử và không còn là phương án triển khai.
