# Durable messaging

Phase-1 implementation of the three independent durable side-effect contracts:

- `WebhookInboxRepository`: authoritative duplicate guard on `pageId + eventKey`, processing leases, crash recovery and deterministic queue jobs.
- `MetaOutboxRepository`: ordered send intent, acceptance evidence, `AMBIGUOUS` reconciliation and no blind retry.
- `PancakeTagOutboxRepository`: separate desired-state/idempotent tag application.

Redis/BullMQ only dispatches work. PostgreSQL repositories will implement the ports in a separate package and remain the source of truth. The in-memory repositories in this package are deterministic fakes for contract, replay and failure-injection tests.

## Safety invariants

1. Duplicate webhook insertion returns the existing Inbox row.
2. Queue job IDs are deterministic and contain no raw provider identifier.
3. Conversation work requires a renewable lease with a monotonic fencing value. Durable state writes must validate both their expected state revision and the fence supplied by the worker.
4. A crashed `SENDING` Meta attempt becomes `AMBIGUOUS`, never `PENDING`.
5. `AMBIGUOUS -> RETRYABLE` requires explicit provider evidence that the message was not sent. A matching echo can move it to `SENT_ACCEPTED`; otherwise it ends in `MANUAL_REVIEW`.
6. Pancake never sends customer messages. Its Outbox only applies `NHAN_VIEN` or `VAN_DON` tags.
7. The Phase-1 worker exposes `sendEnabled: false` as a literal and contains no provider adapter.

## Production adapters

- Implement the repository ports with PostgreSQL transactions, unique constraints and `FOR UPDATE SKIP LOCKED`.
- Wire `BullMqConversationJobQueue` to a BullMQ Queue. BullMQ attempts stay at one because Inbox owns retry state.
- Wire `RedisConversationLock` to Redis `INCR`, `SET NX PX`, `GET` and `EVAL`.
- Never treat a Redis lease alone as state consistency: pair its fence with the PostgreSQL `state_revision` compare-and-swap.

No module in this package performs network calls.
