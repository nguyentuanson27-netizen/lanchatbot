# Phase B — execution instructions and retained purchase choices

Owner requests implementation after reviewing recurring tool/color/NONE failures. Intake `571c4403bc00198daaedc150c244659f55da750c`; refreshed implementationBaseSha/main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Existing branch and draft PR391. This is an implementation-only candidate, not a new model run or completion of sales acceptance. A remains OWNER_BYPASS; B sales/live STOP.

## Evidence and scope

The [last run](../../apps/worker/evals/single-agent-commerce-read-only/offer-projection-run-20261018/CHECKPOINT_B.md) retained the original color in provider history and sent final-only NONE with no declarations, yet received tool calls. The older native-contract/runtime-boundary runs have the same sequence. Missing catalog data or verifier rejection does not explain these stateful failures. The provider's internal cause remains unknown; moving execution instructions does not prove that it will obey them.

Implement one bounded candidate:

1. Move the existing execution mode/capabilities/budget from the user data projection into a separate system text part. No customer/product/policy/history data becomes instructions. Project only known fields and bounded numeric budgets. Native function calls, results, IDs and signatures remain in their original history. Native AUTO/NONE configuration remains unchanged.
2. Replace scattered purchase guidance with an explicit distinction between customer choices in dialogue and committed cart state. A failed cart write does not erase a customer's color/size choice. Receiving measurements alongside a purchase does not automatically request a new fit recommendation. Code still validates every argument; it does not infer color from prose or default to the only stocked color.
3. At the existing runtime tool-permission check, record a tool response in final-only mode as `OWNER_TOOL_MODE` / generation `PROVIDER_ERROR` (completion contract failure), rather than `BUDGET` with generation `OK`. Preserve parsed output, telemetry, denominator and existing receipt recovery. Do not execute or retry the disallowed call. Future reports must distinguish this completion failure from transport/quota failures; historical metrics are immutable.
4. Keep the existing Sol comparison consumer compatible with all system parts, instead of silently retaining only the first part.

No new tool, role, semantic router, parser, persisted selection, repair loop, generation retry, business gate or budget increase. No changes to protected facts, verifier, policy, source resolver, effect executor or delivery authorization. Two ambiguous stage-light verdicts and sales voice remain open; no result relabeling or claim that this candidate fixes them.

## Implementation and self-review

Files: native adapter/tests, comparison consumer/tests, owner prompt/active hash, runtime/tests and the existing receipt recovery test. Executable delta before documentation: 18 added / 7 removed lines across three code files. Owner prompt 12,478 → 13,496 UTF-8 bytes (+1,018, 8.2%); the added distinction is failed write versus retained customer choice, without case IDs, product names, prices or answer examples. This is a hypothesis about model behavior, not a deterministic guarantee of comprehension.

Self-review found the comparison consumer dropping the new second system part. Updated its contract tests, observed 10 PASS / 2 FAIL, then joined all system text parts. The existing committed-total recovery test initially failed only on the changed reason; updated that expectation and added generation-status verification while retaining exact total, one commit, no late quote execution and no retry assertions. No authority assertions were removed.

Official API reference checked: [Vertex generateContent systemInstruction](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference) accepts text parts; [function calling](https://ai.google.dev/gemini-api/docs/function-calling) documents NONE as prohibiting calls. These contracts support the request shape and failure classification, not the claim that a new prompt cures provider behavior. The adapter sends its serialized body directly to the existing Vertex endpoint; no new SDK/route is introduced.

## Observed verification

- Adapter RED: 38 PASS / 2 FAIL before projection change.
- Runtime RED: 20 PASS / 2 FAIL before conformance classification change.
- Budget counterexample RED: 0 PASS / 1 FAIL; malformed instruction-bearing budget reached dispatch before validation. Bounded numeric projection then passes without auth/generation dispatch.
- Comparison consumer RED: 10 PASS / 2 FAIL before preserving all system parts.
- Focused adapter/protocol/comparison GREEN: 63 PASS.
- Focused runtime/effects/state/ingress/verifier-boundary GREEN: 160 PASS.
- Protected claims/reply assembly: 21 PASS.
- Worker build: exit0. Canonical worker test: exit1, 1,855 PASS / 2 timeouts at the unchanged 5-second limit in `gate-e-registration.test.ts` and `track-b-commerce-authority-preprod-cli.test.ts`. No assertion failure in the changed boundary. Retained the failed run. Full Vitest rerun with max2/min1 workers: 1,857 PASS / 131 files, without raising timeouts or editing those tests. Node eval suite: 506 PASS / 2 optional SKIP (508 registered). Worker typecheck and lint both exit0. The canonical worker test command remains recorded as failed; the complete Vitest population and Node eval suite passed in the separately recorded commands.
- Provider generations: **0**. No source/database mutation, live send, model substitution or new A/B qualification result.

Commands actually invoked (RED failures above are retained, not reported as PASS):

```powershell
git fetch origin main
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts
node --test --test-name-pattern='execution budget accepts' apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker build
pnpm --filter @lana/worker test
pnpm --filter @lana/worker exec vitest run src --maxWorkers=2 --minWorkers=1
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
git diff --check
```

Logs are retained locally in `%TEMP%/c3-execution-mode-*.log` and `%TEMP%/c3-execution-budget-red.log`. Build/test/typecheck/lint were executed sequentially. Final local diff/hash/history checks passed; remote CI status is separate and no CI PASS is claimed.

## Next behavioral measurement

Use existing captured failure states to evaluate explicit purchase, retained color after a failed write, current quote and final-only completion before another full journey replay. Keep the same models, bounded requests, all failed attempts and existing review criteria. Both prompt and instruction placement changed here, so a future aggregate improvement cannot identify which change caused it. A controlled diagnostic should isolate those changes if causal attribution is needed. No new run registration, provider dispatch, automatic remaining16 or retry is performed in this implementation request.
