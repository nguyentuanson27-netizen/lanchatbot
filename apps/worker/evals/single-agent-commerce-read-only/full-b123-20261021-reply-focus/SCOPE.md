# Full B1/B2/B3 — current reply-focus correction

Owner yêu cầu “chạy model đi” sau bản sửa26e36330. Chạy24B1 và8stateful, mỗi ca một lần, không dừng vì chất lượng giữa chừng; giữ lỗi và dependent blocks, không retry/thay mẫu. Thực hiện provider/source preflight và hai nhánh PostgreSQL COD/BANK disposable hiện có. Tối đa124 generation requests.

Giữ current owner prompt và code tính chênh lệch giá của26e36330; verifier/model/corpus/policy source routes không đổi. Không chọn thêm ví dụ hoặc thay instructions trong lúc chạy. Nguồn read-only, state/effects chỉ trong test DB, delivery capture-only. Không live send/deploy/promotion.

Focused88PASS/1optionalSKIP và worker buildPASS đã chạy trên26e36330; không chạy lại trên source không đổi. Seal registration và cleanHEAD trước preflight; runtime ghi sourceSHA ra output, không ghi ngược vào source.

Đọc toàn bộ actual terminal với history và public committed state, khóa primary trước khi xem rejected draft/verdict. USABLE cho phép polish nhỏ; phân biệt chất lượng tư vấn, capability và source/provider error. Không chấm keyword/câu mẫu hoặc ép áo lẻ; lời khuyên chất liệu thông thường và upsell hợp lý được phép. Raw cũ/primary cũ bất biến. Một mẫu/ca chưa chứng minh ổn định.
