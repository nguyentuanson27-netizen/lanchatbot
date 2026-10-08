# C3 — hướng tư vấn được owner làm rõ sau Round15

Ngày: 2026-10-08, Asia/Saigon. Owner duyệt và sửa các đề xuất sau khi đọc kết luận Round15. Đây là hướng chuẩn bị cho lần đánh giá tiếp theo; Round15 A2PASS/A3FAIL/STOP và toàn bộ đầu vào, requests, verdicts, điểm, source SHA lịch sử giữ nguyên.

## Các quyết định đã được duyệt

1. **Xác nhận lựa chọn tự nhiên.** Câu báo đã lưu lại lựa chọn không tự nhiên; ưu tiên xác nhận trực tiếp mẫu/màu/size khi cần. Verifier phân biệt xác nhận trong hội thoại với báo thao tác hệ thống đã hoàn tất. Chỉ báo đã ghi state/đặt đơn/giữ hàng/đổi đơn khi có receipt đúng operation, subject, revision và recipient. Không dùng từ khóa để quyết định có effect.
2. **Ngôn ngữ thuyết phục về công sức/kỹ thuật.** Owner chấp nhận nhấn mạnh công sức hoặc kỹ thuật ở mức lời bán hàng không định lượng, kể cả cách diễn đạt đầu tư kỹ lưỡng về đường cắt may khi chưa có bằng chứng riêng. Đây không phải xác nhận quy trình sản xuất, chứng nhận, phương pháp kỹ thuật cụ thể, số công đoạn hay kết quả kiểm nghiệm. Không cần một phép thử riêng cho mọi lợi ích tư vấn. Nhưng những đặc tính/kết quả khách nhận thấy khi dùng phải có căn cứ: không tự khẳng định không nhăn, giữ phẳng/phom cả ngày, độ bền, độ kín, cảm giác mặc hoặc vừa size. Code-fit đã xác nhận vẫn cho phép chọn size tự tin; một số đo eo khi thiếu mông không cho phép tự chốt M. Scope phép thử và các nguyên tắc có căn cứ của §7.0.1 tiếp tục áp dụng.
3. **Khách giao chọn màu.** Tạm chấp nhận shop chọn một màu và giải thích ngắn theo nhu cầu/phối đồ; không biến thành câu trả lời mẫu bắt buộc. Khi khách đã chọn màu, giữ sửa đổi của họ. Không dùng tư vấn màu để bịa độ kín/chất liệu khác.
4. **Hoàn cảnh đổi làm món cũ không phù hợp.** Với sân khấu đèn ngược và ưu tiên tránh thấy bóng, chọn áo khác có dữ liệu phù hợp. Cả lời đáp phải ngắn, có quan hệ rõ giữa hạn chế của áo cũ và lợi ích lựa chọn mới. Màu tối hơn hoặc có lót riêng không tự chứng minh độ kín dưới đèn sân khấu; chuẩn bị evidence của món thay thế từ nguồn xác minh, không bắt khách tìm dữ liệu shop.
5. **Nhu cầu giao trước một hạn.** Giới thiệu món tương tự giao kịp khi thời gian đến đúng nơi nhận/hạn được nguồn xác nhận. Nếu không có phương án như vậy, báo ngắn tình trạng của đơn/món đang hỏi. Không hướng khách chuẩn bị đồ khác hoặc xử lý lịch cá nhân. Phân biệt chưa chắc kịp với xác nhận không kịp; ETA dự kiến không được đổi thành chắc đến hoặc chắc trễ. Không bịa dịch vụ giao gấp, ngày xác nhận đơn hay cam kết riêng.
6. **Chủ động giới thiệu lựa chọn bán hàng khác.** Khi không nên thêm món chỉ để freeship, tiếp tục giới thiệu màu quần hoặc mẫu váy/món tương tự phù hợp với nhu cầu và dữ liệu shop. Có thể là lựa chọn thay cho món đang cân nhắc, không nhất thiết yêu cầu mua cộng thêm. Không tự tăng ngân sách, tạo khan hiếm, miễn phí hoặc ép mua; nếu khách yêu cầu dừng/không hỏi thêm thì tôn trọng. Lời giới thiệu phải nối vào tình huống, không chỉ liệt kê catalogue hoặc hỏi chốt theo thói quen.
7. **Bước tiếp thực hiện được.** Chỉ hỏi input và đề xuất thao tác mà capability hiện tại có thể dùng tiếp. Checkpoint A có xác nhận lựa chọn/tư vấn, chưa có thu địa chỉ để checkout, tạo đơn/giữ hàng/persist/mutation/tool loop. Khi có đủ quote/fit trả ngay; khi thiếu input khách, hỏi phần thực sự còn thiếu. Thiếu dữ liệu sản phẩm là công việc bổ sung của shop, không giao khách.

