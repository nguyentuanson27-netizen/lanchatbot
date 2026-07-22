# Admin control worker

Durable, deny-by-default processor for the admin control plane. It never sends
customer messages and never calls a Pancake tag mutation inline. Tag changes
are written to `pancake_tag_outbox`; exact Pancake reads use messages v1, the
latest `inserted_at`, conversations v2 in a +/-600 second window, then the
exact `pageId_senderId` conversation.

Safety gates:

- `ADMIN_CONTROL_ENABLED` defaults to `false`.
- `ADMIN_CONTROL_PAGE_IDS` is mandatory when enabled and is included in the
  SQL claim predicate.
- Only the four configured tags are supported.
- `RESUME_BOT` cannot set BOT until every remove outbox is applied and a new
  exact read verifies that all four blocking tag IDs are absent.
- Provider/read failures retain HUMAN.
- All terminal results append both `admin_command_events` and `audit_log`.

The first deployment intentionally supports one page configuration. Required
runtime values are `META_PAGE_ID`, `ADMIN_CONTROL_DATABASE_URL(_FILE)`,
`REALTIME_DATA_KEY(_FILE)`, `PANCAKE_ACCESS_TOKEN(_FILE)`, and the four
`PANCAKE_*_TAG_ID` variables.
