# Phase C — chạy đủ 34 ca trên PR #392, ngày 19/11/2026

**34/34 ca, 55/55 lượt**, mỗi ca chạy một lần trên source `992e360f677bb3c391986ef201339b087e38606a`. Owner Gemini 3.5 Flash Lite High, verifier GPT-6.1 Sol High qua Codex CLI 0.159.2. Cả hai có giới hạn wire 70.000 byte. Source, prompts và model giữ nguyên trong lượt chạy. [Lịch sử 55 lượt](CONVERSATIONS.md) · [Review từng ca](CASE_REVIEW.json) · [Trace ba ca chưa đạt](FAILURE_TRACES.json) · [Cấu hình và lệnh](PROVENANCE.json).

**Kết luận review toàn hội thoại: 26 ca đáp ứng việc khách cần, 5 ca bàn giao đúng quy tắc, 3 ca chưa đạt. Phase C vẫn STOP.** Một ca đã cho qua tư vấn size ngoài kết quả engine. Mỗi ca có một mẫu, review do coding agent thực hiện. Qualification theo N=5, chấm mù độc lập và so sánh C3 A/B vẫn chưa được đo trong lần này.

| Nhóm | Ca / lượt | Draft verifier PASS được gửi | Báo giá code từ proof | Tin checkout do code tạo | Handoff | Không gửi | Generation HTTP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| R1 | 4 / 7 | 7 | 0 | 0 | 0 | 0 | 21 |
| R2 | 9 / 17 | 13 | 0 | 2 | 2 | 0 | 44 |
| Remainder | 20 / 24 | 18 | 1 | 0 | 3 | 2 | 60 |
| Checkout | 1 / 7 | 1 | 0 | 5 | 1 | 0 | 5 |
| **Tổng** | **34 / 55** | **39** | **1** | **7** | **6** | **2** | **130** |

Handoff im lặng 6/55 (10,9%). Một bàn giao là bước cuối sau xác nhận checkout. Hai lượt không gửi là J5 sau khi quyền xử lý đã chuyển sang HUMAN.

## Ba ca chưa đạt

| Ca | Những gì khách nhận | Vấn đề |
| --- | --- | --- |
| **P07 — size từng món** | “quần đề xuất size M nhưng chị hay lấy size L thì mình có thể chọn size L theo thói quen của mình nha.” | Tool trả M cho quần và danh sách size thay thế rỗng. Khách có thể muốn chọn L, nhưng câu này đưa L thành phương án tư vấn khi chưa có căn cứ. Verifier PASS và câu vào Outbox test. |
| **S11 — tồn hai bộ màu be size L** | “cả Set quần … và Set váy … đều còn sẵn size L” rồi hỏi chọn set nào. | Hỏi phân biệt set là hợp lý. Tồn chung size L có bằng chứng. Dòng tồn hai set không gắn màu, nên câu trả lời chưa xác nhận được hai bộ be như khách hỏi và dễ tạo cách hiểu đó. |
| **J3 — mua áo phối quần nâu** | Báo giá tĩnh 529.000đ cả ship ở lượt đầu. Lượt sau có lời phối chân váy, lượt cuối hỏi size áo. | Verifier chặn đúng draft ngụ ý màu be có sẵn. Code lấy proof báo tổng và gửi báo giá riêng. Tin thực tế mất phần khách đang cần để quyết định mua áo phối quần nâu. |

Hai verdict FAIL là **S03** và **J3/T1**. S03 chuyển giao vì ảnh mặt trước chưa có xác nhận chụp cận ren. Ở J3/T1, record giữ draft bị chặn và tin code mang `VERIFIED_QUOTE_REPLY` riêng. Audit đối chiếu literal quote 529.000đ, nguồn hiện hành, người nhận, trạng thái chưa có giỏ và hash Outbox. Tin code này được tính một lần trong 47 tin khách có thể nhận.

