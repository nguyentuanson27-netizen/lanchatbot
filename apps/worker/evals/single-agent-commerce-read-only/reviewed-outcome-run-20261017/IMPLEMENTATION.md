# Reviewed fix before provider collection

Intake33a64ab9, scope351f8986; refreshed implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361. Independent plan verdict REVISE_PLAN was applied by narrowing the change, not by adding gates. Provider results are NOT_RUN at this savepoint.

## Changes and self-review

Extract the existing current cartItems projection into a local helper and reuse it in snapshot plus successful/duplicate tool results. Only selections matching current committed lines contribute stock. Duplicate receipt validation remains required and current selection is refreshed without another commit. A post-commit unavailable stock source removes stock fields but preserves the proved mutation/receipt; before-commit selection failure still cannot acknowledge success. Removed/changed lines do not leave ghost stock.

The owner-native adapter clones its input and omits the redundant full cart only when the same effect result supplies cartItems; native IDs/model parts/signatures and earlier result values remain intact. Existing legacy results without the summary remain visible. No native schema field or generation API/client change; only add-tool description names the result the model actually receives. The existing raw8192/tool and32768/wire bounds remain unchanged. One two-action test checks real raw results; another checks native serialized body and retained per-action values. Long provider signature variance is still a limit.

Owner prompt changes only the advice tradeoff and price comparison paragraphs: a suggested alternative must address the current concern and consider inconvenience; compare the stated contents of each option before claiming lower spending. A larger purchase may be useful/within budget without costing less. No case examples, source facts or new voice bans. Owner12414bytes versus12060before (+354bytes/2.94%); verifier, size, policy, numeric grounding and privacy constraints unchanged.

Existing handoff remains terminal. An additional composed control reads verified product attributes with a null POS snapshot, then uses a synthetic explicitly configured DEPENDENCY_FAILURE rule. It verifies the owner receives the partial read, ownership commits and only the configured holding text is terminal. It does not claim a partial sales answer was sent, a real employee served, or B1 acquired handoff capability. Existing real-PG isolated configured-holding controls will be executed separately before collection.

Runtime TS net+3lines, native adapter net+1line; no new semantic role/layer, router/parser, store, gate, response composer, retry or continuation. No production entrypoint/shared package/source changes. Cart summary is a presentation trial; successful unit checks do not prove early preorder disclosure, naturalness or sales acceptance.

## Source diagnosis and deferred work

Read-only code/captured-evidence trace: p23c-profiles.ts constructs attributes only from approved registry fields; p23c-jobs.ts publishes product_attributes; read-only-tools verifies and preserves them; Gemini projection already includes non-null attributes. Historical11points had null attributes, and the old offline proposal was never published and incorrectly assigned REN to AO. There is no demonstrated current transfer drop to repair. Do not publish that proposal or infer component material/opacity/lining. Fresh source-check evidence will be retained separately; source completion/publication is not part of this implementation.

shipping_eta ingestion and durations exist. Existing resolver accepts a source region contained in the address or explicit source-wide fallback. Captured source has four duration keys without city aliases/default. No approved address-to-region mapping was found; no geography guess, policy change or altered checkout fixture. Keep source-backed checkout BLOCKED. Broad AMBIGUOUS filtering is deferred: descriptions also enter trusted.products and removing all candidate refs could erase a prior verified product; no new provenance tracker/transcript parser was added.

## Actual verification so far

- Observed effect RED:3FAIL/47PASS because successful/removed/post-commit-unavailable results lacked cartItems. Native RED:1FAIL/29PASS because duplicate full carts remained in the body.
- First minimum effect/state/grounding/handoff run96PASS. Native30PASS; combined protocol temporarily failed3PROMPT_HASH checks until synchronizing the new owner prompt hash in manifest. Final native/protocol/comparison51PASS.
- Extra raw two-action assertions initially used lowercase navy while domain mutation canonicalizes NAVY; corrected the fixture expectation and made its selection quantity follow the actual query. Initial direct tsc caught eight test-only unknown-data property accesses; fixed a narrow test helper, no runtime contract relaxation. Final focused effect/handoff/ingress/boundary127PASS, including the additional partial-read handoff control. Direct worker tsc exit0.
- Full canonical worker test before that extra handoff-only control:1842PASS/131files, Node493PASS+2existing optionalSKIP/495, exit0. New control subsequently passed in focused127. Final current-source full Vitest src1843PASS/131files, worker typecheck/build/lint exit0; protected claims/reply assembly21PASS. Node generation/protocol source only received a whitespace adjustment after its full run; no executable behavior change. No remote CI/full-repo pnpm check claim.

Commands actually run up to this savepoint (RED/GREEN invocations retained, not all are PASS):

~~~text
git fetch origin main
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts --reporter=dot
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-handoff.test.ts --reporter=dot
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-semantic-verifier-boundary.test.ts --reporter=dot
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker test
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts --reporter=dot
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker exec vitest run src
pnpm --filter @lana/worker lint
git diff --check
~~~

Model behavior, source-backed checkout and human acceptance remain unproven. Freeze one candidate before the separately authorized31-outcome run; no post-result patch or automatic second run, source publication/live action/Phase C.
