# Phase B — implementation giữ quy tắc, 26/10/2026

Implementation base `56538349eef07ff26b1a8cb8db2031192a4f4289`, [plan revision 2](c3-phase-b-rule-retention-fix-plan-20261026.md). **IMPLEMENTED, INDEPENDENT_REVIEW_APPROVE, DETERMINISTIC_READINESS_PASS; provider campaign được owner yêu cầu, chưa dispatch tại savepoint này; B chưa GO.** Không production wiring/deploy/live send. Các kết quả dưới là deterministic, không phải model acceptance.

## S1 — terminal quyền và accounting

Observed RED trước sửa: runner tests mới 2FAIL/38skipped; adapter terminal-phase test 1FAIL. Hết sáu normal calls nhận FALLBACK thay HANDOFF, mixed handoff/read vẫn gọi batch, native wire không khai báo handoff.

Sau sửa tối thiểu: quyền handoff riêng trên request/wire, normal cuối không mở lại read/mutation; proposed/rejected/normal/terminal/total tách biệt. Giữ ba owner generations, không retry. Protocol đăng ký rõ 6 normal calls +1 terminal attempt, tổng executed tối đa7. Pending/automatic status sẽ được nối trong S2; không coi S1 là đã sửa toàn bộ handoff experience.

Commands đã chạy:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts -t 'separately accounted terminal|mixed handoff/read'
node --test --test-name-pattern='terminal phase exposes' apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
```

Hai lệnh đầu RED như trên; hai lệnh sau GREEN 40 worker và68 adapter tests. Các phần S2–S4/shared/build/typecheck/lint/review còn chờ; không dùng savepoint S1 làm source qualification.

## S2–S4 — savepoint implementation, chưa final qualification

Đã nối pending handoff và sealed exact reply vào persisted candidate qua config approved holding hashes. Chuẩn bị chưa đổi ownership; reply + holding hợp lệ precommit được verifier kiểm cùng nhau trước atomic commit. Hết generation/draft không đạt thì không salvage draft; chỉ renderer PRICE hẹp khi một explicit SINGLE pair/variant không mơ hồ, hoặc giữ holding. Silent/customer-requested và no-chart exception giữ đường hiện có. Các adapter state/effects không làm mất source proofs trong composition.

Binding reply chứa predecessor, exact successor qua handoff event, exact group hash và trusted context/source-read hashes trong encrypted Outbox. Delivery đọc lại nguồn đã scope sau restart, không remap receipt sang revision HUMAN. Source evidence quá bound chỉ làm mất khả năng giữ protected partial, không làm hỏng normal tools. Group mang partial không có reader thì fail-closed. Không sửa database SQL/schema/migration; dùng payload versioned hiện hữu và shared contract extension optional để giữ static binding cũ.

Đã sửa ngoại lệ opening form/ảnh khi chính khách mới hỏi giá; giữ deadline/repeat/unresolved, bỏ optional fields không có verified scope. Đã bỏ producer NEXT_STEP cũ, giữ legacy decoder; current catalog/registration dùng cùng manifest. Không thay giọng chung hoặc verifier prompt; owner prompt tăng từ18.995 lên19.621 bytes, không thêm ví dụ theo case. S2 capability instructions và S3/S4 prompt/catalog/hash được lưu cùng savepoint để source/config không lệch nhau; không promote savepoint này trước final checks/review.

Observed RED thêm: schema partial1FAIL, deferred handoff1FAIL, gate5FAIL (source changed/unavailable/no reader/expiry/tamper), media fallback1FAIL. GREEN focused319worker, rồi toàn bộ commerce + boundary568PASS; contracts3PASS, shared protected/assembler/image43PASS. Full Node lượt đầu có7FAIL vì tests cũ thử lại CAS trong cùng turn; đã đổi thành hai request độc lập và assert không retry trong turn. Focused candidate/matrix12PASS sau sửa; full Node còn chờ chạy lại. Worker full build đã exit0; direct tsc cuối exit0. Một lần typecheck trung gian bắt readonly assignment trong test, đã sửa Object.assign; không ghi lần đó PASS.

### PostgreSQL diagnostic đã chạy

Dùng skill [lana-chatbot-ops](../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md), source-session route hiện có. Chỉ policy/source read-only và disposable DB guard `c3_b_test_<random>`, capture transport, không model request hoặc live send.

Command template thực sự chạy (`<output>` là từng thư mục mới bên dưới):

```powershell
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <output> COD --check-prefix 'B composed prepared handoff partial'
```

Output ngoài repo, dưới `C:/Users/nguye/Documents/Sản phẩm AI/`:

| Output | Quan sát | DB cleanup |
| --- | --- | --- |
| c3-b-rule-retention-s2-cod-20261026 | Lần đầu import khi build còn chạy: thiếu dist helper, chưa tạo DB. Lần sau cùng path chưa tồn tại: NO_SEND do schema predecessor chưa nhận revision0 | DB đã drop ở lần vào driver |
| c3-b-rule-retention-s2-cod2-20261026 | Commit qua nhưng delivery blocked, chưa PASS | dropped |
| c3-b-rule-retention-s2-cod3-20261026 | Diagnostic còn generic binding block | dropped |
| c3-b-rule-retention-s2-cod4-20261026 | Chốt PRODUCT_PROOF_REQUIRED: source method bị adapter composition làm mất | dropped |
| c3-b-rule-retention-s2-cod5-20261026 | 3PASS: verified partial, owner-error bounded price, changed source before delivery chặn cả group | dropped |

Tất cả diagnostic có sourceDirty=true, không phải exact-source qualification. Sau đó thêm regression unit ingress giữ PRODUCT/PROFILE proofs và mở deterministic cohort lên7 tình huống để kiểm commit/rollback timeout và cart receipt. Chưa dùng7ca này làm provider corpus hoặc đổi denominator51native cũ. Final exact-source COD/BANK, executable review, lint và Node rerun chưa hoàn tất ở savepoint này.

## Executable review trên 0e2f97bf và bản sửa trước seal tiếp theo

Reviewer độc lập REVISE 2P2: explicit handoff commit=false còn cho owner tiếp tục; existing cart chưa có exact sales-state proof tại sequence0. Đã tái hiện RED3 (lost CAS + REJECTED/UNAVAILABLE terminal call) và RED1 (cartQuote thiếu proof vẫn ALLOWED), rồi sửa terminal NO_SEND và code-only SALES_STATE qua existing scoped repository. Runner chặn cả terminal args/policy errors trước generation kế; inherited committed effects vẫn được ưu tiên. Thêm ba regression immediate/conflict/policy/args và giữ không retry.

Cohort DB bổ sung existing-cart không mutation: có/không thay encrypted cart state trong disposable DB trước restart/sequence0. Hai full composed runs COD/BANK trên exact clean source0e2f97bf đều dừng sau4ca partial PASS tại rollback-response-lost vì harness tiêm lỗi vào mọi transaction, gồm finalize NO_SEND. Evidence giữ nguyên ở c3-b-rule-retention-sealed-cod-20261026 và c3-b-rule-retention-sealed-bank-20261026, mỗi run6cases gồm1FAIL, provider0, databaseDropped=true. Đã sửa fault injection one-shot; chưa gọi chúng PASS. Executable mới cần seal/review/DB run riêng.

Sau bản sửa review: commerce+boundary574PASS, Node163PASS; direct worker tsc exit0; contracts3PASS/build exit0. Worker full build còn chạy khi ghi savepoint. Không model request, không đổi provider/config/ngưỡng hoặc chấm lại kết quả model cũ.

### PostgreSQL đã bắt thêm receipt-success gap

Hai run clean sourceaf0bc76b ở c3-b-rule-retention-sealed2-cod-20261026 và c3-b-rule-retention-sealed2-bank-20261026: 6PASS rồi cart-receipt FAIL với C3_HANDOFF_RECEIPT_PROOF_REQUIRED; không capture sai hoặc nới gate. Rootcause: effect success branch recordReceipt từ state readback, chỉ nhánh mất response mới gọi persisted receipt reader, nên proof không được capture. Added unit RED2: success không đọc ledger, null ledger vẫn OK. Đã sửa successful persisted mutation dùng acceptReceipt từ reader hiện hữu, giữ domain-only fixture path và không retry. Gate yêu cầu receipt sourceHash khớp chính receipt được verifier thấy, không chỉ có operationId. Hai unit mới + hai gate receipt cases GREEN100 trên effects/delivery. Source/config trước sửa không được dùng làm qualification của bản mới.


Reviewer độc lập APPROVE1207cee9, effects/delivery100PASS. Full commerce sau đổi receipt có577PASS/1FAIL ở composed fixture cũ hardcode readReceipt=null cho cả success. Test-only savepointc53a87f7 đã thay thành explicit test ledger ghi ở APPLIED và assert proof SALES_STATE/RECEIPT, focused2PASS; không đổi runtime/expected SEND_ELIGIBLE. Full build1207cee9/lint exit0; final focused/full regression và sealed PostgreSQL cần chạy lại trên executable hiện hành.

## Final executable checks (runtime unchanged after 1207cee9)

Implementation base56538349; executable reviewed1207cee9, test-only followupc53a87f7, sealed run source89433ba25b63b5c53faa963bfafb1a3e1f09f3c7. Không đổi executable/config trong sealed3 runs. Current owner prompt SHA256 `786e4cd7338e8a21d17557e03c41314301f005b913d83b687377ac4efe106cb6`; verifier prompt `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`; schema `19a67ac07104c3417d6c07602334da22fb67a11df87fec4f53a9f4b2b1b46115`; manifest `9e89897d4b8378dbab3f100e88a23b7f653e3c6bc9f49c7fda58bb9a19abd457`.

Model/config không thay: Gemini3.5FlashLite HIGH owner, GPT6.1Sol HIGH verifier, generation retry0. Manifest là nguồn exact generation config hiện hành; không có generation/provider measurement mới trong lượt này.

Commands thực sự chạy và final evidence (các RED/intermediate FAIL phía trên không bị xóa):

| Command | Result |
| --- | --- |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/single-agent-semantic-verifier-boundary.test.ts` | 578PASS/20files sau fixture ledger fix |
| `node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"` | 163PASS |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-handoff-delivery.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts` | 326PASS trên af0bc76b; final578 suite bao gồm8files này với2gate cases thêm |
| `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/candidate-handoff.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys-registration.test.mjs` | 97PASS; final163 bao gồm4files này |
| `pnpm --filter @lana/contracts exec vitest run src/commerce-handoff-delivery.test.ts src/commerce-media-delivery.test.ts` | 3PASS |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/image-selection.test.ts` | 43PASS |
| `pnpm --filter @lana/database exec vitest run src/realtime-runtime.test.ts` | 56PASS |
| `pnpm --filter @lana/contracts build` / `pnpm --filter @lana/contracts typecheck` | exit0 cả hai; shared consumers build trong worker prebuild |
| `pnpm --filter @lana/worker build` | exit0 sau receipt runtime fix; gồm12dependency builds |
| `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit` | exit0 sau test-only fixture fix |
| `pnpm --filter @lana/worker lint` | exit0 sau receipt runtime fix |
| `node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs` / `git diff --check` | exit0 |

