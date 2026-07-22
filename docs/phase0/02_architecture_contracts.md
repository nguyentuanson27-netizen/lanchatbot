# Phase 0 — Architecture and Contracts

Status: draft for review; no implementation is authorized by this document.

Scope reviewed: all inactive workflows under `lana_catalog_p2_2`, from `00_P2_2_Qdrant_Payload_Index_Setup.json` through `09_P2_3_Chat_History_Postgres_6_Months.json`.

## 1. Objectives and non-goals

### Objectives

- Move the realtime Facebook chatbot from n8n into one independently deployable application.
- Receive Meta webhooks directly, verify authenticity, durably deduplicate events and acknowledge quickly.
- Serialize work per conversation so simultaneous messages cannot overwrite state or reorder replies.
- Keep the model responsible for intent understanding and drafting only. Deterministic code owns price, stock, ETA, promotions, attachments, order draft, ownership, handoff and sending.
- Send customer replies through Meta Send API. Pancake is used for tag inspection, `Nhân viên` / `Vận Đơn` tag updates and handoff reconciliation, not for sending replies.
- Keep realtime state and an anonymized analytical projection in Redis for 20 days.
- Keep anonymized chat history in PostgreSQL for 6 months and treat PostgreSQL as the analytical system of record.
- Keep n8n for catalog/POS/policy ETL, schedules and optional operational automation only.
- Support shadow, canary and rollback without allowing n8n and the app to reply to the same conversation.

### Non-goals for the first application release

- Rebuild catalog ingestion, XML processing, image embeddings or POS snapshot jobs in the app.
- Build a complete admin UI.
- Create orders or change POS inventory.
- Let AI invent or override price, stock, promotion, freeship, shipping fee or ETA.
- Promise mathematically exactly-once delivery over Meta HTTP. The application can guarantee one durable send intent and avoid known duplicates; a network timeout after Meta accepts a request is inherently ambiguous until an echo or provider response resolves it.
- Activate, publish or modify existing n8n workflows during Phase 0.

## 2. Architectural decisions

| ID | Decision | Rationale |
|---|---|---|
| ADR-001 | Build a modular monolith with separate API and worker processes from one repository. | Strong module boundaries without microservice deployment and tracing overhead. |
| ADR-002 | PostgreSQL owns Inbox, Meta Outbox, Pancake Tag Outbox, release metadata, audit and 6-month anonymized history. | Durable transactions and unique constraints are required for webhook and send safety. |
| ADR-003 | Redis/BullMQ owns dispatch queues, short locks, conversation cache and 20-day analytics projections. | Low latency and queue semantics; Redis is not the sole durable history store. |
| ADR-004 | Acknowledge Meta only after the inbound event is authenticated and committed to PostgreSQL Inbox. | Prevents accepted-but-lost webhook events. |
| ADR-005 | Separate `routing_owner = N8N | APP` from `conversation_owner = BOT | HUMAN`. | Migration routing and human handoff solve different problems and must not share one field. |
| ADR-006 | Send replies directly through Meta Send API. | This matches the existing gateway send path and removes Pancake from message delivery. |
| ADR-007 | Use a Meta Outbox state machine with `AMBIGUOUS` reconciliation. | Blind retry after an HTTP timeout can duplicate a customer-facing message. |
| ADR-008 | Use a separate desired-state Pancake Tag Outbox. | Tagging has different API, idempotency and retry behavior than Meta sending. |
| ADR-009 | Log a bot message as sent history only after Meta returns an accepted `message_id` or a matching Meta echo proves acceptance. | P2.2 currently records drafted bot text before send outcome is known. |
| ADR-010 | Treat Pancake blocking tags fail-closed. | If `Nhân viên`/`Vận Đơn` cannot be verified, the bot must remain silent. |
| ADR-011 | Keep n8n as ETL/scheduler only after cutover. | Existing catalog and POS workflows are useful and not latency-critical. |
| ADR-012 | Version every agent decision by release, prompt, model, catalog and policy version. | Required for replay, rollback and conversion analysis. |

## 3. Target topology

```text
Meta Webhook
    |
    v
API / webhook-gateway
    |-- verify raw-body signature
    |-- normalize provider event key
    |-- INSERT webhook_inbox ON CONFLICT
    `-- HTTP 200 after COMMIT
             |
             v
      inbox-dispatcher -> BullMQ
             |
             v
      conversation-worker
        |-- per-conversation lock + ordering
        |-- routing owner gate
        |-- Pancake blocking-tag reconciliation
        |-- state/readiness/order draft
        |-- product and policy tools
        |-- AI structured decision
        |-- deterministic policy guard
        |-- PostgreSQL Meta Outbox
        `-- PostgreSQL Pancake Tag Outbox
                |                  |
                v                  v
        meta-delivery-worker   pancake-tag-worker
                |                  |
          Meta Send API       Pancake Tag API
                |                  |
             echoes          tag reconciliation

Redis: BullMQ, locks, state/cache, 20-day projections
PostgreSQL: Inbox/Outboxes/audit, anonymized history for 6 months
n8n: XML/Sheets/POS/Qdrant ETL, schedules, optional alerts
```

## 4. Bounded modules

| Module | Owns | Must not own |
|---|---|---|
| `webhook-gateway` | Meta GET verification, raw-body HMAC verification, event normalization, Inbox insert, fast response | AI calls, business lookup, sending |
| `inbox-dispatcher` | Claim committed Inbox rows, enqueue jobs, recover stranded rows | Customer reply logic |
| `conversation-engine` | Conversation ordering, lock, state transitions, readiness, closing sequence, order draft | Price/stock invention, provider HTTP |
| `ownership` | Routing owner, BOT/HUMAN owner, HUMAN lease, blocking-tag gate, fail-closed behavior | Message composition |
| `product-tools` | Exact/alias/semantic/image search, canonical product facts, provenance and freshness | Conversational prose |
| `policy-tools` | Versioned policy retrieval and source references | Making exceptions not present in policy |
| `agent-runtime` | Prompt assembly, model call, strict structured-output parsing | Sending, durable state mutation, sensitive business decisions |
| `policy-guard` | Validate product IDs, URLs, numbers, size, stock, ETA, promotions, sequence and handoff | Generative drafting |
| `meta-delivery` | Meta Outbox, ordered sends, accepted provider IDs, echo reconciliation | Pancake tags |
| `pancake-handoff` | Read tags, desired-state tag Outbox, add `Nhân viên`/`Vận Đơn`, reconciliation | Customer replies |
| `history-privacy` | PII redaction, pseudonymous IDs, PostgreSQL history, Redis 20-day projection, retention | Raw profile serving to analytics |
| `release-control` | Active/previous release manifests, promote, evaluate, rollback, feature flags | Editing production code |
| `observability` | Structured logs, traces, metrics, alerts, dead-letter views, immutable audit | Storing raw secrets or raw PII |
| `etl-contracts` | Versioned contracts consumed from n8n-produced catalog/POS/policy projections | Running realtime chat |

