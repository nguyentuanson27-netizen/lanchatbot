# Review bổ sung sau batch: hai root cause đã tái hiện

Review trên source5240fffe, runtime vẫnfe4/e688; không sửa code/prompt/model, không gọi provider hoặc tác động DB/khách. Raw/grades/báo cáo gốc giữ nguyên; kết luận mới dưới đây bổ sung cho những chỗ trước đó còn ghi giả thuyết/unknown.

## 1. Search chiếm slot của sản phẩm khách đang hỏi

s02giá áo, s07size vàs13tổng ship có cùng chuỗi: đã boundSQ2447/SV2447 nhưng ownersearch“Thạch Thảo”; kết quảV406/SQ748/V168 được đưa vào runtimeproducts, rồi owner yêu cầu detailsOnly cho hai mã ban đầu.

Replay dùng cùng frozen world, thời điểm actual s02 và đúng ba candidates đã capture, qua code createCommerceTools hiện hành. Search port trả lại các candidates đã quan sát trong bộ nhớ; không gọi embedding/search mới:

| Control | Trước đọc hai mã | SQ2447 | SV2447 | Sau |
|---|---|---|---|---|
| Không search trước |0products|OK|OK|2mã đúng|
| Search trước |V406/SQ748/V168|OK|UNAVAILABLE/SOURCE_ERROR|4products, thiếuSV2447|

Đã assert cả hai target đọc được từ cùng dữ liệu khi không có search, còn sau search thì chạm giới hạn4products. prepareProduct kiểm cap trước thêm mã mới; outer invoke catch che PRODUCT_BOUND thành SOURCE_ERROR. Như vậy component replay đã xác nhận crowding gây failure, không còn chỉ là suy đoán từ tên reason. Nó không phải bằng chứng lịch sử indexHNSW sai hoặc POS lỗi.

Phân công đúng: owner đi search chưa cần thiết là một phần vấn đề; code còn để candidates search chiếm cùng ngân sách với target đang bound và làm mất reason. Không chữa bằng thêm câu “đừng search” vào prompt hoặc tăng cap. Hướng sửa cần giữ target đã có, phân biệt candidates chưa chọn với evidence đã cần, admission trước publication và closedreason đúng. Không evict fact đã kiểm sau verifierPASS hoặc thêm semanticrouter.

## 2. Hai size bị gộp thành cùng stock scope

j1T1 cóL1 trong giỏ; T2thêmM1 bịCLAIM_CONFLICT, không ghi thêmM. Audit trước đó đã chứng minh atomicity giữ đúng giỏL1; review này đi tiếp đến root cause.

Từ frozen source và clock actualj1T2, cùng resolver cartSelectionFromSnapshot:

- L/AO/__NO_COLOR__: READY, giá499000, tồn8.
- M/AO/__NO_COLOR__: READY, giá499000, tồn14.
- Kiểm từng line riêng qua shared claim validator: missing=false/conflict=false/mismatch=false.
- Ghép hai line theo production projection: missing=false/**conflict=true**/mismatch=false.

freshReadiness của realtime-sales-cycle tạo claim với variantId=line.offerId, nên cả hai STOCK có cùng scope SV2447/AO nhưng contentHash khác (8 và14). validateEffectClaimSemanticsV1 nhóm theo type+productId+variantId nên coi chúng là hai số tồn mâu thuẫn của cùng một đối tượng. Thực tế đây là hai size riêng. Không phải khách yêu cầu tác vụ ngoài capability hoặc stock không đủ.

Hướng sửa phải thống nhất identity biến thể/stock scope qua worker, claim/readiness contract và DB guard; bao gồm size/màu/BOM/stock-pool identity khi liên quan. Không bỏ CLAIM_CONFLICT, không cộng tồnM+L hoặc chỉ tách theo lineId mà bỏ kiểm hai dòng cùng tiêu thụ một pool. Cần control tồn khác nhau giữa hai size, cùng size trên nhiều dòng, shared BOM stock và changed source. Chưa thực hiện sửa trong task review.

## 3. Đánh giá lại kết quả thực

Tiến bộ nên giữ: j4đã thêmM→hỗ trợ30k→giữ đúng tổng499k; j1T1thêmLthành công; s09trả đúng chăm sóc; j3giữ nhu cầu chỉ mua áo và gửi2ảnh. Đây là tiến bộ quan sát được, không đủ kết luận ổn định từN1.

Các handoff cần phân biệt:

- s01/s03: nguồn ảnh/freshness/component chưa usable; không bỏ ảnh bắt buộc để lấy số gửi tốt hơn.
- s16: không có verifiedfeedback; không dùng ảnhmodel thay ảnh khách.
- s10/s12/j5: đơn cũ/hậu mãi ngoài capability, chuyểnHUMAN đúng.
- j2correction: chartOUT_OF_RANGE, không dùng lạiM cũ.
- s11: mơ hồ setváy/setquần là thông tin cần hỏi khách, không mặc định handoff như thiếu nguồn shop.
- s04: searchPRODUCT_BOUND rồihandoff, không phải verifier đã chặn bịa màu trong lượt này.

Giọng vẫn dài và nhiều tính từ ở các đoạn tư vấn; riêng s06đi thêm đoạn khen cảset khi câu hỏi phối quần đã được giải quyết, s05thêm option bèo tầng chưa sát ưu tiên đơn giản. Care/negotiation/ACK dùng được và gọn hơn. Giữ ưu tiên lỗi làm mất giá/size/giỏ, không mở một vòng vá giọng hàng loạt.

## 4. Cách đọc điểm cần thận trọng

Journey wholeTurnPass5/6 và conjunction1/6 không đồng nghĩa chỉ1hànhtrình có cách xử lý đúng. Judge đánh j3chưa hoàn tất mua vì còn chờsize, j6còn chờtên dù hỏi bổ sung là bước đúng. Cờ hoàn thành nhu cầu đang nhạy với việc hiểu nó là “xử lý đúng lượt hiện tại” hay “hoàn thành giao dịch”.

Không sửa grades/rubric sauunmask. Trước vòng đánh giá sau cần làm rõ outcome phù hợp cho: thiếu thông tin khách→hỏi đúng, thiếu shopdata→handoff đúng, đủdata→phải trả lời/thực hiện. Completion/coverage vẫn nên báo riêng; không để một câu hỏi bổ sung hợp lý bị hiểu như lỗi tư vấn. Cả whole-turnSINGLE10/16 vàJOURNEY5/6 vẫn dưới90%, nên lưu ý này không biến kết quả hiện tại thànhGO.

## Ưu tiên đề xuất

1. Sửa claim/readiness identity cho cart nhiều size; giữ conflict guard và chống oversell.
2. Sửa admission/bảo toàn bound targets khi search, và giữ reason PRODUCT_BOUND thay SOURCE_ERROR.
3. Xử lý source ảnh/metadata tại nguồn hiện có, làm rõ ambiguity bằng câu hỏi khách; không thay quy tắc handoff đã chốt.
4. Làm rõ completeness rubric trước seal lần sau. Giọng nhẹ giữ ngoài ưu tiên.

Evidence [REPLAY_EVIDENCE.json](REPLAY_EVIDENCE.json). Local command thực chạy: node ../c3-post-run-review-replay-20261030.mjs, exit0. Replay này là deterministic component diagnosis, không provider/E2E/PG hoặc quality run mới. Không triển khai fix trong task review này.
