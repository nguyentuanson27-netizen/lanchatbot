# `@lana/pancake-handoff`

Fail-closed Pancake tag adapter for silent human handoff.

- Pancake is never used to send customer messages.
- The HTTP allow-list permits only conversation/tag reads and tag add.
- Tag changes are desired-state operations: read first, and skip POST when the
  desired tag already exists.
- `VAN_DON` is selected for post-sale requests; all other handoffs use
  `NHAN_VIEN`.
- Missing token/tag mapping or an unverifiable tag read blocks the bot safely.
- HTTP is an injected port; tests use an in-memory fake and open no sockets.
- Page API authentication is carried as the documented `page_access_token`
  query parameter. Production transports must redact query values from logs.
- Conversation tags are observed from the allow-listed conversation-list response;
  tag mutation uses `{ "action": "add", "tag_id": "..." }`.

The exact live response envelope and pagination behavior remain a sandbox
acceptance item before activation.
