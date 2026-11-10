# Findings — sales context run

Đã hoàn tất 16/16 slots N1, 36 generation requests/retry0/provider error0; primary khóa tại `64b2cd67` trước diagnosis. Có 12 USABLE, 3 NEEDS_EDIT, 1 OWNERSHIP_CONTROL; không có UNUSABLE/fallback. Đây là quan sát trên population đã đăng ký, không phải full24 B1 hoặc A2/A3.

## Những thay đổi đã nhìn thấy

- Hai lượt đi xe dự cưới (integrated/advice) không còn bị context MALFORMED; actual replies chọn một món của shop, dùng chất liệu để giải thích lựa chọn theo ưu tiên mới. Integrated chọn Khánh Trang, replay chọn Thanh Vũ từ cùng tập nguồn, không chứng minh có một lựa chọn tối ưu duy nhất.
- Trace integrated chỉ gọi một search nhu cầu rồi giữ runtimeProducts 1→4→4, không có rejection PRODUCT_BOUND. Vì thế chỉ kết luận lỗi tràn không tái diễn ở mẫu này; không gán hết cải thiện cho nhánh admission mới vì nhánh overflow không được kích hoạt trong provider run. Tests RED→GREEN của implementation mới là evidence trực tiếp cho nhánh đó.
- Lookup đã thực sự gọi `search_products({productCode:"SD375"})`, nhận MATCHED và báo đúng áo lẻ929k/cả bộ1.065k. Cả hai surface diễn giải lựa chọn bằng lời khách hiểu; replay không còn “AO / COMPOSITE”. Đây là cơ chế được quan sát, chưa chứng minh mọi mã đều được model gọi đúng.
- Partial-source không còn tự xác nhận shop có bán lẻ chân váy. Cả hai câu giữ unknown đúng nguồn, không bịa giá/tồn, không hứa gọi lại. Hai câu vẫn NEEDS_EDIT vì cách báo phần thiếu dài và nội bộ.
- Hành trình giữ đúng áo/be/M→hai áo/be/L→tổng978.100đ→sửa74/96 giữ L→lời mời checkout thực tế→private preview→xác nhận mua. Preview mới ghi rõ “2 áo … màu be, size L”; confirmation mới nói chuyển nhân viên lên đơn, thay “ghi nhận xác nhận mua hàng”. Private turn0model requests, DB test đã drop.
- Advice concern đưa một lựa chọn bán hàng có lý: lấy áo thêu499k phối đồ đơn giản sẵn có để bớt ren, hoặc cả bộ799k. Không gợi lấy riêng chân váy ren như một cách tiết chế ren. Đây là phần hữu ích hơn trong actual reply, không phải vì có thêm keyword.

## Ba actual replies cần sửa

1. **Correction:** dữ liệu và lựa chọn đúng, không claim mặc vừa; lời “cập nhật lại số đo…giữ nguyên trong giỏ” vẫn giống báo cáo xử lý. Nhắc số đo không tự là lỗi; vấn đề là cả cách tiếp nhận còn hành chính, chưa đạt giọng owner yêu cầu.
2. **Partial-source integrated:** “hệ thống chưa ghi nhận…giá/tồn kho chi tiết từng phần…chưa thể xác nhận…” nói về tình trạng nguồn quá dài. Khách cần hiểu phần nào chưa chốt được để mua; không cần nghe cấu trúc vận hành.
3. **Partial-source advice:** “mẫu này thiết kế gồm cả áo và chân váy…hiện hệ thống…” lặp dữ kiện không giúp phần khách hỏi, rồi kết bằng nhiều lời đệm. Giới hạn nguồn là thật; cách diễn đạt cần cải thiện riêng.

Đủ ba nguyên văn trong [FALLBACKS.md](FALLBACKS.md), đủ16 lượt trong [CONVERSATIONS_AND_REVIEW.md](CONVERSATIONS_AND_REVIEW.md). Không sửa thêm hoặc chạy vòng bù từ kết quả này.

## Cách đọc chênh lệch so với vòng trước

Fallback3→0 là thay đổi terminal quan sát được; một former fallback nay vẫn chỉ NEEDS_EDIT. Primary USABLE7→12 không hoàn toàn là cải thiện owner: concern integrated cùng kiểu nhận xét nhẹ/rũ nay được chấm USABLE + góp ý giọng theo clarification đã freeze trước run. Không dùng riêng sự đổi nhãn ấy để chứng minh prompt tốt hơn. Advice concern có thay đổi nội dung giúp chọn đồ; lookup có diễn giải lựa chọn rõ hơn; hai changed-occasion nhận được actual answer thay fallback. Live source/sampling vẫn có thể khác, nên không phân bổ điểm cải thiện cho từng edit.

Các câu còn xếp nhiều tính từ, nhắc ngân sách/thời gian đã biết và dùng “phân loại”; ghi thành voice findings thay vì loại mọi câu. Preview còn mã SV2447 vì formatter chưa có tên sản phẩm đã bind tại chỗ. Không nâng verdict safety thành quality PASS, cũng không bắt tư vấn thẩm mỹ cần kiểm nghiệm riêng.

## Phần nào đang gây vấn đề còn lại

Trong vòng này verifier không chặn câu nào: 12/12 PASS, exact final hashes/bindings khớp; không có cơ sở nới verifier thêm để sửa ba lỗi giọng. Luồng state/giỏ/quote/checkout chạy được. Partial-source thiếu dữ liệu do fault đã đăng ký và model nay giữ unknown; không thể sửa thiếu nguồn thật chỉ bằng giọng bán hàng.

Vấn đề còn quan sát trực tiếp nằm ở owner diễn đạt: kể trạng thái nguồn và thao tác thay vì nói ngắn theo việc mua của khách. Những từ/cấu trúc nội bộ trong context/tool contract có thể góp phần, nhưng run này chưa tách được tác động của context, prompt và thói quen model. Không coi giả thuyết này là root cause đã chứng minh hoặc tiếp tục nhồi thêm câu cấm/ví dụ để cứu ba mẫu.

Giữ STOP sales/live readiness do còn finding giọng và chỉ mới một mẫu mỗi ca. A OWNER_BYPASS; không deploy, live send, tạo đơn POS thật hoặc tự mở vòng tiếp.
