# Owner-authorized post-review B test run — 2026-10-15

Owner now requests “thực hiện chạy các case test” after the P1/P2 corrections and independent GPT-6.1 Sol High re-review. This authorizes one new bounded replay of the existing seven-turn stateful B population. It supersedes the earlier stop/no-automatic-third-batch wording for this requested test only. It does not reopen Checkpoint A or authorize Phase C, rollout, policy publication, serving-schema migration, live customer writes or Meta/Pancake/POS sends.

## Frozen population and configuration

Reuse `stateful-cases.json` byte-for-byte: seven outcomes, six public turns and one code-only synthetic private-checkout turn; N1, no added cases or repetitions. Run the sales journey in its registered order (open → variant/quantity → quote → correction → private checkout → confirmation), then the independent human-request journey. Fresh disposable PostgreSQL state; actual current public catalog/price/stock and captured PUBLISHED policy. Missing real evidence stays missing; never substitute synthetic product/policy data in provider mode. Delivery uses the existing in-memory capture transport.

Unchanged models: Vertex `gemini-3.5-flash-lite` High/global for the owner; Codex-login `gpt-6.1-sol` High for the verifier. Manifest, generation settings, prompts, verdict schema, native tool declarations, corpus and external source configuration remain unchanged. Initial zero-generation preflight at d6b28f8 passed; the actual executable/config source SHA and all hashes must be captured again after this scope is committed and the executable/config worktree is clean. Do not write that runtime SHA back into frozen source. Any executable/config change invalidates that run identity.

Limits remain three owner generations, two tool rounds, six tool calls and at most one verifier per public turn; maximum24generation invocations across this registered batch, zero automatic retry/repair/reverify. Every surviving exact generated final draft needs the verifier and current deterministic gate. Auth/client/HTTP/stream/timeout failures remain outcomes, never removed or replaced. Count registered invocations separately from actual dispatched requests; retain pre-dispatch errors and request/error accounting. Model/provider/config unavailable means BLOCKED, with no substitution.

Runtime requests must exclude case IDs, journey/evaluator purpose, expected outcome, scoring labels and required/forbidden behavior. Case metadata may label the outer evidence log only. Private checkout names/contact/address must not enter owner/verifier requests. The verifier has no tools, writes, retrieval, rewrite or send capability. Code retains identity, source/freshness, current revision/permission/recipient, effects, receipts and privacy authority.

## Preregistered assessment

Retain raw request/attempt/registration/database output first and commit it before primary whole-terminal review; diagnostics follow the primary review. Read the customer's actual turns, accepted history/state, exact terminal reply and captured output as a whole. Use the previous report's USABLE / NEEDS_EDIT / UNUSABLE / functional recovery/control distinctions, not keyword scoring or a new post-hoc numeric pass bar. Primary coding-agent review is nonblind and not human acceptance.

- Open: persist the selected garment/color/M/quantity1 and accepted76/98 measurements without inventing personal-fit evidence; assess the actual customer reply.
- Variant/quantity: use the existing cart reference to commit L and quantity2, preserving both effects and the current source; assess whether the acknowledgement reads naturally.
- Quote: answer using the current code-computed two-item total, discount and shipping. Do not hardcode the prior run's prices or total into expectations.
- Correction: persist74/96, retain explicit L and provide the new committed profile receipt to the real verifier. Assess the whole reply; repeating every measurement is not required to pass.
- Private checkout: zero model requests and no private-input leak. Accept only the current-source code preview or an actual committed allowed recovery/handoff; a safe recovery can still leave the purchase journey incomplete.
- Confirmation: confirm only a valid current preview, or preserve a prior actual handoff/no-send. No external POS-order claim.
- Human request: actual current ownership/event/tag intent must commit before acknowledging transfer; no assertion that staff already responded.

Report all seven terminal outcomes, persisted state/effects/receipts, semantic-verifier result and actual captured output, including fallback/handoff/no-send rates. Audit provider counts, model identity, evaluator/private-data projection and exact draft/snapshot bindings. Report descriptive p50/p95 verifier and whole-turn latency, token usage and exposed cost (null when unavailable), without a stability claim. Historical batches remain separate populations with their original failures and scores.

Before generation, rerun focused worker/database/protocol/provider checks and composed PostgreSQL COD/bank controls on the unchanged reviewed code. No new prompt/code fix is part of this test request. After this single batch, preserve failures/unknowns, update the report/tasks and existing PR391, and stop. Do not automatically iterate, merge, deploy or promote from a small replay.
