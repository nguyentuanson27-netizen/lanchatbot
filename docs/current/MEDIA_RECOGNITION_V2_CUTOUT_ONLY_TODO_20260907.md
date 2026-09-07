# TODO — Product Image Recognition V2

Tracks execution of `MEDIA_RECOGNITION_V2_CUTOUT_ONLY_IMPLEMENTATION_PLAN_20260907.md`.

All items are intentionally unchecked. This document records planned work only; it does not imply implementation or verification has happened.

## Phase 0 — API/config preflight

- [ ] Verify installed `@qdrant/js-client-rest` and deployed Qdrant support grouped exact named-vector search with `group_by=product_id`, `group_size=1`, `limit=5`, `params.exact=true`, payload/filter return.
- [ ] Verify current Vertex AI/service-account integration can call `gemini-embedding-2` for image input with output dimensionality 3072 in location `us`.
- [ ] Lock/configure the V2 recognition collection name separately from `lana_multimodal_data_v2`.
- [ ] Lock/configure model, dimension, preprocess version, cutout version, pipeline version, and Vertex location.
- [ ] Ensure invalid V2 config cannot silently mix incompatible vector spaces.

## Phase 1 — Shared preprocessing + embedding

- [ ] Add one shared V2 image-preparation implementation used by catalog and customer recognition.
- [ ] Normalize orientation and canonical PNG output.
- [ ] Bound both image dimensions to max 1024, preserve aspect ratio, do not upscale, do not crop.
- [ ] Keep RemBG `u2netp` and return an ephemeral cutout buffer only; do not persist cutout files.
- [ ] Add `gemini-embedding-2` image-only embedding client using existing Google Cloud auth.
- [ ] Request/validate exactly 3072 embedding dimensions and reject non-finite values.
- [ ] Add focused preprocessing/embedding tests, including provider/RemBG error paths and secret/vector logging checks.

## Phase 2 — Dedicated recognition Qdrant adapter

- [ ] Add dedicated image-recognition Qdrant types/port instead of changing the generic 1408D multimodal adapter.
- [ ] Export the new recognition adapter/port from `packages/business-tools`.
- [ ] Implement exact grouped search using `image_cutout`, `params.exact=true`, `group_by=product_id`, `group_size=1`, `limit=5`, `active=true`.
- [ ] Preserve winning Qdrant `pointId`, score, and exact image evidence for every grouped SKU.
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
- [ ] Implement source/config mismatch → FULL_EMBED/upsert.
- [ ] Implement matching V2 hashes/versions → NOOP.
- [ ] Implement `ACTIVE=false` / no longer eligible → delete/deactivate recognition point.
- [ ] Derive lock/progress namespace from the configured recognition collection; do not hardcode `lana_multimodal_data_v2`.
- [ ] Add publisher tests for FULL_EMBED, NOOP, re-embed, delete, retry, idempotency, and lock namespace isolation.

## Phase 4 — Gemini reranker 1–5

- [ ] Update `vertex-media-reranker.ts` to accept 1–5 candidates.
- [ ] Remove current top-3 slicing and minimum-two-candidate requirement.
- [ ] Feed the exact catalog image from each winning grouped Qdrant point; do not replace it with PRIMARY.
- [ ] Use customer prepared non-cutout image plus exact catalog non-cutout evidence images for visual reranking.
- [ ] Update prompt for contrastive local-detail reasoning using both supporting and contradictory evidence.
- [ ] Keep output restricted to supplied candidate IDs plus `none` and `ambiguous`.
- [ ] Validate returned candidate ID outside the model prompt/schema.
- [ ] Add tests proving ranks 1, 2, 3, 4, and 5 can each win, plus one-candidate, none, ambiguous, invalid-ID, duplicate-ID, and image-fetch failure cases.

## Phase 5 — Realtime V2 recognition

- [ ] Preserve existing secure customer-image downloader controls: HTTPS, host allowlist, port 443, redirect bounds, private-IP/loopback blocking, MIME/size limits, timeout.
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

- [ ] Wire shared pipeline, embedding client, dedicated Qdrant adapter, V2 publisher, reranker, and realtime V2 service into the actual worker composition.
- [ ] Keep existing text-search / `product_text` consumers on their existing multimodal path.
- [ ] Provision the PREPROD V2 recognition collection with the locked schema.
- [ ] Fully populate all eligible APPROVED + ACTIVE catalog images before serving customer recognition traffic.
- [ ] Verify publisher reconciliation reports a complete/consistent V2 catalog state before cutover.
- [ ] Switch all image-recognition traffic directly to V2.
- [ ] Ensure the old image-recognition runtime path is no longer invoked after cutover.
- [ ] Do not add percentage rollout, A/B, shadow, dual recognition, or runtime legacy fallback.

## Phase 7 — Verify / review / ship gate

- [ ] Run focused tests added/changed for the V2 implementation and record results.
- [ ] Run `pnpm --filter @lana/business-tools test`.
- [ ] Run `pnpm --filter @lana/business-tools typecheck`.
- [ ] Run `pnpm --filter @lana/worker test`.
- [ ] Run `pnpm --filter @lana/worker typecheck`.
- [ ] Run repository quality gate `pnpm check` and record the actual result.
- [ ] Review correctness: server-side Top5 unique SKU grouping, exact evidence preservation, arbitrary rank win, no reachable RAW/fusion/threshold/cache branch.
- [ ] Review publisher idempotency and independence from old Sheets publication hashes.
- [ ] Review security: SSRF/download controls, untrusted model output, candidate-ID validation, no secret/vector logging, no reranker mutation rights.
- [ ] Recheck version-sensitive Vertex AI and Qdrant calls against official/current docs and installed SDKs.
- [ ] Confirm PREPROD collection is complete and schema-valid before recognition traffic is enabled.
- [ ] Confirm required observability and migration/cutover instructions are present.
- [ ] Confirm repository Definition of Done is satisfied before marking V2 complete.
