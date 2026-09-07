# Product Image Recognition V2 — Cutout-only + Gemini Embedding 2 / 3072D

> **Status:** `SPEC_READY_FOR_PLANNING`
> **Date:** `2026-09-07`
> **Target mode:** `ENGINEERING_PREPROD`
> **Process profile:** `SOLO_PREPROD_MINIMAL`
> **Scope:** product-image recognition only
> **Supersedes for future implementation:** `docs/current/MEDIA_RECOGNITION_CUTOUT_AI_IMPLEMENTATION_PLAN.md`
> **Important:** this document does not authorize deployment, page-allowlist changes, migration, or live-runtime mutation.

## 1. Objective

Replace the current image-recognition path with a simpler exact-SKU pipeline focused on distinguishing fashion products that can look nearly identical at a coarse level.

The target problem is not "find something visually similar". The target is:

> Identify the exact catalog SKU when the customer image contains enough visible evidence; otherwise return `AMBIGUOUS` or `NOT_FOUND` instead of forcing a match.

The difficult cases include products with the same color, silhouette, garment category, or overall cut where the real discriminating signal is local and small, for example:

- pattern;
- embroidery;
- buttons;
- neckline detail;
- sleeve detail;
- trim;
- seam;
- material/texture;
- small local motifs.

## 2. Locked architecture decisions

V2 uses the following decisions as requirements:

1. Image vector retrieval is **CUTOUT-only**.
2. Embedding model is **`gemini-embedding-2`**.
3. Embedding dimension is **3072**.
4. Catalog and customer queries use the same V2 preprocessing contract.
5. Qdrant image retrieval uses **exact search**.
6. Retrieval shortlist is **Top 5 unique SKUs**, not Top 5 image points.
7. The exact Qdrant image point that wins for each SKU is preserved as evidence.
8. Gemini reranking is **contrastive** and may choose any SKU in the supplied Top 5.
9. Every non-empty candidate set goes through the reranker; V2 has no score-threshold direct-match shortcut.
10. V2 has no RAW vector retrieval, RAW/CUTOUT merge, or RAW fallback.
11. V2 does not persist cutout files.
12. V2 does not add `storage_path_cutout` or `image_dirty`.
13. Existing P2.3B metadata staging and the Human Gate remain unchanged.
14. RemBG remains the background-removal implementation for this scope.
15. Text-search behavior is outside this scope.
16. There is no runtime fallback to the old image-recognition engine.
17. There is no A/B routing, shadow recognition, percentage rollout, or dual recognition path in business logic.
18. Once activated, image recognition uses V2 as the only recognition path.

## 3. Existing repository boundary to reuse

The repository already has an executable catalog intake/publish flow. V2 must reuse the parts that already work instead of creating a parallel ingestion system.

Current catalog source flow:

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

Current P2.3C already demonstrates the executable concepts V2 needs to reuse:

- approved/active job selection;
- image download/preparation;
- RemBG invocation;
- deterministic image point identity;
- hash/idempotency concepts;
- Qdrant point lifecycle;
- retry/error handling;
- `ACTIVE = FALSE` deletion semantics;
- Redis lock/progress pattern;
- run summary/observability concepts.

V2 does **not** reuse `P23cPublisher.publishPoint()` unchanged because the current method always generates and writes all three legacy vectors:

```text
image_raw
image_cutout
product_text
```

V2 needs a dedicated image-recognition publishing path that reuses the surrounding catalog infrastructure but writes only the V2 cutout vector.

## 4. Target architecture

### 4.1 Catalog

```text
manual_image_intake
       ↓
     P2.3B
       ↓
image_registry
       ↓
HUMAN APPROVAL
       ↓
APPROVED + ACTIVE
       ↓
V2 Catalog Publisher
       ↓
shared V2 preprocessing
       ↓
RemBG
       ↓
CUTOUT Buffer
       ↓
Gemini Embedding 2
3072D
       ↓
Dedicated Qdrant
Image Recognition Collection
```

### 4.2 Customer

```text
customer image
       ↓
safe download
       ↓
shared V2 preprocessing
       ↓
RemBG
       ↓
CUTOUT
       ↓
Gemini Embedding 2
3072D
       ↓
Qdrant EXACT
       ↓
image-level hits
       ↓
group by product_id
       ↓
Top 5 unique SKU
       ↓
winning point/image evidence
       ↓
Gemini contrastive reranker
       ↓
MATCHED | AMBIGUOUS | NOT_FOUND | ERROR
```

