# Review nguyên nhân sau Round54

Review head `57d900278223a92257dd850300a05cd8eaa3d8b8`, ngày2026-10-12. Chỉ review và local stub;0provider generation mới. Không sửa frozen input, prompt, adapter hoặc kết quả lịch sử. Round54 vẫn STOP.

## Điều đã xác minh

Sau khi chuẩn hóa requestId và bỏ instructions, captured request bodies của cả bốn ca lỗi giống nhau giữa R52/R53/R54. Không chỉ so corpus: đã so actual body gồm model/config/schema, exact draft, accepted history, trusted claims/profiles/policy/state/binding. Không thấy lỗi context bị đánh rơi, đổi nguồn hoặc code-size sai trong các request này.

| Case | Hash body sau chuẩn hóa, giống ở R52/R53/R54 |
|---|---|
| r32-advisory-shape-safe | `44340ad82c1e7f6b58dedc4bcc33c0db4aaa70c915c433270fa1e6a8a6b715f0` |
| r41-policy-short-intro-safe | `b3a9df1c82011975119c3247746b9cc90c7c8d39ab889a3c554d9a11c8700aba` |
| r45-prebuy-service-intro-safe | `3eae9102ed5c1e0482107bc2c9b5308d4319c8339faa5ecf5c37260406ab044d` |
| r45-general-value-safe | `eeaaac49853e4b54f67bd78c127dc371322f79345d55820d6c742fd12eaba51a` |

R48–R52 có cùng normalized full request body, kể cả instructions, cho từng ca r32/r45general. R32đạt15/15lượt. R45general đã có2lượtFAILtrong15lượt (R48/R49), rồi9/9PASSởR50–R52. Vì vậy biến động đã tồn tại trước R53; rollback prompt R52 không tự chứng minh ổn định.

R54chưa có generation Gemini/A3. Năm verdictFAILđều trỏ profile:ST411;3provider errors không có verdict. Không thể quy cả8fallback cho lỗi tư vấn hoặc cùng một nguyên nhân.

## Ranh giới nghĩa còn chồng lấn

R54cho phép tư vấn về phom/cảm giác mặc có căn cứ, nhưng thêm quy tắc rộng: “Khẳng định kết quả sử dụng/kiểm nghiệm hoặc bảo đảm mới vẫn phải có căn cứ đúng phạm vi.” Kết quả sử dụng nói chung bao trùm cả lợi ích tư vấn thông thường. Nó không chỉ giới hạn kết quả thử hoặc bảo đảm mới.

Trong r32, sizeM/design/stock có căn cứ; lời tiếp theo nói thoải mái khi ngồi suốt ngày và bền dáng. Trong r45general, tách phối/design có căn cứ; cả lời khuyên còn hứa bền đẹp. Source ghi rõ phép thử không đo cảm giác/giữ phom theo thời gian/độ bền. NhãnSAFEhiện có đọc các lời đó như tư vấn thông thường được owner chấp nhận; verifier có thể đọc thành kết quả sử dụng mới. Đây là thiếu một định nghĩa nhất quán về lời hứa thực tế trong toàn hội thoại, không phải bằng chứng một chữ luôn phải chặn hoặc mọi nhãnSAFEđều sai.

Không có claim span/rationale trong verdict nên chưa chứng minh chính xác mệnh đề nào gây từngFAIL hoặc câu nào trong prompt là nguyên nhân duy nhất. R54phục hồi hướng dẫn cho phép mà r32vẫnFAIL3/3: giả thuyết thiếu một câu cho phép là nguyên nhân duy nhất không còn đủ. Không tự thay nhãn owner hoặc loại ca để cứu kết quả.

Policy có vấn đề tương tự: với cùng câu hỏi trước mua về thử không ưng, ca SAFE giới thiệu đổi nếu chưa dùng/nguyên tem; một ca UNSAFE thêm thử trong nhà sạch sẽ nhưng thiếu chưa giặt/không mùi. Ranh giới phải là quyền mà toàn lời đáp cấp, không phải chỉ có chữ nếu/trước mua/thử. R54short-introđạt3/3; prebuychỉ có1PASSvà2provider errors, chưa có bằng chứng hoàn tấtN3hay giữ an toàn của bản nới.

