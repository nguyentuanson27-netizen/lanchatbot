# Commands actually run

Working directory: `C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005`.

## Eval selector verification

1. `node --test apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs` trước implementation: exit 1, missing `selectStatefulThrough` export (RED observed).
2. Cùng focused command sau implementation: exit 0, 4 PASS (GREEN).
3. `node --test apps/worker/evals/single-agent-commerce-read-only/*.test.mjs`: exit 0, 108 PASS.
4. `node --check apps/worker/evals/single-agent-commerce-read-only/stateful-provider.mjs`: exit 0.
5. `git diff --check`: exit 0 trước seal; line-ending warnings không phải lỗi test.

Source savepoint: `git commit -m "eval: retain stateful prerequisites for targeted fallback reruns"` → `24d8ec62457f95865c80719a2e0c08fea697c657`; clean source được runner kiểm trước mỗi job và sau toàn bộ run.

## Provider execution

Read-only quota check dùng installed Codex `app-server --stdio`, handshake `initialize`/`initialized`, rồi `account/rateLimits/read`. 0 generation; ordinary usage allowed; không refresh/reset/mua credit hoặc đổi route. Không lưu account/token data.

`python ../c3-b-fallback19-rerun-20261022/run.py` → exit 0; 9 child commands exit 0. Exact subprocess argument arrays, timestamps và exit codes: [commands.json](commands.json).

- B1 preflight `run.mjs --config .../source-config.b1.json --cases .../cases.b1.json --out .../b1-head --range 1:1 --preflight`.
- Opening preflight `isolated-integration.mjs .../openings COD --provider-run --journey-openings --opening-only --provider-preflight`.
- Stateful preflight `isolated-integration.mjs .../stateful COD --provider-run --through-case stateful-correction --provider-preflight`: registered 4 public turns, 0 private, cap 16 generation requests.
- Negotiation preflight `isolated-integration.mjs .../negotiation COD --provider-run --negotiation-probe --provider-preflight`.
- B1 dispatch `run.mjs ... --range 1:1 --run`, rồi `--range 11:24 --run`, hai output directories riêng. Mỗi B1 invocation build worker từ source trước khi import dist.
- Opening dispatch `--journey-openings --opening-only`: 1 outcome.
- Stateful dispatch `--through-case stateful-correction`: 4 outcomes = 2 prerequisite + 2 target.
- Negotiation dispatch `--negotiation-probe`: 3 outcomes = 2 prerequisite + 1 target.

Tất cả child commands đi qua existing `model-code-division-run-20261019/raw/credential-launcher.py`, credential được giữ ngoài repo và xóa theo launcher; không đưa secrets vào command/report. Không automatic generation retry.

## Collection

`python ../c3-b-fallback19-rerun-20261022/collect.py` và `python ../c3-b-fallback19-rerun-20261022/conversations.py` → exit 0; đủ 19 targets + 4 prerequisites. Các lần đọc partial metadata không dispatch model. Sau run kiểm request IDs/count/model identity/leaks, cart/profile/negotiation readbacks và database cleanup; lưu byte hashes khi copy evidence vào repo.
