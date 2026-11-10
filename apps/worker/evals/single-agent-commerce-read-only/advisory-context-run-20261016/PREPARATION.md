# Implementation và self-review trước provider

Intake `995b1d4a59cff4577356e3fa602aaca41ee8d888`; `git fetch origin main` thành công, main/implementationBaseSha vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Giữ branch Phase B/PR391 hiện có; không rebase/import seam cũ hoặc sửa bằng chứng đã freeze.

## Đã sửa gì và vì sao

- Verifier: thay ba bullet policy và phần tư vấn bằng ranh giới theo nghĩa của toàn cuộc trò chuyện. Tóm tắt thời hạn/phí không tự là duyệt hồ sơ. Cảm giác từ vật liệu và giải pháp phối thông thường được phép; kết cấu/tính năng tự tạo, kết quả đo, đảm bảo độ kín, sinh lý hoặc hiệu quả mọi điều kiện vẫn cần căn cứ. Không cố giải thích chính xác cơ chế nội bộ của verdict cũ vì schema không chứa rationale.
- Owner: dùng PRODUCT ref hiện có cho thành phần của set; nhận biết thiếu POS sau read_product không phải tìm chưa đúng mẫu. Trả phần mô tả có sẵn, không tìm món khác/policy để phục hồi giá/tồn. Thay chỉ dẫn giọng và quyết định ngay trong đoạn cũ: nêu lựa chọn/đánh đổi, dùng chi tiết để giúp chọn, giữ lời khuyên nhất quán và dừng khi đã giải quyết việc khách hỏi.
- Chỉ cập nhật active prompt hashes trong manifest. Model/config/schema/native declarations/budget/fallback/corpora và executable không đổi. Không thêm câu trả lời mẫu, evaluator labels, parser, regex, router, template, retry, repair/reverify hoặc lớp lưu trữ/gate.

| Prompt | Trước | Sau | Delta | SHA256 mới |
| --- | --- | --- | --- | --- |
| Owner | 11.024 bytes | 11.756 bytes | +732 / 6,64% | `8cb461c2874522915aabdbd7d945768df656577ce60a426d6b7f4636bf5702f3` |
| Verifier | 11.260 bytes | 11.646 bytes | +386 / 3,43% | `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24` |

Self-review: không thêm phần phụ lục ví dụ/ngoại lệ; thay đoạn đang cạnh tranh nghĩa, giữ code-fit/current-profile, quote, freshness, policy thật, receipt/privacy và final gate. Prompt có tăng kích thước như bảng, không claim đã được rút gọn hoặc đã cải thiện hội thoại. [Offline compatibility](OFFLINE_COMPATIBILITY.json) thay duy nhất instruction trên 63 owner + 27 verifier requests cũ: max 31.081/32.768 bytes; giữ nguyên payload. Đây chỉ là size/representation check, không phải đo provider hay chứng minh hiểu nghĩa.

## ETA còn thiếu nguồn, không vá bằng suy luận

[Đọc source chỉ đọc](SOURCE_DIAGNOSIS.json), trước thay đổi: source có prep thường 1–2 ngày, prep khi stock 0 là 5–8; transit có theo các key vùng. Lựa chọn AO/BE/L×2 stock 0, policy cho đặt trước. Địa chỉ test TP.HCM không chứa key vùng nào, không có default; resolver hiện tại chỉ khớp key hoặc default. Không tìm được mapping địa chỉ → key có thẩm quyền trong các source contracts liên quan. Vì vậy đã xác định một nguyên nhân cụ thể của `CART_ETA_UNAVAILABLE`; không phải thiếu mọi con số ETA. Không tự map địa lý/điền số, publish nguồn hay sửa code để bỏ prerequisite checkout. Giữ dependency BLOCKED.

Read dùng [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md), credential launcher/source-session hiện có; 0 owner/verifier generations, 0 embeddings cho diagnosis này. Không đọc private customer history hoặc in secret; nguồn chỉ đọc.

## Commands đã chạy

```text
git fetch origin main
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node C:/Users/nguye/AppData/Local/Temp/c3-context-fix-source-diagnosis-20261016.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-handoff.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

| Check | Kết quả thực tế |
| --- | --- |
| Focused protocol/provider/comparison | 47 PASS |
| Worker owning boundaries | 9 files / 185 PASS |
| Protected claims/reply assembler | 21 PASS |
| Full Node eval, gồm registrations lịch sử | 489 PASS / 2 existing optional SKIP / 0 FAIL |
| Worker typecheck/build/lint | Mỗi command exit 0 |
| Offline 90 request size checks | PASS, 0 generations |
| Diff whitespace | Exit 0; Git chỉ báo EOL normalization hiện có |

Đây là prompt-only correction: không có logic code mới để claim observed RED→GREEN, không unit test dò chữ thay cho đánh giá ngữ nghĩa. Không shared source change, không lặp full worker suite đã chạy ở candidate trước; focused worker vừa chạy ở prompt hiện tại. Full repository `pnpm check` và remote CI không được claim PASS.

Structural complexity delta: 0 executable changes, 0 roles/layers/gates/stores added, native tools và budgets giữ nguyên. Tại savepoint preparation này provider mới là NOT_RUN; kết quả thực tế thuộc collection sau seal. Historical A/B kết quả và A OWNER_BYPASS không đổi; sales/live chưa được chấp nhận.
