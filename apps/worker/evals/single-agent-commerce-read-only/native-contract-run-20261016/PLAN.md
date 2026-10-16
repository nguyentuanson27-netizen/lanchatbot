# Sửa native continuation, contract đổi giỏ và chạy một lượt B

Owner yêu cầu sửa và chạy lại. Intake `40f400e7d3d121fa12da7a2a02ca1cf8fdccb9ee`; đã refresh main, implementationBaseSha vẫn `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Giữ branch/PR391 hiện có, historical raw/labels và A OWNER_BYPASS.

## Thay đổi có owning risk cụ thể

1. `change_cart_item` đang nhận argument không thuộc action rồi bỏ qua: SET_COMPONENT_VARIANT kèm quantity chỉ đổi variant. Dùng validation allowlist theo action ngay trong tool hiện tại, từ chối trước effect/CAS. Native declaration nói rõ mỗi action làm phần nào và có thể gọi hai action trong batch hiện có. Không thêm mutation kind, transaction framework hoặc completion state. RED phải quan sát được với cả variant/quantity/remove có argument thừa; GREEN giữ batch hai mutation hợp lệ, receipts/fences và idempotence.
2. Owner request lặp full cart trong function response dù snapshot đã có đúng cartItems/cartQuote. Reuse quy tắc loại trùng của adapter: chỉ bỏ bản cart trùng đúng public cart hiện tại ở success add/change; giữ operation/receipt, các phản hồi khác/trước đó và native functionCall/thoughtSignature nguyên vẹn. RED cho thông tin chỉ cần hiện một lần; các control khác biệt/thiếu snapshot phải giữ nguyên. Không tăng bound 32.768 bytes hoặc cắt signature.
3. Giảm phần instruction trùng giữa prompt và native declaration, giữ nghĩa tool/argument. Sửa owner tại đoạn hiện có để lý do tư vấn bám đúng mặt khách lo, dùng lời chat thay đoạn quảng cáo. Policy hỏi thời hạn/phí chỉ kết luận đúng phạm vi ấy, không tự nối lời duyệt đủ quyền. Không đổi verifier, policy/source, model, effort, budget, corpus, quality bar hay thêm case answers/keyword rules. Mục đích là làm rõ, không rút ngắn bằng mọi giá.
4. Checkout thiếu mapping địa chỉ → vùng nguồn vẫn là dependency; không tự đoán vùng/ETA hoặc publish nguồn. Run mới sẽ phản ánh actual dependency, không giả lập checkout hoàn tất.

## Verification và một lần đo mới

Debugging + TDD, quan sát RED trước code; self-review sau GREEN. Đọc official Gemini function-calling/thought-signature docs trước adapter/declaration change. Chạy focused owning/provider/protocol/protected-reply, full worker/Node eval và worker typecheck/build/lint. Kiểm offline native continuations có signature dài, hash/projection/bounds; không coi kiểm offline là provider result hoặc chứng minh mọi signature đều vừa bound.

Sau khi executable/prompt/config hoàn tất: freeze exact models/prompts/schema/native tools/corpus, commit, clean source và capture HEAD thành bRunSourceSha. Chạy preflights/source readback rồi **một** lượt đủ 24 B1 + 7 ordered stateful, N1, cùng corpus/budget/model hiện hành; giữ toàn bộ lỗi, không first-six stop, retry, replacement hoặc vòng phụ. Lưu raw trước primary trước diagnosis. Review cả actual terminal/state và hội thoại theo mục tiêu bán hàng, không bóc keyword/ép đáp án. Audit request/binding/firewall/denominator/latency/token/cost; update tasks/PR391 rồi dừng. Không Phase C, merge/deploy/live send hoặc source mutation.
