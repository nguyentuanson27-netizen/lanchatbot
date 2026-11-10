# Post-review Phase B test replay — STOP

Đã chạy đủ **7/7lượt, mỗi lượt1lần** theo [scope đã freeze](SCOPE.md). Owner Vertex **Gemini3.5FlashLite High**, verifier Codex-login **GPT-6.1 Sol High**. Kết quả: **4fallback,2handoff,1no-send;0send-eligible**, không tạo được giỏ. Bốn lượt mua/tư vấn chính đều không hữu ích ở terminal outcome; các handoff/no-send là kiểm soát chức năng, không phải hoàn tất bán hàng. [Đọc toàn bộ7lượt](CONVERSATIONS.md), [primary review](PRIMARY_REVIEW.json), [chẩn đoán sau review](DIAGNOSTICS.md).

## Source, phạm vi và kiểm tra trước model

- implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; last executable correction `0bbabeafa8bea8b024a05af6d8893a3c1c502a8f`.
- Runtime runSourceSha: `d9d96e4b2f035941f8ac0afa2ac25d5536da8f1c`, sau commit scope và clean executable/config worktree. Không có executable diff từ bản đã review0bbabea; các commit sau run là raw/review/report.
- Raw commit `58ca01e43036d6635ae55c493aae5944635ebd65` trước primary commit `eddcfc641cc7828ce4880e47a211b4f7a8f836ed`, rồi mới audit/diagnosis. [Raw byte hashes](RAW_HASHES.json), [preparation/spec-plan blob identities và log hashes](PREPARATION.json).
- Architecture blob `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a`; amendment blob `4a09b55d2f3a972a65697738876cc5eab21e7a2b`. B execution/plan references trong PREPARATION, tasks hiện hành và scope.
- Fresh focused tests tại d6b28f8, cùng executable: worker118PASS/database48PASS/protocol+provider23PASS. Clean d9d96e4 PostgreSQL COD12/12 và BANK_TRANSFER12/12groupsPASS; cả hai database thử đã drop. Zero-generation final preflightPASS. [COD](integration-cod.json), [bank](integration-bank.json), [preflight](preflight.json).
- Full worker1756PASS, database246PASS+30optionalSKIP, canonical worker/database build, typecheck và lint là bằng chứng0bbabea đã báo trước; không claim chạy lại full suite/build trong batch này. Không thay source/prompt/schema/model/policy hoặc production entrypoint.

Generation commands thực chạy từ repo root:

```text
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-b-post-review-cod-d9d96e4 COD --composed-only
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-b-post-review-bank-d9d96e4 BANK_TRANSFER --composed-only
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-b-post-review-preflight-d9d96e4 COD --provider-preflight
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-b-post-review-provider-d9d96e4 COD --provider-run
```

Đều exit0; provider exit0 chỉ nghĩa là thu đủ dữ liệu, không phải chất lượng PASS. Approved credential route được dùng qua biến môi trường, test Codex transport tắt. Focused commands thực chạy:

```text
# cwd apps/worker
pnpm exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-semantic-verifier-boundary.test.ts
node --test evals/single-agent-commerce-read-only/protocol.test.mjs evals/single-agent-commerce-read-only/gemini-inference.test.mjs
# cwd packages/database
pnpm exec vitest run src/realtime-customer-profile-guard.test.ts src/realtime-runtime.test.ts
```

Stdout/hash nằm ở PREPARATION logs. Thêm một initial preflight ởd6b28f8,0generationPASS; không phải batch model khác. Offline audit thực chạy: `node C:/Users/nguye/AppData/Local/Temp/c3-b-post-review-audit.mjs apps/worker/evals/single-agent-commerce-read-only/stateful-post-review-20261015` từ repo root, exit0. Audit phân biệt prepared envelope với dispatch và kiểm cả JSON payload nằm trong string; không gọi model.

## Frozen configuration và audit

[Registration đầy đủ](raw/registration.json): owner Vertex/global, candidate1, max8192output tokens, HIGH thinking, không include thoughts; temperature/topP omitted. Verifier CLI0.159.2, binarySHA256`52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`, model/effort6.1SolHigh, tools0, strict JSON, một upstream request/attempt, không retry; timeout90s. Model version là mutable alias quan sát được, không phải dated snapshot bất biến.

