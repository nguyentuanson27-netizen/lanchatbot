# Implementation and verification ledger

Intake7f20f3f2; independently revised scope0ddfef5b. Only the B evaluation adapter/protocol/registration changed. No worker runtime TS, shared package, entrypoint, source, corpus, prompt or semantic role changed.

## Exact delta and self-review

- Export one B owner wire limit65536 in gemini-inference.mjs; manifest records owner65536/verifier32768; validateProtocol checks it before generation. Existing stateful/config preflight and registration expose the same bounds; frozen-run audit uses each role's registered bound. Verifier and legacy comparison32KB contracts stay unchanged. History/latest/product/output/token/tool/generation bounds unchanged.
- Only read_product with existing non-OK price/stock availability retains local content/attributes/presentation/sizeCharts that would otherwise be deduplicated against trusted.products. Complete reads and search retain existing dedup. Search's map callback explicitly wraps product so the array index cannot be interpreted as the new keepLocalEvidence argument. Older/different results, current native price/stock, call IDs/model parts/signatures and original input remain intact.
- Both prompts unchanged from intake: owner ee4377287c3c07ba232574e4542a4a5f1988e8ee8277506fb4d26f17bd8cd3a6; verifier b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24. Tool declaration hashes/models/config/corpus unchanged. No normal-reply/ACK composer, state, parser, semantic router, retry or new gate.
- Two changes share the existing transport boundary.64KB is a bounded wire allowance, not a guarantee about future opaque signatures. Locality is a tested projection behavior and an unproven model-quality hypothesis. Recovery disclosure/voice/policy ambiguity, source attrs/mapping and provider NONE/UNKNOWN remain risks.

## Commands actually run before code changes

- git status --short --branch; git fetch origin main; git rev-parse origin/main: exit0, main296cdcfbf5759f5bf9cbb24acf3dc63005589361.
- Initial node --test adapter/protocol invocation encountered one test syntax error (missing brace) plus missing requestBounds; not counted as behavior RED. Corrected only the test syntax before repeating.
- node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs: **observed behavior RED**, exit1,38PASS/4FAIL. Failures: old32KB rejects65536 body; duplicate independent partial evidence removed; long native HTTP continuation rejected; frozen per-role bounds absent.

## Commands after minimum code change

- Same focused node command: exit0,42PASS/0FAIL. Exact65536/65537 checked before auth/dispatch; partial duplicate evidence and long opaque-signature HTTP capture; existing scope/changed-value/native identity/privacy/firewall/NONE/no-retry controls.
- git diff --check: exit0. git diff --exit-code HEAD -- prompts, both corpora, source config, apps/worker/src and packages: exit0; no differences in those boundaries.
- pnpm --filter @lana/worker test: exit0; benchmark validators pass; Vitest1843PASS/131files, Node eval496PASS/2existing optionalSKIP/0FAIL. This includes existing protected boundaries, B state/effects/handoff, A/B adapters/protocols and legacy comparison checks.
- pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/product-presentation.test.ts src/product-facts-v2.test.ts src/size-engine.test.ts: exit0,52PASS/5files.
- pnpm --filter @lana/worker typecheck; pnpm --filter @lana/worker build; pnpm --filter @lana/worker lint: each actually run, each exit0. Lint is the repository tsc --noEmit script. No shared package edited; normal worker prehooks build its unchanged dependencies.
- Isolated COD/current-source checks: pending at code save; results will be appended before run-source seal. No remote CI or full repository pnpm check claimed.

## Source/control checks and pre-provider freeze

- python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-bounded-source-cod-20261018 COD: exit0,25/25PASS,0provider generations, code source3514691de093be5595881d1e250dff9e1248cab3/sourceDirty=false, disposable database dropped. Uses existing deterministic owners; not provider-quality or employee/live-send evidence. No new bank control run.
- Through the same read-only source-session route, existing c3-fact-locality-selection-20261017.mjs writes c3-bounded-source-selection-20261018.json: exit0; both current AO/BE Mx1 and Lx2 READY,0source writes/0provider generations.
- Existing c3-current-shipping-source-20261017.mjs through source-session writes c3-bounded-source-shipping-20261018.json: exit0; four public region-duration rows, still no approved address alias/default. No writes.
- python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-bounded-source-source-20261018: exit0/SOURCE_ADAPTERS_READ_BACK, source3514691d,0provider generations; available approved public sources only.
- node C:/Users/nguye/AppData/Local/Temp/c3-bounded-source-freeze-20261018.mjs with C3_B_VERIFICATION_SOURCE_SHA=3514691de093be5595881d1e250dff9e1248cab3: exit0/FROZEN_BEFORE_PROVIDER_RESULTS.13input/executable files,5runtime files,6reference blobs; models/prompts/native declarations/corpora/terminal map/fallback/launcher unchanged from baseline, owner65536/verifier32768 explicitly frozen. Readbacks/control reports copied exactly. No self-referential run SHA written into source.

