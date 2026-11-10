# Phase C — sửa contract sau full 34 ca / 55 lượt

Implementation base: `7c75dbb1fd68a05601b47a0c1a5ceb85b932278e`. Owner yêu cầu sửa sau review bảy ca trong `post-j2-full-run-20261108`. Không sửa kết quả cũ hoặc chạy provider trong lượt implementation này.

Giữ một owner, tối đa một verifier, caps 6 primitive / 2 rounds / 3 owner / 1 verifier, retry0, final gate và silent handoff. Không production wiring, migration, nguồn shop write, deploy hoặc live send. Không đổi prompt tư vấn/verifier hoặc thêm parser/router/ví dụ benchmark.

## Phạm vi và acceptance

1. **P08:** marker màu chưa ghi nhận không được kế thừa sang product/offer khác. Một lookup candidate dùng color=null và code-owned yêu cầu chọn màu; không tự commit ngay cả khi chỉ còn một màu vật lý. Giữ cart/revision/receipt khi chưa đủ lựa chọn. Cùng scope và các tuple unlabelled hợp lệ cũ giữ contract. Nguồn thiếu màu vẫn là shop gap, nguồn thật hết hàng không thành in-stock. Selector không hỗ trợ contract mới không được cấp READY để né yêu cầu.
2. **S15:** lỗi lookup/view ảnh là kết quả scoped để owner đánh giá mức liên quan trong vòng tool bình thường, không tự biến thành handoff trước khi owner nhận kết quả. Không cấp asset/fact khi lỗi; ảnh mở đầu vẫn do code bắt buộc. Khi thiếu ảnh khách cần, owner phải request_handoff; không hứa gửi hoặc thay bằng ảnh khác. Không có code classifier để chứng minh mọi thiếu sót ngữ nghĩa, không claim completeness được bảo đảm deterministic.
3. **S05:** select ảnh mặc định thay nhóm gửi; APPEND phải rõ trong call, cho phép so sánh nhiều mẫu. Internal opening/quote preparation dùng APPEND để giữ các ảnh bắt buộc. View không chọn gửi. Thay nhóm thành công bỏ cả claims/literals cũ khỏi snapshot; thất bại không được xóa selection đã xác minh. Revalidation, 4-image cap và gate cả group giữ nguyên. Không parse final prose để đoán mẫu được chọn; model vẫn chịu trách nhiệm chọn đúng nhóm.
4. **J4:** tool phân biệt chưa có cart/negotiation context với nguồn quote sai. Chưa xét ưu đãi không có nghĩa không được hỗ trợ; trả prerequisites và NOT_EVALUATED, không tạo discount/receipt/CAS. Không thêm ưu đãi mới hay buộc tạo cart để báo giá.
5. **S16:** metadata feedback không tự chứng minh ảnh khách đang mặc. Expose giới hạn này nhất quán trong result và trusted media literal; không nâng giả định test hiện hành thành xác nhận customer provenance. Case ảnh khách mặc vẫn là source gap nếu không có căn cứ bổ sung.
6. **S08:** nguồn “hai lớp” không xác nhận cấu tạo “lớp lót”. Không thêm keyword ban hoặc giả dữ liệu. Giữ boundary hiện hành; kiểm source projection không mất câu gốc. Chưa có bằng chứng thay prompt/context sẽ làm owner ngừng suy diễn ổn định, nên không sửa ngẫu nhiên để chạy lại lấy PASS.
7. **J1:** lỗi transport giữ attempt thất bại, một request, không retry. Không thay prompt để chữa vận hành.

## Kiểm chứng

Quan sát RED của regression mới trên source cũ, GREEN tối thiểu; đối chứng existing effects/selection, media/opening/delivery, missing information, state/J2, quote/J1 và checkout. Worker typecheck/build/lint; adapter/schema tests khi đổi technical tool declaration. Không dùng stub verifier như bằng chứng semantic quality.

Self-review diff và checks. Ghi commands thực chạy và giới hạn trong implementation report; update tasks. Provider regression/full run cần một run mới được seal; không tái sử dụng a run source cũ hoặc tự dispatch. Không claim Phase C GO từ deterministic tests.
