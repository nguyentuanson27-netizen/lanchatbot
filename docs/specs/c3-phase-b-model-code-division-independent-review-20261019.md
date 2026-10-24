# Independent review — model/code division plan

Ngày: 2026-10-19. Reviewer độc lập: `/root/review_model_code_plan`, fresh context. Reviewed HEAD: `f5b8f209755ba000af8397e5d85bf6a249f736ca`, branch `feat/c3-phase-b-commerce-20261014`; reviewer xác minh worktree sạch.

**Verdict: REVISE.** Đây là bản lưu tổng hợp findings do reviewer trả về, không phải kế hoạch đã sửa. Review chỉ đọc; không runtime edit, test, provider request hay live access. A OWNER_BYPASS; B sales/live STOP.

Reviewed plan: [model–code division](c3-phase-b-model-code-division-plan-20261019.md).
Evidence chính: [66-outcome report](../../apps/worker/evals/single-agent-commerce-read-only/isolated-agreed-run-20261018/CHECKPOINT_B.md), hội thoại cùng thư mục, và code runner/adapter/state/effects/boundary hiện hành.

## 1. [P2] Preload chưa đưa trạng thái thiếu nguồn tới owner

Plan lines 57–59, 64 nói preload giữ reader error, nhưng snapshot và tool result có dữ liệu khác nhau.

- `single-agent-commerce-read-only-tools.ts:127–130` tạo availability; nó nằm trong tool result ở lines 170–180.
- Snapshot ở lines 50–52, 151–168 chỉ giữ products/claims/policy literals.
- `gemini-inference.mjs:110–115` không chiếu trạng thái preload/availability; sanitize SOURCE_UNAVAILABLE chỉ áp dụng functionResponse tại lines 79–85.

Preload trước generation không có functionResponse của model. Chỉ gọi reader rồi bỏ result sẽ khiến owner không biết nguồn đã đọc nhưng lỗi. Model đọc lại hoặc suy sai là nguy cơ, chưa phải hành vi đã đo.

**Sửa tối thiểu:** chốt public result/status của preparation vào projection hiện có, không dựng fake functionCall. Test first owner wire: POS lỗi vẫn có mô tả hợp lệ và lý do thiếu nguồn, không cần đọc thêm mới biết. Không thêm service/state/error framework.

## 2. [P2] Full read preload mở rộng subjects và nguồn phải revalidate

Plan lines 56–60, 64 chưa kiểm tác động khi initial binding là món cũ nhưng khách đổi món, đổi hoàn cảnh hoặc chỉ hỏi policy.

- Broad read thêm VARIANT subjects và protected price/stock claims: `single-agent-commerce-read-only-tools.ts:133–142,158–168`.
- Trần tám subjects áp dụng cả search/read tiếp. Initial product + ba offer variants + ba search products đã là bảy subjects; một read tiếp nhiều offer có thể vượt trần.
- Read được revalidate ở line 228; freshness/binding toàn context tại `single-agent-semantic-verifier-boundary.ts:98–121`.
- Nguồn giá/tồn món preload cũ đổi có thể chặn reply chỉ dùng thông tin độc lập khác.

Tăng read-set/subjects được xác nhận; reviewer chưa chạy fixture chứng minh case cụ thể vượt bound.

**Sửa tối thiểu:** chốt preload cần materialize content/offer nào, không mặc định lấy toàn bộ aggregate price/stock/variants làm dependencies. Thêm controls khách đổi sản phẩm/occasion và nguồn preload thay đổi nhưng reply chỉ dùng nguồn độc lập. Nếu giữ full read phải ghi tradeoff và chứng minh không hồi quy. Không tăng budget/subject bound hay nới gate để chữa hậu quả.

## 3. [P2] Phép kiểm replay cần nhỏ hơn và có nguồn capture rõ

Plan lines 48–50,88–92,124–131 yêu cầu paired sources, context thực tế sau reads, nhưng chạy advice trước integrated.