## 5. Identity and key rules

### Canonical identifiers

| Field | Format / derivation | Notes |
|---|---|---|
| `tenant_id` | stable internal UUID | Initially one tenant, required for safe future multi-brand support. |
| `page_id` | Meta Page ID string | Never infer from page name. |
| `psid` | Meta page-scoped recipient ID | PII; never expose in analytical tables. |
| `customer_hash` | `HMAC-SHA256(ANALYTICS_HASH_SALT, tenant_id:page_id:psid)` | Salt must be secret and versioned; not plain SHA-256. |
| `conversation_id` | internal UUID | Unique on `(tenant_id, page_id, psid)` in operational data. Analytics receives UUID plus `customer_hash`, not PSID. |
| `meta_message_id` | Meta `message.mid` or Send API response `message_id` | Primary inbound/outbound provider identity. |
| `provider_event_key` | `meta:page_id:event-type:provider-id` | For messages use `message.mid`; for non-message events use the provider ID or a canonical payload digest. |
| `correlation_id` | UUID per inbound processing attempt | Propagated to tools, AI, Outbox and logs. |
| `causation_id` | upstream event/decision ID | Links message -> decision -> send unit. |
| `reply_plan_id` | UUID for one guarded response plan | One plan may create ordered image and text send units. |
| `send_idempotency_key` | SHA-256 of `conversation_id:reply_plan_id:sequence:payload_hash` | Unique in Meta Outbox. |

### PII boundaries

- Operational tables may contain encrypted PSID and short-lived encrypted webhook payload required for processing.
- Raw webhook payload retention: default 24 hours, maximum 72 hours after successful processing; longer only for quarantined incidents with audited access.
- Customer profile fields such as name, phone and address belong in an encrypted operational profile table with restricted access and a separately defined retention policy. They are not part of 6-month analytical history.
- Analytical tables use `customer_hash` and `text_redacted`; no page access token, PSID, phone, address, email, ID number or full customer name.
- Attachments in analytical history store type/count and optionally a one-way content reference; do not persist signed/private URLs.

## 6. Core event schemas

All timestamps are UTC ISO-8601 in APIs and `timestamptz` in PostgreSQL. All schemas carry `schema_version` and reject unknown enum values at the boundary.

### 6.1 `MetaWebhookReceivedV1`

| Field | Type | Required | Description |
|---|---|---:|---|
| `schema_version` | literal `1` | yes | Contract version. |
| `inbox_id` | UUID | yes | PostgreSQL Inbox row. |
| `provider_event_key` | string | yes | Globally unique normalized event key. |
| `event_type` | enum | yes | `MESSAGE`, `MESSAGE_ECHO`, `DELIVERY`, `READ`, `POSTBACK`, `OTHER`. |
| `page_id` | string | yes | Target Page. |
| `meta_message_id` | string/null | no | Meta message identifier if available. |
| `sender_psid_ciphertext` | bytes/null | no | Encrypted operational identity. |
| `recipient_id` | string/null | no | Page or recipient depending on event. |
| `occurred_at` | timestamp | yes | Meta timestamp converted to UTC. |
| `payload_ciphertext` | bytes | yes | Authenticated encryption of canonical event subset. |
| `payload_sha256` | string | yes | Integrity/debug digest, not a secret. |
| `signature_version` | string | yes | `sha256`. |
| `received_at` | timestamp | yes | Server receive time. |

### 6.2 `InboundMessageV1`

| Field | Type | Required | Description |
|---|---|---:|---|
| `message_id` | string | yes | Meta inbound `mid`. |
| `conversation_id` | UUID | yes | Internal conversation. |
| `page_id` | string | yes | Page ID. |
| `actor_type` | enum | yes | `CUSTOMER`, `BOT`, `HUMAN`. |
| `app_id` | string/null | no | Used to distinguish this bot's echo from other Page activity. |
| `text` | string | conditional | Raw operational text, encrypted at rest where persisted. |
| `attachments` | array | yes | Normalized attachment type and short-lived fetch reference. |
| `occurred_at` | timestamp | yes | Provider event time. |
| `correlation_id` | UUID | yes | Processing trace. |

Actor classification:

1. Non-echo sender PSID -> `CUSTOMER`.
2. Echo with `app_id` matching the configured chatbot Meta App and matching an Outbox/echo candidate -> `BOT`.
3. Other echo or Page-originated message -> `HUMAN` and immediately acquires/refreshes HUMAN ownership.
4. Classification uncertainty -> `HUMAN` and fail closed.

### 6.3 `ConversationStateV4`

| Field | Type | Required | Description |
|---|---|---:|---|
| `schema_version` | literal `4` | yes | Replaces mixed P2.2 schema versions 2/3. |
| `conversation_id` | UUID | yes | Internal ID. |
| `state_revision` | integer | yes | Optimistic concurrency revision. |
| `routing_owner` | enum | yes | `N8N`, `APP`, `DISABLED`. |
| `conversation_owner` | enum | yes | `BOT`, `HUMAN`. |
| `owner_reason` | enum | yes | `DEFAULT`, `HUMAN_ECHO`, `PANCAKE_TAG`, `POST_SALE`, `AGENT_HANDOFF`, `MANUAL`, `UNVERIFIED`. |
| `owner_lease_until` | timestamp/null | no | HUMAN one-hour lease when applicable. A blocking Pancake tag overrides lease expiry. |
| `blocking_tag` | string/null | no | `Nhân viên` or `Vận Đơn`. |
| `current_product_id` | string/null | no | Verified parent product ID. |
| `considered_variant` | object | yes | Verified `offer_type`, `color`, `size`. |
| `purchase_readiness` | enum | yes | `BROWSING`, `CONSIDERING`, `HIGH_INTENT`, `READY`. |
| `readiness_score` | integer 0..100 | yes | Deterministic score, not model authority. |
| `sales_stage` | enum | yes | Defined below. |
| `objection_type` | enum | yes | Defined below. |
| `next_best_action` | enum | yes | Defined below. |
| `unresolved_questions` | string[] | yes | Maximum five redacted items. |
| `order_draft` | object | yes | Product/variant/quantity only; no price, stock or customer PII. |
| `release_versions` | object | yes | Release, prompt, model, catalog, policy. |
| `last_customer_message_id` | string/null | no | Ordering and replay. |
| `last_processed_at` | timestamp/null | no | Audit. |
| `updated_at` | timestamp | yes | Audit. |

