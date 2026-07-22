# `@lana/api`

Fastify ingress for Phase 1. It is safe by default and does not contain any Meta Send
API or Pancake message-send client.

## Endpoints

- `GET /health/live`: process liveness only.
- `GET /health/ready`: configuration and inbound-queue readiness.
- `GET /webhooks/meta`: Meta subscription challenge.
- `POST /webhooks/meta`: raw-body signature verification, payload/page guards,
  normalization, routing and enqueue through `InboundQueue`.
- `POST /webhook/gateway-facebook-send`: compatibility tombstone; always returns
  HTTP 410 with `send=false`.
- `POST /internal/shadow/messages`: authenticated n8n mirror write path.
- `GET /internal/shadow/evaluations/summary`: read-only Phase 4 metrics, protected by a
  separate evaluation-read key.
- `GET /internal/shadow/evaluations`: recent redacted comparisons; never contains a raw
  sender ID or page token.

## Configuration

- `META_APP_SECRET` (secret; never log it)
- `META_VERIFY_TOKEN` (secret; never log it)
- `META_ALLOWED_PAGE_IDS` (comma-separated)
- `ANALYTICS_HASH_SALT` (at least 16 characters; HMAC salt for pseudonymous conversation IDs)
- `GATEWAY_ROUTING_MODE=SHADOW|N8N|APP` (defaults to `SHADOW`)
- `PORT` (defaults to `3000`)

The included server uses an unavailable queue adapter: readiness remains false and
webhook acceptance returns 503. Tests inject an in-memory adapter. Production must
inject the durable Inbox/queue adapter and may return HTTP 200 only after that adapter
has committed the authenticated event.
