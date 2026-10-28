# Implementation before provider collection

Intake3035c0e9; refreshed main/implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361. [Reviewed plan](PLAN.md), [scope](SCOPE.md). Model collection NOT_RUN at this savepoint.

## Resulting contract

Numeric SET/REPLACE requires a bounded exact quote containing one supported numeric scalar, uniquely located in one code-supplied current inbound message. Check numeric token boundaries, decimal values and explicit cm/kg/metre/compact-height notation before CAS; bind each measurement to that message's actual ID/time. Reject the entire operation batch before write on invalid grounding. This is numeric-copy validation, not proof of field/referent/negation/correction semantics. CLEAR/preferences retain existing domain behavior. No import of the Vietnamese regex extractor.

Same-source numeric replay is a readback no-op without a new revision/effect. Grounded corrections of customer-message evidence are scoped to this writer under current CAS; shared merge ordering and stronger human evidence remain intact. Ephemeral unresolved fields survive unrelated success/no-op, block dependent effects across batches and are exposed as one optional trusted pending flag to the existing hard precheck at normal FINAL. Existing continuation remains available; no immediate post-tool terminal or extra repair round. Receipt recovery cannot mask pending corrections. Actual earlier commits and carts are preserved.

Same-snapshot diagnostic [SELECTION_PAIR.json](SELECTION_PAIR.json): for both M and L, absent color gives CART_VARIANT_AMBIGUOUS; explicit BE is READY/PRE_ORDER. Rows contain both __NO_COLOR__ with positive stock and BE/stock0. No resolver change or arbitrary SKU selection. Native add now requests an explicit color or null unknown; current selection remains authoritative. Existing variant-change inheritance is reused. Current selected STOCK is colocated with cart components in owner context; no normal-reply assembler, append or disclosure store. Owner prompt only synchronizes quote/atomic-rejection handling; verifier prompt unchanged.

## Observed verification

- Focused initial RED after correcting a missing test import:11FAIL/49PASS. Missing grounding wrote data, later-batch dependent effects ran and receipt recovery masked unfinished state. Minimum GREEN60/60. Migrated existing scripted tests/harness calls to the new source contract rather than weakening the guard.
- Additional scalar token-boundary RED2FAIL/18PASS -> GREEN67/67 focused state/effects. Native color declaration RED1FAIL/28PASS and selected-stock locality RED1FAIL/46PASS -> GREEN. Current combined adapter/protocol38PASS.
- Full worker first attempt:1814PASS, three suites failed to read old fixture URLs. The tracked v4 alias is a directory symlink, but Windows core.symlinks=false checks it out as a text file. Symlink creation unavailable (1314); a temporary junction procedure was rejected by policy and was not executed. Safer correction:three test fixture URLs now point directly to the existing canonical track-c-c2/v2 data, with unchanged assertions/data. No filesystem deletion/move workaround or extra permission flow.
- Final exact worker test command exits0:1839PASS/131files; Node eval492PASS/2existing optionalSKIP/494. Worker typecheck/build/lint exit0. Existing protected-claims/reply-assembler21PASS. Self-review retains code authority/CAS/source priority/privacy/exact final gate, no production entrypoint or shared runtime package changes.

Commands actually run (focused repeats retain their RED/GREEN scope):

~~~text
git fetch origin main
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-effects.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-effects.test.ts --reporter=dot
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-state.test.ts src/single-agent-commerce.test.ts src/single-agent-commerce-ingress.test.ts --reporter=dot
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-effects.test.ts --reporter=dot
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts --reporter=dot
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-grounded-state.test.ts --reporter=dot
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
pnpm --filter @lana/worker test
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-selection-pair-20261017.mjs C:/Users/nguye/AppData/Local/Temp/c3-grounded-state-selection-pair-result-20261017.json
~~~

Provider schema check used official [function calling documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling) and [Schema nullable/string bounds](https://docs.cloud.google.com/java/docs/reference/google-cloud-vertexai/latest/com.google.cloud.vertexai.api.Schema). No generation transport/retry/client framework change.

One optional trusted pending field, one sourceQuote tool argument and existing per-field source evidence; no new durable store, semantic role/layer or independent gate. Full-repo pnpm check/remote CI/human acceptance not claimed. Code tests do not establish naturalness, early preorder disclosure or semantic-state understanding. Checkout region authority and prior NONE violation cause remain unresolved. A OWNER_BYPASS; no publication/live action/Phase C.

## Controlled PostgreSQL readback

At clean c3951fc6610dbb8e047a75e6e83d9a94dc83773a: COD25/25 PASS, sourceDirty=false, providerGenerations=0, testDatabaseDropped=true. Exact raw copy: controls/cod-pass.json. Source readback PASS with zero owner/verifier generations. This scoped control covers the changed state/effect/egress boundary; BANK_TRANSFER was not rerun and older bank evidence is not a new PASS. Models still NOT_RUN at this savepoint.

## Pre-provider byte identity correction

The post-seal readback found CRLF-only disk/Git differences in source-config.b1.json and source-session.py. Config JSON values and source code were identical. Normalize only those two physical files to their existing Git LF bytes, update frozen byte hashes, and supersede the zero-generation b8642f3e preflight before collection. No provider result existed, model/config values and corpora did not change, and runtime TS is unchanged from tested c3951fc6. New preflight/run identity must use the next clean commit.
