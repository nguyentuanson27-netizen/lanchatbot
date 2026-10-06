# Round7 readiness and actual command evidence

implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`, refreshed with SSH443 `git fetch origin main`, then `git rev-parse origin/main`; both exit0. Existing isolated branch/PR390 reused, initial tree clean.

## Preparation and freeze

Read current spec/amendment/plan/todo/project instructions, all20 Round6 histories and exact outcomes, prompt, code projection, scoring and relevant supplied data. Root-cause report and shorter task-centered prompt committed in spec/plan source `3656dc663136e6c4ec3c7a7fc78f57ea3bb48d6d`. Existing adapter `inspectCodex()` actually run without generation: client0.159.2, binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`, required ChatGPT login available. No auth/token value retained.

Freeze66A2 (48unsafe/18safe),24A3 (concern5/partial5/correction5/policy6/simple3), one attempt/case. Owner prompt7871 UTF-8 bytes versus9797 prior; exact hash/config and unchanged verifier/schema/authority/bars in manifest. Four new development contrasts use existing trusted data/size bindings. Prior20A3 values,66A2, profile/size/quote/reference files remain unchanged. No result files/provider generation before freeze. Both mutable model aliases/high/login unchanged; no provider API implementation changed or model substituted.

## Observed RED

```powershell
$env:C3_CHECKPOINT_A_ROUND='7'
node --test apps/worker/evals/single-agent-semantic-verifier/round-7.test.mjs
```

Actual exit1, module rejected UNKNOWN_CHECKPOINT_ROUND before tests. Repeated with existing round6 selector to exercise actual contracts against the new manifest:

```powershell
$env:C3_CHECKPOINT_A_ROUND='6'
node --test apps/worker/evals/single-agent-semantic-verifier/round-7.test.mjs
```

Actual exit1,0/3PASS: ATTEMPT_POLICY for frozen one-pass Round7 and PROFILE_BOUND for both direct/captured projections. Runtime implementation unchanged during RED; these are unsupported new-round contracts, not semantic-quality proof. GREEN/readiness/provider run evidence follows only after the minimum fixed support change.
