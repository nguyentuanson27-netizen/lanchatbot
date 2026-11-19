# Verifier 70.000 byte và kiểm lại năm lượt J4

Owner yêu cầu ngày 19/11/2026: “tăng verifier lên 70000 byte đồng bộ rồi chạy lại 5 lượt J4 bị chặn”. Implementation base `64d19e4345b71f887cd9a2ce1749144fd9bab3c5`.

Đã đổi duy nhất giới hạn wire verifier từ 65.536 lên 70.000 trong protocol constant, manifest validation và request builder. Owner vẫn 70.000. Prompt, model/effort/schema, draft reserve, hard/final gate, freshness/permission/receipt và tool/generation budgets giữ nguyên. Các giới hạn token-auth response, provider signature, handoff source context và historical frozen evidence có số 65.536 là contract khác, không thay hàng loạt.

RED trước sửa: hai test về manifest và nhận request 69.999 byte đều FAIL. Sau sửa: bộ protocol/admission/provider/wire/campaign **142 PASS**, gồm đúng 70.000 được nhận và 70.001 bị chặn trước provider. Worker emit compile và lint/noEmit PASS. Chưa chạy full repo checks, chưa đo model tại lúc commit implementation.

Để chỉ chạy đúng năm lượt cuối thay vì sinh lại cả 15 lượt, harness diagnostic thêm mode J4_RECHECK qua disposable PostgreSQL fixture hiện có. Mỗi lần dựng hai lượt prefix từ hội thoại public đã được gửi ở run trước, với source và policy hiện hành, tool thật và scripted owner/verifier chỉ trong setup. Ghi rõ đây là fixture, không kết quả model mới; thời điểm mới là đầu vào test tổng hợp, không làm mới timestamp nguồn shop. Chỉ lượt hỏi tổng cuối gọi owner/verifier thật. Lưu before/after state, toàn bộ provider request accounting và actual terminal. Không sửa production entrypoint hoặc thêm role runtime.

Số đăng ký: 5 measured turns, 10 scripted setup turns, tối đa 20 generation requests (3 owner +1 verifier/lượt theo trần hiện hành), không judge hoặc generation retry ở evaluator. Runtime bounded owner recovery giữ config hiện hành và phải được ghi nếu xảy ra. Nguồn mới phải còn hạn, worktree executable sạch, input/source/model/hash được seal trước generation. Prefix cũ còn giữ nguyên trong evidence cũ; không ghi đè kết quả HANDOFF đã quan sát. Đây là targeted continuation test, không N=5 whole-journey quality/stability hoặc Phase C GO.

Các lệnh kiểm thực chạy:

```powershell
node --test --test-name-pattern='70000 bytes|request bounds are frozen' apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/preparation-admission.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-verifier.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs apps/worker/evals/single-agent-commerce-qualification/native-wire.test.mjs apps/worker/evals/single-agent-commerce-qualification/j4-preparation-recheck.test.mjs apps/worker/evals/single-agent-commerce-qualification/j2-j1-campaign.test.mjs
pnpm --filter @lana/worker exec tsc -p tsconfig.json
pnpm --filter @lana/worker lint
git diff --check
```

Lệnh đầu là RED, các kiểm cuối PASS. Unit harness chứng minh chỉ lượt cuối dùng generation và prefix hash sai bị chặn trước tạo session. Run mới sẽ có source SHA riêng sau commit, không tái dùng identity 48a27a1b.
