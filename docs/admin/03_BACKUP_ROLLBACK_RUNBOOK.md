# Runbook backup và rollback web quản trị

## Mục tiêu

- Có thể ngắt truy cập admin ngay khi nghi ngờ bị lộ.
- Có thể quay lại release admin trước đó mà không ảnh hưởng chatbot/n8n.
- Có thể phục hồi dữ liệu admin từ backup đã kiểm tra.
- Không backup secret ở dạng plaintext.

## Nguyên tắc

1. Web quản trị là control surface riêng; rollback admin không được restart n8n.
2. Ưu tiên vô hiệu Application/Provider ở Authentik trước khi sửa ứng dụng.
3. Không xóa volume hoặc migration khi rollback code.
4. Migration phải additive trong MVP; chỉ rollback schema sau khi đã restore thử.
5. Mọi thao tác phải ghi thời gian, người thực hiện, release trước/sau và kết quả.

## Backup trước mỗi release

### 1. Ghi nhận trạng thái

Lưu metadata không chứa secret:

```text
release_id
git_commit
container_image_digest
database_migration_version
tunnel_uuid
access_application_id
access_policy_id
application_aud
timestamp
operator
```

Không đưa Tunnel token, OAuth Client Secret, database password hoặc JWT vào file backup metadata.

### 2. PostgreSQL

Tạo backup custom format từ container/database production bằng tài khoản backup riêng:

```text
pg_dump --format=custom --no-owner --no-acl --file=<BACKUP_FILE> <DATABASE_NAME>
```

Sau đó:

1. tính SHA-256;
2. mã hóa backup bằng khóa backup riêng;
3. chuyển bản sao sang nơi lưu trữ ngoài VPS;
4. giữ ít nhất một bản immutable;
5. thử restore vào database tạm;
6. chạy migration và health check trên bản restore;
7. xóa database tạm sau khi xác nhận.

Không in database URL/password ra terminal hoặc CI log.

### 3. Redis

Redis chứa cache/trạng thái tạm, không phải nguồn dữ liệu quản trị bền vững. Nếu cần giữ queue/state phục vụ điều tra:

- dùng snapshot/AOF hiện có;
- không sao chép decrypted secret vào Redis;
- không coi Redis backup là thay thế PostgreSQL backup.

### 4. Authentik

Ghi lại hoặc export cấu hình không chứa secret:

- tunnel UUID và Public Hostname;
- Access application ID/domain/session duration/AUD;
- IdP connection ID;
- policy ID, action, selectors và MFA settings;
- DNS CNAME target;
- ảnh chụp màn hình trạng thái Healthy.

Không export OAuth Client Secret/Tunnel token vào cùng gói backup.

## Điều kiện rollback

Rollback hoặc deny-all ngay khi có một trong các dấu hiệu:

- tài khoản ngoài allowlist truy cập được;
- ứng dụng chấp nhận request thiếu/sai JWT;
- PII hoặc secret xuất hiện trên UI/log;
- tỷ lệ 5xx tăng liên tục sau release;
- admin API trả sai page scope;
- migration làm lỗi dashboard hoặc dữ liệu;
- tunnel/public route trỏ sai dịch vụ.

## Quy trình khẩn cấp: khóa truy cập

1. Vào Authentik Application `Lana Admin` và vô hiệu policy/provider.
2. Disable application hoặc thêm policy `Block`/deny-all ưu tiên cao.
3. Xác nhận cửa sổ ẩn danh không truy cập được.
4. Nếu nghi Tunnel token bị lộ:
   - revoke/rotate token;
   - dừng connector cũ;
   - cấp token mới qua secret file;
   - kiểm tra không có connector lạ.
5. Không xóa tunnel ngay nếu cần giữ metadata phục vụ điều tra.
6. Gửi cảnh báo vận hành và mở incident.

Mục tiêu khóa truy cập: dưới 5 phút.

## Rollback ứng dụng

1. Khóa Access theo quy trình trên nếu lỗi có liên quan bảo mật/PII.
2. Ghi nhận release đang chạy và release trước.
3. Đảm bảo backup/checksum trước release tồn tại.
4. Chuyển `admin-web` và `admin-api` về cùng một release trước đó.
5. Không rollback riêng frontend nếu API contract không tương thích.
6. Không chạy `docker compose down -v`.
7. Khởi động lại riêng dịch vụ admin cần thiết.
8. Kiểm tra:

   ```text
   container health
   database connectivity
   JWT validation
   owner allowlist
   read-only enforcement
   PII redaction
   ```

9. Mở lại Access cho Owner.
10. Thử cửa sổ ẩn danh, đúng tài khoản và tài khoản sai.
11. Ghi audit rollback.

Chatbot, n8n, realtime worker và delivery worker không được restart nếu rollback chỉ liên quan admin.

## Rollback Authentik

### Public Hostname sai

1. Disable/xóa hostname `admin.lanadesign.vn` khỏi tunnel.
2. Xác nhận DNS không trỏ tới origin sai.
3. Sửa service về `http://admin-web:3000`.
4. Chỉ tạo lại route sau khi Access Application đã tồn tại.

### Access policy sai

1. Đặt deny-all tạm thời.
2. Khôi phục policy:

   ```text
   Allow
   Exact email: nguyentuanson27@gmail.com
   Login method: Google
   Independent MFA: required
   ```

3. Kiểm tra bằng tài khoản sai trước, tài khoản đúng sau.
4. Không dùng Bypass để xử lý lỗi đăng nhập.

### Google OAuth sai

1. Giữ Access ở deny-all.
2. Kiểm tra origin và callback đúng team domain.
3. Rotate Client Secret nếu nghi đã lộ.
4. Test Google Source trong Authentik.
5. Mở lại policy sau khi test thành công.

## Phục hồi PostgreSQL

Chỉ thực hiện khi dữ liệu hỏng/mất, không dùng restore để xử lý lỗi giao diện đơn thuần.

1. Khóa Access.
2. Dừng ghi của admin; MVP read-only nên không ảnh hưởng chatbot.
3. Tạo forensic backup hiện trạng nếu còn đọc được.
4. Xác minh SHA-256 và giải mã bản backup cần phục hồi.
5. Restore vào database mới/tạm:

   ```text
   pg_restore --clean --if-exists --no-owner --no-acl --dbname=<RESTORE_DATABASE> <BACKUP_FILE>
   ```

6. Kiểm tra migration, row counts, constraints và quyền read-only.
7. Trỏ admin API sang database đã phục hồi bằng secret/config chuẩn.
8. Chạy smoke test.
9. Mở lại Access.
10. Giữ database cũ cô lập đến khi kết thúc điều tra.

## Smoke test bắt buộc

- [ ] Tunnel Healthy.
- [ ] Không đăng nhập thì bị chuyển tới Access.
- [ ] Owner + MFA đăng nhập thành công.
- [ ] Tài khoản Google khác bị từ chối.
- [ ] JWT sai AUD/issuer/email bị từ chối.
- [ ] Dashboard chỉ đọc.
- [ ] Không thấy token/raw PII.
- [ ] Admin API không public trực tiếp.
- [ ] n8n/chatbot vẫn giữ nguyên trạng thái trước rollback.
- [ ] Audit ghi đủ sự kiện.

## Lịch diễn tập

- Test restore PostgreSQL: hàng tháng.
- Test deny-all Access: hàng quý.
- Test rollback admin release: trước khi mở chức năng write và ít nhất hàng quý.
- Review owner/allowlist: hàng tháng.
- Rotate khi lộ: ngay lập tức; rotation định kỳ theo chính sách vận hành.
