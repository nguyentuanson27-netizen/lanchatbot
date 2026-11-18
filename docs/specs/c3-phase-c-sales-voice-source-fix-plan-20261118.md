# Phase C · sửa nguồn gây lời văn quy trình và câu hỏi thừa

Ngày 18/11/2026. P1/P2 đã triển khai tại `7fb18936468c4e4df02e7cb5784650e8d21bebf0` và được review độc lập **APPROVE CODE** trên đúng SHA. Chưa chạy model theo kế hoạch này; P3 và các phép đo bên dưới chưa thực hiện. [Bản sửa, kiểm tra và giới hạn](evidence/c3-sales-voice-source-fix-20261118/IMPLEMENTATION.md) · [Review độc lập](evidence/c3-sales-voice-source-fix-20261118/INDEPENDENT_REVIEW.md).
Base `05ff46a8c18f83f0f9bc61d833599de2bf30a90d`. Source của 30 lượt vừa review là `6cb3be513905cf48230cc977b18832ab23bab8a3`.

Mục tiêu là giúp khách mua thuận tiện bằng lời nói ngắn, rõ và sát câu hỏi. Giữ việc báo đúng giá, hỏi màu cần thiết và xét hỗ trợ đúng một lần đã đạt trong vòng 70.000 byte.

## 1. Finding và nguyên nhân

Đọc đủ [30 lượt](evidence/c3-owner-bound-70000-20261118/CONVERSATIONS.md), đối chiếu prompt và request owner đã capture. Có 7 câu nhắc “hệ thống”, 5 câu báo ghi nhận/lưu, 3/5 lần control hỏi lại có muốn thêm hai áo vào giỏ ở lượt đầu dù khách đã nói lấy hai áo. Các tần suất dùng để xác định nơi cần xem, không dùng làm tiêu chí PASS/FAIL. Nhắc giỏ khi xác nhận thao tác đã làm hoặc dùng ngoặc để phân biệt hàng sẵn/đặt trước có thể hoàn toàn hợp lý.

| Nguyên nhân | Bằng chứng cụ thể | Hệ quả |
| --- | --- | --- |
| Context chứa lời chỉ dẫn cách nói về quy trình | `single-agent-commerce-pricing-view.ts` có nguyên câu “Được nói rằng lên giỏ xong shop sẽ xem hỗ trợ”. Header state, kết quả RECORD và kết quả QUOTE cùng cung cấp phần giải thích này. | Owner thường lấy diễn giải cơ chế làm nội dung nhắn khách. |
| Chỉ dẫn giọng và chỉ dẫn tác vụ xung đột | Prompt cấm nhắc hệ thống/lưu/xét/áp dụng. Một bullet khác yêu cầu khi xin bớt phải đưa giá, bước tiếp theo theo evaluation và ưu đãi. Tool/context lại mô tả lưu chờ, code tự xét và vào giỏ. | Câu có đủ giá, trạng thái, quy trình, câu hỏi nhưng dài và nặng công việc nội bộ. |
| Code kết luận sai về phần còn chờ khách | `pendingSupportView()` không tìm thấy `pendingPurchase.lines` thì gán `CUSTOMER_PURCHASE_CHOICE`. Cả 5 control đều nhận giá trị này sau lời “Chị lấy hai áo…”. | Model có nguồn “đã xác nhận” đẩy nó hỏi lại quyền mua, thay vì đọc lời khách và hỏi màu còn thiếu. |
| Các lượt sau tiếp nhận giọng của lượt trước | J4 lần 1 nói về hệ thống ở lượt xin hỗ trợ rồi nhắc lại ở lượt hỏi tổng. Control lần 3 hỏi chốt ở cả lượt 2 và lượt 3. | Lịch sử do chính model sinh giúp duy trì cách nói cũ. Đây là quan sát trong trace, tác động nhân quả cần đo bằng hành trình từ đầu. |
| Cách nhận kết quả giọng còn rộng | Judge cho `voicePass=true` nhưng reason vẫn ghi “hơi máy móc”, “diễn giải hệ thống”, “hỏi xác nhận dư”. Rubric chấp nhận hạn chế giọng nhẹ. | Kết quả 5/5 hoàn thành dễ được hiểu rộng thành chất lượng diễn đạt đã đạt mục tiêu owner. |

Hai nguyên nhân đầu có mặt trực tiếp trong source và wire. Việc chúng ảnh hưởng giọng đến mức nào cần A/B. Fallback `CUSTOMER_PURCHASE_CHOICE` là lỗi nghĩa của dữ liệu, có thể tái hiện bằng kiểm tra xác định.

Prompt hiện 22.393 byte, trong đó phần size/state/giao dịch 6.513 byte, phần giọng 2.456 byte. Kích thước tự nó chưa chứng minh model nói cứng vì prompt dài. Thêm một quy tắc cấm cuối prompt không xử lý được các chỉ dẫn đang lặp ở context.

## 2. Những thay đổi cụ thể