## 5. Catalog image eligibility

V2 indexes catalog images only when they are eligible under the existing Human Gate:

```text
REVIEW_STATUS = APPROVED
ACTIVE = TRUE
```

V2 must not index rows that are:

- `PENDING`;
- `REJECTED`;
- `STALE`;
- inactive;
- `SIZE_GUIDE`;
- missing a valid usable image URL.

The current model remains:

> **One catalog image = one Qdrant point.**

A SKU may therefore have multiple independent points:

```text
SKU A
├─ front
├─ back
├─ side
├─ model
└─ detail
```

This is intentional. A detail or close-up image may contain the only feature that distinguishes two otherwise similar SKUs.

## 6. Shared V2 preprocessing contract

The current repository preprocesses catalog and customer images differently. V2 must not preserve that asymmetry for the embedding path.

V2 uses one shared contract for both catalog and customer inputs:

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

### 6.1 Canonical image bound

V2 uses:

```text
maxDimension = 1024px
```

Rules:

- preserve aspect ratio;
- do not upscale smaller images;
- bound both width and height;
- output canonical PNG before RemBG;
- do not crop;
- do not center-crop away garment boundaries or local details.

The same implementation or shared module must serve the catalog V2 publisher and the realtime customer V2 path. V2 must not maintain two independent preprocessing implementations with different geometry/format behavior.

## 7. Background removal

V2 keeps the existing RemBG service/model boundary for this feature:

```text
model = u2netp
```

Catalog:

```text
canonical PNG
→ RemBG
→ cutout Buffer
→ embedding
→ discard Buffer
```

Customer:

```text
canonical PNG
→ RemBG
→ cutout Buffer
→ embedding
```

Cutout remains ephemeral in memory.

V2 does not create:

- persistent cutout files;
- cutout URLs;
- `storage_path_cutout`;
- a new cutout bucket.

## 8. Cutout failure behavior

V2 is cutout-only, so failure is fail-closed for image recognition.

### Catalog

If cutout generation fails:

```text
FAILED publish
→ no new/partial vector upsert
→ retry through the V2 processing cycle
```

An existing good V2 point must not be replaced with fake, missing, or partial vector state.

### Customer

If cutout generation fails:

```text
ERROR
```

There is no RAW fallback and no legacy recognition fallback.

## 9. Gemini Embedding 2 contract

V2 uses:

```text
provider: Vertex AI
model: gemini-embedding-2
output dimensionality: 3072
location: us
```

Authentication should reuse the existing Google Cloud project/service-account path rather than introduce a separate Gemini API key for this feature.

Catalog and customer embeddings must use the same:

- model;
- output dimension;
- preprocessing version;
- cutout pipeline version.

V2 must never mix vectors from `multimodalembedding@001` with `gemini-embedding-2` in the same recognition space.

The image embedding request contains the CUTOUT image. Product contextual text is not included in the V2 image-recognition embedding.

Official model facts checked for this spec on 2026-09-07:

- `gemini-embedding-2` is GA;
- it supports image inputs;
- default/max output is 3072 dimensions;
- supported locations include `global`, `us`, and `eu`.

References:

- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/embedding-2
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-multimodal-embeddings

## 10. Dedicated Qdrant recognition collection

V2 uses a dedicated Qdrant collection for image recognition instead of mutating the existing multimodal collection in place.

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

