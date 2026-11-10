# Phase C — sửa đường báo giá, continuation và lựa chọn, 07/11/2026

Implementation base `5c623a2039aaee07b67f02a5d1797078da4c43ac`. Owner yêu cầu sửa sau review full34ca/55lượt. Scope code/test trên branch hiện tại; không chạy model, merge/deploy/live send trong bước sửa này.

## Công việc

1. **Quote batch V2:** báo giá là tác vụ đọc đã có, được dùng cùng các lệnh đọc độc lập (`read_product`, `read_policy`, `select_product_media`, `view_product_media`). Tối đa hai quote khác target/lượt, hai đơn vị cho mỗi quote và một đơn vị cho mỗi lệnh đọc khác; giữ tổng6/2rounds/3owner. Từ chối batch chứa mutation/handoff hoặc quote lặp trước I/O. Thực thi nguyên call và trả đúng ID/thứ tự, không cắt call, retry, repair hay giải nghĩa câu khách. Mỗi total proof giữ riêng target/source và readback; không gộp giá/tồn theo component hay tên. Dữ liệu thiếu/authority đổi vẫn fail-closed.
2. **Continuation:** giữ raw tool results và signed native model parts. Ngoài tham chiếu exact current evidence đã có, chỉ rút `selectionOptions` nếu bằng đúng kết quả mở rộng của `selectionEvidence` trong cùng result đã validate. Dùng marker có decoder roundtrip; historical/different/partial dữ liệu không được mất. Không tăng request cap, không bỏ fields nguồn hoặc rewrite signed content. Đo actual p04 reconstruction cùng các B controls, ghi rõ không phải historical failed body đã capture.
3. **Món dùng chung:** diễn giải nhóm read targets như một món có nhiều đường đọc theo nguồn, không bắt khách phân biệt parent khi cùng component đã xác nhận. Owner chọn một đường đọc rồi lấy giá/tồn từ đúng đường đó, không gộp hoặc tự suy chart.
4. **Phạm vi hành động:** làm rõ trả lời câu hỏi phân biệt sản phẩm chỉ xác định món khách hỏi; chưa cấp quyền thêm giỏ. Chỉ thêm khi khách yêu cầu mua. Khi tư vấn size, thói quen mặc không cấp size ngoài kết quả code. Sửa chỉ dẫn chung và regression hội thoại khác từ frozen corpus; không regex/parser, không ví dụ riêng để fit benchmark và không tuyên bố code chứng minh được ý định ngôn ngữ.

## Acceptance

- RED quan sát trước, GREEN sau: mixed read-only quote batch; full6/over6; two separate proof targets; duplicate/mutation reject trướcI/O; receipt/permission/freshness/no-retry controls.
- Exact expansion của current/local selection options, retain mismatches, không sửa input; read/quote wire với signed content giữ nguyên, full native tools và limits±1.
- Reconstruct p04 ở source clock bằng source/results đã capture; không replay mutation. p09/s15/returning quote, component fit, replacement, media, private checkout regression.
- Focused worker/eval và worker typecheck/build/lint; realPG nếu runtime persistence boundary bị chạm. Không claim provider behavior hay sales-quality PASS từ mocked tests.
- Self-review → cùng reviewer độc lập → sửa material findings tới scoped approval. Existing campaign status/denominator bất biến; s03 source-specific detail và quota429 vẫn ghi unresolved.

Google API reference checked before adapter work: [GenerateContent function declarations](https://ai.google.dev/api/generate-content?hl=en). Không thêm API hoặc model mới.
