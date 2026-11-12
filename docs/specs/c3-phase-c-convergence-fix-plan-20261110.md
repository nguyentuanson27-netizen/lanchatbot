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