S16 cũng bàn giao im lặng. Owner dừng trước verifier khi nguồn ảnh thiếu chứng cứ là ảnh khách mặc. Đây là hành vi đúng theo quy tắc nguồn thiếu. Nhu cầu xem ảnh feedback vẫn cần nguồn bổ sung.

## Đối chiếu full 09/11 và giọng tư vấn

- Lượt full trước có 39/55 lượt có tin, 13 handoff, 3 không gửi. Lượt này có **47/55 lượt có tin, 6 handoff, 2 không gửi**. Số ca đáp ứng việc khách cần tăng **22 → 26**, số chưa đạt giảm **7 → 3** theo review toàn hội thoại. Hai lượt dùng source và snapshot khác nhau, mỗi ca lấy một mẫu.
- **P06, S04, S09, S15, J2 và J4** phục vụ được khách trong lượt này. J2 nhận số đo sửa và dùng preference mặc thoải mái. J4 đi hết hành trình, giữ tổng **499.000đ cả ship**. J4 cuối vẫn gọi RECORD thừa một lần và bị code từ chối trước khi trả báo giá đúng. J1 giữ đủ hai áo M/L và báo **978.100đ**. Checkout hoàn thành đủ bảy lượt.
- **Giọng vẫn chưa ổn định.** J2/P04/S07 đọc lại số đo khi khách chỉ cần biết size. S05/S06 dùng nhiều tính từ và mô tả dài. J4 lặp “để em lên đơn luôn nhé ạ”. P08 và P09 có các cụm “em đổi sang”, “em lưu” dễ gợi thao tác đã hoặc sẽ xảy ra. S04 trả lời gọn và nói rõ trắng có sẵn, be đặt trước. Hai câu P01/S02 nêu màu và size sát nhau, dễ làm khách hiểu be có sẵn. Đây cũng là điểm cần quan sát khi so với draft J3 bị chặn.

## Tổng lượt gọi và kiểm chứng

- **130 generation HTTP** gồm 89 owner và 41 verifier, có kết quả cho cả 130. Lỗi provider, timeout, runtime owner recovery và evaluator retry đều 0. Ngoài generation có 4 owner OAuth, 2 embedding và 1 embedding OAuth.
- Verifier p50/p95 provider **6,12/11,67 giây**. Đo trong luồng thực thi, bước xác minh p50/p95 **8,88/15,20 giây**. Provider ghi nhận **1.468.826 token input / 92.743 token output**. Chi phí không được provider trả về. [Metrics](METRICS.json).
- Chọn sẵn repetition 1 của cả 34 ca qua `--phase-c-slot-ids` trước dispatch. Registration chuẩn vẫn chứa 5 lần lặp. 136 slot còn lại nằm ngoài lượt chạy này. Trần của 34 slot được chọn là 220 generation. Các guard về nguồn, privacy và accounting vẫn áp dụng.
- Chụp nguồn hiện hành của 107 sản phẩm và dùng lại proof ảnh test đã duyệt. Bốn DB model và một DB dựng trạng thái đầu đều đã dọn. Outbox test thu 47 tin, phát tin live 0, ghi nguồn shop 0.
- Capture, initial, bốn preflight và bốn dispatch hoàn tất. 26 test Node tập trung qua. Audit kiểm hash của request/turn, evaluator firewall, các dữ liệu checkout giả lập đã chọn, cap từng lượt và Outbox. 39 draft khớp exact với tin được nhận. Một tin báo giá code khớp proof riêng. Audit không có lỗi đối chiếu sau khi xử lý đúng các ca SINGLE và nhánh báo giá từ proof. Hai bản audit đầu được giữ cục bộ, không phát sinh lượt model. Lệnh và hashes được ghi trong [provenance](PROVENANCE.json).
- Bản lịch sử công bố ẩn dữ liệu checkout giả lập và bỏ khoảng trắng cuối dòng Markdown. Audit dùng bytes nguyên bản. Dataset boundary guard và kiểm tra 34 mục/55 lượt của gói công bố đều qua.
