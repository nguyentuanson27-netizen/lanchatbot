# `@lana/meta-webhook`

Provider-boundary helpers for Meta webhook ingestion:

- constant-time `X-Hub-Signature-256` verification over exact raw bytes;
- strict Page payload validation and Page allow-list enforcement;
- normalization to `InboundMessageV1`;
- deterministic fallback event keys when Meta does not provide `mid`;
- explicit `SHADOW | N8N | APP` routing decisions;
- an inbound queue abstraction with a no-network development adapter.

This package cannot send messages. Pancake is not a message-delivery provider, and no
Meta or Pancake API client is included here.
