# Context presentation — preparation, 2026-10-09

Owner authorization: “thực hiện cách trình bày context trước đi”. Implement only the readable conversation-context treatment and local verification. No new provider round is registered by this preparation. The completed rounds27–29 batch remains STOP, and round29 A3 remains NOT RUN.

Current main was refreshed before work: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; implementationBaseSha remains that exact SHA. Preparation starting HEAD: `a83c85a68c0c2310c6bb62f9e67b65bff5c6634d`, on the existing isolated implementation branch/draft PR390.

## One variable

Use round28, the latest completed A3, as the control. Keep its conversation/verifier prompts, models, generation configuration, all120A2/42A3 inputs, history, scoring bars, bounds, fallback and deterministic boundary unchanged. Round29's owner prompt has no A3 evidence and is not mixed into this treatment.

The sole change is the presentation of the existing allowlisted conversation projection in the provider request. It must not choose a product, interpret the customer's language, write a consultation plan, generate selling points or add product facts. The owner continues to make the sales decision and produce only the exact final reply.

## Readable facts layout

The opt-in request setting is `conversationContextFormat: READABLE_FACTS_V1`; the existing default remains the exact historical JSON serialization. The readable serializer receives only `projectRuntime` output, never the original fixture/evaluator.

1. TRUSTED product profiles: show silhouette, material, colors, size chart/input status, care and limitations as separately labelled data. Keep the profile's complete source metadata attached after those fields.
2. TRUSTED protected facts: show type, exact scope and value before the complete claim identity/authorization/provenance. Keep every claim, including unrelated claims; no semantic selector or router.
3. TRUSTED bound subjects, policy literals, allowlisted state and effect receipts remain complete. All policy conditions, size bindings and measured-data limitations stay verbatim.
4. REQUEST_IDENTITY retains requestId, trustedSnapshotId, evaluationAt and all other existing bindings. Snapshot/hash construction still uses the original canonical projection, not rendered prose.
5. UNTRUSTED retrieved text, accepted dialogue and latest customer message remain verbatim data, with the latest message last. JSON-encode every data value so customer/profile/policy text cannot manufacture a new section by inserting a newline.

The verifier request remains the exact original JSON request, even when the conversation presentation is opted in. The deterministic final gate still binds the exact draft and original trusted world. No rewrite, repair/reverify, new model role, state/effect, production wiring or post-A work.

The A3 readback currently parses the conversation input as JSON to find requestId. For the readable treatment only, reuse that existing code-generated requestId in `conversationRequestId` telemetry and reconstruct/compare the entire expected request using the existing builder. Do not parse the rendered language or introduce another identity. Default historical attempts keep their existing shape and readback. This compatibility change is required for the serialization treatment, not another model/prompt variable.

This format intentionally retains source metadata rather than dropping it for a smaller request. The hypothesis is improved visibility/order of business values and the current conversation, not lower token usage. Measure actual request bytes; oversized requests must reject rather than truncate data.

## Local evidence required

- Observe a RED showing that the current request ignores the readable presentation, then implement the minimum GREEN.
- Reconstruct the canonical projection from the readable records in tests and compare every field/value with the original, across all42 round28 A3 cases.
- Capture local provider-adapter inputs to prove evaluator/private labels stay excluded and both roles retain their respective request identity/bounds; no live provider call.
- Check instruction-like data/newlines, complete conditions/bindings/receipts, missing and recommended size inputs, original input immutability and actual encoded request bounds.
- Verify default requests and all round28 verifier requests remain byte-equivalent to their captured historical envelopes.
- Existing frozen protocol validation must reject applying the unregistered treatment to a historical run. A later provider run requires its own manifest/serialization identity and clean source seal under the existing plan.
- Run the existing focused protocol/boundary/protected-claims/reply-assembly/provider tests and worker typecheck/build/lint. Do not claim model-quality improvement from local tests.

Prepare a before/after request preview and byte measurements from the existing synthetic corpus. Preview generation is deterministic and makes zero provider requests. No fourth run of the completed bounded batch, no A3 score, no new CHECKPOINT_A qualification and no live customer send.

## Delivery

Incremental commits on the existing implementation branch and update draft PR390. Preserve every historical frozen input/raw request/outcome/score. Local evidence and limitations will be appended after the commands actually run.

## Observed local verification

Commands below ran on this preparation; all use round28 as control. No live provider generation occurred. `C3_TEST_CODEX_TRANSPORT=1` enables the existing local transport stub, not upstream inference.

