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

No provider generation has run for this new candidate at this ledger save. Unit GREEN does not prove natural language, policy interpretation, universal headroom, disclosure or live readiness.
