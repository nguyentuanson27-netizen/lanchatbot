# Commands thực sự chạy

Chạy từ repo root. Đây là các command chính và kết quả; RED/intermediate failures được giữ trong implementation evidence và raw. Không phải tất cả command dưới đây chạy cùng một source SHA.

## Deterministic và compatibility

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-checkout.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/realtime-sales-cycle.test.ts
# N1/N2 GREEN106; trước đó bare-field/history/pause RED đã observed.

pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-session.test.ts
# N3a GREEN78 sau RED4.

pnpm --filter @lana/contracts exec vitest run src/v2/canonical-evidence-readiness.test.ts
# PASS60; parent media/cart semantics từng RED trước sửa.
pnpm --filter @lana/contracts build
# PASS; gồm typecheck/emission của shared package bị thay đổi.

pnpm --filter @lana/business-tools exec vitest run src/effect-readiness.test.ts src/image-selection.test.ts src/media-selector-v2.test.ts
# PASS71.
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
# PASS21.
pnpm --filter @lana/business-tools exec vitest run src/negotiation-engine-v2.test.ts
# PASS9.

pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-effects.test.ts src/realtime-sales-cycle.test.ts
# PASS152 sau planner-readiness RED và sửa contract.

pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts src/realtime-sales-cycle.test.ts src/meta-outbox-dispatcher.test.ts src/media-recognition-v2-image-pipeline.test.ts
# Final PASS451 /19files /0skip, có actual installed-ffmpeg test.

node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.test.mjs
# PASS77.

pnpm --filter @lana/worker typecheck
# PASS, bao gồm dependency prebuilds.
pnpm --filter @lana/worker build
# PASS, bao gồm dependency prebuilds; final media flag/source cũng compile trực tiếp sau sửa.
pnpm --filter @lana/worker exec tsc -p tsconfig.json
# Final PASS sau Buffer/MIME và actual ffmpeg correction.
pnpm --filter @lana/worker lint
# Final PASS.
git diff --check
# PASS.
```

Invocation `vitest run single-agent-commerce ...` không có prefix `src/` đã chọn nhầm9Node `.mjs` suites: FAIL `No test suite found`;420TS tests trong lần đó PASS nhưng **command không PASS**. Đã sửa invocation như trên, không đổi tests để che lỗi. Typecheck cũng từng phát hiện optional recovery assertion và Buffer/MIME typing; đã sửa rồi chạy lại.

## PostgreSQL/capture —0provider generations

```powershell
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-connections-cod-20261022 COD --composed-only
# FAIL: assertion gồm authorized private preview trong raw history, thay vì public projection.
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-connections-cod2-20261022 COD --composed-only
# FAIL: transaction EFFECT_READINESS_REQUIRED cho native negotiation.
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-connections-cod3-20261022 COD --composed-only
# PASS18/18.
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-connections-bank-20261022 BANK_TRANSFER
# PASS32/32, gồm BANK confirmation/QR intents và composed flows.
```

Tất cả database test có prefix do existing harness tạo, được kiểm current_database và drop đúng DB riêng; live PostgreSQL nguồn bị enforce read-only. Meta transport chỉ capture.

## Provider sources đã seal

Reused existing credential launcher, không viết service-account secret vào repo. Mỗi lệnh run có một lần preflight trước đó với cùng selection, models và source; không retry generation.

```powershell
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-connections-openings-20261022 COD --provider-preflight --journey-openings
# PREFLIGHT_PASS,0generation; source bce8538b.
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-connections-openings-20261022 COD --provider-run --journey-openings
# Collected4/4outcomes,12generation requests; not quality PASS.

python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-connections-negotiation-20261022 COD --provider-preflight --negotiation-probe
# PREFLIGHT_PASS,0generation; source67c78b2a.
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-connections-negotiation-20261022 COD --provider-run --negotiation-probe
# Collected3/3outcomes,8generation requests; one reply still needs sales-quality editing.

python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/catalog-image-sanity.mjs ../c3-b-connections-image-sanity-20261022 --preflight
# First FAIL0generation: existing ffmpeg flag incompatibility. After observed RED→GREEN, PREFLIGHT_PASS at22b6bea8.
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/catalog-image-sanity.mjs ../c3-b-connections-image-sanity-20261022 --run
# API_COMPATIBILITY_PASS; exactly1owner request,2actual public catalog images, no send eligibility.
```

Ngoài ra chạy2read-only task-local source audits qua `source-session.py node ../c3-b-connections-source-audit.mjs` và `... node ../c3-b-connections-image-bytes-audit.mjs`; đọc registry metadata/public bytes,0generation. Actual ffmpeg failure được debug bằng `... node ../c3-b-connections-image-prepare-debug.mjs`; source URLs/bytes không đưa vào log, chỉ dimensions/size/error. Kết quả được tổng hợp trong checkpoint; task-local scripts không là runtime framework mới.

Current-hash/readback/secret-pattern và captured-field checks chạy bằng Python trên raw files, kết quả ở METRICS.json. Không chạy full24B1/8stateful provider hoặc12journeys rồi tự nhận PASS.
