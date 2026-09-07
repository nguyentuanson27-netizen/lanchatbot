# Product Image Recognition V2 — Cutout-only + Gemini Embedding 2 / 3072D

> **Status:** `SPEC_READY_FOR_PLANNING`
> **Date:** `2026-09-07`
> **Target mode:** `ENGINEERING_PREPROD`
> **Process profile:** `SOLO_PREPROD_MINIMAL`
> **Scope:** product-image recognition only
> **Supersedes for future implementation:** `docs/current/MEDIA_RECOGNITION_CUTOUT_AI_IMPLEMENTATION_PLAN.md`
> **Important:** this document does not authorize deployment, migration, page-allowlist changes, or live-runtime mutation.

## 1. Objective

Replace the current image-recognition path with a simpler exact-SKU pipeline for fashion products that can look almost identical at a coarse level.

The target is not "find a similar product". The target is:

> Identify the exact catalog SKU when the customer image contains enough visible evidence; otherwise return `AMBIGUOUS` or `NOT_FOUND` instead of forcing a match.

High-value discriminators include:

- pattern;
- embroidery;
- buttons;
- neckline and sleeve details;
- trim and seam details;
- material/texture;
- small local motifs;
- tailoring/cut details;
- color details.

## 2. Locked architecture decisions

V2 requirements:

1. Image vector retrieval is **CUTOUT-only**.
2. Embedding model is **`gemini-embedding-2`**.
3. Embedding dimension is **3072**.
4. Catalog and customer use the same V2 preprocessing implementation.
5. Qdrant retrieval uses **exact search**.
6. Retrieval returns **Top 5 unique SKUs**, not Top 5 image points.
7. The exact winning Qdrant image point for each SKU is preserved as reranker evidence.
8. Every non-empty shortlist goes through Gemini reranking.
9. Gemini may select candidate rank 1 through 5.
10. V2 has no RAW retrieval, RAW/CUTOUT merge, or RAW fallback.
11. V2 does not persist cutout files.
12. Existing P2.3B metadata staging and Human Gate remain unchanged.
13. RemBG remains the background-removal implementation for this scope.
14. Text search is outside this scope.
15. V2 has no runtime fallback to the old recognition engine.
16. V2 has no A/B, shadow, percentage, or dual-recognition path.
17. The initial V2 runtime has **no recognition-result cache**.
18. Once activated, V2 is the only image-recognition path.

## 3. Existing catalog boundary to reuse

Current catalog source flow remains:

```text
Admin upload
    ↓
manual_image_intake
STATUS = PENDING_AI
    ↓
P2.3B
    ↓
AI metadata classification
    ↓
image_registry
REVIEW_STATUS = PENDING
    ↓
HUMAN APPROVAL
    ↓
REVIEW_STATUS = APPROVED
ACTIVE = TRUE
```

Reuse the existing concepts that already work:

- catalog row/job selection;
- Human Gate;
- image download/preparation;
- RemBG invocation;
- deterministic image point identity;
- hash/idempotency pattern;
- retry/error handling;
- delete semantics;
- Redis lock/progress pattern;
- run summary/observability pattern.

Do **not** reuse `P23cPublisher.publishPoint()` unchanged because the current method publishes all legacy vectors:

```text
image_raw
image_cutout
product_text
```

V2 needs a focused recognition publisher that writes only the V2 cutout vector.

## 4. Target architecture

### Catalog

```text
image_registry
APPROVED + ACTIVE
       ↓
V2 Catalog Publisher
       ↓
shared preprocess
       ↓
RemBG
       ↓
CUTOUT
       ↓
Gemini Embedding 2 / 3072D
       ↓
Dedicated Qdrant recognition collection
```

### Customer

```text
customer image
       ↓
safe download
       ↓
shared preprocess
       ↓
RemBG
       ↓
CUTOUT
       ↓
Gemini Embedding 2 / 3072D
       ↓
Qdrant EXACT grouped retrieval
       ↓
Top 5 unique SKUs
       ↓
winning image-point evidence
       ↓
Gemini reranker
       ↓
MATCHED | AMBIGUOUS | NOT_FOUND | ERROR
```

## 5. Catalog eligibility and Human Gate semantics

V2 follows the existing publication semantics.

