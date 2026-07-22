# Thiết lập `admin.lanadesign.vn`

## 1. Kiến trúc bắt buộc

```text
Trình duyệt
  -> Cloudflare DNS/HTTPS
  -> Cloudflare Access: Google + MFA + đúng email
  -> Cloudflare Tunnel
  -> admin-web:3000
  -> admin-api:8081 (mạng Docker nội bộ)
  -> PostgreSQL/Redis (mạng Docker nội bộ)
```

Không mở cổng `3000`, `8081`, `5432` hoặc `6379` trên firewall VPS. Tunnel tạo kết nối đi ra từ VPS tới Cloudflare, vì vậy VPS không cần nhận kết nối Internet trực tiếp vào web quản trị.

## 2. Đưa domain vào Cloudflare

Nếu `lanadesign.vn` đã có trạng thái **Active** trong Cloudflare thì bỏ qua phần này.

1. Đăng nhập Cloudflare, chọn **Add a domain**.
2. Nhập `lanadesign.vn`, chọn gói phù hợp.
3. Cloudflare sẽ cấp hai nameserver.
4. Vào nhà cung cấp tên miền, thay nameserver hiện tại bằng hai nameserver Cloudflare.
5. Chờ trang **Overview** của zone báo **Active**.
6. Kiểm tra lại các bản ghi website/email hiện có trước khi đổi nameserver, đặc biệt là `MX`, `TXT`, SPF, DKIM và DMARC.

Không tạo bản ghi `A` trỏ `admin.lanadesign.vn` trực tiếp tới IP VPS.

## 3. Tạo Cloudflare Tunnel

Trong Cloudflare Dashboard:

1. Mở **Zero Trust**.
2. Vào **Networks > Tunnels** hoặc **Networking > Tunnels**.
3. Chọn **Create a tunnel**.
4. Chọn connector `cloudflared`.
5. Đặt tên:

   ```text
   lana-admin-vps
   ```

6. Chọn môi trường Docker và sao chép token cài đặt.
7. Lưu token thành secret trên VPS, không đưa token vào Git, `.env`, log hoặc lịch sử lệnh:

   ```text
   /opt/lana-chatbot/shared/secrets/cloudflare_tunnel_token
   ```

8. File phải thuộc `root`, quyền đọc tối thiểu cần thiết; khuyến nghị mode `600`.
9. Chạy `cloudflared` trong cùng Docker network với `admin-web`.

Cloudflared cần kết nối đi ra Internet. Nếu firewall outbound bị giới hạn, cho phép kết nối tới Cloudflare qua cổng `7844`; nên cho phép cả TCP và UDP để QUIC có thể hoạt động.

## 4. Tạo Public Hostname và DNS

Trong tunnel `lana-admin-vps`:

1. Chọn **Public Hostnames > Add a public hostname**.
2. Điền:

   ```text
   Subdomain: admin
   Domain: lanadesign.vn
   Path: để trống
   Type: HTTP
   URL: admin-web:3000
   ```

3. Lưu cấu hình.

Nếu `cloudflared` không cùng Docker network, không đổi sang IP public. Hãy sửa network để nó truy cập được `admin-web:3000`.

Cloudflare thường tự tạo DNS route khi thêm Public Hostname. Kiểm tra trong **DNS > Records**:

```text
Type: CNAME
Name: admin
Target: <TUNNEL_UUID>.cfargotunnel.com
Proxy status: Proxied
TTL: Auto
```

Nếu bản ghi không được tạo tự động, tạo CNAME trên bằng tay. Xóa bản ghi `A`, `AAAA` hoặc CNAME cũ trùng hostname `admin`.

Không bật `No TLS Verify`. Kết nối public dùng HTTPS do Cloudflare cấp; đoạn tunnel nội bộ có thể dùng HTTP vì không rời mạng Docker. Nếu dùng HTTPS tại origin thì phải dùng chứng chỉ origin hợp lệ.

## 5. Tạo Google Identity Provider

Tài khoản quản trị là Gmail cá nhân nên dùng identity provider **Google**, không dùng **Google Workspace**.

### 5.1. Google Cloud

