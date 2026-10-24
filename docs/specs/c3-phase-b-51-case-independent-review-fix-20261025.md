# Phase B — review độc lập và bản sửa sau 51 ca

Ngày 2026-10-25. Phạm vi: 21 ca của `tool-history-run-20261025` và 30 ca mục tiêu của `tool-history-continuation-20261025`. Đây là 51 ca duy nhất thuộc **hai source SHA khác nhau**, mỗi ca một lượt; không gộp thành bằng chứng ổn định hoặc B GO. Năm lượt setup stateful mới được theo dõi riêng.

Review độc lập đọc hội thoại, raw tool results, prompt owner/verifier và đường đi media. Reviewer xác nhận hai nguyên nhân có bằng chứng trực tiếp:

1. Ca ảnh màu be: khi nguồn không gắn được ảnh với màu, tool đưa `nextSelection` bỏ `color`. Model gọi lại với `color:null`, nhưng boundary chỉ nhận `undefined`/string nên từ chối `MEDIA_ARGUMENTS_OR_REF`. Đây là lệch hợp đồng của trường tùy chọn, không chứng minh shop thiếu ảnh. Bản sửa chuẩn hóa **riêng optional media color** `null` thành omitted trước khi tạo query/binding. Ảnh chung vẫn có `scope=GENERIC_PRODUCT`, `colorMatched=false`, evidence màu null; không được nói đó là ảnh màu be. Source lỗi hoặc thiếu ảnh vẫn fail closed.
2. Các ca băn khoăn về kiểu dáng: prompt cũ đã yêu cầu chọn một hướng, nhưng owner vẫn dùng tính từ chất liệu để gạt nỗi lo về gu của khách, liệt kê nhiều nhánh rồi hỏi khách chọn. Bản sửa **thay** các chỉ dẫn trùng ý bằng nguyên tắc lấy băn khoăn làm tiêu chí chọn, đáp ứng trọn nhu cầu, chọn một phương án với một lý do trực tiếp. Không thêm ví dụ riêng cho case, parser, template hay model role.

Một rủi ro khác cần kiểm qua provider: câu so sánh “ít nhăn hơn khi ngồi xe lâu” được verifier cho PASS dù mô tả SQ675 đã đọc không có kết quả nhăn khi ngồi xe. Prompt owner nay nói rõ vật liệu/dáng không tự chứng minh kết quả cụ thể sau khi mặc, vận động hoặc dùng lâu. Review không coi một PASS này là tỷ lệ sai chung; cần adversarial verifier control với đúng nguồn, không biến verifier thành người chấm sức bán hàng.

Kiểm chứng thực hiện: test media mới quan sát RED trước sửa (`color:null` bị REJECTED), GREEN sau sửa; 30/30 media, 60/60 media + read-only, 83/83 protocol/owner prompt/provider adapter, worker typecheck, build, lint và `git diff --check` đều PASS. Không sửa frozen input/evidence của hai run cũ. **Chưa chạy model trên source mới**, nên chưa biết bản prompt có cải thiện quyết định/giọng hoặc ảnh có thực sự đến khách ở ca live-like hay không.

Lượt đo tiếp theo cần seal source sạch, chạy nhóm ca từng lỗi trước (discovery fallback, ảnh màu, các ca tư vấn) cùng đối chứng fact/policy/cart; chấm exact terminal text **và ảnh thực sự chuẩn bị**, kiểm false PASS về fit/ít nhăn, rồi mới chạy 51 ca cùng một source nếu nhóm này đạt. Không claim B GO từ test deterministic hoặc hai run cũ.
