# Phase C — ổn định context và phạm vi tư vấn size

Base `a549f8cf7a1330d55b2d479a9202e99559195a1d`. Căn cứ là [run 01/11](../../apps/worker/evals/single-agent-commerce-qualification/purchase-options-run-20261101/REPORT.md). Đây là kế hoạch sửa sau hard stop, không thay registration hoặc kết quả lịch sử. Giữ một owner, tối đa một verifier, caps/model và thẩm quyền code hiện tại; không deploy/live send.

## 1. Publication bảng size trước verifier

`read_policy` nạp policy bundle nhưng các sản phẩm đã đọc chưa nhận charts trong bundle. Readback mới dựng lại sản phẩm, tạo diff không phản ánh thay đổi nguồn. Đồng bộ chart projection cho toàn bộ evidence đã có ngay khi policy được đọc thành công; dùng cùng một phép chiếu ở prepare, search và full read. Stage và kiểm giới hạn trước khi publish, không thêm I/O hoặc đọc giá/tồn khác.

RED phải quan sát được: prepare → policy → snapshot → readback với nguồn/clock không đổi sinh snapshot khác. GREEN: snapshot giống nhau và valid PASS được gửi. Đổi chart/policy thật sau verifier, chart sai scope, nguồn hết hạn và permission thay đổi vẫn phải bị final gate chặn. Không đóng băng hoặc bỏ chart khỏi equality để cứu PASS.

Projection đồng thời **thay hoặc xóa** charts đã bị thu hồi/sai applicability. Policy cache, policy literal và tất cả chart projections được stage rồi publish cùng nhau; không await ở giữa publication. Projection malformed/vượt bound không được publish một phần; đánh dấu request invalid để context cũ không còn cấp quyền gửi, giữ independent numeric facts làm evidence, và readback fail closed. Kiểm native owner/verifier bounds ở admission hiện có và thêm case đổi policy trong lúc catalog read đang chờ.

## 2. Request sau tool với hai sản phẩm

Run cũ chỉ giữ actual body của request đầu; request thứ hai bị chặn trước dispatch, không có body. Không tuyên bố có exact replay của body không được lưu. Dùng offline cùng frozen world/clock và actual tool result để đo bytes theo system/schema/trusted/dialogue. Giữ opaque native function-call signatures nguyên vẹn khi continuation còn AUTO.

Chỉ bỏ dữ liệu lặp khi có kiểm tra bằng canonical equality và giữ rõ tham chiếu tới evidence hiện tại. Không xóa response lỗi, source khác, filter khác, hoặc receipt. Giữ nguyên raw transcript, audit và verifier context. Test continuation với hai sản phẩm, thay đổi nguồn, partial result, đủ thông tin phân biệt và stock/size. Oversized request thật vẫn fail trước auth/HTTP; không tăng cap hoặc truncate thông tin tùy ý. Nếu chưa tái hiện/giảm được nguyên nhân, báo residual thay vì nhận đã fix.

Journal RESULT giữ output native của lượt đầu: opaque thoughtSignature dài 9.900 ký tự. Giữ nguyên toàn bộ phần này. Với nhiều sản phẩm bound nhưng chưa có focus, chỉ prepare metadata/read references cho tất cả; không tự hydrate numeric offers cho thiết kế chưa được chọn. Lệnh read_product của owner vẫn cấp đúng facts sau khi xác định mẫu/lựa chọn. Các facts đã được đọc/admit trước đó giữ nguyên, không xóa để lấy chỗ. Test exact captured signature + actual read args/result trong offline world cũ, đo lại cả hai generation bodies. Đây là replay của source/tool continuation, không phải replay nguyên body thứ hai vốn không được capture.

## 3. Size sản phẩm không cấp size từng phần

P07 chạy engine cấp sản phẩm rồi reply nhận áo M/quần L từ size khách thường mặc. Tách rõ câu khách tự đặt size với câu khách hỏi shop chọn size; chưa có quyết định chọn thì không dùng câu xác nhận để thay tư vấn.

Thêm scope kết quả size rõ ràng vào tool result/trusted evidence hiện có. Nếu owner cần tư vấn component, thể hiện yêu cầu component trong args; API hiện không hỗ trợ thì trả source gap và dùng silent handoff có receipt hiện có. Không tự tạo chart hoặc chuyển PRODUCT fit thành fit của áo/quần. Giữ request cấp sản phẩm tương thích; không bắt người mua tự chọn size phải qua engine. Owner và verifier nhận một quy tắc ngắn về phạm vi này, không thêm ví dụ theo P07, parser, regex hoặc template.

Contract args cụ thể: `fitScope?: "PRODUCT" | "COMPONENT"`, vắng mặt tương thích PRODUCT; `componentRole?: "TOP" | "PANTS" | "SKIRT" | "DRESS" | "OTHER"` chỉ hợp lệ và bắt buộc khi COMPONENT. Decoder và state tool cùng kiểm tổ hợp này. COMPONENT hiện trả `UNAVAILABLE/SIZE_SOURCE_UNAVAILABLE`, không chạy product engine, không tạo fit hoặc fallback sang PRODUCT. Kết quả PRODUCT ghi `fitScope: {kind:"PRODUCT", productId}` và `unsupportedScopes:["COMPONENT"]`. Trusted evidence tiếp tục dùng **ProtectedClaimV1 SIZE_FIT.scope.kind=PRODUCT** đã có schema/hardPrecheck, không thêm một loại claim hoặc cấp thẩm quyền từ tool trace. Verifier dùng đúng product claim/hồ sơ; không nhận kết quả PRODUCT như bảng fit từng phần. Parser chỉ xử lý args có cấu trúc, không đọc ngôn ngữ khách.

Giữ riêng acceptance semantic: nếu owner vẫn gọi PRODUCT cho câu đang nhờ chọn size từng phần, code không suy luận ý khách từ prose. Owner phải handoff thay vì nhận size thường mặc là lựa chọn mua; verifier phải reject draft thực sự biến product fit thành component advice. Trước provider test, ghi **MODEL_NOT_RUN** cho nhánh này dù deterministic scope tests xanh. Run mới phải giữ P07 và các controls tự chọn size/fit cấp sản phẩm; không nhận unit PASS là đã fix hành vi P07.

Test: yêu cầu component không tạo SIZE_FIT hoặc effect mua hàng; product fit vẫn hoạt động; size khách tự chọn vẫn được add/change qua authority hiện có; inline state validation/CAS không bị bỏ qua; thiếu thông tin khách vẫn hỏi, thiếu nguồn shop mới handoff. Không có test keyword giả làm bằng chứng semantic provider PASS.

## 4. Verification và review

TDD RED→GREEN ở boundary bị tác động. Chạy worker focused preparation/read/state/handoff/final gate, Node native serialization/admission/context firewall, worker typecheck/build/lint; actual isolated PostgreSQL nếu thay writer/effect guard. Không chạm shared contracts trừ khi có lý do riêng.

Sau implementation: independent review có đủ run evidence, ranh giới architecture và diff → sửa → cùng reviewer review lại. Nếu credit không có thì giữ trạng thái chưa được approve, không tự chấm thay hoặc chạy model để vượt review. Model run mới chỉ sau commit/clean/preflight và nguồn còn hiệu lực; không tiếp tục registration cũ sau hard stop. Giữ nguyên 6 NOT_RUN của run cũ. Hết credit judge không được sửa thành quality PASS.