Minimum payload needed for recognition/evidence/reprocessing:

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
embedding_hash
embedding_model
embedding_dimension
image_preprocess_version
cutout_pipeline_version
catalog_version
published_at
```

The exact physical field names should follow existing repository conventions where equivalent fields already exist.

## 11. Text search remains separate

The existing multimodal/text collection may remain in use for features that need `product_text` or other non-recognition search behavior.

This feature does not:

- migrate text vectors;
- change text embedding models;
- change text retrieval;
- require text search to use Gemini Embedding 2.

After V2 cutover, the old image vectors are no longer the source for realtime product-image recognition.

## 12. V2 catalog publisher

The V2 publisher must reuse catalog-source and lifecycle behavior where appropriate but must not call legacy raw/text embedding operations.

Target publish flow:

```text
approved catalog image
↓
shared V2 preprocessing
↓
RemBG
↓
Gemini Embedding 2 / 3072
↓
image_cutout point
↓
V2 recognition collection upsert
```

The V2 publisher must not call:

```text
embedImageAndText()
RAW image embedding
product_text embedding
```

for recognition publication.

## 13. V2 publication state and idempotency

The V2 recognition index must not use the existing `PUBLISHED_HASH/PUBLISHED_AT` columns as the authoritative state for the new collection.

Those columns already belong to the existing catalog publishing workflow. Reusing them for a second physical collection would make the state ambiguous.

V2 determines publication state from the V2 collection itself using stored point metadata such as:

```text
source_hash
embedding_hash
embedding_model
embedding_dimension
image_preprocess_version
cutout_pipeline_version
```

Required decisions:

```text
point missing
→ FULL_EMBED

source/config changed
→ FULL_EMBED

state matches
→ NOOP

ACTIVE = FALSE
→ DELETE
```

No new database dirty flag is required.

## 14. V2 lock/progress namespace

The current P2.3C lock/progress constants include the existing collection identity. V2 must not share those Redis keys.

V2 lock/progress keys must include the V2 recognition collection/pipeline namespace, conceptually:

```text
lock:ingest:<recognitionCollection>:...
ingest:progress:<recognitionCollection>:...
```

This prevents unrelated publishers from sharing lock/progress state.

## 15. Point identity

V2 preserves deterministic image-level point identity.

Requirement:

```text
same catalog image
→ same point ID

different catalog image
→ different point ID
```

`product_id` alone must not be used as point ID because one product can have multiple catalog images.

## 16. Customer image security

V2 must preserve the existing realtime security boundary for customer-controlled URLs and bytes:

- HTTPS-only external URL policy;
- allowlisted hosts;
- bounded redirects;
- private-IP/loopback blocking;
- MIME validation;
- byte-size bound;
- timeout/cancellation;
- bounded image decoding/preprocessing.

External image content remains untrusted input.

## 17. Customer V2 embedding flow

Each recognition request creates one retrieval embedding:

```text
customer image URL
↓
safe download
↓
shared preprocess / 1024 PNG
↓
RemBG
↓
CUTOUT
↓
Gemini Embedding 2 / 3072
↓
Qdrant exact retrieval
```

There is no parallel RAW embedding request.

## 18. Qdrant exact retrieval

V2 recognition queries only the V2 `image_cutout` vector and must request exact retrieval:

```text
using = image_cutout
params.exact = true
filter active = true
```

The adapter must preserve the raw image-point identity and payload long enough to build recognition evidence.

Qdrant exact-search reference:

- https://qdrant.tech/documentation/concepts/search/#search-api

## 19. Dedicated recognition search contract

The current generic catalog-search abstraction deduplicates points into product documents and can discard point-level evidence. V2 needs an image-recognition-specific contract.

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
  searchCutout(
    embedding: readonly number[],
    limit: number,
  ): Promise<readonly ImageRecognitionHit[]>;
}
```

Exact type names may follow repository conventions. The point-level semantics are required.

## 20. Image-level hits → Top 5 unique SKUs

Qdrant returns image points, not unique products.

Example raw hits:

```text
A-front   .950
A-detail  .944
B-front   .932
C-back    .918
D-detail  .904
```

V2 groups by normalized `product_id`, keeps only the highest-scoring point per product, sorts those product candidates by retrieval score, then keeps at most five unique products.

Result:

```text
A = .950 / A-front
B = .932 / B-front
C = .918 / C-back
D = .904 / D-detail
```

A SKU appearing in multiple top image points still occupies only one candidate slot.

## 21. Winning point evidence

Each product candidate must retain the exact image point that produced its best retrieval score.

Conceptual candidate:

```ts
interface ProductRecognitionCandidate {
  readonly productId: string;
  readonly product: StableProductDocument;
  readonly retrievalRank: number;
  readonly retrievalScore: number;

  readonly evidence: {
    readonly pointId: string;
    readonly imageUrl: string;
    readonly imageRole: string | null;
    readonly imageType: ProductImageType | null;
    readonly imageAngle: ProductImageAngle | null;
    readonly imageDetailType: string | null;
    readonly imageContentSha256: string | null;
  };
}
```

