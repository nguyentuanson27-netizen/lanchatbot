# LANA CHATBOT — ERROR LOCATION REPORT

**Scope:** conversations and runtime evidence from August 3, 2026  
**Purpose:** help the Coding Agent quickly locate errors in the source code  
**Test page:** `1198992073286645`

> This document only describes errors, evidence, code locations to inspect, and observed causes. It does not include proposed fixes or test plans.

---

## 1. Error Overview

| ID | Symptom | Severity | First location to inspect |
|---|---|---:|---|
| BUG-01 | The question “có biến thể gì nữa” (“what other variants are there?”) receives no reply | P1 | `apps/worker/src/realtime-runner.ts`, `packages/business-tools/src/sales-strategy-v1.ts` |
| BUG-02 | The bot loses product context after a grounded-schema error | P1 | `apps/worker/src/realtime-runner.ts`, `apps/worker/src/vertex.ts` |
| BUG-03 | A customer correction is interpreted as a size request | P1 | `apps/worker/src/realtime-runner.ts` |
| BUG-04 | The bot recommends a size without a verified size chart | P0 | `apps/worker/src/vertex.ts`, Size Engine integration, guard |
| BUG-05 | A published size chart is still reported as unavailable at runtime | P1 | Size chart resolver, policy bundle/projection |
| BUG-06 | One failed image causes the entire multi-image batch to be silently handed off | P1 | Media resolution, `realtime-runner.ts` |
| BUG-07 | Images belonging to multiple products are collapsed to the first product | P1 | Media resolution, `resolution.primary` |
| BUG-08 | Every URL is treated as `SENSITIVE_CASE` and handed off | P1 | URL guard in `realtime-runner.ts` |
| BUG-09 | A product has multiple images, but the bot sends only one | P2 | `media-selector-v2.ts`, `realtime-product-facts-v2.ts` |
| BUG-10 | A successfully sent Outbox record still retains an old retry error | P2 | Outbox delivery/status handling |

---

## 2. BUG-01 — Variant Question Ends in `NO_REPLY`

### Symptom

In the SD398 conversation, the customer sent:

```text
Khách: có biến thể gì nữa
English: what other variants are there?
```

Decision evidence:

```text
intent: null
origin: NONE
need: NOT_ENOUGH_CONTEXT
strategy: STRATEGY_ASK_CLARIFY
ctaPolicy: NO_ADDITIONAL_CTA
action: NO_REPLY
outboundMessageCount: 0
```

The customer directly asked about content introduced by the bot in the preceding turn, but the system sent no reply.

### Contradictory Decision Signals

- `STRATEGY_ASK_CLARIFY` indicates that the system intends to ask for clarification.
- `NO_ADDITIONAL_CTA` prevents an additional question.
- `NO_REPLY` causes the entire turn to end silently.
- `outboundMessageCount=0` confirms that no outbound message was created.

### Code Locations to Inspect

#### `apps/worker/src/realtime-runner.ts`

Search for:

```text
extractVariantMentions
explicitCustomerBusinessIntent
resolvedProduct
NO_REPLY
```

`extractVariantMentions()` currently appears biased toward identifying concrete variant values such as a size or color. A general question such as “có biến thể gì nữa” does not produce a clear variant query.

#### `packages/business-tools/src/sales-strategy-v1.ts`

Search for:

```text
ctaFor
hasMeasurements
NO_ADDITIONAL_CTA
applyWave2ReplyPolicy
STRATEGY_ASK_CLARIFY
```

The preceding conversation state already contains height and weight, so `hasMeasurements=true`. This value may suppress the CTA even though the current customer message is unrelated to collecting measurements.

### Observed Cause

Several decision layers are not reconciled into one consistent final action:

1. The initial proposal produces `NO_REPLY`.
2. Wave2 strategy produces `STRATEGY_ASK_CLARIFY`.
3. CTA policy produces `NO_ADDITIONAL_CTA`.
4. No final step detects the contradictory combination.

---

## 3. BUG-02 — Product Context Is Lost After `GROUNDED_SCHEMA_INVALID`

### Symptom

After the conversation was already clearly about SD398, the customer sent:

```text
Khách: nhẹ nhàng đi
English: make it gentler / keep it subtle
```

The bot asked the customer to send a product code or product image again.

The customer then had to correct the bot:

```text
đang hỏi áo dài mà
English: I am asking about the áo dài
```

The runtime recorded:

```text
GROUNDED_SCHEMA_INVALID
```

### Impact

- The active product in conversation state is not retained.
- The customer preference is not connected to the current product.
- The bot asks for information already known by the system.
- The conversation flow breaks after the grounded output fails schema validation.

### Code Locations to Inspect

#### `apps/worker/src/realtime-runner.ts`

Search for:

```text
GROUNDED_SCHEMA_INVALID
deterministic fallback
ASK_PRODUCT_SELECTION
resolvedProduct
conversation state
active product
```

Trace the fallback product-resolution order across:

- product resolved in the current turn;
- conversation state;
- product mentioned in the previous bot turn;
- product code in the message;
- media or advertisement context.

#### `apps/worker/src/vertex.ts`

Search for:

```text
GROUNDED_DRAFT_SYSTEM_INSTRUCTION
```

The grounded draft is restricted from directly deciding product, intent, or action. When its output is invalid, deterministic orchestration must preserve context; the evidence shows that this is not happening reliably.

### Observed Cause

An enrichment/schema failure is removing the active product instead of only discarding the invalid model output. The fallback path does not fully preserve verified conversation context.

---

## 4. BUG-03 — The `size` Keyword Produces the Wrong Dialogue Act

### Symptom

The customer sent:

```text
có giá vs size rồi mà
English: you already gave me the price and size
```

In context, the customer is correcting the bot or stating that both pieces of information have already been provided.

The runtime instead classified the message as:

```text
intent: SIZE
```

The system may then call the Size Engine and produce:

```text
VERIFIED_SIZE_CHART_UNAVAILABLE
PRODUCT_TOOL_ERROR
```

### Impact

- The bot repeats the price and sizes that the customer has just said are already known.
- A correction is converted into a business query.
- The size tool is called in the wrong context.
- An unnecessary handoff may be triggered.
- The conversation may move toward size or variant selection even though the customer did not request it.

### Code Location to Inspect

In:

```text
apps/worker/src/realtime-runner.ts
```

Search for:

```text
explicitCustomerBusinessIntent
PRICE
STOCK
SIZE
ETA
```

The classifier currently relies heavily on keywords such as:

```text
size
sz
kích cỡ
cỡ nào
mặc cỡ
```

### Observed Cause

The system does not clearly separate:

- the topic being mentioned;
- the customer’s dialogue act;
- the capability actually being requested.

The presence of the word “size” is being treated almost as sufficient evidence of a size intent.

---

## 5. BUG-04 — The Bot Recommends a Size Without a Verified Source

### Symptom

In the SD398 case:

```text
Khách: 1m6 56kg
English: 1.6 m, 56 kg

Bot: chị mặc size L
English: size L will fit you
```

The runtime later recorded:

```text
VERIFIED_SIZE_CHART_UNAVAILABLE
```

### Data Contradiction

- The bot asserted a specific size for the customer.
- The Size Engine had no verified size chart from which to derive that conclusion.
- A product size list such as `S, M, L` is not sufficient to determine which size fits the customer’s body.

### Impact

- The customer may purchase the wrong size.
- The business claim has no provenance.
- The current guard does not block all unverified size recommendations.
- The same conversation can contain both a concrete size recommendation and a declaration that no verified chart is available.

### Code Locations to Inspect

#### `apps/worker/src/vertex.ts`

Search relevant prompts and fields:

```text
reply
size
measurements
business fact query
intent
```

Determine whether the initial model or grounded model can generate a size claim before verification.

#### `apps/worker/src/realtime-runner.ts`

Trace this order:

```text
initial model
fact resolution
grounded draft
size engine
guard
final reply
```

#### Guard Layer

Search the repository for:

```text
SIZE_RECOMMENDATION
VERIFIED_SIZE_CHART
guard
claim
```

The guard currently appears stronger for price, stock, ETA, and URLs, while the evidence shows that size recommendations are not controlled at the same level.

### Observed Cause

The proposal is validated at whole-response level without clear provenance for each claim. The claim “size L” can enter the final reply even when it did not originate from a verified Size Engine result.

---

## 6. BUG-05 — Published Size Chart Is Still Unavailable at Runtime

### Symptom

The Admin interface displays:

```text
size-chart:SD398
version: v2
revision: 4
status: PUBLISHED
published/updated: 15:36 03/08/2026
```

A new conversation after that time still receives:

```text
VERIFIED_SIZE_CHART_UNAVAILABLE
```

The same error also appears for:

```text
SD375
SD395
SV2447
```

### Impact

- Runtime cannot use the chart even though the Admin interface shows it as published.
- Customers who already provided measurements still receive no size recommendation.
- Some turns are marked with `PRODUCT_TOOL_ERROR` or transferred to handoff.
- The current reason code does not reveal whether the failure is in lookup, scope, status, measurement basis, or bundle projection.

### Code Locations to Inspect

Search the repository for:

```text
size-chart:
VERIFIED_SIZE_CHART_UNAVAILABLE
PUBLISHED
VERIFIED
measurementBasis
policy bundle
revision
artifact
product scope
```

Trace the data path:

```text
Admin publish
→ database/artifact
→ scope mapping
→ policy bundle/projection
→ runtime resolver
→ Size Engine eligibility
```

