# Product Image Recognition V2 — Implementation Plan

> Status: `PLAN_READY_FOR_BUILD`
> Date: `2026-09-07`
> Target: `ENGINEERING_PREPROD` / `SOLO_PREPROD_MINIMAL`
> Spec: `docs/current/MEDIA_RECOGNITION_V2_CUTOUT_ONLY_SPEC_20260907.md`
> Spec base: `1ea4db8962b6e64d861e15fe1f9205443705d5f9`
> This plan does not authorize deployment or live migration.

## Goal

Implement the smallest exact-SKU V2 required by the approved spec:

```text
CATALOG
APPROVED + ACTIVE
→ shared 1024 PNG preprocess
→ RemBG
→ CUTOUT
→ gemini-embedding-2 / 3072D
→ dedicated Qdrant recognition collection

CUSTOMER
secure download
→ same preprocess
→ RemBG
→ CUTOUT
→ gemini-embedding-2 / 3072D
→ exact Qdrant grouped retrieval by product_id
→ Top 5 unique SKUs + winning image evidence
→ Gemini reranker
→ MATCHED | AMBIGUOUS | NOT_FOUND | ERROR
```

No RAW retrieval, thresholds, result cache, compatibility retrieval fallback, A/B/shadow/dual path, or runtime legacy fallback.

## Dependency order

```text
P0 wiring/config discovery
→ P1 shared preprocessing
→ P2 Gemini Embedding 2 adapter
→ P3 V2 Qdrant adapter + provisioning
→ P4 V2 catalog publisher
→ P5 reranker 1–5
→ P6 realtime recognition V2
→ P7 runtime/config cutover wiring
→ P8 PREPROD index build + activation
→ P9 verification/review/DoD
```

P4 and P6 depend on P1–P3. P6 also depends on P5. P8 requires separate owner authorization.

## P0 — Resolve exact wiring and prerequisites

**Goal:** remove remaining repository-location uncertainty before runtime edits; do not guess bootstrap/deploy file names.

Inspect and record:
- exact worker composition/bootstrap that constructs `RealtimeMediaRecognitionPort`;
- env/config path for recognition collection/model/location/RemBG;
- Qdrant provisioning convention;
- PREPROD Qdrant support for `/points/query/groups`;
- Google service-account auth helper reused by V2.

Known seams: `apps/worker/src/realtime-runner.ts`, `apps/worker/src/realtime-media-recognition.ts`, `packages/business-tools/src/qdrant.ts`.

**Verification:** exact executable wiring/provisioning files identified; grouped-query prerequisite confirmed or activation marked blocked. No runtime mutation.

## P1 — Shared V2 image preprocessing

**Goal:** catalog and customer feed identical image geometry/format to RemBG/embedding.

Expected files: new focused module/test under `apps/worker/src/`; `realtime-media-recognition.ts` consumes it; P4 publisher reuses it.

Contract:
```text
decode → orientation normalize → maxDimension=1024 → preserve aspect ratio
→ no upscaling → canonical PNG
```

Keep existing HTTPS/allowlist/redirect/private-IP/MIME/byte/timeout protections and bounded decode behavior.

**Tests first:** portrait/landscape bounds, no upscale, aspect ratio, PNG output, same shared function for both call sites, unsafe/invalid input still rejected.

**Verification:** focused Vitest + worker typecheck.

## P2 — Gemini Embedding 2 adapter

**Goal:** dedicated V2 adapter; do not mutate the legacy `multimodalembedding@001:predict` contract into a hybrid.

Contract:
```text
model=gemini-embedding-2
location=us
endpoint=https://aiplatform.us.rep.googleapis.com
method=:embedContent
input=CUTOUT PNG via content.parts[].inlineData
output=response.embedding.values
required=exactly 3072 finite numbers
```

Reuse current Google service-account/OAuth auth path; no new Gemini API key; no contextual product text.

**Tests first:** host/path, `locations/us`, request schema, no legacy `instances/predictions`, valid 3072 accepted, malformed/non-finite/wrong-length rejected, error paths do not leak secrets.

**Verification:** focused adapter tests + worker typecheck. Live Vertex connectivity is PREPROD verification, not unit completion.