1. Mở Google Cloud Console và tạo project, ví dụ:

   ```text
   lana-admin-access
   ```

2. Vào **APIs & Services > OAuth consent screen**.
3. Đặt audience là **External**.
4. Khai báo tên ứng dụng và email hỗ trợ.
5. Nếu ứng dụng còn ở chế độ Testing, thêm:

   ```text
   nguyentuanson27@gmail.com
   ```

   vào danh sách test user.
6. Tạo OAuth Client loại **Web application**.
7. Lấy team name trong Cloudflare Zero Trust tại **Settings > Team name and domain**.
8. Thêm Authorized JavaScript origin:

   ```text
   https://<TEAM_NAME>.cloudflareaccess.com
   ```

9. Thêm Authorized redirect URI:

   ```text
   https://<TEAM_NAME>.cloudflareaccess.com/cdn-cgi/access/callback
   ```

10. Sao chép Client ID và Client Secret vào Cloudflare; không lưu Client Secret trong repo.

### 5.2. Cloudflare Zero Trust

1. Vào **Settings/Integrations > Identity providers**.
2. Chọn **Add new identity provider > Google**.
3. Nhập Client ID và Client Secret.
4. Bật PKCE.
5. Lưu và chọn **Test**.
6. Xác nhận email trả về chính xác là:

   ```text
   nguyentuanson27@gmail.com
   ```

Google IdP cho phép mọi Google account đi tới màn hình đăng nhập, nhưng Access policy ở bước sau mới quyết định ai được vào ứng dụng.

## 6. Bật MFA độc lập của Cloudflare

Không chỉ dựa vào việc tài khoản Google có bật xác minh hai bước. Google IdP thông thường không phải lúc nào cũng cung cấp đủ thông tin để Access áp dụng rule theo phương thức MFA của Google.

1. Trong Zero Trust, vào phần thiết lập Access/MFA toàn tổ chức.
2. Bật **Independent MFA**.
3. Cho phép tối thiểu:

   - Authenticator app/TOTP;
   - security key hoặc passkey nếu có.

4. Với ứng dụng admin, chọn **Custom MFA settings**.
5. Đặt thời gian MFA session:

   ```text
   8 giờ
   ```

6. Tài khoản quản trị phải hoàn thành đăng ký factor trong lần đăng nhập đầu tiên.
7. Đồng thời bật Google 2-Step Verification trên tài khoản Google để có thêm một lớp bảo vệ.

## 7. Tạo Access Application

1. Vào **Access controls > Applications**.
2. Chọn **Add an application > Self-hosted**.
3. Tên:

   ```text
   Lana Admin MVP
   ```

4. Domain:

   ```text
   admin.lanadesign.vn
   ```

5. Session duration:

   ```text
   8h
   ```

6. Chỉ bật login method **Google** cho ứng dụng này.
7. Bật `HttpOnly` cho Access cookie.
8. Có thể bật Binding Cookie sau khi đã kiểm thử trình duyệt; không bật nếu gây vòng lặp đăng nhập.

Tạo policy:

```text
Policy name: Allow Lana Owner
Action: Allow
Include:
  Emails:
    nguyentuanson27@gmail.com
Require:
  Login method:
    Google
MFA:
  Custom MFA settings
  Duration: 8h
```

Không dùng các rule sau:

```text
Include Everyone
Include Emails ending in @gmail.com
Include All valid emails
Bypass
```

Access mặc định từ chối người không khớp policy. Có thể thêm policy `Block` rõ ràng ở cuối nếu giao diện yêu cầu, nhưng tuyệt đối không đặt `Bypass` cho `/`, `/api` hoặc `/health`.

Sau khi lưu, mở phần cấu hình ứng dụng và sao chép **Application Audience (AUD) Tag**. AUD không phải secret nhưng phải khớp chính xác trong cấu hình ứng dụng.

## 8. Cấu hình kiểm tra JWT tại origin

Cloudflare Access gửi JWT trong header:

```text
Cf-Access-Jwt-Assertion
```

Cả `admin-web` ở lớp BFF và `admin-api` phải từ chối request nếu thiếu hoặc JWT không hợp lệ. Không chỉ kiểm tra header có tồn tại.

