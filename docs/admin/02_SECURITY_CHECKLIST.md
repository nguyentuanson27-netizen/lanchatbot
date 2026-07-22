# Checklist bảo mật web quản trị

## DNS, HTTPS và mạng

- [ ] Chỉ thêm A record `auth` và `admin` tới VPS; không sửa `@`, `www`, MX hay nameserver.
- [ ] `admin` đi qua Authentik Proxy; không public 3000, 8081, 5432 hoặc 6379.
- [ ] PostgreSQL, Redis và control worker chỉ nằm trong mạng backend.

## Google, Authentik và MFA

- [ ] Chỉ email OWNER được allowlist; không có policy Everyone/domain wildcard.
- [ ] Authenticator Validation bắt buộc TOTP hoặc Passkey/WebAuthn.
- [ ] Tài khoản khác hoặc thiếu MFA đều bị từ chối.

## API và control plane

- [ ] Vé HMAC sống ngắn, có issuer/iat/exp/subject và được kiểm tra constant-time.
- [ ] CORS/Origin ghi dữ liệu chỉ chấp nhận chính xác `https://admin.lanadesign.vn`.
- [ ] `ADMIN_CONTROL_ENABLED=true` chỉ ở API và worker của bản triển khai đã duyệt.
- [ ] `ADMIN_CONTROL_PAGE_IDS` chỉ chứa `1198992073286645` trong đợt thử nghiệm.
- [ ] Mỗi write yêu cầu OWNER, idempotency key, reason enum và expected state version.
- [ ] Browser/API không gọi Pancake trực tiếp; tag đi qua command + durable outbox.
- [ ] Resume chỉ trả BOT sau khi đọc lại Pancake và không còn tag chặn.
- [ ] Audit/event append-only, không chứa email thô, nội dung chat, token hay secret.

## Phạm vi bị cấm trong giai đoạn này

- [ ] Không gửi tin thủ công từ web.
- [ ] Không thao tác hàng loạt hội thoại.
- [ ] Không sửa giá hoặc tồn kho.
- [ ] Không nhập tag tùy ý ngoài bốn tag cố định.
- [ ] Không đọc/hiển thị secret trên giao diện hoặc API.

## Dữ liệu và rollback

- [ ] Role đọc dashboard chỉ SELECT các view `admin_*_v`.
- [ ] API lệnh và worker dùng hai role DB riêng, quyền tối thiểu.
- [ ] API không trả raw webhook hay token Meta/Pancake/POS/Qdrant.
- [ ] Có thể tắt control plane mà không xóa Redis, PostgreSQL, inbox/outbox/audit.
