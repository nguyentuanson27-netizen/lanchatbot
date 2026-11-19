# Xét hỗ trợ khi mở giỏ, báo giá khi draft bị chặn, giọng chat · 16/11/2026

Sửa trên base `50813b68e8432b1fdc053a95f08b312b15bae96c` theo quyết định owner ngày 16/11 ("làm 1 đến 4", "ko ví dụ"). **Chưa có lượt model nào chạy sau bản sửa này; Phase C giữ STOP.** Mọi kết luận dưới đây đến từ test tất định.

## Vì sao sửa

Review vòng `4673fdc4` ([báo cáo](PRICE_AUTHORITY_REPAIR_20261116.md)) quy hai ca fail về cùng một gốc: việc xét hỗ trợ giá là thao tác owner phải tự gọi, trong khi owner được mô tả như thể nó tự chạy.

- Control hai áo: mô tả tool `apply_pending_negotiation` và prompt owner ghi "xét ngay khi `canApply=true`… khách không cần hỏi lại". Owner nói lại ý đó với khách; verifier chỉ thấy `NOT_EVALUATED / CART_REQUIRED` nên chặn. Một câu sai làm mất cả lượt và hai lượt sau.
- J4 lần 2: lệnh RECORD lặp trả `cartQuote: null`, không có `supportEvaluation`. `blockedReason: CART_REQUIRED` đẩy owner thử tạo giỏ, hết lượt tool trước khi gọi `quote_product`.

## Đã sửa gì

1. **Code tự xét hỗ trợ khi mở giỏ.** `add_to_cart` mở đúng giỏ của lời xin đã lưu thì code gọi luôn lệnh activation hiện có, một lần, với đủ kiểm tra quyền, nguồn, CAS, biên nhận mở giỏ và biên nhận riêng. Kết quả `add_to_cart` kèm `supportEvaluation` và `cartQuote` sau khi xét. Không đổi `packages/contracts`, `packages/chat-runtime` hay `packages/database`.
   - Lần xét bị từ chối trước commit: giỏ vẫn mở, `supportEvaluation.status=NOT_EVALUATED`, `apply_pending_negotiation` còn gọi được để thử lại.
   - Commit lần xét không chứng minh được: cả lượt bị chặn qua cổng `UNKNOWN_COMMIT` sẵn có.
   - `apply_pending_negotiation` chỉ còn hiện khi `pendingSupport.canApply=true`; không hiện chỉ vì lượt này có thể tạo giỏ.
2. **Owner và verifier đọc cùng một dữ kiện quy trình.** `state.pendingSupport.evaluation = {by, when, waitingFor, meaning}` thay `blockedReason`. `waitingFor` nêu phần còn chờ khách (`COLOR`, `SIZE`, hoặc `CUSTOMER_PURCHASE_CHOICE`), lấy từ ghi chú mua hàng đang chờ. Verifier có thêm một câu: lời "lên giỏ shop sẽ xem hỗ trợ" là đúng nguồn; lời nói đã có, sẽ có hoặc không có ưu đãi thêm vẫn cần kết quả đã xét.
3. **Lệnh lặp trả cùng shape với lần đầu.** Nhánh duplicate dùng chung một hàm dựng kết quả, kèm `duplicate: true` và effect của biên nhận thật.
4. **Draft bị verifier chặn không kéo theo tổng tiền đã chứng minh.** Khi verdict là FAIL, UNCERTAIN hoặc MALFORMED và lượt này có đúng một tổng trước giỏ còn hiệu lực, code gửi một câu tự dựng từ tên món trong catalog, tên phần bán do code giữ, số lượng và các số tiền của proof hiện tại. Câu này qua `hardPrecheck`, không gọi thêm model, không dùng draft bị chặn, không dùng vùng giao hay màu do model truyền vào. Lỗi verifier, world cũ, đã có giỏ, handoff đang chuẩn bị, không có hoặc có hơn một tổng: giữ handoff im lặng như cũ.
5. **Giọng chat, không ví dụ.** Mục "Giọng chat" của prompt owner thêm bốn luật: mặc định tối đa hai câu trả lời và một câu hỏi; chỉ nói phần mới của lượt; không nhắc hệ thống hay quy trình; không cần lời thưa và tiếng đệm ở mọi câu. Dòng về xin bớt giá yêu cầu luôn đáp lời xin đó kèm bước kế tiếp có thật.

## Kiểm tra đã chạy

| Phạm vi | Kết quả |
| --- | --- |
| 7 file vitest trọng tâm (turn, effects, quote, verifier boundary, callable, owner view, protected claim boundary) | 400/400 qua |
| 6 file node trọng tâm (candidate provider, gemini inference, native wire, preparation admission, protocol, owner result meaning) | 138/138 qua |
| Toàn bộ `vitest run src` của worker | 2.881 qua, 6 fail, 1 skip |
| Toàn bộ `test:evals` của worker | 9 test fail |
| `protected-claims` và `reply-assembler` của business-tools | 22/22 qua |
| Worker build, `tsc --noEmit`, dataset boundary guard, `git diff --check` | qua |

6 fail vitest và 9 fail node đều có sẵn trên `50813b68` chưa sửa, đo trên một worktree sạch trong cùng máy: 6 test cần object git ngoài clone nông hoặc ffmpeg của sandbox; 9 test node gồm các phép đo kích thước request và hash đã lệch từ trước. So tên từng test, bản sửa không thêm và không bớt fail nào.

Test mới phủ: xét hỗ trợ trong `add_to_cart` với hai biên nhận liên tục; lần xét bị từ chối trước commit; commit không chứng minh được; lệnh RECORD lặp trả cùng shape; `pendingSupport.evaluation` và `waitingFor`; câu báo giá do code dựng qua cả lượt `runCommerceTurn`; các trường hợp vẫn handoff; wire owner thật mang `supportEvaluation` và `evaluation`.

## Chưa làm, cần biết trước khi chạy model

- **Chưa đo trên model.** Chưa biết bốn luật giọng có làm câu trả lời tự nhiên hơn hay làm thiếu ý. Prompt owner tăng từ 21.463 lên 22.393 byte, verifier từ 17.502 lên 17.938 byte; hash mới đã ghi vào `manifest.json`.
- **Request owner dài thêm khoảng 840 byte.** Trong fixture `task-path-repair`, phần dư dưới trần 65.536 byte giảm từ 5.685 xuống 4.847 byte; test đòi dư 10% ở đó đã fail từ trước bản sửa này.
- **Audit qualification chính thức chưa nhận câu trả lời do code dựng.** `qualification.mjs` vẫn đòi verdict PASS gắn với đúng văn bản đã gửi, nên một lượt `VERIFIED_QUOTE_REPLY` sẽ bị báo BLOCKED ở đó. Bản ghi lượt trong `native-population.mjs` đã có `codeReply` để phân biệt. Nhánh native của audit này hiện không có test nên chưa sửa.
- **Rubric judge chưa có tiêu chí giọng riêng.** Tiêu chí 5 vẫn "chấp nhận hạn chế giọng nhẹ".
- `negotiatedPriceFloor` vẫn là hằng số `NOT_ESTABLISHED`; retry vẫn tính vào trần ba lượt sinh.