Allowed sales stages:

```text
DISCOVERY
PRODUCT_MATCHED
FIT_CONSULTING
OBJECTION_HANDLING
READY_TO_BUY
ORDER_REVIEW
POST_SALE
```

Allowed objection types:

```text
NONE PRICE SIZE_FIT MATERIAL COLOR DELIVERY TRUST_POLICY
NEED_COMPARE NOT_READY PRODUCT_UNCLEAR
```

Allowed next-best actions:

```text
ASK_PRODUCT ASK_VARIANT ASK_MEASUREMENT RECOMMEND_SIZE
ANSWER_OBJECTION OFFER_TWO_CHOICES CONFIRM_ITEM
COLLECT_ORDER_INFO REVIEW_ORDER HANDOFF
```

### 6.4 `BusinessFactEnvelopeV1`

| Field | Type | Required | Description |
|---|---|---:|---|
| `fact_id` | UUID | yes | Traceable lookup. |
| `product_id` | string | yes | Verified canonical parent code. |
| `offer_type` | enum/null | no | `SET_VAY`, `SET_CV`, `SET_QUAN`, `SET`, `DIRECT`, `AO`, `CV`, `QUAN`. |
| `list_price` | integer/null | no | Canonical VND amount. |
| `sale_price` | integer/null | no | Canonical VND amount. |
| `sizes` | string[] | yes | Verified sizes currently supported. |
| `stock_status` | enum | yes | `IN_STOCK`, `OUT_OF_STOCK`, `PRE_ORDER`, `INBOUND`, `MADE_TO_ORDER`, `UNKNOWN`. |
| `stock_quantity` | integer/null | no | `null` means unknown, never zero. |
| `can_order` | boolean | yes | Deterministic from stock and parent fulfillment policy. |
| `delivery_eta` | object/null | no | Total business days to customer: `min_days`, `max_days`, `region`. |
| `business_fact_status` | enum | yes | `OK`, `STALE`, `NOT_FOUND`, `AMBIGUOUS`, `ERROR`. |
| `source` | object | yes | POS snapshot version/time, policy version and Redis key. |
| `fetched_at` | timestamp | yes | Lookup time. |

Rules:

- Qdrant may provide stable search payload and image URLs only.
- POS-derived Redis projection is authoritative for price and stock.
- Google Sheets is the structured operational snapshot/configuration layer, not the live chatbot read path.
- Parent `fulfillment_policy` applies to every set/component/color/size.
- ETA is `prep days + regional transit days`; expose only total time until the customer receives goods.
- `STALE`, `UNKNOWN`, `AMBIGUOUS` or missing facts cannot authorize a claim.

### 6.5 `AgentDecisionV2`

| Field | Type | Required | Description |
|---|---|---:|---|
| `schema_version` | literal `2` | yes | Strict output version. |
| `decision_id` | UUID | yes | Generated by application, not trusted from model. |
| `intent` | string | yes | Normalized intent. |
| `conversation_stage` | sales-stage enum | yes | Model proposal; deterministic engine may override. |
| `objection_type` | objection enum | yes | Model proposal; deterministic engine may override. |
| `product_id` | string/null | yes | Must exist in verified tool results. |
| `requested_variant` | object | yes | `offer_type`, `color`, `size`. |
| `next_best_action` | enum | yes | Must pass closing-sequence guard. |
| `missing_fields` | string[] | yes | Maximum eight. |
| `action` | enum | yes | `REPLY`, `ASK_PRODUCT_SELECTION`, `HANDOFF`, `NO_REPLY`. |
| `reply` | string | yes | Empty for handoff/no-reply. |
| `attachments` | string[] | yes | Maximum three verified HTTPS URLs. |
| `customer_updates` | object | yes | Only customer-stated allowed profile fields. |
| `order_updates` | object | yes | Product/offer/color/size/quantity only. |
| `handoff_reason` | string/null | yes | Required for handoff. |
| `conversation_state_updates` | object | yes | Only non-sensitive proposal fields. |
| `tool_fact_ids` | UUID[] | yes | Provenance used by guard. |

Invalid JSON, missing keys, invalid enums or an unknown field produces deterministic `HANDOFF / INVALID_AGENT_SCHEMA`; it never falls back to free text.

### 6.6 `GuardedReplyPlanV1`

| Field | Type | Required | Description |
|---|---|---:|---|
| `reply_plan_id` | UUID | yes | Durable plan identity. |
| `conversation_id` | UUID | yes | Target conversation. |
| `decision_id` | UUID | yes | Causation. |
| `action` | enum | yes | `REPLY`, `HANDOFF`, `NO_REPLY`. |
| `send_units` | array | yes | Ordered, max three images plus max three short text lines subject to configured cap. |
| `handoff` | object/null | no | Reason and desired tag. |
| `guard_status` | enum | yes | `PASS`, `CORRECTED`, `BLOCKED`. |
| `guard_codes` | string[] | yes | Every deterministic change/block reason. |
| `release_versions` | object | yes | Full traceability. |

Mandatory guard checks:

- Product ID and every attachment URL appear in verified tool output.
- Price, stock, size and ETA numbers are traceable to facts with status `OK` and acceptable freshness.
- Promotions, discounts, vouchers, freeship and shipping fee require a dedicated authorized business fact; absence blocks the claim.
- No shipping PII request before product and size are confirmed.
- Post-sale always becomes silent handoff with `Vận Đơn`.
- Other handoffs are silent and use `Nhân viên`.
- At most three short text lines and one question; selection shows at most three products, comparison at most two.

