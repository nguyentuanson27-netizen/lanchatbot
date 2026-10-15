# Actual commands and results

Commands ran from the repository root unless noted. No command below calls an owner/verifier provider. Earlier successful commands were not silently upgraded to proof of later source changes.

## Intake and focused RED→GREEN

- `git fetch origin main`; `git rev-parse origin/main`: exit0, `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts`: ETA RED18PASS/1FAIL (deliveryRegion rejected) → GREEN19PASS. Later region metadata RED18PASS/1FAIL → GREEN19PASS. Payment-method projection RED19PASS/1FAIL → GREEN20PASS. Blank optional ETA expiry RED19PASS/1FAIL → GREEN20PASS.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-handoff.test.ts`: initial missing-module RED, then GREEN7. Subsequent RED→GREEN for real resolver fetch-time stability, current revision/scope and caller fence; final explicit wrong-page/NO_SEND RED10PASS/2FAIL → GREEN12PASS.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-persistence.test.ts`: missing handoff adapter RED1PASS/1FAIL → GREEN2PASS; atomic ownership/event/tag and incomplete-intent rollback checked.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts`: committed handoff propagation RED21PASS/1FAIL → GREEN22PASS.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce.test.ts`: missing-composition RED → GREEN2PASS.
- `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs`: capability projection RED12PASS/1FAIL → GREEN13PASS.
- Final broad B focused command: `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only-sources.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce.test.ts src/single-agent-semantic-verifier-boundary.test.ts`: 139PASS before the final two handoff regression tests. Final changed-boundary command on those five relevant files: 50PASS, followed by `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit`: exit0.
- `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs`: 34PASS/0skip after ETA/payment integration.

## Full and existing protected regression checks

- `pnpm --filter @lana/worker build`: exit0 with dependency builds; later direct `pnpm --filter @lana/worker exec tsc -p tsconfig.json` also exit0 before sealed database runs.
- `pnpm --filter @lana/worker typecheck`; `pnpm --filter @lana/worker build`; `pnpm --filter @lana/worker lint`: all exit0 after the caller-fence change, before the final reject-only handoff correction. Final `tsc --noEmit` above checks that correction.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/product-presentation.test.ts src/product-facts-v2.test.ts src/size-engine.test.ts`: 52PASS across5files.
- `pnpm --filter @lana/worker test`: first exit1 because Windows checked out the existing `v4` symlink as a16byte placeholder;125files/1706tests passed, three suites could not open rubric/materialization. After materializing the existing target, the default parallel invocation had two5000ms timeouts in old Git/evidence tests;126files/1728tests passed. No assertion/timeout was changed.
- `pnpm --filter @lana/worker exec vitest run src --no-file-parallelism`:128files/1730tests PASS on the pre-final savepoint; final repeat on868b5b2b after scope/NO_SEND correction:128files/1733tests PASS,0skip, exit0. The symlink alias was restored afterwards; no alias/test-fixture change is committed.
- With `C3_CHECKPOINT_A_ROUND=68` and `C3_TEST_CODEX_TRANSPORT=1`, `pnpm --filter @lana/worker test:evals`:478PASS/0skip. This uses the existing local stub transport, not provider generation. Final B-only34test projection/protocol command above covers the later native-tool surface. Frozen A data/evidence were not edited.

## Real database tests

All use `py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <new-external-directory> <COD|BANK_TRANSFER>`.

1. External directory `C:/Users/nguye/AppData/Local/Temp/c3-b-integration-audit-20261015-cod`, COD: exit1,8groupsPASS/confirmation terminalFAIL; source1f2d5acd, database dropped.
2. `.../c3-b-integration-audit-20261015-cod-v2`, COD: exit0,12/12PASS, source84bbf401, database dropped.
3. `.../c3-b-integration-audit-20261015-bank`, BANK_TRANSFER: exit0,12/12PASS, source3d6505bb, database dropped.
4. `.../c3-b-integration-audit-20261015-cod-final`, COD: exit0,12/12PASS, source2d1a6a8e, clean executable/config paths, database dropped.
5. `.../c3-b-integration-audit-20261015-bank-final`, BANK_TRANSFER: exit0,12/12PASS, source2d1a6a8e, clean executable/config paths, database dropped.

The source helper reads existing credentials in memory. No secrets, account details or customer data are copied into evidence. Each JSON records the exact source SHA, schema files, synthetic database name, policy hash, outcomes and cleanup. Intermediate failures/runs are retained, not adopted or discarded.

## Completion checks

Final full source suite passed on868b5b2b as recorded above. `pnpm --filter @lana/worker lint` and `pnpm --filter @lana/worker exec tsc -p tsconfig.json` then exit0 on the final source. `git diff --check`:exit0. In-memory Python validation scanned27changed files for credential patterns, all5database reports for private checkout/account/token fields, local report/spec links and frozen A/production-entrypoint/shared-source retention:exit0,0credential/private-field matches, linksPASS, protected historical/source pathsUNCHANGED. The checks report only counts/paths, never secret values. Remote CI is reported separately; local checks do not imply remote CI PASS.
