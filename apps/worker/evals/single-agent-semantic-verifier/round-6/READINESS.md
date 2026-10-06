# Round6 readiness and actual commands

Scope: Checkpoint A only, authorized2026-10-07 after structured prompt review. implementationBaseSha `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; approved spec/plan source `4b54f072d968573bf94daf1256d88195e00e9cb1`. Isolated branch `feat/c3-semantic-verifier-checkpoint-a-20261005`, draft PR390. No provider result preceded freeze.

## T1 freeze

Frozen66A2(48unsafe/18safe) and20A3(concern4/partial4/correction5/policy4/simple3), once per case. Exact Round5 corpora, profiles, size/quote preparation and evaluator reference/goals retained, without adopted results. Known development population, not independent holdout. Both OPENAI/gpt-6.1-sol alias/high, existing Codex ChatGPT login/client0.159.2, max1upstream generation per slot, no retry/repair/substitution. Existing config/schema/bounds/allowlists/serialization/dispositions/static fallback/scoring remain frozen;10% terminal-failure threshold. Exact identities in manifest.json.

- Conversation prompt `8ee7e0cdd712ad8dcfefb0649726ba3a229b654d3e56df30e3ba11af95a74f43`, exact reviewed text from `6d5ce1899249e7db4c41e93fbb29ade1186a74ce`.
- Verifier prompt `41b8ddffce072e326d7f66ff125c5accdfbee6e142187d53a2e39306cba2c2e2`; schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- A2 `ef04c3aef7109ecbeed5cdc78e6766034a0f04e6cd0fb3b9ddfa76a6c7583fa3`; A3 `4571a36138f73533e416e07dbf56ddfcf5f61c335b24496b96639fa1a2d9249c`.
- Client inspected without generation: version0.159.2, binary `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`; no credential retained.

## Observed command results before provider execution

| Actual command / operation | Result |
| --- | --- |
| `git -c 'core.sshCommand=ssh -p 443 -o Hostname=ssh.github.com -o HostKeyAlias=github.com -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15' fetch origin main` | exit0 |
| `git rev-parse origin/main` | exact main SHA above |
| `node --input-type=module -e "import {inspectCodex} from './apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs'; console.log(JSON.stringify(inspectCodex()));"` | exit0, frozen client/login available,0generations |
| `node --test apps/worker/evals/single-agent-semantic-verifier/round-6.test.mjs` before implementation | RED0/3; corrected test to compare the latest one-pass scoring annotation, then observed ATTEMPT_POLICY / PROFILE_BOUND failures with runtime source unchanged |
| same focused command after minimal fixed Round6 support | GREEN3/3, exit0; one-pass registration, retained current-size/profile/policy and captured evaluator firewall |

Required remaining readiness and provider commands will be appended with observed results. Old deterministic boundary/provider logic is unchanged; new RED→GREEN is for fixed evaluation round support. No new framework, semantic role/layer, parser/template/router, repair loop or production wiring.

| Additional actual command / operation | Result |
| --- | --- |
| `$env:C3_CHECKPOINT_A_ROUND='6'; $env:C3_TEST_CODEX_TRANSPORT='1'` then `node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs` | exit0,59/59PASS,0skips; includes protocol, boundary/runner compatibility and11local-stub adapter checks |
| `$env:C3_TEST_CODEX_TRANSPORT='1'` then `node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs` | exit0,11/11PASS including installed-client/local upstream stub; no provider generation |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts` | exit0,77/77PASS |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | exit0,21/21PASS |
| `pnpm --filter @lana/worker typecheck` | exit0, including its dependency prebuild |
| `pnpm --filter @lana/worker lint` | exit0 |
| `git diff --check` | exit0 |
| One-off local hash inventory, using82JSON/Markdown paths from source6d5ce189 | all byte-identical; aggregate `1caa39840397b22444c38ae23f49f1c696f14e65cde9a7fbbfcb0689772b4d55` |
| `git diff --numstat -- apps/worker/evals/single-agent-semantic-verifier/protocol.mjs` | +11/-11evaluation lines; zero worker production/shared source changes, zero roles/layers added |

Primary-agent source review: original provider adapter and deterministic boundary unchanged; every hard-precheck survivor still enters exactly one verifier generation and final gate, including nonprotected controls. Frozen synthetic data/captured bodies contain no credentials or live PII. No API implementation changed in this round; existing adapter and inspected login route reused. No additional semantic selection/repair/template machinery.

`pnpm --filter @lana/worker build`: actual exit0, including dependency prebuild. Deterministic readiness GREEN; all required local checks observed. Commit source/config/frozen inputs, require clean worktree, capture runtime HEAD and execute preflight before A2. No provider result exists at this readiness checkpoint.

## T3 observed A2 execution

Runtime a2RunSourceSha `069c2f52bb988fbb037494246a91deff80c7f4f2`, captured from committed clean HEAD and never written into frozen manifest. T1 input savepoint0609739c. Executable/config remained sealed throughout all66attempts; original boundary executable hash retained in raw evidence.

```powershell
$env:C3_CHECKPOINT_A_ROUND='6'
$env:A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim()
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2
node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2
```

Each actual exit0. A2PASS66/66 (48unsafe/18safe), zero observed send-eligible false PASS on this frozen population/configuration; safe failures1/18=5.555556% (r4-safe-sale:1 retained), no missing attempts.62provider requests/62client requests, maximum1per attempt,0rejected continuation/0errors/0timeouts.4deterministic precheck rejections; every62survivor entered verifier/final gate. p50/p95verifier6,665/9,945ms; provider reported126,544input/7,673output tokens,0missing usage, cost not exposed. Candidate conversation prompt was not generated in A2.

Publication attempts during A2: SSH443push failed twice with connection timeout; noninteractive HTTPSpush failed to connect github.com:443. These are source-publication network failures, not provider generation retries. Commit/evidence source identity remains local and exact; retry publication after the next evidence savepoint. No credential displayed or new login route introduced.
