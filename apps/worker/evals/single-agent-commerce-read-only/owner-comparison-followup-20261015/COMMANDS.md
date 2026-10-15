# Commands thực chạy

Repo: lanchatbot-c3-semantic-verifier-checkpoint-a-20261005; PowerShell, Node24.19.0, pnpm10.12.4, Python3.11. Full command/log hashes trong PREPARATION.json.

| Command | Kết quả |
|---|---|
| git fetch origin main / git rev-parse origin/main | 296cdcfbf5759f5bf9cbb24acf3dc63005589361 |
| node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs | RED exit1 vì thiếu export; GREEN7/7 |
| `node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs` | 37PASS/1optionalSKIP, exit0 |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-read-only.test.ts` | 60PASS, exit0 |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | 21PASS, exit0 |
| `pnpm --filter @lana/worker test` | 126worker files/1715PASS;467evalPASS/2optionalSKIP, exit0 |
| `pnpm --filter @lana/worker typecheck` | PASS, exit0 |
| `pnpm --filter @lana/worker build` | PASS, exit0 |
| `pnpm --filter @lana/worker lint` | PASS, exit0 |
| git diff --check | PASS trước source seal cuối |

Windows tracked v4 link-text đã tạm thay bằng junction trong full worker checks; finally restore byte-exact, không nằm trong diff. Hai optional skips không phải provider evidence. Không sửa shared package hoặc production entrypoint.

Source run chốt trước generation:08b98c2cab0351d4e90d294b51063e94012c45f4; clean executable/config worktree. Preflight0generation/source readbackPASS, policyReads2. Route credentials đã có, chỉ giữ trong process; không log hoặc copy secret vào Git.

```powershell
$comparisonFollowupTemp='C:/Users/nguye/AppData/Local/Temp/c3-b-owner-comparison-followup-20261015'
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --manifest apps/worker/evals/single-agent-commerce-read-only/owner-comparison-followup-20261015/manifest.json --preflight --out (Join-Path $comparisonFollowupTemp 'preflight')
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --manifest apps/worker/evals/single-agent-commerce-read-only/owner-comparison-followup-20261015/manifest.json --run --out (Join-Path $comparisonFollowupTemp 'raw')
```

Caller supplies C3_VERTEX_CREDENTIAL_FILE from the existing approved local service-account file; private material stays outside Git. Provider batch completion and post-run offline commands are appended only after observed results.

Observed provider completion:COMPLETE_REVIEW_PENDING/native exit0,12/12outcomes,24HTTP200,0retry/error/timeout. Rawc550d950 sealed before primarya7b2b658, then rejection diagnosis.

Post-run offline commands actually run:

```powershell
py -3.11 (Join-Path $comparisonFollowupTemp 'primary-input.py')
py -3.11 (Join-Path $comparisonFollowupTemp 'metrics.py')
node (Join-Path $comparisonFollowupTemp 'binding-audit.mjs')
```

PRIMARY_CONTEXT/INPUT extraction is terminal/source-only. Raw18disk/Git blobs,12bindings/readbacks/effort/prompt hashes/source history auditPASS;30envelope records firewall/input equalityPASS,24unique requests. Scripts run offline and do not generate or automatically score semantics. Primary safety/style is subjective whole-turn reading, not a human verdict. No post-result provider generation or executable/config change.