### 6.7 `MetaOutboxItemV1`

| Field | Type | Required | Description |
|---|---|---:|---|
| `outbox_id` | UUID | yes | Durable row ID. |
| `send_idempotency_key` | string | yes | Unique constraint. |
| `conversation_id` | UUID | yes | Target conversation. |
| `page_id` | string | yes | Page credential selector. |
| `recipient_psid_ciphertext` | bytes | yes | Encrypted recipient identity. |
| `reply_plan_id` | UUID | yes | Parent plan. |
| `sequence_no` | integer | yes | Unique within plan; strict order. |
| `payload_type` | enum | yes | `TEXT`, `IMAGE`. |
| `payload_ciphertext` | bytes | yes | Encrypted Meta payload. |
| `payload_fingerprint` | string | yes | Echo reconciliation hash over normalized semantic payload. |
| `state` | enum | yes | State machine below. |
| `attempt_count` | integer | yes | Delivery attempts. |
| `provider_message_id` | string/null | no | Meta accepted response/echo ID. |
| `not_before` | timestamp | yes | Retry scheduler. |
| `last_error_code` | string/null | no | Taxonomy code. |
| `created_at`, `updated_at` | timestamp | yes | Audit. |

### 6.8 `PancakeTagOutboxItemV1`

| Field | Type | Required | Description |
|---|---|---:|---|
| `tag_outbox_id` | UUID | yes | Durable row. |
| `idempotency_key` | string | yes | Unique on conversation + desired tag + handoff generation. |
| `conversation_id` | UUID | yes | Internal target. |
| `page_id` | string | yes | Pancake credential selector. |
| `pancake_conversation_id` | string | yes | Typically `page_id_psid`, but stored from verified mapping. |
| `desired_tag` | enum | yes | `NHAN_VIEN`, `VAN_DON`. |
| `state` | enum | yes | `PENDING`, `APPLYING`, `APPLIED`, `RETRYABLE`, `FAILED_PERMANENT`. |
| `attempt_count` | integer | yes | Audit. |
| `provider_tag_id` | string/null | no | Resolved tag ID. |
| `last_error_code` | string/null | no | Taxonomy code. |
| `created_at`, `updated_at` | timestamp | yes | Audit. |

Tag application is desired-state/idempotent: read current tags when practical, add only when absent, and treat already-present as `APPLIED`.

### 6.9 `AnonymizedMessageHistoryV2`

| Field | Type | Required | Description |
|---|---|---:|---|
| `history_id` | UUID | yes | Primary key. |
| `provider_message_id_hash` | string | yes | Hash, not raw provider ID in analytics. |
| `conversation_id` | UUID | yes | Internal pseudonymous conversation. |
| `customer_hash` | string | yes | HMAC pseudonym. |
| `page_id` | string | yes | Page-level analysis. |
| `occurred_at` | timestamp | yes | Message time. |
| `sender_type` | enum | yes | `CUSTOMER`, `BOT`, `HUMAN`. |
| `delivery_state` | enum/null | no | `RECEIVED`, `SENT_ACCEPTED`, `DELIVERED`, `READ`, `UNKNOWN`. |
| `text_redacted` | string | yes | Central redaction pipeline output. |
| `message_type` | enum | yes | `TEXT`, `IMAGE`, `MIXED`, `POSTBACK`. |
| `attachment_count` | integer | yes | No attachment binary. |
| `product_id` | string/null | no | Verified product context. |
| `sales_stage` | enum/null | no | Deterministic stage. |
| `prompt_version` | string/null | no | For bot messages. |
| `model_version` | string/null | no | For bot messages. |
| `order_id_hash` | string/null | no | Only pseudonymous link. |
| `outcome` | enum/null | no | `CONFIRMED`, `DELIVERED`, `CANCELLED`, `RETURNED`, `NO_ORDER`. |
| `source` | enum | yes | `META_WEBHOOK`, `META_SEND`, `META_ECHO`, `PANCAKE_SYNC`. |
| `created_at` | timestamp | yes | Ingestion time. |

History write rules:

- Incoming customer and human messages are written after actor classification and central redaction.
- Drafted bot output is an agent decision event, not message history.
- A bot message history row is created only when Meta returns `message_id` (`SENT_ACCEPTED`) or a matching echo resolves an ambiguous send.
- Provider delivery/read callbacks update the existing row, not create another message.
- PostgreSQL retains rows for 6 months. Redis receives a redacted projection for 20 days and is trimmed by time plus a safety max length.

## 7. State machines

### 7.1 Inbox

```text
RECEIVED
  -> ENQUEUED
  -> PROCESSING
  -> PROCESSED

PROCESSING -> RETRYABLE -> ENQUEUED
PROCESSING -> DEAD_LETTER
```

Rules:

- Unique `provider_event_key` makes duplicate delivery return HTTP 200 without a second job.
- A dispatcher lease prevents multiple dispatchers claiming one row.
- `PROCESSED` means the guarded decision and any required Outbox records were committed; it does not mean the customer message was delivered.
- Retryable rows use exponential backoff with jitter. Dead letters require an alert and audited replay.

### 7.2 Conversation ownership

```text
BOT
  -- human/unknown echo --------------------> HUMAN
  -- blocking Pancake tag ------------------> HUMAN
  -- guarded HANDOFF -----------------------> HUMAN
  -- post-sale -----------------------------> HUMAN

HUMAN
  -- lease expires AND no blocking tag
     AND explicit bot-resume policy --------> BOT
```

Rules:

- A one-hour HUMAN lease refreshes on every human echo or blocking-tag observation.
- `Nhân viên` and `Vận Đơn` are hard blocks regardless of lease age. Bot resumes only after the tag is absent and the resume rule is satisfied.
- Pancake tag read failure means `UNVERIFIED`, treated as HUMAN for reply authorization.
- Handoff is silent: no customer-facing placeholder message.

### 7.3 Migration routing ownership

```text
N8N -> APP
N8N -> DISABLED
APP -> N8N       (rollback)
APP -> DISABLED
```

Rules:

- Assignment is sticky per conversation and versioned.
- One inbound event may have exactly one realtime processor authorized to send.
- Shadow mode sets `routing_owner=N8N`; the app evaluates and logs but cannot create Meta Outbox rows.
- Canary changes owner only at a conversation boundary, never mid-reply.