V2 must not reconstruct or replace this evidence later using a generic PRIMARY-first image selector.

If retrieval was won by:

```text
A-detail-03.jpg
```

then the reranker must inspect:

```text
A-detail-03.jpg
```

not an unrelated `A-primary.jpg`.

## 22. Images supplied to the reranker

Vector retrieval is CUTOUT-only.

The reranker, however, should use the prepared non-cutout visual images because they preserve texture and fine visual evidence that background removal may damage.

Reranker input:

```text
customer prepared non-cutout image
+
matched catalog non-cutout image for each candidate
```

This is visual evidence only. It does not reintroduce a RAW vector path.

## 23. Top 5 candidate rule

The reranker receives a maximum of five **unique product candidates**.

It must support candidate counts from 1 through 5.

The current implementation requirement that at least two candidates exist must not remain in V2.

## 24. Always rerank

V2 removes threshold-based direct acceptance from the recognition decision path.

V2 does not use legacy concepts such as:

```text
CUTOUT_STRONG
CUTOUT_MINIMUM
RAW_STRONG
RAW_FALLBACK_STRONG
RAW_CUTOUT_DISAGREE
score threshold direct acceptance
gap threshold direct acceptance
```

Decision flow:

```text
no usable candidates
→ NOT_FOUND

1–5 usable unique candidates
→ Gemini reranker
```

The reranker is therefore the final exact-SKU decision layer for every non-empty shortlist.

## 25. Contrastive Gemini reranking

The reranker must reason contrastively across the supplied candidates rather than independently rating each image as merely "similar".

Required behavior:

1. inspect the customer image;
2. inspect all supplied candidate images;
3. identify what candidates have in common;
4. identify features that distinguish one candidate from another;
5. look for those discriminating features in the customer image;
6. use positive visible evidence;
7. use negative/contradictory evidence to eliminate candidates;
8. choose a SKU only when visible evidence is sufficient.

High-value discriminators include:

- pattern;
- embroidery;
- buttons;
- neckline;
- sleeve detail;
- trim;
- seam;
- material;
- texture;
- local motifs;
- cut/tailoring;
- color details.

The reranker must ignore as SKU evidence:

- face/identity;
- model identity;
- pose;
- background;
- camera position unless it directly controls feature visibility.

## 26. Reranker output contract

Structured output is restricted to:

```text
one supplied product_id
or
none
or
ambiguous
```

The model must not:

- invent a product ID;
- select a SKU outside the supplied candidate set;
- return an unconstrained free-form SKU.

Model output remains untrusted data and must be validated outside the prompt/schema before it affects application state.

## 27. Public recognition states

V2 preserves the existing public recognition status vocabulary:

```text
MATCHED
AMBIGUOUS
NOT_FOUND
ERROR
```

Do not introduce a new `MATCH` status.

### `MATCHED`

The reranker selected one valid supplied candidate.

### `AMBIGUOUS`

The reranker determined that visible evidence is insufficient to choose confidently among the supplied candidates.

### `NOT_FOUND`

Returned when no usable candidate exists, or when the reranker returns `none`.

### `ERROR`

Returned for pipeline/infrastructure failures such as download, preprocessing, RemBG, embedding, Qdrant, candidate-image preparation, or reranker failure.

## 28. Final score semantics

The final `score` is always the Qdrant retrieval score of the selected SKU's winning image point.

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

Never assign A's `.95` score to B.

Gemini confidence must not be stored in the cosine similarity field.

## 29. Retrieval gap semantics

Retrieval gap may be retained in telemetry for diagnosis, but V2 does not use it to bypass the reranker.

If calculated, it is calculated **after grouping image hits into unique SKUs**:

```text
Top SKU A = .95
Top SKU B = .91
retrievalGap = .04
```

Do not calculate a product gap from two points that belong to the same SKU.

A Gemini-selected public `MATCHED` result uses:

```text
gap = null
```

## 30. Cache isolation

The current cache key based only on normalized image hash is not sufficient across a recognition-engine replacement.

V2 cache identity must include the recognition pipeline version, conceptually:

```text
media-recognition:<pipelineVersion>:<normalizedImageHash>
```

Example:

```text
media-recognition:cutout-ge2-3072-v1:<sha256>
```

V2 must not read recognition results cached by the old pipeline.

