# La.na Admin API

PII-safe read API and feature-gated conversation control plane for
`admin.lanadesign.vn`.

Security boundaries:

- every `/admin/v1/*` request requires a 30-second HMAC assertion issued by `admin-web` after Authentik authentication;
- HMAC, issuer, lifetime and owner email allow-list are checked;
- every GET reads only from the `admin_*_v` safe views using the read-only URL;
- ciphertext, provider payloads, secrets and quarantined messages are never queried;
- responses receive a second recursive sensitive-key and phone/email redaction pass;
- commands use a separate write URL, OWNER RBAC, page allow-list,
  idempotency, optimistic state versions and append-only audit;
- the control plane is disabled by default and never sends manual messages,
  edits catalog facts, accepts arbitrary tags or exposes secrets.

Required environment:

```env
PORT=8081
ADMIN_DATABASE_URL_FILE=/run/secrets/admin_database_url
ADMIN_CONTROL_DATABASE_URL_FILE=/run/secrets/admin_control_database_url
ADMIN_ALLOWED_ORIGIN=https://admin.lanadesign.vn
ADMIN_OWNER_EMAILS=nguyentuanson27@gmail.com
ADMIN_EDITOR_EMAILS=
ADMIN_APPROVER_EMAILS=
ADMIN_VIEWER_EMAILS=
ADMIN_PAGE_IDS=ALL
ADMIN_INTERNAL_AUTH_SECRET_FILE=/run/secrets/admin_internal_auth_secret
ADMIN_ASSERTION_ISSUER=lana-admin-web
ADMIN_CONTROL_ENABLED=false
ADMIN_CONTROL_PAGE_IDS=1198992073286645
ADMIN_POLICY_CONTROL_ENABLED=false
ADMIN_POLICY_PAGE_IDS=1198992073286645
```

`ADMIN_POLICY_CONTROL_ENABLED` is independent from conversation control and
defaults to `false`. It requires migration `0014_admin_policy_control`.
PostgreSQL is the only mutable source of truth; Google Sheets may only import
a structured DRAFT or be used for staging/reporting.

The mutation endpoint accepts only `HANDOFF_NHAN_VIEN`, `HANDOFF_VAN_DON`,
`PAUSE_BOT`, `RESUME_BOT`, `ADD_TAG`, `REMOVE_TAG` and
`SYNC_PANCAKE_TAGS`. `Idempotency-Key`, `expected_state_version` and an
allow-listed reason code are mandatory. HANDOFF, PAUSE and ADD_TAG establish
a HUMAN fence in the same transaction that enqueues the durable command.

Authentik must restrict the application to `nguyentuanson27@gmail.com` and
require independent MFA. The API allow-list remains mandatory even when the
Authentik policy is correct.