### 7.4 Sales stage

```text
DISCOVERY -> PRODUCT_MATCHED
PRODUCT_MATCHED -> FIT_CONSULTING
PRODUCT_MATCHED -> OBJECTION_HANDLING
FIT_CONSULTING -> OBJECTION_HANDLING
FIT_CONSULTING -> READY_TO_BUY
OBJECTION_HANDLING -> READY_TO_BUY
READY_TO_BUY -> ORDER_REVIEW
* -> POST_SALE
```

Backward movement is allowed when the customer switches product or introduces a new objection. Switching parent product resets incompatible variant/order-draft fields.

### 7.5 Meta Outbox

Required states:

```text
PENDING -> SENDING -> SENT_ACCEPTED
                 \-> AMBIGUOUS

PENDING/SENDING -> RETRYABLE -> PENDING
PENDING/SENDING -> FAILED_PERMANENT
AMBIGUOUS -- matching echo -----------------> SENT_ACCEPTED
AMBIGUOUS -- provider evidence of no send --> RETRYABLE
AMBIGUOUS -- reconciliation timeout --------> MANUAL_REVIEW
SENT_ACCEPTED -> DELIVERED -> READ
```

Transition rules:

- Claim with `SELECT ... FOR UPDATE SKIP LOCKED`; state and lease update in one transaction.
- Only one `SENDING` lease exists per row.
- A normal 429/5xx before any bytes/response ambiguity may be retryable.
- Connection timeout/reset after request transmission becomes `AMBIGUOUS`, not immediately retryable.
- Reconcile an ambiguous send using Meta echo: same Page, recipient, bot App ID, normalized payload fingerprint and bounded time window. Exact provider `message_id` wins.
- Do not claim true exactly-once delivery. If no provider idempotency primitive or conclusive echo exists, unresolved ambiguity goes to manual review rather than blind resend.
- `SENT_ACCEPTED` means Meta accepted the message, not that the recipient received or read it.
- Send units for one reply plan are sequential; unit N+1 waits for N to reach `SENT_ACCEPTED` or a terminal state.

### 7.6 Pancake Tag Outbox

```text
PENDING -> APPLYING -> APPLIED
                  \-> RETRYABLE -> PENDING
                  \-> FAILED_PERMANENT
```

- Resolve tag ID from encrypted multi-page configuration or Pancake tag catalog.
- Check current state where feasible; already-present is success.
- Retry 429/5xx with backoff. Missing page token/tag configuration is permanent and alerts immediately.
- Tag failure never re-enables bot sending; conversation stays HUMAN/unverified.

## 8. API boundaries

External and internal HTTP contracts are versioned. Internal endpoints require service authentication; no page token may be sent by callers.

### External Meta endpoints

| Method/path | Purpose | Success condition |
|---|---|---|
| `GET /webhooks/meta` | Meta verification challenge | Verify token and return challenge. |
| `POST /webhooks/meta` | Receive events | Raw body HMAC valid and Inbox commit succeeds; then return 200. |

Signature rules:

- Require `X-Hub-Signature-256` and compute HMAC-SHA256 over exact raw bytes using the selected Meta App Secret.
- Constant-time comparison; reject missing/malformed signature with 401.
- Do not rely on a static internal header for an internet-facing Meta webhook.
- Multi-app selection must be deterministic from endpoint/tenant configuration, not untrusted body alone.

### Internal application boundaries

| Contract | Consumer -> provider | Request | Response |
|---|---|---|---|
| `ProductSearchV1` | conversation -> product-tools | mode, code/query/image ref, filters, release context | ranked stable products, confidence, verified facts, instruction |
| `PolicySearchV1` | conversation -> policy-tools | normalized question, policy version | policy excerpt/reference, status |
| `OwnershipCheckV1` | conversation -> ownership | conversation, latest tag observation | allow/deny, reason, lease/tag evidence |
| `AgentEvaluateV2` | conversation -> agent-runtime | redacted message, structured state, fact envelopes, release | untrusted `AgentDecisionV2` proposal |
| `GuardDecisionV1` | conversation -> policy-guard | decision, facts, state, customer evidence | `GuardedReplyPlanV1` |
| `QueueMetaSendV1` | conversation -> meta-delivery | guarded reply plan | durable Outbox IDs; no provider send inline |
| `QueueHandoffTagV1` | conversation -> pancake-handoff | reason, desired tag | durable tag Outbox ID |

Module calls should be in-process TypeScript interfaces initially. HTTP boundaries are reserved for external providers and process health/readiness; do not create internal microservices in MVP.

### Health and operations

| Path | Meaning |
|---|---|
| `GET /health/live` | Process event loop is alive; never checks external providers. |
| `GET /health/ready` | PostgreSQL and Redis available, required migrations applied, secrets/config loaded. |
| `GET /internal/metrics` | Authenticated/isolated Prometheus metrics. |
| `POST /internal/releases/:id/promote` | Audited release promotion; admin service identity required. |
| `POST /internal/releases/rollback` | Audited atomic rollback to previous manifest. |

## 9. Persistence contracts

### PostgreSQL tables

| Table | Purpose | Key constraints / retention |
|---|---|---|
| `webhook_inbox` | Durable authenticated provider events | unique `provider_event_key`; encrypted raw subset 24h/72h maximum |
| `conversations` | Stable operational identity and routing | unique tenant/page/encrypted-PSID fingerprint |
| `conversation_states` | Durable state and revision | PK conversation; optimistic `state_revision` |
| `customer_profiles` | Encrypted operational PII | restricted role; retention separately approved |
| `agent_decisions` | Structured model proposal and guard result | no raw PII; 6 months for evaluation |
| `meta_outbox` | Durable customer send intents | unique idempotency key; unique plan/sequence |
| `pancake_tag_outbox` | Durable desired tag updates | unique tag idempotency key |
| `message_history` | Anonymized 6-month chat history | partition monthly; indexes on conversation/time, page/time, stage/outcome |
| `conversation_events` | Funnel, handoff, tool and state events | pseudonymous; 6 months unless approved otherwise |
| `release_manifests` | Active/previous versions | immutable manifests; atomic active pointer |
| `audit_log` | Admin/release/secret access metadata | append-only; no secrets/PII body |

