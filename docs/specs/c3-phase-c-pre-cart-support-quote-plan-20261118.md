# Báo giá hỗ trợ trước giỏ — 18/11/2026

Owner yêu cầu triển khai sau khi xác định nút thắt: khách cần giá để quyết định mua nhưng phải vào giỏ mới có kết quả hỗ trợ. Base `0291d37c830b120e6f794e63d1b25b83041b3a51`. Scope implementation, chưa chạy provider trong lượt này.

Đã triển khai tại `ecdbf32591941f65ed31798a7b021445160da46d`, review độc lập APPROVE CODE, 759 test worker và 155 Node PASS. [Implementation, lệnh thực chạy và giới hạn](evidence/c3-pre-cart-support-quote-20261118/IMPLEMENTATION.md). Đã đo model trên `98bff18b`: J4 5/5, control 4/5, 29 SEND/1 HANDOFF; cơ chế báo giá trước giỏ quan sát được trong 10/10 lần. [Đủ kết quả/finding](evidence/c3-precart-support-native-20261118/REPORT.md). Phase C giữ STOP; không đổi điểm hoặc sửa runtime trong lượt đo.

## Thiết kế

1. Giữ record_negotiation để lưu lời xin có source message xác thực. Không parser, không cấp cho model quyền chọn tier/mức giảm. Không có lời xin đã được code nhận thì quote_product giữ giá/ưu đãi thường.
2. Thêm getter code-only ở effects: chỉ trả bằng chứng pending khi chưa có giỏ/negotiation, đúng product/offer, sales episode/profile, policy id/version/hash, còn hạn và nguồn thời gian hợp lệ. Không ghi state, không tiêu thụ objection và không tăng tier.
3. quote_product với quantity rõ ràng dùng nguồn giá hiện có và evaluateShopPolicy hiện hành để tính giá thường và mức cho lần phản đối đầu, cùng quy tắc mà giỏ sẽ dùng. Opening unit quote không truyền quantity vẫn chỉ là đơn giá, chưa là quote hỗ trợ. Không dựng giỏ giả, không chọn sẵn màu/size. Giá chưa xác định do lựa chọn ảnh hưởng giá thì tiếp tục đường thiếu thông tin hiện có.
4. Quote công bố supportEvaluation=QUOTED, khoản hỗ trợ/tổng cụ thể, pending/source/policy/price bindings và expiry ngắn nhất. Quote là đề nghị giá có căn cứ; benefitAuthorization vẫn NOT_GRANTED, appliesNegotiationReceipt=false. Không báo đã ghi ưu đãi vào giỏ hoặc đã chốt đơn.
5. Header/owner/verifier đọc cùng quote hiện hành; không để projection ghi đè QUOTED thành NOT_EVALUATED. Header chỉ giữ ref/target/quantity/tổng; proof và khoản hỗ trợ đầy đủ ở canonical literal/result. Pending lưu trữ giữ nguyên. Cache quote được làm mới thuần code từ price/policy đã đọc khi pending thay đổi; không thêm I/O/tool/state write. Đổi giỏ kết thúc quote cũ, không tự tạo quote thay thế ở final readback. Readback đọc lại pending/policy/price, tính lại quote còn cùng giỏ; thay đổi hoặc hết hạn làm binding cũ không qua final gate.
6. Tạo giỏ tiếp tục chọn biến thể, kiểm nguồn/quyền/revision và chạy activation/receipt hiện có. Cùng đầu vào phải cho cùng tổng; khác số lượng/giá/policy phải tính lại, không replay mức quote cũ hoặc xét hai lần. Đổi policy làm pending cũ không đủ quyền cấp ưu đãi.
7. Sửa đoạn chỉ dẫn nghiệp vụ/giọng và tool description liên quan để dùng kết quả báo giá ngay; bỏ bắt khách vào giỏ để biết mức hỗ trợ. Verifier chỉ cho phép mức trong quote code còn hiệu lực; lời khẳng định effect vẫn cần receipt. Giữ các ranh giới size/media/privacy và model/budget hiện hành.

## Verification

Quan sát RED trước: lời xin + quote chưa có giỏ vẫn tính NOT_EVALUATED/giá thường; projection đánh mất kết quả QUOTED. GREEN cần:

- Một/hai món, set tính một đơn vị; giá hỗ trợ trước giỏ khớp kết quả activation và phí ship không bị trừ hai lần.
- Chỉ hỏi giá không được hỗ trợ riêng; target/offer/policy/episode/profile sai hoặc nguồn hết hạn không cấp quote hỗ trợ.
- Quote/readback không tạo giỏ, không ghi negotiation/tier hoặc tiêu thụ source; đọc lại không tăng mức.
- Policy/price/pending thay đổi hoặc hết hạn giữa verifier và send chặn binding cũ; giỏ đúng hỗ trợ có receipt và không kích hoạt lại.
- Cả native/final giữ QUOTED, phần chưa commit, lịch sử, tiền và refs; nosupport vẫn tương thích.
- Worker focused effects/quote/owner/callable/state/boundary/ingress/media/handoff, adapter/protocol tests và build/typecheck/lint. Shared source không sửa.

Self-review và review độc lập, xử lý finding trước khi báo hoàn tất. Không sửa corpus/điểm cũ hoặc tự dùng kết quả replay cũ như bằng chứng chất lượng. Chạy model là phép đo sau implementation, chưa thuộc lượt fix này.
