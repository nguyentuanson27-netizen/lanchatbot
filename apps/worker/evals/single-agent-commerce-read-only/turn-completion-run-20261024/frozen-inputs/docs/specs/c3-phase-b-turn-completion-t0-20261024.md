# T0 — audit tìm/đọc trước turn-completion run

Trạng thái: **T2_NO_INTERVENTION**, cả `b1-changed-occasion` và `sales-discovery-advice:need`. Audit offline, không gọi provider. Base run `af482367`; implementation handoff savepoint `28ccc67d`. Không thay budget, search/read projection, provider API hoặc tool instructions để cứu hai ca này.

## Evidence

| Ca/run | Kết quả quan sát | Ý nghĩa |
|---|---|---|
| changed-occasion, media-size-acceptance | search hai lần ra cùng V406/V168/V039; sau đó đòi read khi final-only | Mô tả đã có trong tool results và actual request; không có bằng chứng bị projection làm mất |
| discovery, media-size-acceptance | search→read SQ748/SQ2447→đòi search nữa khi final-only | Cần phân biệt việc còn muốn tìm thêm với lỗi không truyền kết quả đã đọc |
| changed-occasion, full-phase-b | Sinh reply và verifier PASS | Completion từng xảy ra trong budget; lời so sánh chống nhăn vẫn phải review riêng, không dùng PASS cũ làm chứng minh nghĩa đó đúng |
| discovery, full-phase-b | Final draft rồi verifier FAIL về lời bảo đảm không bó bụng | Thoát tool loop chưa đồng nghĩa tư vấn thành công |
| discovery, execution-media-run | Final draft rồi verifier FAIL | Không đủ căn cứ nhận FINAL_REPLY instruction đã sửa được khả năng hoàn tất ổn định |
| search-read-v2/v3, media-size/full | Hoàn tất tìm theo tên/mã và báo giá | Controls kiểm truyền dữ liệu; không tương đương nhiệm vụ khám phá/chọn mẫu |

`b1-changed-occasion` không có native attempt trong execution-media-run; giữ NOT_PRESENT. Các run có source/prompt khác nhau và dữ liệu live, nên không quy mọi biến động cho một thay đổi.

## Quyết định trước run

Không xác định được defect producer→projection→consumer cụ thể để sửa T2 trong phạm vi này. Ghi giới hạn quan sát của model/budget thay vì viết thêm lệnh cấm tìm/đọc. Trong run mới, complete chỉ ghi OBSERVED_COMPLETE, không đóng root cause hoặc tuyên bố đã fix. Không complete thì giữ OBSERVED_INCOMPLETE và gate full theo plan.

Raw offline audit được lưu cùng evidence campaign, gồm attempt hashes, tool results, actual owner-wire descriptions và nguồn file. Không đưa case/rubric/nhận xét này vào model requests. T1/T3 là các can thiệp riêng, không dùng handoff có lời báo để nâng kết quả tư vấn của T2.