### Redis keys

| Key | Type | TTL | Purpose |
|---|---|---:|---|
| `lock:conversation:{conversation_id}` | string token | 30s renewable | Per-conversation critical section. Release by compare-and-delete Lua. |
| `state:conversation:{conversation_id}` | JSON | 20 days from activity | Low-latency cache of PostgreSQL state. HUMAN lease is one hour; a blocking Pancake tag still overrides lease expiry. |
| `draft:order:{conversation_id}` | JSON | 24h | Verified product/variant/quantity only. |
| `facts:offer:{shop}:{product_id}` | JSON | ETL-configured, typically 2h | POS-derived canonical snapshot from n8n. |
| `release:active` | JSON | none | Cache of PostgreSQL active release. |
| `analytics:messages:v2` | stream | 20 days + safety max | Redacted history projection. |
| `analytics:conversation-events:v3` | stream | 20 days + safety max | Redacted funnel/state projection. |
| BullMQ keys | queue data | queue policy | Dispatch/retry; completed job retention bounded. |

The application must not depend on Redis `MAXLEN` alone for time retention. Daily maintenance trims `MINID` by 20 days and applies a safety cap only after PostgreSQL persistence has succeeded.

### Transaction boundaries

1. **Webhook receive:** verify signature -> insert Inbox -> commit -> HTTP 200.
2. **Conversation decision:** lock conversation -> load state -> evaluate -> insert decision, update durable state, insert Meta/Pancake Outbox as needed, mark Inbox processed -> commit -> update Redis cache/projections.
3. **Meta accepted send:** transition Outbox, store provider message ID and insert/update BOT message history in one PostgreSQL transaction -> publish Redis projection.
4. **Handoff:** update durable owner to HUMAN and insert tag Outbox in one transaction. Tag API happens asynchronously; bot remains blocked while pending/failed.

## 10. Idempotency, ordering and concurrency

### Inbound idempotency

- Database unique constraint on `provider_event_key` is authoritative.
- Redis `SET NX` may reduce load but is not the source of truth.
- For Meta messages: `meta:{page_id}:message:{mid}`.
- For echo: same `mid`, processed as actor/delivery evidence without creating a duplicate history row.
- For delivery/read callbacks: include callback type and watermark/provider ID so updates remain idempotent.
- Canonical-digest fallback is allowed only when Meta provides no stable ID and must include page, type, actor, timestamp and canonical payload digest.

### Conversation ordering

- Queue group key is `conversation_id`.
- One worker holds the renewable Redis lock and a PostgreSQL state revision check.
- Sort by Meta timestamp, then Inbox receive sequence. Do not wait indefinitely for earlier missing events.
- If two customer messages arrive close together, debounce may combine them only before any reply plan is committed; original message identities remain separate.
- State update uses `WHERE state_revision = expected_revision`; conflict reloads and reevaluates, never last-write-wins.

### Outbound idempotency

- Creating the same guarded reply plan twice conflicts on `send_idempotency_key` and returns the existing Outbox row.
- Provider acceptance is stored before the worker releases the Outbox lease.
- An accepted row is never sent again.
- `AMBIGUOUS` cannot transition directly to `PENDING`; reconciliation or explicit manual approval is required.
- A matching bot echo both resolves the Outbox and suppresses a duplicate `HUMAN` classification/history row.

### Ownership safety

- Authorization to generate text does not authorize sending. The delivery worker rechecks routing owner and conversation owner immediately before Meta send.
- If owner changed to HUMAN after a reply was planned, all unsent Outbox rows for that plan become `CANCELLED_OWNER_CHANGED`.
- If Pancake tag status is stale beyond the configured threshold, fail closed and schedule reconciliation.

## 11. Error taxonomy

Error codes are stable machine-readable values. Provider details belong in redacted metadata, not in code strings.

| Category | Examples | Retry / behavior |
|---|---|---|
| `AUTH` | `META_SIGNATURE_INVALID`, `META_VERIFY_TOKEN_INVALID`, `SERVICE_AUTH_INVALID` | No retry; reject and alert on rate threshold. |
| `CONFIG` | `PAGE_NOT_REGISTERED`, `META_PAGE_TOKEN_MISSING`, `META_APP_SECRET_MISSING`, `PANCAKE_TAG_ID_MISSING` | Permanent; fail closed and alert. |
| `INBOX` | `INBOX_COMMIT_FAILED`, `INBOX_LEASE_EXPIRED`, `INBOX_DEAD_LETTERED` | Retry infrastructure errors; never acknowledge before commit. |
| `CONCURRENCY` | `CONVERSATION_LOCK_BUSY`, `STATE_REVISION_CONFLICT`, `ROUTING_OWNER_CHANGED` | Short retry/reload; no duplicate send. |
| `OWNERSHIP` | `HUMAN_LEASE_ACTIVE`, `PANCAKE_BLOCKING_TAG`, `PANCAKE_TAG_UNVERIFIED` | Silent stop; refresh/reconcile. |
| `PRODUCT` | `PRODUCT_NOT_FOUND`, `PRODUCT_AMBIGUOUS`, `PRODUCT_TOOL_ERROR` | Ask selection or silent handoff according to guard. |
| `BUSINESS_FACT` | `FACT_STALE`, `PRICE_MISSING`, `PRICE_AMBIGUOUS`, `STOCK_UNKNOWN`, `ETA_MISSING`, `UNAUTHORIZED_PROMOTION` | Never fabricate; handoff or ask required qualifier. |
| `AGENT` | `MODEL_TIMEOUT`, `INVALID_AGENT_SCHEMA`, `INVALID_AGENT_ENUM`, `AGENT_TOOL_LOOP_LIMIT` | Bounded retry only when safe; otherwise silent handoff. |
| `POLICY_GUARD` | `UNVERIFIED_PRODUCT_ID`, `UNVERIFIED_URL`, `UNVERIFIED_NUMBER`, `CLOSING_SEQUENCE_CORRECTED`, `RAW_URL_BLOCKED` | Correct deterministic sequence or block/handoff. |
| `META_SEND` | `META_RATE_LIMITED`, `META_REJECTED`, `META_TIMEOUT_AMBIGUOUS`, `META_TOKEN_EXPIRED` | Backoff for safe retry; ambiguous reconciliation; permanent auth alert. |
| `PANCAKE` | `PANCAKE_RATE_LIMITED`, `PANCAKE_CONVERSATION_NOT_FOUND`, `PANCAKE_TAG_APPLY_FAILED` | Retry safe errors; remain HUMAN/fail closed. |
| `PRIVACY` | `PII_REDACTION_FAILED`, `ANALYTICS_RAW_PII_DETECTED`, `ENCRYPTION_KEY_UNAVAILABLE` | Quarantine; do not publish analytics. |
| `RETENTION` | `POSTGRES_RETENTION_FAILED`, `REDIS_TRIM_BLOCKED_ARCHIVE_LAG` | Alert; prefer delayed Redis trim over data loss. |

