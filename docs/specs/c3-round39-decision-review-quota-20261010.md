# Checkpoint A Round39 — quyết định đang hỏi, review nhất quán và quota

Owner “fix và thực hiện vòng mới” authorizes exactly one new Checkpoint A round. implementationBaseSha: 296cdcfbf5759f5bf9cbb24acf3dc63005589361 after refreshing main; starting/spec SHA: 97f0a378525ba6cbf00b147b5c7ce1ee58153c0d. Continue the separate implementation branch and draft PR390. Stop at owner GO / STOP / BLOCKED; no automatic40/post-A/merge/deploy/live send.

Required references: [architecture](c3-single-agent-commerce-architecture-20261004.md), [boundary amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../tasks/plan.md), [todo](../../tasks/todo.md), [whole-dialogue preparation](c3-vietnamese-dialogue-preparation-20261010.md), [Round38 findings](../../apps/worker/evals/single-agent-semantic-verifier/round-38/FINDINGS.md).

## Current evidence and bounded fix

Round38 A2 PASS122/122; A3 actual15/42PASS with23 verifier usage_limit_reached fallbacks, one semantic fallback and three eligible quality failures. Paired first19 registered cases: Round37 primary12PASS / Round38 primary15PASS; two gains are restored owner availability, not proof of better prompting. Round38 is not evidence that Gemini became worse. All historical prompts, inputs, outputs and scores remain immutable.

Owner38 still repeats already-known design when a buyer objects to price and delegates a requested color decision. Removing chart/provenance addressed one source of premature fit and measurement recitals; it does not by itself ensure useful buying advice. Revise the owner conversational guidance and one hypothetical example, retain V4 presentation and exact authority/capability suffix. No case-specific production template, keyword classifier, router or repair loop.

One evaluator-only correction is required: r5-wardrobe-budget asks whether to buy the shirt or set. Correct its resolution/progress expectations to that purchase decision; choosing color/asking size is optional unless useful at this point. Do not fail just for omitting those later decisions. Other41 evaluator records, all42 customer/history/trusted runtime objects and every122A2 fixture are exact38. This is a new scoring identity; do not claim identical-rubric causal improvement over38.

## Frozen protocol

The manifest freezes both prompt/schema hashes, corpus/reference/auxiliary hashes, model identities/generation configs, request and snapshot binding, serialization/allowlists, bounds, repetition/variance, numeric usability/quality bars, terminal map and static fallback hashes before any generation.

Conversation: VERTEX_AI gemini-3.5-flash-lite/version same, global HIGH, existing local service account. Verifier: OPENAI gpt-6.1-sol/version same, high, existing Codex ChatGPT login CLI0.159.2. Exact configs/defaults unchanged38; repetitions1, max1 upstream generation per registered role slot, retry0, repairfalse. No substitutions, best-of-N, adoption or error exclusions.

Native full history/latest and NATIVE_DIALOGUE_FACTS_V4 business presentation unchanged38. Every sales fact/condition/subject/receipt and code-owned size result/missing input is retained; raw charts/provenance remain omitted only from owner display. Canonical snapshot, verifier JSON, protected references, deterministic freshness/subject/revision/permission/recipient/receipt/privacy/snapshot/draft checks unchanged. One conversational owner and at most one verifier. Every hard-precheck survivor goes to the verifier.

Runtime and evaluator projections remain separate. Both models receive no caseId/split/family/expected/required/forbidden/rubric/reference/scoring labels. Captured-request injected-marker tests cover all42/both roles, including the revised evaluator record.

Exact terminal map/fallback IDs/text/hashes remain38. The current attempted generation fails closed on any error. Post-effect recovery remains a compatibility assertion only.

## Capacity handling owns one observed operational risk

A read-only installed Codex app-server account/rateLimits/read at2026-10-10T07:13:55Z reports35% short-window use,63% long-window use,credits available,no classified reached limit; zero generation requests. This account-level snapshot does not promise sufficient model-specific capacity for the full run. Reuse this read-only inspection before A2/A3; no generation probes, quota/account/credential mutation or provider/model substitution.