Không cộng các suite chồng lặp thành số unique tests lớn hơn. Lần gọi business-tools với filename `product-image-assembler.test.ts` không tồn tại chỉ chạy21tests protected/assembler; không coi đó là image test. Lệnh đúng image-selection phía trên đã chạy43PASS.

## Giới hạn giữ nguyên

- Không provider acceptance/latency/token/cost mới; chất lượng owner ở opening/photos/handoff chưa được chứng minh bằng model run. Controls17 trước targeted rồi full hiện hành là bước riêng theo plan, chưa dispatch.
- PRICE fragment chỉ explicit SINGLE một pair/variant không mơ hồ. Không tách nghĩa câu khách để tự chọn phần trong COMPARE hoặc multipart; thiếu renderer procedure được duyệt thì dùng holding/silent/no-send hiện hữu.
- Source-version/timestamp refresh vẫn có thể block dù business value chưa đổi; không nới freshness để sửa số PASS.
- Delivery proof yêu cầu existing scoped reader; cấu hình thiếu reader hoặc proof không đủ thì chặn protected group. Không bật route này vào production.
- Owner prompt +626bytes do capability/prepare/opening contract; verifier prompt giữ nguyên; thêm một specialized scoped source-reader module, optional shared binding, không thêm semantic role/generation/parser/framework hoặc repair loop. Không claim mọi partial handoff đều có tư vấn đầy đủ hoặc B GO.


