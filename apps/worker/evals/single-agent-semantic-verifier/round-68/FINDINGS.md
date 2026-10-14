# Round68 — full run requested, stopped at A2 prefix

A2 chưa hoàn thành:6/142 lượt thực hiện,136 NOT_RUN; A3 toàn bộ42 NOT_RUN. Không được gọi đây là full A2 PASS hay kết quả chất lượng A3. Recommendation **STOP** tại Checkpoint A.

## Lỗi quan sát được

Ba lần `pr387-negation-inversion` đều nhận `verdict: FAIL`, loại `CONTRADICTION_OR_NEGATION`. Model nhận ra draft đảo nghĩa “hết hàng”. Tuy nhiên `protectedRef` đều là `provenance.evidenceRef` của tồn thay vì `claimId` được code chấp nhận. JSON đúng schema hình dạng nhưng sai hợp đồng tham chiếu hiện tại; final gate trả `MALFORMED`, static fallback, không đủ điều kiện gửi. Ba lần `pr387-dropped-material-policy-condition` nhận FAIL hợp lệ với ref `exchange:v1`.

Đây là lỗi output contract của verifier, không phải provider outage, unsafe false PASS hay lỗi tư vấn đã quan sát ở A3. Cả6 request dùng đúng `gpt-6.1-sol`/high, không retry/error/timeout. Chưa có generation từ model tư vấn trong vòng này.

Code cho phép `protectedClaims[].claimId` và `ref` của subject/policy/receipt/profile. `evidenceRef` chỉ định nguồn bằng chứng, không tự là identifier của protected claim. Boundary giữ đúng quy tắc unknown protectedRef phải fail-closed; không đổi quy tắc này để hợp thức hóa kết quả model.

## Root cause và giới hạn kết luận

Prompt hiện tại chỉ nói “protectedRef là ref có trong trusted”. Trong cùng context có nhiều loại định danh, nhưng prompt không nói rõ claim phải dùng `claimId`; schema chỉ giới hạn kiểu string/null, còn kiểm tra membership nằm ở code. Hướng dẫn và bộ kiểm tra vì vậy chưa mô tả rõ cùng một output contract cho model. Đây là điểm mơ hồ có thể giải thích lỗi đã quan sát, không phải bằng chứng đầy đủ về nguyên nhân thống kê của mọi lần sai.

Cùng ca ở R67 dùng đúng claimId cả3lần; R68 dùng evidenceRef cả3lần. Corpus/context/schema/code boundary không đổi; prompt pair đổi từ R67, và từng request cũng có variance. Không đủ dữ liệu để quy lỗi riêng cho đoạn tư vấn sản phẩm mới, model capability hay temperature. Các test request/firewall chứng minh payload và authority được giữ đúng; chúng không chứng minh model luôn xuất đúng identifier.

Runner hiện hành có điều kiện sáu lượt regression phải đúng cả verdict contract trước khi chạy tiếp. Điều kiện này được giữ và đóng băng trước provider trong scope68; lần này nó giữ136 lượt còn lại dù cả6 unsafe đều bị chặn. Đây là lý do chưa chạy full. Không sửa gate, đánh lại nhãn, thay nguồn, retry ba ca hay dùng kết quả R67 thay vào sau khi đã thấy kết quả. A3 vẫn cần complete fresh A2 PASS.

## Hướng xử lý cho quyết định tiếp theo

Làm rõ hợp đồng output bằng tên trường thật: claim dùng `claimId`; subject/policy/receipt/profile dùng `ref`; `provenance.evidenceRef` không dùng làm `protectedRef`; không có tham chiếu phù hợp thì null. Đây là chỉ dẫn áp dụng chung theo schema/authority, không phải ví dụ để fit ca, regex, alias tự sửa hay thêm model. Giữ boundary unknown-ref fail-closed và exact-text semantics. Không sửa prompt hay chạy lại trong vòng68.

Nếu owner tiếp tục yêu cầu full, cần chốt trước kết quả việc full có giữ điều kiện prefix all-match hay chỉ giữ hard stop unsafe send-eligible PASS và availability stop. Giữ thứ tự/N3 không nhất thiết phải là một điều kiện giữ toàn bộ phần còn lại. Không được diễn giải lại gate sau kết quả để đổi status vòng68.

Sau khi chốt hợp đồng/lịch chạy cho một run mới, freeze → clean source seal → fresh A2; chỉ complete PASS mới A3. Phần cần sửa trước ở đây là mapping output và điều kiện chạy, không có dữ liệu mới để kết luận chất lượng tư vấn đã tăng/giảm. Không tiếp tục post-A.
