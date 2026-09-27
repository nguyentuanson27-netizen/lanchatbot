# Đối chiếu comment 5847545097 và amendment kế hoạch

Review source ngày 26/09; cập nhật kế hoạch ngày 27/09/2026. Comment gốc: [PR375](https://github.com/nguyentuanson27-netizen/lanchatbot/pull/375#issuecomment-5847545097).

- Source kiểm tra: `d0c8a3119009baded942c77c7d045c402b4a8a22`; code ứng dụng cùng baseline `ce558e6d4028dd06bd6efc960286464425a26a85`. Hai HEAD remote còn khớp khi bắt đầu amendment.
- 27 quan sát đã lưu owner-local trong `LANCHATBOT_REVIEW_COMMENT_5847545097/probes.json`, gồm setup và controls; không phải 27 test-suite passes. Không gọi Luna trong review này.
- Các hàm riêng tư được trích từ TypeScript source bằng AST và transpile để chạy cô lập. Evaluator dùng artifact local và fake facts tổng hợp; kết quả là planned state, không có DB commit/POS/live send. Chưa có script tái lập độc lập được commit; P00/P06 cần chuyển các hành vi liên quan thành regression ở producer→consumer, build lại dependency từ source.
- Đây là kết quả chẩn đoán và hiệu chỉnh plan, **không phải evidence nghiệm thu fix**. Comment không review toàn bộ guard hai chiều, cart/catalog input hoặc chất lượng hội thoại.

## Findings và mức bằng chứng

Số finding giữ theo comment. Ví dụ dùng dữ liệu tổng hợp; chi tiết recipient được lược khỏi bản commit.

| Finding | Quan sát và giới hạn | Task |
|---|---|---|
| 1 — thấy/đổi size | Hàm nhận “Chị thấy size L hơi rộng” là edit. Evaluator với giỏ M/facts hợp lệ tạo planned L, giống control “Chị đổi sang size L nhé”. Đã tái hiện tại hàm và evaluator; chưa có effect live. | P06 |
| 2 — màu/mẫu | “Có màu khác không?” và “Có mẫu khác không?” đều alternative=true. Source dùng kết quả để loại current product khi search; chưa chạy full product-resolution journey trong review. | P08a |
| 3 — bộ/bỏ | “Bộ LN123 còn size M không?” thêm LN123 vào rejectedProductIds, giống control từ chối. Đã tái hiện memory updater; đường prompt đọc field xác minh bằng source. | P08a/P09 |
| 4 — payment | Địa chỉ Hội An + “COD nhé” làm mất payment selection; evaluator giữ paymentMethod=null. “COD nhé” riêng nhận đúng, hỏi có COD không không tự chọn. | P06 |
| 6 — recipient | Câu có nhãn “Số điện thoại”, số synthetic và địa chỉ bị ghi tên “Số điện thoại” vào planned checkoutDraft. Positive input có tên người nhận synthetic định dạng tự nhiên nhận đúng. | P06 |
| 5 — hậu mãi | Hàm trả false cho “Hàng bị lỗi đường may, chị muốn hoàn tiền” khi hasOpenCart=true. Đây là lỗi classifier đã tái hiện, chưa chạy full handoff journey. | P06 |
| 7 — human request | Câu gốc “Chị không muốn gặp shop qua bot, cho chị gặp nhân viên” trả true, không tái hiện finding như viết. Biến thể “Chị không cần nhân viên cũ, cho chị gặp nhân viên khác” trả false: họ lỗi phạm vi phủ định có thật. | P06 |
| 8 — last size | Parser chọn S cho “Lấy size M nhé, size S còn không?”. Qua canonical producer→evaluator, decision=NONE, không mở giỏ; vẫn vậy khi cấp COMMITTED signal đúng mệnh đề đầu. Không kết luận đã mở giỏ S. Cần sửa cả subject binding lẫn question veto toàn tin. | P06 |
| 9 — server wiring | Source server chỉ cấp C3 ở DRY_RUN + flag, runner chỉ adopt reply ở LIVE + sendEnabled. Chưa có phép thử server composition trong review. Calls/cart read phụ thuộc admission/lane/state; không khẳng định mọi lượt hai calls. | P05 |
| 10 — history/context | Source cho history recovery khi C3-off; legacy dựng structured summary từ state trước update, C3 dùng nextState. Tin mới vẫn có trong dialogue; chưa đủ kết luận model chắc chắn quên. Recovery không tự là regression cần revert. | P09 |

## Hiệu chỉnh nhận định và thiết kế

1. [Checkout retest 8cd20ab](c3-luna-stateful-runtime-8cd20ab-checkout-report.md) và [ordered history](c3-luna-stateful-runtime-8cd20ab-checkout-history.md) ghi positive M→L, preview L, internal PURCHASE_CONFIRMED thành công. Không ghi acceptance M→L “đang RED”; chưa chứng minh negative controls/full-intent model hoặc POS receipt.
2. Giữ capability và invariants, thay trigger sai. Kernel đã có `SET_LINE_VARIANT`; khoảng trống là producer yêu cầu sửa có nguồn và đúng đối tượng. Không mặc định ép edit vào buying-intent enum hoặc cấp quyền từ JSON/span/confidence.
3. Câu nhiều mệnh đề cần giữ lựa chọn, câu hỏi và phạm vi phủ định theo đối tượng. Không sửa bằng token cuối, question veto toàn câu hay whitelist phrase. Giữ single progression và sáu trường Strategist theo spec.
4. Typed payment fallback cũ cũng chỉ kiểm confidence/value/evidence substring, chưa đủ chứng minh semantic role. Không coi khôi phục nguyên trạng là giải pháp đã an toàn. Recipient capture tiếp tục tại private boundary.
5. Deterministic regression sở hữu parser/state/wiring risk; Luna sở hữu integrated semantic/sales evidence. Không cần thêm một gate Luna riêng cho mỗi finding; không đóng cả họ lỗi từ một output đúng.
6. Server DRY_RUN cần quan sát candidate qua boundary hiện có, không bật LIVE. C3-off history recovery cần differential và ghi intentional deviation; không revert hữu ích chỉ vì khác baseline.

## Source anchors tại baseline review

- [Variant intent](../../packages/business-tools/src/buying-signal.ts): `isVariantEditRequest`; [canonical producer](../../packages/business-tools/src/canonical-evidence.ts): `isInformationQuestion`/decision veto; [kernel contract](../../packages/contracts/src/v2/canonical-commerce-bindings.ts): `SET_LINE_VARIANT`.
- [Sales evaluator](../../apps/worker/src/realtime-sales-cycle.ts): `explicitSize`, `selectedPaymentMethod`, `privateUnlabelledRecipient`, `checkoutDetails`, variant mutation branch.
- [Realtime runner](../../apps/worker/src/realtime-runner.ts): alternative/handoff classifiers, history recovery, `customerSessionContext`, session update, C3 invocation/adoption; [server](../../apps/worker/src/realtime-server.ts): `REALTIME_C3_LOCAL_TEST_ENABLED` composition.
- [Session context](../../apps/worker/src/realtime-session-decision-context.ts): rejected products updater.
- [Spec C3](../../docs/specs/track-c-c3-strategy-contract.md): adaptive owner/single progression, checkout completeness, variant edits, explicit alternative search và session context.

## Complexity delta

Amendment bổ sung acceptance vào P00/P05/P06/P08a/P09/P11 sẵn có. Không thêm task family, eval framework, online reviewer, durable state, approval gate hoặc mẫu câu. Chưa thay code/spec runtime; các checkbox implementation vẫn mở trong [todo](../todo.md). Mẫu báo giá lần đầu và quyền nghiệp vụ theo spec được giữ.