### P1 · Sửa phần còn chờ khách tại nguồn

Tại `single-agent-commerce-effects.ts::pendingSupportView`, bỏ suy luận “thiếu pendingPurchase” thành “khách chưa chọn mua”.

- Có selection/pending purchase khớp product/offer chứng minh thiếu COLOR hoặc SIZE thì trả đúng phần thiếu và nguồn chứng minh.
- Không có bằng chứng đó thì trả trạng thái phần thiếu chưa xác định. Không diễn giải thành đã đủ lựa chọn hoặc đang chờ khách đồng ý mua.
- Giỏ đã mở và lời xin khớp giỏ tiếp tục đi đường xét hỗ trợ hiện có. Thay đổi phần mô tả không cấp quyền ghi giỏ hoặc xét hỗ trợ.
- Owner dùng tin hiện tại và lịch sử để hiểu yêu cầu mua, rồi dùng nguồn lựa chọn để hỏi màu/size. Chưa đủ nguồn thì dùng read hiện có trong budget. Code không phân loại câu khách.

Giữ `evaluation.waitingFor` và thêm `waitingForStatus: KNOWN | UNKNOWN`. Với proof khớp target, trả KNOWN cùng COLOR/SIZE thực sự còn thiếu. Giỏ khớp target và đầy đủ lựa chọn trả KNOWN cùng mảng rỗng. Thiếu proof hoặc pending không khớp giỏ trả UNKNOWN cùng mảng rỗng. Không sinh `CUSTOMER_PURCHASE_CHOICE` như fallback. Snapshot cũ có giá trị này đọc tương thích theo nghĩa chưa có bằng chứng cấu trúc; các bản ghi run cũ giữ nguyên.

Các test phải phủ lời xin hỗ trợ đơn thuần, khách đã nói mua nhưng chưa có lệnh giỏ, selector xác nhận thiếu màu, thiếu size và giỏ đã đủ. Trường hợp thiếu record không được biến thành lời xác nhận khách đã mua hay chưa mua.

### P2 · Owner đọc kết quả nghiệp vụ, giảm phần diễn giải quy trình

Dùng đường projection hiện có trong `single-agent-commerce-owner-view.ts` và `gemini-inference.mjs`.

Ở các path hỗ trợ giá đã xác định, owner nhận trạng thái yêu cầu, kết quả xét, phần lựa chọn còn thiếu có bằng chứng, giá hiện hành, các khoản đã cấp và ref để thao tác. Bỏ phần prose chỉ dẫn “Được nói rằng…”, “Code tự xét…”, “báo tổng này…” khỏi projection owner.

Áp dụng cùng cách dựng ở header state, kết quả RECORD, QUOTE, ADD và phần completed tool turns của pha final. Nếu sửa riêng header, hai kết quả tool vẫn tiếp tục cấp lời văn cũ. Projection dùng field/schema cụ thể, không tìm và thay chuỗi trong câu model.

Giữ thông tin `by/when`, status và binding cần để owner hiểu khả năng xử lý và trả lời nếu khách thực sự hỏi cách hỗ trợ. Giữ trạng thái chưa xét, chưa được cấp, đã được cấp, cùng từng adjustment đã xác nhận. Verifier vẫn đọc dữ kiện quy trình, quyền lợi và biên nhận đầy đủ để kiểm cam kết. Không bắt owner dùng một câu do code soạn.

Các phép kiểm cần chứng minh giá, phí, tổng, ưu đãi, target, source identity, operation/receipt và điều kiện chưa được cấp vẫn truy nguyên được. Giữ nguyên dữ liệu model đã nói trong accepted history, native model parts và chữ ký, cùng danh tính call/response. Ảnh, size, chính sách và nguồn mô tả dùng các path hiện có.

### P3 · Chỉnh phần prompt đang tự mâu thuẫn nếu dữ liệu sửa chưa đủ

Phép sàng lọc đầu dùng prompt hiện hành để đo riêng P1/P2. Nếu kết quả không cải thiện, dừng nhánh và review lại bằng chứng trước một run khác.

Phần prompt cần sửa khi bước này được mở là bullet bắt câu xin bớt luôn có giá + bước theo evaluation + ưu đãi, cùng câu cấm toàn bộ từ “ghi nhận/lưu/áp dụng”. Thay yêu cầu đó bằng nguyên tắc đáp lời khách và đưa việc mua cần làm tiếp khi có ích. Kết quả thực có thể giải thích bằng lợi ích cụ thể; khách hỏi quy trình thì giải thích đúng phạm vi cần biết.

Giữ hướng dẫn về chọn món, tư vấn tự tin, dùng size code tính, chính sách, dữ kiện mới và form báo giá ads. Thay đoạn hiện có, không thêm một lớp luật giọng ở cuối. Không bắt mọi câu cùng số câu, cùng cách mở đầu hoặc luôn phải có câu hỏi chốt.

## 3. Kiểm tra và đo chất lượng

