# Các ca fallback và handoff đã chạy

Chỉ 14/46 native thực chạy. Bốn persisted outcomes dưới đây đều capture đúng một message, không có ảnh; bốn Outbox rows SENT_ACCEPTED. Draft bị chặn không được dùng thay actual customer outcome khi chấm chất lượng.

## 1. Discovery — OWNER_TOOL_MODE

Actual customer: “Phần này em chưa trả lời được, chị nhé.”

Owner 1 gọi search_products. Owner 2 đọc SQ629, SQ748 và V406. Đã dùng hai tool rounds và bốn calls. Owner 3 nhận mode NONE/0 declarations nhưng vẫn trả search_products với query khoảng trắng. HTTP 200 và đúng model Gemini; không phải auth, quota hoặc timeout. Controller không chạy call đó, không retry, và capture bounded fallback.

Đây là model/provider contract và tool-planning failure; dữ liệu ba món đã được trả. Một lượt chưa xác định nguyên nhân sâu duy nhất. Không tăng budget, thêm repair loop hoặc vá regex để cứu cùng run.

## 2. Gallery — chưa có ảnh chung đã chọn

Draft không gửi:

> Set Thạch Thảo hiện hệ thống chưa có ảnh màu be riêng, em gửi chị ảnh chung của mẫu nhé.
>
> Set gồm áo tơ Hàn thêu giá 499.000đ, chân váy ren tơ 449.000đ, hoặc chị lấy trọn bộ giá 799.000đ sẽ tiết kiệm hơn ạ.

Actual customer: “Chị muốn xem ảnh tổng thể hay ảnh cận chi tiết của mẫu này ạ?”

Select(color=be) chỉ trả MEDIA_COLOR_BINDING_UNVERIFIED. Chưa có Generic selection thành công và không có prepared attachment. Model vẫn nói gửi ảnh chung rồi kết thúc khi còn tool round.

Verifier báo unsupported theo media lookup màu. Câu “chưa có ảnh màu” có thể mang nghĩa service availability, nhưng nới nghĩa câu đó vẫn không tạo được ảnh chung đang thiếu. Cần phân biệt lookup thiếu binding với media đã chọn để đính kèm. Giọng “hệ thống” và actual fallback hỏi lại cũng chưa hữu ích. Không có opaque asset ref lọt ra khách trong run này.

## 3. Deadline — cần xét nghĩa từ chối nhận hẹn

Khách: “Chị cần bộ này sáng thứ Sáu, ship về Cần Thơ có kịp không em?”

Draft không gửi: “Set váy Thạch Thảo hiện có thời gian giao hàng về Cần Thơ khoảng 4 đến 8 ngày nên không kịp nhận vào sáng thứ Sáu ạ.”

Actual customer: “Phần này em chưa trả lời được, chị nhé.”

ETA 4–8 ngày khớp claim nguồn. Cần Thơ dùng cùng thời gian miền Nam; không có lỗi mapping vùng trong ca này. Verifier chỉ báo unsupported/ETA ref, không có span.

Owner từng chấp nhận báo “không kịp” khi shop không thể nhận hẹn chắc lịch. Vì vậy có khả năng verifier chặn nặng cách nói cam kết dịch vụ. Câu hỏi “thứ Sáu” chưa chốt ngày tháng; processingAt là tối thứ Sáu, tạo thêm ambiguity. Không kết luận chắc owner sai hay verify sai chỉ từ cụm đó. Giữ nguyên raw/verdict; actual fallback vẫn quality FAIL. Cần tách service commitment, estimated arrival và nghĩa ngày hẹn theo cả hội thoại, không thêm regex hoặc ép giọng dè dặt.

## 4. Size — expected code handoff

Actual customer: “Em chuyển nhân viên chọn size cho chị nhé.”

Không có chart đúng authority/scope cho SV2447. Code commit handoff và accepted Outbox giữ đúng reply. Đây là source/chart gap đã biết; không xin lại ba vòng hoặc lấy chart SQ2447 cho SV2447. Không gọi đây là model không hiểu chiều cao/cân nặng, cũng không coi là đã tự động chọn size thành công.

## Visual — một fallback riêng

Visual slot 3 bị unsupported/product:SV2447. Owner có pixel, verifier chỉ nhận trusted metadata/hash; catalog colors rỗng, draft nhắc sắc trắng/cao cấp và rất dài. Verdict không có span nên chưa isolate nguyên nhân. Có thể có bất cân xứng evidence giữa appearance input của owner và verifier; chưa đủ để nới mọi lời khuyên.

Actual terminal là static fallback. Treatment không promote vì một pair giảm usefulness và pair còn lại chưa hơn rõ. Native không áp treatment preload này. Fallback này không được tính vào ba native fallback.
