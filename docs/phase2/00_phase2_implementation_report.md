# Phase 2 implementation report

## Status

Phase 2 is complete for local replay/shadow use. It is not approved for production traffic.

No workflow was activated or published. No SSH connection, VPS mutation, n8n mutation,
provider API call, or customer message was made during this phase.

## Phase 1 reassessment

Phase 1 established the contracts, verified Meta webhooks, durable Inbox/Outbox primitives,
queue abstractions, and safe defaults. Its unit coverage was sound, but it was not yet a
working production path: the API was not composed with a real PostgreSQL/Redis runtime,
provider clients were absent, and the gateway/runtime on the VPS had not been audited.

Phase 2 therefore remains fail-closed and builds the domain and adapter layers needed for
replay and shadow evaluation before any live send path is allowed.

## Delivered

### Conversation engine

- Structured conversation state instead of using raw chat history as state.
- Separate routing owner and conversation owner.
- Revision/fencing and event ordering protection against stale concurrent updates.
- One-hour human ownership lease.
- Bot reply is blocked when the conversation has a verified `Nhân viên` or `Vận Đơn` tag.
- A stale or unverified Pancake read cannot weaken an existing stronger blocking state.
- Silent handoff with reason taxonomy; the customer receives no handoff message.
- Sales-stage state for consulting and closing flows.

### Business tools and policy guard

- Product resolution order: exact product code, then alias, then stable semantic search.
- Qdrant is restricted to relatively stable search attributes.
- POS live data or a fresh structured snapshot is authoritative for price and stock.
- Inventory composition supports `SV`, `SQ`, `CB`, and direct product codes.
- Fulfilment policy is inherited from the parent product.
- ETA is composed as delivery-to-customer information from structured preparation and
  shipping facts.
- The model proposal is always passed through a deterministic guard.
- The guard prevents the model from inventing price, promotion, stock, freeship, shipping
  fee, or ETA.

### Channel adapters

- Meta delivery is disabled by default and requires an injected transport.
- The Meta base host is restricted to `graph.facebook.com`.
- Delivery results distinguish accepted, known-not-transmitted retryable, permanent, and
  ambiguous outcomes so ambiguous sends are never blindly retried.
- Pancake is restricted to reading conversations/tags and adding an allow-listed tag.
- Pancake credentials are represented as `page_access_token` query data, never logged or
  stored in the repository.
- The Pancake adapter has no method for sending a customer message.
- Tag intent is `Vận Đơn` for post-purchase cases and `Nhân viên` for other handoffs.

### Replay/shadow runtime

- Composes tag observation, conversation state, business guard, silent handoff, and tag
  intent.
- Hard invariant: `sendEnabled=false`.
- Hard invariant: no Meta Outbox send intent is created.
- In n8n/shadow ownership, no Pancake side effect is requested.

## Review fixes applied

- Corrected Vietnamese alias matching and promotion detection around non-ASCII text.
- Prevented an older/unverified Pancake observation from clearing a verified blocking tag.
- Restricted provider hosts to avoid token exfiltration through misconfiguration.
- Aligned the Pancake tag request shape and query-token handling with its documented API.
- Added an explicit post-guard silent-handoff state transition.

## Verification

- Type checking: passed.
- Unit and integration tests: 89/89 passed.
- Production builds: passed for all workspace projects.
- No live provider transport was used; all adapter tests use injected fakes.

Test distribution:

| Package | Tests |
| --- | ---: |
| contracts | 5 |
| database | 2 |
| secrets | 4 |
| conversation-engine | 17 |
| durable-messaging | 12 |
| business-tools | 15 |
| meta-delivery | 11 |
| meta-webhook | 5 |
| pancake-handoff | 8 |
| worker | 2 |
| api | 3 |
| chat-runtime | 5 |
| **Total** | **89** |

## Remaining before Phase 3 or any live test

1. Run PostgreSQL and Redis integration tests and compose API -> Inbox -> queue -> worker.
2. Connect the chat runtime to the worker while retaining `sendEnabled=false`.
3. Implement real POS, Google Sheets, Qdrant, Redis snapshot, and PostgreSQL history adapters.
4. Add a secret manager/KMS integration; do not place page tokens in environment files at
   large scale.
5. Audit the current VPS gateway and verify its Meta signature and deduplication behavior.
6. Confirm Meta Graph API version and Pancake response/pagination behavior in sandbox.
7. Add the structured AI-output runtime and evaluate it only through anonymized replay first.
8. Replay the three-month chat dataset, establish quality/safety baselines, then run shadow
   mode. A canary send gate requires separate explicit approval.

## Known limitations

- PostgreSQL/Redis were not started locally, so persistence and queue integration are not yet
  end-to-end verified.
- The API intentionally returns unavailable readiness where real infrastructure is missing.
- Provider adapters are not wired to production transports.
- No live POS/Qdrant/Sheets adapter exists yet; Phase 2 uses ports and deterministic fakes.
- No model call is included in Phase 2.
- The existing gateway and imported n8n workflows were not changed in this phase.

