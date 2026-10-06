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