- `stateful-provider.mjs:41–50` dùng live Redis/Qdrant và clock thật.
- `isolated-integration.mjs:323–345` dùng selector/policy và nhiều new Date độc lập.
- Owner logging ở `run.mjs:106`, `stateful-provider.mjs:53–54` chỉ giữ wire projection, thiếu metadata để phục dựng nguyên TrustedContext.
- Pin catalog không có nghĩa pin POS selector/policy dùng add/change/quote/checkout.

Đây là contract kế hoạch chưa chốt, không phải bug runtime mới.

**Hướng đơn giản reviewer đề nghị:**

1. Chạy integrated B1 trước. Owner callback lưu full **public TrustedContext**, original history và clock tại checkpoint đăng ký trước, không chọn sau khi xem điểm/verdict.
2. Advice-only dùng capture đó qua projection có sẵn và eval clock/readback snapshot đã ghi. Giữ observedAt; gate replay không chứng minh freshness live.
3. Baseline opening/stateful có thể tiếp tục đọc live, nhưng báo source differences và kết quả mô tả, không gọi paired causal.
4. Nếu cần paired opening, giới hạn replay trong opening và chốt catalog/POS/selector/policy cần pin, không xây whole-journey replay framework.

Vẫn giữ tối đa 51 outcomes, không generation phụ để tạo nguồn. Context không capture hợp lệ phải NOT_RUN/BLOCKED; không lấy context lượt khác hoặc oracle facts.

## 4. Chi tiết cần đưa vào implementation, không thêm gate

- Mapping native field là thay wire contract hợp lý nhưng chỉ bỏ cơ hội sai tiền tố, chưa sửa field/referent/tool planning. Giữ raw functionCall/content/call ID/thoughtSignature; map riêng domain calls args.
- Map cả measurements, fieldErrors **và unresolvedFields** về cùng vocabulary mới.
- Unknown field không được khiến state call biến mất trong khi dependent effect vẫn chạy.
- Intake thêm một public checkout request trước private-input fixture là khả thi. Nếu invitation thất bại, phần phụ thuộc không được coi đạt nhờ fixture.
- `stateful-provider.mjs:22,27,51,58` hardcode 7 outcomes/6 public/24 generations; `isolated-integration.mjs:476` cũng ghi 7. Cập nhật đồng bộ trong P4.
- 51 outcomes/180 maximum generations tính đúng và có dư vì code-only turns. Tám lượt không phải tất cả cùng một hội thoại: human-request hiện là journey khác.
- Thêm `src/single-agent-commerce-read-only.test.ts` vào focused command ở plan line 147 vì P1 thay owner-loop guards/budget trong module tương ứng.

## 5. Phần reviewer đồng ý giữ

- Một owner + tối đa một verifier; không cần role, router, repair loop hay executor mới.
- Code đã kiểm giá/tồn/selection/CAS/receipt và thứ tự batch; kế hoạch đúng khi không xây lại.
- Rubric whole-conversation đo quyết định bán hàng, usefulness, contextual correction và naturalness; không keyword grading.
- Giữ subjective fashion advice và upsell có căn cứ; không cho suy độ kín áo từ hai lớp chân váy hay mô tả mềm/thoáng.
- Chấm draft riêng actual terminal; giảm fallback không tự là sales improvement.
- Giữ errors trong denominator, báo 2/3 chưa ổn định, protected false PASS phải STOP readiness.
- P1/P2 chưa trực tiếp giải quyết mất màu, bỏ add, tồn tổng→tồn biến thể, hay opacity inference. Cần đo và bác bỏ giả thuyết khi không cải thiện; không tiếp tục nhồi lời nhắc.

## Kết luận và phạm vi chưa kiểm chứng

**Sửa ba contract trước khi triển khai trọn gói.** Giữ P1/P2 là thử nghiệm có giới hạn; P3 đo khả năng tư vấn khi đã nhận nguồn. Không có cơ sở BLOCK kiến trúc hoặc đổi model/verifier.

Không có test/provider evidence mới. Reviewer chưa chứng minh preload gây vượt subject bound trên một fixture cụ thể; chưa đánh giá implementation của thay đổi vì chưa được viết. Kế hoạch gốc chưa được sửa theo review này.
