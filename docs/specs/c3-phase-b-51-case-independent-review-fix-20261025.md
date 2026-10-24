# Phase B — review độc lập và bản sửa sau 51 ca

Ngày 2026-10-25. Phạm vi: 21 ca của `tool-history-run-20261025` và 30 ca mục tiêu của `tool-history-continuation-20261025`. Đây là 51 ca duy nhất thuộc **hai source SHA khác nhau**, mỗi ca một lượt; không gộp thành bằng chứng ổn định hoặc B GO. Năm lượt setup stateful mới được theo dõi riêng. **Kết luận sau canary: giữ sửa code media và bound; rút prompt tư vấn thử nghiệm vì chưa cải thiện ổn định. B chưa GO.**

Review độc lập đọc hội thoại, raw tool results, prompt owner/verifier và đường đi media. Reviewer xác nhận hai nguyên nhân có bằng chứng trực tiếp:

1. Ca ảnh màu be: khi nguồn không gắn được ảnh với màu, tool đưa `nextSelection` bỏ `color`. Model gọi lại với `color:null`, nhưng boundary chỉ nhận `undefined`/string nên từ chối `MEDIA_ARGUMENTS_OR_REF`. Đây là lệch hợp đồng của trường tùy chọn, không chứng minh shop thiếu ảnh. Bản sửa chuẩn hóa **riêng optional media color** `null` thành omitted trước khi tạo query/binding. Ảnh chung vẫn có `scope=GENERIC_PRODUCT`, `colorMatched=false`, evidence màu null; không được nói đó là ảnh màu be. Source lỗi hoặc thiếu ảnh vẫn fail closed.
2. Các ca băn khoăn về kiểu dáng: prompt cũ đã yêu cầu chọn một hướng, nhưng owner vẫn dùng tính từ chất liệu để gạt nỗi lo về gu của khách, liệt kê nhiều nhánh rồi hỏi khách chọn. Prompt thử nghiệm đã **thay** các chỉ dẫn trùng ý bằng nguyên tắc lấy băn khoăn làm tiêu chí chọn; canary dưới đây cho thấy nó chưa giải quyết lỗi, nên prompt đó đã được rút khỏi bản hiện hành. Không thêm ví dụ riêng cho case, parser, template hay model role.

Một rủi ro khác cần kiểm qua provider: câu so sánh “ít nhăn hơn khi ngồi xe lâu” được verifier cho PASS dù mô tả SQ675 đã đọc không có kết quả nhăn khi ngồi xe. Prompt thử nghiệm nhắc ranh giới này nhưng owner vẫn tạo suy diễn tương tự; không giữ câu nhắc này như một bản vá chưa đạt. Review không coi một PASS này là tỷ lệ sai chung; cần adversarial verifier control với đúng nguồn, không biến verifier thành người chấm sức bán hàng.

Kiểm chứng thực hiện: test media mới quan sát RED trước sửa (`color:null` bị REJECTED), GREEN sau sửa; 30/30 media, 60/60 media + read-only, 83/83 protocol/owner prompt/provider adapter, worker typecheck, build, lint và `git diff --check` đều PASS trên savepoint đầu. Không sửa frozen input/evidence của hai run cũ. Canary model ở dưới cho thấy prompt thử nghiệm chưa cải thiện ổn định; ảnh live-like chưa được đo.

Lượt đo tiếp theo cần seal source sạch, chạy nhóm ca từng lỗi trước (discovery fallback, ảnh màu, các ca tư vấn) cùng đối chứng fact/policy/cart; chấm exact terminal text **và ảnh thực sự chuẩn bị**, kiểm false PASS về fit/ít nhăn, rồi mới chạy 51 ca cùng một source nếu nhóm này đạt. Không claim B GO từ test deterministic hoặc hai run cũ.

## Canary đầu và sửa giới hạn verifier

Source `927f18590710ed93c7590d5b1b5fa1871b746469` được seal sạch. `--source-check` đọc lại nguồn, **0 provider generations**. B1 slot 1 `b1-changed-occasion` đã chạy một lần; actual terminal `FALLBACK/PROVIDER_ERROR`, không có request verifier lên upstream. Captured owner context sau đọc nhiều mẫu khoảng 15.012 byte; request verifier dựng từ cùng prompt/schema/context/draft khoảng **35.068 byte**, vượt bound toàn wire 32.768 byte. Đây là giới hạn request trước provider, không phải verifier đã đánh giá câu đó. Owner draft vẫn suy từ dáng/chất liệu ra nhăn sau gần ba giờ ngồi xe và so sánh mẫu khác giữ form tốt hơn; vì vậy **ca này chưa đạt về tư vấn**, dù lỗi terminal là bound.

Review độc lập lần hai xác nhận cần phân biệt hai giới hạn: runtime vẫn chặn trusted context trên 32.768 byte, còn toàn wire phải chứa cả prompt verifier (~15.686 byte), schema, binding và draft. Source kế tiếp tăng **chỉ verifier wire envelope** lên 65.536 byte trong manifest/validator/builder. RED→GREEN test chứng minh request trên 32.768 byte giữ nguyên trusted/draft; request quá 65.536 byte bị chặn trước provider. Protocol 15/15 PASS. Bound mới có identity khác, không cộng canary trên source cũ vào kết quả cùng-source. Lượt model kế tiếp cần kiểm actual verdict và các ca tư vấn còn lại; không coi tăng bound là sửa chất lượng câu owner.

## Canary sau tăng bound và quyết định rollback prompt

Source `6a1f38ab` sạch trước dispatch, source-check PASS/0 generations. Bốn lượt B1 riêng lẻ được đăng ký một lần mỗi slot trên cùng source/config prompt thử nghiệm; không gửi khách:

| Slot | Actual terminal | Review whole-turn |
| --- | --- | --- |
| `b1-changed-occasion` | FALLBACK / OWNER_TOOL_MODE | Owner final-mode phát tool call, fail closed trước verifier; không có câu trả lời hữu ích. |
| `b1-buying-concern` | SEND_ELIGIBLE / PASS | Vẫn lấy “mềm, rũ, bay” để phủ nhận lo ngại ren nhiều; lỗi bán hàng cũ. |
| `b1-buying-concern-v2` | SEND_ELIGIBLE / PASS | Thừa nhận gu đồ trơn nhưng không tìm/chọn mẫu thay, đề nghị khách cho phép tìm; chưa hoàn thành tư vấn mua một bộ. |
| `b1-buying-concern-v3` | SEND_ELIGIBLE / PASS | Vẫn liệt kê áo lẻ và cả bộ rồi để khách tự cân nhắc; chưa chọn một phương án. |

Ba PASS là phán quyết protected-language, **không phải quality PASS**. Prompt thử nghiệm chưa đạt mục tiêu và được rollback về hash `72a044fe15aaa2ff7471b0e93beae27ec630e7adbfd0a261c9bca1860ab39cbc`; bound và media fix được giữ. Không chạy tiếp 51 ca hoặc lặp ca để tìm một mẫu đẹp. Hướng giải quyết tư vấn cần khảo sát nguồn mô tả/ảnh và khả năng model chọn theo gu khách bằng một thí nghiệm thiết kế trước, không thêm dần câu nhắc hoặc regex cho ca cũ. Raw canary local ở `C:/Users/nguye/Documents/Sản phẩm AI/c3-b51-fix-canary-20261025/`; run cũ không bị ghi đè.