Làm P1/P2, self-review diff và kiểm hồi quy trước. Test chứng minh thiếu bằng chứng cấu trúc là UNKNOWN, các view giữ đúng nghĩa tiền/quyền lợi và có cùng cách trình bày ở continuation/final. Kiểm build/typecheck/lint, owner/effects/quote/boundary/adapter, các control size/correction, ads có ảnh và chính sách liên quan. Giữ owner bound 70.000 byte và trần generation/tool hiện hành.

### Sàng lọc một lần trên đầu vào đã khóa

Tám cặp, mỗi cặp một owner request đối chứng và một owner request P1/P2, cùng model/prompt/nguồn. Judge chấm mù mỗi cặp một lần, tổng tối đa **16 owner + 8 judge = 24 request**.

- Sáu input có vấn đề lấy cố định từ run 70.000 byte. J4 lượt 2 của lần 1 và 3, control lượt 1 của lần 3 và 4, control lượt 2 và 3 của lần 3.
- Hai input đối chứng lấy từ ca báo giá ads và sửa số đo đã dùng trong chương trình giọng trước. Chọn thứ tự đăng ký đầu tiên, không chọn theo câu hay. Lưu đường dẫn/hash trước khi gọi provider.
- Replay dùng thời điểm và nguồn của input đã capture để chấm chẩn đoán. Không gọi tool/state/effect từ replay, không công bố send eligibility. Output mới đòi gọi tool hoặc provider lỗi vẫn nằm trong mẫu số.
- P1/P2 cần giọng phù hợp ít nhất 5/6 input có vấn đề và thắng ròng dương; hai control đủ việc, đủ dữ kiện. Bất kỳ lỗi giá/quyền lợi/size/effect/privacy mới đều dừng gói.

Judge đọc cả đoạn trong mạch hội thoại và giải thích vì sao câu giúp khách đi tiếp hoặc bắt khách nghe/thực hiện việc nội bộ. Nhắc lại màu còn thiếu hoặc một khoản tiền để làm rõ có thể đạt. Một câu chứa “áp dụng” hoặc dấu ngoặc không tự động trượt. Giọng và hoàn thành tác vụ có kết luận riêng; lý do chấp nhận phải nói rõ hạn chế còn lại.

Chấm giọng thực hiện offline. Semantic verifier tiếp tục kiểm protected semantics của exact final draft theo contract hiện hành.

### Native khi sàng lọc đạt

Chạy J4 ×5 và control ×5 từ lượt đầu, cùng world còn hiệu lực, models/config hiện hành. Nếu phải chụp nguồn mới thì bind và seal lại cả phép đo theo nguồn đó. Giữ nguyên mọi tin đã sinh trong lịch sử, mọi lỗi và terminal outcome.

- J4 giữ đúng tổng 529.000đ trên world hiện tại, yêu cầu hỗ trợ còn pending khi khách chưa chọn màu.
- Control giữ đúng hai áo trắng M, một lần xét hỗ trợ, giảm 5% và miễn ship theo receipt, tổng 948.100đ trên world hiện tại.
- Giọng đạt ít nhất 4/5 tại từng vị trí đích, gồm J4 lượt xin hỗ trợ và hỏi tổng, control lượt đầu, chọn màu và hỏi tổng. Hoàn thành mỗi ca ít nhất 4/5, lỗi fact/state/effect/privacy bằng 0.
- Báo riêng câu hỏi xác nhận thừa, giải thích quy trình dư và thông tin cần thiết bị cắt. Không chấm bằng bộ từ khóa.

Trần native **120 request** cộng **10 judge**, toàn kế hoạch tối đa **154 request** nếu qua bước sàng lọc. Đây là quần thể development đã xem kết quả, không đại diện holdout. Không tự thêm lần chạy hay chọn mẫu tốt để thay mẫu lỗi. Chưa có request nào thực hiện theo kế hoạch này.

## 4. Rút kinh nghiệm từ các vòng trước

Trong phép đo giọng ngày 15/11, J2 sửa số đo giảm từ 3/5 xuống 1/5 và thử trình bày trạng thái đặt trước có S08 đủ thông tin giảm từ 4/5 xuống 3/5. Review cũng chỉ ra hướng dẫn hữu ích đã bị bỏ trong quá trình rút prompt trước đó. Vì vậy lần này chỉ sửa path hỗ trợ đang có bằng chứng, giữ các chỉ dẫn và dữ kiện đã giúp những luồng khác. [Review phép đo cũ](../../apps/worker/evals/single-agent-commerce-qualification/sales-voice-run-20261115/REVIEW.md).

Code tự xét hỗ trợ và bound 70.000 đã giúp cả hai ca hoàn thành 5/5. Phương án này cần giữ kết quả đó đồng thời giảm lời văn quy trình. Chưa có cơ sở kết luận đổi model, rút toàn bộ prompt hay tăng thêm budget sẽ giải quyết các lỗi giọng đang quan sát.
