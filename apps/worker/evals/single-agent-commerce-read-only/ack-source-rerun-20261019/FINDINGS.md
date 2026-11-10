# Findings — ACK/source wording rerun

Đã hoàn tất **16/16 slots N1**, 35 generation requests, retry0, không quan sát lỗi source/provider/timeout. Khác vòng ack-source bị gián đoạn, vòng mới đủ capture và không có BLOCKED. Giữ một owner Gemini 3.5 Flash Lite HIGH và một verifier GPT-6.1 Sol high, cùng prompt/runtime/cases/config.

Primary whole-turn review khóa tại `bc3e38da` trước diagnosis: **14 USABLE, 1 UNUSABLE actual fallback, 1 OWNERSHIP_CONTROL**. USABLE nghĩa là câu có thể dùng để phục vụ việc mua với các góp ý kèm theo; không tự chứng minh giọng tốt, quyết định tối ưu hoặc Phase B đã GO. Không đếm keyword, số câu hoặc bắt theo một câu mẫu để gán nhãn.

## Ba câu từng cần sửa

- **Correction:** “Dạ vâng chị nha, em đã cập nhật lại số đo cho chị rồi ạ. Giỏ hàng của mình vẫn giữ 2 chiếc áo Thạch Thảo màu be size L như chị chốt nhé!”. State đúng eo74/mông96, giữ hai áo L, không claim fit. Không đọc lại hai số đo nhưng vẫn hai câu với lời đệm và trạng thái giỏ. Dùng được/cần polish; dài hơn correction một câu của vòng lỗi trước. Vì vậy chưa thể nói fix giọng ACK đã ổn định. Nhắc số vừa sửa có ích vẫn được phép; không lấy việc bỏ số làm tiêu chí PASS.
- **Partial-source integrated:** trả vải/dáng rồi nói chưa kiểm được việc mua riêng/giá M. Đã bỏ kể “hệ thống chưa ghi nhận”, không tự nhận shop có hoặc không bán lẻ, không bịa giá/tồn. Vẫn nhiều tính từ và “chị thông cảm giúp em”; đó là góp ý giọng, không tự động thành reply không dùng được.
- **Partial-source advice:** một đoạn nêu chất liệu/dáng, rồi nói chưa tra được tách lẻ/giá/tình trạng M. Không kể hệ thống hoặc xin thông cảm dài. Đây là mẫu tốt hơn của cách báo phần thiếu; vẫn chưa có đủ dữ kiện để báo giá/tồn vì fixture cố ý ngắt POS, không chấm thiếu nguồn như lỗi hiểu nhu cầu.

Hai lời báo thiếu nguồn giờ có evidence mới, khác vòng lỗi Qdrant không có generation. Chưa thể kết luận cải thiện bền vững từ N1; không cần sửa verifier để giải quyết giọng.

## Một fallback đúng ranh giới

Advice changed-occasion viết rằng khi đến nơi “chỉ cần giũ nhẹ hoặc treo lên là vải sẽ suôn phẳng lại ngay”. Verifier FAIL/UNSUPPORTED_PROTECTED_ASSERTION/product:SV2447; khách thực nhận static fallback. Đây là lời hứa hiệu quả xử lý nếp nhăn cụ thể không có nguồn, không phải chỉ nhận xét định tính về chất liệu. Cùng kiểu lỗi tự phẳng từng xuất hiện trong integrated draft của vòng ack-source trước. Không nới verifier hoặc lấy kết quả integrated PASS cứu advice FAIL.

Integrated cùng case chọn Khánh Trang theo so sánh chất liệu và actual reply được PASS. Advice là generation khác trên captured world, cho thấy lựa chọn và lời hứa của owner vẫn có biến động; không phải hai lời đáp độc lập từ nguồn live hay bằng chứng một chọn món luôn đúng. [Exact rejected draft và terminal](FALLBACKS.md).

## Những phần khác

- Giỏ/quote/checkout vẫn đúng: áo be/M → hai áo be/L → 978.100đ → sửa số đo nhưng giữ L → actual invitation → private preview → purchase confirmation. Private turn0model requests, DB test đã drop, không có live order/send.
- Lookup cả hai surface báo đúng áo lẻ929k/cả bộ1.065k, không AO/COMPOSITE. Hai giá phục vụ trực tiếp câu hỏi, không coi là fact dumping. Câu hỏi chọn phần nào còn khuôn nhưng không gây sai giá/món.
- Concern vẫn có giọng catalog: mở lại ngân sách, nhiều tính từ, sau đó đưa cả bộ/áo/chân váy. Integrated nói “tiết chế bớt ren” nhưng chưa giải thích phối phần được chọn với gì; tư vấn thiếu sắc và quyết định bị dàn ra. Không tự kết luận mọi đề xuất chân váy ren đều sai — phối với đồ trơn có thể cân bằng tổng thể, nhưng reply này chưa làm rõ. Giữ góp ý chất lượng thay vì dựng một đáp án bắt buộc.
- Một số ACK và quote còn lặp tên/màu/size, nhưng các lựa chọn/số tiền vẫn gắn đúng câu khách hỏi. Không biến mọi nhắc thông tin thành lỗi để tiếp tục thêm luật cấm.

## So sánh và kết luận

So vòng lỗi ack-source: hiện đủ16 outcomes, không source/transport errors, không missing captures; chưa thể lấy tăng USABLE8→14 làm bằng chứng prompt tốt hơn vì prompt không đổi và vòng trước nhiều lỗi vận hành. So vòng sales-context chạy khỏe: hai partial-source bỏ giọng hệ thống và dùng được hơn, nhưng correction cũ đã được review bổ sung là dùng được/cần polish; nhãn cũ vẫn giữ nguyên. Concern vẫn yếu, và giờ có1fallback thay0. Không lấy số tổng để che lỗi mới quan sát hoặc quy mọi chênh lệch cho ba bullet prompt.

**STOP sales/live readiness.** Vòng đã hoàn tất nhưng owner vẫn có thể thêm lời hứa hiệu quả không có nguồn; giọng cải thiện một phần, chưa ổn định. Không sửa prompt/runtime hoặc chạy thêm mẫu trong lượt này. A OWNER_BYPASS, không tự mở full A2/A3/deploy/live send.
