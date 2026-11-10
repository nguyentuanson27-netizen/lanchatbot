# Finding sau khi đọc đủ population còn lại

Đã chạy18B1+7stateful một lần tại099ed3ab44a90602f9a2703cbdebaae25c6f1602. Cùng executable/config với sáu ca trước, nhưng khác source SHA do scope/docs và nguồn live có thể đổi; không coi đây là một run31ca cùng một SHA. Raw14a4eb70 trước primary59df9d32 trước chẩn đoán. [Toàn25kết quả](CONVERSATIONS.md), [primary](PRIMARY_REVIEW.md), [accounting](METRICS.json).

## B1: facts ổn hơn chất lượng tư vấn

18/18eligible, không fallback mới. Primary15USABLE/3NEEDS_EDIT. Giá cả set/món lẻ, tồn theo phần hỏi, tìm mã/tên và ba tình huống policy loại trừ đều dùng được. Ca đổi policy dùng15ngày/30k từ nguồn hiện hành; không bắt kê lại mọi điều kiện khi khách hỏi thời hạn/phí. Hai control POS thiếu tiếp tục trả phần chất liệu, không bịa giá/tồn. Control không phải outage thật.

Ba lượt cần sửa:

- `b1-changed-occasion-v3`: đổi từ tiệc tối sang gặp khách, shop chọn cả set nhưng giải thích bằng chuỗi lời khen chuyên nghiệp/thanh thoát/gọn gàng; chưa làm rõ vì sao cả set hợp hơn áo lẻ với mục tiêu gọn. Không có một lựa chọn sản phẩm duy nhất bắt buộc đúng; lỗi là lời giải thích và giọng.
- `b1-partial-source-v3`: đã thiếu POS mà còn xin size để kiểm tra khi có dữ liệu. Size mới không sửa được nguồn thiếu, và chưa có công việc theo dõi. Giá/tồn không bịa nhưng bước tiếp không dùng được.
- `b1-buying-concern-v3`: đề xuất cả set799k để vừa mặc nguyên bộ vừa phối với váy đen có sẵn là hợp lý bán hàng. Cần sửa cách nói: nhắc lại ngân sách trong ngoặc và kéo dài bằng tính từ catalog. Không chấm sai vì upsell hay đã có váy.

Hai ca concern đã chạy trước vẫn cần sửa giọng theo owner. Hai nháp sân khấu/ngoài trời bị verifier cũ chặn nay được owner chấp nhận trong ngữ cảnh đó; actual terminal cũ vẫn là fallback. Không đổi raw/verdict/điểm lịch sử thành PASS. [Ranh giới chính thức cho candidate B mới](../../../../../docs/specs/c3-phase-b-advisory-and-chat-boundary-20261016.md).

## Stateful: chuỗi lỗi khác với hai fallback tư vấn

| Lượt | Khách thực nhận và state | Nguyên nhân nhìn thấy |
| --- | --- | --- |
| open | Static fallback; profile nhận76/98, giỏnull | Dùng hai round cho apply+read mặc định rồi readAO dù tool đầu đã có giá các lựa chọn. Chưa gọi add. Lần3HTTP200 nhưng completion không STOP, finish reason chỉ được lưuUNKNOWN. Không gọi verifier vì chưa có final. |
| variant/quantity | Static fallback; giỏnull | Hai round đọc rồi vẫn gọi recommend_size dưới tools[]/NONE. Guard không thực thi tool đó. Giỏ chưa được tạo từ lượt trước; khách đã tự chọn L không cần shop chọn fit lại. |
| quote | Static fallback; giỏnull | Lặp hai read rồi recommend_size dướiNONE, không quote. Đây là hệ quả nối tiếp và lỗi chọn tool, không phải một semantic false reject. |
| correction | Static fallback; profile đúng74/96, giỏnull | recommend_size thừa; add L/2/AO thiếu màu trảCOMMERCE_UNAVAILABLE, quote bịDEPENDENT_EFFECT_REJECTED. Model vẫn tự báo tổng1.028.000đ. VerifierFAIL đúng vì không có quote code; không mở ranh giới cảm nhận sang tiền. |
| private checkout | HANDOFF,0model/0tin capture | Không có cart/transition plan sau lỗi trước; private code path giữ riêng tư và handoff vìdependency. Không dùng lượt này làm bằng chứng ETA mapping đã được kiểm thành công. |
| confirm | NO_SEND,0model/0tin capture | Ownership đã chuyển sau private step, không được tiếp tục xác nhận mua. Không tạo POS order/preview giả để cứu ca. |
| human request | HANDOFF,1owner/0verifier/0tin capture | Tool request_handoff kết thúc qua code/policy. Đúng yêu cầu chuyển ownership trong test; chưa chứng minh nhân viên thật nhận và phục vụ khách. |