The pipeline version should be bumped when candidate-affecting V2 behavior changes materially.

## 31. Telemetry

V2 removes telemetry whose only purpose was RAW/CUTOUT dual-channel comparison.

V2 does not need runtime decision telemetry for:

```text
raw scores
raw gap
channelsAgree
rawSearch latency
RAW fallback reason
```

V2 telemetry should include at least:

```text
pipelineVersion
normalizedImageHash

embeddingModel
embeddingDimension
imagePreprocessVersion
cutoutPipelineVersion

retrievalChannel = image_cutout
searchMode = EXACT

imageHitCount
uniqueCandidateCount
candidate product IDs
candidate retrieval ranks
candidate retrieval scores
retrievalGap

selectedEvidencePointId
selectedEvidenceImageType
selectedEvidenceImageAngle

rerankerInvoked
rerankerModel
rerankerPromptVersion
rerankerSelectedOriginalRank
rerankerDecision

decisionSource
finalDecision
finalProductId
finalRetrievalScore

prepareLatencyMs
cutoutLatencyMs
embeddingLatencyMs
qdrantLatencyMs
rerankerLatencyMs
totalLatencyMs

cacheHit
```

Do not log full embedding vectors, auth headers, service-account private keys, OAuth tokens, or Qdrant API keys.

## 32. Error handling

### Customer image download failure

```text
→ ERROR
```

### Preprocessing failure

```text
→ ERROR
```

### RemBG failure

```text
→ ERROR
```

### Embedding failure

```text
→ ERROR
```

### Invalid embedding response

If the output is not exactly a finite 3072D vector:

```text
→ ERROR
```

Do not send an invalid vector to Qdrant.

### Qdrant failure

```text
→ ERROR
```

### Candidate image preparation failure

If one candidate image cannot be prepared for the reranker, drop only that candidate from reranker input.

If no usable candidate remains:

```text
→ ERROR
```

Do not replace the failed evidence image with an arbitrary PRIMARY image.

### Reranker failure

```text
→ ERROR
```

Do not force Qdrant Top 1 and do not call the old recognition engine.

## 33. Catalog update/reprocessing

V2 reprocessing is driven by point identity plus V2 point metadata/hashes.

When the catalog source image changes:

```text
source hash changed
→ regenerate preprocessing/cutout
→ regenerate 3072D embedding
→ upsert deterministic point
```

When any candidate-affecting embedding config changes:

```text
embedding_model
embedding_dimension
image_preprocess_version
cutout_pipeline_version
```

V2 must treat the point as needing a full re-embed.

When all relevant state matches:

```text
→ NOOP
```

## 34. Deactivation

When a catalog image/product becomes inactive:

```text
ACTIVE = FALSE
```

V2 must delete or otherwise remove the corresponding V2 point from active recognition according to the existing deletion semantics.

Inactive points must never be returned by realtime recognition.

## 35. Replacement migration

This is a replacement migration, not an experiment or a long-lived dual-path rollout.

### Step 1 — Create the dedicated V2 collection

```text
image_cutout
3072D
Cosine
```

### Step 2 — Populate the V2 catalog index

Source:

```text
APPROVED + ACTIVE image_registry
```

Flow:

```text
shared V2 preprocessing
→ RemBG
→ Gemini Embedding 2 / 3072
→ V2 collection
```

### Step 3 — Complete catalog population before serving recognition

Do not route customer recognition to a partially populated collection.

### Step 4 — Deploy V2 recognition runtime

Runtime configuration becomes:

```text
V2 recognition collection
CUTOUT-only
EXACT
Top 5 unique SKU
always Gemini rerank
```

### Step 5 — Bump the cache namespace

V2 must not reuse old recognition cache entries.

### Step 6 — Cut over

All image-recognition traffic moves to V2.

Do not add:

- percentage rollout;
- shadow recognition;
- A/B comparison;
- dual recognition;
- automatic fallback.

### Step 7 — Old image recognition path

After cutover, the old image-recognition path is no longer called by business logic.

The existing multimodal collection may remain if non-recognition features still use `product_text` or other data in it.

## 36. Rollback boundary

V2 contains no runtime fallback logic.

There is no:

```text
try V2
if fail → run legacy
```

