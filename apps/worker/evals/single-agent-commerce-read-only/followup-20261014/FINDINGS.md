# Kết quả sửa prompt/tool và nguyên nhân còn lại

Owner yêu cầu review toàn bộ prompt, sửa và chạy lại. [Full prompt review](PROMPT_REVIEW.md) ghi đủ bề mặt đã đọc và cách sửa. Một batch mới, cùng tám thế giới/nhãn/history/source mode, chỉ đổi thứ tự. Source `8bbea938`, raw `965e3138` trước primary `fa61bce3` trước chẩn đoán dưới đây. Không sửa tiếp code/prompt hoặc chạy thêm mẫu sau kết quả.

## Những gì đã thay đổi có bằng chứng

Ca hỏi giá trước đây có đủ giá nhưng đọc thêm các món lẻ rồi hết round; lần này trả thẳng “Set váy Thạch Thảo có giá799.000đ ạ.” Owner dùng2generation/1tool round thay vì3generation và fallback. Tool đã trả đúng resolver-selected SET_VAY, không còn offerType=null; prompt nói rõ không cần đọc hết availableOffers. Đây là thay đổi quan sát được, không chứng minh riêng từng sửa là nguyên nhân vì prompt/tool được đổi cùng lúc và chỉ N1.

Đã sửa lỗi wire context: owner nhìn thấy đúng trusted.policy và các trường profile/revision/fingerprint sẵn có, cùng budget/tool names thực tế. Test RED→GREEN chứng minh giá mặc định/canonical alias giữ đúng scope, absent/stale/missing-offer không bị gộp làm hết hàng, budget không tăng và private authority không lọt qua. B1 không có hành trình provider chọn size; không biến test projection này thành bằng chứng stateful B2 đã đạt.

Ca từ chối đổi sau khi mặc đi làm vẫn trả đúng ngay đầu, không còn mã `unused`. Tuy nhiên vẫn kể nhiều điều kiện sau khi đã từ chối; phần bên nào chịu phí chưa được làm rõ ngoài mức30k. Nguồn công khai hiện được cấp có tổng phí, chưa nêu payer; không tự suy ai trả. Ca tư vấn ren vẫn đưa một hướng mua có lý do, nhưng dài hơn lượt trước và lặp ngân sách/tính từ. Xóa ví dụ, giảm prompt10% chưa làm giọng tự nhiên hơn một cách đều đặn.

## Ba fallback, ba nguyên nhân cụ thể

### 1. Sân khấu: hành trình lấy dữ liệu vượt budget

Các generation thực tế:

1. read_product(SV2447).
2. search_products("set váy đi tiệc").
3. Yêu cầu read_product(SV165) và đọc lại SV2447.

Ở generation3, trusted.execution có0round còn lại, availableTools=[], API có modeNONE. Model vẫn trả functionCall; code không thực hiện hai call đó và trả BUDGET. Không có final draft hoặc verifier call cho ca này. Không thể nói semantic inference đã được sửa hay verifier chặn quá tay.

Có xung đột thật giữa nhu cầu tìm món thay với luồng hiện tại: đọc món cũ → tìm món mới → đọc facts món mới cần3round nếu search chỉ trả ref/tên, trong khi protocol chỉ cho2. Mô hình có thể dừng ở lời khuyên về món hiện tại nhưng đã chọn tìm thêm rồi vi phạm giới hạn. Đây vừa là hành vi chưa tuân thủ của owner vừa là giới hạn thiết kế tool/budget; thêm một câu nhắc budget chưa giải quyết được. Không tăng budget, tự đọc món mới, dùng text trung gian làm reply hoặc retry để cứu ca này trong run.

### 2. Policy: tiếp tục xác nhận đủ quyền khi dữ kiện còn thiếu

Draft:

> Dạ, thời hạn đổi hàng bên shop là 15 ngày kể từ lúc nhận nên 10 ngày là mình vẫn đổi được bình thường chị nhé. Sản phẩm mới ướm bên ngoài, sạch sẽ, còn nguyên tem và chưa qua giặt/mặc của chị hoàn toàn đáp ứng đủ điều kiện đổi ạ. Shop có hỗ trợ đổi màu với tổng phí vận chuyển 2 chiều là 30.000đ. Chị muốn đổi sang màu nào ạ?

Verifier: MATERIAL_CONDITION_LOSS với đúng policy ref. Các con số15ngày/30k đúng và owner dùng tình trạng khách đã nói. Không được quy lỗi vì reply không nhắc lại từng từ về sạch/chưa giặt khi chúng đã có trong hội thoại.