## P3 — V2 Qdrant adapter + collection provisioning

**Goal:** separate 3072D recognition from current 1408D multimodal/text adapter and preserve point evidence.

Expected files: new recognition adapter/types/tests under `packages/business-tools/src/`; package export if needed; exact deploy/config files from P0; `.env.example` only for required non-secret config.

Collection:
```text
image_cutout: size=3072, distance=Cosine
```

Grouped search:
```text
POST /collections/<collection>/points/query/groups
using=image_cutout
group_by=product_id
group_size=1
limit=5
params.exact=true
filter active=true
```

Return exact winning point ID, product ID, score and image evidence. Add only minimal publisher operations: point-state lookup, upsert, delete. No generic framework and no raw-point over-fetch fallback.

**Tests first:** 3072 validation, exact grouped body, active filter, point evidence preserved, malformed payload safe failure, V2 collection isolation, no legacy `expectedDimension=1408` leakage.

**Verification:** business-tools tests/typecheck + provisioning contract review.

## P4 — Focused V2 catalog publisher

**Goal:** maintain recognition collection from existing Human Gate without redesigning P2.3B.

Expected files: focused V2 publisher/runner/server only as required by current conventions; reuse `p23c-jobs.ts` action/identity semantics where safe; tests.

Flow:
```text
eligible image → P1 preprocess → RemBG → P2 embed → P3 image_cutout upsert
```

Reconciliation source of truth is V2 Qdrant state only:
```text
missing → FULL_EMBED
source_hash changed → FULL_EMBED
embedding_pipeline_version changed → FULL_EMBED
same → NOOP
explicit delete → DELETE
```

Initial fingerprint: `ge2-3072-pre1024-rembg-u2netp-v1` (exact constant may follow repo naming).

Do not use legacy Sheet `PUBLISHED_HASH/PUBLISHED_AT` as authoritative V2 state; no new dirty flag.

Human Gate:
- `ACTIVE=false` → DELETE;
- `APPROVED+ACTIVE` → UPSERT/refresh;
- active non-approved → HOLD, preserving an already-published point;
- `SIZE_GUIDE` → remove from active recognition.

V2 lock/progress keys must use a separate V2 namespace.

**Tests first:** FULL_EMBED/NOOP/DELETE, no legacy published-hash fallback, HOLD, SIZE_GUIDE, deterministic ID, failure does not overwrite good point, only cutout vector, separate lock/progress.

**Verification:** focused publisher tests + worker typecheck; no backfill yet.

## P5 — Reranker 1–5 candidates

Files: `apps/worker/src/vertex-media-reranker.ts` and test.

Changes:
- cap at 5, not 3;
- allow 1–5 unique IDs;
- single candidate = direct visual feature verification;
- multiple candidates = contrastive positive + contradictory evidence;
- structured output allowlist = supplied IDs + `none` + `ambiguous`;
- any rank 1–5 can win.

**Tests first:** candidate counts 1 and 5, rank-2/rank-5 selection, duplicate rejection, none, ambiguous, outside-ID rejection, malformed output.

**Verification:** focused reranker tests + worker typecheck.

## P6 — Realtime recognition V2

Files: `apps/worker/src/realtime-media-recognition.ts`, test, P1/P2/P3/P5 modules.

Flow:
```text
safe download → P1 prepare → RemBG → P2 one cutout embedding
→ P3 exact grouped Top5
→ prepare exact winning non-cutout image per candidate
→ P5 rerank → result
```

Semantics:
- 0 candidates → `NOT_FOUND`;
- non-empty → always rerank;
- valid candidate → `MATCHED`;
- ambiguous → `AMBIGUOUS`;
- none → `NOT_FOUND`;
- infra/pipeline failure → `ERROR`;
- final score = selected SKU's winning Qdrant score;
- Gemini-selected `gap=null`;
- failed candidate image is dropped, no PRIMARY substitution and no rank-6 backfill; zero usable candidates after preparation → `ERROR`.

Remove from active V2 behavior: RAW, raw/cutout merge, thresholds, raw fallback, PRIMARY-first evidence, recognition cache get/set, old dual-channel telemetry. Unused legacy helpers may remain if removal creates unrelated churn.

