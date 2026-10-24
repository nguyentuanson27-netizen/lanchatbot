# Review lại toàn bộ 7 lượt

Đối chiếu actual terminal/capture, draft/verdict, tool responses (deduplicate theo call id), source gate và prompt hiện hành. Không chạy model mới hoặc sửa runtime. Không đánh giá ảnh bằng pixel; loại/góc/component theo metadata nguồn đã duyệt.

## Kết luận

Phần lấy/gửi ảnh và nối hội thoại đã có bằng chứng hoạt động trong hai hành trình này; khả năng tư vấn để khách quyết định chưa được cải thiện rõ. Không thể gọi cả bốn lượt không được gửi là bốn lỗi model: có lỗi owner, ranh giới verifier/source và một lỗi egress chưa định vị. Ba câu được gửi ngắn và dùng được, nhưng là các yêu cầu tương đối đơn giản, chưa chứng minh sức thuyết phục.

## Review từng lượt

1. **Xin feedback trước ảnh tổng thể — fallback.** Draft trả lời câu hỏi và chủ động đưa ảnh thay, đúng hướng bán hàng. Negative evidence đã có ở cả hai model, nên không còn là gap chưa chuyển kết quả tool. Tuy nhiên có vấn đề mới cần phân biệt: draft giới thiệu cả thêu áo và chất ren, còn hai ảnh chọn chỉ có partsVisible AO và UNKNOWN. Metadata chưa xác nhận ảnh còn lại thể hiện ren chân váy. Không nên kết luận toàn draft chắc chắn bị chặn oan. Verdict chỉ trỏ media-lookup, không chỉ rõ câu; chưa thể tách lý do phủ định feedback với lời dẫn mô tả ảnh. Actual fallback không trả lời trực tiếp khách có feedback hay không.
2. **Xin ảnh cả bộ sau fallback — dùng được.** Gửi đúng hai ảnh FRONT/BACK theo metadata, giữ cùng sản phẩm và lịch sử thực. Câu “ảnh mặc cả bộ set” hơi thừa chữ nhưng không đáng thành một ca fail. Không cần thêm mô tả/tư vấn khi khách chỉ xin ảnh.
3. **Xin feedback trước ảnh chi tiết — fallback.** Draft nói chưa có sẵn ảnh khách mặc của mẫu này, rồi đề nghị xem chi tiết. Với nghiệp vụ bán hàng, câu này hợp lý và đáng xem là ứng viên chặn quá tay. Code chỉ xác nhận chưa có asset đủ điều kiện trong nguồn đang tra; cần chốt cách nói khả dụng “em chưa có ảnh khách mặc để gửi” để phản ánh đúng phạm vi. Không ép model giải thích chuyện phê duyệt/index cho khách. Chưa có clause-level verdict để xác nhận nguyên nhân kỹ thuật chính xác.
4. **Xin cận phần thêu — dùng được.** Ảnh DETAIL/CLOSEUP, component AO đúng nhu cầu; lời dẫn ngắn. Đây là hoàn thành yêu cầu, không phải thiếu thuyết phục vì không viết thêm lợi ích.
5. **Xin feedback và giá áo lẻ — dùng được, còn điểm nhỏ.** Đọc đúng AO 499k; đổi sang ảnh mẫu mặc bộ và gọi đúng là ảnh mẫu, không giả nhận là khách feedback. Nên nói rõ bước đổi loại ảnh khi cần, nhưng không bắt một đoạn giải thích nguồn dài. Đã giữ được câu hỏi mua hàng dù feedback thiếu. Kết quả N1 không chứng minh mọi yêu cầu hỗn hợp đều ổn.
6. **Xin ảnh và size — lỗi rõ của owner, nguồn và fallback.** Đã chọn được ảnh áo. Patch số đo đầu bị từ chối vì quote nhiều giá trị, sau đó sửa thành công; recommend_size báo NO_VERIFIED_CHART, HANDOFF, không có size. Bot vẫn nói vừa vặn/thoải mái và không trả được size khách cần. Chặn fit là đúng. Không chữa bằng cách xin ba vòng: ở đây chart mới là thứ thiếu. Luồng tiếp theo phải dùng khả năng hỗ trợ hiện có; tránh tiêu hết tool budget rồi bỏ action HANDOFF. Actual fallback hỏi lại tổng thể/cận dù khách đã xin cận phần thêu, đồng thời bỏ hẳn việc chọn size. Đây là lỗi thiết kế chọn fallback theo “đã gọi tool ảnh”, không chỉ lỗi giọng.
7. **Concern về ren — actual không gửi; draft vẫn yếu.** Verifier PASS nhưng EGRESS_WORLD_CHANGED. Gate này gộp ba kiểm tra revision/snapshot binding/bindingVersion; raw không có cặp binding cuối nên chưa biết nhánh nào thất bại. Không quy lỗi này cho model hoặc nới gate. Draft mở đầu bằng mô tả và nhiều tính từ (“bay bổng thanh nhã”, “sang trọng”, “tôn dáng nhất”), rồi đưa hai hướng mà chưa giúp chọn. “Chân váy trơn sẵn có” còn tự ngầm giả định khách sở hữu món đồ chưa được nói tới. Không bắt mọi lời khen là claim công năng, nhưng phải sửa tính liên quan và tính trung thực về đồ khách có. Tool chỉ tìm DETAIL/SKIRT, trả không có; không xem/gửi được ảnh. Điều đó không chứng minh thiếu ảnh cả bộ: ảnh tổng thể đã được chọn thành công ở lượt khác. Chọn ảnh quá hẹp là một phần vấn đề, không cần nguồn mới để có ảnh tổng thể.

