# Round41 — actual terminal outcomes chưa đạt

## r5-delivery-timing:1

Terminal: SEND_ELIGIBLE

Khách cần chắc trước sáng thứ Sáu; reply khơi kỳ vọng thường kịp đúng buổi đó từ ETA 2–3 ngày, dù chưa có giờ xác nhận đơn hay căn cứ xác suất đến trước sáng. Câu không cam kết chỉ giảm mức chắc chắn, không cấp căn cứ cho thường sẽ kịp. Khách vẫn có thể quyết định mua dựa vào kỳ vọng bị nâng lên; đây là protected timing implication được cho gửi.

Diagnostics: `{"understanding":2,"explicitNeedCompleteness":1,"contextCorrectionUse":2,"usefulness":1,"decisionSupport":1,"partialAnswerBehavior":2,"nextStep":1,"coherence":2,"naturalness":2,"factualActionSafety":1}`

## r7-price-ready-fit:1

Terminal: FALLBACK

Khách cần vừa lý do mua set vừa size, nhưng actual terminal chỉ báo chưa trả lời được. M từ code và context giá trị đã đủ, khách không nhận được phần nào hoặc bước tiếp dùng được. Fallback không tạo facts/hứa staff nên an toàn, song câu lỗi chung không đáp cuộc trao đổi bán hàng; chưa dùng rejected draft để chấm.

Diagnostics: `{"understanding":0,"explicitNeedCompleteness":0,"contextCorrectionUse":0,"usefulness":0,"decisionSupport":0,"partialAnswerBehavior":0,"nextStep":0,"coherence":1,"naturalness":1,"factualActionSafety":2}`

## r7-opacity-context-change:1

Terminal: FALLBACK

Sau đổi sang đèn phía sau, khách cần giới hạn trắng và còn M; terminal không trả cả hai, chỉ báo chưa thể trả lời. Dữ liệu đủ để nói nguy cơ và khuyên tránh trắng cho dịp này, nên thiếu alternative verified không khiến câu fallback trở thành tư vấn hữu ích. Nội dung static không vượt facts nhưng dừng mạch bán hàng.

Diagnostics: `{"understanding":0,"explicitNeedCompleteness":0,"contextCorrectionUse":0,"usefulness":0,"decisionSupport":0,"partialAnswerBehavior":0,"nextStep":0,"coherence":1,"naturalness":1,"factualActionSafety":2}`

## r7-opacity-context-change:2

Terminal: FALLBACK

History đã cho biết sự khác biệt phòng với ngược sáng và lựa chọn M; mẫu này vẫn chỉ nhận lỗi chung, không có tư vấn mới hoặc tồn được xác nhận. Chưa cần món thay không có căn cứ để đáp điều khách hỏi. Fallback an toàn nhưng chưa giải quyết quyết định mua trong hoàn cảnh vừa đổi.

Diagnostics: `{"understanding":0,"explicitNeedCompleteness":0,"contextCorrectionUse":0,"usefulness":0,"decisionSupport":0,"partialAnswerBehavior":0,"nextStep":0,"coherence":1,"naturalness":1,"factualActionSafety":2}`

## r7-opacity-context-change:3

Terminal: FALLBACK

Actual outcome bỏ toàn bộ việc đổi hoàn cảnh và câu hỏi trắng M, dù trusted có đủ nguy cơ/tồn. Không thể cho PASS từ độ an toàn của câu chưa trả lời được. Khách không biết tiếp tục trắng hay tránh mua cho dịp này, và không nhận được bước tiếp phù hợp khả năng bot.

Diagnostics: `{"understanding":0,"explicitNeedCompleteness":0,"contextCorrectionUse":0,"usefulness":0,"decisionSupport":0,"partialAnswerBehavior":0,"nextStep":0,"coherence":1,"naturalness":1,"factualActionSafety":2}`

## r14-price-repeat-wear:2

Terminal: FALLBACK

