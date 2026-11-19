# Phase C — sàng lọc cách đưa thông tin chính lên trước

Ngày 19/11/2026. Bản triển khai `089dde39c6e5f363a645839de00985f8b5e5adb3`, đối chứng prompt `992e360f677bb3c391986ef201339b087e38606a`. [Kế hoạch bản 2 được review độc lập duyệt](../../c3-phase-c-chat-priority-plan-20261119.md) · [Tám cặp đầy đủ](REPLIES.md) · [Kết quả và accounting](RESULTS.json).

**STOP.** Đủ 8/8 cặp và 8/8 điểm chấm mù. Bản sửa đạt điểm giọng ở 6/6 input đích. So từng cặp đích, kết quả là 0 thắng, 1 thua, 5 hòa. Control S04 mất điều kiện đặt trước ở cả hai nhánh. Chưa thực hiện 4 ca/9 lượt native vì chưa qua đối chứng. Lỗi tư vấn size P07 vẫn mở.

## Thực hiện

- Thay riêng mục Giọng chat. Check byte xác nhận các mục trước và phần Báo giá sau đó giữ đúng bản đối chứng. Cập nhật hash và pin cả plan, wire, nguồn dùng để chấm, schema/rubric và mật độ mẫu.
- Đổi cách trình bày preview ở code. Tên mẫu, số lượng, giá dòng đứng trên. Thành phần và màu/size đứng trên dòng riêng. Áo bán lẻ vẫn ghi là áo của mẫu; khi thiếu tên đã bind dùng mã định danh. Kiểm cùng nguồn giá, thu trường checkout riêng tư, commit group, receipt và các consumer cũ. Đã thấy ba test ingress fail với format cũ và green với format mới. Kết quả checkout deterministic đạt riêng.
- Tạo registration eval cho 8 cặp và native 4 ca. Cả hai arm dùng cùng 8 wire đã thu, chỉ đổi system instructions. Duy trì tool declarations và chữ ký. Tool replay không thực thi. Native scope khóa ADS mở đầu bằng envelope của fixture `c-context-opening`; ảnh thực gửi phải được kiểm ở native. Các test ingress đã cover đường nhận metadata ADS và nhóm reply kèm ảnh.

## Đọc kết quả

| Ca | Quan sát |
| --- | --- |
| P06 | Cả hai bản vẫn để tổng cả ship trong ngoặc. Bản sửa chưa đưa 1.019.000đ lên thành câu chính. |
| S15 | Bản sửa vẫn mở bằng giá, đưa đặt trước vào ngoặc và hỏi cả size lẫn phối đồ. |
| S05 | Bỏ ngoặc quanh mã SQ675 nhưng vẫn nói mã và dồn tính từ. Việc chọn mẫu có căn cứ ở cả hai bản. |
| S08 | Bản sửa gọn hơn, giữ đúng Diệp An đặt trước. Judge chọn bản cũ do đưa thêm Odette có sẵn cho khách cần gấp. |
| J2/T2 | Chọn đúng M sau khi sửa số đo ở cả hai bản. Bản sửa đọc lại ba số đo trong ngoặc. |
| J4/T3 | Báo đúng 499.000đ cả ship, vẫn có ngoặc. Bản sửa vẫn lặp lời lên đơn. |
| S04 | Cả hai chỉ nêu màu trắng và be, thiếu trắng có sẵn và be đặt trước. Đây là lỗi trọng yếu của bản sửa dù đã có ở đối chứng. |
| ADS | Bản sửa dùng hai dòng giá cho cả bộ và áo lẻ. Giá và các size đúng nguồn. Judge chọn bản cũ vì giúp khách chọn bước mua tiếp. Replay chỉ có bằng chứng chữ. |

Số câu có ngoặc ở sáu ca đích là **4/6 ở cả hai nhánh**. Cả tám cặp là **5/8 → 4/8**. Dấu ngoặc là một dấu hiệu quan sát, giá trị bán hàng và dữ kiện quyết định là điều kiện của gate. Mỗi nhánh có một mẫu ở mỗi ca, chưa đo độ ổn định.

## Kiểm chứng và lệnh thực chạy

- **785 test worker** ở 11 file sales cycle, ingress, checkout, effects, state, quote, quote routing, read-only, sources, tools và size chart eligibility. **141 test Node** ở chat priority, diagnostic, sales-context screen, provider, native wire, protocol và Gemini inference.
- `pnpm --filter @lana/worker build`, `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit`, `pnpm --filter @lana/worker lint`, `pnpm check:dataset-boundary` và kiểm diff qua. Repo checks toàn bộ chưa chạy trong scope này.
- Stage `prepare` và `preflight` của `chat-priority-replay.mjs` khóa đúng head và hai capture roots. Đọc run đầy đủ 19/11 và ADS CONTROLS 15/11. Stage `owner` gọi qua `../c3-current-cart-choice-launch-20261119.py`, stage `judge` dùng Codex CLI 0.159.2. Source sạch trong suốt dispatch.
- **24 generation HTTP** gồm 16 Gemini 3.5 Flash Lite High và 8 GPT‑6.1 Sol High chấm mù. 0 provider error, 0 timeout, 0 retry, 0 native call. Không gửi khách thật.
