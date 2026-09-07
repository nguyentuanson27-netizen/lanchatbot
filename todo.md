# Product Image Recognition V2 — Todo

> Source plan: `tasks/plan.md`
> Spec: `docs/current/MEDIA_RECOGNITION_V2_CUTOUT_ONLY_SPEC_20260907.md`
> Status: planning complete; implementation not started.

- [ ] **P0 — Wiring/config discovery**
  - [ ] Identify exact worker recognition bootstrap/composition file.
  - [ ] Identify exact V2 env/config and Qdrant provisioning files.
  - [ ] Confirm PREPROD Qdrant `/points/query/groups` support.
  - [ ] Identify reusable Google service-account auth helper.

- [ ] **P1 — Shared V2 preprocessing**
  - [ ] Add shared 1024px canonical PNG preparation module.
  - [ ] Preserve decode/security bounds.
  - [ ] Add focused tests.

- [ ] **P2 — Gemini Embedding 2 adapter**
  - [ ] Add Vertex `us` multi-region `:embedContent` adapter.
  - [ ] Validate finite 3072D `embedding.values` response.
  - [ ] Reuse current Google auth; no new API key.
  - [ ] Add focused tests.

- [ ] **P3 — V2 Qdrant adapter/provisioning**
  - [ ] Add dedicated 3072D `image_cutout` collection contract.
  - [ ] Add exact grouped query by `product_id`, group size 1, limit 5.
  - [ ] Preserve winning point/image evidence.
  - [ ] Add minimal publisher point operations.
  - [ ] Add focused tests and provisioning/config.

- [ ] **P4 — V2 catalog publisher**
  - [ ] Reuse Human Gate/job identity semantics without old vector publishing.
  - [ ] Reconcile via `source_hash + embedding_pipeline_version` from V2 Qdrant state.
  - [ ] Preserve HOLD; implement ACTIVE=false and SIZE_GUIDE removal.
  - [ ] Use separate V2 lock/progress namespace.
  - [ ] Add focused tests.

- [ ] **P5 — Gemini reranker 1–5**
  - [ ] Support one through five candidates.
  - [ ] Add single-candidate direct feature verification.
  - [ ] Allow any supplied rank 1–5 to win.
  - [ ] Validate model output allowlist.
  - [ ] Add focused tests.

- [ ] **P6 — Realtime recognition V2**
  - [ ] One cutout embedding only.
  - [ ] Exact grouped Top5 retrieval.
  - [ ] Use exact winning catalog image as reranker evidence.
  - [ ] Always rerank non-empty shortlist.
  - [ ] Correct `MATCHED/AMBIGUOUS/NOT_FOUND/ERROR`, selected score, `gap=null`.
  - [ ] Remove active RAW/threshold/cache/fallback behavior.
  - [ ] Preserve external-image security controls.
  - [ ] Add/update focused tests.

- [ ] **P7 — Runtime/config wiring**
  - [ ] Bind V2 as the only `mediaRecognition` implementation.
  - [ ] Keep text-search Qdrant wiring unchanged.
  - [ ] Document minimal non-secret env/config.
  - [ ] Ensure missing mandatory config fails clearly.

- [ ] **P8 — PREPROD build/activation** — requires explicit owner authorization
  - [ ] Create V2 collection.
  - [ ] Verify grouped-query capability.
  - [ ] Fully backfill eligible catalog before traffic.
  - [ ] Verify index completion/eligibility.
  - [ ] Directly cut image recognition to V2.
  - [ ] Confirm legacy recognizer is not called.

- [ ] **P9 — Verification/review/DoD**
  - [ ] Run focused tests and typechecks.
  - [ ] Run appropriate workspace/root test/typecheck/build gates.
  - [ ] Review correctness → security → architecture → simplicity → performance.
  - [ ] Verify no RAW/cache/compatibility fallback/A-B/shadow/legacy runtime fallback.
  - [ ] Record actual verification evidence before marking complete.

## Explicit non-goals

- V1 comparison/benchmark.
- RAW retrieval/fallback.
- Recognition-result cache/catalog generation.
- Qdrant raw-point compatibility paging/over-fetch.
- Detail crops/multivectors/RRF/HNSW tuning.
- Persistent cutout storage.
- New queue infrastructure.
- Text-search/P2.3B/Human Gate redesign.
