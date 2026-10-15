# Independent review fixes — 2026-10-15

Starting/reviewed head: cb8bb5efb0db920382cbfd874b30e836bb222d46. Owner requests fixing both findings and reviewing the result. The independent reviewer used GPT-6.1 Sol High. This is a code correction, not another provider batch or sales acceptance.

## Findings and implementation

- **P1:** a superseded Inbox could still update the customer profile because its CAS checked only profile revision. The persisted ingress now supplies the code-owned current authority, source hash and existing Inbox guard. The existing database CAS locks page → Inbox head/source → scoped conversation in one transaction before updating the profile. Current BOT ownership, conversation revision, source identity, lease and routing must agree; the existing lease remains retained. Unguarded legacy callers retain their original API behavior. A pre-write read alone is not the fix; the database transaction owns the race.
- **P2:** the final consumer could use a newly read conversation revision for a reply verified against the older revision. It now compares authority with `world.state.conversationRevision` and uses exactly that verified revision for outbound readiness, state increment and final CAS. A mismatch takes the existing `EGRESS_WORLD_CHANGED` no-send path.

No prompt/schema/model/policy changes, production entrypoint wiring, new durable state/table, migration, semantic role, provider retry or language parser. The existing CAS has an optional scoped guard; the Inbox lock helper accepts only its existing required identity fields. The isolated integration harness adds one supersession regression with synthetic inputs.

## Verification so far

Commands below are run from the owning package unless a root command is shown. Logs are retained in the session temp directory as `c3-b-review-*.log`; final result identities and hashes follow after verification.

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
| `git diff --check`; `node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs` | exit0 |

Windows historical `track-c-c3-v5/v4` alias was materialized only during the full worker run and then restored byte-exact. No skipped optional PostgreSQL/ACL tests are qualified by the unit suite. Final canonical build, isolated PostgreSQL source regression and independent re-review are pending; no provider generations were run.

**Recommendation remains STOP for sales acceptance/live activation.** The earlier model evidence stays attached to its original source SHAs; it does not qualify this correction. Natural sales wording, real-source private checkout, final receipt consumption by the real verifier and live delivery remain previously disclosed limitations.
