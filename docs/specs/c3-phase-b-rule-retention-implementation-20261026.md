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
