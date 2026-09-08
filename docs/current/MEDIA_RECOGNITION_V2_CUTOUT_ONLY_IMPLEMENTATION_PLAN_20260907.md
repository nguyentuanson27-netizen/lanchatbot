# Implementation Plan — Product Image Recognition V2

**Spec:** `docs/current/MEDIA_RECOGNITION_V2_CUTOUT_ONLY_SPEC_20260907.md`  
**Target:** PREPROD → Production (current execution mode: `ENGINEERING_PREPROD` / `SOLO_PREPROD_MINIMAL`)  
**Scope:** Replace the image-recognition runtime with the V2 cutout-only path. Text search and the existing multimodal collection remain out of scope.

## 1. Delivery rules

The implementation must preserve the locked decisions in the spec:

- CUTOUT-only retrieval.
- `gemini-embedding-2`, 3072 dimensions, Vertex AI, existing Google Cloud service-account auth, location `us`.
- One shared catalog/customer image-preprocessing implementation: orientation normalization → resize to max dimension 1024 without upscaling/cropping → canonical PNG → RemBG `u2netp` → ephemeral cutout PNG.
- Dedicated Qdrant recognition collection with named vector `image_cutout`, size 3072, cosine distance.
- Qdrant exact server-side grouping by `product_id`: `group_size=1`, `limit=5`, `using=image_cutout`, `params.exact=true`, `active=true`.
- Preserve the winning Qdrant image point and its evidence for every grouped SKU candidate.
- Every request with 1–5 usable candidates goes through the Gemini contrastive reranker; any supplied rank 1–5 may win.
- Public states remain `MATCHED | AMBIGUOUS | NOT_FOUND | ERROR`.
- Initial V2 has no recognition-result Redis cache.
- No RAW image retrieval, RAW/CUTOUT fusion, score-threshold direct match, PRIMARY-first evidence substitution, A/B, shadow, dual recognition, or runtime legacy fallback.
- The catalog must be fully populated in the V2 collection before customer traffic is switched.

This plan authorizes no runtime operation by itself. Source implementation, merge, collection build and deployment remain distinct actions under `AGENTS.md` and `OPERATING_MODE.md`; the current PR is documentation only. Public-production activation requires the owner's explicit scope decision.

Implementation should be incremental. Each phase below must leave the repository in a reviewable state and include focused verification before the dependent phase starts.

## 2. Dependency map

| Work | Prerequisite |
|---|---|
| Phases 1–2: image/embedding and Qdrant contracts | Phase 0 source/API contract review |
| Phase 3: publisher | Phases 1–2 |
| Phase 4: reranker | Phase 0 contracts; shared preparation from Phase 1 |
| Phase 5: realtime | Phases 1–2 and 4 |
| Task 6.1: integrated runtime wiring | Phases 3 and 5 |
| Tasks 7.1–7.4: source checks and review | Task 6.1; complete before activation |
| Task 6.2: provision/build/readiness | Verified implementation and authorization for the collection operation |
| Task 6.3: direct cutover | Tasks 7.1–7.4 pass, Task 6.2 reconciled, scoped deployment authorization |
| Task 7.5: final completion evidence | Post-activation smoke/readback after Task 6.3 |

Task numbers identify work; they do not place cutover ahead of verification. Deployment-only API probes may be completed with Task 6.2, but must pass before Task 6.3.

Review checkpoints:

- **Checkpoint A:** after Phases 0–2, review external API contracts, dimensions, preprocessing symmetry, and Qdrant evidence preservation.
- **Checkpoint B:** after Phases 3–5, review publisher idempotency, reranker correctness, realtime security, and removal of all old recognition branches.
- **Checkpoint C:** before Task 6.3, review source checks and collection readiness; after activation, record smoke/readback and Definition of Done.

---

## Phase 0 — Source/API preflight and configuration contract

### Task 0.1 — Verify Qdrant grouped exact-search support

**Goal:** confirm the official REST request/response contract and verify deployed Qdrant support before activation. The current repository uses native `fetch` in `packages/business-tools/src/qdrant.ts` and `apps/worker/src/p23c-publisher.ts`; `@qdrant/js-client-rest` is not an installed dependency and is not required for V2.

Use `POST /collections/<recognitionCollection>/points/query/groups` with:

- named vector `image_cutout`;
- `group_by=product_id`;
- `group_size=1`;
- `limit=5` groups;
- `params.exact=true`;
- payload filter `active=true`;
- payload + point ID + score returned for the winning point in each group.

