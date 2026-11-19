# Phase C — kết quả A/B về ưu tiên dữ kiện

**STOP tại A/B.** Đã chạy đủ 9/9 cặp. Bản sửa thắng 2/6 cặp trọng tâm, đều ở S04. Gate yêu cầu thắng ít nhất 4/6 và có một lượt thắng ở mỗi ca P06, S04, S15. Dữ kiện quyết định đạt 6/6, đối chứng đạt 3/3, không ghi nhận lỗi trọng yếu ở bản sửa theo lượt chấm mù. Native 6 ca/10 lượt dừng theo gate đã chốt.

[Cả 18 bản nháp và lý do chấm](MODEL_REPLIES.md) · [Kết quả, hash và accounting](MODEL_RESULTS.json) · [Triển khai](IMPLEMENTATION.md) · [Kế hoạch đã duyệt](../../c3-phase-c-owner-reply-evidence-plan-20261119.md)

| Ca | Kết quả chấm mù | Review sau khi chạy xong |
| --- | --- | --- |
| P06 ×2 | Hòa 2 | Cả hai bản đều báo tổng 1.019.000đ gồm ship. Hai câu bản sửa vẫn mở bằng giá bộ 989.000đ, một câu đặt tổng trong ngoặc. Đổi vị trí dữ kiện trong request chưa chuyển thứ tự ưu tiên trong câu nói. |
| S04 ×2 | Bản sửa thắng 2 | Hai câu đối chứng chỉ nêu trắng và be. Hai câu bản sửa nói rõ trắng có sẵn, be đặt trước, thêm phạm vi S–XL. Trạng thái mua theo màu giúp khách quyết định và tạo khác biệt rõ nhất. |
| S15 ×2 | Hòa 2 | Cả hai bản đều giữ 499.000đ và be đặt trước. Hai câu bản sửa vẫn dẫn bằng giá rồi mời tư vấn size. Một câu nhắc thêm chất liệu và phom dù khách vừa nói thích màu be. Lần này chưa thấy bước mua có ích hơn. |
| J2/T2 | Hòa | Cả hai dùng kết quả size M sau khi khách sửa số đo. Bản sửa nhắc lại 51 kg, còn câu đối chứng ngắn hơn. Hai arm dùng cùng request. |
| J4/T3 | Hòa | Cả hai báo đúng tổng 499.000đ và mức hỗ trợ 30.000đ theo báo giá. Bản sửa đưa tổng ngay câu đầu. Cả hai đều hỏi chọn màu và dùng cụm “để em lên đơn”. Replay chưa chứng minh bước lên đơn hay trạng thái sau đó. |
| ADS | Hòa | Hai câu giữ giá trọn bộ, giá áo lẻ và các size sẵn theo nguồn. Bản sửa hỏi chọn bộ hay áo lẻ. Capture này không có chất liệu/phom đã xác minh để chấm. Chưa đo ảnh thực trong native. |

Hiệu quả quan sát được tập trung ở S04, nơi bản đối chứng thiếu điều kiện mua theo màu. P06 và S15 đều có đủ dữ kiện chính ngay ở đối chứng lần này. Việc gửi dữ kiện ở đầu request chưa đủ để làm câu nói vào thẳng trọng tâm. P07 và qualification Phase C còn mở.

## Source và accounting

- Code đã review `8cfba71f258e36e3120cd496c5ca949fd0a1f3b7`. HEAD sạch lúc chạy `651021c3cabf1a2f83f6317429454ac98781f5b0`, khác commit review ở tài liệu. Đã kiểm tree executable và kế hoạch bằng Git trước mỗi lượt.
- Dùng đúng 9 cặp đã khóa, registration hash `4ac0ba84a775cb5a20f793389cf6665f59cf667ac92767d1ed6d791718ef7f55`. Cả hai arm dùng Gemini 3.5 Flash Lite High, cùng prompt và config. Judge GPT-6.1 Sol High nhận hai bản nháp đảo thứ tự cùng dữ kiện chấm, qua Codex CLI 0.159.2. Hash executable runner, judge prompt và schema nằm trong kết quả. Wires, seed và gói chấm đầy đủ giữ local.
- 27 generation HTTP gồm 18 owner và 9 judge. Có 1 lượt OAuth riêng. 0 lỗi provider, 0 timeout, 0 retry. Toàn bộ mẫu số giữ nguyên. 0 native generation, tool replay, effect và tin gửi khách.
- Owner p50/p95 2,234/3,086 giây, 245.246 input và 8.150 output tokens. Judge p50/p95 9,918/18,980 giây, 46.774 input và 2.631 output tokens. Provider chưa trả cost. Đây là thời gian request trong replay, chưa đo độ trễ hội thoại native.

## Lệnh đã chạy

```powershell
$env:APPDATA=(Resolve-Path ../c3-verifier-replay-cli-01592).Path
node '../c3-owner-reply-evidence-model-20261119062841445/dispatch.mjs' preflight '../c3-owner-reply-evidence-model-20261119062841445' '../c3-owner-reply-evidence-8cfba71f-20261119060931093'
python ../c3-current-cart-choice-launch-20261119.py node '../c3-owner-reply-evidence-model-20261119062841445/dispatch.mjs' owner '../c3-owner-reply-evidence-model-20261119062841445' '../c3-owner-reply-evidence-8cfba71f-20261119060931093'
node '../c3-owner-reply-evidence-model-20261119062841445/dispatch.mjs' judge '../c3-owner-reply-evidence-model-20261119062841445' '../c3-owner-reply-evidence-8cfba71f-20261119060931093'
```

Preflight, owner và judge đều thoát mã 0. Verdict chất lượng của lượt chấm là STOP.
