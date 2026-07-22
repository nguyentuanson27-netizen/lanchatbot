# Admin conversation control plane

The first writable admin stage is intentionally narrow. It supports only:

- handoff to `NHAN_VIEN` or `VAN_DON`;
- pause bot for 15 or 60 minutes;
- resume bot after a verified Pancake tag read;
- add/remove one of `NHAN_VIEN`, `VAN_DON`, `DA_CHOT_DON`, `KHONG_UP_SALE`;
- synchronize the current Pancake tags into app state.

It does not support manual messages, bulk actions, product price/stock writes,
arbitrary tags, or displaying credentials.

## Production safety

- `ADMIN_CONTROL_ENABLED` defaults to `false`.
- `ADMIN_CONTROL_PAGE_IDS` must contain the controlled page. The first rollout
  uses only `1198992073286645`.
- The browser never calls Pancake. The API writes a durable admin command and
  the control worker reconciles it through the Pancake tag outbox.
- Every write requires `OWNER`, exact Origin, an `Idempotency-Key`, a fixed
  reason code, and the expected conversation state version.
- Conflicting or stale commands finish as `CONFLICT`; they are not guessed or
  silently retried against a newer state.
- Resume is fail-safe: the worker reads Pancake with the exact conversation-id
  and time-window sequence, removes known blocking tags, reads again, and only
  changes owner to BOT when no blocking tag remains.
- Disable emergency writes by setting `ADMIN_CONTROL_ENABLED=false` on both
  `admin-api` and `admin-control-worker`, then recreate those two containers.
  This does not delete Redis, PostgreSQL, inbox, outbox, or audit history.

## Verification after deploy

1. Check `admin-api`, `admin-web`, `admin-control-worker`, and `delivery-worker`
   are healthy.
2. Confirm `/admin/v1/me` reports `conversation_control=true` and the control
   page list contains only `1198992073286645`.
3. Open a conversation on that page and perform a single sync command.
4. Confirm one `admin_commands` row and its append-only events are created.
5. For a tag mutation, confirm one matching `pancake_tag_outbox` row exists and
   the command only becomes `APPLIED` after the provider state is observed.
