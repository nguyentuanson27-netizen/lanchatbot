# TODO — Product Image Recognition V2

Tracks execution of `MEDIA_RECOGNITION_V2_CUTOUT_ONLY_IMPLEMENTATION_PLAN_20260907.md`.

All items are intentionally unchecked. This document records planned work only; it does not imply implementation or verification has happened. Source checks in Tasks 7.1–7.4 precede cutover in Task 6.3. Collection operations and deployment require their scoped authorization under the current `SOLO_PREPROD_MINIMAL` process; this PR performs neither.

## Phase 0 — API/config preflight

- [ ] Confirm native-fetch REST contract for `POST /collections/<collection>/points/query/groups`; verify deployed support before activation. No Qdrant SDK dependency is assumed.
- [ ] Lock grouped exact named-vector request: `using=image_cutout`, `group_by=product_id`, `group_size=1`, `limit=5`, `params.exact=true`, `active=true`, `with_payload=true`, `with_vector=false`.
- [ ] Verify current Vertex AI/service-account integration can call `gemini-embedding-2` for image input with output dimensionality 3072 in location `us`.
- [ ] Lock/configure the V2 recognition collection name separately from `lana_multimodal_data_v2`.
- [ ] Lock one `embedding_pipeline_version` for model/dimension/preprocessing/cutout; keep V2 config separate from shared legacy `VERTEX_EMBEDDING_*` settings and retain recognition/prompt version telemetry.
- [ ] Ensure invalid V2 config cannot silently mix incompatible vector spaces.

## Phase 1 — Shared preprocessing + embedding

- [ ] Add one shared V2 image-preparation implementation used by catalog and customer recognition.
- [ ] Normalize orientation and canonical PNG output.
- [ ] Bound both image dimensions to max 1024, preserve aspect ratio, do not upscale, do not crop.
- [ ] Expose canonical non-cutout preparation separately for reranker evidence; reuse the prepared query image.
- [ ] Keep RemBG `u2netp` and return an ephemeral cutout buffer only; do not persist cutout files.
- [ ] Bound decoded dimensions/pixels and propagate cancellation/remaining budget through network and child-process work; clean temporary artifacts.
- [ ] Add `gemini-embedding-2` image-only embedding client using existing Google Cloud auth.
- [ ] Use the `us` multi-region `:embedContent` endpoint and `content.parts[].inlineData`; parse `embedding.values`, with default 3072D output.
- [ ] Reject wrong dimensions, non-number and non-finite values; do not reuse legacy `:predict`/`parameters.dimension` request or response shapes.
- [ ] Add focused preprocessing/embedding tests, including provider/RemBG error paths and secret/vector logging checks.

## Phase 2 — Dedicated recognition Qdrant adapter

- [ ] Add dedicated image-recognition Qdrant types/port instead of changing the generic 1408D multimodal adapter.
- [ ] Export the new recognition adapter/port from `packages/business-tools`.
- [ ] Implement exact grouped search using `image_cutout`, `params.exact=true`, `group_by=product_id`, `group_size=1`, `limit=5`, `active=true`.
- [ ] Parse `result.groups[].hits[0]`; preserve winning `pointId`, unmodified finite cosine score (including negatives), and exact image evidence.
- [ ] Normalize SKU IDs before publication/grouping; validate group/hit identity and fail malformed results as `ERROR`, without silent dropping/backfill.
- [ ] Add narrow target-point get/upsert/delete operations needed by the V2 publisher.
- [ ] Define/provision the recognition collection as cosine `image_cutout` 3072D only.
- [ ] Validate collection vector name/dimension before use.
- [ ] Add adapter tests for grouped request shape, unique SKU groups, evidence mapping, inactive filtering, malformed payloads, and ordering.

## Phase 3 — V2 catalog recognition publisher

- [ ] Add a dedicated V2 recognition publisher/path; do not reuse old `P23cPublisher.publishPoint()` unchanged.
- [ ] Reuse existing APPROVED + ACTIVE eligibility/Human Gate without redesigning P2.3B.
- [ ] Reuse deterministic one-image/one-point identity.
- [ ] Publish only shared-preprocess → RemBG → Gemini Embedding 2 / 3072D → `image_cutout`.
- [ ] Derive V2 publication state from the target Qdrant point/hashes rather than old Sheets `PUBLISHED_HASH/PUBLISHED_AT`.
- [ ] Implement missing point → FULL_EMBED/upsert.
- [ ] Compare only `source_hash` + `embedding_pipeline_version`: mismatch → FULL_EMBED/upsert; both equal → NOOP; metadata-only re-embed is allowed.
- [ ] Implement explicit delete / `ACTIVE=false` and `SIZE_GUIDE` removal → delete recognition point.
- [ ] Preserve previous publication for active pending/rejected/stale approval (`HOLD`); preserve latest-row duplicate resolution before eligibility filtering.
- [ ] Never acknowledge legacy Sheets `PUBLISHED_HASH/PUBLISHED_AT` from V2; keep last successful point on preparation/embedding failure.
- [ ] Derive lock/progress namespace from recognition collection and embedding-pipeline version; isolate from the old publisher.
- [ ] Add publisher tests for FULL_EMBED, NOOP, source/version change, metadata-only change, delete/SIZE_GUIDE, HOLD, duplicate precedence, failure/retry, idempotency, and namespace isolation.

## Phase 4 — Gemini reranker 1–5

