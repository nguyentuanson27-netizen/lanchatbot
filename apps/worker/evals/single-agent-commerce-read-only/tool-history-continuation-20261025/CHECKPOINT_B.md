# Phase B — hoàn tất 30 ca còn lại, 25/10/2026

**Đã chạy đủ 30/30 ca còn lại. Khuyến nghị giữ B chưa GO.** Không sửa prompt/runtime trong lượt này. Chạy tiếp theo yêu cầu owner trên source có bản sửa privacy; giữ nguyên report STOP và 21 kết quả cũ.

- bRunSourceSha: `e51db388c6dfa95c5e5af7b2b82c21646e1e1933` (executable đã có correction `94cb6b089321d65cff57d810eb6ad2b3c74627ca`).
- Source của 21 kết quả cũ: `9e352f382e8915d6a1f1c080c75817065da42c63`. Tổng hợp 51 ca có **hai source**, không phải một qualification cùng source.
- Driver nằm ngoài repo lúc chạy, hash được freeze trong REGISTRATION trước dispatch; nay archive nguyên byte trong source/. Không ghi run SHA ngược vào executable. Worktree sạch trước/sau campaign; HEAD không đổi trong run.
- Owner Vertex/global `gemini-3.5-flash-lite` HIGH; verifier Codex login `gpt-6.1-sol` HIGH. Config/prompt/schema được giữ theo manifest; exact identities/hashes trong REGISTRATION và frozen-inputs/manifest.json. Không đổi model, retry hay giới hạn tool.

## Denominator và kết quả

| Nhóm | Ca mục tiêu | Kết quả |
|---|---:|---|
| B1 | 24 | 24 SEND_ELIGIBLE/PASS, chỉ kiểm send eligibility |
| Đàm phán | 3 | 3 SEND_ELIGIBLE/PASS, actual capture |
| Stateful còn thiếu | 3 | private checkout committed + purchase-confirmed handoff + requested-human handoff; đều có actual capture |
| Tiền đề stateful mới | 5 bổ sung | Dựng lại lịch sử/giỏ thật trong database mới; 4 PASS + 1 code hỏi tên người nhận |

**30 mục tiêu / 30 đã chạy; NOT_RUN0.** 27 SEND_ELIGIBLE, 1 NO_SEND theo terminal model vì private checkout được code xử lý, 2 HANDOFF. NO_SEND ở đây có preview code gửi vào capture, không phải im lặng. Fallback0, actual silent captured turns0.

Database cũ đã dọn nên không thể tiếp tục stateful tại cùng state identity. Năm lượt tiền đề là **năm lượt candidate mới có đăng ký ở provider-mode** (lượt xin thông tin checkout do code xử lý, không gọi model), không giả lập model, không chép PASS cũ, không thay 5 kết quả lịch sử. Tổng lượt native mới thực sự35. Cả hai database mới đã DROP trong finally; nguồn live chỉ đọc, mọi delivery/effect được cô lập/capture, không POS order/live send.

## Review toàn câu

Đã đọc35 actual terminal outcomes, tách30 mục tiêu và5 tiền đề. Đánh giá mức hoàn thành nhu cầu, quyết định mua, trọng tâm và tiếng Việt tự nhiên; không cộng điểm do đủ keyword. Review primary khóa trước khi xem diagnostic/căn cứ sau review; không claim blind review vì đã đọc corpus trước.

Trong30 mục tiêu: **8 dùng tốt,18 dùng được nhưng cần gọt giọng/trọng tâm,4 cần sửa tư vấn**. Đây là đánh giá review, không phải ngưỡng pass benchmark mới hoặc kết quả conversion.

1. `b1-changed-occasion`: đã chuyển mẫu theo việc đi ô tô lâu, nhưng đoạn tư vấn dồn mô tả, tính từ và lợi ích, dài hơn mức cần để khách quyết định.
2. `b1-buying-concern`: khách ngại nhiều ren, bot dùng mềm/bay/rũ để kết luận không rườm rà; lý do chưa đi vào vấn đề mức độ chi tiết thiết kế.
3. `b1-buying-concern-v2`: hiểu gu đồ trơn nhưng đưa áo lẻ/váy lẻ/cả set, rồi hỏi khách chọn. Không giúp chốt một hướng; câu dài và các nhánh làm nhau yếu đi.
4. `b1-buying-concern-v3`: đã chọn áo riêng theo chân váy khách có, rồi mở lại cả bộ mà không có đánh đổi mới. Kết luận bị loãng, chất liệu quảng cáo lấn cách mặc lại.