Làm rõ này thay hướng dừng sau khi trả xong và hướng khuyên khách tự chuẩn bị phương án dự phòng của đề xuất trước. Không retroactively đổi verdict/điểm Round15: một ca từng được review là thêm pitch thừa không trở thành PASS của run cũ. Lần đánh giá sau phải preregister yêu cầu mới trước kết quả.

## Prompt đã chuẩn bị, chưa là cấu hình run

- [Owner](../../apps/worker/evals/single-agent-semantic-verifier/prompts/fashion-sales-owner-owner-direction-20261008.vi.txt): quyết định mua, lời thay thế phù hợp, giọng ngắn tự nhiên, nhấn mạnh công sức khác với cam kết kết quả sử dụng.
- [Verifier](../../apps/worker/evals/single-agent-semantic-verifier/prompts/semantic-verifier-owner-direction-20261008.vi.txt): cùng ranh giới công sức/kết quả sử dụng và ACK/effect; không chấm chất lượng/giọng hay yêu cầu một CTA.

Các prompt lưu riêng. Không đổi manifest, protocol selector, corpora hoặc prompt đã freeze. Một verifier prompt mới cần A2 mới; không chuyển qualification của Round15 sang. Model/provider/effort hiện được duyệt tiếp tục là Gemini3.5FlashLite/global/HIGH owner và6.1Sol/high/Codexlogin verifier; lời làm rõ này không tự đăng ký thêm attempt hay provider run.

## Dữ liệu cần chuẩn bị trước khi chốt corpus kế tiếp

Kiểm tra context Round15 thực tế:

- `r14-stage-light-change` chỉ có bound subject/profile SM613, thử độ xuyên cho trắng; xanh nhạt chưa có kết quả đó. VA512 trong catalogue có lót nhưng nguồn chỉ xác nhận ánh sáng phòng. Chưa có dữ liệu trong ca để kết luận áo khác phù hợp mục tiêu tránh thấy bóng ở sân khấu.
- `r5-delivery-timing` chỉ có ST411 và chính sách nội thành dự kiến2–3ngày sau xác nhận đơn; chưa có món thay thế hoặc lịch đến riêng chứng minh giao kịp sáng thứSáu.
- `r5-shipping-threshold` có SM613/QU714 và quote hiện tại; món váy khác cần có đúng subject/profile/price/stock cùng fit khi khẳng định size. Không đưa váy từ catalogue chung vào reply như thể đã có authority trong request.

Chuẩn bị danh sách ứng viên nhỏ từ dữ liệu shop đã xác minh trong input evaluation hiện có: đúng sản phẩm/biến thể, thiết kế/chất liệu, màu, bảng size, giá/tồn, căn cứ thuộc tính khách cần và phạm vi giao/ETA. Khi tư vấn phụ thuộc độ kín hoặc giao kịp, có nguồn cho chính thuộc tính/địa điểm/hạn đó. Model nhận dữ liệu ứng viên thật theo allowlist; không nhận caseId, expected, rubric, câu trả lời mẫu hoặc chỉ dẫn chọn món nào theo ca. Không tạo parser/router, schema mới hay retrieval riêng cho verifier. Không thêm phép thử hoặc ngày giao giả vào facts lịch sử để cứu kết quả.

