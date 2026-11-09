# Independent implementation review R3

**APPROVE implementation** tại `f4ba36b53abc69a682924c6103eb073d113114e3`, diff từ `36058803b95324d8888ef4e6c76773e01b61bb6f`. Plan duyệt giữ nguyên SHA256 `6495b49aff8016df34050d79f86b31330905ef2deb9714033b92ecde13cc3bdd`. Không còn finding chặn implementation trong phạm vi W1–W5 đã review. **Chưa duyệt provider input/registration hoặc Phase C qualification.**

## Các mục đã đóng

- IR1-F1/F2/F3: tham chiếu đúng giỏ; kiểm nguồn/giới hạn byte và owner–verifier wire của component label; fault test lỗi stream/abort với một request.
- IR2-F1: đồng bộ đúng revision do chính negotiation receipt chứng minh, vẫn chặn revision bên ngoài. Với mã offer canonical, cart overlay giữ nguyên claim/total/receipt riêng. Quote dùng proof giá offer từ exact completed read, không I/O mới, gắn đầy đủ source/provenance/hash/expiry/request/binding/recipient. Readback thiếu, đổi hoặc hết hạn proof phải fail closed. Không bỏ cart claim filter hay trộn giá sau thương lượng vào pre-cart calculator.
- Native wire còn giữ gate hai đơn vị cũ: đã sửa về một primitive; reviewer quan sát probe đúng cấu hình RED rồi GREEN. Gate ảnh vẫn reserve/charge riêng trong cap6.
- PG negative phát hiện lỗi terminal thật: quote đã dừng nhưng ACK vẫn gửi khi commit chưa được chứng minh. Guard tại effects.terminalOutcome nay trả NO_SEND/UNKNOWN_COMMIT ngay khi uncertain; không gọi thêm owner/verifier, không giả handoff và không rollback state đã commit. Reconciliation có receipt hợp lệ vẫn giữ nguyên.

## Bằng chứng cuối

Đã đọc artifact PostgreSQL `../c3-tool-contract-pg-final-all-20261109/integration.json`: **14/14 PASS**, source sạch đúng `f4ba36b5`, provider generations0, DB test đã drop. Bao gồm writer state/selection/no-cart/negotiated; writer bị từ chối; known/unknown lost reply; sáu batch invalid trước CAS; quote+media delivery restart đúng một lần.

Known lost reply có receipt hợp lệ: quoteWork1, enqueue1, đúng một effect event. Unknown lost reply: fault đánh trúng actual commerce receipt reader một lần, quoteWork0, enqueue0, owner1/verifier0, NO_SEND/UNKNOWN_COMMIT/textnull, effect event vẫn1 và không capture khách mới. Targeted PG riêng cũng PASS với cùng witness. Các failure trước đó được giữ lại; lỗi assertion của synthetic owner không được gọi là provider outage, và fault handoff-delivery receipt ban đầu không được tính là đã kiểm commerce unknown receipt.

Đã đọc log cuối: focused worker **1094/1094 PASS,36files**; Node adapter/protocol **102/102 PASS**; worker build/typecheck/lint PASS. Unknown-terminal unit có RED quan sát trước, sau guard effects+quote **183 PASS**. Reviewer không chạy lại broad tests hay provider; reviewer thực hiện source review, đọc evidence, probe actual wire và `git diff base HEAD --check` PASS. Hash source/log được ghi ở JSON đi kèm.

## Giới hạn duyệt

Giữ một owner/tối đa một verifier, authority ở code, caps6/2/3/1 và retry0. Không có parser/router/role mới, repair/reverify, case production regex, runtime child retrieval hoặc live send trong bản sửa này.

S16 vẫn thiếu provenance ảnh khách mặc; cohort prospective SOURCE_GAP_CONTROL không là positive capability mới và không sửa kết quả lịch sử. Native phải ghi rõ repaired path EXERCISED/NOT_EXERCISED; deterministic PG không thay cho kết quả model. Bằng chứng này không khẳng định chất lượng bán hàng, độ ổn định model hoặc Phase C GO.

Bước kế tiếp: commit approval/evidence, seal source sạch, chuẩn bị initial state/world và complete registration, review input riêng trước dispatch. Screen13ca/27lượt không được tự mở full remainder hoặc rerun để săn sample.

