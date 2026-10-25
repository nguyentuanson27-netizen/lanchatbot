# Phase B — implementation giữ quy tắc, 26/10/2026

Implementation base `56538349eef07ff26b1a8cb8db2031192a4f4289`, [plan revision 2](c3-phase-b-rule-retention-fix-plan-20261026.md). **IN_PROGRESS, PROVIDER_NOT_RUN; B chưa GO.** Không production wiring/deploy/live send. Các kết quả dưới là deterministic, không phải model acceptance.

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