Kiểm tra tối thiểu:

```text
Algorithm: RS256
Signature: hợp lệ theo JWKS Cloudflare
Issuer: https://<TEAM_NAME>.cloudflareaccess.com
Audience: đúng Application AUD Tag
exp/nbf: còn hiệu lực
email: nguyentuanson27@gmail.com
```

JWKS:

```text
https://<TEAM_NAME>.cloudflareaccess.com/cdn-cgi/access/certs
```

Cloudflare luân chuyển signing key. Ứng dụng phải đọc JWKS động, cache ngắn và tự refresh khi gặp `kid` mới; không sao chép public key cố định vào source code.

Ưu tiên xác thực `Cf-Access-Jwt-Assertion` thay vì chỉ đọc cookie `CF_Authorization`.

## 9. Bảo vệ giao tiếp nội bộ

Thiết kế MVP:

```text
Browser -> Cloudflare -> admin-web/BFF -> admin-api
```

Quy tắc:

- tunnel chỉ route tới `admin-web`;
- không tạo Public Hostname riêng cho `admin-api`;
- `admin-web` chuyển tiếp nguyên JWT Access tới `admin-api`;
- `admin-api` tự kiểm tra lại chữ ký, issuer, audience và email;
- `admin-api` chỉ lắng nghe trong Docker network;
- không tin `X-User-Email` hoặc header nhận dạng do trình duyệt tự gửi;
- admin API chỉ trả dữ liệu đã ẩn PII theo quyền MVP.

Nếu sau này có dịch vụ tự động gọi qua hostname public:

1. Tạo Cloudflare Access Service Token riêng cho đúng dịch vụ.
2. Tạo policy `Service Auth` riêng, không trộn với policy người dùng.
3. Gửi `CF-Access-Client-Id` và `CF-Access-Client-Secret`.
4. Lưu secret bằng file mount/secret manager, không đưa vào trình duyệt.
5. Giới hạn endpoint và quyền của service account.

MVP hiện tại không cần service token cho trình duyệt của Owner.

## 10. Kiểm tra sau triển khai

### Kiểm tra không đăng nhập

Mở cửa sổ ẩn danh:

```text
https://admin.lanadesign.vn
```

Kết quả đúng: chuyển tới màn hình Cloudflare Access, không thấy nội dung admin.

### Kiểm tra đúng tài khoản

1. Đăng nhập `nguyentuanson27@gmail.com`.
2. Hoàn thành Google login và Cloudflare MFA.
3. Dashboard mở thành công.
4. Kiểm tra API `/api/...` trả dữ liệu nhưng không lộ token, sender ID thô, số điện thoại hoặc địa chỉ.

### Kiểm tra tài khoản khác

Kết quả đúng: Cloudflare từ chối trước khi request tới origin.

### Kiểm tra origin

- IP VPS không có cổng admin mở public.
- Request nội bộ thiếu `Cf-Access-Jwt-Assertion` tới admin API trả `401` hoặc `403`.
- JWT đúng chữ ký nhưng sai AUD, issuer hoặc email cũng trả `403`.
- Log chỉ ghi customer hash/correlation ID; không ghi JWT hoặc cookie.

## 11. Thông tin cần ghi lại sau khi cấu hình

Ghi vào kho vận hành an toàn, không ghi secret:

```text
Cloudflare account ID
Zone ID của lanadesign.vn
Tunnel name và Tunnel UUID
Zero Trust team name/domain
Access application ID
Application AUD Tag
Google IdP connection ID
Policy ID
Ngày kiểm thử MFA
Người kiểm thử
```

Secret phải nằm ngoài tài liệu:

```text
Tunnel token
Google OAuth Client Secret
Service token secret (nếu tạo sau này)
Database URL/password
Internal authentication secret
```

## Tài liệu chính thức

- Cloudflare: Create a tunnel  
  `https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/`
- Cloudflare: Google identity provider  
  `https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google/`
- Cloudflare: Access policies  
  `https://developers.cloudflare.com/cloudflare-one/access-controls/policies/`
- Cloudflare: Enforce MFA  
  `https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/`
- Cloudflare: Validate Access JWT  
  `https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/`

