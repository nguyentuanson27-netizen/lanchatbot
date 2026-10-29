# Review chính toàn bộ 22 hội thoại sau sửa read-path

Source `89070980e9fb407fe4031a01f2eae110f7f17181`; đây là review định tính của primary agent, tách khỏi [chấm mù độc lập](BLIND_REVIEW.md). Đã đọc đủ 34 terminal/customer turns, draft verifier chặn và source/tool/diagnostics liên quan. Không chấm draft như reply đã gửi; không coi mọi handoff là lỗi. Không sửa code/prompt sau khi thấy kết quả.

| Ca | Khách thực nhận / finding chính |
|---|---|
| s01 — giá Khánh Trang | Handoff, không báo giá dù có căn cứ. Trace mới cho biết media selection trả NO_VERIFIED_MATCHING_MEDIA, sau đó DEPENDENCY_FAILURE; không có bằng chứng đây là fetch/resize error. Câu hỏi giá bị phụ thuộc vào bước ảnh. |
| s02 — giá áo lẻ | Gửi đúng 499k cho cả hai set, rồi hỏi rõ áo thuộc set quần hay váy. Tốt hơn cách bỏ giá để hỏi lại mẫu. Cụm “ghi nhận chính xác nhé ạ” còn cứng nhưng không phải lỗi trọng yếu. |
| s03 — cận ren | Handoff, không ảnh. Judge source inventory có ảnh DETAIL/MATERIAL_CLOSEUP, nhưng selection hiện tại không tìm được media đúng scope. Trace dừng ở selection, chưa tới fetch; cần đối chiếu selector/component/metadata, không kết luận shop không có ảnh. |
| s04 — màu khác | Verifier chặn đúng: `__NO_COLOR__` bị owner gọi thành “màu tiêu chuẩn”. BE có nguồn không cấp quyền tạo thêm một màu vật lý. Khách không nhận lời đáp màu. Đây là model diễn giải sentinel; không còn đủ căn cứ gọi đơn thuần là thiếu tuple projection. |
| s05 — chọn bộ đi ăn gia đình | Có chọn SQ675 và nêu giá/đặt trước đúng. Tuy nhiên nhiều tính từ liên tiếp, liệt kê cấu trúc áo/quần, lời khen dài hơn điều khách cần để chọn. Judge whole-turn PASS; giữ hạn chế giọng nhẹ, không mở vòng tối ưu prompt trong run. |
| s06 — phối quần nâu | Trả lời được việc phối; không tạo phụ thuộc ảnh. Còn dài và trang trọng: “bay bổng”, “trang nhã”, “sang trọng” cùng đoạn. Dùng được, không coi cách nói thẩm mỹ có nguồn là lỗi bảo vệ. |
| s07 — chọn size, thích rộng | Handoff SIZE_RULE_UNAVAILABLE, nhưng trace cho thấy owner search sang Ngọc Trâm/Uyển Hoa/SQ675/Diệp An, không gọi recommend_size cho Thạch Thảo. Không có căn cứ quy nguyên nhân là chart Thạch Thảo thiếu. Đây là retrieval/tool planning sai hướng trước sizing. |
| s08 — chọn váy đi lễ | Chọn Diệp An, có so với Odette theo đặc điểm nguồn và dịp dùng. Dùng được; câu kết “nha chị ơi” và nhiều tính từ vẫn hơi quảng cáo. Không hứa độ kín dưới đèn mạnh. |
| s09 — giặt tay/máy | Handoff RESPONSE_UNAVAILABLE trước verifier. Đã đọc mô tả hai mẫu nhưng không đọc policy trong lượt; policy nguồn có FAQ giặt tay/máy, câu trả lời có thể có ích. Rớt so với vòng trước. Không đổ cho verifier vì không có verifier request ở ca này. |
| s10 — đổi màu đơn cũ | Handoff EXCHANGE, đúng capability không đọc/sửa đơn cũ. Không gửi tin và không nhận đã đổi. Việc shop phải xử lý tiếp là nhu cầu chưa giải quyết, không đồng nghĩa code xử lý sai. |
| s11 — hai set be L | Read set đúng offer nhưng source trả VARIANT_NOT_FOUND cho màu be; tồn set chưa ghi màu không chứng minh be. Handoff STOCK_UNAVAILABLE hợp lý. Không còn malformed object ở offerType như vòng cũ; không kết luận cả shop hết hàng. |
| s12 — khóa kẹt đổi hàng | Handoff DEFECT đúng phạm vi hậu mãi, không hứa đã duyệt đổi hoặc tự hỏi vòng vo. Nhu cầu đổi thực tế còn chờ shop. |
| s13 — cả ship về Cần Thơ | Giá áo 499k đã đọc; policy ship mặc định30k, nhưng owner handoff ETA_UNAVAILABLE mà khách chỉ hỏi tổng tiền. Cần tách tổng ship khỏi ETA và dùng quote/tool hiện có; chưa quan sát owner gọi quote trong lượt. Không phải provider timeout. |
| s14 — xem thêm | ACK ngắn, tôn trọng khách; không ép chốt, không tự tạo effect. |
| s15 — thích màu be/cảm ơn | Gửi giá499k và điều kiện đặt trước đúng, hỏi size. Dùng được về bán hàng, không có cart mutation; hơi đẩy bước mua khi khách mới nói thích nhưng không coi đó là đã chốt. |
| s16 — ảnh khách mặc | Handoff vì FEEDBACK không có verified match; source inventory hiện có feedback=false. Hợp lý khi thiếu đúng loại ảnh shop, không dùng ảnh model giả làm feedback. Không gộp với s03 vốn có loại cận chất trong inventory. |
| j1 — hai áo M/L + tổng | Lượt đầu add_to_cart trả COLOR_REQUIRED với proof cả NO_COLOR_L và BE_L PRE_ORDER; owner gọi sentinel “màu tiêu chuẩn” nên verifier FAIL. Hai lượt sau no-send vì HUMAN. Không mở giỏ; mất cả nhu cầu mua. |
| j2 — correction số đo | T1 M có SIZE_FIT. T2 lưu đúng51kg+88/70/94 và recommend_size trả OUT_OF_RANGE/missingInputs=[]; chart đã audit không hỗ trợ direct bands đó. Handoff cần thiết, không phải xin thiếu input hoặc dùng lại size cũ. T3 không chen vào HUMAN. |
| j3 — mua áo/phân vân bộ/quay lại áo | Cả ba lượt SEND_ELIGIBLE; hai ảnh được capture. Giải thích phối lại chân váy và so set799k với mua lẻ948k, rồi tôn trọng chỉ áo499k. Current preparation có lại PRICE/STOCK ở các lượt sau; verifier đã cho qua câu hỏi size ở lượt3. Đây là cải thiện quan sát được, chưa chứng minh độ ổn định. Giọng vẫn dài, tính từ dày và lặp ý “hỗ trợ lên đơn”. |
| j4 — áo M/thương lượng/tổng | Cũng mắc NO_COLOR → “bản tiêu chuẩn”, verifier chặn T1. Thương lượng và tổng ở T2/T3 chưa được thực hiện do HUMAN; không coi đây là kết quả đo khả năng thương lượng. |
| j5 — đơn cũ/gặp shop | ORDER_STATUS handoff rồi giữ im lặng theo HUMAN, đúng capability và mong muốn khách. |
| j6 — giỏ/checkout/COD | Add set M có CART_OPENED receipt, tổng giỏ829k. T2 hỏi tên bằng code; T3 lưu COD và vẫn chờ tên. Không nhận đã lên đơn hoàn tất; confirmation=null, thiếu tên/điện thoại/địa chỉ. Câu hỏi tên lặp còn nhẹ; state/receipt/Outbox đúng. |