## Full PostgreSQL và accounting self-review trước provider run

Full composed capture source89433ba2 **45PASS COD +45PASS BANK**, cả hai worktree executable/config sạch, providerGenerations0, databaseDropped=true. Outputs sealed3-cod/bank-20261026. Đây là full deterministic source89433ba2; không chuyển thành provider acceptance hoặc exact-source PASS cho code thay sau đó.

Self-review cuối phát hiện ingress recovery sau runner bỏ sót terminal counter/status. Reviewer độc lập xác nhận P2 và status BLOCKED sai khi commit true nhưng readback throw. Observed RED9 trong ingress counters assertions; sửa guard chỉ1terminal attempt, finally cập nhật actual terminal/total/handoff trước mọi return/catch, giữ normal/proposed counts. Gán COMMITTED tại điểm commit known và UNKNOWN tại ambiguous catch; NO_SEND do readback không tự đổi commit thành BLOCKED. GREEN121 ingress/handoff; thêm4 synthetic DB recovery-accounting situations, chạy final-source focused COD/BANK sau seal, không chạy lại toàn45 chỉ vì accounting đổi. User đã yêu cầu review/fix và chạy model: provider run được phép sau readiness; registration/control/targeted gating theo plan giữ nguyên.


Accounting fixb82ba079: full commerce/boundary578PASS; reviewer APPROVE121PASS. P3 actual-enqueued fix RED1→GREEN1 tại851a81b3; TypeScript tests ban đầu chưa narrow private/native union nên tsc exit2, đã thêm type guards trong tests và tsc final exit0. Full worker build sau accounting/P3 exit0, không ghi intermediate lỗi là PASS. Model campaign đã preregister17controls+51native, targeted20→31remaining, source/runtime config giữ nguyên; provider chưa dispatch tại savepoint này.


