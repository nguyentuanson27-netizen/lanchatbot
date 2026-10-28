# Current offer — independent review và implementation

Ngày28/10/2026. Base `f67d39165296497cf8f09555c92ab0b15553391b`. [Kế hoạch](c3-phase-b-current-offer-fix-plan-20261028.md). Không provider run, live send, publish, merge hoặc deploy.

## Phương án và bản sửa

Raw record_negotiation của ca khách xin bớt đã cung cấp tổng giảm30000 và tổng thanh toán499000 nhưng owner chỉ nói “mức ưu đãi sẵn có trên hệ thống”. Giữ nguyên payload/effects/projection vì không có bằng chứng mất field. Không lấy việc tổng giảm bằng phí ship làm bằng chứng đây là miễn ship hoặc khoản vừa giảm thêm.

Thay đúng đoạn phản đối giá của owner prompt:

> Khách phản đối giá: trả bằng mức ưu đãi cụ thể trong kết quả record_negotiation hiện tại, kèm tổng cartQuote khi giúp khách biết số phải trả; giải quyết chuyện giá trước khi mời mua. Chỉ gọi tên loại ưu đãi khi nguồn xác nhận, không suy từ tổng giảm. Mức giảm bằng 0 chưa chứng minh shop không có hỗ trợ khác và không cấp quyền tự thêm ưu đãi.

Câu hiện có “Quote cũ trong lịch sử không phải tổng hiện tại, tổng ưu đãi không có nghĩa vừa giảm thêm” vẫn giữ ngay sau đoạn này. Không có câu trả lời mẫu, số tiền cố định, tên sản phẩm, case ID hoặc keyword judge trong instruction.

Code tiếp tục trả cartQuote/receipts và kiểm quyền/state/freshness như trước. Không sửa TypeScript, verifier, corpus, model/config, terminal map hoặc silent fallback. Prompt21042→21279bytes, tăng237bytes/1,126%; không thêm section hoặc lớp runtime.

## Independent review

Reviewer riêng: `/root/current_offer_independent_review`, read-only, không sửa source/dist hoặc gọi provider.

1. **PLAN R1 — APPROVE.** Reviewer đã đọc governance, plan, owner prompt, effect projection/tests và actual request/result. Không có finding chặn. Lưu ý không ép đọc mọi số; dùng tổng khi có ích và không gán loại ưu đãi từ aggregate.
2. **IMPLEMENTATION R1 — APPROVE.** Reviewer đọc diff trực tiếp, xác nhận đúng một instruction region và owner hash; không có finding chặn. Tự chạy25/25 Node tests PASS và `git diff --check` PASS. Reviewer không chạy lại75 effects tests, chỉ nhận kết quả của root; không gộp chúng thành independent execution.

Không có vòng REVISE hoặc finding bị bỏ qua trong scope này. Approval là source/contract review, không phải human sales approval hoặc bằng chứng model đã cải thiện.

Inventory mà reviewer xác nhận:

- `apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt`: SHA256 `9887885e8cfa284a8a8fa45e4df28c7550684f1228a3c3e1995072ba26d8c392`.
- `apps/worker/evals/single-agent-commerce-read-only/manifest.json`: SHA256 `200c9352abd55d6dc7e2a2b0c6fd482939e4582c3959e50738f3abe4cd6d6671`.

Review target là hai executable/config files trên worktree ở base f67d3916, không gọi nó là approval của một commit chưa tồn tại. Docs/evidence được ghi sau review, hai file đã review giữ nguyên.

## Verification thực sự chạy

1. `node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-data-presentation.test.mjs apps/worker/evals/single-agent-commerce-read-only/native-presentation.test.mjs` — root25PASS/0FAIL; reviewer chạy riêng25PASS/0FAIL. Kiểm protocol identity, projection/wire và các contract hiện có, không chấm nội dung model bằng keyword.
2. `pnpm exec vitest run apps/worker/src/single-agent-commerce-effects.test.ts --reporter=dot` — root75PASS/0FAIL, gồm quote/current state/duplicate negotiation.
3. Self-review byte reversal khôi phục đúng owner prompt của base; parsed manifest chỉ khác owner prompt hash; current hash khớp bytes. Không thêm assertion kiểm câu phải chứa30k/499k.
4. `git diff --check` — PASS; staged diff check trước commit cũng được chạy. Không chạy lại worker typecheck/build/lint vì không đổi TypeScript/tooling; không claim chúng đã chạy trong task này.

[Machine-readable evidence](../../apps/worker/evals/single-agent-commerce-read-only/current-offer-fix-20261028/VERIFICATION.json).

## Giới hạn

Provider generations=0. Chưa kiểm model có dùng quyền lợi cụ thể, tự nhiên và đúng trọng tâm trong tình huống tiền/loại ưu đãi khác nhau hay không. Evidence các campaign cũ giữ nguyên và không được dùng để chấm chất lượng prompt mới. **B_NOT_GO** tiếp tục; không tự chạy model tiếp.

## Review lại bản đã commit theo yêu cầu tiếp theo

Cùng independent reviewer đã review exact clean HEAD `db6787e58f22dcd73808f627958e09e9a9d8ac5a` và kết luận **APPROVE**, không có finding chặn hoặc phần implementation nào còn thiếu trong kế hoạch này. Reviewer đối chiếu diff từ f67d3916, hash hai executable/config files và consumers kiểm prompt hash; source đúng inventory đã approve.

Không có source fix bổ sung sau review này. Không chạy lại tests vì executable bytes không đổi:25 Node tests reviewer tự chạy trước đó vẫn là evidence áp dụng cho đúng bytes;75 effects tests là kết quả root từ task implementation. Không claim đó là các lần test mới. Root kiểm lại committed blobs/worktree đều khớp approved hashes và diff check PASS.

Phần cập nhật hồ sơ sau review chỉ bổ sung chứng cứ; exact HEAD được approve vẫn là db6787e5. Provider0, chất lượng model chưa được chạy lại, B_NOT_GO giữ nguyên.