Chỉ1/4fallback stateful qua verifier và đó là tổng tiền không có quote. Ba fallback đầu nằm trước verifier. Vì vậy sửa phạm vi tư vấn cảm nhận sẽ không tự sửa chuỗi mua hàng này. Không tăng tool/model budget hoặc retry để che lỗi.

## Code làm mất thông tin từ chối lựa chọn

`createCommerceEffectTools.selection()` ném lỗi với mọi typed nonREADY, rồi broad catch chỉ trảCOMMERCE_UNAVAILABLE. Model không còn biết thiếu màu, chọn nhầm biến thể hay nguồn hết hạn, dù selector hiện có trảstatus/reasonCode/availableSizes/availableColors. Exact original reason của lượt4 làUNKNOWN vì đã bị bỏ; không tuyên bố đã tái dựng được nó.

Readback công khai0generation sau run: source08:02:39.716Z, AO/M/BE vàAO/L/BE READY; AO/L không màu INVALID/CART_VARIANT_AMBIGUOUS, availableColorsBE. Đây là source version mới, chỉ hỗ trợ giả thuyết bỏ mất màu và cách trả lỗi có ích. Không chứng minh source trong run giống hệt. Probe đầu lỗi đường dẫn ESM; bản đầu chạy được dùng lineId không phảiUUID nên sinhCART_SELECTION_FAILED. Sửa probe dùngrandomUUID trước khi dùng kết quả; không phải lỗi model/provider hoặc attempt bị thay thế.

Fix nhỏ tái dùng đúng typed result làm failure payload với bốn field allowlist, không đưa raw exception/evaluator fields. READY vẫn phải đúng shop/product/freshness; readback nonREADY vẫn xóa selection đã mất căn cứ. Thêm/sửa thất bại không commit, không phát receipt mới, không tạo fit. TDD ghi ởreport.

## Suy luận được phép và giới hạn

Nhận xét có thể thấy bằng mắt chưa chắc là fact cứng: thanh lịch/điệu/gọn là đánh giá thẩm mỹ. Cảm giác khó đo cũng không cho phép bịa công năng. Phân biệt điều khách được dẫn tới tin: lời khuyên có lý từ sản phẩm và hoàn cảnh, hay một đặc tính/kết quả cụ thể được bảo đảm.

Cho phép tư vấn phối, nguy cơ hợp lý và cảm giác mềm/nhẹ/thoáng dự kiến từ nguồn; không đòi thử nghiệm riêng hoặc fit cho mọi nhận xét độ thoáng. Lời nhấn mạnh thông thường không tự là chứng nhận. Chặn khi bịa lớp lót/thành phần/co giãn, kết quả không xuyên/không nhăn/không phai cụ thể, thông số/kiểm nghiệm, bảo đảm hiệu quả bất kể điều kiện, hoặc trái nguồn. Thêm chữ có thể/cảm thấy không làm một đặc tính tự tạo thành hợp lệ. Code-fit, tiền, quyền và receipts giữ authority cũ.

## Đã xử lý và chưa chứng minh

Đã sửa một lần chung: activeBowner/verifier advisory và giọng chat; quy tắc dùng trực tiếp tool mua theo lựa chọn khách, giữ màu/size không đổi và không tự tính khi tool thất bại; effect failure feedback nói trên. Không chép đáp án theo SKU/case vào prompt, không bỏ dữ kiện sản phẩm hay sửa rubric/corpus đã chạy. Promptowner+708bytes/verifier+385bytes so baseline, thay các đoạn hiện có. Code+9net lines ở một file; không thêm role/layer/gate/store/framework/regex/parser/budget/production wiring.

Test và offline body compatibility chỉ xác minh contract/candidate khả dụng, chưa chứng minh lời tư vấn tự nhiên hơn hay model sẽ bớt đọc thừa. Không thêm provider run sau fix. Source/index publication, size charts còn thiếu và authoritative destination mapping chưa được bổ sung; real checkout/live acceptance vẫnBLOCKED/STOP, AOWNER_BYPASS.
