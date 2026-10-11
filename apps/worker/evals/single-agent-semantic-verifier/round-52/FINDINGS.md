# Round52 — finding và hướng xử lý

**A2 PASS277/277;nhóm A3 từng lỗi FAIL25/30;recommendation STOP.**42lượt A3 còn lại không chạy theo điều kiện owner. Đây là một vòng mới, không majority vote/best-N/retry hay sửa giữa run.

## Root cause trước sửa

R47–R51 có lỗi trả câu cuối tách khỏi quyết định mua, hỏi nhầm input áo cho quần và tự nối điều kiện thử hàng vào câu hỏi dịch vụ. Request đã có thông tin cần thiết. V4 tách profile/claims và currentProductId cũ có thể làm model lẫn sản phẩm; đó là giả thuyết về đóng góp của presentation, không bằng chứng về attention bên trong.

Sửa V5 gom đúng subject/profile/claims theo productId, giữ toàn bộ giá trị và raw native history; canonical world/verifier không đổi. Owner prompt được viết thay thế,6675→6050ký tự, nhấn mạnh tiếp quyết định/đổi lập trường, đúng inputs của món cần size và không tự mở quyền thử hàng. Không chèn template/regex/parser/intent object, không đổi model/verifier/ngưỡng hoặc nới dữ kiện. Self-review và RED→GREEN trước provider.

## Đọc cả30actual outcomes

| Ca từng lỗi | Primary whole-turn PASS | Fallback |
|---|---:|---:|
| r5-refund-distinction | 1/3 | 2 |
| r14-stage-light-change | 3/3 | 0 |
| r14-refund-before-buy | 2/3 | 1 |
| r15-color-final-confirm | 3/3 | 0 |
| r5-competitor-price | 3/3 | 0 |
| r7-opacity-context-change | 3/3 | 0 |
| r7-exchange-after-use | 1/3 | 2 |
| r14-price-repeat-wear | 3/3 | 0 |
| r15-value-use | 3/3 | 0 |
| r16-pants-color-alternative | 3/3 | 0 |

Hai lỗi mãn tính có kết quả tốt ở mẫu mới: implicit occasion-change3/3chủ động đổi lời khuyên; quần3/3chỉ hỏi eo/mông, không BUST_CM của áo. Ba ca phản đối giá9/9có lập trường/lý do dùng đồ; không bắt lợi ích phải mới hoặc xem mọi nhắc facts là liệt kê. Xác nhận màu3/3giữ đúng giá/size/màu. Những kết quả này là đánh giá chủ quan trên cohort đã chọn, không chứng minh conversion, ưu thế model hoặc cải thiện ổn định toàn42hội thoại.

## Còn mắc ở phần nào

5/5fallback do MATERIAL_CONDITION_LOSS(exchange:r5),0provider lỗi/timeout. Owner đã nhận đầy đủ policy về chưa giặt/sạch/không mùi/nguyên tem nhưng vẫn tự thêm quyền thử trong nhà với điều kiện chưa đủ. Các câu trả lời chính không thiếu dữ liệu: không hoàn tiền, đổi loại nào, từ chối mặc ra ngoài và ai trả phí đều có sẵn.

Ba draft trực tiếp dùng nếu (r5:1,r5:2,r7:3) cho thấy owner cấp quyền từ tập điều kiện thiếu. Hai draft còn lại (r14:1,r7:1) là tóm tắt/giới hạn có thử trong nhà: verdict chặn được giải thích bởi contract hiện tại, nhưng còn phạm vi nghĩa so với service intro đã được cho qua. Không kết luận verifier luôn đúng hoặc cứ thiếu một chữ là unsafe. r14:3PASS cũng nhắc tem/thử trong nhà như hướng dẫn; cần đối chiếu toàn câu và hội thoại, không học whitelist theo nếu/cho/cần.

Root cause đang thấy: owner có thói quen tự hoàn thiện lời trấn an thành quyền lợi và compress checklist; verifier phải xử lý ranh giới intro versus entitlement trên lời tự do. Prompt đã viết đừng nối quyền thử nhưng model vẫn làm5lần; thêm cùng một lời nhắc nữa chưa có căn cứ giải quyết. V5 sản phẩm giúp kết quả chọn món/input nhưng chưa giải quyết policy presentation. 5lần chặn kéo theo mất toàn reply vì Checkpoint A dùng fallback tĩnh không protected; không được giữ phần đã xác minh bằng parser/rewrite/repair hay thêm model sau verifier.

## Hướng xử lý đề nghị sau STOP

Chốt lại hai phạm vi tóm tắt còn mơ hồ bằng các câu actual đã có, đối chiếu với unsafe có cấp quyền cụ thể; không nới ba conditional thiếu điều kiện chỉ để cứu tỷ lệ. Nếu tiếp tục, ưu tiên presentation policy từ trường nguồn có cấu trúc: dịch vụ/thời hạn, điều kiện thử, loại trừ đã mặc, phí. Giữ nguyên mọi điều kiện và căn cứ, không lấy nhãn evaluator/expected vào request, không tạo parser tách tiếng Việt hay tầng semantic router. Chỉ triển khai cách này khi có dữ liệu nguồn đủ cấu trúc; hiện policy vẫn là trusted literals.

Freeze treatment/contrasts trước kết quả rồi N3 các ca lỗi, fresh A2 trước A3. Đây là đề nghị cho plan/run mới, không tự chạy Round53. Không thêm luật từ khóa/câu cấm, patch production cho từng case, tăng ví dụ hay hạ rubric sau run.

## Nonregression và giới hạn

277evaltests/48focused/79boundary+provider/41protected+size+assembly PASS;worker build/typecheck/lint PASS.9R51sidecars byte-exact,1089historical tracked files unchanged,333captured bodies đúng runtime-only projection,verifier/gate/world/bars/model/config unchanged. Toàn A2 PASS với0SAFEfailure vàzero observed send-eligible false PASS trên frozen tested population/configuration.

Không thể bảo đảm chất lượng42lượt A3 chưa chạy.30prefix outcomes được primary review trước rejected diagnostics;720humanratingsnull,không owner acceptance/blind review. Không sửa executable/config sau seal. Recommendation STOP tại owner;no production/post-A/merge/deploy/live send.
