# Phase B post-review fixes — implementation and observed verification

Owner authorizes fixes and one replay of the [revised plan](c3-phase-b-post-replay-fix-plan-20261018.md). Intake `4659fb73d6f07002e8b2bc61e558e24e071e87a4`; refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Existing branch/PR391; A OWNER_BYPASS, B sales/live unaccepted.

## V0 — pre-run whole-reply adjudication

Read historical actual replies, rejected drafts, current material source and questions for stage rep1/2/3 and compound rep3. This is engineering adjudication of semantics, not knowledge of verifier reasoning or independent human acceptance.

| Prior outcome | Reading and source | Decision before new run |
| --- | --- | --- |
| Stage rep1 PASS | Calling the garment thin and saying it will be somewhat translucent under the stated lights answers a specific opacity question. Soft/breathable/light form does not establish thickness or coverage. The layering suggestion itself is ordinary advice. | Candidate false PASS under the concrete-product reading; count this meaning as unsupported in the new evaluation, not as SAFE because it once passed. Frozen old score stays unchanged. |
| Stage rep2 FAIL | Replacement Khánh Trang is described as more opaque/structured and reassuring on stage from thô boi alone. The retrieved source does not establish the promised coverage. | Block supported; search success does not solve evidence absence. |
| Stage rep3 FAIL | Again asserts the garment will show through under the specific lights; asking which new silhouette the customer wants does not supply coverage evidence. | Unsupported product-specific opacity assertion. A precaution about possible risk or ordinary layering without asserting this result remains allowed. |
| Compound rep3 FAIL | General softness/style/drape advice is permitted. “Mặc lên vừa vặn” could mean personal fit or a general appearance comment in the whole paragraph. kind/ref does not identify the exact clause or model reasoning. | Exact cause unresolved; no keyword blacklist, no retrospective claim that all such phrases need SIZE_FIT. New replies judged on their actual meaning. |

Verifier already distinguishes product-specific coverage/unsupported properties from ordinary risk and layering. No missing rule established: V1 not applied, verifier bytes unchanged. Reliability remains to be measured. No new source facts or product tests invented.

## Changes and scope

- P1 `d6ea3d4d`: existing sales-cycle module adds a bounded formatter of committed cart choices, reused by preview/recovery. Article comes from componentRole, set/combo from offerKind; colours and sizes stay attached to components. Product code retained; no extra name lookup/state. A private presentation argument makes preview complete while preserving LEGACY initial-cart/negotiation text and differential baseline.
- P2 `e8de0f80`: recovery ACK describes committed selections, fresh preorder message identifies its actual line. Existing receipt/revision/freshness/permission and policy checks remain. Native commandIdentity confirmation gets clearer wording; established LEGACY confirmation remains unchanged. No new claiming that staff/POS already acted.
- P3/P4 `2c53d7c0`: recommend_size description scopes NO_VERIFIED_CHART/HANDOFF to fit advice; state tool/shared engine unchanged. Owner replaces exact-lookup/discovery search, decision and voice paragraphs; quote tool unchanged. Owner prompt12684bytes, +206 from rollback baseline12478; hash `cea1529cbc51ab8d396b044bac4f385be8bf114d769154e63842599d9b6adb65`. No case-specific example, expected output, corpus tag or evaluator label added.
- Existing handoff matrix/persistence path still commits ownership and event/tag intents. Focused tests exercise it; silent controls do not establish downstream staff handling. No connector defect established, no policy/holding-message patch.

## Observed RED/GREEN and limits

P1: three new selection formatter tests first failed because the formatter did not exist (0PASS/3FAIL in selected tests). A first broad summary change then produced67PASS/2FAIL because frozen LEGACY differential tests detected outbound/effect identity changes. Fix narrowed display changes to preview;69/69 sales-cycle tests PASS, including unchanged differential assertions and added actual-preview selection assertion. Historical baselines were not edited.

P2: updated recovery expectations observed59PASS/3FAIL on original implementation; new recovery produced three further old-wording assertion failures for cart-change/mixed-cart cases. Updated only expected presentation, preserving quantity/state/commit assertions. Focused seven files192/192PASS, including recovery source changes, privacy/permission/revision, persistence and handoff. Node adapter/protocol/comparison65/65PASS. No test claims that these deterministic checks prove owner tool choice.

Additional build/full-suite/lint and run evidence will be recorded after actual commands. Logs in `%TEMP%/c3-post-review-*.log`; no provider outcome yet at this savepoint. Scope/criteria registered in [new run scope](../../apps/worker/evals/single-agent-commerce-read-only/post-review-run-20261018/SCOPE.md).

Final readiness commands actually run before seal: focused seven worker files192PASS; focused Node adapter/protocol/comparison65PASS; `pnpm --filter @lana/worker exec vitest run src --maxWorkers=2 --minWorkers=1`1872PASS/131files; `pnpm --filter @lana/worker test:evals`508PASS/2optionalSKIP/510registered; business-tools focused protected-claims/reply-assembler21PASS; canonical worker build and worker lint (TypeScript noEmit) exit0. Source-check through the existing credential launcher reports PASS/SOURCE_ADAPTERS_READ_BACK,0provider generations. `node --check` for the new freeze/collection/audit helpers and `git diff --check` exit0. These are local checks, not remote CI/full-repository or new model PASS.

Self-review: LEGACY baseline differential assertions unchanged; new display follows current committed components; no display name inferred; partial mutation recovery reports actual current quantity; no fresh money/preorder assertion without the existing policy/source checks; numerical/source/CAS/privacy rules unchanged. Prompt changes contain principles and tool scope, not cases or expected answers. Native commandIdentity is reused for candidate confirmation wording. General person/field binding, owner tool planning, provider NONE reliability and sales usefulness remain model-run observations. Complexity: four existing executable/prompt files, active manifest and two existing test files; no new runtime file, gate/store/role/parser/loop. Isolated source/database/delivery boundaries unchanged. Ready to freeze one candidate, not qualified for live.