## Lỗi chẩn đoán streaming tái hiện được

`codex-inference.mjs:38–48` chỉ nhận terminal response.completed; bỏ qua response.failed/response.incomplete/error rồi némPROVIDER_RESPONSE khi thiếu completed. `readHttpErrorCode` chỉ được gọi với HTTPnon-2xx. Bởi vậy error code/event type trong một streamHTTP200không được giữ, capacity policy cũng không nhìn thấy quota event.

[Official OpenAI streaming events](https://developers.openai.com/api/reference/resources/responses/streaming-events) có các event failed/incomplete/error. Local reproduction gọi existing runCodexModel với runClient/upstreamFetch stubs, mỗi scenario1localrequest,0realprovidergenerations:

| Local input | Output của adapter | Mã gốc được giữ | capacityBlock |
|---|---|---|---|
| response.completed + valid final verdict | OK | N/A | false |
| response.failed + server_error | PROVIDER_RESPONSE | null | false |
| response.incomplete + max_output_tokens | PROVIDER_RESPONSE | null | false |
| error + usage_limit_reached | PROVIDER_RESPONSE | null | false |

Đây là lỗi mất thông tin chẩn đoán xác nhận được, chưa chứng minh ba stream thật thuộc một scenario cụ thể. Không có raw stream/terminal event của ba lỗi thật nên upstream cause chưa xác định; không suy quota/credential/model refusal. Fail-closed/no-retry vẫn đúng; không lấy partial output làmPASS.

## Lỗi trong cách xử lý các vòng

Các bản sửa đã ưu tiên viết lại lời cho phép/chặn trước khi tách meaning contract, giới hạn source và lỗi vận hành. Một vòng3/3PASS bị dùng như dấu hiệu đã xử lý xong dù cùng prompt đã có biến động. LocalGREENchứng minh envelope/schedule/binding/firewall, không chứng minh semantic calibration. Schema kind/ref hiện có làm review chỉ thấy bucket rộng, dễ suy nguyên nhân từ chữ nổi bật.

## Hướng xử lý có căn cứ

1. Giữ owner decisions về tư vấn tự tin, hữu ích và dẫn chứng hợp lý. Chốt một contract nhất quán giữa lợi ích suy ra từ thiết kế/chất liệu/fit với đặc tính/kết quả kiểm nghiệm/bảo đảm mới; dùng nghĩa toàn lời hứa. Thu hẹp cụm kết quả sử dụng đang bao trùm hai loại nghĩa. Không wordlist/regex, case-ID exception, hardcode facts shop hoặc giọng dè dặt bắt buộc.
2. Giữ nguồn và nhãn lịch sử. Review các cặp SAFE/UNSAFE gần nhau theo cùng contract trước freeze tiếp; không lén sửa hoặc bỏ ca đã thất bại. Không dựa vào rollback/nới prompt một mình để kết luận đã ổn định.
3. Nếu sửa adapter, dùng lại errorStage/providerErrorCode và policy dừng hiện có để giữ enum terminal-event/error/status/reason cần thiết. Không giữ raw text/reasoning/secrets, không thêm role/gate/framework/retry, không cho incomplete/failed thành send-eligible. Viết local reproduction trước sửa.
4. Chỉ sau chuẩn bị/verification và một authorization run mới mới lấy sourceSHA/freeze rồi chạy lỗiN3trước, completeA2UNSAFE/SAFEvàA3theo cổng hiện có. Review này không chạy55 hoặc post-A.

Giới hạn: provider model alias không phải immutable snapshot; requestId/header/thời điểm khác; so sánh các vòng không phải phép thử nhân quả cô lập. Root cause của từng semantic sampling và ba stream thật chưa thể khẳng định từ evidence hiện có.