Every error record includes `correlation_id`, module, code, retryability, page ID, pseudonymous conversation ID, release versions and timestamp. It must exclude tokens, raw request bodies and unredacted customer text.

## 12. Release and rollback contract

`ReleaseManifestV2`:

| Field | Description |
|---|---|
| `release_id` | Immutable application/release identifier. |
| `prompt_version` | Prompt package version. |
| `model_provider`, `model_name`, `model_version` | Exact runtime selection. Planned agent/sub-agent work uses GPT-5.6 SOL with high reasoning where the platform supports it; production chatbot model remains an explicit release choice. |
| `catalog_version`, `catalog_collection` | Stable Qdrant release. |
| `policy_version`, `policy_collection` | Policy release. |
| `business_rules_version` | Deterministic guard/readiness rules. |
| `schema_versions` | Input/output/state schema versions. |
| `feature_flags` | Shadow, canary, send enabled and guarded experiments. |
| `activated_at`, `activated_by`, `reason` | Audit. |

Promotion validates referenced Qdrant collections, schema compatibility, secrets/config presence and migration version. Promotion atomically moves active -> previous. Rollback changes the active manifest and routing assignment but never deletes historical data or outstanding Outbox rows; delivery workers reevaluate owner/release safety before send.

## 13. Repository layout

```text
lana_chatbot_app/
  apps/
    api/                         # Meta webhook and operations HTTP
    worker/                      # Inbox, conversation and provider workers
    admin/                       # Later phase; not MVP-critical
  packages/
    contracts/                   # Schemas, enums, generated validators
    config/                      # Typed config and page registry interfaces
    webhook-gateway/             # Signature and event normalization
    inbox/                       # Durable Inbox and dispatcher
    conversation/                # State/readiness/closing/order draft
    ownership/                   # Routing and BOT/HUMAN gates
    product-tools/               # Qdrant + business fact composition
    policy-tools/                # Policy retrieval
    agent-runtime/               # Prompt/model/structured output
    policy-guard/                # Deterministic response validation
    meta-delivery/               # Meta Outbox and echo reconciliation
    pancake-handoff/             # Tag Outbox and reconciliation
    history-privacy/             # Redaction, analytics, retention
    release-control/             # Promote/evaluate/rollback
    observability/               # Logs, traces, metrics, alerts
    database/                    # PostgreSQL repositories/migrations
    redis/                       # Redis/BullMQ clients and key policy
    testing/                     # Provider fakes, fixtures, replay helpers
  tests/
    contract/
    unit/
    integration/
    replay/
    golden/
    failure-injection/
  deploy/
    docker-compose.yml
    migrations/
    dashboards/
  docs/
    phase0/
    runbooks/
```

Ownership rule for parallel implementation: the main integrator owns `packages/contracts`; sub-agents propose contract changes through review and do not directly create incompatible schemas.

## 14. P2.2-to-application mapping

| P2.2 workflow / behavior | Application destination | Migration note |
|---|---|---|
| `00` Qdrant payload index setup | n8n ETL, unchanged | Remains inactive/manual until separately authorized. App consumes indexed collection. |
| `01` catalog ingestion, XML/Sheets/images/Vertex/Qdrant | n8n ETL | Keep outside realtime app. Define catalog release contract only. |
| `02` POS snapshot -> Sheets/Redis | n8n ETL -> `facts:offer:*` | Preserve POS as truth and parent fulfillment policy. App validates freshness/status. |
| `03` product tool exact/image/text search | `product-tools` | Preserve exact-code-first, selection threshold, max-three images and canonical facts. Replace n8n tool call with typed interface. |
| `04` verification webhook | `webhook-gateway` | Meta raw-body HMAC belongs here; internal-key-only check is insufficient for public ingress. |
| `04` `Code in JavaScript_phan_loai` | page registry + actor classifier | Remove hard-coded page chain; encrypted multi-page registry. |
| `04` `giohang` debounce/buffer | conversation queue/debounce | Preserve message identities; use bounded debounce, not unstructured temporary history. |
| `04` conversation state/readiness/order draft | `conversation-engine` + PostgreSQL/Redis cache | Upgrade to schema v4, revision checks and separate routing/conversation owner. |
| `04` Pancake tag lookup and strict gate | `ownership` + `pancake-handoff` | Fail closed; correct human/bot echo classification. |
| `04` structured AI parser and prompt | `agent-runtime` | Strict `AgentDecisionV2`; invalid output -> handoff. |
| `04` business attachment/numeric gate | `policy-guard` | Preserve and strengthen provenance-based checks. |
| `04` Meta send gateway HTTP calls | `meta-delivery` | Direct Meta Send API through durable Outbox; do not use Pancake to send. |
| `04` Redis HANDOFF + Pancake tag | durable owner transition + Pancake Tag Outbox | Handoff remains silent. Post-sale -> `Vận Đơn`; all other cases -> `Nhân viên`. |
| `04` agent/tool analytics | `observability` + `message_history`/events | Draft event and sent message must be distinct. |
| `04` incoming 20-day message log | `history-privacy` | Central redaction, proper BOT/HUMAN classification, PostgreSQL primary history. |
| `05` policy tool | `policy-tools` | Preserve version/provenance; tool errors hand off. |
| `06` release control | `release-control` | PostgreSQL immutable manifests plus Redis cache; audited promotion/rollback. |
| `07` Redis retention | app scheduled maintenance | Trim 20-day projections only when PostgreSQL projection is current. |
| `08` Telegram alert test | `observability` integration test/runbook | Telegram alert delivery is operational, not chatbot business logic. |
| `09` Redis -> PostgreSQL archive | `history-privacy` writer/backfill | Replace hourly n8n dependency. App writes PostgreSQL durably and asynchronously projects to Redis. Keep old workflow only for legacy backfill until verified. |

