# Phase C — phân biệt điều kiện mua và kết quả được phép tư vấn

Implementation base: `de6579ec5f3be29ed12271e19bafacd1f7eba0c2`. Phạm vi: sửa code/presentation/prompt kỹ thuật theo yêu cầu owner sau screen13/27; chưa chạy provider mới. Giữ nguyên plan20261109 và mọi evidence lịch sử.

## Căn cứ

[Screen và review độc lập](../../apps/worker/evals/single-agent-commerce-qualification/tool-contract-screen-run-20261110/REPORT.md): J1 bỏ đường quote trước giỏ; J4 biến NOT_EVALUATED thành không hỗ trợ; P07 đề xuất L ngoài engine M. Prompt đã có nhiều câu cấm cho ba tình huống; không lặp lại nguyên cách thêm cảnh báo. Audit mới còn thấy prompt hướng dẫn SINGLE/COMPARE/DETAILS_ONLY, quote2units/tự lấy ảnh/cấm writer batch, mâu thuẫn actual schema/W2/W3 đã đổi. Đây là competing instructions có thật, chưa chứng minh giải thích toàn bộ lỗi.

## Thay đổi được thực hiện

1. **Đường quote trên failed selection:** trong wrapper quote hiện có, chỉ decorate kết quả add_to_cart hoặc REPLACE_LINE đã xác nhận không commit và COLOR_REQUIRED/SIZE_REQUIRED với choiceResolution/evidence hợp lệ. Giữ nguyên status/reason/effectCommitted và dữ liệu nguồn. Tách missing choice để mua khỏi target có thể yêu cầu quote_product trước giỏ. Target chỉ gồm exact PRODUCT/offer từ args và evidence được code xác nhận; quantity của quote phải theo tổng nhu cầu khách, không coi quantity của một mutation attempt là tổng yêu cầu. Không tự ghép batch thành tổng mua, không tự tính tiền, gọi quote, đọc policy, thêm giỏ hoặc redirect tool.

   Hướng quote là capability/target hint, không phải chứng minh đã có giá/tổng/policy. Exact cached price proof có thể chưa tồn tại ở J1 vì preparation reads không cấp getter này: không bắt phải có proof mới được chỉ ra đường đọc, và không mở rộng getter để làm hint xanh. Nếu có exact fresh proof, chỉ ghi trạng thái giá đã đọc; không publish số tiền hoặc gọi đó là final quote. Khi thiếu proof, ghi cần đọc/validate trong explicit quote. Hint chỉ được trình bày cho owner khi actual declaration còn quote_product; không đảm bảo budget/authority/source/policy/final gate sẽ PASS.

   Không hint khi không có configured quote capability, scope/recipient/binding/permission/privacy/owner sai, pending state/uncertain terminal, source evidence stale/wrong product/offer/quantity/size/color, status khác missing customer choice hoặc shop source gap. REPLACE_LINE phải dùng targetSubjectRef và exact current cart line để xác nhận quantity/identity; không lấy giá/offer của dòng cũ. Không phụ thuộc câu khách/caseId hoặc regex. Không thêm I/O, charge, state/receipt/protected claim mới.

2. **Meaning của kết quả cho owner:** áp dụng một projection nhỏ trên code-owned functionResponse, cả native round và completedToolTurns ở final text. Với negotiation NOT_EVALUATED/UNKNOWN, trình bày thành một nhóm chưa xét được hỗ trợ + missing prerequisites, giữ phân biệt với kết quả policy/discount đã xác nhận. Với recommend_size, trình bày một nhóm kết quả engine hiện tại gồm đúng target/status/recommendedSizes/alternativeSizes/inputFitPreference/source identity; không lặp cùng dữ liệu thành nhiều block. Giữ null/[] khác nhau và các missingInputs. Thói quen trong history không nhập thành kết quả fit. Không đổi thuật toán/chart/state, không tạo alternative/RELAXED mặc định. Raw domain/tool results và trusted verifier không đổi; lời giải nghĩa không tự cấp claim mới. Không suy nghĩa từ free text hoặc biến raw case labels thành input.

3. **Prompt kỹ thuật:** bỏ legacy selection modes, dùng offerTypes[]/một/nhiều phần và customerSelected theo schema. Loại phần quote2units/tự chọn ảnh/cấm mọi writer; không chép toàn bộ closed allowlist lại lần nữa, tham chiếu technical declaration của tool và code-owned callable/budget. Giữ hướng dẫn bán hàng, tự nhiên, policy, privacy, handoff và ranh giới fit/receipt đã ổn. Gộp hướng dẫn fit/quote lặp chỉ khi không mất nghĩa. Không thêm câu mẫu hay ví dụ theo ba ca. Cập nhật exact owner prompt hash trong manifest; verifier prompt/model/config/caps unchanged.

## Kiểm tra và review

- Observed RED trước, GREEN sau cho hint ở J1-shaped known COLOR_REQUIRED mà không có cached exact price proof; không có I/O/calculation/commit mới. Negative stale/wrongrefs/unknown offers/wrong quantity/permission/recipient/binding/no capability/shop-gap/unknowncommit không được hint. REPLACE target/quantity giữ đúng scope; không coi hint là quote proof/receipt.
- Actual owner wire: native functionResponse và final completedToolTurns đều có cùng meaning; exact signed model parts/history và raw input/trusted context giữ nguyên. Compact V2 không nhân đôi kết quả fit/negotiation; null/empty/current target/engine alternative thật được giữ. Projection không tự thêm handoff, discount hay size.
- Focused commerce/quote/effects/state + provider adapter/protocol/presentation tests; protected/reply tests; worker build/typecheck/lint và dataset boundary. Kiểm actual wire byte bound65KB, per-turn caps/retry0 unchanged. Nếu chạm shared package phải kiểm tương ứng; scope này không cần đổi shared.
- Self-review rồi reviewer độc lập cùng vòng trước; fix các blocker và review lại tới APPROVE. Không dùng approval của code để claim model cải thiện. Thay đổi chỉ projection/hint không cần source-shop writes/PG migrations; nếu đụng transaction behavior thì mở lại actual PG acceptance trước model.

## Giới hạn

Giữ một owner/tối đa một verifier; code sole authority truth/state/effects/receipts/privacy. Không router/parser/role mới, auto repair, post-verifier rewrite, case template/regex hoặc tăng budget. Không hạ verifier cho unknown discount/L/ảnh khách mặc thiếu căn cứ. Không production wiring/merge/deploy/live send.

Owner lượt này yêu cầu sửa; chưa dispatch provider. Model run tiếp theo phải freeze/review input và đăng ký ca/đối chứng trước; giữ không tự chạy full hoặc rerun tìm PASS. Việc owner dùng đúng tool và lời tư vấn tốt hơn vẫn là giả thuyết phải đo, không là kết quả của unit test.