No provider generation has run for this new candidate at this pre-provider ledger save. Unit GREEN does not prove natural language, policy interpretation, universal headroom, disclosure or live readiness.

## Completed collection, primary review and diagnosis

The preceding pending/no-provider statements describe their code-save/freeze time; collection is now complete.

- Commit487816d8c3f27299b62daaccca8bd861d81abee1 sealed the clean source/frozen inputs. Runtime HEAD was captured by the existing runners, not written back into source.
- Existing credential launcher + node run.mjs --config source-config.b1.json --cases context-fix-20261016/cases.priority.json --preflight: exit0/CONFIG_READY_CONNECTIONS_UNVERIFIED,0generations, owner65536/verifier32768 metadata. Existing launcher + node isolated-integration.mjs --provider-preflight: exit0/PREFLIGHT_PASS, source487816d8,0generations, same bounds/models/hashes. Exact output names are c3-bounded-source-config-preflight-20261018.json and c3-bounded-source-stateful-preflight-20261018.json under the existing Windows Temp directory.
- python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-bounded-source-stateful-20261018 COD --provider-run: exit0,7/7outcomes, COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW, sourceDirty=false, disposable DB dropped. Actual journey continued after failures without reseed.
- Then the same launcher + node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-bounded-source-b1-20261018 --run: exit0,24/24/AWAITING_WHOLE_REPLY_REVIEW. No attempt repeated, hidden retry or source patch.
- First offline preserve helper invocation stopped on ENOENT because its TEMP b1 date still said20261017. It failed while reading input, before copying new raw or invoking any provider. Corrected only the external reporting helper to20261018; no outcome/executable source changed. Repeated node c3-bounded-source-preserve-20261018.mjs with C3_B_RUN_SOURCE_SHA=487816d8...: exit0,37raw files/43hashes/31outcomes. Raw savepoint17a74bf94ad0dd4d9a0f379e855c08b187be0079.
- node c3-bounded-source-primary-packet-20261018.mjs; node c3-bounded-source-write-judgments-20261018.mjs; node c3-bounded-source-primary-review-20261018.mjs with the run/raw identities: each exit0,31reviewed using actual terminal/public state/context, not rejected drafts/verdict details.21USABLE/7NEEDS_EDIT/3unfinished. Primary savepoint50d8f8a43f10abe1586a1fa581af231148ee71c8. Markdown strips trailing whitespace for display; JSON/raw retain exact text. No runtime rewriting.
- node c3-bounded-source-audit-20261018.mjs with C3_B_RUN_SOURCE_SHA/C3_B_RAW_SAVEPOINT/C3_B_PRIMARY_SAVEPOINT: exit0/ACCOUNTING_BINDINGS_AND_PROJECTION_VERIFIED.88invocations/88HTTP200,60owner/28verifier,27PASS/1FAIL,0retry/error/timeout,28bindings/27exact eligible drafts/4exactcaptures/43raw hashes/0observed evaluator-private leaks; all frozen files match. The script hash is retained in AUDIT.json.
- node c3-bounded-source-diagnosis-20261018.mjs: exit0,35native model-part preservation occurrences/3partial-locality occurrences, precise CART_ETA_REGION_UNRESOLVED,5whole-outcome label changes retained. New max body29840 is below even the old32768bound; no new-cap provider activation or causal improvement claim.

All offline c3-bounded-source-*.mjs reporting helpers remain in C:/Users/nguye/AppData/Local/Temp; they do not execute provider generations. Primary judgments are subjective/not independent/human acceptance null. No new remote CI/full repository pnpm check, bank control, A2/A3, live send, publication, merge/deploy or Phase C run.

## Final local artifact checks

- git diff --check: exit0. git diff --name-only487816d8 -- all active runtime/input paths: no changes after seal. Only evidence/report/task documents were written.
- JSON denominator/readback check:31primary rows/summed outcomes,88generation invocations,28bindings; credential-launcher hash still matches freeze. Local Markdown link check:15links exist.
- Initial rg secret-pattern command treated a leading hyphen as an option; corrected the command using --. Final names-only scan reports NO_SECRET_PATTERN_HITS/exit0. No secret values printed.
- Existing draft PR391/head/branch/base readback at intake matched7f20f3f2 with no reported CI statuses. Final branch push/body-file/readback are delivery operations recorded in the session; no merge/deploy authority or CI PASS inferred. No additional provider generation or runtime patch after collection.
