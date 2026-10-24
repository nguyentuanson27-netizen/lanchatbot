# So cùng 31 ca với media-size-acceptance

Baseline `af482367`; hiện tại `235d570a`. Mỗi ca chạy một lần, nguồn POS và lịch sử có khác biệt. Bảng chỉ mô tả kết quả quan sát, không quy toàn bộ thay đổi cho bản sửa hoặc so tổng 51 ca cũ với 31 ca mới. Nhãn cũ giữ nguyên lịch sử; đổi nhãn không tự chứng minh model tiến bộ. Review chính đã khóa trước khi đọc diagnostic; bảng đối chiếu này được viết sau đó.

| Ca | Trước | Mới | Nhận xét |
|---|---|---|---|
|`b1-changed-occasion`|NOT_RESOLVED|NOT_RESOLVED|Tool-mode fallback → FINAL rồi STALE. Hoàn tất tool tốt hơn trong mẫu này, nhưng khách vẫn chưa có reply eligible; T2 không can thiệp.|
|`b1-buying-concern-v2`|NEEDS_EDIT|NEEDS_EDIT|Vẫn dài và chưa xử lý chuyện ren/nhiều trang trí; lần này còn trả hai cách mua cho khách chọn.|
|`b1-buying-concern-v3`|USABLE_WITH_POLISH|USABLE_WITH_POLISH|Cùng chọn set 799k và phối lại với chân váy đen; hữu ích ở cả hai, không cải thiện rõ.|
|`b1-changed-occasion-v2`|NEEDS_EDIT|NEEDS_EDIT|Bớt câu bảo đảm nhưng kết thúc bằng tự cân nhắc thời tiết; chưa giải quyết quyết định mua.|
|`sales-discovery-advice:need`|NOT_RESOLVED|NOT_RESOLVED|Cùng actual fallback OWNER_TOOL_MODE; tên sản phẩm/late call khác, chưa thoát lỗi hoàn tất.|
|`sales-product-gallery:overview`|PARTIAL_RECOVERY|PARTIAL_GENERIC_WITH_POLISH|Vẫn hai ảnh chung; từ recovery sang original PASS không chứng minh ảnh đúng màu be. Thêm bảng giá làm nặng câu.|
|`sales-size-advice:height-weight`|NOT_RESOLVED|USABLE_PENDING_FIT_PROVENANCE|Trước handoff im lặng do POS refresh, nay trả M có code fit. Mẫu mới không bị ép refresh nên chưa thể quy cải thiện cho T1.|
|`sales-southern-delivery:deadline`|NEEDS_EDIT|USABLE|Bỏ khối giá, size và hai ảnh; trả ngay ETA và từ chối lịch gấp. Cải thiện đúng mục tiêu T3 trong mẫu này.|
|`media-overview-next:ask`|USABLE|USABLE|Cả hai phân biệt ảnh mẫu với feedback, gửi hai ảnh; dùng được.|
|`media-overview-next:continue`|USABLE_WITH_POLISH|USABLE|Cả hai gửi ảnh cả bộ khi khách yêu cầu; lời dẫn mới gọn hơn.|
|`media-detail-next:ask`|NOT_RESOLVED|USABLE_WITH_POLISH|Trước dependency handoff im lặng; nay báo chưa có feedback và đề nghị ảnh chi tiết, chưa trực tiếp gửi ảnh. Chưa chứng minh thay đổi do T1.|
|`media-detail-next:continue`|BLOCKED_BY_PRIOR_HANDOFF|CAPTURE_TEXT_REDACTION_LIMIT|Trước bị HUMAN của lượt trước chặn; nay có ảnh cận nhưng caption bị redactor, exact text evidence thiếu.|
|`media-and-price:ask`|USABLE|PARTIAL_ALTERNATIVE_WITH_POLISH|Cả hai gửi ảnh mẫu và giá 499k; mới thêm size, bảng giá và CTA chung, không cải thiện giọng rõ.|
|`media-and-size:ask`|USABLE_PENDING_FIT_PROVENANCE|USABLE_PENDING_FIT_PROVENANCE|Cả hai có ảnh cận và M đúng code fit; nhắc cao/nặng hợp lý không tự là lỗi.|
|`media-decision:ask`|NEEDS_EDIT|NEEDS_EDIT|Vẫn lời khen/chất liệu dài hơn việc giúp chọn theo nỗi lo ren, mới thêm ba giá; chưa cải thiện.|
|`negotiation-cart-setup`|USABLE_WITH_POLISH|USABLE|Bỏ bảng giá/ngoặc, nhận đúng áo và pre-order ngắn hơn; N1 observation.|
|`negotiation-price-objection`|USABLE_WITH_POLISH|USABLE_WITH_POLISH_CODE_RECOVERY|Trước owner trả lời dùng được; nay bị chặn vì mở rộng ưu đãi 5% sai. Code summary đúng receipt cứu phần giao dịch nhưng giọng như bản kê.|
|`negotiation-total-control`|USABLE_WITH_POLISH|USABLE_WITH_POLISH|Cả hai trả đúng 499k; vẫn trình bày phép tính nhiều hơn câu hỏi cần.|
|`opening-ad`|USABLE|USABLE|Giá 799k và hai ảnh đúng ở cả hai.|
|`opening-ad-repeat`|USABLE|NEEDS_EDIT_MEDIA_REPEAT|Thụt lùi: trước chỉ trả giá, nay lặp hai ảnh đã gửi. Control T3 thất bại dù câu chữ ngắn.|
|`opening-organic`|USABLE|USABLE_WITH_POLISH|Đúng giá và ảnh ở cả hai; mới thêm giá áo/váy chưa cần.|
|`opening-unresolved`|USABLE|USABLE|Cả hai xin ảnh hoặc tên khi chưa xác định mẫu; không đoán sản phẩm.|
|`opening-multipart`|USABLE|USABLE|Cả hai trả 799k/499k. Mới không có ảnh, nhưng vẫn trả đủ hai ý khách hỏi.|
|`stateful-open`|USABLE|USABLE|Cả hai nhận áo be M và báo đặt trước đúng receipt; không suy rằng M mặc vừa.|
|`stateful-variant-quantity`|USABLE|USABLE_WITH_POLISH|Cả hai đổi đúng L, số lượng hai áo. Mới thêm tổng chưa được hỏi; chỉ cần biên tập gọn.|
|`stateful-quote`|USABLE_WITH_POLISH|USABLE|Cùng trả đúng 978.100đ; bản mới gọn hơn, bỏ khối ngoặc kê khoản.|
|`stateful-correction`|NEEDS_EDIT|USABLE|Từ báo cáo đã ghi nhận hồ sơ sang lời nhận giữ hai áo L; tự nhiên hơn ở mẫu này, chưa thể quy cho sửa rule opening.|
|`stateful-request-checkout`|CODE_CHECKOUT_REDACTED_CAPTURE|CODE_CHECKOUT_REDACTED_CAPTURE|Cùng lời mời nhập thông tin do code dựng; capture che thành NAME nên không so exact wording.|
|`stateful-private-checkout`|CODE_CHECKOUT_REDACTED_CAPTURE|CODE_CHECKOUT_REDACTED_CAPTURE|Cùng preview, tổng 978.100đ, COD và ETA đúng. Tên parent trong dòng áo còn khó đọc.|
|`stateful-confirm`|EXPECTED_HANDOFF|EXPECTED_HANDOFF|Cùng handoff thực sự và lời báo; không giả receipt tạo đơn POS.|
|`stateful-human-request`|EXPECTED_HANDOFF|EXPECTED_HANDOFF|Cùng handoff với lời báo ngắn, không thêm tư vấn hoặc ảnh.|