If the existing bounded provider diagnostic explicitly reports usage_limit_reached or insufficient_quota, preserve the current attempt's request/error/fallback and stop the population loop. Remaining slots stay preregistered and unexecuted with null generation/verdict/terminal; do not fabricate fallback outcomes or human scores for them. Partial evidence must validate the complete registration, executed prefix and actual capacity-stop diagnostic; cannot qualify A2/A3. Generic HTTP429, timeout/401/5xx remain failed current attempts with retry0; do not infer exhaustion from a status alone.

This is an evaluation-loop stop and partial-evidence correction, not a new production gate, operator, durable state, semantic layer or provider framework. Older rounds retain their original execution semantics.

Current official [Codex app-server](https://developers.openai.com/codex/app-server) and [Google inference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference) documentation checked2026-10-10. Existing generation API/transport/auth/config stays unchanged.

## Evaluator-only whole-conversation review protocol

Reuse the seven whole-dialogue review rules in the preparation document, with these explicit clarifications frozen for39:

1. Read complete accepted dialogue, latest message, current trusted facts and actual terminal outcome first. Describe the connected buying outcome before assigning ten diagnostic scores.
2. Identify the decision or concern the customer is currently asking the shop to resolve, including indirect objections. A useful answer to that decision may complete the turn. Do not require every earlier/evaluator goal to be fully finalized now.
3. Color/size/CTA questions are not compulsory after every recommendation. A customer delegating a color choice should get useful selection; a customer asking shirt versus set should get that purchase decision. A further question is judged by whether it advances this conversation.
4. Evaluate price objections through persuasion about the shop's grounded value or an appropriate buying alternative. No required mention of price difference, particular feature, new fact or exact phrase. Repeating features or appending an invitation to buy does not automatically resolve an objection.
5. Judge naturalness and coherence of the whole reply. Legitimate reuse of customer information to compare options, correct facts or answer totals is allowed. No keyword/phrase bans, fixed sentence count, reference matching or cheapest/always-upsell rule.
6. Actual fallback/handoff/no-send is the scored customer outcome. Rejected drafts are diagnostic only after primary scoring. A safe fallback can fail quality. An unexecuted slot is unavailable evidence, not an observed customer fallback or a model-understanding failure.
7. For a claimed defect, relate it to the actual customer need and identify its practical impact. Separate optional improvement from a failed requirement. Check analogous turns consistently; do not invent extra expectations or alter historical scores.
8. Separate owner response weakness, semantic reject, deterministic invalidation, provider errors and context/capability gaps. Missing verified alternatives cannot be supplied by persuasive wording. No third provider judge.

Numeric bars unchanged38: ten dimensions scale0/1/2, minimum1 per dimension and mean1.5, safety2/naturalness2,38consultation cases require understanding/usefulness/decisionSupport/nextStep2, each family90%, combined terminal failure≤10%. Complete generation/registration/error denominators retained. Primary subjective nonblind review is not independent/human/owner acceptance. Every executed complete conversation is reviewed; no default-all2 fill, candidate adoption or partial qualification.

## Ordered work and verification

T1freeze/commit → T2 observedRED before minimumGREEN/readiness/self-review → clean committed A2 source/runtime HEAD seal/preflight/fresh122once → only freshA2PASS clean A3 source/runtime HEAD seal/preflight/fresh42once → raw evidence/five fingerprints commit before primary review → CHECKPOINT_A/tasks/draftPR390 → STOPowner. Confirmed capacity block stops provider work and records BLOCKED. Runtime source SHA is never written back into frozen inputs.

Required actual commands: C3_CHECKPOINT_A_ROUND=39/C3_TEST_CODEX_TRANSPORT=1; node --test round-39.test.mjs, complete eval *.test.mjs, focused protocol/conversation-context/codex-inference/gemini-inference; worker vitest boundary+vertex; business-tools protected-claims+reply-assembler+size-engine; worker typecheck/build/lint; protocol preflight/validate A2 and conditional A3, and run-a2/run-a3. Record exact invocations/exit/output and observed failures; never claim unrun PASS.

Complexity budget: existing evaluation protocol/adapter admission, bounded provider diagnostic helper and population loops/partial evidence only. No production/shared source changes or new model role/generic parser/semantic router/repair/reverify/framework/tool/state/mutation/effect/send/promotion work. One observation and the changed review identity do not establish isolated causality, variance, model ranking or real-shop conversion.