If a deployment is defective, rollback is a normal release/deployment rollback to the exact previous affected-service identity under the repository's current `SOLO_PREPROD_MINIMAL` process. This is an operational rollback boundary, not a second recognition engine in runtime business logic.

Deployment remains separately owner-authorized under `docs/current/architecture-program/OPERATING_MODE.md`.

## 37. Expected implementation scope

Primary code likely touched:

```text
apps/worker/src/
  realtime-media-recognition.ts
  vertex-media-reranker.ts
  embedding integration
  V2 catalog publisher / P2.3C-derived logic
  runtime wiring/config

packages/business-tools/src/
  dedicated recognition Qdrant adapter/types

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
Redis
catalog metadata types
```

## 38. Explicitly out of scope

Do not redesign or expand scope into:

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
multivector
detail vector
detail crop
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
```

Keep the implementation focused on the smallest architecture that satisfies this spec.

## 39. V2 logic explicitly removed from the recognition path

V2 recognition must not retain decision behavior for:

```text
image_raw query
raw embedding
rawScore
rawGap
channelsAgree
RAW_CUTOUT_DISAGREE
RAW_FALLBACK_STRONG
cutoutStrongScore
cutoutMinimumScore
cutoutMinimumGap
rawFallbackScore
rawFallbackGap
mergeCandidates(raw, cutout)
PRIMARY-first representative image selection
```

Legacy types may temporarily remain outside the active V2 path only when removing them in the same change would create unrelated refactor churn. They must not influence V2 behavior.

## 40. Required runtime contract

Final catalog path:

```text
APPROVED + ACTIVE image
        ↓
shared preprocess 1024 PNG
        ↓
RemBG
        ↓
CUTOUT
        ↓
Gemini Embedding 2
3072D
        ↓
Dedicated Qdrant
image_cutout
```

Final customer path:

```text
customer image
        ↓
secure download
        ↓
same preprocess 1024 PNG
        ↓
RemBG
        ↓
CUTOUT
        ↓
Gemini Embedding 2
3072D
        ↓
Qdrant EXACT
        ↓
image hits
        ↓
group by SKU
        ↓
Top 5 unique
        ↓
winning image evidence
        ↓
Gemini contrastive rerank
        ↓
MATCHED | AMBIGUOUS | NOT_FOUND | ERROR
```

## 41. Completion conditions

The implementation is complete only when the active runtime contract satisfies all of the following:

- recognition no longer calls RAW search;
- recognition no longer merges RAW and CUTOUT;
- customer recognition creates one CUTOUT retrieval embedding;
- V2 catalog collection stores only the V2 `image_cutout` recognition vector;
- embedding model is `gemini-embedding-2`;
- embedding dimension is 3072;
- catalog and customer use the same V2 preprocessing contract;
- Qdrant recognition search explicitly uses `exact=true`;
- Top 5 is calculated after deduplicating/grouping by SKU;
- the exact winning Qdrant point is preserved as evidence;
- the reranker receives that winning catalog image, not an unrelated representative image;
- the reranker supports 1–5 candidates;
- every non-empty candidate path goes through the reranker;
- the selected SKU may be candidate rank 1 through 5;
- arbitrary model-produced SKUs outside the supplied set are rejected;
- public statuses remain `MATCHED | AMBIGUOUS | NOT_FOUND | ERROR`;
- final retrieval score belongs to the selected SKU;
- Gemini-selected results use `gap = null`;
- cache identity includes the V2 pipeline version;
- V2 publisher uses a separate collection/lock/progress namespace;
- V2 publication state does not depend on legacy collection `PUBLISHED_HASH` ownership;
- no automatic legacy fallback exists;
- no A/B, shadow, or dual recognition path exists;
- existing URL/SSRF/MIME/size/security controls remain enforced;
- telemetry does not expose secrets or raw vectors.

## 42. Final architecture decision

The new default image-recognition architecture is:

```text
CUTOUT-only
+
Gemini Embedding 2 / 3072D
+
Dedicated Qdrant image-recognition collection
+
Exact retrieval
+
Top 5 unique SKU
+
Winning image-point evidence
+
Always contrastive Gemini reranking
```

This spec replaces the previous cutout-first/RAW-fallback recognition plan for future implementation work. The previous plan remains useful only as historical context for how the current implementation evolved; its RAW fallback, Top 3, threshold-gate, and dual-channel decisions are not requirements for V2.
