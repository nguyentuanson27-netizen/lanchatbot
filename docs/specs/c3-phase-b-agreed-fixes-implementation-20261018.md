# Phase B — implementation of the revised post-rollback plan

Owner requested implementation after the independent review and plan revision at `7806c5777cd6b7927f3a545c9d94914a56b96b45`. Runtime rollback baseline: `82833c0a39cb14720926ce04e91a1d3cdab5587a`; implementationBaseSha/main remains `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. [Current plan](../../tasks/plan.md#current-agreed-direction-after-rollback--2026-10-18). A remains OWNER_BYPASS, B sales/live STOP. This task makes code changes and runs deterministic checks; provider generation count is **0**.

## Changes and their limits

1. **Actual checkout invitation — `1bb66325`.** When the customer explicitly requests checkout, the existing `confirm_purchase` tool may start code-owned intake before a preview exists. The existing deterministic confirmation classifier must agree; negatives, questions and hesitation do not start intake. Reuse `CLARIFICATION_REQUESTED`, the existing missing-field messages and the persisted session/outbox transaction. No automatic invitation on every add/change. The command cannot confirm an unseen preview or create a POS order. The existing terminal boundary stops the conversational owner after code commits its invitation; the public tool result contains no private fields or purchase receipt. `NO_SEND` here means no additional model message; the actual code invitation is separately captured in the outbox. Replay does not send twice. Private follow-up continues through the existing code parser and preview checks.
2. **Owner context — `e8c9aae4`.** Remove `checkoutStatus.missingFields` only from the owner request projection, retaining `previewAvailable` and `purchaseConfirmed` without mutating the source object. Domain intake, persistence and verifier context stay intact. This removes an unnecessary collection checklist from the model input; it does not prove that the owner will stop asking for private details. That behavior needs a separate provider comparison.
3. **Preview only — `bd086b78`.** Render committed article role, color and size per component, with product code and quantity. Sets retain different component choices. Missing values are not borrowed from another line. Only the preview caller enables the formatter; earlier cart/negotiation summaries and recovery/confirmation wording are unchanged. No name lookup, new persistent display field or inferred color translation.
4. **Search instruction — `a43c1944`.** Replace one bullet: exact named-product lookup keeps the supplied code/full name; discovery uses the customer's stated kind of clothing, occasion or need. Ambiguous results remain suggestions, not a resolved exact product. Tool and source ports already support this query contract; no retrieval implementation change. Owner prompt hash is `21721d55b68f4ec23b378c59e367dd5a08053b5932a8966e08a4810423865b6d`. Other owner paragraphs, verifier, model configuration, budgets and corpora are unchanged. This is an instruction correction, not evidence that live queries or advice improved.

## Color trace: unresolved, no speculative patch

Read the captured `stateful-open` requests/results from all three repetitions of [the post-review run](../../apps/worker/evals/single-agent-commerce-read-only/post-review-run-20261018/). In `candidate/repN/stateful/raw/provider-requests.jsonl`:

| Repetition | Read before add | Add | Result |
| --- | --- | --- | --- |
| 1, request `19327431-2fa9-4c89-8f7a-b38e3476c84e` | `SV2447`, size M, color be | AO, M, be, quantity 1 | Committed |
| 2, request `0a5573b5-73b3-4dd0-8d76-d1e63999fec0` | `SV2447`, size M, color be | AO, M, be, quantity 1 | Committed |
| 3, request `cd72cfb5-1694-42dc-8a91-538722abb1e4` | `SV2447` without size/color | AO, M, null, quantity 1 | Rejected; late repair under NONE also fails |

The customer selection remains in the request. All use the same required-color schema and AUTO mode before add. The read differs materially: the filtered read reports PRE_ORDER for AO/CV and an unavailable set selection; the broad read reports aggregate IN_STOCK counts for AO/CV/SET_VAY. It also presents a different response shape. This is a candidate cause, not proof: model trajectories and request identities differ, and three observations are insufficient to attribute causality. The following turn in rep3 inherits the missing cart; it is not a clean independent color failure.

Next diagnostic, **not run**: replay a captured pre-add prefix in two registered arms, varying only the immediately preceding read scope (broad versus the customer's already stated size/color), with the corresponding response produced by existing tools from the same saved source snapshot. Keep model/config, user text, state, offer schema, prompt and budget fixed; pair the tool call with its truthful response, never paste an expected selection into trusted state. Three continuations per arm; retain all six outcomes. If exact source reconstruction is unavailable, stop that comparison rather than substitute a current snapshot. A selected read still losing/changing the color, or broad reads consistently preserving it, weakens the hypothesis; do not declare reliability from a small sample. Follow any proposed fix with full stateful controls for chosen color, size/quantity changes, unknown color and products that do not require color, including downstream cart/receipt verification. Do not force a default, disallow null globally, add regex or increase the tool budget.

## Source, capability and transport audit

- Stage rep1/rep3 searched only `set váy`. Both received AMBIGUOUS suggestions SV165/SV166/SV1561. The actual owner request includes their descriptions in `trusted.products`; they were deduplicated out of the function response, not lost. The descriptions support material/style advice, but do not establish shirt opacity under stage lighting. SV165 mentions a two-layer **skirt**, which cannot prove shirt coverage. No projection/retrieval fix or fabricated shop fact is justified by these traces. A better query may find a more suitable product, but is not itself coverage evidence.
- The final stage requests expose `availableTools: []`, `roundsRemaining: 0`. The B1 runner composes read-only tools, not a follow-up scheduler or a handoff executor. Partial-source attempts already contain the public source-unavailable reason, and the prompt already forbids promising a later check without follow-up capability. Historical 9/9 usable versus 7/9 usable after the rolled-back voice treatment does not establish one cause; adding the same rule again is not a fix. Keep the rollback voice, audit actual next-step usefulness in the next isolated model run, and report absent source/capability honestly.
- `stateful-correction` rep3 verifier request `a2d7a1ed-cca4-4079-9e11-80569489867d:verifier:1` records `UPSTREAM_TRANSPORT`, generation-transport stage, 17,357.591 ms, no HTTP status/provider error code/usage. That is not a semantic rejection or proven quota failure. The retained log does not identify a more specific network cause. Keep it in the historical denominator; no retry or verifier-prompt change is warranted by this record.

## Verification and self-review

Observed RED before each behavior fix:

- Native pre-preview confirm returned `SALES_STAGE_NOT_READY_FOR_CART`; test required a code invitation without confirmation.
- Owner wire projection still exposed `missingFields`.
- Preview tests failed on the missing formatter and actual preview text lacking per-component choices (5 failures, 68 passes before the formatter fix).

Focused GREEN commands actually run:

```powershell
pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-persistence.test.ts --maxWorkers=2 --minWorkers=1
# 166 PASS before the three preview formatter cases were added.
pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-effects.test.ts src/realtime-reply-differential.test.ts --maxWorkers=2 --minWorkers=1
# 154 PASS, including preview and unchanged legacy differential.
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-sources.test.ts --maxWorkers=2 --minWorkers=1
# 39 PASS; source/tool behavior only, not generated search-query quality.
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
# 66 PASS after the search/manifest change.
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
# Both exit 0; build includes workspace dependency builds, lint is TypeScript noEmit.
```

Final commands actually run after the changes:

```powershell
pnpm --filter @lana/worker exec vitest run src --maxWorkers=2 --minWorkers=1
# 1878 PASS / 131 files.
pnpm --filter @lana/worker test:evals
# 509 PASS, 2 optional SKIP, 0 FAIL (511 registered tests).
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
# 21 PASS / 2 files.
git diff --check
# PASS.
```

Local logs: `%TEMP%/c3-agreed-fixes-{worker,node,build,lint,protected}.log`; focused logs `c3-projection-tests.log`, `c3-preview-{red,green}.log`, `c3-search-{tools,protocol}.log`. No shared package source was modified. The session test uses real planner/domain logic with an in-memory transaction/readback and captured outbox intent. It proves invitation timing, replay behavior and partial private follow-up; it is not a live PostgreSQL/Meta test. Existing provider journeys still inject private details and do not newly prove that the model chooses `confirm_purchase` at the right time. No new independent reviewer verdict, remote CI, live delivery or model-quality PASS is claimed.

Self-review preserves permission/recipient/privacy/CAS and current-source transaction checks; no model text is used for private intake. Checkout invitation is distinct from purchase confirmation. Preview values come only from the committed cart, and the legacy differential remains unchanged. No historical raw/results/rubrics were edited. Complexity delta: one formatter in an existing module, one in-process command result for checkout invitation, reuse of the existing terminal continuation and clarification event; no new durable state, tool, model role, parser, retry/repair loop, framework or operational gate.

Future provider work must isolate checkout context from search instructions and color diagnosis. The commits are separate so each treatment can be measured against its matching baseline; do not run the combined head and attribute any improvement to one edit. Register cases, source and complete denominator before dispatch. Remaining color causality, missing coverage evidence, partial-source next steps and owner compliance are explicitly unresolved. Stop at code delivery until a model run is requested.