```text
ACTIVE = FALSE
→ DELETE existing V2 point if present

ACTIVE = TRUE + REVIEW_STATUS = APPROVED
→ UPSERT/refresh when required

ACTIVE = TRUE + REVIEW_STATUS != APPROVED
→ HOLD
```

`HOLD` means:

- do not create or update the V2 point;
- do not implicitly delete a previously published point solely because the review status changed to `PENDING`, `REJECTED`, or `STALE`.

`ACTIVE = FALSE` is the explicit withdrawal/delete signal.

`SIZE_GUIDE` images are not valid recognition candidates. If an existing V2 point becomes classified as `SIZE_GUIDE`, remove it from the recognition collection.

The catalog point model remains:

> **One catalog image = one Qdrant point.**

A SKU can therefore have multiple independent points such as front, back, model, side, and detail images.

## 6. Shared V2 preprocessing

Catalog and customer must use the same implementation:

```text
decode
↓
orientation normalization
↓
bounded resize
↓
canonical PNG
↓
RemBG
↓
CUTOUT PNG
↓
Gemini Embedding 2
```

Canonical bound:

```text
maxDimension = 1024px
```

Rules:

- preserve aspect ratio;
- do not upscale smaller images;
- bound both width and height;
- output PNG before RemBG;
- do not crop away garment boundaries or local details.

Cutout remains an in-memory Buffer and is discarded after embedding.

V2 does not add:

- persistent cutout files;
- cutout URLs;
- `storage_path_cutout`;
- a new cutout bucket.

If RemBG fails:

```text
catalog → failed publish / retry
customer → ERROR
```

There is no RAW or legacy fallback.

## 7. Gemini Embedding 2 contract

V2 uses:

```text
provider = Vertex AI
model = gemini-embedding-2
dimension = 3072
location = us
```

Reuse the existing Google Cloud project/service-account authentication path. Do not introduce a separate Gemini API key for this feature.

The existing `multimodalembedding@001:predict` request/response schema must not be reused by only changing the model name.

Required Vertex contract:

```text
service endpoint:
https://aiplatform.us.rep.googleapis.com

method:
:embedContent
```

Path family:

```text
POST https://aiplatform.us.rep.googleapis.com/v1/projects/<PROJECT_ID>/locations/us/publishers/google/models/gemini-embedding-2:embedContent
```

The request sends the CUTOUT PNG as Gemini inline media using `Content.parts[].inlineData`, conceptually:

```json
{
  "content": {
    "parts": [
      {
        "inlineData": {
          "mimeType": "image/png",
          "data": "<base64 CUTOUT PNG>"
        }
      }
    ]
  }
}
```

3072 is the default/max output dimensionality. Do not reuse legacy `parameters.dimension` from `multimodalembedding@001`.

The response vector is read from:

```text
response.embedding.values
```

Reject the response unless it is exactly a finite 3072D numeric vector.

Catalog and customer must use the same:

- model;
- dimension;
- preprocessing implementation/version;
- RemBG/cutout implementation/version.

Never mix vectors from the old 1408D embedding space with V2.

References:

- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/embedding-2
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-multimodal-embeddings
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1beta1/projects.locations.publishers.models/embedContent

## 8. Dedicated Qdrant recognition collection

V2 uses a dedicated collection instead of modifying the existing multimodal collection in place.

Required vector schema:

```text
image_cutout:
  size: 3072
  distance: Cosine
```

The V2 recognition collection does not need:

```text
image_raw
product_text
```

Minimum payload:

```text
product_id
ma_sp
brand

image_url
image_role
image_type
image_angle
image_detail_type
image_parts_visible
image_quality_score
image_content_sha256

active
source_hash
embedding_pipeline_version
published_at
```

`embedding_pipeline_version` represents the embedding-producing contract as one value, for example conceptually:

```text
ge2-3072-pre1024-rembg-u2netp-v1
```

Do not duplicate this same reconciliation state into separate per-point fields for model, dimension, preprocessing version, and cutout version unless the implementation already needs them for another concrete reason.

## 9. V2 publication state and idempotency

The V2 collection itself is the source of truth for V2 publication state.

Do not use the legacy `PUBLISHED_HASH/PUBLISHED_AT` columns as authoritative V2 state.

V2 compares the current catalog job with the existing V2 point using only the state needed to decide whether the recognition point is current:

