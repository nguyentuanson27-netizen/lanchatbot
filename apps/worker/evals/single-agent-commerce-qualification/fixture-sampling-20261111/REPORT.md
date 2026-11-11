# Đo lặp trên fixture sau ba bản sửa contract — 11/11/2026

**Đây là số đo development trên dữ liệu fixture tổng hợp trong repo, không phải snapshot shop, không phải journey Phase C và không phải bằng chứng qualification.** Môi trường thực hiện không có `WORLD.json` (107 sản phẩm) nên không chạy được bộ 13 ca của PR 392.

Owner và verifier đều là Vertex `gemini-3.5-flash-lite`, thinking HIGH, retry 0. Mỗi lượt đi qua code runtime thật: `runCommerceTurn`, tool đọc/giỏ/báo giá, request builder, verifier và final gate. Kho giỏ là bộ nhớ trong; không có PostgreSQL, không gửi tin.

Thế giới thử: một sản phẩm `SM613`, giá 499.000đ, hai màu × bốn size (8 tuple); màu trắng còn hàng, màu be là hàng đặt trước. Bề mặt tool gồm 7 tool (đọc, giỏ, báo giá); không có handoff, ảnh hay hồ sơ khách.

## Kết quả, 10 lần mỗi kịch bản

Trước = `43a0896e` (head PR 392 đã merge, chưa sửa). Sau = `0d77ea67` (đã có 2A, 2B, 2C).

| Kịch bản | Đúng — trước | Đúng — sau | Ghi chú |
|---|---:|---:|---|
| `cart-needs-colour` — khách nói lấy size M, chưa chọn màu | 9/10 | 8/10 | Cả ba lượt hỏng đều cùng một lỗi: owner viết "có sẵn hai màu" hoặc "size M hiện còn hàng" trong khi màu be là hàng đặt trước. Verifier chặn đúng. |
| `cart-write-refused` — bước đầu cố định là `add_to_cart` thiếu màu, như lượt 1 của J4 | 10/10 | 10/10 | Không lần nào báo đã thêm giỏ, ở cả hai bên. Số câu nêu rõ be là hàng đặt trước: 3/10 → 7/10. |
| `which-colours` — khách hỏi có những màu nào | 10/10 | 9/10 | Lượt hỏng là lỗi provider (`OWNER_FINISH_REASON`), không có draft. |

"Đúng" được chấm bằng máy: gửi được, giỏ vẫn trống, câu trả lời nêu cả hai màu và không khẳng định đã thêm giỏ. Số ở cột "trước" của `cart-write-refused` đã chấm lại bằng điều kiện đã sửa; bản đầu tính nhầm câu "để em thêm vào giỏ cho mình" là báo đã thêm.

## Đọc kết quả

1. **Không tái hiện được lỗi J4 và S04 của PR 392 trên fixture này.** Code trước khi sửa đã đạt 9–10/10 ở cả ba kịch bản, nên các số trên không chứng minh 2A và 2B sửa được hai lỗi đó. Chênh lệch trước/sau nằm trong dao động của 10 mẫu.
2. Khác biệt đo được của 2B là owner nêu trạng thái tồn theo từng màu thường xuyên hơn (3/10 → 7/10), đúng với việc kết quả tool nay ghi sẵn tên màu kèm tồn.
3. Lỗi còn lại trên fixture là owner nói quá về tồn kho: 3 trong 20 lượt của kịch bản đầu, tính cả hai bên. Với quyết định chỉ dùng handoff khi verifier chặn, mỗi lần như vậy mất cả lượt.
4. Bối cảnh khác với lượt chạy thật ở ba điểm đáng kể: một sản phẩm thay vì nhiều mã cùng tên và offer thành phần; 7 tool thay vì 14; verifier là Gemini thay vì GPT-6.1 Sol. Lỗi S04 gốc do verifier cũ bám vào nhãn "chưa đầy đủ"; verifier mới không bám vào nhãn đó cả ở bên chưa sửa.

## Ngân sách request quan sát được

Sau khi sửa, lượt có một vòng tool mang thought signature thật **12.928 byte**, khớp mức khoảng 11 KB đã ghi nhận trước đây. Signature này không còn bị tính vào trần text 65.536 byte. Phần text lớn nhất đo được là 33.746 byte với 7 tool; với đủ 14 tool, schema thêm khoảng 11 KB nữa.

## Verifier Gemini trên draft biết trước đáp án

Tám draft, 5 lần mỗi draft, cùng fixture ở trên ([kết quả](VERIFIER_PROBE.json)).

| Nhóm | Gửi được | Chi tiết |
|---|---:|---|
| 4 draft sai (báo đã thêm giỏ khi không có receipt, sai giá, hàng đặt trước báo là có sẵn, tự thêm ưu đãi) | **0/20** | 19 FAIL, 1 lỗi provider và bị chặn theo fail-closed |
| 4 draft đúng (giá, màu kèm tồn, tư vấn chất liệu, hỏi bước tiếp) | **20/20** | |

Đây là bộ nhỏ và dễ phân biệt. Nó chưa thay được bộ kiểm SAFETY của Phase C (12 unsafe + 12 safe) vốn chạy với verifier cũ; bộ đó cần chạy lại với verifier mới trước khi dựa vào.

## Tệp

- [Lượt trước khi sửa](TURNS_BEFORE_43a0896e.json) · [Lượt sau khi sửa](TURNS_AFTER_0d77ea67.json): từng lượt có draft, verdict, tool đã gọi, ngân sách request và token.
- Cả hai nhánh ghi `dirty: true` vì công cụ đo chưa được commit lúc chạy; nhánh "trước" là `43a0896e` cộng đúng hai tệp công cụ đo.
- Lệnh chạy nằm ở đầu `../fixture-turn-sampling.mjs` và `../fixture-verifier-probe.mjs`.

Tổng dùng cho hai nhánh: khoảng 903.000 token vào và 66.000 token ra trên 60 lượt.
