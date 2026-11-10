# Commands actually run — 2026-10-16

Working directory: repository root. This task ran models and reviewed evidence; it did not change runtime, prompts, configuration or corpora. Exit 0 from a collector means collection completed, not sales acceptance or checkout success.

## Main, route and preflight

```powershell
git fetch origin main
git rev-parse origin/main
$env:C3_VERTEX_CREDENTIAL_FILE = (Get-Content -LiteralPath (Join-Path $env:TEMP 'c3-approved-vertex-route.txt') -Raw).Trim()
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-model-freeze-20261016.mjs
```

All exit 0. Refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Config preflight: `CONFIG_READY_CONNECTIONS_UNVERIFIED`, zero generations, Codex CLI 0.159.2. The route file supplies the already approved credential path; no credential contents were printed or committed. Frozen inputs and scope were committed as `183ad77ef8116a28c0f6cbec22056a9ae5b29f2b` before any generation. Subsequent runtime source checks used that clean HEAD.

```powershell
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-reviewed-model-preflight-unused-183ad77e-20261016 COD --provider-preflight
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out C:/Users/nguye/AppData/Local/Temp/c3-reviewed-model-source-183ad77e-20261016
```

Both exit 0: `PREFLIGHT_PASS` / `SOURCE_ADAPTERS_READ_BACK`, zero owner/verifier generations. Source check includes canonical worker build and one source embedding invocation. Retained [stateful preflight](stateful-preflight.json) and [source readback](source-readback.json). This was not a rerun of the PostgreSQL COD/bank controls.

## Exactly two model batches

```powershell
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out C:/Users/nguye/AppData/Local/Temp/c3-reviewed-model-b1-183ad77e-20261016
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-reviewed-model-stateful-183ad77e-20261016 COD --provider-run
```

Sequential, unchanged HEAD/config, one attempt per registered case. B1 exit 0 / `AWAITING_WHOLE_REPLY_REVIEW`: 24/24 outcomes, 77 generation HTTP requests, canonical worker build before dispatch. Stateful exit 0 / `COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW`: 7/7 outcomes, 13 generation HTTP requests, owned provider database dropped. Combined execution session completed with exit 0. No interrupted/unrecorded terminal in this batch, automatic retry, replacement attempt or second run.

Total: 31 outcomes, 65 owner + 25 verifier = 90 generation invocations/HTTP requests, against maximum 120. One B1 HTTP 200 had no valid completion and remains an error in the denominator. Two B1 final-only requests returned tools and were blocked without executing them. Source embedding invocations are separate: one in B1, zero stateful, plus the source-check invocation above.

## Preserve raw → primary review → audit/diagnosis

These temporary offline helpers only read/copy the completed output or derive reports; none calls a provider or changes executable inputs.

```powershell
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-model-preserve-20261016.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-model-primary-view-20261016.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-model-primary-review-20261016.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-model-audit-20261016.mjs
```

Preservation exit 0: 39 exact raw/source/preflight file hashes and secret-pattern scan, committed at `725c47654b9ceb44bfd55337d2a39cad99447ef7`. Primary view/review exit 0: all 31 whole actual terminal outcomes reviewed without rejected drafts/verdict details, committed at `389fa3550f721f4cd530cc3381c8967e95eca9a4` before diagnosis.

The first audit invocation failed with `EVALUATOR_VALUE_LEAK`: the offline auditor treated every occurrence of evaluator purpose `PRICE` as a leak, including the legitimate protected fact type. Corrected that assumption only in the temporary auditor; continued checking forbidden evaluator keys, distinct case IDs/full evaluator prose and nested JSON. No source, request, raw evidence, primary label or model result changed. Subsequent audit invocations exited 0 and derived the retained audits/metrics/accounting. Later offline extensions checked runtime latest/history, verifier client-request counts and code-only private mode; they made no model requests. Final audit verifies all 39 disk/Git raw hashes, 65 native dispatch hashes, 25 exact verifier bindings, zero evaluator/private-input leaks in measured scope and complete request accounting.

Read-only source/report inspections and summary calculations followed. Official Vertex function-calling documentation was checked for the final-only diagnostic; supporting links and limits are in [DIAGNOSTICS.md](DIAGNOSTICS.md). No new API/client implementation was made.

## Verification reused, not rerun

The unchanged executable remains `777616ddf32b3b824d50fb753828c370c275adc2`. [Preceding implementation commands/results](../reviewed-fix-20261016/IMPLEMENTATION.md) supply worker 1779 PASS, eval 485 PASS / 2 optional SKIP, focused 123 / provider-protocol 31 / protected-reply 21 PASS, worker typecheck/build/lint exit 0. Shared source remains unchanged from its recorded checks: contracts 222 / business-tools 356 / database 246 PASS with 30 optional PostgreSQL SKIP, typecheck/build exit 0. Real PostgreSQL COD and BANK_TRANSFER composition controls each passed 12/12 at the executable source; their owned databases were dropped.

Those commands and controls were **not rerun** in this model-only task. Canonical builds inside source-check/B1 runner are the new build executions. No full-repository `pnpm check` or remote CI PASS is claimed.

## Documentation closeout

```powershell
git diff --check
node C:/Users/nguye/AppData/Local/Temp/c3-reviewed-model-closeout-20261016.mjs
```

Both exit 0. Offline closeout: 48 JSON files and 215 JSONL rows parse, 21 local Markdown links resolve, all 39 raw hashes and six committed primary blobs remain unchanged, zero secret-pattern matches and no source/config changes outside evidence/tasks. This check makes zero provider requests. Branch delivery uses the existing draft PR391; no merge, deployment or live send is part of the task.