Keep all current URL/SSRF/MIME/size protections. Treat Qdrant/Gemini results as untrusted. Never log vectors or credentials.

**Tests first:** one embedding/grouped search, no RAW/cache, every non-empty reranks, ranks 1–5 may win, selected score + null gap, exact winning image, status/error mapping, unsafe inputs rejected, no legacy fallback.

**Verification:** focused realtime tests + worker typecheck.

## P7 — Runtime/config direct-cutover wiring

**Goal:** bind V2 to existing `mediaRecognition` dependency without changing downstream public response shape.

Exact bootstrap/config files come from P0.

Minimal config:
- V2 recognition collection name;
- embedding model/location if repo config convention requires them;
- `embedding_pipeline_version`;
- reuse existing RemBG/Google/Qdrant credential paths.

No recognition-cache config.

Wire only one active recognizer. Old text-search Qdrant wiring remains unchanged. Merging code must not route customer traffic to a partial V2 index.

**Verification:** bootstrap/config test if repository pattern supports it; missing mandatory config fails clearly; public runtime type remains compatible; worker typecheck/build.

## P8 — PREPROD collection build and direct activation

Operational step; **requires explicit owner authorization** before any live action.

1. Create dedicated 3072D cosine V2 collection.
2. Prove target Qdrant supports grouped query with exact/filter contract.
3. Run V2 publisher over full eligible `APPROVED + ACTIVE` catalog.
4. Verify no pending eligible V2 work and current `source_hash + embedding_pipeline_version` state.
5. Verify inactive/`SIZE_GUIDE` points are not active.
6. Deploy V2 runtime only after complete population.
7. Cut all image-recognition traffic directly to V2.
8. Confirm old image recognizer is no longer called by business logic.

No percentage rollout, shadowing, dual recognition, automatic fallback, or V1 comparison. Normal deployment rollback is still allowed operationally.

Evidence: collection schema/capability, publisher completion summary/counts, deployment identity/config, health/readiness, V2-only smoke path.

## P9 — Verification, review, Definition of Done

Run narrow tests first, then package/root gates appropriate to touched workspaces. Current repository scripts support the equivalent of:

```bash
pnpm --filter <worker-package> test
pnpm --filter <worker-package> typecheck
pnpm --filter <business-tools-package> test
pnpm --filter <business-tools-package> typecheck
pnpm -r test
pnpm -r typecheck
pnpm -r build
```

Use actual workspace package names at build time; run lint/check when required by current package/root governance.

This validates V2 against its own spec; it does not add V1 benchmark/A-B/shadow comparison.

Final review order: correctness → security → architecture → simplicity → performance.

Before completion, prove:
- CUTOUT-only path;
- correct Gemini `:embedContent` 3072D contract;
- shared catalog/customer preprocessing;
- dedicated V2 collection and exact grouped Top5;
- winning point evidence survives to reranker;
- reranker 1–5, any supplied rank can win;
- correct status/score/gap semantics;
- no RAW/cache/threshold/compatibility fallback/A-B/shadow/legacy fallback in active V2;
- Human Gate/HOLD/delete/SIZE_GUIDE correct;
- old `PUBLISHED_HASH` does not govern V2 state;
- security controls preserved;
- minimal telemetry has no secrets/vectors;
- actual tests/typecheck/build have passing evidence;
- no deployment/migration without owner authorization.

## Suggested implementation PR slicing

1. **V2 foundations:** P1 + P2 + P3.
2. **V2 catalog publisher:** P4.
3. **V2 runtime recognition:** P5 + P6 + P7.
4. **PREPROD activation:** P8 only after verified code and owner authorization.

If CI/review cost makes three code PRs impractical, P1–P7 may be one implementation PR, but keep this internal dependency order and avoid unrelated refactors.

## Non-goals

No RAW/fallback, V1 comparison, result caching/catalog generations, compatibility over-fetch/paging, multivectors/detail crops/RRF, HNSW/quantization tuning, new embedding-model research/training, persistent cutout storage, new queue, text-search migration, P2.3B/Human Gate redesign, admin upload/inventory/commerce/messaging changes.