- [ ] Update `vertex-media-reranker.ts` to accept 1–5 candidates.
- [ ] Remove current top-3 slicing and minimum-two-candidate requirement.
- [ ] Feed the exact catalog image from each winning grouped Qdrant point; do not replace it with PRIMARY.
- [ ] Use customer prepared non-cutout image plus exact catalog non-cutout evidence images for visual reranking.
- [ ] Update prompt for contrastive local-detail reasoning using both supporting and contradictory evidence.
- [ ] Keep output restricted to supplied candidate IDs plus `none` and `ambiguous`.
- [ ] Validate returned candidate ID outside the model prompt/schema.
- [ ] Fail the entire request as `ERROR` on any evidence-image fetch/preparation failure; no dropping, backfill or reduced-set rerank.
- [ ] Add tests proving ranks 1, 2, 3, 4, and 5 can each win, plus one-candidate, none, ambiguous, invalid-ID, duplicate-ID, and image-fetch failure cases.

## Phase 5 — Realtime V2 recognition

- [ ] Preserve HTTPS, host allowlist, credential/port restrictions, redirect validation/bounds, private-IP/loopback blocking, MIME/byte/decode limits, timeout and cancellation for customer and catalog-evidence downloads.
- [ ] Replace realtime dual retrieval with one shared-preprocess + cutout + one 3072D embedding path.
- [ ] Query only the dedicated V2 recognition collection with grouped exact search.
- [ ] Remove RAW embedding/search from the V2 recognition path.
- [ ] Remove RAW/CUTOUT merge/disagreement logic and RAW fallback.
- [ ] Remove score/gap threshold direct-match logic.
- [ ] Remove PRIMARY-first representative-image evidence selection.
- [ ] Route 0 candidates to `NOT_FOUND`.
- [ ] Route every 1–5 candidate result through the Gemini reranker.
- [ ] Allow any reranker-selected rank 1–5 SKU to become final `MATCHED`.
- [ ] Set final `score` to the selected SKU's retrieval score and `gap=null`.
- [ ] Map reranker `ambiguous` → `AMBIGUOUS` and `none` → `NOT_FOUND`; infrastructure failures → `ERROR`.
- [ ] Remove/bypass Redis recognition-result cache reads/writes from initial V2 and remove `cacheHit` from V2 telemetry.
- [ ] Emit V2-only telemetry for model/version, grouped candidates/evidence, reranker result, final decision, and stage latency; never log raw vectors/secrets.
- [ ] Add focused realtime tests for all above behaviors and security controls.

## Phase 6 — Wiring, collection build, direct cutover

- [ ] Wire dependencies in `realtime-server.ts`, `realtime-runner.ts` and dedicated publisher entry points; remove active V2 reranker-OFF/cache wiring and fail closed on missing V2 dependencies.
- [ ] Preserve page allowlist, verified facts/media, reset/staleness fences and response-group delivery boundaries with focused consumer regression tests.
- [ ] Keep exact-product enrichment from replacing recognition evidence or fabricating verified facts.
- [ ] Keep existing text-search / `product_text` consumers on their existing multimodal path.
- [ ] Provision the PREPROD V2 recognition collection with the locked schema.
- [ ] Fully populate all eligible APPROVED + ACTIVE catalog images before serving customer recognition traffic.
- [ ] Reconcile expected point IDs and source/pipeline versions against target state, including deletes/SIZE_GUIDE and HOLD handling; resolve failed/pending publication work and reconcile again if source changes.
- [ ] Complete Tasks 7.1–7.4 and pre-activation API/schema/config/readiness checks before cutover.
- [ ] Record scoped deployment authorization, exact merged source and new/previous release/build/config identity per affected service.
- [ ] Switch all image-recognition traffic directly to V2 after collection completeness is verified.
- [ ] Run authorized post-activation smoke/readback and record running identities; failed/unknown state stops mutation and triggers exact previous-service rollback.
- [ ] Ensure the old image-recognition runtime path is no longer invoked after cutover.
- [ ] Do not add percentage rollout, A/B, shadow, dual recognition, or runtime legacy fallback.

## Phase 7 — Verify / review / ship gate

- [ ] Run focused tests added/changed for the V2 implementation and record results.
- [ ] Run `pnpm --filter @lana/business-tools test`.
- [ ] Run `pnpm --filter @lana/business-tools typecheck`.
- [ ] Run `pnpm --filter @lana/worker test`.
- [ ] Run `pnpm --filter @lana/worker typecheck`.
- [ ] Run repository quality gate `pnpm check` and record the actual result.
- [ ] Review correctness: server-side `min(5, eligible SKU groups)`, exact evidence preservation, arbitrary rank win, no reachable RAW/fusion/threshold/cache branch.
- [ ] Review publisher idempotency and independence from old Sheets publication hashes.
- [ ] Review security: SSRF/download controls, untrusted model output, candidate-ID validation, no secret/vector logging, no reranker mutation rights.
- [ ] Recheck version-sensitive Vertex AI and Qdrant REST calls against official/current docs and deployed API capabilities before activation.
- [ ] Confirm PREPROD collection is complete and schema-valid before recognition traffic is enabled.
- [ ] Confirm required observability and migration/cutover instructions are present.
- [ ] Confirm repository Definition of Done, including post-activation evidence, before marking V2 complete; keep deployment items unchecked while only source work is verified.
