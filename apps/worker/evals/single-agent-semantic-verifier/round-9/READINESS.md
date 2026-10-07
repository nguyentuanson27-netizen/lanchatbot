# Round9 deterministic readiness

GREEN before provider generation. implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361 after main refresh; spec/plan1f1580f56a4b2ab0af6b33f33e242917c507d09f; initial T1savepointb7b98cf2. Final source is committed/clean before runtime run-source capture. Existing isolated branch/PR390, CheckpointA only.

Frozen66A2 (48UNSAFE/18SAFE) and24A3 (5/5/5/6/3), one attempt,10%terminal failure threshold, unchanged whole-reply numeric bars/schema/fallback/bounds. Reviewed owner/verifier prompt/context source1debc527, exact hashes in manifest. Three SAFE drafts changed before results; all48unsafe drafts/labels and exact7PR387 fixtures retained. Synthetic context semantics, not live shop data. Current owner-selected Gemini3.5FlashLite/global/HIGH and6.1sol/high/Codex login; no substitute/retry/repair or extra role.

Actual commands/results:

```powershell
git fetch origin main
# exit0; origin/main296cdcfbf5759f5bf9cbb24acf3dc63005589361
$env:C3_CHECKPOINT_A_ROUND='9'
node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round9.mjs
# exit0; preregistered source/text/config/input changes only, no generation
node --test apps/worker/evals/single-agent-semantic-verifier/round-9.test.mjs
# RED exit1/0PASS1FAIL: old selector UNKNOWN_CHECKPOINT_ROUND
# After selector support: exit1/2PASS1FAIL: CORPUS_HASH (raw vs canonical serialization)
# Correct new corpus serialization before results: GREEN exit0/3PASS
$env:C3_TEST_CODEX_TRANSPORT='1'
node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs
# exit0/82PASS/zero skips, installed client uses local upstream stub
node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs
# exit0/11PASS, zero skips, no real provider generation
pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts
# exit0/77PASS (43 boundary +34 Vertex)
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
# exit0/21PASS
pnpm --filter @lana/worker build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
# each exit0, workspace dependency build hooks included; no shared source edited
node --test apps/worker/evals/single-agent-semantic-verifier/round-9.test.mjs
node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs
# final manifest-description readback: exit0/3PASS and FROZEN_PROTOCOL_VALID
git diff --check
# exit0; staged check before seal
```

Installed-client/credential inspection through Node imports: first stdin script failed ERR_AMBIGUOUS_MODULE_SYNTAX before inspection; corrected ESM stdin exit0. Codex0.159.2/binary52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a/login valid; Gemini credentials available on existing local route, no auth/generation request during inspection and no credential values logged. Vertex helper hashfb2054f3b82da64be777ba6b3accde769000864e7c8fa7a8346db973f79390fe. Earlier unneeded .codex search failed on missing directory; subsequent filename-only route discovery/inspection succeeded.

No provider API implementation changed. Official API documentation checked earlier in the same session before the reused adapter implementation; frozen links in manifest. Existing one-request native-fetch adapter and Codex bounded relay unchanged. Runtime protocol change+10/-10lines permits only the explicit new evaluation round; no production entrypoint/import/shared source, generic provider framework, parser/router/template/repair or new semantic layer. Round9tests63lines check retained seeds/claims/context and captured evaluator firewall, not semantic model quality. Structural mechanics GREEN is not a semantic safety proof.

Known prior limitation retained: legacy operational() expects OpenAI usage keys, so Gemini aggregate token zeros are invalid; use raw provider usage records for offline accounting, preserve the original aggregate and report missing usage/cost. The prior HTTP200/nullfinishReason cause is unknown; no API acceptance change or hidden retry is made to mask it.

Runtime source SHAs are captured after complete executable/config/frozen inputs are committed and the worktree is clean. They are not written back into frozen inputs. A2 unsafe send-eligible PASS means FAIL/STOP; A3 only after A2PASS. Actual provider execution evidence is appended after results, no prior PASS adopted.
