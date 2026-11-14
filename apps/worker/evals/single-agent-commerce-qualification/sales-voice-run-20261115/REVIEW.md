# Phase C · Thử giọng tư vấn và cách trình bày tình trạng bán · 15/11/2026

**STOP ở bước sàng lọc.** Đề xuất dùng prompt gốc cho lần đo tiếp theo. Bản thử giọng vẫn có trên nhánh PR để giữ nguồn đã đo. Cách trình bày trạng thái mới chưa được chấp nhận. Vòng native 25 hành trình / 45 lượt và qualification Phase C chưa chạy. [Kế hoạch §23](../../../../../docs/specs/c3-phase-c-convergence-fix-plan-20261110.md#23-kế-hoạch-cải-thiện-giọng-tư-vấn-và-kiểm-riêng-dữ-kiện-mua-hàng).

[Lịch sử từng cặp thử giọng](VOICE.md) · [Lịch sử từng cặp thử dữ kiện đặt trước](OFFERS.md) · [Điểm và số liệu theo request](RESULTS.json).

## 34 cặp thử giọng

Các cột ghi đối chứng → bản sửa. Thắng ròng loại trừ ưu thế do một bên không sinh được câu trả lời.

| Lượt đích | Giọng và tư vấn | Đủ dữ kiện | Thắng ròng của bản sửa |
| --- | ---: | ---: | ---: |
| S15 · Khách thích áo be | 4/5 → 4/5 | 5/5 → 5/5 | +1 |
| J2 · Khách sửa số đo | 3/5 → 1/5 | 5/5 → 5/5 | −2 |
| J2 · Khách muốn mặc thoải mái | 4/5 → 5/5 | 1/5 → 4/5 | +2 |
| J4 · Khách xin hỗ trợ giá cho một áo | 3/5 → 4/5 | 0/5 → 3/5 | +2 |
| J4 · Khách hỏi tổng | 5/5 → 5/5 | 5/5 → 5/5 | −1 |
| S08 · Khách nhờ chọn váy đi lễ | 3/5 → 2/5 | 3/5 → 3/5 | −1 |

Cả bốn đối chứng giữ hành vi yêu cầu. J2 sửa số đo và S08 dưới ngưỡng giọng 4/5. Có ba lượt đích thua ròng. J2 ở lượt hỏi mặc thoải mái vẫn có một bản sửa hứa size M sẽ mặc thoải mái khi dữ liệu chỉ đủ để chọn M. Mẫu đó đạt về cách nói và trượt về dữ kiện.

- **J2 sửa số đo.** Bản sửa đọc lại cân nặng và cả ba vòng ở bốn mẫu bị chấm chưa đạt, dù kết luận size M đúng 5/5. Sự khác biệt quan sát được nằm ở cách dùng dữ kiện để trả lời. [Lần 2](VOICE.md#c-20261028-j21--lần-2).
- **J4 xin hỗ trợ giá.** Bản sửa có thêm câu giải thích shop cần màu để xem hỗ trợ cho đúng áo, song vẫn thiếu thông tin cần thiết ở 2/5. J4 hỏi tổng giữ đúng giá 529.000đ cả 5/5 ở hai bản. Năm mẫu hỏi tổng dùng đầu vào của lần chạy gốc thứ nhất vì lượt tương ứng của lần chạy gốc thứ năm kết thúc handoff trước khi có request cuối, theo phương án đã khóa. Năm mẫu này chỉ đo độ dao động khi sinh lại trên cùng một đầu vào.
- **S15 và S08.** S15 vẫn có câu kể dài về chất liệu và tính từ sau khi khách đã nói thích áo. S08 có câu đưa lại lựa chọn cho khách sau khi khách đã nhờ shop chọn, hoặc nói Odette rất kín đáo khi dữ liệu chưa xác nhận. [S15 lần 2](VOICE.md#c-20261028-s150--lần-2) · [S08 lần 5](VOICE.md#c-20261028-s080--lần-5).

## 9 cặp thử cách trình bày tình trạng bán

Cả hai bản dùng prompt gốc theo §23.3. Bản thử đặt trạng thái đã xác minh cạnh tên và giá của đúng lựa chọn. **STOP** vì S08 đủ thông tin đặt trước ở **3/5** lần bản thử, so với **4/5** ở đối chứng và ngưỡng **5/5**. Cả hai đạt giọng **3/5**. Bản thử đạt **4/4** đối chứng, gồm ca phải phân biệt hàng sẵn và đặt trước theo biến thể.

- S08 lần 2 chọn Odette và nói váy “rất kín đáo” khi nguồn chưa xác nhận. Lần 3 chọn Diệp An nhưng bỏ trạng thái đặt trước rồi hỏi lại khách thích mẫu nào. Lần 4 nhắc đúng đặt trước nhưng cũng hỏi khách chọn lại. [Câu gốc và nhận xét](OFFERS.md).
- Dữ kiện đặt trước đã có trong request. Việc đặt cạnh tên và giá chưa giúp model dùng đều trong mẫu này. Ca về tình trạng theo biến thể cho thấy cách trình bày có ích ở một đầu vào. Hiệu quả tổng thể chưa đủ để mở vòng native.

## Nguồn chạy và accounting

- Code chạy từ `3357270ac1b52121892dac1e3fb674cf5da2c7ca`, lấy đầu vào đã lưu từ `5dfde94b11a2b55ca7a52846b241bb440ee68994`. Seal đăng ký VOICE `71b91dac78362a38047a8e18760559e04e3250d895829b675589b9ea828ec25e`. Seal OFFERS `99f7001dd154245c12292fb1b41a39584d64dea58513657bf0e6ab5df05627c3`.
- Owner Gemini 3.5 Flash Lite High qua Vertex AI. Mỗi mẫu một candidate, `text/plain`, trần 8.192 token output, `includeThoughts=false`, giữ chế độ tool của request đã lưu. Prompt gốc SHA-256 `adc16558b65b3c60128605dbe762b0116c3cdc8efc3dd5ee4b4fa5266831af78` và prompt thử giọng `00ba3e2ef0876013ee2a1ad3e18b3db96b7849ae88355497e552b7071bc497d8`.
- Judge mù GPT-6.1 Sol High. Rubric khóa trước run, dùng ví dụ Phase B để hiệu chỉnh, hai câu mỗi cặp được tráo thứ tự. Judge rubric SHA-256 `4b4dc9b96e1108a8cb43aaf423514e2282d165ef8be8ceaa89378e5553a2ad39`, schema `2fc1541d09752ded5f75ab9886dae83149a58069463faecb300e3ea289051ee9`, script `03e13f28db8833ac4494ff3253a182480bc3f429a8147dd8d40404a793ff5b78`.
- Thực hiện `sales-voice-replay.mjs prepare`, `dispatch`, `judge-packet` và `score` cùng hai lần chạy script judge offline. `dispatch` kiểm seal và worktree sạch tại đúng commit trước khi gửi request. Đối chiếu đủ 86 file started, 86 result, hash request theo registration, đúng một generation mỗi arm và `assertReplayWire` trên toàn bộ request owner. Case ID và các trường chấm được kiểm trước khi gửi và rubric chỉ có ở judge. Wires thô và thông tin đăng nhập giữ ngoài repo.
- **129 request sinh** gồm 86 owner và 43 judge, không retry. VOICE có 67/68 câu owner, một HTTP 429 ở đối chứng lần 2 của J2 hỏi mặc thoải mái vẫn tính trong mẫu số. OFFERS có 18/18 câu. Có điểm cho cả 43 cặp. Hai request lấy token Vertex được ghi riêng ngoài số generation. Không chạy verifier native, tool hoặc ghi state từ các mẫu replay. Không gửi tin cho khách.
- Token do provider ghi, owner input/output VOICE **875.169 / 58.229**, OFFERS **221.683 / 25.453**; judge VOICE **191.259 / 12.682**, OFFERS **61.180 / 3.659**. Owner p50/p95 VOICE **3,23 / 6,86 giây**, OFFERS **4,49 / 7,46 giây**. Lượt 429 không báo usage. Không có số đo chi phí hoặc độ trễ toàn hành trình native.

Các câu được chấm là đầu ra sinh lại từ request đã lưu. Những lỗi được quan sát ở bản nháp chưa được đưa qua verifier hoặc final gate. Kết quả dùng để quyết định sàng lọc trên mẫu này.