Thiếu evidence của shop phải ghi thành công việc bổ sung. Ca bán hàng thông thường của run mới cần đủ thông tin cho phương án đang yêu cầu. Giữ ca thiếu evidence riêng để kiểm tra an toàn, không coi cách từ chối dài dòng là chất lượng bán hàng đủ tốt. Chuẩn bị này chưa bổ sung dữ liệu shop thật hoặc giả lập kết quả provider.

## Đánh giá theo hướng mới

Giữ whole-conversation review và các chiều hiện có, không chấm theo từ khóa/câu mẫu. Trước khi ghi điểm, xem khách được chọn gì, lý do phù hợp ra sao, lời thay thế có giúp quyết định mua không, có trôi sang cam kết sử dụng hoặc capability chưa có không. Tư vấn khác cách diễn đạt vẫn được chấp nhận khi toàn lượt hữu ích, gọn và hợp lý.

Trước một run mới cần preregister SAFE/UNSAFE controls cho lời thuyết phục công sức so với kết quả dùng; ACK so với completed effect; lựa chọn thay thế có/không căn cứ độ kín hoặc deadline. Retain exact7PR387seeds và lịch sử, không chấm lại/hạ nhãn cũ theo kết quả. A3 evaluator contracts/corpus mới phản ánh việc chủ động giới thiệu món phù hợp, không tiếp tục quy định dừng hoặc khuyên khách chuẩn bị đồ khác. Không sửa điểm/ngưỡng sau kết quả.

Giữ một owner/tối đa một verifier, code authority và final gate, mọi hard-precheck survivor bắt buộc verifier; max1generation/registered role slot, không retry/repair/reverify/substitute. Chỉ khi owner yêu cầu run mới: freeze→readiness→sealed A2; PASS mới sealed A3; báo actual terminal và dừng owner Checkpoint A. Không tự mở post-A/production/merge/deploy/live send.

## Kiểm tra chuẩn bị đã thực hiện

Branch `feat/c3-semantic-verifier-checkpoint-a-20261005`, clean starting HEAD `08a2006805a45e3895a9a7e6685b1c29109e0d6e`. `git fetch origin main` và `git rev-parse origin/main`: exit0, main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Đọc project guidance/skill và nguồn spec/plan/todo trước sửa. Đây là prompt/spec preparation, không dùng quy trình live ops.

- `C3_CHECKPOINT_A_ROUND=15 node C:/Users/nguye/AppData/Local/Temp/c3-owner-direction-preparation-check-20261008.mjs`: exit0.71local A2envelopes (bỏ đúng oversized negative input),76local A3envelopes (38ca×2roles,verifiermaxdraft4096). Prompt mới chỉ thay instructions ở manifest clone trong bộ nhớ, không write manifest. Runtime/history/trusted/request/snapshot/draft binding giữ nguyên; evaluator-marker bị loại ở hai role. Max owner23361/verifier27218bytes dưới32768;326tracked evaluation files so exact bytes vớiHEAD đều nguyên vẹn;29localdoc links tồn tại. Provider generations0. Đây là kiểm tra compatibility, không phải semantic hoặc qualityPASS.
- `C3_CHECKPOINT_A_ROUND=15 node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-15.test.mjs`: exit0,12/12PASS,0skip. Existing frozen inputs vàcaptured-request firewall vẫn đúng.
- `git diff --check`: exit0. Worker/shared build/typecheck/lint không chạy lại cho sửa inactive text/docs; không claim semantic behavior mới đã đạt.

Prepared owner prompt6883bytes, SHA256 `89571d93397024282533a6086e896d62ab791b6d89f9bbb0f85b43af4c03fda2`; verifier5914bytes, SHA256 `8412eba275eda0b218eaab2184a6ba58cd26abf48cba0b1aed223c95fb843891`. Không có evaluator labels/case answers trong instructions. Hash này xác định bản chuẩn bị, không có a2/a3RunSourceSha mới. Verifier prompt cũ vẫn là cấu hình của Round15.
