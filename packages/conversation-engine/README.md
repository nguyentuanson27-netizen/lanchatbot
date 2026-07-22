# Conversation engine

Deterministic Phase-2 conversation state machine. This package has no provider,
network, AI or persistence implementation. It consumes already-classified
events and verified Pancake tag observations, then returns state plus explicit
authorization booleans.

## Safety invariants

1. `routingOwner` (`N8N | APP`) and `conversationOwner` (`BOT | HUMAN`) are
   independent. N8N shadow routing may evaluate, but it cannot create Meta or
   Pancake side effects.
2. Phase 2 exports literal `PHASE_2_SEND_ENABLED = false` and
   `allowCreateMetaOutbox` is always `false`. `metaOutboxEligibleAfterPhase2`
   is diagnostic only and must not be treated as permission to send.
3. Every durable write must validate both optimistic `revision` and the current
   lock `fence`. The included repository is a deterministic PostgreSQL-contract
   fake; a Redis lock alone is never sufficient.
4. Events are ordered by provider `occurredAt`, then durable Inbox
   `receiveSequence`. Duplicate and stale events do not mutate state or grant
   authorization.
5. Pancake tag status is fail-closed. `NHAN_VIEN`, `VAN_DON`, an unverified
   read, or a read failure all deny evaluation and Meta Outbox creation.
6. HUMAN ownership leases last fifteen minutes. Automatic `HUMAN -> BOT` requires all
   of: lease expired, latest tag observation verified absent, and a newly
   accepted customer message whose provider timestamp is after lease expiry.
7. A blocking Pancake tag always overrides lease expiry. HUMAN messages acquire
   or refresh HUMAN ownership.
8. HANDOFF is silent. It never produces customer text or Meta Outbox authority.
   Post-sale reasons request `VAN_DON`; every other handoff requests
   `NHAN_VIEN`. A tag command is permitted only when routing belongs to APP.
9. Normal sales-stage movement follows the documented graph. Backward movement
   is accepted only for explicit parent-product switches or new objections.
   Parent-product switches clear incompatible variant/order-draft state.
10. `POST_SALE` is terminal in the sales-stage machine. A future new-sale flow
    must explicitly define a new conversation boundary instead of silently
    rewinding post-sale state.

## Intended transaction boundary

The worker should acquire a fenced conversation lease, load state, call
`applyInboundEvent`, then atomically save the incremented state and any allowed
Outbox intent with the expected revision/fence. Provider calls happen only
after commit and are outside this package.