### Inconsistencies to Verify in Code

- Admin uses `PUBLISHED`, while runtime may require `VERIFIED`.
- The artifact name contains a product code, but its internal scope may not match.
- `measurementBasis` may not be `BODY`.
- The new revision may not have reached the runtime projection.
- Runtime may be using an older bundle or snapshot.
- Artifact parsing or schema validation may reject it.

### Observed Cause

The reason code `VERIFIED_SIZE_CHART_UNAVAILABLE` combines multiple failure conditions and does not indicate the stage at which the artifact was rejected.

---

## 7. BUG-06 — One Failed Image Silently Hands Off the Entire Batch

### Symptom

The system calculates:

```text
uncertainRatio = number of uncertain images / total images
```

When:

```text
uncertainRatio > 20%
```

it records:

```text
MEDIA_UNCERTAIN_RATIO_EXCEEDED
```

and performs a `silent` handoff.

### Effect by Batch Size

| Total images | Failed images | Ratio | Current result |
|---:|---:|---:|---|
| 2 | 1 | 50% | Silent handoff |
| 3 | 1 | 33% | Silent handoff |
| 4 | 1 | 25% | Silent handoff |
| 5 | 1 | 20% | Threshold not exceeded |

### Impact

- In batches of two to four images, one blurred or failed image causes the whole turn to be lost.
- Valid results from other images are not used.
- The customer receives no explanation.
- An agent receives the handoff while the customer believes the chatbot has stopped responding.

### Code Locations to Inspect

Search for:

```text
uncertainRatio
MEDIA_UNCERTAIN_RATIO_EXCEEDED
silent
media resolution
```

Then inspect the corresponding branch in:

```text
apps/worker/src/realtime-runner.ts
```

### Observed Cause

The decision is made at batch level. Different attachment states—download failure, unsupported format, ambiguity, or low confidence—are collapsed into one ratio.

---

## 8. BUG-07 — Images From Different Products Are Collapsed Into `primary`

### Symptom

The media resolver can return multiple products for one batch, but orchestration continues with:

```text
resolvedProduct = resolution.primary
```

`primary` is the first valid product after deduplication.

Example:

```text
image 1 → SD375
image 2 → SD398
```

The system may continue as though the customer only asked about SD375.

### Impact

- The bot may provide the price, size, or details of the wrong product.
- A comparison request involving several products becomes a single-product request.
- A bad recognition result for the first image can dominate the batch.
- Per-image order and recognition results are lost.

### Code Locations to Inspect

Search for:

```text
resolution.primary
media.products
resolvedProduct
distinct products
```

Inspect both the media-resolution implementation and its consumer in:

```text
apps/worker/src/realtime-runner.ts
```

### Observed Cause

The media contract contains multiple-product data, but orchestration supports only one active product. Information is lost at the boundary between the media resolver and the conversation runner.

---

## 9. BUG-08 — Every URL Is Treated as `SENSITIVE_CASE`

### Symptom

When a customer message contains a URL:

```text
containsCustomerUrl = true
```

the current flow:

1. Does not use the URL or associated media for product resolution.
2. Does not call the model.
3. Assigns `SENSITIVE_CASE`.
4. Performs a `silent` handoff.
5. Sends no reply to the customer.

### Affected URL Types

The same behavior is applied to:

- the official website;
- a shop product URL;
- a Facebook post from the page;
- a shop image CDN URL;
- a benign external link;
- a phishing link.

### Impact

- A valid product URL cannot be processed.
- Normal business URLs and dangerous URLs are not distinguished.
- Unnecessary handoffs increase.
- The customer does not know why the bot stopped responding.

### Code Location to Inspect

In:

```text
apps/worker/src/realtime-runner.ts
```

Search for:

```text
containsCustomerUrl
SENSITIVE_CASE
silent
customer URL
```

Also inspect URL/phishing-related tests to identify the current policy.

### Observed Cause

The security guard runs before URL classification. There is no layer that separates first-party links, supported links, unsupported links, and dangerous links.

---

## 10. BUG-09 — Media Selector Sends Only One Image Although Several Exist

### Symptom

For the request:

```text
tư vấn sd375
English: advise me about SD375
```

the Outbox group contains only:

```text
1 text
1 image
```

The worker selected only one image from the beginning; Meta did not drop the remaining images.

### Related Data

The Media Selector is called with:

```text
kind = FULL_LOOK
maxAssets = 3
```

`maxAssets=3` is an upper bound and does not guarantee that three eligible images exist.

The SD375 catalog contains several images tagged:

```text
AO + QUAN
English: TOP + PANTS
```

but the current mapping does not treat this combination as `FULL_LOOK`.

### Code Locations to Inspect

#### Selector Call Site

