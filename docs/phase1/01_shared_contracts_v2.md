# Giai đoạn 1 — Shared sales contracts

Trạng thái: contract đã khóa ở mức schema; chưa nối runtime, database, Admin UI hoặc production.

## Nguyên tắc

- Contract mới được thêm theo hướng additive. `ProductFactsV1` và các contract runtime hiện tại vẫn tồn tại trong thời gian chuyển đổi.
- Model không được tạo giá, tồn, size, ETA, phí ship, ưu đãi hoặc quyết định conversion.
- Mọi object quan trọng dùng `schemaVersion`, ID/version và provenance có cấu trúc.
- Object analytics không chứa tên, điện thoại, địa chỉ hoặc Meta sender ID thô.

## Contract đã khóa

| Contract | Trách nhiệm chính |
|---|---|
| `ProductFactsV2` | Sản phẩm cha, content XML, BOM, giá, tồn theo biến thể, selling rules, fulfillment, size-chart link và media |
| `PolicyBundleV1` | Nguồn nghiệp vụ, ship, ưu đãi nhiều sản phẩm, nhượng bộ và ba trạng thái closing |
| `CustomerProfileV1` | Hồ sơ giả danh, số đo có provenance, sở thích và lịch sử size |
| `SizeChartV1` | Kết quả trích xuất size chart từ ảnh/import, trạng thái duyệt và các dải số đo |
| `SizeRecommendationV1` | Kết quả size deterministic; cấm trả size khi chart chưa `VERIFIED` |
| `CartV1` | Set/món lẻ/combo ba món, lựa chọn từng thành phần, giá POS và adjustment có authorization |
| `HandoffDecisionV2` | Nguyên nhân, cách nhắn khách, tag đích và bằng chứng quyết định |
| `MediaSelectionV2` | Chọn tối đa bốn ảnh theo thành phần và mục đích |
| `SalesEpisodeV1` | Một phiên bán hàng đã ẩn danh và attribution |
| `FunnelEventV1` | Các mốc hỏi giá → tư vấn size → xác nhận mua → conversion |

## Nguồn và độ mới

| Nhóm | Authority | Hiệu lực |
|---|---|---:|
| Registry/selling rules | Google Sheets product registry | Đến khi có version mới |
| Tên, mô tả, link | Webstore XML | Đến khi có version mới |
| BOM | Pancake POS | 7 ngày |
| Giá | Pancake POS | 48 giờ |
| Tồn theo màu/size/thành phần | Pancake POS | 48 giờ |
| Fulfillment/ETA | Google Sheets policy | `ETA_VALID_UNTIL`, nếu thiếu dùng 7 ngày |
| Media đã duyệt | Qdrant | 30 ngày |
| Size chart/policy | Bản đã duyệt | Đến khi có version mới |

Giá thiếu phải là `null`; cart không được tính tổng hoặc chuyển sang xác nhận. Google Sheets và Admin không có quyền override giá POS.

## Giá và cấu trúc sản phẩm

- `setPrice`: giá set/offer chính.
- `componentPrices`: một slot cho từng thành phần BOM; thiếu giá vẫn phải giữ slot với `price: null`.
- `comboThreePiecePrice`: chỉ hợp lệ với BOM ba thành phần và offer `COMBO_3`.
- `allowMixedSizes`: cho phép các thành phần cùng set dùng size khác nhau.
- `allowComponentSale`: cho phép bán riêng thành phần.
- Giá bán không được lớn hơn giá niêm yết khi cả hai cùng tồn tại.

## Size chart từ ảnh

1. Ảnh được trích xuất thành `SizeChartV1` với trạng thái `EXTRACTED_UNREVIEWED`.
2. Người quản trị duyệt nội dung, nguồn ảnh, SHA-256 và quy tắc biên size.
3. Chỉ chart `VERIFIED` mới được liên kết vào `ProductFactsV2`.
4. `SizeRecommendationV1` không được chứa size đề xuất/candidate nếu thiếu chart đã xác minh.
5. Trường hợp thiếu số đo, ngoài dải hoặc nằm ở biên được biểu diễn bằng status/reason; model không tự suy đoán.

## Chính sách shop-wide hiện hành

- Ship mặc định: `30.000đ`.
- Từ hai sản phẩm: giảm `5%` (`500` basis points).
- Nhượng bộ lần hai: freeship.
- Nhượng bộ cuối: giảm `20.000đ` và freeship.
- Closing hỗ trợ `READY`, `HESITANT`, `CAUTIOUS`.
- Chỉ policy engine deterministic được chọn ưu đãi; model không được tạo offer ngoài bundle.
- Mỗi adjustment trong cart phải mang `policyAuthorization` để audit.

## Handoff

- Hậu mãi: đúng một câu giữ chân, sau đó handoff và yêu cầu tag `VAN_DON`.
- Mọi handoff khác: không gửi tin cho khách và yêu cầu tag `NHAN_VIEN`.
- Hậu mãi có reason chi tiết như vận đơn, giao chậm, đổi thông tin, hủy, thanh toán, đổi/trả, hoàn tiền, lỗi và bảo hành.

## Funnel và conversion

- `PRICE_ASKED`, `SIZE_CONSULTED` và `PURCHASE_CONFIRMED` là tín hiệu funnel, chưa phải doanh thu.
- `SALE_CONVERTED` chỉ hợp lệ khi có observation Pancake `DA_CHOT_DON`, `verified: true`.
- Cart `CONFIRMED` chỉ thể hiện khách đã xác nhận ý định mua; không tự làm episode thành `CONVERTED`.

## Bước tiếp theo

1. Adapter từ POS snapshot/XML/Sheets/Qdrant sang `ProductFactsV2`.
2. Pipeline trích xuất và duyệt ảnh size chart.
3. Store/versioning cho policy, profile, cart, episode và event.
4. Shadow compare V1/V2 trước khi runtime đọc V2.