```text
source_hash
embedding_pipeline_version
```

Decision contract:

```text
point missing
→ FULL_EMBED

source_hash changed
→ FULL_EMBED

embedding_pipeline_version changed
→ FULL_EMBED

state matches
→ NOOP

explicit delete condition
→ DELETE
```

A metadata-only change may cause a full re-embed under this simple contract. That is acceptable for V2; do not add a second reconciliation system merely to avoid occasional extra embedding work.

No new database dirty flag is required.

V2 lock/progress keys must use a V2-specific namespace that includes the V2 recognition collection/pipeline identity. Do not share the existing P2.3C lock/progress namespace.

## 10. Point identity

Preserve deterministic image-level point identity:

```text
same catalog image
→ same point ID

different catalog image
→ different point ID
```

Do not use `product_id` alone as point ID because one product can have multiple catalog images.

## 11. Customer image security

Preserve the existing realtime security boundary for customer-controlled image URLs and bytes:

- HTTPS-only external URL policy;
- allowed-host policy;
- bounded redirects;
- private-IP/loopback blocking;
- MIME validation;
- byte-size limit;
- timeout/cancellation;
- bounded image decoding/preprocessing.

External catalog/customer images remain untrusted input.

## 12. Exact grouped retrieval

V2 requires a Qdrant version that supports grouped query points.

Normative retrieval contract:

```text
POST /collections/<recognitionCollection>/points/query/groups
using = image_cutout
group_by = product_id
group_size = 1
limit = 5
params.exact = true
filter active = true
```

Meaning:

- `group_by = product_id` produces unique SKU groups;
- `group_size = 1` keeps the highest-scoring image point for each SKU;
- `limit = 5` returns at most five SKU groups;
- `exact = true` disables approximate nearest-neighbor behavior for this query.

This directly satisfies the shortlist requirement:

```text
min(5, number of eligible SKU groups)
```

Do not implement a second raw-point paging/over-fetch algorithm as a compatibility fallback.

If the deployed Qdrant version does not support this grouped query contract, V2 is not deployment-ready. Upgrade/configure Qdrant or block deployment; do not add a second retrieval algorithm.

The adapter must preserve the winning point ID, score, and payload for every returned SKU group.

Reference:

- https://api.qdrant.tech/api-reference/search/query-points-groups

## 13. Recognition search contract and evidence

V2 needs an image-recognition-specific search contract because the current generic catalog-search path can discard image-point evidence.

Conceptual shape:

```ts
interface ImageRecognitionHit {
  readonly pointId: string;
  readonly productId: string;
  readonly score: number;

  readonly imageUrl: string;
  readonly imageRole: string | null;
  readonly imageType: ProductImageType | null;
  readonly imageAngle: ProductImageAngle | null;
  readonly imageDetailType: string | null;
  readonly imageContentSha256: string | null;
}

interface ImageRecognitionSearchPort {
  searchCutoutGroups(
    embedding: readonly number[],
    uniqueProductLimit: number,
  ): Promise<readonly ImageRecognitionHit[]>;
}
```

For realtime V2:

```text
uniqueProductLimit = 5
```

The exact type names may follow repository conventions. The required semantics are:

- at most one winning image point per normalized `product_id`;
- ordered by winning retrieval score;
- winning point evidence is preserved.

If SKU A wins because `A-detail-03.jpg` has the highest score for A, the reranker must inspect `A-detail-03.jpg`.

Do not replace it with a generic PRIMARY image.

## 14. Gemini reranker

Reranker input:

```text
customer prepared non-cutout image
+
winning catalog non-cutout image for each candidate
```

Using non-cutout images here is visual evidence only; it does not reintroduce a RAW vector path.

The reranker supports **1 through 5 unique candidates**.

Every non-empty shortlist goes through the reranker.

Reranker behavior:

1. inspect the customer image;
2. inspect all candidate images;
3. identify candidate differences;
4. find those discriminating features in the customer image;
5. use positive and contradictory evidence;
6. choose a SKU only when visible evidence is sufficient.

Ignore as SKU evidence:

- face/identity;
- model identity;
- pose;
- background;
- irrelevant camera differences.

Structured output is restricted to:

```text
one supplied product_id
or
none
or
ambiguous
```

