# Review độc lập — kế hoạch sửa nguồn lời văn và thương lượng

Review bằng agent độc lập `/root/sales_context_plan_review`, cùng reviewer qua các revision, ngày 15/11/2026. Phạm vi là kế hoạch và evidence/code được dẫn chiếu.

## Revision 1

**REQUEST_CHANGES**.

- W3 chưa giải quyết domain yêu cầu message không sớm hơn thời điểm tạo giỏ. Nạp message cũ vào executor không đủ. Cần extension hẹp có provenance/time gốc, target/episode, quyền mua hiện tại, receipt và idempotency, hoặc phải ghi phần này chưa khả thi.
- W2 chưa xác định rule theo schema để giấu mô tả, trong khi đường read mô tả cũng đi qua builder. Phải giữ raw/caveats cùng request hoặc fallback thật sự đến được owner. Enrichment dữ liệu nếu có phải áp dụng cùng nguồn cho cả hai arm.
- Số học Revision1 là 34 attempt / 64 lượt, tối đa 316 generation. Reviewer kiểm đúng.

## Revision 2

Reviewer đã đọc toàn kế hoạch và commands, xác nhận **APPROVE PLAN**.

- W2 dùng allowlist field/schema, giữ nguồn gốc và caveats nguyên bytes trong cùng request sau projection. Không dùng parser hoặc enrichment riêng cho arm thử.
- W3 chọn pending-evidence extension hẹp. Giữ original source time/identity, bind target/episode, kiểm purchase authorization, current cart creation receipt, CAS và receipt. Giữ điều kiện thời gian cho negotiation event thường.
- Control hai đơn vị thành hành trình 3 lượt, yêu cầu activation witness. Nếu không đi qua đường đó ghi NOT_EXERCISED. Native 34 attempt / 66 lượt, tối đa 198 owner + 66 verifier + 24 judge = 288. Cùng replay 24 owner + 12 judge, trần chiến dịch 324 generation.
- Giới hạn còn lại là implementation W3 chưa được chứng minh, control N=1 chỉ xác nhận đường thực thi và W2 vẫn có nguyên văn quảng cáo ở nguồn.

Reviewer duyệt bản trước bổ sung compatibility với hash `28cae1c1aa2b62eb5e3fd9d7504bdc3b875301010746286b51a64856ae757743`. Bản cuối thêm yêu cầu đọc state cũ/default rỗng/revision-authority-readback; hash cuối và quyết định exact-byte được ghi tại [README](README.md).

Quyết định cuối sau bổ sung compatibility là APPROVE PLAN tại hash 278b840c03a9cb4a9b8882e613e9595ca4f174a8012716dae31a8e5103583882. Sau khi chỉ bỏ dòng trống thừa ở EOF, cùng reviewer xác minh và APPROVE bản cuối f200cf4dfe0c43e5a9c2befc25e0cd1a01caf7a2423af7f1c6e23d7ab050354a. Nội dung kế hoạch giữ nguyên qua lần chuẩn hóa đó.
