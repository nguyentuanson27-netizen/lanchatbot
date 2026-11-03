# Independent plan review — sales completion repair

Scope: plan review and documentation fixes only. No runtime/prompt implementation, model run, network/provider request or shop-source write. Plan: [sales completion repair](c3-phase-c-sales-completion-fix-plan-20261103.md).

Reviewer: `/root/sales_completion_plan_review`, independent read-only agent. User explicitly requested independent review → fix → same-reviewer re-review until approval. Review is not implementation acceptance or permission to publish sources, run providers, merge or deploy.

## Review 1 — CHANGES REQUESTED

Reviewed plan savepoint `91d86587660a9e1b30abfa90f91dda27744d553e`. Reviewer found two P1 blockers; no other blockers in S1/S2/S4/S5. Planned focused test paths were independently confirmed to exist. No implementation tests were run.

1. **S3 target compatibility/authority incomplete.** Legacy SIZE_RECOMMENDATION strict schema and producer lack target, protected projection discards it, parent-only fingerprint/authorization/matching and legacy guard could interpret a component claim as product fit. Required: explicit producer→legacy/schema→projection→trusted target/fingerprint→verifier→authorization/final-gate chain, independent expected target from code/source, and target-aware versus PRODUCT-only-reject dispositions. Negative gates must reject missing/mismatched target, cross-component/product scope and lossy projection while preserving PRODUCT behavior.
2. **S6 evaluator capability incorrectly assumed.** Existing selector accepts HUMAN alternates only; collector forwards priorTerminal without missing-field/preview proof. Diagnostic admission hardcodes j6 code-owned turns `[1,2]`, others none, and qualification rejects unregistered code-owned turns. Required: explicit typed witness bridge and separate evaluator selector actor, policy/outcome/witness hash validation and tests; prospective registered code-owned turn admission; seven-turn branches that respond naturally to early intake/completion, confirm only with preview proof and record completion only with confirmation receipt.

## Revision 2 — prepared, re-review pending

- S3 now names both claim representations, strict producer/schema/projection, code-owned expected target, request-key matching/fingerprints, PRODUCT-only legacy rejection, final readback and mandatory consumer-disposition inventory. Added the exact negative gate list.
- S6 now explicitly requires an evaluator-only typed witness bridge/selector, distinct actor from HUMAN, hash/authority/receipt checks, no private fields to models/public reports, frozen early-intake/early-completion branches and prospective per-scope code-owned turn/kind allowlists. Existing historical scripts/scopes remain unchanged.
- Missing/wrong witness blocks before dispatch; no default confirmation, new turn, rerun or blanket code-owned exception. Supplemental checkout is NOT_EXECUTABLE until these evaluator changes are implemented and tested.

Status: **NOT YET APPROVED**. Same reviewer must check revision 2. All implementation commands/model/real-PG execution for this plan remain NOT_RUN.