Final accounting source55cf9c44: COD4PASS +BANK4PASS, dropped2DB, source/configclean,0provider. [Curated deterministic results](../../apps/worker/evals/single-agent-commerce-read-only/rule-retention-run-20261026/DETERMINISTIC_CHECKS.json) giữ riêng full45+45source89433ba2 và final4+4source55cf9c44, không cộng thành98full cases ở cùngsource. Existing full worker578/Node163 và121focused sau P3, fullbuild/lint/tsc exit0. Same reviewer APPROVE851a81b3/P3/dispatchdriver; kiểm AST/counts0provider. Source executable không đổi sau đó; chỉ tasks/docs/evidence savepoint trước capture provider sourceHEAD.

Hai focused PostgreSQL commands thực chạy:

```powershell
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-rule-retention-final-accounting-cod-20261026' COD --check-prefix 'B composed recovery accounting'
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs 'C:/Users/nguye/Documents/Sản phẩm AI/c3-b-rule-retention-final-accounting-bank-20261026' BANK_TRANSFER --check-prefix 'B composed recovery accounting'
```

Full commands tương tự dùng sealed3-cod/bank output, `--composed-only --candidate-handoff` thay check-prefix. Không live send/deploy. Bước tiếp theo theo owner mới yêu cầu là chạy [preregistered campaign](../../apps/worker/evals/single-agent-commerce-read-only/rule-retention-run-20261026/PREREGISTRATION.md), không tự đổi N/model hoặc retry.