Model output is untrusted and must be validated against the supplied candidate allowlist.

## 15. Final recognition states

Public statuses remain:

```text
MATCHED
AMBIGUOUS
NOT_FOUND
ERROR
```

### MATCHED

Gemini selected one valid supplied candidate.

### AMBIGUOUS

Visible evidence is insufficient to choose confidently.

### NOT_FOUND

No usable candidate exists, or Gemini returns `none`.

### ERROR

Pipeline/infrastructure failure such as:

- download;
- preprocessing;
- RemBG;
- embedding;
- Qdrant;
- candidate-image preparation;
- reranker.

Do not force Qdrant Top1 on errors and do not call the old recognition engine.

## 16. Final score semantics

The final `score` is the Qdrant retrieval score of the selected SKU's winning image point.

Example:

```text
A = .95
B = .91
C = .88
Gemini selects B
```

Final result:

```text
product = B
score = .91
gap = null
decisionSource = GEMINI_RERANK
```

Never assign A's score to B.

Gemini confidence must not be stored in the cosine-similarity field.

V2 does not use retrieval-gap thresholds to bypass the reranker.

## 17. No recognition-result cache in initial V2

The initial V2 runtime must not read or write recognition-result cache entries.

Reason:

- result caching is an optimization, not part of exact-SKU correctness;
- catalog changes/deactivation make cache invalidation stateful;
- the existing cache implementation is not required to deliver the V2 recognition contract.

Therefore V2 initial runtime is simply:

```text
image
→ preprocess
→ cutout
→ embed
→ Qdrant
→ rerank
→ result
```

Do not add:

- `catalogGeneration`;
- cache-generation management;
- point revalidation on cache hit;
- cache invalidation infrastructure.

The existing cache code may remain in the repository if removing it would create unrelated refactor churn, but the active V2 path must not use it.

Caching may be introduced later as a separate optimization only if there is a concrete latency/cost reason.

## 18. Minimal telemetry

Keep observability sufficient to diagnose the critical path without recreating the old dual-channel telemetry model.

V2 telemetry should include:

```text
pipelineVersion
normalizedImageHash

embeddingModel
embeddingDimension

candidateProductIds
candidateRetrievalRanks
candidateRetrievalScores
selectedEvidencePointId

rerankerModel
rerankerPromptVersion
rerankerDecision
rerankerSelectedOriginalRank

finalDecision
finalProductId
finalRetrievalScore
errorCode

prepareLatencyMs
cutoutLatencyMs
embeddingLatencyMs
qdrantLatencyMs
rerankerLatencyMs
totalLatencyMs
```

Do not log:

- full embedding vectors;
- auth headers;
- service-account private keys;
- OAuth tokens;
- Qdrant API keys.

Do not retain RAW/CUTOUT comparison telemetry in the active V2 decision path.

## 19. Catalog update and deactivation

Reprocessing uses the contract in Section 9.

When the source or pipeline version changes:

```text
→ regenerate preprocess/cutout
→ regenerate 3072D embedding
→ upsert deterministic point
```

When all relevant state matches:

```text
→ NOOP
```

When a catalog image/product becomes inactive:

```text
ACTIVE = FALSE
→ remove its V2 point from active recognition
```

When an image becomes `SIZE_GUIDE`:

```text
→ remove its V2 point from active recognition
```

There is no cache to invalidate in the initial V2 runtime.

## 20. Replacement migration

This is a replacement migration, not an experiment.

### Step 1 — Create the V2 recognition collection

```text
image_cutout
3072D
Cosine
```

### Step 2 — Verify Qdrant grouped-query support

The target Qdrant deployment must support the `/points/query/groups` contract before V2 activation.

Do not add a compatibility retrieval path.

### Step 3 — Populate the V2 catalog index

Source:

```text
APPROVED + ACTIVE image_registry
```

Flow:

```text
shared preprocess
→ RemBG
→ Gemini Embedding 2 / 3072
→ V2 collection
```

Do not serve customer recognition from a partially populated collection.

### Step 4 — Deploy V2 recognition runtime

Runtime configuration becomes:

```text
V2 recognition collection
CUTOUT-only
EXACT grouped retrieval
Top 5 unique SKU
always Gemini rerank
no recognition-result cache
```

### Step 5 — Cut over

All image-recognition traffic moves to V2.