| Command actually run | Observed result |
| --- | --- |
| `git fetch origin main` / `git rev-parse origin/main` | Exit0; main `296cdcfbf5759f5bf9cbb24acf3dc63005589361` |
| `C3_CHECKPOINT_A_ROUND=28 node --test apps/worker/evals/single-agent-semantic-verifier/conversation-context.test.mjs` before serializer implementation | RED: exit1, 1/7 PASS, 6 failures; readable presentation ignored, bounds/registration/unknown-format expectations failed |
| Same context command after minimum serializer | GREEN: exit0, 7/7 PASS |
| Same command after adding A3 compatibility/adapter tests, before readback fix | RED: exit1, 8/9 PASS; missing existing requestId telemetry |
| Same command after compatibility fix | GREEN: exit0, 9/9 PASS |
| `C3_CHECKPOINT_A_ROUND=28 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/conversation-context.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs` | Exit0, 38/38 PASS, no skips |
| `C3_CHECKPOINT_A_ROUND=28 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` | Exit0, 164/164 PASS, no skips; includes the focused38, not another independent164 |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` | Exit0, 77/77 PASS |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts` | Exit0, 41/41 PASS |
| `pnpm --filter @lana/worker typecheck` | Exit0 |
| `pnpm --filter @lana/worker build` | Exit0 |
| `pnpm --filter @lana/worker lint` | Exit0 |
| `C3_CHECKPOINT_A_ROUND=28 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3` | Exit0, `FROZEN_PROTOCOL_VALID`; read-only validation of existing round28 evidence. Its machine quality field remains `BLOCKED`; primary human review remains29/42 PASS. This is evidence integrity, not a new quality result. |
| `git diff --check` | Exit0 before preview delivery |

Environment prefixes above describe the settings actually applied via PowerShell `$env:...`; they are not Windows shell syntax. Worker package scripts also built their declared dependencies; no shared-package source changed.

Complexity delta: one private presentation function and an opt-in in the existing request builder; an existing frozen-protocol check rejects unregistered formats; the existing A3 runner/readback reuses requestId telemetry only for the new format. Two existing executable files changed, with one focused test file. No new runtime parser, gate, model role, authority, persistent state, provider/client abstraction or production entrypoint. Test-only readback and local previews do not participate in customer runtime.

## Prepared preview and bounds

After committing tested executable source as `998fe9c5f79983bdc06149210b16eb8e1728b4ef`, ran `node C:/Users/nguye/AppData/Local/Temp/c3-context-presentation-preview.mjs`: exit0. This one-off local preview constructed126 bodies from42 unchanged control cases, compared every default/verifier envelope and checked644 historical evaluation files against starting HEAD; the only historical executable changes are `protocol.mjs` and `run-a3.mjs`. Zero provider generations/registered attempts. No a2RunSourceSha/a3RunSourceSha is assigned to this preparation.

[Before/after preview](../../apps/worker/evals/single-agent-semantic-verifier/context-presentation/PREVIEW.md) links exact input text and [measurements](../../apps/worker/evals/single-agent-semantic-verifier/context-presentation/local-measurements.json). Actual encoded full-request maximum: control24,104bytes, readable25,793bytes, verifier with4,096byte draft31,022bytes; all below frozen32,768. Mean owner request19,388→20,677bytes. No bounds raised, no data truncation. Model, prompts, config, hashes and all source inputs remain round28; model-quality, token/cost/latency improvement and future provider availability remain UNVERIFIED. This prepares the serialization treatment; it does not turn any prior STOP/BLOCKED/FAIL into GO.

`node C:/Users/nguye/AppData/Local/Temp/c3-context-delivery-check.mjs` exited0:10 preparation files scanned,0 credential-pattern matches,71 local Markdown links resolved,0 historical round-file changes,0 provider generations. Final `git diff --check` exited0. This local artifact check does not assert semantic safety or provider/model quality.

## Delivery readback

`git push origin feat/c3-semantic-verifier-checkpoint-a-20261005` and `gh pr edit 390 --repo nguyentuanson27-netizen/lanchatbot --title 'C3 Checkpoint A: readable context preparation; batch STOP' --body-file C:/Users/nguye/AppData/Local/Temp/c3-context-pr390-body.md` exited0. `node C:/Users/nguye/AppData/Local/Temp/c3-context-pr390-readback.mjs` exited0:local/remote/PR HEAD matched artifact commit60f5583dfa6273e4328b9f6ceeec17c3b5383a22;clean worktree;OPEN draft;exact title/body matched the prepared file,bodySHA256770b774d71803d4288f19c71def9ba84ecdf9e3ac396a379fb89120a153ce52d. Remote CI was QUEUED, not a verified PASS. This receipt-only documentation commit changes no executable/config/frozen inputs/provider evidence and leaves model-quality UNVERIFIED/batchSTOP.
