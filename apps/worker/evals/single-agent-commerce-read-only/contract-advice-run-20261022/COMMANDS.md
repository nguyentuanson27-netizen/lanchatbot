# Commands thực sự chạy — 22/10/2026

Repo root `C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005`. Không live deploy/send. Command logs giữ byte gốc; script vận hành chạy từ external evidence folder `../c3-b-contract-advice-20261022`, bản copy trong report chỉ lưu evidence, không tự rerun đè data cũ.

## Deterministic verification

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-state.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-effects.test.ts
node --test --test-name-pattern="state operation schema" apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/snapshot-diagnosis.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/image-comparison.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-state.test.ts src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-read-only-tools.test.ts src/realtime-sales-catalog.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/worker exec vitest run src
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Observed RED7fail/150pass →GREEN157; schema missinganyOf RED→58adapterPASS; diagnosis missingmodule/claimoverwrite RED→3PASS; fitquote RED2→GREEN. First typecheck FAIL nullable discount, fixed before final. One new resolver fixture expected CONFLICT with non-southern final component, fixed fixture to actual helper contract; no geography/parser change. Image composed test initially lacked content-type header in fake Response, corrected fixture, final4PASS. Artifact generation script initially SyntaxError, fixed before copy; no provider rerun. Final fullworker1954/Node107/business21PASS, typecheck/build/lintPASS. Fullworker includes final focused coverage; no shared package change.

## Source/access checks and isolated controls

```text
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node ../c3-b-contract-advice-20261022/catalog-audit.mjs
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node ../c3-b-contract-advice-20261022/catalog-products.mjs
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node ../c3-b-contract-advice-20261022/image-prerequisite.mjs
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs ../c3-b-contract-advice-20261022/cod-control COD
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs unused COD --provider-preflight
python apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/raw/credential-launcher.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/cases.b1.json --out ../c3-b-contract-advice-20261022/source-check --source-check
python ../c3-b-contract-advice-20261022/run.py
```

All exit0. run.py froze currentHEAD/cleanworktree/inputhashes and invoked5jobs once, openings→B1→stateful→negotiation→BANKcontrol; exact argv/exits in commands.json. COD32/BANK32PASS;5DBsdropped. SourcecheckPASS/1embedding/0generation; imageprerequisitePASS/0generation. Provider campaign110generationHTTP,21verifier429 retained,0automatic generation retry. Exit0 is collection completion, not qualityPASS. T5 providercommand **NOT_RUN**, no a separate runSourceSha.

Source official-doc lookup used Vertex function-calling docs; one reference URL404 was not used as API evidence. GitHub connector fetch_pr failed Transport closed; read-only gh pr view used as fallback. No claim remoteCI PASS.

Evidence staging lần đầu báo CRLF là whitespace vì raw capture dùng -text. Đã cấu hình whitespace=cr-at-eol,-blank-at-eof chỉ trong evidence directory và bỏ whitespace thừa ở Markdown presentation; không đổi raw bytes/hash. Final staged check/hash readback được kiểm riêng.