Các ca chính sách từ chối đúng tình huống mặc đi làm/mặc thử/đã giặt cắt tem; vẫn nói kiểu quy định và xin thông cảm dài. Các ca thiếu POS giữ được mô tả có nguồn và không bịa giá/tồn, nhưng dùng ngôn ngữ “hệ thống chưa có thông tin”. Các ca giá trả đúng ý chính nhưng hay thêm dãy size. Ca đổi hoàn cảnh-v3 đã chọn áo riêng cho gặp khách, song giải thích so sánh dài. Đàm phán báo đúng tổng/ship theo code nhưng giải thích trong ngoặc chưa gọn.

Stateful đã giữ hai áo L, profile sửa74/96, code quote978100, nhận checkout riêng không gọi model, chuyển PURCHASE_CONFIRMED và handoff. Câu correction không đọc lại cả số đo; “em ghi nhận” còn hơi mang giọng xử lý dữ liệu. Code hỏi tên bị redaction ở raw capture, exact public text được chứng minh qua transport hash trong PUBLIC_CHECKOUT_HASH_PROOF.

## Căn cứ sau primary review

Snapshot policy hiện tại có15 ngày, phí hai chiều30k, requiredConditions và HOLD_UP_ONLY. Lịch sử7 ngày/25k không lấn policy hiện tại. Không đổi policy nguồn trong lượt này.

Nguồn mô tả SQ675 xác nhận chất liệu thô hoa laze/thô ướt, lót habutai, thiết kế và cách dùng; **không có kết quả so sánh ít nhăn khi ngồi xe3giờ**. Câu tư vấn tự suy luận lợi ích đó từ chất liệu, verifier cho PASS. Ghi đây là inference cần đánh giá riêng theo ranh giới owner đã chấp thuận; không gọi PASS là bằng chứng độc lập rằng công năng đã được xác minh. Tương tự câu “không bí” cho tiệc ngoài trời là suy luận từ mô tả thoáng, chưa có phép thử cá nhân. Không tự đổi thành UNSAFE hay nới verifier để đẹp số trong run này.

## Vận hành, accounting và giới hạn

- 97 actual generation requests =66 owner +31 verifier; max1 upstream/generation; retry0; error0; timeout0; unexpected-tool contract errors0. Đủ request wire cho cả97; firewallPASS, evaluator labels/private checkout fixture/internal delegation leaks0.
- 519221 input tokens,52663 output tokens; usage có cho mọi request. CostNOT_EXPOSED.
- Verifier latency nearest-rank p50/p95:5.315s/9.271s. Verification stage gồm re-read:6.167s/13.159s. B1 turn p50/p95:12.534s/28.765s; captured turn:29.038s/56.485s. Đây là isolated DB/SSH/capture, không phải production/first-token/controlled added-E2E latency.
- Không chạy lại17 controls hoặc full A2. Kết quả controls cũ chỉ là lịch sử; zero unsafe registered trong continuation nên unsafe false-PASS **chưa đo trong run mới**, không suy ra0 trên population chưa chạy.
- 8preflight +8run commands đều exit0, nguyên command/exit/timing trong raw/COMMANDS.json. Mỗi B1 runner thực sự build worker hiện hành. Các lệnh projection/metrics/firewall/validation đã chạy và PASS. Không rerun focused/typecheck/lint/remoteCI; evidence trước vẫn giữ đúng source labels.
- Không thêm semantic role/layer/tool/parser/template hoặc sửa production entrypoint; thay đổi repo của lượt này chỉ là evidence/docs.

## Đánh giá và bước tiếp theo

Hoàn tất inventory51 ca qua old21+new30; giữ5 setup mới tách riêng. Kết quả này khép30 NOT_RUN, chưa xóa fallback discovery và task failure gửi ảnh ở21 ca cũ, cũng chưa chứng minh ổn định của51 ca trên corrected source. **B chưa GO; không tự chạy vòng khác, sửa prompt, merge/deploy/live send.**

Nếu owner chọn sửa tiếp, dùng4 whole-turn findings trên để đánh giá chất lượng quyết định và cách trình bày. Không tiếp tục nhồi mô tả/tính từ hoặc thêm ví dụ riêng từng benchmark; không đánh đồng verifier acceptance với hiệu quả bán hàng. Lượt này chỉ thu thập và review, chưa chọn can thiệp tiếp theo.
