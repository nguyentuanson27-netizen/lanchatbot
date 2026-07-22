# Giai đoạn 2 — Sales runtime engines

Trạng thái: bốn engine đã được triển khai và kiểm thử ở lớp thư viện. Chưa chuyển realtime production sang đọc V2 và chưa deploy VPS.

## 1. ProductFactsV2 và Policy Engine

- `projectProductFactsV2` ghép nguồn ổn định với BOM, giá và tồn từ POS. API không nhận giá từ Sheets/Admin nên không tồn tại đường override.
- BOM được khóa theo từng offer POS: `DIRECT`, set hai món và `COMBO_3` có composition riêng; một sản phẩm có thể đồng thời có set hai món và combo ba món mà không làm mất thành phần.
- Mỗi bản ghi tồn kho mang đúng `offerKind` và `posOfferKey`, nên tồn set/combo/món lẻ không bị trộn khi tra cứu.
- Giá set, thành phần hoặc combo thiếu được giữ `null`; resolver trả `PRICE_MISSING` và không cho báo giá.
- Redis dùng ba projection độc lập:
  - stable: lưu 30 ngày;
  - BOM: lưu 30 ngày, chỉ được sử dụng trong 7 ngày;
  - giá/tồn: lưu 7 ngày, chỉ được sử dụng trong 48 giờ.
- Dữ liệu đã stale vẫn có thể tồn tại để audit nhưng không được trả cho khách.
- Ba projection được ghi vào generation bất biến trước, sau đó mới publish manifest bằng compare-and-set theo `observedAt`; reader chỉ ghép các phần cùng generation để tránh snapshot bị xé.
- Policy shop-wide đếm mỗi đơn vị sản phẩm cha là một sản phẩm; set/combo không bị đếm theo số thành phần.
- Policy chỉ tính giá từ bằng chứng POS có identity, version, thời điểm cập nhật và hạn dùng hợp lệ; caller không được truyền một con số giá rời.
- Khi đủ hai sản phẩm, giảm 5%. Trạng thái `HESITANT` thêm freeship; `CAUTIOUS` thêm freeship và giảm 20.000đ. Ưu đãi cuối vẫn cộng với giảm 5%.

## 2. Customer Profile và Size Engine

- Hồ sơ được merge theo từng measurement/preference/history field, có source, timestamp và confidence; update cũ không ghi đè update mới. Mỗi lần ghi yêu cầu `expectedRevision` để persistence thực hiện CAS và chặn hai cập nhật đồng thời ghi đè nhau.
- Size chart được lấy từ `image_registry`; nhận canonical `SIZE_CHART` và legacy `SIZE_GUIDE`, sau đó luôn ở `EXTRACTED_UNREVIEWED`.
- Chỉ chart `VERIFIED` được dùng. Scope brand/category/component của chart phải khớp sản phẩm; ưu tiên chart thành phần → category → global.
- Dữ liệu cơ thể ưu tiên số đo trực tiếp → chiều cao/cân nặng → lịch sử size.
- Kết quả gồm size chính, lựa chọn thay thế, confidence, lý do và dữ liệu còn thiếu. Thiếu hoặc mâu thuẫn thì hỏi thêm/handoff, không đoán.

## 3. Media Selector

- Taxonomy vận hành: `FULL_LOOK`, `AO`, `CHAN_VAY`, `QUAN`, `DETAIL_FABRIC`, `FEEDBACK`, `SIZE_GUIDE`.
- Exact product/component/purpose luôn đứng trước Qdrant similarity; ngưỡng similarity mặc định 0,82.
- Không lấy ảnh toàn set thay ảnh áo/chân váy/quần; feedback và size guide không dùng similarity để suy đoán.
- Tối đa ba ảnh. Nếu thiếu đúng loại, trả attachment rỗng, nói rõ chưa có ảnh, giải đáp bằng fact xác minh và dẫn sang bước chốt tiếp theo.

## 4. Analytics và replay

- Baseline dùng đúng ba tháng lịch, loại page test và outreach khỏi sales baseline.
- Outreach/upsale vẫn có cohort riêng: sent, read, response, positive, opt-out và conversion.
- Chỉ observation Pancake `DA_CHOT_DON` với `verified=true` tạo conversion.
- Input analytics chỉ nhận định danh băm và transcript đã ẩn danh; trường PII thô bị từ chối.
- Golden suite có các ca báo giá tươi/thiếu/cũ, size, thiếu ảnh, handoff, ưu đãi cộng dồn và conversion; evaluator chạy từ facts/evidence có cấu trúc và replay nhiều lần để phát hiện kết quả không deterministic.

## Điểm tích hợp tiếp theo

1. Adapter PostgreSQL/Redis đưa dữ liệu thật vào các engine mới.
2. Realtime orchestration gọi ProductFacts → Size/Media/Policy theo intent.
3. Shadow compare V1/V2 trên page test trước khi cho V2 tạo Meta Outbox.
4. Admin UI duyệt size chart/policy và xem analytics baseline.