| Frozen input | SHA-256 |
| --- | --- |
| Owner prompt | `81b17e0e6854fdb89403d54995bac7f0f48418c10efece346db9f5f678848c11` |
| Verifier prompt | `fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957` |
| Verdict schema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| Native declarations | `be4e8ff1ccb2e5eefe26e5c3d7c15fef913ea5e84e43096bd091d592939e969d` |
| Seven-case corpus | `51d53b26a9d85ee37786a269df1700cbbe9b4b2fd16ec243bc4a2bce56f3a749` |
| External source config | `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e` |

[Audit](AUDIT.json) kiểm10raw disk/Git blobs,14prepared request envelopes,15unique generation IDs,2exact verifier draft/snapshot bindings và2actual Codex relay bodies;0evaluator-label leak/0private-checkout value leak, không attempt bị bỏ. Gemini wire proof là prepared body cộng adapter fake-HTTP capture tests, không có independent live body echo. Không có lời gọi giỏ nào trong toàn bộ owner output. Mẫu này không có reply send-eligible; kết quả chỉ mô tả population/configuration đã chạy và usability quan sát được.

## Accounting và vận hành

[Complete request accounting](REQUEST_ACCOUNTING.json), [metrics](METRICS.json).

| Chỉ số | Quan sát |
| --- | ---: |
| Registered/completed outcomes | 7/7 |
| Registered generation invocations | 15 |
| Owner/verifier invocations | 13/2 |
| Actual generation HTTP requests | 14:12owner+2verifier |
| Pre-dispatch client failure | 1:OWNER_REQUEST_BOUND,0HTTP |
| HTTP error/timeout/retry | 0/0/0 |
| Runtime generation error rate | 1/15 =6.67% |
| Verifier PASS/FAIL | 0/2 |
| SEND_ELIGIBLE/fallback/handoff/no-send | 0/4/2/1 |
| Fallback rate | 4/7 =57.14% |
| Handoff/no-send rate | 2/7 =28.57%;1/7 =14.29% |
| Combined fallback/handoff/no-send | 100% |
| Input/output tokens | 61,634/8,893 trên14dispatched generations |
| Provider cost | null:provider không expose, không thay bằng estimate |
| Verifier latency p50/p95 | 11.921s/13.447s,N2 |
| Added verification latency p50/p95 | 17.852s/20.194s,N2 |
| Whole-turn latency p50/p95 | 27.967s/59.076s,N7 |
| Runtime tool calls | 14 |
| Known owner OAuth exchange/embedding calls | 1/0;Codex auth count không expose |

Percentiles là nearest-rank mô tả mẫu nhỏ; whole-turn gồm code/state/Outbox capture, không phải live customer delivery latency. Không có bất kỳ generation retry hoặc lượt thay thế lỗi. Tất cả14HTTP200; lỗi thứ15 xảy ra trước API và vẫn nằm trong denominator. Khác với batch trước, code lỗi client nay được giữ rõ. Provider-test database cũng đã drop sau cả7outcomes.

## Kết luận và giới hạn

Vấn đề trực tiếp là owner gọi tool chưa đúng và không thực hiện thao tác mua; không có cart mutation bị P1/P2 guard từ chối. Hai phản hồi bị verifier chặn, còn báo giá là BUDGET và sửa số đo là request-bound phía client. Riêng PRICE verdict ởca2 thiếu rationale nên chưa phân xử chắc phần nghĩa của tổng tiền; không coi mọi fallback là verifier quá chặt.

Receipt mới đã vào request verifier ởca1. Ca4 bị chặn trước generation3 nên chưa có draft ACK đến verifier; **chưa chứng minh chấp nhận ACK receipt mục tiêu**. Checkout nguồn thật vẫn chưa hoàn tất; không thể đo đoạn sau khi chưa tạo giỏ. Source công khai được refresh và N1 variance vẫn có; không quy mức giảm số reply cho hai sửa transaction. Human acceptance chưa được chấm.

**Recommendation: STOP nghiệm thu bán hàng/live activation.** Đã hoàn thành đúng một batch owner yêu cầu, không tự sửa prompt/code rồi chạy thêm. A vẫn OWNER_BYPASS; không Phase C, serving migration, merge/deploy, live customer write hoặc Meta/Pancake/POS send. Complexity của đợt này:0production changes,0semantic roles/layers,0new tables/stores/gates; chỉ scope/test evidence và báo cáo. Cả hai historical provider batches giữ nguyên. Tổng riêng ba batch stateful-completion này:21outcomes,44registered invocations,42generation HTTP requests; mỗi batch vẫn giữ population/source/configuration riêng, chưa tính các evaluation B khác.
