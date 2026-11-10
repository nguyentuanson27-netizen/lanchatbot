# Commands và kết quả thực tế

Working directory: repository `lanchatbot-c3-semantic-verifier-checkpoint-a-20261005`; PowerShell, Node24.19.0, pnpm10.12.4, Python3.11. Exact commands/exit/log hashes nằm trong [PREPARATION.json](PREPARATION.json). Không coi mock/local-stub test là provider evidence.

| Command | Kết quả |
|---|---|
| `git fetch origin main` / `git rev-parse origin/main` | main `296cdcfbf5759f5bf9cbb24acf3dc63005589361` |
| `node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs` | RED import chưa tồn tại; RED provider tool output không bị chặn; RED empty declarations; RED official string-content projection; từng bước GREEN. Final comparison6/6 trong group phía dưới |
| `node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs` |36PASS/1optionalSKIP; chạy lại sau final wire change |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-read-only.test.ts` |60PASS |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` |21PASS |
| `pnpm --filter @lana/worker test` |126files/1713PASS; eval466PASS/2optionalSKIP trước cache correction |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-sources.test.ts` |cache regression RED:5PASS/2FAIL |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-sources.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-read-only.test.ts` |cache correction GREEN90PASS |
| `pnpm --filter @lana/worker exec vitest run src` |sau cache fix:126files/1715PASS. Node suite không chạy lại vì TS source change không đổi Node adapter/protocol functions đã kiểm |
| `pnpm --filter @lana/worker typecheck` |PASS, chạy lại sau cache fix |
| `pnpm --filter @lana/worker build` |PASS, chạy lại sau cache fix; mỗi evaluation CLI cũng build từ source trước import dist |
| `pnpm --filter @lana/worker lint` |PASS, chạy lại sau cache fix |
| `git diff --check` |PASS trước source seal và delivery |

Existing Windows link-text alias `apps/worker/evals/track-c-c3-v5/v4` được thay tạm bằng junction tới existing v2 chỉ trong full worker checks, rồi finally restore byte-exact. Alias không nằm trong diff. Hai optional skips là installed Codex-login/local-stub checks; provider thực bên dưới đã dùng login thành công.

Hai command cuối chạy qua bridge hiện có, dùng C3_VERTEX_CREDENTIAL_FILE trỏ existing approved local service-account file; không ghi credential vào repo. `$comparisonTemp` thực tế là `C:/Users/nguye/AppData/Local/Temp/c3-b-owner-comparison-20261015`.

```powershell
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --preflight --out (Join-Path $comparisonTemp 'preflight-current')
py -3.11 apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/owner-comparison.mjs --run --out (Join-Path $comparisonTemp 'raw')
```

Trên clean source `695f126db30aeeb5369bb2eefefedd8fafd24c64`: preflight `SOURCE_PREFLIGHT_PASS`,0generation, policyReads2. Run `COMPLETE_REVIEW_PENDING`,12/12outcomes,24generation requests,24HTTP200,0generation retry/error/timeout; captures ghi nhận ownerSolLow/verifierHigh. Không live send.

Preliminary `--preflight --out .../preflight` trên b11ac53a PASS0generation; sau documented history fix, `--preflight --out .../preflight-final` trên97dcbbc4 bị chủ động dừng trước generation để sửa cache; exit-1, chưa có raw provider directory. Hai seal này không có provider results để adopt hoặc bỏ khỏi denominator. Không có generation rerun trên695f.

Post-run offline commands thực sự chạy:

```powershell
py -3.11 (Join-Path $comparisonTemp 'primary-input.py')
py -3.11 (Join-Path $comparisonTemp 'metrics.py')
node (Join-Path $comparisonTemp 'binding-audit.mjs')
```

Raw commit trước primary; terminal-only extraction12/12; primary commit trước rejection diagnostics. Metrics audit xác nhận12registered outcomes,24unique requests,30captured body records không evaluator labels và input equality. Binding audit PASS12draft/snapshot/readback,18disk/Git raw blobs, historical A/prior B evidence unchanged. Offline scripts chỉ tổng hợp evidence, không gọi model hoặc tự chấm ngôn ngữ. Primary semantic/quality findings do agent đọc toàn reply, không human acceptance.
