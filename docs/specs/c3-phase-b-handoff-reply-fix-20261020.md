# Phase B — concise policy clarification and configured handoff replies

Implementation base: `71941ab59f5145bf38282b7dab5e76f0090c1c37`.
Implementation fix: `30e6aa654b2b37ac8edf204dcba817b93a7d4649`.
Scope: repository candidate only. Current published policy/matrix, production defaults and historical provider evidence are unchanged. A remains OWNER_BYPASS; no B/live GO.

## Owning causes and changes

The previous five-slot run correctly persisted two handoffs but sent the same default after-sales holding reply. Those are code-owned terminal messages, not owner drafts rejected by the verifier. Configure the existing HANDOFF_MATRIX contract rather than asking the owner to rewrite that terminal.

`apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.candidate.json` is an isolated administrative candidate, not a published shop source. Its EXCHANGE and DEFECT rules say:

- EXCHANGE: “Em đã chuyển nhân viên hỗ trợ đổi hàng cho chị. Nhân viên sẽ xác nhận món cần đổi và hẹn giao đổi với chị nhé.”
- DEFECT: “Em đã chuyển nhân viên hỗ trợ lỗi sản phẩm cho chị. Nhân viên sẽ kiểm tra và hướng dẫn chị đổi/trả nhé.”

Self-review removed “size” and “áo” from the proposed static messages: these reasons also cover other exchange actions and other products. EXCHANGE does not prove eligibility, approval, available replacement stock or fit. DEFECT does not prove the shop has confirmed the defect. Neither message promises those results. Courier exchange is in the current policy source; staff still confirms the request and next procedure. No new photo, order-ID, packaging, deadline or refund requirement is invented.

The candidate includes the existing full reason set so selecting it cannot leave another reason without a rule. Only two holding texts differ. Tags, message policies, silent handoffs and every other holding text match current engine defaults; the focused test checks this comparison. Existing published matrices are not merged, overwritten or republished by this change.

The owner policy section changes one bullet: when one fact decides entitlement, ask that fact first; defer the unrequested period, fee and checklist until the customer answers. Retain direct answers to information the customer actually asks for. No hardcoded policy values or new examples. Owner hash is `2d138eadfc0de1d7c268f2d2f4bc876d635a85663539fdbcd3d0a8261f7c1bb1`. Verifier, other prompt sections, schema, models, corpus and thresholds are unchanged. Prompt bytes change from12023 to12135 (+112), replacing one bullet rather than adding another instruction block. Prompt behavior still needs a new provider measurement.

## Consumer and source binding

Reuse the five-case prepare/run scripts. Preparation now requires a **new** `--registration-dir`; exclusive writes prevent replacing historical registration/source/inputs. Optional `--handoff-matrix` accepts the existing schema. The run consumes that frozen matrix only in its in-memory resolved bundle. Its mode explicitly names ISOLATED_CANDIDATE_HANDOFF. Preparation refuses this default-based candidate if an upstream custom matrix has since been published; that needs a source-specific revision instead of silently replacing its unrelated rules.

The registration records both the actual upstream policy/matrix hash and the effective candidate hash. Each read checks the upstream against its capture, then the effective source against the candidate capture. Existing policy identity/readback, CAS, permission/recipient checks, ownership transaction and dispatcher remain the authorities. No new runtime gate, state, role, parser or auth route.

For a future five-case model run, prepare into a fresh directory inside the eval tree, using the existing credential launcher:

```text
python %TEMP%/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/policy-handoff-run-20261020/prepare.mjs --registration-dir <NEW_REGISTRATION_DIR> --handoff-matrix apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.candidate.json
```

Commit executable/config/frozen inputs, require a clean worktree, then use the same exact existing runner path (no new credential allowlist entry):

```text
python %TEMP%/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/policy-handoff-run-20261020/run.mjs <NEW_PREFLIGHT_OUTPUT> --registration-dir <NEW_REGISTRATION_DIR> --preflight
python %TEMP%/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/policy-handoff-run-20261020/run.mjs <NEW_RUN_OUTPUT> --registration-dir <NEW_REGISTRATION_DIR>
```

These are future instructions, not commands claimed to have run. Five existing cases once each; at most20 generations, retry0. No full run or extra samples are added.

## Verification

- `node --test apps/worker/evals/single-agent-commerce-read-only/handoff-matrix.test.mjs`: observed RED2FAIL/1PASS with the default texts, then GREEN3PASS with the configured texts. Checks rejected CAS emits no acknowledgement, successful commit selects exact configured text, repeated handoff does not commit again, and unrelated reason behavior is preserved.
- Same test plus `protocol.test.mjs` and `gemini-inference.test.mjs`: 62PASS, including captured-provider-request label exclusion and one-request/no-retry behavior.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-read-only.test.ts`: 47PASS.
- `node --check` for prepare.mjs, run.mjs and isolated-integration.mjs: PASS.
- `python %TEMP%/c3-division-session-20261019.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs %TEMP%/c3-handoff-candidate-fix-20261020-v3 COD`: 28/28PASS, exit0, DB dropped, providerGenerations0. Includes both candidate reason texts through persisted ownership/event/tag/outbox and capture-only dispatcher, exactly once. No Meta/Pancake socket or real staff reply.
- First attempt stopped after13PASS at the new EXCHANGE case: prior negative fixtures left inbox work available to later claims. Second attempt stopped after12PASS because the cleanup incorrectly forced completion of a stale batch (`INBOX_BATCH_LEASE_LOST`). Both failed reports are retained and both DBs dropped. The corrected test uses the existing stale-completion contract (false/release), claims and completes the newer synthetic batch, and asserts conversation identity before using a batch. Runtime inbox/CAS behavior is unchanged.
- [Validation and both failed checks plus final PASS](../../apps/worker/evals/single-agent-commerce-read-only/handoff-reply-fix-20261020/VALIDATION.json) records109 focused unit tests and28 PostgreSQL checks. These are working-tree checks, not a sealed provider run.
- Self-review confirms other owner instructions byte-equivalent after removing the replaced bullet; only owner hash differs in manifest; historical raw/primary/lock files unchanged. `git diff --check`: PASS.

No worker/shared TS or provider API changed, so no new worker typecheck/build/lint or full worker suites were run. No new provider generation or improvement in model voice is claimed. Complexity delta: one existing-schema configuration, one focused regression test and bounded options in the existing evaluation runner, plus two configured-message cases in the existing DB integration. No production wiring or upstream source mutation.
