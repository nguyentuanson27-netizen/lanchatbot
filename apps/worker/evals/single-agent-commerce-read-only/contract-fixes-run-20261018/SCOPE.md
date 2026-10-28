# One Phase B F1–F3 model replay — 2026-10-18

Owner requests “chạy model đi” after implementation `2bfc568d32196c844dcd81191f3cae98438672c9`. Refreshed implementationBaseSha/main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Existing PR391; A remains OWNER_BYPASS and B has no sales/live acceptance. [Implemented changes and checks](../../../../../docs/specs/c3-phase-b-contract-fixes-implementation-20261018.md), [independently revised plan](../../../../../docs/specs/c3-phase-b-rollback-and-contract-plan-20261018.md).

## Candidate frozen before results

F1 requires explicit offer scope in candidate add arguments and supplies confirmed option enums when complete. F2 exposes bounded numeric field errors before an atomic state write. F3 maps a private source-unavailable reason to public SOURCE_UNAVAILABLE. Owner/verifier prompt files and manifest match the restored baseline; execution remains in trusted user data. F1 changes the add tool schema/description. Code-owned permissions, receipts, final gate, shared catalog selector, policies, corpora, grading and budgets stay unchanged. No F4 prompt treatment or post-result patch.

This is a combined implementation replay. F1/F2 interact in the same state-before-cart turns; F3 is measured in the B1 population. It cannot attribute the aggregate change to one edit. Prior execution run also had a different owner prompt/execution placement. Live sources and accepted histories can change, so comparisons with both previous runs are descriptive.

## Exact configuration and authority

Vertex AI global **gemini-3.5-flash-lite /HIGH** owner; **gpt-6.1-sol /high** verifier through the existing Codex login relay. Exact versions/config/routes are copied from the active manifest into FROZEN_INPUTS.json before dispatch. Max3owner generations/2tool rounds/6calls/1verifier per public turn;90s timeouts; owner65536/verifier32768wire bytes; retry0; at most1upstream generation request per invocation. Errors/timeouts/auth/429 remain in accounting; no hidden refresh-and-retry of the same generation, no model substitution.

Every hard-precheck-surviving final draft must reach verifier and the final deterministic gate. No protected-language classifier skip, rewrite, third role or repair loop. Code remains sole authority for identity, freshness, state, permissions, effects, receipts and privacy. Code-owned checkout/recovery is reported separately from model PASS.

## Population, ordering and acceptance

Reuse `../contract-replay-20261018/cases.priority.json` and existing `../stateful-cases.json` byte-for-byte. Same15unique priority cases and **45outcomes** as the previous two runs: three independent ordered7-turn stateful journeys, then8priority B1 cases ×3. Stateful histories contain actual captured replies, including failures. No new questions, examples or outcome labels enter provider requests.

1. Launch stateful journeys first, then B1 priority jobs. Native inference may overlap at most2processes; shared build/import startup is serialized. Each stateful DB is unique and must be dropped. No subagent generation or additional diagnostic slots.
2. Collect all45registered outcomes, including downstream after a failure. Max168generation requests. No majority/best-of, removal, hidden generation retry or replacement. A process/source outage may leave explicit undispatched slots, not silently counted as PASS or rerun.
3. Only if all priority outcomes meet the existing criteria, run remaining16B1 once (range9:24). Overall max61outcomes/232requests;31unique cases if full. Safety ambiguity, selection/state error, NONE/budget/provider/source failure, unusable decision/next-step advice or incomplete checkout/confirmation holds the remaining16. Minor voice polish alone is not failure. No changing criteria or labels after results.

Whole actual final reply, history, current public facts and committed state determine usefulness, need completion, decision support, correction use, next step, coherence, naturalness and safety. Accept reasonable upsell, subjective styling confidence, ordinary layering suggestions and useful correction readback; do not require cheapest choice, a keyword checklist or a compulsory CTA. Ambiguous stage/price readings remain unresolved, not retrospectively relabeled. OwnerAcceptance=null.

Treatment-specific readings within that same review:

- **F1:** inspect requested article/offer/mode/color/size/quantity and committed cart, missing-offer rejections, read/tool-round consumption, color loss and NONE. Offline singleton/direct-add controls already passed; this provider population does not prove all single-offer products. Unknown/unavailable offers must not become only-set/out-of-stock claims or a fabricated commit. A safe but unfinished purchase is still unfinished.
- **F2:** compare committed WAIST/HIPS with the customer's exact corrected values, retain selected size, distinguish current source from old-history replay. Tool OK/receipt does not establish correct field/person semantics; numeric-copy validation cannot prove referent binding. Existing correction is the control; no new referent question is added in this descriptive replay. General other-person handling remains unverified.
- **F3:** for skirt/set partial-source cases inspect the actual response for invented only-set rules, unsupported stock statements, retained useful material/form information and future work outside capability. Known-source concern/selection cases are the controls. Correct wire reason alone does not prove sales improvement.

## Provenance and evidence

Reuse completed implementation checks honestly: focused65Node/280worker/protected21PASS, full1869Vitest/508NodePASS+2optionalSKIP, build/lint(noEmit)/C2validators exit0. Fresh live source readback0generation precedes freezing. Freeze executable/config/tool schema/prompt/corpus/criteria/runner hashes; commit; require clean source; capture current HEAD as runtime bRunSourceSha, never write it back into frozen source. Preflights0generation before dispatch. Executable/config edits after seal invalidate the old run identity.

Use the established Lana Ops read-only source/credential route. Source PostgreSQL/Redis/Qdrant reads do not publish catalog/policy changes. Cart/profile/private checkout operate only in disposable synthetic DBs; delivery is captured, with no real customer/Meta/Pancake/POS effect. Credentials stay in temporary protected paths and out of Git/logs/reports.

Preserve raw45 before whole-outcome primary, commit primary before rejected draft/verdict diagnosis. Primary review reads actual capture/state/public context; it does not use rejected drafts to upgrade a fallback. Retain each generation request/error/usage and explicit missing slots. OWNER_TOOL_MODE is a completion contract failure even with HTTP200; distinguish it from transport/quota errors. Report3ownership-only controls and6code preview/confirmation milestones separately. Read captures rather than treating HANDOFF/NO_SEND as uniformly successful or failed.

Audit all surviving final/verifier bindings, unchanged exact draft, evaluator/private-input firewall, source/raw hashes and DB cleanup. Report verifier/added-verification/whole-turn p50/p95, request counts, token/cost coverage, actual terminal rates, failures/unknowns and commands truly run. Historical results remain immutable; no broader semantic safety, conversion or stability claim.

Stop after evidence, report/tasks and draft PR391 update. No automatic fix/next round, new A2/A3 qualification, merge, deploy, live send, source publication or Phase C.
