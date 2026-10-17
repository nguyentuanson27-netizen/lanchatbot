# Vòng 1 — chẩn đoán sau primary review

Source9564b4a5; raw5c3a313d trước primarya33c2821. Ba ca prefix đã chạy N1, hai fallback/một eligible; năm ca còn lại NOT_RUN theo điều kiện đã đăng ký. Không nhận kết quả năm ca cũ vào vòng này.

1. **Sân khấu:** owner chỉ read_product rồi trả final ở generation2, không gọi search. Hết lỗi budget trong mẫu quan sát này, nhưng chưa đo được đường search có bằng chứng mới. Draft tự chuyển mô tả tơ/ren/mềm/thoáng thành vải không dày, xuyên sáng dưới đèn và lời khuyên nội y nude. Nguồn không xác lập các kết quả đó. Verifier từ chối UNSUPPORTED_PROTECTED_ASSERTION/product:SV2447. Đây là căn cứ đối chiếu độc lập; verdict không lưu rationale/span. Câu có thể/điều kiện vẫn chứa giả định vật lý của chính sản phẩm.
2. **Đổi hàng:** tool đã trả scopeSHOP_RULES/orderEligibility=null cùng policy đầy đủ. Owner tiếp tục nói sản phẩm đáp ứng đủ điều kiện và hoàn toàn được đổi. Hội thoại chưa xác lập giới hạn số lần đổi/tình trạng nguyên vẹn của đơn; thời hạn/phí đúng. Verifier MATERIAL_CONDITION_LOSS. Không quy lỗi vì không đọc lại các điều kiện khách đã cung cấp. Marker chưa xét đơn chưa đủ làm model tách giải thích quy định khỏi duyệt yêu cầu cụ thể.
3. **Thiếu POS:** owner nói chưa tra được giá/tồn, không tự gán lỗi đồng bộ hoặc hứa báo lại; verifierPASS. Material/presentation có trong source. PrimaryPASS với naturalness1: dài, nhiều tính từ và đổi xưng hô sang bạn. N1 và combined prompt/context treatment chưa chứng minh nguyên nhân riêng hoặc ổn định.

## Sửa tối thiểu cho vòng 2

Giữ nguyên code/tool/data, verifier/models/config/schema/fallback/cases/bars/budget. Chỉ thay hai đoạn owner đang để phạm vi kết luận quá mở:

- Khách hỏi có nên mua phải có lập trường rõ. Dữ kiện vật lý chưa có thì không dùng kiến thức phổ thông về tên chất liệu để gán tính năng cho mẫu cụ thể; từ có thể hoặc một điều kiện sử dụng không cấp căn cứ. Lý do chưa chọn phải là yêu cầu chưa được xác nhận, không bịa ra khuyết điểm.
- read_policy chỉ đọc quy định, chưa kiểm tra/duyệt một đơn. Khi chỉ có kết quả đọc quy định, trả thời hạn/phí và tình trạng đã biết, hỏi phần còn ảnh hưởng đến việc đổi. Không biến tool đọc policy thành phê duyệt đơn.

Thay đoạn cũ, không thêm few-shot/mã mẫu/chất liệu/giá/thời hạn hoặc câu theo bài kiểm tra. Đây là chỉnh ranh giới chỉ dẫn của owner, không phải cơ chế bảo đảm model tuân thủ. Vòng2 phải đo lại; không tự thêm vòng3 nếu tiếp tục lỗi.