Điểm chưa có căn cứ là “hoàn toàn đáp ứng đủ điều kiện”: policy còn có undamaged/maxExchangesPerOrder, hội thoại chưa xác lập toàn bộ. Đây là cơ sở reviewer đối chiếu; verdict chỉ có kind/ref, không chứa rationale để biết model thực sự dựa vào điều kiện nào. Không ghi một lời giải thích giả cho verifier. Lỗi xác nhận quá rộng đã tái diễn; đoạn hướng dẫn rõ hơn vẫn chưa khiến owner tách câu trả lời về quy định khỏi quyết định đủ quyền. Không đổi nhãn hoặc bỏ điều kiện nguồn để biến run thành PASS.

### 3. Thiếu POS: bỏ lời hứa báo lại nhưng tự tạo nguyên nhân vận hành

Draft:

> Set Thạch Thảo được kết hợp từ tơ Hàn thêu cao cấp cho áo — chất vải mềm, thoáng, có độ bay tự nhiên cùng các họa tiết thêu nổi tinh tế — và chân váy ren tơ Hàn mang lại hiệu ứng mềm mại, nữ tính, tạo độ rũ uyển chuyển khi di chuyển. Hiện hệ thống cửa hàng chưa đồng bộ được dữ liệu giá và tồn kho lúc này, nên em chưa tra ngay được mức giá chính xác cũng như size M còn hay không nhé ạ.

Verifier: UNSUPPORTED_PROTECTED_ASSERTION, protectedRef=null. Chất liệu/thiết kế có trong runtimeProducts.content, không được tự gọi chúng là bịa. Lời hứa kiểm tra rồi báo lại đã biến mất, nhưng source chỉ trả POS_SNAPSHOT_UNAVAILABLE; nó không chứng minh nguyên nhân là hệ thống cửa hàng chưa đồng bộ. Đây là một khẳng định mới về trạng thái vận hành chưa được nguồn xác lập. Ref null không chỉ ra clause, nên cũng chưa thể khẳng định đó chính là căn cứ verifier đã dùng hay loại trừ vấn đề calibration về content. Draft còn sao gần toàn bộ mô tả quảng cáo, nhưng giọng không thuộc scope của verdict.

Thay một lỗi bằng một cách giải thích không có căn cứ vẫn làm khách nhận fallback và mất cả phần chất liệu đã biết. Đây là regression về terminal disposition: trước eligible nhưng có lời hứa follow-up không làm được, nay fallback. Cả hai đều FAIL chất lượng trong primary; không lấy việc sửa được một câu để gọi ca đã đạt.

## So sánh toàn lượt

[Comparison](COMPARISON.json) giữ kết quả từng case ID, không so nhầm thứ tự. Primary chủ quan5/8đủ hữu ích, trước4/8;4control vẫn đạt. Eligible vẫn5, fallback vẫn3(37.5%). Ca hỏi giá chuyển fallback→eligible; ca thiếu POS chuyển eligible→fallback. Không có human acceptance;80human scores còn null. Chỉ số không chứng minh sự ổn định hoặc chất lượng bán hàng đã đạt.

[Source comparison](SOURCE_COMPARISON.json) cho thấy giá/tồn/mô tả và public policy ở source-check trước/sau không đổi giá trị; timestamp/provenance từng request vẫn có thể đổi. Vì có thay prompt/context/tool và N1, không quy toàn bộ thay đổi chất lượng/latency cho prompt.

## Kết luận kỹ thuật và phần còn mở

Full prompt review đã loại những chỗ sai contract và tránh phình prompt; các kiểm tra dữ liệu/authority vẫn xanh. Nhưng ba hành vi chưa ổn không được giải quyết chỉ bằng cách viết chỉ dẫn rõ hơn. Không nên tiếp tục nối thêm ví dụ hoặc các câu cấm theo từng case.

Một lần sửa tiếp cần giải quyết rõ phạm vi tool: làm cho việc tìm món thay lấy được đủ evidence trong budget hiện có, hoặc owner chốt một budget mới trước run; không có hidden continuation. Policy cần tách trả lời quy định với đủ dữ liệu để thực hiện đổi, giữ các dữ kiện đã biết và không thêm bộ phân tích tiếng Việt/đoán eligibility. Thông báo nguồn lỗi chỉ nói trạng thái thực sự được code cung cấp, không dựng lý do nội bộ. Giọng cần đánh giá trên toàn tin gắn với quyết định mua, không thêm một bộ keyword về naturalness.

Các hướng trên là finding cho phạm vi tiếp theo, chưa được implement hoặc chạy trong batch này. Không mở B3variant/stateful provider journey/Phase C, không live send/deploy, không đổi verifier sau khi thấy kết quả và không tự chạy thêm vòng.
