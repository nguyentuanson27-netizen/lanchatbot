# Kế hoạch: đưa Phase C ra khỏi vòng lặp fix → chạy model → fix

Ngày lập: 10/11/2026. Cập nhật 11/11/2026: **owner đã chốt D1–D4; Giai đoạn 2 và phần code của Giai đoạn 1 đã làm xong** trên nhánh `claude/sleepy-edison-4xadgb`. Xem [mục 14](#14-trạng-thái-thực-hiện-11112026) để biết việc đã làm, số đo và việc còn lại.

Căn cứ: review PR 392 tại head `6ef2be81c4e3f4c6ae7f90fee9afe3fbf26304a2` (nhánh `feat/c3-phase-c-qualification-20261028`). Mọi đường dẫn và số dòng bên dưới tính theo commit đó. Review chỉ đọc code, prompt và báo cáo; không chạy test hay model. Raw trace nằm ngoài repo, nên các nhận định về nội dung tool result là suy từ code và phải được xác nhận lại ở Giai đoạn 0.

## 1. Vấn đề cần giải quyết

Từ 29/10 đến 10/11 Phase C đã qua khoảng 30 lượt chạy model, lượt nào cũng kết thúc STOP. Sáu ca hay lỗi (J1, J4, P07, P09, S04, S16) lật qua lại giữa các lượt; tổng số ca đạt dao động 9–10/12 và 22/34, không có xu hướng tăng. Bốn nguyên nhân gốc:

| # | Nguyên nhân | Bằng chứng chính |
|---|---|---|
| G1 | Phép đo không tách được hiệu quả của fix khỏi nhiễu | Mỗi lượt N=1, snapshot mới, đổi cùng lúc code, prompt và dữ liệu. Với 12 ca và ngưỡng 90%, hệ thống đúng 90% vẫn trượt khoảng 34% số lần |
| G2 | Lỗi contract ở code được vá bằng prompt | S04: nhãn completeness là hằng số. J4: thiếu màu được báo như lỗi nguồn. P09: trần request tràn ở ít nhất 8 lượt, trên các ca khác nhau |
| G3 | Một câu sai của model làm mất cả hội thoại | Verifier FAIL → handoff im lặng → các lượt sau `HUMAN_OWNS_CONVERSATION` |
| G4 | Prompt và tool schema phình theo từng ca | `owner.vi.txt` 20,5 KB sau 78 lần sửa; schema 14 tool khoảng 19 KB; hai phần này chiếm 63% trần request |

Kế hoạch xử lý theo đúng thứ tự đó: sửa phép đo, sửa code bằng test không cần model, thêm đường phục hồi, rồi mới động tới prompt.

## 2. Phạm vi và nguyên tắc

Trong phạm vi: eval harness, runtime candidate `apps/worker/src/single-agent-*`, lớp trình bày dữ liệu cho owner, prompt owner và mô tả tool.

Ngoài phạm vi: deploy, production wiring, gửi tin thật, migration, đổi allowlist, thêm vai trò model thứ ba, parser hoặc router ngữ nghĩa, ví dụ theo ca trong prompt.

Nguyên tắc áp dụng cho mọi giai đoạn:

1. **Không chạy model để tìm lỗi code.** Lỗi nào tái hiện được bằng unit test hoặc replay thuần code thì phải có test đó trước khi sửa.
2. **Mỗi lượt đo chỉ đổi một lớp.** Các lớp là: contract code, prompt và mô tả tool, dữ liệu/snapshot, model. Không gộp hai lớp vào cùng một lượt đo.
3. **Snapshot đóng băng khi so sánh.** Snapshot mới chỉ dùng cho lượt xác nhận cuối.
4. **Không vá theo ca.** Thay đổi nào chỉ có lý do là một caseId cụ thể thì không được nhận.
5. **Vòng lặp có điểm dừng.** Mục 9 định nghĩa điều kiện thoát và điều kiện dừng hẳn.

## 3. Quyết định cần owner chốt trước

| Mã | Quyết định | Khuyến nghị | Chặn giai đoạn |
|---|---|---|---|
| D1 | Cho phép tin phục hồi do code dựng từ verified facts khi lượt của model bị chặn | Có, với tập đóng ba loại ở Giai đoạn 3. Cần sửa amendment §7.2, vốn chỉ cho fallback không chứa protected assertion | 3 |
| D2 | Cách tính trần request 65.536 byte | Giữ 65.536 cho phần text model đọc; tách thought signature ra trần riêng; bắt buộc headroom ≥10% cho continuation xấu nhất | 2C |
| D3 | Quy tắc đo và ngưỡng đạt | Thay `repetitions: 1` trong `owner-decisions.json` bằng N=5 trên snapshot đóng băng; ngưỡng theo ca ở mục 9 | 1, 5 |
| D4 | So sánh model owner khác trên cùng bộ replay | Chỉ làm nếu chạm điều kiện dừng ở mục 9 | 5 |

**Quyết định của owner, 10/11/2026** (ghi tại `apps/worker/evals/single-agent-commerce-qualification/owner-decisions.json`):

- D1: **không duyệt, chỉ dùng handoff.** Bỏ Giai đoạn 3.
- D2 và D3: **duyệt.**
- D4: **chưa làm.**
- Thêm: verifier dùng cùng `gemini-3.5-flash-lite` với owner, thay cho GPT-6.1 Sol.

Phần dưới đây giữ nguyên phân tích lúc đề xuất. D1 là quyết định nặng nhất. Nó căng giữa hai văn bản đang có hiệu lực: amendment §7.2 và §14.9 (không dựng hệ template) với invariant r31.3 trong `AGENTS.md` (lỗi model chỉ được mất phần đóng góp của nó, phải thử deterministic fallback từ verified facts trước). Nếu owner không duyệt D1, bỏ Giai đoạn 3 và chấp nhận rằng tỷ lệ handoff im lặng sẽ là giới hạn trên của kết quả.

## 4. Giai đoạn 0 — Đóng băng và lấy baseline

Mục tiêu: có một mốc so sánh cố định trước khi sửa bất cứ thứ gì.

1. Ghi lại head `6ef2be81` làm baseline. Không thêm commit runtime vào PR 392 từ đây.
2. Chọn một snapshot đóng băng: world của lượt `price-intent-media-run-20261110` (107 sản phẩm). Giữ nguyên bộ 13 ca / 27 lượt của screen và bộ 34 ca / 55 lượt đầy đủ.
3. Xác nhận harness native chạy được với **clock ghim tại thời điểm capture** của snapshot. Runtime đã nhận `clock` qua tham số (`single-agent-commerce-read-only.ts:114`) và `maxFactAge` là 7.200 giây, nên snapshot đóng băng sẽ hết hạn nếu clock chạy thật. Nếu harness chưa hỗ trợ ghim clock thì đây là việc đầu tiên của Giai đoạn 1.
4. Từ raw trace lưu ngoài repo, dựng lại các request owner đã bị chặn vì vượt trần ở các lượt trước (s06, s08, s02, s13, j1, p09, s15, p04) thành fixture. Chỉ lưu vào repo kích thước từng phần và hash, không lưu raw.
5. Từ raw trace của J4 lượt 1 và S04, xác nhận đúng nội dung tool result mà owner đã thấy. Nếu khác với mô tả ở mục 6 thì sửa lại mục 6 trước khi làm.

Hoàn tất khi: có bảng baseline theo ca và có đủ fixture ở bước 4–5.

## 5. Giai đoạn 1 — Sửa phép đo

Mục tiêu: một lượt đo trả lời được câu hỏi "fix này có tác dụng không".

### 1.1 Chạy lặp trên snapshot đóng băng

- Thêm tham số số lần lặp cho runner native trong `apps/worker/evals/single-agent-commerce-qualification/` (hiện mọi scope đều N1). Mỗi lần lặp dùng database dùng-một-lần riêng và cùng snapshot, cùng clock ghim.
- Kết quả theo ca là số lần đạt trên N, không phải một nhãn đơn.
- Phân loại tự động: `ỔN_ĐỊNH_ĐẠT` (5/5), `CHẬP_CHỜN` (2–4/5), `ỔN_ĐỊNH_LỖI` (0–1/5).

Chi phí ước tính cho một screen 13 ca với N=5, suy từ lượt gần nhất (58 request, khoảng 616.000 token vào): khoảng 290 request và 3,1 triệu token vào, trong đó verifier khoảng 85 request. Quota verifier qua Codex login từng hết giữa chừng, nên cần dành quota cho đo thay vì cho review từng bước.

### 1.2 Đo một bước trên request đã capture

Dùng lại `bc-owner-replay.mjs` và `bc-control.mjs` (gửi lại nguyên body đã capture, không thực thi tool). Với mỗi điểm quyết định nghi ngờ, lấy ít nhất 5 mẫu trên cùng một body. Cách này tách dao động của owner khỏi mọi yếu tố khác với chi phí thấp.

### 1.3 Tiêu chí đạt theo ca chấm bằng máy

Mở rộng `task-outcomes.mjs` để mỗi ca screen có điều kiện kiểm được bằng dữ liệu có cấu trúc: terminal disposition, tool đã gọi, receipt, tổng tiền, có hay không có ảnh. Review thủ công chỉ còn dùng cho chất lượng lời văn, không dùng để quyết định ca đạt hay lỗi.

### 1.4 Quy tắc nhận một fix

Một fix được nhận khi ca mục tiêu lên ≥4/5 và không ca nào khác giảm từ 2/5 trở lên so với lượt đo liền trước. Không đạt thì revert, không vá chồng.

Hoàn tất khi: chạy baseline N=5 trên head `6ef2be81` và có bảng phân loại ba nhóm cho 13 ca. Bảng này quyết định ca nào thuộc Giai đoạn 2 (lỗi ổn định, do code hoặc dữ liệu) và ca nào thuộc Giai đoạn 3–4 (chập chờn, do model).

## 6. Giai đoạn 2 — Sửa contract ở code, không cần model

Ba thay đổi độc lập, mỗi thay đổi một PR nhỏ, test thuần code.

### 2A. Danh sách lựa chọn và nhãn đầy đủ (lỗi kiểu S04)

Hiện trạng:

- `single-agent-commerce-selection-evidence.ts:42` cắt còn 8 tuple; dòng 46 gắn hằng số `FIRST_8_EXACT_TUPLES_NOT_COMPLETE_INVENTORY` kể cả khi danh sách đủ; dòng 29 chỉ chấp nhận đúng hằng số đó.
- `realtime-sales-catalog.ts:422` trả `availableSizes:[]` và `availableColors:[]` ở candidate mode, dù code có đủ rows.
- Cùng nhãn được gắn ở `single-agent-commerce-effects.ts:176` và `:181`, và `single-agent-commerce-read-only-tools.ts:483`.

Thay đổi:

1. Thêm một helper duy nhất tính facet từ **toàn bộ** options trước khi cắt: danh sách màu và size kèm trạng thái tồn, cùng cờ `complete`. Màu chưa ghi nhận (`__NO_COLOR__`, `UNRECORDED_IS_NOT_A_PHYSICAL_COLOR`) không được tính là một màu.
2. Nhãn completeness tính theo thực tế: đủ khi số tuple ≤ 8, ngược lại giữ nhãn cũ.
3. Vì key set và hash của evidence đổi, tăng phiên bản `kind` lên V3. Validator chấp nhận V2 (coi như chưa đủ) và V3. Cần kiểm tra evidence có được lưu bền ở `packages/database/src/context-v2-capture.ts` hay chỉ sống trong một lượt, để quyết định có cần đọc tương thích hay không.
4. Dùng helper ở cả ba nơi gắn nhãn nêu trên.

Nơi tiêu thụ phải rà: `validSelectionEvidence` (được gọi từ `single-agent-semantic-verifier-boundary.ts:175`), `selectionChoiceResolution` (dòng 86–94), `compactSelectionResult` trong `owner-product-tables.mjs`, giới hạn 4.096 byte của evidence.

Test: 2 màu × 4 size = 8 tuple cho ra nhãn đủ; 9 tuple vẫn cho facet màu đủ; màu chưa ghi nhận bị loại; evidence V2 cũ vẫn hợp lệ; kích thước không vượt 4.096 byte.

Kiểm ngữ nghĩa: thêm một cặp vào bộ kiểm verifier tập trung (cơ chế `SAFETY.json` đã có). Cùng câu "Áo có hai màu Trắng và Be": facet đủ thì kỳ vọng PASS, facet chưa đủ thì kỳ vọng FAIL.

### 2B. Kết quả tool ghi theo nghĩa trước (lỗi kiểu J4)

Hiện trạng: khi khách chưa chọn màu, `add_to_cart` trả `status:"UNAVAILABLE"`, `reason:"SELECTION_UNAVAILABLE"`, `failureStage:"SOURCE"` (`single-agent-commerce-effects.ts:291`, `:302`, `:316`). Ý chính nằm trong `data` cùng bốn trường trạng thái lồng nhau, hash và evidence.

Không đổi contract nội bộ, vì ba nơi đang phụ thuộc vào đúng hình dạng này: `quoteRoute` (`single-agent-commerce-quote.ts:199`), bằng chứng `noCommitSelections` (`single-agent-commerce-effects.ts:417`) và `isolated-integration.mjs:963`.

Thay đổi ở lớp trình bày cho owner:

1. Tạo module thuần `apps/worker/src/single-agent-commerce-owner-view.ts` với một hàm trình bày kết quả tool ghi. `gemini-inference.mjs` (khối dòng 239–243) gọi hàm này qua `dist`, giống các import `dist` hiện có. Đây cũng là bước đầu chuyển lớp trình bày ra khỏi thư mục eval.
2. Mọi kết quả của `add_to_cart`, `change_cart_item`, `confirm_purchase`, `record_negotiation` có khối `outcome` đứng đầu:
   - `done`: `true` chỉ khi có receipt đúng operation; `false` khi `effectCommitted===false`; `"UNKNOWN"` khi commit không chắc chắn.
   - `cartChanged`: suy từ receipt, không suy từ status.
   - Khi thiếu lựa chọn của khách: `why:"CUSTOMER_CHOICE_NEEDED"`, `ask:"COLOR"` hoặc `"SIZE"`, `options` lấy từ facet của 2A kèm tồn, và một câu `meaning` ngắn.
3. Bỏ khỏi phần owner thấy: `selectionEvidence`, các hash, `sourceVersion`, `observedAt`/`expiresAt` theo từng option, `selectionOptionScope`, `selectionStatus` trùng lặp. Verifier vẫn nhận đủ evidence như cũ.

Tiền lệ đã có trong cùng file: khối `supportEvaluation` và `fitEvaluation` (dòng 249–262).

Test: `COLOR_REQUIRED`, `SIZE_REQUIRED`, `SHOP_DATA_MISSING`, thành công có receipt, commit không chắc chắn. Kèm assert kích thước: kết quả sau khi trình bày phải nhỏ hơn hiện tại.

Bước này chỉ sửa code. Các câu prompt đang bù cho lỗi này được gỡ ở Giai đoạn 4.

### 2C. Ngân sách request (lỗi kiểu P09)

Hiện trạng: `OWNER_REQUEST_MAX_BYTES=65536` tại `gemini-inference.mjs:35`, đặt từ commit `3514691d` ngày 18/10, không đến từ spec kiến trúc. Số đo ngày 03/11: system 22.000, schema 18.690, còn lại khoảng 24.800 byte cho trusted frame và hội thoại. Thought signature khoảng 11.000 ký tự cũng bị tính vào. Request bị chặn **sau khi** các tool đã chạy xong (dòng 368 và 375).

Thay đổi, theo thứ tự:

1. **Đo đủ.** Bổ sung vào object `budget` (dòng 365–366) số byte của thought signature và của từng tool response.
2. **Tính đúng (cần D2).** Tách thought signature khỏi trần text và đặt trần riêng cho nó.
3. **Schema theo trạng thái.** Khi dựng `callable`, bỏ declaration của tool chưa đủ điều kiện cấu trúc: `change_cart_item`, `quote_cart`, `confirm_purchase`, `record_negotiation` khi chưa có giỏ. Điều kiện chỉ dựa vào state có cấu trúc, không đoán ý khách. Quyết định một lần đầu lượt và giữ nguyên trong cả lượt để continuation native còn hợp lệ. `trusted.execution.availableTools` vẫn liệt kê đủ tên tool. Hướng này đã được nêu trong `context-publication-run-20261101/ROOT_CAUSE.md` nhưng chưa làm.
4. **Tham chiếu thay vì lặp.** Mở rộng cơ chế `policyFromTrustedRef` (dòng 203–208) cho `read_product` và `quote_product`: phần đã có y hệt trong trusted frame của cùng request thì chỉ tham chiếu. Không cắt bỏ dữ kiện.
5. **Chặn trước khi chạy.** Trước khi thực thi một batch tool, ước lượng cận trên kích thước continuation. Nếu vượt thì từ chối batch bằng một tool error mà owner xử lý được, thay vì chạy xong rồi mới chặn. Lỗi P09 hiện xảy ra sau khi lệnh ghi lựa chọn đã chạy.
6. **Test continuation xấu nhất.** Với mọi hình dạng batch được phép (tối đa 6 primitive, 2 round), dùng fixture kích thước tối đa cho từng tool result, assert request nằm trong trần và còn headroom ≥10%. Nếu không vừa thì giảm trần của từng tool result hoặc siết admission, không hạ headroom.

Test hồi quy: toàn bộ fixture vượt trần ở Giai đoạn 0 phải vừa sau khi sửa.

Việc tùy chọn, chỉ làm nếu P09 chưa đạt 5/5 sau các bước trên: gộp chuỗi "ghi lựa chọn, lấy giá, chọn ảnh mở đầu" vào một lời gọi `quote_product` để code tự nối, thay vì để owner gọi ba tool.

### Hoàn tất Giai đoạn 2

- `pnpm --filter @lana/worker test`, `typecheck` và `lint` đạt trên head của từng PR.
- Một lượt đo N=5 cho lớp "contract code". Kỳ vọng: S04 và P09 lên ≥4/5, không còn request nào bị chặn trước HTTP, J4 lượt 1 không còn báo "đã thêm giỏ" ở đa số lần.

## 7. Giai đoạn 3 — Phục hồi khi lượt của model bị chặn (cần D1)

Hiện trạng: trong `finish()` (`single-agent-commerce-read-only.ts:134–150`), mọi terminal `FALLBACK` đều đi qua `recoverFallback` và bị ép thành `HANDOFF` hoặc `NO_SEND` với `text:null`. `finalGate` đã có sẵn tham số `fallback` (`single-agent-semantic-verifier-boundary.ts:226–247`) nhưng các text hiện có đều là câu tĩnh không mang dữ kiện.

Thay đổi:

1. Thêm capability tùy chọn `verifiedRecovery` vào tool set, được `finish()` gọi **trước** `recoverFallback` khi lý do là verifier `FAIL`/`UNCERTAIN`/`MALFORMED`, hết budget, hoặc lỗi dựng request của owner.
2. Tập đóng ba loại tin, mỗi loại dựng hoàn toàn từ kết quả có cấu trúc của chính lượt này, không đọc lời văn của model:

   | Loại | Điều kiện | Nội dung | Ca hưởng lợi |
   |---|---|---|---|
   | R1 | Có bằng chứng lệnh ghi chưa commit vì thiếu lựa chọn của khách (`uncommittedSelectionResult`) | Hỏi đúng phần thiếu, liệt kê lựa chọn kèm tồn từ facet 2A | J4 lượt 1 |
   | R2 | Có pre-cart quote hợp lệ của lượt này | Dòng giá, phí ship, tổng, dùng lại formatter của preview checkout | P09 và các ca báo giá |
   | R3 | Có receipt của effect đã commit | Xác nhận đúng thao tác theo receipt và `cartQuote` | Các ca đã thêm giỏ rồi bị chặn |

   Không khớp loại nào thì giữ hành vi hiện tại là handoff im lặng. R3 đã được amendment §7.2 cho phép sẵn.
3. Tin phục hồi không qua verifier vì không có lời văn của model, nhưng vẫn phải qua `hardPrecheck` (độ mới, permission, privacy, recipient) và ràng buộc snapshot hiện hành.
4. Không phục hồi khi có commit ở trạng thái không chắc chắn, khi snapshot đã đổi, hoặc khi conversation owner không còn là BOT.
5. Kế toán riêng: lượt kết thúc bằng tin phục hồi được đếm là "đạt nhờ code", không tính vào chất lượng model. Tỷ lệ này phải xuất hiện trong mọi báo cáo.

Giới hạn để không thành hệ template: tập đóng đúng ba loại, gắn với loại kết quả tool chứ không gắn với câu chữ hay caseId. Thêm loại thứ tư cần quyết định mới của owner.

Test:

- Unit cho từng loại.
- Tích hợp với owner giả viết sai "đã thêm giỏ" và verifier giả trả FAIL: kỳ vọng gửi tin R1, không handoff, hội thoại vẫn thuộc BOT, lượt kế tiếp chạy bình thường.
- Trường hợp âm: commit không chắc chắn, snapshot cũ, mất permission đều không được phục hồi.

Không nằm trong kế hoạch này: cho model viết lại rồi verify lần hai. Amendment §9.2 đang cấm; chỉ xem xét nếu chạm điều kiện dừng ở mục 9.

Hoàn tất khi: một lượt đo N=5 cho thấy J4 đi được tới lượt 2 và 3 ở ≥4/5 lần, nhờ đó nhánh thương lượng lần đầu được đo thật.

## 8. Giai đoạn 4 — Giảm tải prompt và mô tả tool

Chỉ bắt đầu khi Giai đoạn 2 đã đo xong (và Giai đoạn 3 nếu D1 được duyệt). Đây là lớp "prompt", đo riêng.

Mục tiêu kích thước: prompt owner ≤12 KB (hiện 20,5 KB), schema tool ≤12 KB (hiện khoảng 19 KB).

Cách làm là viết lại có kiểm kê, không sửa thêm từng câu:

1. Lập bảng mọi câu trong `prompts/owner.vi.txt` và mọi mô tả tool, ghi nguồn gốc (commit hoặc ca đã sinh ra nó) và lớp code nào giờ đã đảm nhiệm.
2. Gỡ các câu mà 2A, 2B, 2C và Giai đoạn 3 đã làm thừa. Ví dụ: các câu về tool thất bại và receipt (đã có `outcome`), câu về danh sách size chưa xác nhận (đã có facet), các câu về thứ tự gọi tool để tránh thiếu prerequisite (đã có admission).
3. Mỗi quy tắc chỉ nằm ở một nơi: cách dùng tool nằm trong mô tả tool, cách bán hàng nằm trong prompt.
4. Chuyển câu phủ định thành mô tả hành vi mong muốn.

Giới hạn vòng lặp: tối đa hai lần lặp cho giai đoạn này. Mỗi lần là một lượt đo N=5; nhận hay revert theo quy tắc 1.4.

## 9. Giai đoạn 5 — Đo lại và quyết định

Trình tự đo, mỗi lượt là screen 13 ca × 5 trên snapshot đóng băng:

1. Baseline tại `6ef2be81`.
2. Sau Giai đoạn 2.
3. Sau Giai đoạn 3.
4. Sau mỗi lần lặp của Giai đoạn 4.
5. Xác nhận cuối: đủ 34 ca × 3 trên một snapshot **mới**, để loại khả năng khớp quá mức với snapshot đóng băng.

Điều kiện thoát đề xuất cho D3:

- Mọi ca bán hàng đạt ≥4/5.
- Ca đối chứng thiếu nguồn (S16) handoff đúng 5/5.
- Không có request nào bị chặn trước HTTP trên toàn bộ các lần lặp.
- Không có PASS sai trên bộ kiểm verifier tập trung.
- Tỷ lệ lượt "đạt nhờ code" được báo riêng.

Điều kiện dừng hẳn: sau Giai đoạn 2–4 vẫn còn từ 3 ca chập chờn trở lên, và đo một bước trên cùng request cho thấy đó là dao động quyết định của owner. Khi đó không sửa prompt tiếp. Owner chọn một trong hai: so sánh model khác trên cùng bộ replay (D4), hoặc ghi nhận kết luận STOP cho cấu hình này theo amendment §10.6.

Kết quả đạt ở đây vẫn là bằng chứng development. Qualification chính thức, holdout mù và so sánh với C3 là bước sau, ngoài kế hoạch này.

## 10. Giai đoạn 6 — Dọn PR và ranh giới code

Chạy song song, không chặn các giai đoạn trên.

1. **Không mở rộng PR 392.** Các fix của kế hoạch này là PR nhỏ tách từ head `6ef2be81`, nhắm vào nhánh Phase C, vì code chưa có trên `main`.
2. **Tách PR 392 trước khi nghĩ tới merge** thành ba phần: runtime fix kèm test (110 file, +6.480 dòng), eval harness, và evidence của các lượt chạy (khoảng 187.000 dòng).
3. **Evidence.** Giữ trong repo báo cáo tóm tắt và kết quả từng ca; phần artifact lớn lưu ngoài repo kèm hash.
4. **Lớp trình bày cho owner.** Sau 2B, chuyển dần phần dựng request và projection còn lại từ `gemini-inference.mjs` (53 KB, 89 lần sửa) sang `apps/worker/src`. Transport tới provider ở lại thư mục eval cho tới khi production wiring được ủy quyền.
5. **CI.** Mỗi PR fix cần verification trên đúng head theo `SOLO_PREPROD_MINIMAL`. PR 392 hiện tự ghi CI trên head mới nhất chưa được xác minh.
6. **Quy trình.** Với fix thuần code có test, self-review là đủ theo profile hiện hành. Review độc lập dành cho thiết kế D1 và lượt xác nhận cuối, để giữ quota cho việc đo.

## 11. Thứ tự và phụ thuộc

| Bước | Phụ thuộc | Cần model | Đầu ra |
|---|---|---|---|
| Giai đoạn 0 | Raw trace ngoài repo | Không | Baseline, fixture |
| Giai đoạn 1 | D3 | Có, một lượt N=5 | Runner lặp, bảng phân loại ca |
| 2A | Không | Chỉ 2 request verifier | PR completeness và facet |
| 2B | 2A (dùng facet) | Không | PR owner view |
| 2C | D2, fixture Giai đoạn 0 | Không | PR ngân sách |
| Đo sau Giai đoạn 2 | 2A, 2B, 2C | Có, một lượt N=5 | Nhận hoặc revert |
| Giai đoạn 3 | D1, 2A, 2B | Có, một lượt N=5 | PR phục hồi |
| Giai đoạn 4 | Đo xong Giai đoạn 2 và 3 | Có, tối đa hai lượt N=5 | Prompt và schema mới |
| Giai đoạn 5 | Tất cả | Có, 34 ca × 3 | Quyết định thoát hoặc dừng |
| Giai đoạn 6 | Không | Không | PR đã tách |

2A, 2C và Giai đoạn 6 có thể làm song song. Tổng số lượt chạy model của cả kế hoạch là tối đa sáu lượt screen và một lượt đầy đủ.

## 12. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Raw trace không còn đủ để dựng fixture | Dựng lại bằng cách chạy lại ca tương ứng với capture bật; ghi rõ fixture nào là dựng lại |
| Snapshot đóng băng khiến kết quả khớp quá mức | Lượt xác nhận cuối dùng snapshot mới |
| Đổi phiên bản evidence làm hỏng dữ liệu đã lưu | Validator đọc được V2; kiểm tra đường lưu bền trước khi làm 2A |
| Bỏ declaration theo trạng thái làm owner thiếu tool giữa lượt | Quyết định một lần đầu lượt; tool ghi thành công đã trả `cartQuote` nên không cần `quote_cart` trong cùng lượt |
| Tin phục hồi che chất lượng model | Kế toán riêng, báo tỷ lệ ở mọi báo cáo, tập đóng ba loại |
| Quota verifier hết giữa lượt N=5 | Ưu tiên quota cho đo; giảm review độc lập theo mục 10.6 |

## 13. Những gì kế hoạch này chưa xác minh

- Chưa chạy test hay model nào. Số dòng và hành vi được đọc từ `6ef2be81`.
- Nội dung tool result thực tế của J4 và P09 chưa được đối chiếu với raw trace; Giai đoạn 0 bước 5 làm việc này.
- Chưa xác nhận harness native hỗ trợ ghim clock.
- Chưa xác nhận selection evidence có được lưu bền hay không.
- Mức tiết kiệm byte của từng bước ở 2C là kỳ vọng, phải đo ở bước 1 của 2C.

## 14. Trạng thái thực hiện, 11/11/2026

Nhánh `claude/sleepy-edison-4xadgb` = head PR 392 (`6ef2be81`) + tài liệu này + các commit dưới đây. Chưa mở PR.

### Đã làm

| Hạng mục | Commit | Kiểm chứng |
|---|---|---|
| 2A — nhãn completeness theo thực tế, giữ đủ màu/size của danh sách bị cắt | `083dc01e` | 6 test mới. Evidence lên V3; không lưu bền nên bỏ hẳn V2 |
| 2B — kết quả ghi giỏ cho owner đứng đầu bằng khối `outcome` | `80c18613` | 15 test mới; test trên wire thật xác nhận có tên màu, không còn hash |
| 2C — trần text và trần signature tách riêng; trả lời từ dữ kiện đã có khi continuation không dựng được | `0d77ea67` | 5 test mới; test ngân sách p04 vốn fail trên head PR nay pass |
| Verifier Gemini và chạy lặp theo ca (D3) | `bcd88a54` | 7 test mới; manifest đã đăng ký verifier mới |
| Công cụ đo và kết quả trên fixture | `064e9064` | [Báo cáo](../../apps/worker/evals/single-agent-commerce-qualification/fixture-sampling-20261111/REPORT.md) |

Toàn bộ suite worker sau thay đổi: 2.776 test unit và 904 test eval pass. Còn 6 unit và 6 eval fail, đều fail sẵn trên head PR 392 và không do nhánh này gây ra (xem dưới).

### Khác với kế hoạch ban đầu

- **Lọc schema theo trạng thái (2C bước 3) không làm.** `single-agent-commerce-callable.ts` đã lọc theo state ở từng lần sinh, và cố ý giữ các tool cần giỏ khi giỏ có thể được tạo trong cùng batch. Siết thêm sẽ phá đường "ghi rồi đọc trong một batch" đã thiết kế, để tiết kiệm khoảng 2 KB.
- **Chặn trước khi chạy batch (2C bước 5) được thay bằng đường lui sau khi chạy.** Khi transport từ chối dựng một continuation còn mở tool, lượt xin một lần câu trả lời qua pha final sẵn có, trong đúng trần 3 lần sinh của owner. Pha này không mang schema tool và không mang lượt tool có chữ ký. Đây không phải tin do code viết: vẫn là owner viết, vẫn qua verifier và final gate, nên không thuộc phạm vi D1.
- **Trần signature là 65.536 byte**, không phải 32 KiB như dự tính: một test hồi quy sẵn có mang chữ ký 37 KiB.
- **Evidence V2 không cần đọc tương thích**: evidence chỉ sống trong một lượt, không nằm trong `packages/database`.

### Phát hiện thêm khi thực hiện

- Trên head PR 392, **6 test eval đang fail**, trong đó có ba test hồi quy ngân sách của chính bản sửa 06/11: envelope p04 vượt trần, schema tool không còn tiết kiệm đủ 4 KiB, baseline contract đã cũ. Các bản vá sau 06/11 làm phình lại prompt và schema mà không ai chạy lại suite. Sau 2C còn lại hai test thuộc nhóm này; chúng thuộc Giai đoạn 4.
- Owner trước đây **không thấy tên màu** trong kết quả `add_to_cart` thiếu màu: chỉ có `availableColors: []`, hash của lựa chọn và một tham chiếu content-hash sang mục sản phẩm. Điều này đã được xác nhận bằng cách dựng wire thật, không còn là suy luận.
- 6 test unit fail sẵn thuộc Track B release evidence và pipeline ảnh ffmpeg, không liên quan Phase C.

### Số đo với model thật

Chi tiết và giới hạn ở báo cáo fixture. Tóm tắt:

- Trên fixture một sản phẩm, code **trước khi sửa đã đạt 9–10/10** ở cả ba kịch bản, nên số đo này **không chứng minh** 2A và 2B sửa được lỗi J4 và S04 của PR 392. Hai lỗi đó không tái hiện được ở đây.
- Khác biệt đo được: sau 2B, owner nêu rõ màu nào là hàng đặt trước ở 7/10 lượt so với 3/10.
- Verifier Gemini: 0/20 draft sai lọt qua, 20/20 draft đúng được gửi, trên bộ 8 draft nhỏ.
- Chữ ký thật của một vòng tool đo được 12.928 byte.

### Chưa làm và điều kiện để làm

| Việc | Vì sao chưa làm | Cần gì |
|---|---|---|
| Giai đoạn 0 bước 4–5: fixture từ raw trace, đối chiếu tool result thật của J4/P09 | Raw trace nằm ngoài repo | Máy đang giữ raw trace |
| Baseline và lượt đo N=5 trên 13 ca | Không có `WORLD.json`; capture cần Qdrant, PostgreSQL và Redis của runtime | Chạy trên máy có snapshot. Harness đã nhận `repetitions` 1–10; các script prepare/seal/launch ngoài repo cần truyền số lần lặp và gọi `repetition-summary.mjs` |
| Chạy lại bộ SAFETY 12+12 với verifier Gemini | Cùng lý do | Cùng điều kiện; cần làm trước khi dựa vào verifier mới |
| Giai đoạn 4: viết lại prompt và mô tả tool | Kế hoạch cấm nhận thay đổi prompt khi chưa có lượt đo N=5 trên bộ ca thật | Sau lượt đo của Giai đoạn 2 |
| Giai đoạn 5 và 6 | Phụ thuộc các việc trên | — |
| Xác nhận harness native ghim được clock | Chưa kiểm tra được khi không có world | Việc đầu tiên khi có snapshot |

Hai điểm cần lưu ý khi chạy tiếp: `owner-decisions.json` đã đổi nên mọi config đã seal trước đó không còn khớp `decisionHash`; và `manifest.json` nay đăng ký verifier Gemini nên `runtimeHash`/identity của candidate cũng đổi. Cả hai đều cần `init` và `seal` lại.

## 15. Cập nhật 12/11/2026, sau lượt chạy 65 lần thử và review ở `e6cf2884`

Lượt đo N=5 trên 13 ca đã có ([review 122 lượt](../../apps/worker/evals/single-agent-commerce-qualification/convergence-sol-followup-run-20261112/REVIEW.md)). Trong 65 lần thử của đợt Gemini, 16 lần mất khách vì verifier, code hoặc transport: 10 do verifier chặn nhầm câu xác nhận có biên nhận, 2 do sai tham số tool, 2 do provider trả đầu ra hỏng, 2 do trùng khóa phạm vi tồn kho.

### Quyết định của owner, 12/11/2026

- Verifier quay về **GPT-6.1 Sol High**. Verifier Gemini Flash Lite sai cả hai chiều trên dữ liệu thật; bộ thử 8 draft trên fixture ở mục 14 đã không bắt được điều này.
- **Cho thử lại đúng một lần** khi provider không trả nội dung dùng được.
- Hỗ trợ giá trước khi có giỏ: owner chọn **phương án B** (xét hỗ trợ ngay trên mục tiêu báo giá và giữ lời khi tạo giỏ). Chưa làm; xem "Phương án B cần gì" bên dưới.
- Ảnh khi báo giá từ hai mẫu trở lên: **gửi ảnh cả hai.** Đây là hành vi hiện có của code, không cần sửa.

### Đã làm

| Hạng mục | Commit | Ca liên quan |
|---|---|---|
| Verifier về Sol High; thử lại một lần; lệnh sai tham số trả lỗi cho owner sửa | `c8f045bb` | P08, checkout, P07, J2, P06 |
| Tồn theo size có khóa phạm vi riêng | `3f7f3649` | P09 |
| Kết quả ghi giỏ bị từ chối chỉ sang báo giá khi khách hỏi giá | `620f03bf` | J1 |

Suite worker sau các thay đổi: 2.796 test unit và 911 test eval pass; 6 unit và 6 eval fail như trước, không có lỗi mới.

### Chưa làm

- **S08 còn lại là việc của lời văn.** Quy tắc ảnh đã được owner xác nhận. Lượt mới tư vấn một mẫu, không nêu mẫu kia và bỏ thông tin hàng đặt trước, trong khi ảnh có cả hai; phần này thuộc Giai đoạn 4.
- **Size Engine đánh giá size khách nhắc tới, và trạng thái tồn theo từng size (P07).** Chạm vào claim `SIZE_FIT`; chưa bắt đầu.
- **Hỗ trợ giá trước giỏ (J4), phương án B.** Chưa bắt đầu, vì cần owner cho phép sửa bất biến giao dịch (xem dưới).
- **Đo lại.** Các bản sửa ngày 12/11 chưa có số đo với model. Hành trình checkout với Sol mới được chấm lại câu xác nhận, chưa chạy lại trọn vẹn.

### Phương án B cần gì

Lời hứa hỗ trợ trước giỏ chỉ có giá trị nếu giỏ tạo sau đó mang đúng mức hỗ trợ ấy. Ba chỗ trong lớp giao dịch hiện ngăn điều này, và cả ba đều là bất biến được cài có chủ đích:

1. `packages/chat-runtime/src/sales-cycle-runtime.ts`: tin chê giá chỉ được công nhận nếu đến **sau** thời điểm tạo giỏ (`notBefore: cart.createdAt`). Quy tắc này chặn việc dùng lại tin cũ để xin hỗ trợ cho một giỏ mới.
2. `packages/database/src/realtime-runtime.ts`: giỏ vừa mở phải ở trạng thái `READY`, chưa có lời chê giá nào được ghi nhận; khác đi thì transaction bị từ chối (`CART_OPEN_NEGOTIATION_MISMATCH`).
3. `packages/contracts/src/v3/sales-cycle.ts`: lệnh thương lượng chỉ hợp lệ khi đã ở bước có giỏ.

Hai gói đầu dùng chung với runtime đang chạy trên `PREPROD_TEST_PAGE`. Phương án C (ghi nhận lời xin rồi tự áp khi tạo giỏ) vướng đúng ba chỗ này; nhận định trước đó rằng C "dùng lại engine hiện có" là sai. Chỉ phương án A không cần sửa lớp giao dịch.

Thiết kế đề xuất cho B, nếu được phép:

- Trạng thái bán hàng có thêm một bản ghi tùy chọn "lời xin hỗ trợ trước giỏ" (tin nguồn, thời điểm, hạn dùng). Trạng thái lưu dạng JSON mã hóa nên không cần migration.
- Lệnh thương lượng hiện có nhận thêm cờ bật riêng cho trường hợp chưa có giỏ; không bật thì hành vi giữ nguyên từng byte, nên đường C3 hiện hành không đổi. Dùng lại loại lệnh cũ nên không phải sửa ràng buộc `command_kind` trong cơ sở dữ liệu.
- Khi tạo giỏ, bản ghi được tiêu thụ đúng một lần bằng một sự kiện thương lượng thứ hai ngay sau khi mở giỏ; giỏ vẫn mở ở `READY` như bất biến số 2 yêu cầu. Chỉ quy tắc thời điểm ở số 1 được nới, và chỉ cho đúng bản ghi này.
- Trước giỏ chỉ cấp mức hỗ trợ thứ nhất; mức cuối vẫn cần có giỏ.
- `quote_product` tính tổng theo mức hỗ trợ đó để owner nói được con số.

Hai tham số kinh doanh cần owner chốt: lời hứa có hạn bao lâu (đề xuất bằng thời hạn giỏ, 30 phút), và có giới hạn ở mức hỗ trợ thứ nhất hay không (đề xuất có).

Việc này nên là một PR riêng, có test trên PostgreSQL thật và đối chứng hành vi với đường C3 hiện hành.

## 16. Kết quả chạy trên d963fd36, 12/11/2026

Đã thực thi 40 lần thử, ghi nhận đủ 84 lượt trên cùng source và snapshot. Checkout với Sol High đi đủ 7 lượt ở cả ba lần. Các lỗi lặp ở J1, J2, J4 và P07 vẫn ảnh hưởng tới bán hàng. J2 lần 4 xác nhận model có thể sửa lệnh sau khi tool từ chối tham số, còn J2 lần 2 phát hiện nhánh thử lại đầu ra hỏng chưa nhận được mã lỗi từ adapter. Kết quả kiểm tra phát triển giữ đề xuất **STOP**. [Lịch sử hội thoại](../../apps/worker/evals/single-agent-commerce-qualification/latest-head-model-run-20261112/CONVERSATIONS.md) · [Review và kết luận](../../apps/worker/evals/single-agent-commerce-qualification/latest-head-model-run-20261112/REVIEW.md)

## 17. Cập nhật sau review 84 lượt ở `e2e0b366`

Checkout đi đủ 7 lượt ở cả ba lần với verifier Sol High. Sáu handoff làm gián đoạn tư vấn: J2 ba lần, J4 hai lần, P07 một lần.

### Đã làm

| Việc | Commit | Ca liên quan |
|---|---|---|
| Thử lại một lần nay chạy được trên đường adapter thật | `c014fd5c` | J2 lần 2 |
| Phương án A cho lời xin hỗ trợ trước giỏ | `eafcfaed` | J4 |

Bản "thử lại một lần" ở `c8f045bb` có lỗi: vòng điều phối so `error.message` với mã lỗi cụ thể, trong khi adapter Gemini đổi message thành `PROVIDER_ERROR` và ghi mã ở `telemetry.failureCode`. Test lúc đó ném lỗi bằng tay nên không bắt được. Test mới đi qua adapter thật và fail trên code cũ.

Phương án A giữ nguyên quy tắc chỉ xét hỗ trợ khi đã có giỏ. Kết quả `record_negotiation` bị từ chối và kết quả báo giá trước giỏ cùng mang một câu do code viết: chưa xét được hỗ trợ, không hứa và không phủ nhận, khách chọn đủ màu và size để lên giỏ rồi nhắn lại lời xin. Phần chính sách dùng chung cho hai model ghi rõ một set hoặc combo tính là 1 đơn vị của ưu đãi mua nhiều.

### Còn lại, theo mức ảnh hưởng tới bán hàng

| Lỗi | Tần suất ở lượt này | Hướng xử lý | Cần quyết định |
|---|---|---|---|
| J2: HTTP 429 từ provider làm mất cả hội thoại | 1/4 | Thử lại một lần sau một khoảng chờ ngắn cho 429 và 5xx | Có: quy tắc hiện chỉ thử lại khi provider trả nội dung hỏng |
| J2: tool từ chối số đo hai lần, hết vòng tool, model tự chọn S | 1/4 | Khi lượt đã xin tư vấn size và lệnh ghi số đo vừa thành công, code tự chạy lại phép tính size đang chờ | Không |
| J1: khách hỏi tổng, bot hỏi lại màu | 1/3 | Code giữ "món khách đang muốn mua nhưng chưa đủ lựa chọn" và đưa sẵn tổng tạm tính vào context | Có: thêm một trạng thái lưu qua lượt |
| P07: đề xuất quần L trái kết quả M/M | 1/3 | Size Engine đánh giá size khách nhắc tới và trả lý do | Không, nhưng chạm claim `SIZE_FIT` |
| P09: báo giá hai mẫu qua `read_product` thì không kèm ảnh | 1/3 | Quy tắc ảnh tính theo giá đã nêu, không theo tool đã gọi | Không: owner đã chốt gửi ảnh cả hai |
| S04: nói "sẵn size S đến XL" ngay sau khi nêu hai màu | 1/3 | Trả tồn theo từng màu và size thay vì gộp theo offer | Không |
| S08, S09, S15, giọng văn J2 | lặp lại | Viết lại prompt (Giai đoạn 4) | Không |

Phương án B cho hỗ trợ trước giỏ vẫn chờ owner cho phép sửa bất biến giao dịch (mục 15).

## 18. Cập nhật 12/11/2026, sau quyết định "1 ok, 2 ok, luôn push thẳng lên PR"

### Quyết định của owner

| Việc | Quyết định |
|---|---|
| Thử lại một lần khi provider trả HTTP 429 hoặc 5xx | Duyệt |
| Thêm trạng thái lưu qua lượt cho món khách muốn mua nhưng chưa đủ lựa chọn | Duyệt |
| Push lên nhánh PR 392 | Luôn push thẳng, không hỏi lại |

### Đã làm

| Việc | Commit | Ca liên quan |
|---|---|---|
| Thử lại một lần sau 2 giây khi owner nhận HTTP 429 hoặc 5xx | `fc02f13c` | J2 lần 1 |
| Ghi số đo xong thì code tự tính size đang chờ | `319a7536` | J2 lần 3 |
| Giữ món khách muốn mua nhưng thiếu màu hoặc size cho lượt sau, kèm lệnh báo giá | `8340d188` | J1 lần 3 |
| Tồn theo từng màu khi lần đọc không lọc màu | `191ecdc9`, `14483849` | S04 lần 3 |

**Thử lại HTTP.** Mỗi lượt vẫn chỉ có một lần thử lại, dùng chung cho đầu ra hỏng và HTTP 429/5xx, và tính vào giới hạn ba lần sinh của owner. HTTP 4xx khác, timeout và mọi đầu ra đã parse được vẫn không thử lại. Chỉ áp dụng cho owner, không áp dụng cho verifier.

**Size đang chờ (J2).** Ở lần 3, hai lệnh `recommend_size` kèm số đo bị từ chối vì trích dẫn sai, model sửa bằng `apply_customer_state` ở vòng tool cuối và không còn vòng nào để hỏi lại size. Nay lệnh xin size bị từ chối vì số đo chưa ghi được sẽ được nhớ trong lượt. Khi một lệnh ghi sau đó thành công, code chạy phép tính size đang chờ và trả kết quả trong `sizeEvaluations` của chính lệnh ghi. Claim `SIZE_FIT` được tạo như khi model tự gọi. Nếu cùng batch đã có lệnh xin size thì không tính hai lần.

**Món đang chờ (J1).** Khi `add_to_cart` bị từ chối chỉ vì khách chưa chọn màu hoặc size, các dòng đã yêu cầu được lưu vào `pendingPurchase` của hồ sơ khách. Lượt sau owner thấy các dòng này kèm đúng tham số `quote_product` và câu dẫn: khách hỏi giá hay tổng thì báo giá trước, không hỏi lại màu. Ghi chú bị xóa khi một lệnh giỏ thành công, hết hiệu lực sau 24 giờ, và chỉ hiện khi sản phẩm đang được gắn trong lượt.

Khác với đề xuất ở mục 17, **code không tính sẵn tổng tạm tính**. Số lượng khách muốn lấy chỉ đọc được từ hội thoại. Một dòng `add_to_cart` bị từ chối không phải là số lượng đơn hàng, như ghi chú sẵn có ở `quoteRoute`. Tổng do code tự tính có thể sai số lượng mà vẫn mang dáng vẻ đã xác minh. Vì vậy code chỉ đưa lệnh báo giá cụ thể, model vẫn là bên gọi.

Lưu ý khi triển khai: `CustomerProfileV1` là schema strict. Bản phát hành cũ hơn thay đổi này không đọc được hồ sơ đã có trường `pendingPurchase`, nên rollback qua mốc này cần xóa trường đó trước.

**Tồn theo màu (S04).** Lần đọc không lọc màu trả `confirmedInStockSizes` là các size còn hàng ở ít nhất một màu. Model đọc thành "sẵn S đến XL" cho cả màu đặt trước, và verifier không có căn cứ để chặn. Nay khi các màu của offer khác nhau về tồn, kết quả và literal dùng chung cho verifier có thêm `byColor` và nhãn `AT_LEAST_ONE_COLOR_NOT_EACH`. Không thêm gì khi đã lọc màu hoặc các màu giống nhau.

### Chưa làm, kèm lý do

| Lỗi | Lý do chưa làm | Việc cần để làm |
|---|---|---|
| P09: báo giá hai mẫu qua `read_product` thì không kèm ảnh | Hướng "tính theo giá đã nêu" ở mục 17 không làm được: code không biết câu trả lời có nêu giá hay không, chỉ verifier đọc câu chữ. Gắn nghĩa vụ ảnh vào mọi `read_product` ở lượt mở đầu thì luồng tìm sản phẩm (1 tìm + 2–3 đọc + ảnh) vượt giới hạn 6 lệnh và thành handoff | Owner chọn: giữ nguyên, hoặc hướng model dùng `quote_product` khi báo giá cho khách mới (sửa prompt, cần đo) |
| P07: đề xuất quần L trái kết quả M | Quy tắc hiện tại cố ý không cấp size thay thế từ "size thường mặc". Đổi quy tắc là quyết định nghiệp vụ và sửa Size Engine dùng chung với runtime r31.3 | Owner quyết định bot có được nhắc size khách quen mặc như một lựa chọn hay không |
| S08, S09, S15, giọng văn J2 | Sửa prompt chỉ làm sau khi có số đo N=5 | Lượt chạy mới |
| Phương án B cho hỗ trợ trước giỏ | Chờ owner cho phép sửa ba bất biến giao dịch | Mục 15 |

### Trạng thái kiểm chứng

Bộ test worker: 2.815 unit pass, 925 eval pass, không có lỗi mới; 6 unit và 6 eval fail có từ trước. Test `packages/contracts`: 254 pass. Chưa có số đo với model cho bất kỳ thay đổi nào ở mục 17 và 18. `owner-decisions.json` đã đổi nên harness cần `init` và `seal` lại trước lượt chạy kế tiếp.

## 19. Cập nhật 13/11/2026: ảnh cho hai mẫu và size khách quen mặc

### Quyết định của owner

| Việc | Quyết định |
|---|---|
| P09: ảnh khi báo giá hai mẫu qua `read_product` | Làm bản giới hạn hai mẫu |
| P07: size khách quen mặc | Bot được nhắc |

### P09: ảnh cho hai mẫu ở lượt mở đầu

Ở lượt mở đầu, khi owner đọc giá đúng hai sản phẩm bằng `read_product`, code lấy thêm một ảnh chung cho mỗi sản phẩm trước khi owner viết câu trả lời. Đây là phần thêm, không phải nghĩa vụ: không đủ lệnh hoặc chỗ ảnh cho cả hai thì bỏ qua, tra ảnh lỗi không làm hỏng lượt, và câu trả lời không bao giờ bị giữ lại vì nó. Một mẫu hoặc từ ba mẫu trở lên giữ quy tắc cũ.

Bảng số lệnh ở lượt trả lời trước thiếu bước chuẩn bị: mỗi sản phẩm đã gắn sẵn ở đầu lượt tốn một lệnh đọc. Ca P09 vì vậy dùng đúng 6 lệnh (2 chuẩn bị, 2 đọc, 2 ảnh), tức là sát giới hạn. Nếu model gọi thêm bất kỳ lệnh nào thì không có ảnh, và câu trả lời vẫn được gửi.

Rủi ro còn lại, chưa đo được: model đọc hai mẫu nhưng chỉ tư vấn một mẫu thì ảnh của mẫu kia vẫn đi kèm.

### P07: size khách quen mặc

Quy tắc mới: sau size đề xuất theo kết quả, câu trả lời được nhắc size khách tự nói là quen mặc như lựa chọn theo thói quen của khách. Size đó vẫn không phải kết quả tính, không phải size thay thế, không phải size đã chọn, và không được mô tả là vừa. Size Engine và claim `SIZE_FIT` không đổi. Quy tắc được ghi giống nhau ở ba chỗ: câu dẫn của kết quả size, prompt owner và prompt verifier.

Đây là thay đổi prompt trước khi có lượt chạy N=5 đầy đủ, vì quyết định nghiệp vụ không thể có hiệu lực nếu verifier vẫn giữ quy tắc cũ.

Số đo phía owner (Gemini 3.5 Flash Lite, fixture `QU714`, hồ sơ có sẵn eo 74 và mông 95, kết quả tính là M, khách nói "chị hay mặc size L", N=8, verifier giả luôn PASS nên kết luận đọc từ câu nháp):

| | Prompt cũ | Câu chữ đầu tiên | Câu chữ đã dùng |
|---|---|---|---|
| Gọi `recommend_size` | 4/8 | 1/6 | 5/8 |
| Có kết quả M và nêu M trước | 4/4 | 0/0 | 5/5 |
| Nhắc L mà không nói L vừa | 4/4, trong đó 3 lượt mời chọn L nếu thích rộng | không có | 5/5 |
| Không gọi tool nhưng vẫn nhận L hoặc kết luận vừa | 2/8 | 4/6 | 1/8 |

Câu chữ đầu tiên của tôi bỏ sót ý "vẫn gọi `recommend_size`" và khiến model bỏ lệnh tính size, nên đã thay trước khi commit. Với prompt cũ model vẫn nhắc L ở mọi lượt có kết quả, và đó là câu Sol chặn ở P07.

Chưa đo: verifier Sol có cho qua câu nhắc size quen mặc theo quy tắc mới hay không, và có còn chặn đúng các câu nhận L khi không có kết quả hay không. Fixture ở đây không chạy được Sol.

### Trạng thái kiểm chứng

Bộ test worker: 2.822 unit pass, 926 eval pass, không có lỗi mới; 6 unit và 6 eval fail có từ trước. Hash prompt trong `manifest.json` và `owner-decisions.json` đã đổi nên harness cần `init` và `seal` lại.

## 20. Kết quả N=5 trên 2877c0a9, 13/11/2026

Đã init và seal lại theo prompt và owner decisions mới. Chạy đủ 13 ca × 5 lần, ghi nhận 135 lượt trên cùng snapshot. Có 7/12 ca bán hàng đạt ít nhất 4/5. S16 handoff đúng 4/5. Đề xuất **STOP** vì J1 và J4 có lượt tự chọn màu để ghi giỏ, P07 còn gắn size quen mặc với độ thoải mái, và S16 chưa đạt ngưỡng. P09 kèm đúng ảnh của cả hai mẫu trong cả hai lần báo giá qua `read_product`. [Review và số liệu theo ca](../../apps/worker/evals/single-agent-commerce-qualification/convergence-n5-run-20261113/REVIEW.md) · [Lịch sử 135 lượt](../../apps/worker/evals/single-agent-commerce-qualification/convergence-n5-run-20261113/CONVERSATIONS.md)

## 21. Review lượt N=5 trên `2877c0a9` và sửa hai lỗi do thay đổi ở mục 18–19 gây ra

### Kết quả lượt chạy theo từng thay đổi

| Thay đổi | Bằng chứng trong lượt chạy | Kết luận |
|---|---|---|
| Ghi số đo xong thì tự tính size (J2) | J2 5/5, trước đó 1/4 | Giữ |
| Thử lại HTTP 429/5xx | Không phát sinh lỗi provider | Chưa có bằng chứng từ model |
| Phương án A (J4) | 3/3 lượt đi tới câu hỗ trợ đều giữ đúng quy tắc | Giữ |
| Món đang chờ (J1) | Không lần nào chạy tới: model tự chọn màu nên `add_to_cart` không bị từ chối | Chưa có bằng chứng |
| Ảnh cho hai mẫu (P09) | P09 2/2 lần báo giá hai mẫu có đủ ảnh. Nhưng S09 lần 2, S04 lần 4–5 handoff ngay sau hai lệnh đọc | Giữ quy tắc, đổi thời điểm |
| Tồn theo từng màu (S04) | J1 0/5 và J4 3/5: model coi màu be là không mua được, chỉ mời màu trắng và tự ghi trắng vào giỏ | Gỡ bỏ |
| Size khách quen mặc (P07) | 5/5 được gửi, cả năm nêu M trước. 4/5 gắn L với mặc thoải mái | Siết câu chữ phía owner |

### Lỗi 1: tồn theo từng màu làm model tự chọn màu

`byColor` liệt kê màu be với danh sách size còn hàng rỗng. Nhãn trạng thái đặt trước đã bị tôi bỏ ở `14483849` để tránh hai nhãn mâu thuẫn, nên model chỉ còn thấy "be: không có size nào". Hệ quả trong lượt chạy:

- J4 lần 2–3 và J1 lần 2, 5: chỉ mời màu trắng, không nhắc màu be.
- J1 lần 1, 2, 5: tự thêm hai áo trắng khi khách mới nói số lượng và size.
- J1 lần 3: câu bị chặn viết "màu be hiện không có sẵn size M và L"; verifier dẫn đúng trường `unlistedSizeMeaning` của dữ liệu này.
- J1 lần 4, J4 lần 4–5: tự thêm áo trắng ngay lượt đầu, sau đó bước chuẩn bị ảnh thất bại và thành handoff khi giỏ đã đổi.

Ở `e2e0b366`, không có `byColor`, cả 6 lần J1 và J4 đều gọi `add_to_cart` không màu, bị từ chối, rồi hỏi khách chọn giữa trắng và be. Đã gỡ ở `8bcdee32`; hai file trở về đúng trạng thái trước `191ecdc9`. Lỗi S04 ban đầu ("sẵn S đến XL" ngay sau khi nêu hai màu, 1/3) quay lại trạng thái chưa xử lý.

### Lỗi 2: ảnh cho hai mẫu lấy mất lệnh model còn cần

Ảnh được lấy trước lần sinh kế tiếp của owner. Với hai sản phẩm gắn sẵn, lượt dùng hết đúng 6 lệnh (2 chuẩn bị, 2 đọc, 2 ảnh) và owner không còn lệnh nào. S09 lần 2 cần `read_policy` nên handoff `POLICY_UNAVAILABLE`; S04 lần 4–5 handoff `PRODUCT_AMBIGUOUS` sau đúng hai lệnh đọc. Đây là suy luận từ dấu vết tool, vì artifact thô của từng lượt không nằm trong repo. Ở `a391ed28` ảnh chỉ được lấy sau khi owner đã viết câu trả lời, từ số lệnh còn thừa.

### P07: câu chữ

Ba chỗ ghi quy tắc ở mục 19 chỉ cấm nói size quen mặc "vừa, hợp hơn". Tiêu chí chấm của lượt chạy cấm cả việc gắn size đó với độ thoải mái. Ở `9ddbee04` prompt owner và câu dẫn kết quả size ghi rõ thêm "rộng hay thoải mái hơn". Prompt verifier chưa đổi: nếu verifier chặn cả ý này thì mỗi lần owner lỡ lời sẽ thành handoff thay vì một câu trả lời được gửi, và đó là lựa chọn của owner.

Đo phía owner trên fixture (bộ áo quần, câu khách của P07, N=10, verifier giả):

| | Câu chữ mục 19 | Câu chữ đã siết |
|---|---|---|
| Gọi `recommend_size` cho cả hai phần | 7/10 | 9/10 |
| Có kết quả và gắn L với thoải mái | 0/7 | 0/9 |

Fixture không tái hiện được lỗi của lượt chạy thật (0/7 so với 4/5), nên phép đo này chỉ cho thấy câu chữ mới không làm giảm việc gọi tool. Tác dụng thật cần lượt chạy kế tiếp.

### Còn mở

| Việc | Ghi chú |
|---|---|
| Giỏ đã ghi rồi mới handoff vì ảnh | Có từ trước; lượt này lộ ra vì model tự chọn màu. Vẫn có thể xảy ra khi khách chọn màu thật ở lượt mở đầu |
| Không có gì ngăn `add_to_cart` với màu khách chưa chọn | Verifier cho qua vì có biên nhận. Cần quyết định của owner về cách chặn |
| S16 4/5 | Lần 5 hỏi khách chọn set quần hay set váy thay vì handoff |
| S15 1/5, giọng văn J2 và S08 | Sửa prompt (Giai đoạn 4) |
| S04 "sẵn S đến XL" | Chưa xử lý lại sau khi gỡ `byColor` |

### Trạng thái kiểm chứng

Bộ test worker: 2.825 unit pass, 926 eval pass, không có lỗi mới; 1 unit và 6 eval fail có từ trước. Hash prompt owner và `owner-decisions.json` đã đổi nên harness cần `init` và `seal` lại.

### Quyết định của owner sau review, 13/11/2026

**P07: verifier không chặn câu gắn size quen mặc với độ thoải mái.** Verifier chỉ chặn khi câu trả lời nói size quen mặc vừa, hợp hơn hoặc là size shop đề xuất. Việc tránh gắn nó với "rộng hay thoải mái hơn" do prompt owner dẫn hướng và không làm dừng một câu trả lời. Prompt verifier giữ nguyên như ở `0145237b`.

Khi chấm lượt chạy kế tiếp, một câu P07 nêu đúng size đề xuất rồi nhắc size quen mặc kèm ý thoải mái là điểm cần cải thiện về câu chữ, không phải lượt hỏng.
