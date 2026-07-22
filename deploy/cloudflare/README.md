# Cloudflare deployment templates

Các file trong thư mục này chỉ là template, không chứa secret thật.

## Files

- `admin.env.example`: biến môi trường cho kiểm tra Cloudflare Access JWT.
- `cloudflared-config.yml.example`: ingress template nếu dùng tunnel quản lý bằng file.
- `access-policy.example.json`: tài liệu hóa policy mục tiêu; không phải lệnh tự động áp dụng.

Khuyến nghị production dùng remotely-managed tunnel trong Cloudflare Dashboard và mount token từ:

```text
/opt/lana-chatbot/shared/secrets/cloudflare_tunnel_token
```

Không commit:

```text
cloudflare tunnel token
credentials JSON
Google OAuth Client Secret
Access service-token secret
database URL/password
```

Hướng dẫn đầy đủ: `docs/admin/01_CLOUDFLARE_ACCESS_SETUP_VI.md`.

