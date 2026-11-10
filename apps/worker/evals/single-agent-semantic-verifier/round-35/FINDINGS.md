# Round35 — findings và hướng tiếp theo

**Checkpoint A: BLOCKED do provider. Machine A2: FAIL. A3: chưa chạy.**

Đã đọc lại đủ 42 hội thoại Round34, ghi nhận từng ca trong [review toàn hội thoại](../round-34/WHOLE_CONVERSATION_REVIEW_20261010.md), rồi sửa cách trình bày lịch sử và prompt tư vấn. Không sửa scores, raw evidence hoặc báo cáo cũ.

## Nguyên nhân và phần đã sửa

Các lỗi chủ yếu ở phía tư vấn: kể lại số đo dù đã có fit; nối lợi ích như catalogue; trả lại việc chọn màu khách đã giao; xin đầu vào của món cũ khi khách đang hỏi món mới. Prompt34 đã có các quy định liên quan nhưng lỗi vẫn xảy ra. Thêm tiếp cùng một danh sách cấm không đủ chứng minh sửa được nguyên nhân.

Request cũ gom lịch sử và tin mới thành các dòng JSON cuối một tài liệu. Round35 giữ nguyên facts và binding nhưng đưa từng tin khách/shop thành các lượt user/model thực tế, nguyên văn và nguyên thứ tự, với tin mới ở lượt user cuối. Prompt35 tổ chức theo việc khách cần quyết định, lý do mua hữu ích, đầu vào đúng món và giọng chat. Đây là một giả thuyết về nguyên nhân presentation; hai thay đổi cùng được áp dụng nên chưa tách được tác động riêng của mỗi thay đổi.

Giữ nguyên verifier32, hai model/config đã được owner chọn, 122 ca A2, 42 ca A3, năm tập dữ liệu phụ, bounds, ngưỡng chấm và terminal/fallback. Không thêm parser, relevance filter, câu trả lời theo từng ca, role thứ ba, vòng sửa/reverify, dữ kiện sản phẩm hay production wiring. Tư vấn tự tin có căn cứ và upsell hữu ích vẫn được phép.

## Kết quả thực tế

Các kiểm tra code đã đạt: 7 kiểm tra mới quan sát RED trước rồi GREEN; toàn bộ 188/188 kiểm tra đánh giá; focused protocol/provider 38; boundary/Vertex 77; protected claims/reply assembler/size 41; worker build, typecheck và lint đều exit0. Kiểm tra đủ 42 request xác nhận lịch sử/facts/binding không mất hoặc đổi, evaluator labels không lọt vào cả hai model, mọi draft sống sót hard precheck đều tới verifier và request cũ vẫn được tái dựng đúng.

A2 chạy đủ 122 ca, một lần mỗi ca. Trong 118 request verifier có 101 OK và 17 lỗi HTTP429/GENERATION_HTTP; bốn ca bị hard precheck chặn trước khi gọi model. Các lỗi xảy ra ở cuối run, gồm 9 SAFE và 8 UNSAFE. Không có retry hoặc loại lỗi khỏi kết quả.

| Nhóm | Kết quả |
|---|---|
|47 SAFE|38 send-eligible; 9 fallback do provider error|
|75 UNSAFE|60 semantic FAIL; 3 stale replay bị final gate chặn; 4 hard precheck blocks; 8 provider errors|
|Unsafe send-eligible false PASS|0 quan sát được|
|Provider lỗi/timeout|17/0; lỗi 14,41% trên 118 request|
|SAFE terminal failure|9/47 = 19,15%, vượt ngưỡng 10%|
|A3|Chưa chạy; owner generation 0, verifier A3 generation 0|

Machine A2 giữ nguyên **FAIL** theo ngưỡng usability. Checkpoint recommendation là **BLOCKED** vì route verifier không hoàn tất đánh giá được các ca cuối. HTTP429 chưa đủ để kết luận chắc đã hết quota tuần hay một loại rate limit cụ thể; retryAfterSeconds không được expose. Không có SAFE semantic rejection trong những request thành công, nhưng không bỏ chín lỗi để tính lại PASS.

Chỉ có thể nói **“zero observed send-eligible false PASS”** trên frozen tested population/configuration này. Tám lỗi provider ở ca UNSAFE không chứng minh verifier đã từ chối đúng về ngữ nghĩa. [Complete denominator](A2_ATTEMPTS.md), [raw evidence](a2-evidence.json), [audit](audit.json) giữ đầy đủ request/error accounting.

## Những điều chưa được kiểm chứng

A2 phải PASS trước A3, vì vậy vòng này không tạo 42 hội thoại mới, không có a3RunSourceSha và không chấm A3 mới. Chưa biết bản sửa có giảm echo số đo, giọng catalogue, hỏi sai món, trả lại quyết định chọn màu hay claim độ kín sai phạm vi hay không. HTTP429 không phải bằng chứng tư vấn kém hoặc verifier chấm sai.

Các tranh luận cũ về fit một phần, intro quyền đổi và advisory care vẫn còn mở. Dữ liệu chưa có bảng chiều cao/cân nặng, món thay được xác nhận phù hợp ánh sáng sân khấu hoặc phương án giao chắc kịp vẫn được giữ nguyên. Không tự tạo facts để cứu kết quả. Review trước là chủ quan, nonblind của primary agent, chưa phải đánh giá độc lập, human hoặc owner acceptance; chưa có bằng chứng chuyển đổi bán hàng thật.

## Hướng tiếp theo

Giữ nguyên treatment35 đã hoàn tất. Khi route verifier được owner chọn hoạt động lại, có thể đăng ký một vòng mới với source seal mới và chạy đầy đủ 122 A2; chỉ PASS mới chạy 42 A3. Không dùng lại 101 kết quả cũ hoặc chỉ chạy lại 17 ca lỗi. Đây là đề xuất, chưa thực hiện.

Dừng tại Checkpoint A BLOCKED. [CHECKPOINT_A.md](CHECKPOINT_A.md) chứa cấu hình, hashes, source SHA, ngưỡng, commands thực sự chạy và số liệu vận hành. Không tự vòng36 hoặc triển khai post-A.
