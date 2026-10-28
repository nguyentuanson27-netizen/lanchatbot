# Phase B — dùng ưu đãi hiện tại khi khách xin bớt

Revision 1, independent plan review APPROVE và implementation review APPROVE. Xem [review record](c3-phase-b-current-offer-fix-review-20261028.md). Base `f67d39165296497cf8f09555c92ab0b15553391b`, branch hiện có của PR391. Owner yêu cầu phương án → review độc lập → sửa → review đến APPROVE. Không chạy provider, không gửi khách, không deploy.

## Vấn đề và bằng chứng

Ca negotiation-price-objection trong campaign silent-fallback-run-20261028 trả “mức ưu đãi sẵn có trên hệ thống” thay vì nói quyền lợi cụ thể. Request owner sau record_negotiation đã có cartQuote: subtotal499000, shippingFee30000, discountTotal30000, grandTotal499000. Không thiếu số tiền, không cần thêm nguồn, tool hay tính toán mới.

Tool result chỉ có tổng giảm, không xác nhận toàn bộ30000 thuộc miễn ship hoặc một chương trình cụ thể. Vì vậy không dùng câu vòng trước “hỗ trợ30k phí vận chuyển” làm gold bắt buộc. Không diễn đạt tổng giảm hiện tại thành vừa giảm thêm vì khách xin bớt.

Prompt đã yêu cầu dùng quyền lợi nhưng chưa nói rõ cần đưa quyền lợi cụ thể và tổng thực trả. Đây là giả thuyết sửa chỉ dẫn của owner, không phải kết luận đã chứng minh model sẽ tuân thủ. Không sửa verifier để chấm sức thuyết phục.

## Thay đổi tối thiểu

1. Giữ nguyên tool result/state.cartQuote, code tính tiền, receipts, policy và authority. Không thêm sales-summary field hoặc lớp diễn giải lặp dữ liệu đã có.
2. Thay đúng đoạn hướng dẫn phản đối giá trong mục Size, state và giao dịch của owner prompt. Yêu cầu trả lời bằng quyền lợi có giá trị cụ thể từ nguồn hiện tại và tổng code đã tính, thay vì chỉ nói đã có ưu đãi. Không có câu mẫu, tên sản phẩm, số tiền cố định hoặc case ID.
3. Ranh giới: tổng giảm không chứng minh loại ưu đãi; không hứa vừa giảm thêm; không suy giảm bằng0 thành shop không còn bất kỳ hỗ trợ nào; không lấy quote cũ, tự tính tổng, ghi state hoặc thực hiện effect để có câu thuyết phục hơn. Thiếu dữ liệu shop thực sự cần cho yêu cầu tiếp tục theo handoff hiện hành.
4. Không sửa các mục giọng, size, policy, ảnh, discovery hoặc checkout. Không postprocess reply, không regex kiểm câu, không template, không repair/reverify và không thêm role/tool.
5. Cập nhật owner prompt hash trong manifest theo bytes thực tế. Giữ verifier hash/config, corpus, terminal map và silent fallback nguyên trạng. Giữ nguyên toàn bộ evidence campaign cũ.

## Code làm gì

Code tiếp tục tính/đọc lại cartQuote đúng revision, trả kết quả record_negotiation, kiểm receipts và final gate hiện tại. Trong phạm vi này không có bằng chứng code làm mất dữ liệu nên không patch runtime/serialization. Chỉ sửa owner instruction và hash binding. Nếu review phát hiện wire thực tế mất field, dừng giả thuyết này và ghi finding trước khi mở rộng scope.

## Kiểm tra và giới hạn

- Chạy focused protocol/owner presentation tests để kiểm prompt identity, wire projection và dữ liệu không mất. Không thêm test tìm keyword/số tiền trong câu trả lời để giả làm kiểm semantics.
- Chạy existing commerce effects tests, đặc biệt cartQuote/current-state/duplicate record_negotiation. Không viết thêm tests mirror implementation cho một thay đổi prompt có thể rollback.
- Self-review diff: đúng một instruction region và owner hash, không đổi verifier/corpus/authority/recovery. Cùng independent reviewer kiểm bản sửa và results đến APPROVE; sửa mọi finding thực chất, không bỏ finding để lấy approval.
- Approval ở đây là chấp thuận kế hoạch/bản sửa có giới hạn. Chưa chạy model mới nên chưa có bằng chứng cải thiện chất lượng, độ tự nhiên hoặc ổn định. Giữ B_NOT_GO.

## Acceptance cho lần chạy model sau, chưa chạy trong task này

Đọc cả đoạn khách xin bớt và actual terminal outcome: reply dùng quyền lợi cụ thể có trong current quote, không gán sai loại ưu đãi/khẳng định giảm thêm, không đọc phép tính dài nếu khách chưa cần, không chốt đơn thay cho trả lời phản đối giá. Kiểm cả trường hợp quote đổi, không có giảm, và quyền lợi hiện tại khác loại để tránh học thuộc một câu30000/499000. Giữ mọi generation/error trong denominator; không chấm keyword và không dùng verifier PASS làm điểm bán hàng.

## Những gì không được lấy làm PASS

Không lấy hash tests hoặc source review làm chứng minh hội thoại tốt hơn; không đổi nhãn hoặc bỏ ca cũ. Không coi câu ngắn hơn hoặc có số tiền là đủ nếu reply sai ý khách hoặc tự tạo quyền lợi. Không mở rộng sửa giọng toàn cục khi finding hiện tại chỉ là dùng dữ liệu thương lượng chưa cụ thể.
