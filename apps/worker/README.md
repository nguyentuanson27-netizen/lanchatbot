# Worker (Phase 1)

This process is intentionally **send-disabled**. It can claim Inbox jobs, serialize per conversation and execute a fake/shadow handler, but it has no Meta Send or Pancake provider adapter.

`CHATBOT_SEND_ENABLED=true` is rejected. Live sending requires a later gate, provider sandbox evidence and explicit authorization.

## Phase 4 shadow evaluator

`phase4-server.ts` runs a bounded Vertex/Gemini canary over redacted mirrored messages.
It has no Meta or Pancake credential, uses a PostgreSQL role without `meta_outbox` write
permission, and keeps both `APP_SEND_ENABLED` and `CHATBOT_SEND_ENABLED` false. Generation
and actual-reply comparison are separate durable stages so a late n8n echo is not lost.
The default cap is 50 generated customer turns per day.