Search for:

```text
verifiedProductInfoProposal
selectProductMediaV2
kind: "FULL_LOOK"
maxAssets: 3
```

#### `media-selector-v2.ts`

Search for:

```text
asset.view === "FULL_LOOK"
purpose
PRODUCT_OVERVIEW
LOOKBOOK
componentProductId === null
```

#### `realtime-product-facts-v2.ts`

Search for:

```text
productMediaView
FULL_SET
VAY
AO
QUAN
componentProductId
```

### Observed Cause

The mapping promotes only certain tags, such as `FULL_SET` or `VAY`, to `FULL_LOOK`. An image tagged with both `AO` and `QUAN` may be processed by the `AO` branch first and assigned to component `TOP`, resulting in:

```text
componentProductId !== null
```

The image therefore no longer qualifies as a full-product image.

---

## 11. BUG-10 — Outbox Retains a Retry Error After Terminal Success

### Symptom

In the SD375 case:

```text
status: SENT_ACCEPTED
APP_ECHO: present
last_error_code: PANCAKE_CONVERSATION_NOT_FOUND
delivered_at: null
```

The message was retried before being accepted, but the final record still retains the old error.

### Impact

- The dashboard may display a successful message as currently failing.
- A current error cannot be distinguished from an earlier failed attempt.
- `APP_ECHO` may be incorrectly interpreted as delivery.
- Actual failure rates and recovered retry failures are difficult to measure accurately.

### Code Locations to Inspect

Search for:

```text
SENT_ACCEPTED
APP_ECHO
last_error_code
delivered_at
PANCAKE_CONVERSATION_NOT_FOUND
retry
attempt
```

Inspect the Outbox update logic after each attempt and after terminal success.

### Observed Cause

One field is being used simultaneously for:

- the most recent failed attempt;
- the current active error;
- error history.

When a later attempt succeeds, the old error is not separated from the current terminal status.

---

## 12. Relationships Between the Errors

### 12.1. Semantic Errors and Tool Errors Are Mixed Together

Messages such as:

```text
có giá vs size rồi mà
có biến thể gì nữa
đang hỏi áo dài mà
```

are not classified correctly by dialogue act. This causes the system to call the wrong tool or produce an inappropriate action.

### 12.2. Enrichment Failure Can Remove Context

`GROUNDED_SCHEMA_INVALID` does not only discard invalid model output; it can also cause the active product and verified conversation context to be lost.

### 12.3. Partial Failure Can Fail the Entire Turn

- One uncertain image can hand off the whole batch.
- One size-related error can affect the whole turn even when verified price or media remains available.
- One URL can block all processing.

### 12.4. Data Is Lost at Component Boundaries

- The media resolver returns multiple products, but the runner uses only `primary`.
- The catalog contains several images, but mapping produces only one `FULL_LOOK`.
- Outbox contains retry history, but the status model does not separate historical errors from the active error.

### 12.5. Multiple Authorities Participate in the Same Decision

A single turn may be influenced by:

```text
regex intent
initial model
grounded model
wave2 strategy
CTA policy
tool result
guard
sales cycle
handoff policy
```

The evidence in BUG-01 shows that these layers can produce conflicting decisions without a final reconciliation step.

---

## 13. Quick Repository Search Terms

```text
extractVariantMentions
explicitCustomerBusinessIntent
GROUNDED_SCHEMA_INVALID
ASK_PRODUCT_SELECTION
STRATEGY_ASK_CLARIFY
NO_ADDITIONAL_CTA
NO_REPLY
VERIFIED_SIZE_CHART_UNAVAILABLE
PRODUCT_TOOL_ERROR
uncertainRatio
MEDIA_UNCERTAIN_RATIO_EXCEEDED
resolution.primary
media.products
containsCustomerUrl
SENSITIVE_CASE
selectProductMediaV2
FULL_LOOK
productMediaView
componentProductId
SENT_ACCEPTED
APP_ECHO
last_error_code
PANCAKE_CONVERSATION_NOT_FOUND
```

---

## 14. Conclusion

The most severe current errors are:

1. The bot can recommend a size without verified evidence.
2. A direct customer question can end in `NO_REPLY`.
3. A multi-image batch can be lost because one attachment fails.
4. Multiple products can be collapsed into the first product.
5. A valid URL can be treated as a security case and silently handed off.
6. Product context can be lost after a grounded-schema failure.

The errors are concentrated mainly in:

```text
apps/worker/src/realtime-runner.ts
apps/worker/src/vertex.ts
packages/business-tools/src/sales-strategy-v1.ts
media resolution
media-selector-v2.ts
realtime-product-facts-v2.ts
size-chart resolver / policy bundle
Outbox delivery status
```

This document reflects the current error analysis only. No source-code, data, migration, or production-deployment changes have been made.