### Known P2.2 gaps corrected by the target contract

- P2.2 classifies most echoes as HUMAN and suppresses bot echoes by text fingerprint. Target uses configured Meta App ID plus Outbox/provider ID reconciliation.
- P2.2 records BOT history before Meta send succeeds. Target creates sent history at `SENT_ACCEPTED` or confirmed echo.
- P2.2 Redis initial state save uses `NX` and later Lua merges without a durable revision. Target uses PostgreSQL revision plus Redis lock.
- P2.2 has no durable Meta Inbox or Meta Outbox. Target provides both.
- P2.2 retries Pancake HTTP but does not durably queue desired tag state. Target uses a dedicated tag Outbox.
- P2.2 mixes routing and human ownership in workflow branches. Target explicitly separates the two.
- P2.2 redaction regexes are useful but incomplete for free-form Vietnamese addresses/names. Target centralizes redaction and adds a PII leakage detector/quarantine path.

## 15. Alternatives considered

| Alternative | Decision |
|---|---|
| Keep all realtime logic in n8n | Rejected for long-term concurrency, durable Outbox, testability and multi-page secret management. |
| Rewrite all ETL into the app immediately | Rejected; high risk with little realtime benefit. |
| Start with microservices | Rejected for MVP; use bounded modules in a modular monolith and split only after measured need. |
| Redis-only Inbox/Outbox | Rejected; persistence/eviction and transaction requirements favor PostgreSQL as authority. |
| Send through Pancake | Rejected; confirmed channel is Meta Send API. Pancake remains tags/handoff only. |
| Blind retry Meta timeouts | Rejected; may duplicate customer replies. Use `AMBIGUOUS` and echo reconciliation. |
| Store complete raw chat for analysis | Rejected; analytical history is redacted/pseudonymous. Raw operational data is encrypted and short-lived/restricted. |
| Let model calculate readiness and choose business facts | Rejected; deterministic engine and tools own these decisions. |

## 16. Open questions requiring owner confirmation

These questions do not block repository scaffolding but must be resolved before live send:

1. Is there one Meta App for every Page, or multiple Apps? Provide App ID -> App Secret -> Page mapping without posting secrets in source control.
2. What is the exact current gateway behavior and Meta Graph API version? Is it safe to retire after the app receives webhooks directly?
3. Does Meta echo reliably include the configured bot `app_id` for every Page and send type in this account? Capture sandbox evidence for text and image.
4. What reconciliation window is acceptable before an ambiguous send goes to manual review (recommended starting point: 60 seconds for echo, no blind resend)?
5. Should a conversation ever return from HUMAN to BOT automatically when the one-hour lease expires, or only after blocking Pancake tags are removed? Recommended: both lease expired and tag absent, plus a new customer message.
6. Confirm the authoritative Pancake conversation-ID mapping for all Pages; do not assume `page_id_psid` without verification.
7. Confirm tag IDs for `Nhân viên` and `Vận Đơn` per Page and whether tag removal is manual only.
8. Define the order/POS outcome feed used to populate `CONFIRMED`, `DELIVERED`, `CANCELLED`, `RETURNED`, `NO_ORDER`.
9. Approve raw encrypted Inbox retention (recommended 24h, incident maximum 72h) and operational customer-profile retention.
10. Confirm PostgreSQL backup, encryption-at-rest, role separation and restore objectives.
11. Confirm the acceptable business-fact freshness threshold (P2.2 currently defaults to 1,200 seconds while POS snapshots run every 10 minutes).
12. Confirm whether outbound image must precede text and the maximum number of Meta API send units per reply plan.
13. Decide whether n8n shadow evaluation remains available during migration or the app alone performs shadow decisions.

## 17. Phase 0 acceptance criteria

Phase 0 architecture/contract work is accepted when all items below are reviewed and explicitly approved:

- [ ] Every P2.2 workflow `00`–`09` has a documented destination or retained n8n responsibility.
- [ ] Meta is the only customer-message send provider; Pancake is documented as tag/handoff provider only.
- [ ] Meta raw-body `X-Hub-Signature-256` verification and durable Inbox-before-200 behavior are approved.
- [ ] Inbox unique key, conversation ordering, state revision and lock behavior are unambiguous.
- [ ] `routing_owner` and `conversation_owner` are separate contracts.
- [ ] HUMAN one-hour lease, blocking-tag override and fail-closed tag behavior are approved.
- [ ] Agent output schema and deterministic policy guard enumerations are frozen for MVP.
- [ ] Business fact authority is frozen: POS/Redis for price-stock, parent policy for fulfillment, Qdrant only for stable search data.
- [ ] Meta Outbox states include `PENDING`, `SENDING`, `SENT_ACCEPTED`, `AMBIGUOUS`; ambiguous timeout is never blindly retried.
- [ ] Echo reconciliation criteria are proven in a Meta test Page or documented as an unresolved live-send blocker.
- [ ] Pancake Tag Outbox is separate and idempotent; failed tag application leaves the bot blocked.
- [ ] Bot history is written only after Meta acceptance/echo evidence, not at draft time.
- [ ] PostgreSQL 6-month and Redis 20-day retention contracts, PII boundaries and redaction/quarantine behavior are approved.
- [ ] Error taxonomy and retry/permanent/ambiguous classifications are agreed.
- [ ] Release manifest, shadow/canary routing and rollback behavior are agreed.
- [ ] Open questions required for live send have named owners and due dates.

## 18. Implementation gates after Phase 0

This document does not authorize implementation. Once accepted, implementation should proceed through these gates:

1. Contract package and migrations.
2. Provider fakes and failure-injection tests.
3. Webhook/Inbox with sending disabled.
4. Conversation and business-tool parity using replay.
5. Meta/Pancake Outboxes in sandbox.
6. Shadow mode where only n8n may send.
7. Sticky conversation canary with one Page.
8. Production promotion and immediate rollback runbook rehearsal.

No gate may activate or publish an n8n workflow, access production by SSH, or enable customer sends without separate explicit authorization.