**Files to inspect:**

- `packages/business-tools/package.json`
- existing Qdrant client setup under `packages/business-tools/src/`
- deployment/Qdrant configuration files actually used by PREPROD

**Decision:** use server-side grouping. If deployed Qdrant cannot execute this request, block activation and resolve the deployment/API incompatibility; do not add client-side oversampling/deduplication or a legacy fallback. Source implementation and contract tests can proceed without live access.

**Verification:** capture the REST request and `result.groups[].hits[0]` mapping in Phase 2 tests; record deployed API support during readiness. Reference: [Qdrant grouped query API](https://api.qdrant.tech/api-reference/search/query-points-groups), checked 2026-09-07.

### Task 0.2 — Verify Gemini Embedding 2 integration contract

Confirm the current Vertex AI auth path can call `gemini-embedding-2` with image input and output dimensionality 3072 using the existing service account and location `us`.

**Files to inspect:**

- existing Vertex/Google auth utilities in `apps/worker/src/`
- `apps/worker/package.json`
- worker runtime/deployment env configuration

**Decision:** reuse existing Google Cloud credentials. Do not add a Gemini API key or a second auth mechanism.

**Verification:** implementation in Phase 1 must use the spec's `:embedContent` contract and reject any response that is not exactly 3072 finite numbers. Reference: [Google multimodal embeddings](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-multimodal-embeddings), checked 2026-09-07.

### Task 0.3 — Lock V2 runtime configuration names

Add/confirm dedicated V2 configuration for the recognition collection and one `embedding_pipeline_version` covering `gemini-embedding-2`, 3072D, shared 1024 PNG preprocessing and RemBG `u2netp` (spec example: `ge2-3072-pre1024-rembg-u2netp-v1`). Fix the embedding model/dimension/location (`us`) in the V2 contract and validate any exposed overrides. Keep the broader recognition/prompt version available for telemetry.

Keep the collection name configurable and separate from `lana_multimodal_data_v2`. Do not repurpose shared legacy `VERTEX_EMBEDDING_*` configuration used by text/non-recognition consumers. Payload publication comparison uses only `source_hash` and `embedding_pipeline_version`; model/dimension/preprocess details can be derived from that pipeline contract rather than duplicated per point.

**Verification:** invalid/missing V2 config fails at startup or construction rather than producing mixed vector spaces.

---

## Phase 1 — Shared image pipeline and Gemini Embedding 2 client

### Task 1.1 — Extract a shared V2 image-preparation pipeline

**Likely files:**

- create `apps/worker/src/media-recognition-v2-image-pipeline.ts`
- add a focused test file following the repository's current Vitest placement convention
- reuse the existing FFmpeg/Sharp/RemBG helpers where possible instead of duplicating process execution

**Behavior:**

1. decode input;
2. normalize orientation;
3. resize so both dimensions are bounded by 1024;
4. preserve aspect ratio;
5. never upscale;
6. never crop;
7. emit canonical PNG for the prepared non-cutout image;
8. run RemBG `u2netp`;
9. return the prepared non-cutout buffer and ephemeral cutout PNG buffer.

Expose canonical non-cutout preparation separately from cutout creation. Catalog publication and customer retrieval call both stages; reranking reuses the already-prepared customer image and applies canonical preparation only to the winning catalog evidence images, without another RemBG pass.

The same implementation must be injected into catalog publication and customer recognition. Bound decode dimensions/pixels and process execution as well as downloaded bytes. Propagate an abort signal/remaining request budget through download, preparation, RemBG, embedding, Qdrant and reranking; terminate child work and clean temporary artifacts on timeout/failure.

**Verification:** focused tests for portrait, landscape, already-small images, orientation, no-upscale/no-crop behavior, deterministic format, and RemBG failure propagation.

### Task 1.2 — Add the Gemini Embedding 2 image client

**Likely files:**

- create `apps/worker/src/gemini-embedding-2-client.ts`
- add focused tests/mocks
- reuse existing Vertex auth helper(s)

**Contract:**

```ts
interface RecognitionImageEmbeddingPort {
  embedCutout(imagePng: Buffer, signal: AbortSignal): Promise<readonly number[]>;
}
```

**Wire contract:**

- OAuth bearer token from the existing service account.
- `POST https://aiplatform.us.rep.googleapis.com/v1/projects/<PROJECT_ID>/locations/us/publishers/google/models/gemini-embedding-2:embedContent`.
- Body: `{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "<base64 cutout PNG>" } }] } }`.
- Parse `response.embedding.values`; use the default 3072D output. Do not reuse the legacy `:predict` endpoint, `instances`, `parameters.dimension`, or its response parser.

**Behavior:**

- model `gemini-embedding-2`;
- image-only embedding;
- output dimensionality 3072;
- location `us`;
- no contextual product text;
- validate length = 3072;
- validate every value is finite;
- surface provider/auth/shape failures as explicit pipeline errors;
- never log the raw vector or credentials.

**Verification:** tests for correct request parameters, valid 3072 result, wrong dimension (including legacy 1408D), non-number values, NaN/Infinity, provider failure, and secret/vector redaction.

---

## Phase 2 — Dedicated Qdrant image-recognition adapter

### Task 2.1 — Add recognition-specific types and port

**Files:**

- create `packages/business-tools/src/image-recognition-qdrant.ts`
- modify `packages/business-tools/src/index.ts`
- add focused tests

Use a dedicated contract rather than extending the current generic 1408D multimodal adapter.

Suggested core result shape:

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
```

The adapter may expose narrow publisher methods for `get`, `upsert`, and `delete` in addition to grouped search.

### Task 2.2 — Implement exact grouped search

The query must request:

- `using=image_cutout`;
- `params.exact=true`;
- `group_by=product_id`;
- `group_size=1`;
- `limit=5`;
- `active=true` filter;
- `query=<3072D vector>`, `with_payload=true`, `with_vector=false`;
- payload and winning point evidence from `result.groups[].hits[0]`.

Return `min(5, eligible SKU groups)` in score order, preserving each group's winning point. Normalize `product_id` consistently when publishing (reuse the current SKU trim/uppercase convention), before server grouping. Validate group identity against its hit payload; malformed groups fail as `ERROR` rather than being silently dropped. Do not apply a fixed point cap, deduplicate a truncated point list, or substitute evidence after grouping.

Preserve the finite Qdrant cosine score as returned, including negative values; do not reuse the generic adapter's `[0,1]` score clamp. Do not collapse the hit into a product-only object that loses `pointId` or image evidence.

**Verification:** request-shape tests and mapping tests for five unique groups, duplicate image points within a SKU, malformed/missing payload, score ordering, inactive filtering, and evidence preservation.

### Task 2.3 — Define V2 collection provisioning contract

Provision/validate a dedicated collection with:

```text
image_cutout:
  size: 3072
  distance: Cosine
```

Payload must include the product/image evidence and publication hashes/versions defined in the spec. Do not add `image_raw`, `product_text`, or persistent cutout URLs.

**Verification:** collection schema validation must fail on dimension/vector-name mismatch.

---

## Phase 3 — V2 catalog recognition publisher

### Task 3.1 — Add a dedicated recognition publisher

**Likely files:**

- create `apps/worker/src/p23c-recognition-publisher.ts` or the closest repository-conforming name
- add focused tests
- modify only the minimum runner/server/wiring needed to schedule this publisher

Reuse from the existing catalog path:

- APPROVED + ACTIVE eligibility/Human Gate;
- deterministic image point identity;
- source hash calculation and one V2 embedding-pipeline version;
- retry and deletion semantics;
- run summaries/locks where useful.

Do **not** reuse `P23cPublisher.publishPoint()` unchanged because it publishes RAW + CUTOUT + text into the old multimodal collection.

### Task 3.2 — Make target Qdrant state authoritative for V2 publication

Resolve current row identity/action before comparing publication state:

| Current source/action | V2 action |
|---|---|
| Explicit delete / `ACTIVE=false`, or image classified `SIZE_GUIDE` | Delete the corresponding V2 recognition point |
| Active but pending/rejected/stale approval (`HOLD`) | Skip; preserve any last successfully published point |
| Eligible `APPROVED + ACTIVE`, target missing | `FULL_EMBED` + upsert |
| Eligible, `source_hash` or `embedding_pipeline_version` differs | `FULL_EMBED` + upsert |
| Eligible, both fields match | `NOOP` |

Only `source_hash` and `embedding_pipeline_version` determine V2 freshness. Do not add separate embedding/model/dimension/preprocess/cutout hashes per point; metadata-only source changes may re-embed as allowed by the spec.

Preserve `buildApprovedQdrantJobs()` identity and latest-row deduplication semantics in `p23c-jobs.ts`, including `HOLD` rows. Filtering them out before duplicate resolution could republish an older approved row. Apply the spec's explicit `SIZE_GUIDE` removal rule without treating all non-approved rows as deletes.

Construct and validate the complete new point before upsert. On preparation/embedding failure, report failure without deleting the previous successful point. If an upsert acknowledgement fails, do not mark success; read authoritative target state on retry because the remote write may already have completed. Do not write legacy Sheets `PUBLISHED_HASH/PUBLISHED_AT` from the V2 publisher or use them as V2 authority; do not add a DB dirty flag.

### Task 3.3 — Isolate publisher lock/progress namespace

Derive lock/progress keys from the configured recognition collection and embedding-pipeline version, for example:

```text
lock:ingest:<recognitionCollection>:<embeddingPipelineVersion>:shard:<...>
ingest:progress:<recognitionCollection>:<embeddingPipelineVersion>:shard:<...>
```

Never hardcode `lana_multimodal_data_v2` for V2 recognition publication.

**Verification:** publisher tests cover FULL_EMBED, NOOP, source/pipeline-version change, metadata-only re-embed, ACTIVE delete, SIZE_GUIDE removal, HOLD preservation for pending/rejected/stale rows, duplicate-row precedence, failure without success-state acknowledgement, retry/idempotency, and collection/pipeline-specific lock/progress keys.

---

## Phase 4 — Gemini contrastive reranker for 1–5 candidates

### Task 4.1 — Expand reranker contract from 2–3 to 1–5 candidates

**Files:**

- modify `apps/worker/src/vertex-media-reranker.ts`
- update/add focused tests

Changes:

- accept one through five candidates;
- remove `slice(0, 3)` behavior;
- remove the minimum-two-candidate requirement;
- keep structured output restricted to supplied IDs plus `none` and `ambiguous`;
- validate provider output again outside the prompt/schema.

### Task 4.2 — Use exact retrieval evidence images

For each candidate, pass the exact catalog image URL from the winning grouped Qdrant point. Do not substitute the product PRIMARY image.

The visual comparison receives:

- customer prepared non-cutout/canonical image;
- one exact matched non-cutout catalog evidence image per candidate.

Any candidate evidence download/preparation failure returns `ERROR` for the whole recognition request. Do not drop a candidate, backfill another point/image, or rerank a reduced set. Apply the same contrastive decision contract to a single candidate.

Prompt criteria should prioritize local discriminators such as pattern, embroidery, buttons, neckline, sleeves, trim, seams, material/texture, motif placement, tailoring, and color detail; ignore face/person/pose/background/camera position. Use both supporting and contradictory evidence. If the discriminating detail is not visible, return `ambiguous`.

**Verification:** tests for 1 candidate; ranks 1, 2, 3, 4, 5 winning; `none`; `ambiguous`; outside/unknown ID rejection; duplicate IDs; and candidate image fetch failure semantics.

---

## Phase 5 — Rebuild realtime recognition around V2

### Task 5.1 — Preserve the secure customer-image downloader

**File:** `apps/worker/src/realtime-media-recognition.ts`

Retain current protections:

- HTTPS only;
- approved host suffixes;
- no credentials in URL;
- port 443;
- bounded manual redirects;
- private/localhost/loopback blocking;
- allowed image MIME types;
- response size limit;
- timeout and cancellation across the entire pipeline;
- bounded decoded-image dimensions/pixels and child-process lifetime.

Apply the appropriate approved-host policy and these controls to catalog evidence fetches as well. Validate redirect destinations before following them.

Do not weaken these controls while replacing the recognition logic.

### Task 5.2 — Replace dual-path retrieval with one V2 path

Realtime flow becomes:

```text
safe download
→ shared V2 preprocess
→ RemBG cutout
→ one Gemini Embedding 2 / 3072D call
→ grouped exact Qdrant search
→ 0 candidates: NOT_FOUND
→ 1–5 candidates: Gemini reranker
→ final state
```

Delete/bypass V2 use of:

- raw embedding/search;
- RAW/CUTOUT merge;
- score/gap acceptance thresholds;
- RAW fallback;
- RAW/CUTOUT disagreement handling;
- PRIMARY-first `representativeImageUrl()` selection.

### Task 5.3 — Fix final decision semantics

If Gemini selects candidate N:

- `status = MATCHED`;
- product = selected candidate's product;
- `score = selected candidate.retrievalScore`;
- `gap = null`;
- `decisionSource = GEMINI_RERANK`.

If Gemini returns `ambiguous` → `AMBIGUOUS`.  
If Gemini returns `none` → `NOT_FOUND`.  
Infrastructure/pipeline failures → `ERROR`.

Any of ranks 1–5 must be eligible to become the final match.

### Task 5.4 — Remove recognition-result Redis cache from V2

The initial V2 recognition service must not read or write the existing final-result recognition cache. Remove that cache dependency from V2 wiring; Redis may remain for unrelated worker functions.

Do not emit `cacheHit` as V2 recognition telemetry.

### Task 5.5 — Replace recognition telemetry with V2 fields

Track only the V2-relevant signals specified in the spec, including pipeline/model/dimension/preprocess versions, exact grouped candidate ranks/scores/evidence, reranker decision/original rank, final result, and per-stage latency.

Do not log raw vectors, auth material, or removed RAW/fusion/cache fields.

**Verification:** focused realtime tests must prove one cutout embedding call, exact grouped search, no raw path, no threshold/direct match, reranker invocation for all 1–5 candidate counts, any rank can win, exact evidence URL is used, score belongs to selected SKU, `gap=null`, no recognition cache use, security controls remain enforced, and final status mapping is correct.

---

## Phase 6 — Runtime wiring, collection build, and direct cutover

### Task 6.1 — Wire the V2 dependencies without changing text search

**Likely files:**

- `apps/worker/src/realtime-runner.ts`
- `apps/worker/src/realtime-server.ts` (actual recognition construction/config)
- publisher runner/server entry points next to `p23c-publisher.ts`
- deployment/runtime env files used by PREPROD
- Qdrant provisioning/config files

Wire:

- shared V2 image pipeline;
- Gemini Embedding 2 client;
- dedicated recognition Qdrant adapter;
- V2 recognition publisher;
- updated 1–5 reranker;
- realtime V2 service.

Leave existing `product_text` / non-recognition multimodal consumers on their current path. Remove the active V2 path's optional reranker/OFF and result-cache wiring; invalid/missing V2 dependencies must fail closed rather than reach the runner's legacy image-search branch. Preserve the existing page allowlist.

Exact-product catalog enrichment such as `rehydrateRecognizedProduct()` may remain, provided it neither performs replacement image recognition nor overwrites the winning evidence or fabricates verified business facts. Keep verified facts/media, reset/staleness fences, and response-group delivery boundaries intact. Use focused consumer regression tests for these existing contracts; no V1 comparison, A/B or benchmark is required.

### Task 6.2 — Provision and fully build the PREPROD recognition collection

Perform this runtime work only when its scope is authorized; this documentation PR does not run it.

1. Verify deployed grouped-exact API support and the Gemini endpoint/auth contract, then provision/validate the dedicated 3072D collection.
2. Run the V2 publisher over the source snapshot, including eligible upserts, explicit deletes/SIZE_GUIDE removals and HOLD handling.
3. Reconcile expected point identities and `source_hash` / `embedding_pipeline_version` against actual target state, not just total counts. Confirm every eligible image is published, explicit removals are absent, and HOLD points are preserved according to Task 3.2. Resolve failed/pending publication work before activation.
4. If source state changes before activation, reconcile again. Keep customer recognition traffic off the partially populated collection.

### Task 6.3 — Direct cutover

After Tasks 7.1–7.4 pass for the selected source candidate, the V2 collection is reconciled, and runtime configuration is valid, execute the owner-authorized deployment using the exact merged commit. Before activation, record the new and previous release/build/commit and relevant config identity for each affected service under the existing release-integrity procedure; perform meaningful pre-activation readiness checks.

Then:

- switch all image-recognition traffic to V2;
- stop invoking the old image-recognition runtime path;
- do not run percentage rollout, shadow traffic, A/B, or dual recognition;
- do not add business-logic fallback to the old engine.

After activation, run scoped smoke/readback checks against the approved PREPROD test page and record exact running identities. On failed or unknown runtime state, stop further mutation and roll back affected services to their recorded previous identities/configuration. Operational rollback is normal deployment rollback/redeploy only; it is not a second recognition path in V2 code.

**Verification:** PREPROD configuration and wiring demonstrate that image recognition resolves only through the V2 port while text search remains on its existing path.

---

## Phase 7 — Verification, review, and ship gate

Tasks 7.1–7.4 check the integrated source candidate before cutover; Task 7.5 records completion after authorized activation. This is V2 conformance verification, not a benchmark or comparison with the old recognition implementation.

### Task 7.1 — Targeted automated verification

Use the repository-pinned Node/pnpm versions and a frozen-lockfile install. Run the focused test suites added/changed during implementation, then at minimum:

```bash
pnpm --filter @lana/business-tools test
pnpm --filter @lana/business-tools typecheck
pnpm --filter @lana/worker test
pnpm --filter @lana/worker typecheck
```

Finish with the repository quality gate:

```bash
pnpm check
```

Record actual command results; do not mark completion from code inspection alone.

### Task 7.2 — Correctness review

Review in this order:

1. exact grouped retrieval returns `min(5, eligible SKU groups)` server-side;
2. candidate evidence always belongs to the winning Qdrant point;
3. ranks 1–5 can all become final matches;
4. no old threshold/raw/fusion/cache branch remains reachable in V2;
5. catalog and customer use the same preprocessing/embedding space;
6. V2 publication is idempotent and independent from old sheet publish hashes;
7. partial catalog build cannot receive customer traffic.

### Task 7.3 — Security review

Verify:

- downloader SSRF/redirect/MIME/size/timeout controls were preserved;
- external image/model output remains untrusted;
- reranker can only select supplied candidate IDs;
- no service-account private key, OAuth token, Qdrant key, auth header, or raw vector appears in logs/telemetry;
- reranker has no mutation capability.

### Task 7.4 — Source/API review

Reconfirm version-sensitive external calls against official/current Vertex AI and Qdrant REST documentation and the deployed API capabilities before activation. Keep native-fetch integration unless a separately justified dependency is needed; no installed Qdrant SDK is assumed.

### Task 7.5 — Definition of Done / cutover gate

Do not consider the implementation complete until:

- all focused and repository checks pass;
- no unresolved correctness/security blockers remain;
- PREPROD V2 collection is complete and schema-valid;
- runtime config points image recognition only to V2;
- required observability is present without secrets/vectors;
- migration/cutover steps are documented and reproducible;
- authorized activation has recorded successful smoke/readback and exact running/rollback identities;
- the repository Definition of Done is satisfied.

Source implementation may be marked verified once its owning checks pass, while deployment items remain unchecked until authorized and executed. PREPROD completion does not claim public-production readiness.

## 3. Expected primary file scope

Expected to add/modify only the smallest set required around:

```text
apps/worker/src/
  media-recognition-v2-image-pipeline.ts        # new, likely
  gemini-embedding-2-client.ts                  # new, likely
  p23c-recognition-publisher.ts                 # new, likely
  realtime-media-recognition.ts                 # modify
  vertex-media-reranker.ts                      # modify
  realtime-runner.ts                            # modify as needed
  realtime-server.ts                            # actual composition/config
  <dedicated publisher runner/server wiring>
  <focused tests following current convention>

packages/business-tools/src/
  image-recognition-qdrant.ts                   # new
  index.ts                                      # export new port/adapter
  <focused tests following current convention>

<deployment/Qdrant/runtime config actually used by PREPROD>
```

Do not refactor unrelated upload, P2.3B, Human Gate, inventory, commerce, messaging, or text-search code.

## 4. Explicitly rejected implementation alternatives

- **Extend the existing generic multimodal Qdrant adapter to 3072D:** rejected because it would couple image-recognition migration to the existing 1408D RAW/CUTOUT/text collection and risk text-search regressions.
- **Client-side oversampling + SKU dedupe:** rejected because the locked V2 contract uses Qdrant server-side grouping and preserves the winning point per SKU.
- **Direct Top1 acceptance by similarity threshold:** rejected; all 1–5 candidate requests are visually reranked.
- **Keep Redis recognition-result cache during cutover:** rejected for initial V2; it can preserve stale decisions across the replacement.
- **Reuse `P23cPublisher.publishPoint()` unchanged:** rejected because it emits RAW + text + CUTOUT into the old collection and owns old publication state.
- **Persist cutout files:** rejected; cutouts remain ephemeral.
- **A/B, shadow, dual engines, legacy runtime fallback:** rejected by the direct-replacement requirement.

## 5. Completion artifact

Execution progress is tracked in:

`docs/current/MEDIA_RECOGNITION_V2_CUTOUT_ONLY_TODO_20260907.md`

The plan itself is not evidence that implementation, tests, PREPROD build, or cutover have occurred.
