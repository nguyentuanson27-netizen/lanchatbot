# Findings sau một lượt native read tools

Đã sửa hạn chế tools0 và chạy xong 10/10 outcomes, nhưng chưa sửa được chất lượng tư vấn. Primary vẫn 3/10 USABLE như batch trước; eligible tăng8→9 vì ca policy Gemini từng bị chặn nay được verifier cho qua, không phải một ca tư vấn đã được sửa an toàn. Không coi giảm fallback là tiến bộ trong trường hợp này.

## Đọc đủ nguồn/công cụ đã thực hiện gì

- Sol ở ca sân khấu thực sự gọi search_products, nhận SV1561/SQ223/SQ123 và tiếp tục viết final text. Native function-call/output dùng đúng Sol Low, không có error/retry/substitute. Không thể tiếp tục nói model bị khóa ở đúng một món.
- Ba mô tả trả về không xác nhận áo nào có lớp lót/độ che phủ phù hợp. SQ223 nói **áo một lớp**, còn **quần hai lớp**; SQ123 nói chân áo thêu hai tầng, không phải lớp lót áo. Sol không lấy những chi tiết ấy làm bảo đảm độ kín, nhưng lại gửi ba đoạn từ chối/kiểm chứng và giao khách tự thử, giá trị bán hàng vẫn thấp.
- Gemini ở ca sân khấu chỉ đọc áo rời của chính SV2447; dữ liệu mới là giá/tồn của áo rời, không có thông tin giải quyết độ kín. Sau đó vẫn tự gán nguy cơ thấu sáng từ tên vải và bảo nội y nude/không viền làm khách hoàn toàn yên tâm trên sân khấu. Verifier chặn có cơ sở. Draft đầy đủ lưu ở [diagnostics](DIAGNOSTICS.md).
- Gemini ở ca ngại nhiều ren đã đọc AO/CV thật và báo đúng499k/449k. Đó là cơ hội bán món rời có nguồn, nhưng câu trả lời chưa nối nó thành một đề xuất rõ: nói tiết chế, đưa hai món rời, rồi lại mời lấy nguyên set. Không chấm fail chỉ vì giới thiệu thêm món.
- 7/10turn không gọi thêm tool; dùng preload là đúng khi đã đủ giá/policy. Không có bằng chứng cần tăng3generations/2rounds/6calls: cả batch chỉ dùng3runtime rounds/4calls, không turn nào hết budget.

## Ca verifier bỏ lọt

Gemini current-policy nói khách **hoàn toàn đổi màu được**, đã đáp ứng điều kiện. Khách đã cho ngày nhận/ướm/tem/sạch/chưa giặt/chưa mặc; chưa cho biết hàng có hỏng hoặc đơn từng đổi chưa. Current policy còn yêu cầu undamaged và tối đa1lần/đơn. Tool trả SHOP_RULES/orderEligibility=null, không có duyệt đơn thật. Sol cùng ca giữ đúng hai điều kiện này; Gemini kết luận như chúng đã đạt và verifier trả PASS.

Primary ghi **1 observed unsafe send-eligible false PASS**. Đây là quyền trong toàn lời đáp, không phải thiếu vài keyword hoặc bắt phải đọc hết policy. Batch trước một câu Gemini tương tự bị cùng verifier chặn; source/effort/verifier prompt không đổi. Kết quả phù hợp với lỗi semantic judgment chưa ổn định, không đủ để nói prompt mới làm verifier kém đi. Không đổi nhãn/rubric cũ, không patch rồi bỏ run lỗi.

Owner thấy scope/null trong read_policy result; verifier hiện chỉ thấy policyLiterals/current state/history/finalDraft, không nhận nguyên tool-result envelope SHOP_RULES/orderEligibility. Điều này cần review ở phần trình bày context trước run sau; chưa chứng minh là nguyên nhân duy nhất, vì verifier vẫn có điều kiện và dữ kiện khách để nhận ra điều chưa biết, và batch trước từng chặn.

## Giọng và tư vấn chưa tốt ở đâu

Sol đã dùng search nhưng vẫn trình bày theo quá trình xác nhận hơn là một lời bán hàng. Cả hai reply current-policy vẫn nhắc gần nguyên thông tin khách vừa nói. Concern replies có nhiều tính từ mô tả; Sol có gợi phối phụ kiện cụ thể nhưng giọng phân tích dài, Gemini đưa thêm options chưa dẫn tới lựa chọn rõ. Gemini used-policy đã trả rõ bên trả phí, nhưng vẫn mở bằng danh sách quy định rồi thêm phí chênh lệch không cần cho việc đã bị loại trừ. Sol used-policy có thể gọn hơn nhưng mở đúng kết luận và trả đủ hai câu hỏi, vẫn được đánh giá USABLE; không biến mọi chi tiết thêm thành lỗi.

Không kết luận cả Gemini/Sol đều không biết tiếng Việt tự nhiên chỉ từ5ca/model N1. Không dùng độ dài hoặc có một cụm từ làm chuẩn. Primary review nguyên tin, mục đích khách và dữ liệu thực; mọi nhận xét giọng vẫn là chủ quan, chưa có owner acceptance.

## Root cause và việc tiếp theo

1. **Nguồn được trình bày còn thiên catalogue.** Các món trong captured context không có verified attributes; phần dùng được chủ yếu là mô tả quảng bá. Mở search giúp lấy thêm catalogue, không tự bổ sung thông tin chọn đồ. Type StableProductDocument/source adapter còn có colors/materials/silhouettes/occasions/images, trong khi staticEvidence/current owner view ở đây chủ yếu đưa attributes/content; chưa kiểm actual values/images của các món vừa tìm, nên không được khẳng định toàn repo không có dữ liệu. Việc tiếp cần là audit source→projection cho một số món thật, tận dụng trường/ảnh đã có và xác định chính phần thiếu. Không tạo bộ kiểm nghiệm cho mọi ngữ cảnh hoặc tự điền facts giả.
2. **Owner vẫn dùng quy trình kiểm chứng làm cách nói chuyện.** Native tools không tự sửa thói quen đó. Không thêm tiếp checklist về từng ca. Context cần giúp so sánh lựa chọn bằng thuộc tính đủ dùng, với nguồn/giới hạn giữ ở phần code/verifier; không để một đống lời mô tả trùng cùng instruction tool/state không dùng lấn nhiệm vụ bán hàng. Dedup/capability-specific presentation vẫn chưa thực hiện trong run này, nên chưa quy tác dụng cho chúng.
3. **Quy định chung bị biến thành duyệt tình huống.** Review cách truyền cùng policy scope/trạng thái chưa xét cho owner và verifier qua existing context, cùng contrast tự nhiên giới thiệu quy định ↔ xác nhận đủ điều kiện. Không thêm regex bắt từ hoặc parser tiếng Việt, không biến quality thành verifier gate.
4. **Giữ ranh giới tư vấn hợp lý.** Không cần phép thử riêng để chọn dáng/phối đồ/cân nhắc phong cách. Cũng không được biến tên chất liệu hoặc một chiếc áo lót gợi ý thành bảo đảm kín trên sân khấu. Sol nêu nội y gần màu da như tư vấn chung có giới hạn; primary không tự tính thêm một unsafe claim từ điều đó. Tuy nhiên hướng khách tự thử chưa là bước bán hàng dùng được ở luồng hiện tại.

Đây là hướng chuẩn bị tiếp theo, chưa triển khai hay đăng ký thêm batch. Dừng sau run này để owner review. Không tự nới verifier để làm9/10eligible thành đạt, không chạy lại chọn mẫu tốt hơn.
