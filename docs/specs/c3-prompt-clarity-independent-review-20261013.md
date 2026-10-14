# Independent review — C3 prompt clarity preparation (2026-10-13)

Owner explicitly requested one independent reviewer **gpt-6.1-sol / max** after root audit, edits and self-review. Invoked through native collaboration with model=gpt-6.1-sol, reasoning_effort=max, fork_turns=none. Canonical reviewer: /root/prompt_clarity_independent_review. One reviewer, initial review then readback of its requested fixes; developer review outside runtime, not a third runtime semantic role.

## Initial review: CHANGES_REQUESTED

Exact source HEAD ffd08a0600de1f4efc3efce691824c4406528fad. Reviewer read candidate/control/spec/data contract without editing files or running A2/A3.

Required findings (P2):
1. Verifier task/verdict scope too broad: “mọi khẳng định/hàm ý về dữ kiện, kết quả và thao tác” could include subjective styling/choice. Define only protected business meaning and keep that scope in all verdict definitions.
2. Code-fit necessity weakened: saying SIZE_FIT “cho phép” selecting size plus forbidding only one-dimensional chart inference could permit direct selection from full charts/height-weight without current SIZE_FIT. Require correct bound SIZE_FIT for chốt size/nói vừa; keep supported height/weight as inputs.
3. Nullable protectedRef omitted: candidate demanded a ref in trusted although existing schema/validator accepts null. Permit trusted ref or null when no appropriate ref; don't invent a ref.

Optional suggestions:
- Scope source-requiring comparisons to facts/quality/cost/function; don't demand evidence for every ordinary styling comparison.
- Add spaces in toy price phrases “túi 480k”, “cái 350k”, “áo 460k”.

No required owner finding. Reviewer found confident consultation, requested partial answers, useful scoped upsell, revised recommendations, ACK versus completed operations and source/authority boundaries retained apart from those narrow issues.

## Fixes and readback: APPROVE — preparation only

Applied all3required and2optional wording fixes in two candidate files only. Exact reviewed HEAD **2ebb116c0c3bcf39538191cf24dbbe5bbe7d0cc5**. Reviewer independently read full final candidates and diff, confirmed no remaining actionable finding or concrete regression found through source review, and independently computed hashes:

- verifier: **36fa1e8c5b1edf429e8d729ce70784e6fd37efafbf6b21f59e8bbf9c0393ba25**
- owner: **e5a6e4beebdf80c53c77814e6fabe55c23d8918fc3395801a830d724c90f5b47**

Reviewer final limitations: approval does not prove improved model behavior. No new semantic provider results; candidate A2/A3 NOT_RUN. Frozen R63 remains A2 FAIL / STOP, A3 NOT_RUN. No code/control/historical artifact edits by reviewer or fix commit.

## Verification tied to revised candidates

Revised local command `node C:/Users/nguye/AppData/Local/Temp/c3-check-prompt-clarity.mjs` exit0:187A2fixtures/186constructed verifier bodies and1sameHISTORY_BOUND rejection;42A3owner bodies. Only instructions change; every runtime value/binding/schema/config unchanged, evaluator sentinel/caseIds absent. Max encoded request bytes verifier27261/owner18038, within32768. R63 validator rejects replacing its frozen prompt with these unregistered candidates. No provider/client/HTTP generation in this readback.

Existing full368/368 regression ran before review and passed exit0/0skips. Fix commit only changes inert candidate text, which the frozen-control suite does not select; therefore don't claim full suite semantically tested candidates or rerun it as reassurance. Revised builder readback owns new text-size/input/interface risks.

Structural delta: two candidate text files, audit/review docs and plan/todo; executable/runtime/production/shared/schema/corpus/model/config/threshold/fallback changes0. No new gate/operator/state/parser/router/repair/reverify/template/framework/semantic role.
