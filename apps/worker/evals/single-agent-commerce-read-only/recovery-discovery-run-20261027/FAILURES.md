# Outcome cần sửa hoặc xem lại — recovery/discovery model run

Run source `574ef87db95b8109bf39689c30f7c33b9dc0112d`, mỗi ca một lần. Một fallback; discovery PASS cần xem nghĩa. Bốn handoff thiếu evidence ảnh và ba controlled POS handoff được phân loại riêng, không phải bảy lỗi provider.

## b1-search-read-v3 — FALLBACK / FAIL

Khách: “Chị thấy mẫu SQ223 trên trang mà giờ tìm không ra. Em kiểm tra giúp chị mẫu đó còn không, giá bao nhiêu nhé.”

Draft bị chặn:

> Dạ mẫu Set quần Xuân Thảo (SQ223) hiện vẫn còn hàng ạ:
>
> - Chất liệu vải thô đục lỗ in họa tiết hoa, thiết kế 1 lớp form gọn gàng, đứng form và tôn dáng.
> - Áo lẻ: 429.000đ (Size S, M, L, XL)
> - Quần lẻ: 429.000đ (Size S, M, L)
> - Cả set: 699.000đ (Size S, M, L)

Nguồn: áo được thiết kế một lớp; quần hai lớp cạp chun. Bullet đầu của draft gắn “thiết kế1lớp” vào mẫu set, không giới hạn ở áo. VerifierSUBJECT_MISMATCH có căn cứ. Owner thêm chi tiết không cần thiết cho câu hỏi rồi làm sai subject, dù đã có giá/tồn để trả lời.

Kết quả khách được nhận trong B1 eligibility surface:

> Phần này em chưa trả lời được, chị nhé.

Không có persisted delivery/handoff ở B1; không nói bot đã chuyển xử lý. Không sửa hoặc chạy lại ca này trong campaign.

## sales-discovery-advice:need — SEND_ELIGIBLE / PASS, REVIEW_REQUIRED_FIT_SCOPE

Khách: “Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.”

Owner search rồi batch đọc SQ748/SQ2447, có giá799k/769k trong ngân sách. Đây là cải thiện quan sát được so với đọc SQ6751.279triệu rồi handoff hai vòng trước.

Reply mở đầu:

> Em gợi ý chị 2 mẫu set quần đi làm dưới 1 triệu, thiết kế thoải mái không lo bó bụng ạ:

Sau đó liệt kê cả hai mẫu; mô tả Uyển Hoa có “lưng chun đồng bộ giúp vận động thoải mái, không bị bó bụng”, cuối reply xin chiều cao/cân nặng hoặc size thường mặc.

VerifierPASS; SIZE_FIT0. Nguồn SQ748 có lưng chun/phom suông, nguồn SQ2447 chỉ mô tả quần dễ mặc/phù hợp nhiều vóc dáng. Cần xem lời trấn an gộp hai mẫu là nhận xét thiết kế chung hay bảo đảm độ vừa của chính khách. Không kết luận chỉ từ keyword/thiếuSIZE_FIT, cũng không lấy PASS làm proof nội dung đã ổn. [Exact draft, sources và verdict](FIT_SCOPE_REVIEW_REQUIRED.json).

Reply vẫn dài, thiên liệt kê mô tả và chưa chọn rõ một hướng mua. Giữ đây là finding/unknown; không tự nới hoặc siết verifier, không mở thêm vòng prompt trong task chạy model.
