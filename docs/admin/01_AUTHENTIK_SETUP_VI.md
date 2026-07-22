# Triển khai Authentik cho trang quản trị

## Kiến trúc

```text
Internet -> HTTPS auth.lanadesign.vn -> Nginx Proxy Manager -> Authentik
Internet -> HTTPS admin.lanadesign.vn -> Authentik Proxy -> admin-web
admin-web -> vé HMAC nội bộ sống 30 giây -> admin-api -> PostgreSQL chỉ đọc
```

Không thành phần admin nào mở cổng host. `admin-api` không tin trực tiếp header
`X-authentik-*`; chỉ `admin-web` được đổi danh tính Authentik thành vé HMAC ngắn
hạn. Email được kiểm tra lại ở cả web và API.

## DNS cần thêm tại Matbao

Chỉ thêm hai bản ghi, không sửa `@`, `www`, MX hoặc nameserver:

| Type | Host | Value | TTL |
|---|---|---|---|
| A | `auth` | `156.67.214.197` | 300 hoặc mặc định |
| A | `admin` | `156.67.214.197` | 300 hoặc mặc định |

Hai bản ghi này không thay đổi website bán hàng `lanadesign.vn`.

## Nginx Proxy Manager

Sau khi DNS phân giải đúng, tạo hai Proxy Host và cấp Let's Encrypt:

1. `auth.lanadesign.vn` -> `http://lana-authentik-server:9000`.
2. `admin.lanadesign.vn` -> endpoint proxy của embedded outpost được Authentik
   hiển thị sau khi tạo Proxy Provider. Không trỏ thẳng hostname này tới
   `admin-web:3000`.

Bật Force SSL, HTTP/2 và HSTS.

## Khởi tạo Authentik

1. Mở `https://auth.lanadesign.vn/if/flow/initial-setup/` và tạo `akadmin`.
2. Tạo Google OAuth Client loại `Web Application`, authorized domain
   `auth.lanadesign.vn` và redirect URI
   `https://auth.lanadesign.vn/source/oauth/callback/google/`.
3. Chỉ cho phép/tạo người dùng `nguyentuanson27@gmail.com`; tắt tự do đăng ký.
4. Tạo Authenticator Setup stage cho TOTP hoặc WebAuthn/Passkey.
5. Thêm Authenticator Validation stage vào authentication flow; khi chưa có thiết
   bị chọn `Configure` hoặc `Deny` để bắt buộc MFA độc lập.
6. Tạo Proxy Provider chế độ `Proxy`, external host
   `https://admin.lanadesign.vn`, internal host `http://admin-web:3000`.
7. Tạo Application `Lana Admin`, gắn provider và đưa vào embedded outpost.
8. Tạo policy email chính xác `nguyentuanson27@gmail.com` và bind vào Application.

## Kiểm tra bắt buộc

- Chưa đăng nhập phải được chuyển sang Authentik.
- Email khác bị từ chối.
- Đúng email nhưng chưa có MFA phải buộc cấu hình hoặc bị từ chối.
- `/admin/v1/me` trả `OWNER` và `ALL` sau đăng nhập.
- Thiếu `X-authentik-email`/`X-authentik-uid` thì `admin-web` trả 401.
- Thiếu vé HMAC thì `admin-api` trả 401.
- Không container admin/Auth/PostgreSQL nào publish cổng host.

Authentik được pin ở `2026.5.5`. Trước khi nâng cấp cần sao lưu volume
`lana-authentik-postgres-data` và `lana-authentik-media`.

## Runtime status (2026-07-16)

- `akadmin` initialized successfully.
- `admin.lanadesign.vn` has a valid Let's Encrypt certificate and routes only to
  the Authentik embedded proxy outpost.
- The proxy provider routes internally to `http://admin-web:3000`.
- The application policy allows only `nguyentuanson27@gmail.com`.
- TOTP enrollment is mandatory; the previous "skip when not configured" behavior
  is disabled.
- Direct unauthenticated calls to `admin-web` data endpoints and `admin-api` both
  return HTTP 401.
- Google OAuth source `google` is active with redirect URI
  `https://auth.lanadesign.vn/source/oauth/callback/google/`.
- The only application user is pre-created as an external OWNER with no local
  password. Google uses `email_link`, while OAuth enrollment is disabled, so
  unknown Google accounts cannot create Authentik users.
- `auth.lanadesign.vn` is public for Google callbacks. Interactive end-to-end
  verification requires the OWNER to sign in once and enroll TOTP.
- Pre-change Authentik backup:
  `/opt/lana-chatbot/backups/authentik/authentik-before-admin-provider-20260716T154126Z.dump`.
