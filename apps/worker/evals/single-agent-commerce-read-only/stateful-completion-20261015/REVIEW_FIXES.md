# Independent review fixes — 2026-10-15

Starting/reviewed head: cb8bb5efb0db920382cbfd874b30e836bb222d46. Owner requests fixing both findings and reviewing the result. The independent reviewer used GPT-6.1 Sol High. This is a code correction, not another provider batch or sales acceptance.

**Reviewed executable source: `0bbabeafa8bea8b024a05af6d8893a3c1c502a8f`. Both findings resolved; no new substantiated P1/P2 in the independent re-review.** Final local and composed PostgreSQL verification passed. [Machine-readable results and log hashes](review-fixes-verification.json), [COD database report](review-fixes-integration-cod.json), [bank transfer database report](review-fixes-integration-bank.json). Later delivery commits contain only reports/tasks, not executable changes.

Subsequent owner authorization produced a [separate model replay](../stateful-post-review-20261015/CHECKPOINT_B.md), source d9d96e4b. Its failures and results do not change the original review verdict or the historical statement that this correction step itself ran no provider batch.

## Findings and implementation

- **P1:** a superseded Inbox could still update the customer profile because its CAS checked only profile revision. The persisted ingress now supplies the code-owned current authority, source hash and existing Inbox guard. The existing database CAS locks page → Inbox head/source → scoped conversation in one transaction before updating the profile. Current BOT ownership, conversation revision, source identity, lease and routing must agree; the existing lease remains retained. Unguarded legacy callers retain their original API behavior. A pre-write read alone is not the fix; the database transaction owns the race.
- **P2:** the final consumer could use a newly read conversation revision for a reply verified against the older revision. It now compares authority with `world.state.conversationRevision` and uses exactly that verified revision for outbound readiness, state increment and final CAS. A mismatch takes the existing `EGRESS_WORLD_CHANGED` no-send path.

No prompt/schema/model/policy changes, production entrypoint wiring, new durable state/table, migration, semantic role, provider retry or language parser. The existing CAS has an optional scoped guard; the Inbox lock helper accepts only its existing required identity fields. The isolated integration harness adds one supersession regression with synthetic inputs.

## Verification actually run

Commands below are run from the owning package unless a root command is shown. Logs are retained in the session temp directory as `c3-b-review-*.log`; hashes and exact source are recorded in the result JSON. Silent successful compiler commands produce no Tee-Object file; their observed exit codes are recorded without inventing logs. Initial evidence packaging failed on that absent empty log, then was corrected to record the empty capture explicitly.

| Command | Observed result |
| --- | --- |
| database: `pnpm exec vitest run src/realtime-customer-profile-guard.test.ts` before fix | RED:8FAIL; writes were wrongly accepted and no transaction existed |
| worker: `pnpm exec vitest run src/single-agent-commerce-ingress.test.ts` before fix | RED:2FAIL/1PASS; persisted waist85 instead of74, old reply send-eligible after revision change |
| database: `pnpm exec vitest run src/realtime-customer-profile-guard.test.ts src/realtime-runtime.test.ts` | GREEN:48PASS |
| worker: `pnpm exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-session.test.ts` | GREEN:22PASS before adding the human-ownership control |
| worker: `pnpm exec vitest run src` | 130files/1756PASS/0skip, including all4 ingress regressions/controls |
| database: `pnpm exec vitest run --no-file-parallelism` | 30files/246PASS,4optional files/30testsSKIP |
| business-tools: `pnpm exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | 21PASS |
| root: `pnpm --filter @lana/worker build` first attempt | FAIL: new test attempted to assign a readonly fixture field; corrected with a new fixture value |
| worker: `pnpm exec tsc -p tsconfig.json` after correction | exit0 |
| database: `pnpm exec tsc -p tsconfig.json --noEmit` | exit0; its build also passed during worker dependency build |
| root: `pnpm --filter @lana/worker build` final | exit0, including the changed database package build |
| worker: `pnpm exec tsc -p tsconfig.json --noEmit`; `pnpm lint` | both exit0 |
| `git diff --check`; `node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs` | exit0 |
| root: `python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-b-review-integration-cod-0bbabea COD --composed-only` | clean0bbabea,12/12groupsPASS,exit0; owned disposable database dropped |
| same command, output `C:/Users/nguye/AppData/Local/Temp/c3-b-review-integration-bank-0bbabea` and payment `BANK_TRANSFER` | clean0bbabea,12/12groupsPASS,exit0; owned disposable database dropped |

The PostgreSQL regression injects a newer inbound during owner generation before `apply_customer_state`: persisted profile remains revision1 with no measurements, verifier calls0 and Outbox rows0. Existing committed profile receipt, multiple cart mutations, confirmation/handoff and delivery capture controls also pass. These are real database/synthetic domain/provider-transport checks, not model quality verdicts or real delivery.

Independent GPT-6.1 Sol High read-only re-review at0bbabea ran database guard/runtime48PASS and worker ingress/state/session/effects/handoff66PASS, plus diff-check0. It verified same-transaction source/authority locks for P1, unchanged lease/legacy behavior, and verified-revision readiness/CAS for P2, including current revisions after effects/handoff. It did not run the PostgreSQL batches, full suite or provider; those results above are the implementation agent's separate verification.

Windows historical `track-c-c3-v5/v4` alias was materialized only during the full worker run and then restored byte-exact. No skipped optional PostgreSQL/ACL tests are qualified by the unit suite. Historical full eval479PASS is unchanged earlier-source evidence, not rerun for this worker/database correction. Remote CI is not inferred from local checks. No provider generations were run.

Complexity from cb8bb5e:3production files changed,0new production modules/tables/stores/migrations/semantic roles or prompt changes. Existing CAS/Inbox/readiness boundaries own both fixes; two test files and one isolated-harness regression provide the additional coverage.

**Recommendation remains STOP for sales acceptance/live activation.** The earlier model evidence stays attached to its original source SHAs; it does not qualify this correction. Natural sales wording, real-source private checkout, final receipt consumption by the real verifier and live delivery remain previously disclosed limitations.