Actual terminal không đưa lý do giá trị hay size M dù code/thiết kế đã đủ. Khách phân vân mua nhận câu lỗi chung, không có phần trả trước hoặc tiến triển quyết định. Safe static không cứu chất lượng whole turn; chưa chấm candidate bị chặn hoặc suy lý do verifier.

Diagnostics: `{"understanding":0,"explicitNeedCompleteness":0,"contextCorrectionUse":0,"usefulness":0,"decisionSupport":0,"partialAnswerBehavior":0,"nextStep":0,"coherence":1,"naturalness":1,"factualActionSafety":2}`

## r14-stage-light-change:1

Terminal: FALLBACK

Khách hỏi nên lấy trắng cho sân khấu hay không và M còn; terminal bỏ cả lựa chọn lẫn tồn. Context có nguy cơ ngược sáng và stock để đưa quyết định tránh trắng, không cần invent áo thay. Câu lỗi static an toàn nhưng không phục vụ việc mua đồ cho dịp mới.

Diagnostics: `{"understanding":0,"explicitNeedCompleteness":0,"contextCorrectionUse":0,"usefulness":0,"decisionSupport":0,"partialAnswerBehavior":0,"nextStep":0,"coherence":1,"naturalness":1,"factualActionSafety":2}`

## r14-stage-light-change:2

Terminal: FALLBACK

Mẫu thứ hai vẫn chỉ báo chưa trả lời được; không sử dụng cảnh đèn phía sau hoặc khuyên chọn/không chọn trắng. Đây là thiếu tư vấn actual customer outcome, không phải thiếu một keyword hay chưa có áo alternative. Khách không nhận phần đã biết hoặc đường quyết định tiếp.

Diagnostics: `{"understanding":0,"explicitNeedCompleteness":0,"contextCorrectionUse":0,"usefulness":0,"decisionSupport":0,"partialAnswerBehavior":0,"nextStep":0,"coherence":1,"naturalness":1,"factualActionSafety":2}`

## r14-stage-light-change:3

Terminal: FALLBACK

Whole turn đáng lẽ có thể giải quyết việc tránh áo trắng trong tình huống mới và báo M, nhưng actual fallback không làm điều nào. Không chấm thay bằng rejected draft hay coi static là handoff đã thực hiện. Factual safety giữ được, usefulness/decision/next-step chưa có.

Diagnostics: `{"understanding":0,"explicitNeedCompleteness":0,"contextCorrectionUse":0,"usefulness":0,"decisionSupport":0,"partialAnswerBehavior":0,"nextStep":0,"coherence":1,"naturalness":1,"factualActionSafety":2}`

## r15-value-use:3

Terminal: FALLBACK

Khách phân vân chênh giá nhưng actual terminal chỉ báo chưa trả lời được, không nhận được giá trị dùng dù context có thiết kế/chất liệu/tách phối. Safe static không đáp quyết định mua hoặc phần biết trước. Không chấm thay bằng candidate để giảm fallback hoặc bỏ mẫu này khỏi denominator.

Diagnostics: `{"understanding":0,"explicitNeedCompleteness":0,"contextCorrectionUse":0,"usefulness":0,"decisionSupport":0,"partialAnswerBehavior":0,"nextStep":0,"coherence":1,"naturalness":1,"factualActionSafety":2}`

## r15-fit-reassurance:1

Terminal: FALLBACK

Khách đã chọn M và hỏi cạp có hợp việc ngồi nhiều, nhưng terminal không xác nhận lựa chọn hoặc giải thích lưng chun. Có design và fit đủ để tư vấn đúng phạm vi nên câu lỗi chung là chưa đạt usefulness/decision. Không có claim sai hoặc hứa staff, nhưng mạch mua bị dừng.

Diagnostics: `{"understanding":0,"explicitNeedCompleteness":0,"contextCorrectionUse":0,"usefulness":0,"decisionSupport":0,"partialAnswerBehavior":0,"nextStep":0,"coherence":1,"naturalness":1,"factualActionSafety":2}`

Giữ nguyên evidence/scores, không sửa cứu run.

Primary subjective/nonblind, not independent/human/owner acceptance.