## Các nhóm nguyên nhân cần phân biệt

1. **Model/tool planning:** s01 lấy ảnh làm dependency cho báo giá; s07 tìm sai hàng thay vì đi sizing; s09 đọc catalog thay vì policy; s13 chuyển từ tổng ship sang điều kiện ETA không cần thiết. Không có lỗi provider ở các ca này.
2. **Model diễn giải dữ liệu:** s04/j1/j4 nhận được tuple proof nhưng vẫn đặt tên vật lý cho NO_COLOR. Verifier chặn có căn cứ; không cứu bằng nới guard hay thêm ví dụ riêng theo ca. Cần quyết định dữ liệu màu shop và cách biểu diễn lựa chọn chưa có label trước một run mới.
3. **Nguồn/capability hợp lý phải handoff:** s10/s12/j5 đơn cũ/hậu mãi; s16 thiếu feedback thật; s11 thiếu đúng set màu be; j2 direct chart OUT_OF_RANGE. Các handoff này không cùng nguyên nhân với trả lời được nhưng bỏ nhu cầu.
4. **Code/data contract còn limitation:** unfiltered SV2447 all-offer tuple proof đạt9961bytes >8192, surfaced reason SOURCE_EVIDENCE_CONFLICT che PRODUCT_EVIDENCE_BOUND. Được phát hiện trước inference và giữ nguyên runtime; không tăng trần/cắt facts để cứu run. Không suy limitation này là nguyên nhân mọi handoff trong batch; phải có trace theo từng ca.
5. **Giọng:** đã có reply dùng được nhưng vẫn kiểu mô tả catalog, dài và nhiều tính từ. Không thấy bằng chứng cải thiện rõ về sức thuyết phục từ một lượt N1; hạn chế giọng nhẹ tiếp tục được chấp nhận, ưu tiên mất nhu cầu chính trước.

## Đối chiếu vòng trước

Vòng trước source68d5c33b:10eligible/15handoff/7no-send/2code. Vòng này:11eligible/14handoff/7no-send/2code. j3T3 và s15 chuyển sang gửi được; s09 chuyển từ gửi được sang handoff. s02 cả hai đều SEND_ELIGIBLE nhưng nội dung mới trả đúng giá trước câu hỏi phân biệt. j1/j4 vẫn không tiến tới mua; s11 không còn malformed nhưng thiếu tuple set be vẫn phải handoff. Vòng trước chưa có blind grades đầy đủ, nên không so hai tỷ lệ quality như paired A/B. Source mới và live-source snapshot mới khác; N1 không xác lập quan hệ nhân quả hoặc ổn định.

**Hướng tiếp theo được đề xuất, chưa thực hiện:** ưu tiên một nhóm lỗi lựa chọn nguồn/tool cho câu hỏi có căn cứ s01/s07/s09/s13; tách dữ liệu màu chưa ghi nhận khỏi lựa chọn màu khách phải chọn và xác minh metadata ảnh s03. Tái hiện riêng codebound với dữ liệu thực, sửa đúng projection/error attribution nếu owner giao. Giữ silent handoff khi shop thật sự thiếu dữ liệu; không lặp thêm vòng voice/template/regex hoặc nới verifier để biến sentinel thành màu thật. Không tự chạy thêm batch.