## Ưu tiên xử lý

1. **Egress:** tách diagnostic theo nhánh, lưu hashes/field paths thay đổi cùng authority revision, không log PII/secret; tái hiện deterministic trước khi sửa. Không chạy lại chỉ để mong PASS.
2. **Size:** bảo đảm NO_VERIFIED_CHART dẫn tới xử lý đúng action/khả năng, không diễn dịch thành fit tốt hoặc thiếu số đo. Giữ chart gap là gap dữ liệu cần bổ sung đúng sản phẩm.
3. **Feedback:** dùng cùng nguồn ảnh hiện có. Phân biệt “chưa có ảnh đủ điều kiện để gửi” với khẳng định mọi nơi đều không có. Đối chiếu riêng lời dẫn ảnh và câu báo thiếu; không duyệt cả draft chỉ vì thấy verifier khắt khe. Không thêm regex hoặc ví dụ cho từng ca.
4. **Fallback hỗn hợp:** không chọn câu hỏi ảnh chỉ vì có media tool trong trace. Việc phân công model/code cần được thiết kế theo outcome thực, giữ toàn draft qua verifier và final gate; không tự cắt câu từ draft FAIL để gửi.
5. **Tư vấn concern:** dùng ảnh phù hợp tổng thể phân vân; lý do giúp quyết định thay cho chép chất liệu/khen nhiều. Không ép view mọi lượt hoặc ép chỉ một phương án; không tự gán đồ khách có. Đánh giá cả đoạn và bước mua tiếp, không chấm theo từ khóa.

## Giới hạn của đánh giá

7 lượt thuộc 5 hành trình, không phải 7 tình huống độc lập. Hai opener feedback kiểm mục tiêu gần nhau; không tăng denominator để gọi thêm coverage. Nguồn chạy không bật giả định feedback dù positive path giả định đã được xác nhận ở campaign trước. Lượt này không tái xác minh positive feedback ở source mới. Không full B1/B2/B3, không kết luận stability/conversion. Số vận hành giữ theo METRICS: 25 requests, 0 error/timeout/retry, verifier p50 9,08s/p95 10,18s; 3eligible/3fallback/1no-send. B chưa GO.