Do not add:

- percentage rollout;
- shadow recognition;
- A/B comparison;
- dual recognition;
- automatic legacy fallback.

### Step 6 — Old image-recognition path

After cutover, the old image-recognition path is no longer called by business logic.

The existing multimodal collection may remain if non-recognition features still use `product_text` or other data in it.

Operational release rollback remains available under the repository's normal deployment process; this is not a runtime fallback branch.

## 21. Expected implementation scope

Primary areas likely touched:

```text
apps/worker/src/
  realtime-media-recognition.ts
  vertex-media-reranker.ts
  Gemini Embedding 2 integration
  V2 catalog publisher / P2.3C-derived logic
  runtime wiring/config

packages/business-tools/src/
  V2 recognition Qdrant adapter/types

deploy/
  recognition collection provisioning
  relevant environment/config wiring
```

Reuse where appropriate:

```text
P2.3B
image_registry
catalog job building
Human Gate
RemBG infrastructure
Google auth utilities
Redis lock/progress infrastructure
catalog metadata types
```

## 22. Explicitly out of scope

Do not redesign:

```text
admin media upload
manual_image_intake
P2.3B metadata classification
Human Gate
product_registry
Google Sheets ownership
text search
inventory
commerce
customer messaging
```

Do not add in this phase:

```text
RAW + CUTOUT fusion
RAW fallback
multivector
detail vectors/crops
upper/middle/lower crops
RRF
quantization
HNSW tuning
custom embedding training
FashionSigLIP
DINO
Qwen
hard-negative model
confusion-set model
1 SKU = 1 vector
persistent cutout storage
new queue infrastructure
recognition-result cache
catalog-generation cache invalidation
Qdrant compatibility retrieval fallback
```

Keep the implementation focused on the smallest architecture that satisfies this spec.

## 23. Completion conditions

The active runtime contract is complete when all of the following are true:

- recognition no longer calls RAW search;
- recognition no longer merges RAW and CUTOUT;
- customer recognition creates one CUTOUT retrieval embedding;
- V2 catalog collection stores only `image_cutout` as the recognition vector;
- embedding model is `gemini-embedding-2` at 3072D;
- Vertex embedding uses `:embedContent`, not the legacy `:predict` schema;
- `location = us` uses the `aiplatform.us.rep.googleapis.com` endpoint family;
- the embedding response is read from `embedding.values` and validated as finite 3072D;
- catalog and customer use the same preprocessing implementation;
- Qdrant recognition uses grouped query points with `group_by=product_id`, `group_size=1`, `limit=5`, and `exact=true`;
- the runtime has no second raw-point paging/over-fetch retrieval implementation;
- the exact winning Qdrant point is preserved as evidence;
- the reranker receives the winning catalog image, not an unrelated representative image;
- the reranker supports 1–5 candidates and every non-empty shortlist goes through it;
- the selected SKU may be candidate rank 1 through 5;
- arbitrary model-produced SKUs outside the supplied set are rejected;
- public statuses remain `MATCHED | AMBIGUOUS | NOT_FOUND | ERROR`;
- final retrieval score belongs to the selected SKU and Gemini-selected results use `gap = null`;
- current HOLD semantics are preserved;
- `ACTIVE = FALSE` and `SIZE_GUIDE` remove points from active recognition;
- V2 publication state does not depend on legacy `PUBLISHED_HASH` ownership;
- V2 publisher uses a separate collection/lock/progress namespace;
- the active V2 path does not use recognition-result caching;
- no automatic legacy fallback, A/B, shadow, or dual-recognition path exists;
- existing URL/SSRF/MIME/size/security controls remain enforced;
- telemetry does not expose secrets or raw vectors.

## 24. Final architecture decision

The new default image-recognition architecture is:

```text
CUTOUT-only
+
Gemini Embedding 2 / 3072D
+
Dedicated Qdrant image-recognition collection
+
Exact grouped retrieval by product_id
+
Top 5 unique SKUs
+
Winning image-point evidence
+
Always Gemini reranking
+
No recognition-result cache in initial V2
```

This spec replaces the previous cutout-first/RAW-fallback recognition plan for future implementation work. The previous plan remains historical context only; its RAW fallback, Top 3, threshold-gate, and dual-channel decisions are not V2 requirements.
