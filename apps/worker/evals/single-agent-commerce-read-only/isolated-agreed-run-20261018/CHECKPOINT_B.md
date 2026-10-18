# So sánh hai thay đổi — 66 kết quả, 2026-10-18

**Recommendation: STOP.** Đủ 12/12 job, 66/66 kết quả đăng ký; chưa chứng minh cải thiện ổn định. Không chạy full45/conditional16 hoặc sửa tiếp sau khi xem kết quả. A OWNER_BYPASS; B sales/live STOP. Đây không phải run A2/A3 mới.

42 lượt thuộc 6 hành trình stateful và 24 lượt B1 độc lập, không phải 66 hội thoại độc lập. Mỗi nhánh ba lần. Gemini 3.5 Flash Lite HIGH owner, GPT-6.1 Sol high verifier. [Frozen source/config/prompt/schema/corpus hashes](FROZEN_INPUTS.json). So sánh trong từng cặp; không gộp bốn source thành PASS cho HEAD. Live source, IDs và stochastic generation không được kiểm soát hoàn toàn; mẫu nhỏ không chứng minh nhân quả hoặc độ tin cậy.

## Kết quả khách thực sự nhận

| Nhánh | Source | USABLE | NEEDS_EDIT | UNUSABLE | OWNERSHIP_CONTROL | Fallback |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Giữ checklist checkout | `1bb66325` | 14 | 3 | 1 | 3 | 1/21 |
| Bỏ checklist khỏi owner context | `e8c9aae4` | 13 | 3 | 2 | 3 | 2/21 |
| Hướng dẫn tìm kiếm cũ | `bd086b78` | 8 | 0 | 4 | 0 | 4/12 |
| Phân biệt exact lookup / discovery | `a43c1944` | 8 | 1 | 3 | 0 | 2/12 |
| Tổng accounting, không phải acceptance chung | Bốn source | 43 | 7 | 10 | 6 | 9/66 |

Sáu NEEDS_EDIT ở checkout là **preview cũ** chỉ hiện `SV2447 size L ×2`, thiếu loại hàng/màu. Hai nhánh cố ý giữ cùng formatter để đo riêng context. Formatter mới `bd086b78` đã có deterministic tests nhưng không nằm trong hai source checkout; không quy sáu mục này thành hồi quy của bỏ checklist hoặc sửa lại formatter đã làm.

Search mới giảm fallback 4 xuống 2 nhưng số câu dùng được vẫn **8/12**: thêm một câu sân khấu được gửi nhưng cần sửa và một lượt HANDOFF vì snapshot đổi. Fallback giảm riêng lẻ chưa phải tiến bộ bán hàng.

Raw savepoint hoàn chỉnh `fb85aabf`; primary review khóa tại `7bfa3371` trước rejected drafts/verdict detail. Đọc actual history, reply, public context và committed state; không chấm theo keyword. Minor polish riêng lẻ không làm FAIL. OwnerAcceptance=null. [Toàn bộ 66 kết quả và lý do từng lượt](CONVERSATIONS_AND_REVIEW.md), [primary JSON](PRIMARY_REVIEW.json).

## Phần dùng được

- Cả sáu hành trình cuối cùng có đúng 2 áo Thạch Thảo/be/L; sửa số đo thành eo74/mông96 không làm đổi size khách đã chọn. Hai lượt mở giỏ thất bại vẫn giữ trong denominator dù lượt sau phục hồi.
- Những câu tổng tiền đã gửi đều đúng 978.100đ: 998.000đ tiền hàng, giảm49.900đ, ship30.000đ. Một câu đúng do code phục hồi sau draft sai tiền, không tính thành owner viết đúng.
- Lookup SD375 đúng mã và giá 6/6: áo929.000đ/cả set1.065.000đ. Control này chưa hồi quy.
- Ca lo nhiều ren đi tiệc ban ngày có5/6 outcome dùng được; lượt còn lại có draft hợp lý/PASS nhưng final gate chặn. Chấp nhận tư vấn thẩm mỹ “thanh thoát/sang/không rườm rà”, không ép phép thử riêng. Upsell set799k so với áo499k+váy449k có căn cứ.
- Ca giả lập POS không khả dụng giữ phần chất liệu/dáng5/6; không bịa giá hoặc hẹn tự quay lại. Đây là fixture nguồn lỗi, không phải kết luận shop thực tế thiếu toàn bộ dữ liệu.
- Code recovery giữ câu trả lời giỏ trong3 lượt sau malformed owner, verifier timeout hoặc draft sai tiền. Sáu private checkout dùng0 model request; sáu database thử nghiệm được dọn xong.

## Các lỗi và chuỗi nguyên nhân quan sát được

| Lượt | Actual outcome | Bằng chứng sau primary review |
| --- | --- | --- |
| checklist R1 / báo tổng | Fallback | Draft gọi998.000đ là số **sau khi giảm**49.900đ, rồi báo tổng978.100đ. Quan hệ trước/sau giảm sai dù tổng cuối đúng; verifier chặn có căn cứ. |
| no-checklist R1 / mở giỏ | Fallback, giỏ trống | Dùng field WAIST_CM/HIPS_CM thay vì measurements.* bị code từ chối; vòng tool thứ hai dùng sửa state và read lại. Tới lượt cuối mới gọi add_to_cart khi mode NONE; call không thực thi. |
| no-checklist R2 / mở giỏ | Fallback, giỏ trống | Read rộng rồi read AO không ràng be/M, không gọi add_to_cart. Draft nói size M có sẵn từ tồn tổng AO; verifier chỉ ra stock claim AO. Tồn tổng chưa chứng minh biến thể khách chọn. |
| search-exact R1 / sân khấu | Fallback | Nói mẫu thay Thanh Vũ/Khánh Trang “không lo bị lộ dưới đèn mạnh” dù nguồn chưa chứng minh. |
| search-exact R2 / sân khấu | Fallback | Dùng ren cotton/hai lớp để kết luận mẫu thay kín dưới đèn. Hai lớp chân váy không chứng minh độ kín áo; hai lớp áo cũng chưa xác nhận kết quả dưới đèn. |
| search-exact R3 / sân khấu | Fallback | Từ tơ mềm/thoáng kết luận áo Thạch Thảo “sẽ dễ lộ bên trong”. Verifier chỉ ra SV2447. |
| search-exact R3 / chân váy lẻ | Fallback | POS không khả dụng nhưng owner suy “shop bán nguyên set chứ không tách rời” từ thiết kế gồm áo/váy. Chặn đúng quy định bán hàng không có nguồn. |
| search-discovery R2 / sân khấu | Fallback | Read rồi search, sau đó gọi read_product ở lượt cuối dù tools=[], mode NONE, hết budget. Chưa có final draft hợp lệ, không phải verifier chặn ngôn ngữ. |
| search-discovery R3 / sân khấu | Fallback | Vẫn nói áo “mỏng nhẹ… sẽ hơi thấu quang và dễ lộ”; search instruction chưa sửa suy luận đặc tính. |
| search-discovery R2 / lo nhiều ren | HANDOFF, không lời trả trong B1 | Verifier PASS nhưng CURRENT_SNAPSHOT khác ID, revision vẫn1. Không lưu body current snapshot nên chưa biết trường nào đổi. Không kết luận giá đổi, model kém hay gate quá chặt chỉ từ hai ID. |

Một draft khác ở no-checklist R3 / đổi size-số lượng ghi **978.000đ** thay vì978.100đ. Verifier chặn đúng; code trả số đúng nên actual outcome vẫn USABLE. Hai sự kiện được code cứu còn lại là owner MALFORMED_RESPONSE và verifier timeout90s. Chúng vẫn nằm trong accounting.

### Context và tool execution

Cả hai nhánh checkout không tự hỏi PII trong actual replies đã gửi. Baseline cũng không tái hiện hành vi xin PII nên bỏ checklist chưa chứng minh lợi thế; không suy hai failure treatment là hậu quả nhân quả của xóa field.

Schema đã có enum đường dẫn và mô tả tiền tố measurements. Lượt cuối đã bỏ tool declarations và dùng NONE. Vì vậy thêm enum, bỏ tools ở lượt cuối hoặc nhắc lại cùng quy tắc đều là việc **đã có**, không phải fix mới. Trace chứng minh owner vi phạm contract/budget, chưa giải thích đầy đủ cơ chế nội tại model. Chưa có lý do thêm alias đoán field, default màu, regex hoặc retry.

### Search, nguồn và verifier

Baseline sân khấu thực sự search `set váy`, `set váy đi tiệc kín đáo`, `váy đi tiệc`. Treatment hai lần không search; một lần chỉ search `set váy` rồi read muộn. Chưa chứng minh bullet mới làm query mang nhu cầu tốt hơn; baseline đã có query theo nhu cầu dù prompt cũ exact-only.

Mô tả nguồn đã tới owner, không mất projection. Thiếu dữ liệu che phủ áo dưới đèn; mô tả hai lớp có khi thuộc chân váy. Model gộp chủ thể/đặc tính thành kết luận rộng hơn. Không sửa bằng cách nới verifier toàn bộ tư vấn thời trang.

Treatment R1 được gửi: “chất tơ mỏng nhẹ… có thể hơi thấu quang và dễ lộ”, rồi “Để yên tâm nhất… áo hai dây… nếu chị muốn… báo em”. Primary đã chấm NEEDS_EDIT: nguồn không mô tả độ mỏng/xuyên và quyết định đổi mẫu bị trả lại khách. Cảnh báo ánh sáng chung, gợi lớp mặc trong được phép; cần phân biệt với gán đặc tính cho chính mẫu áo. PASS câu “có thể” và FAIL câu “sẽ” không phải verdict trên cùng exact text, nên chưa chứng minh verifier ngẫu nhiên trên câu giống nhau. Cũng không dùng PASS này để tuyên bố hết assertion cần xem lại.

## Giọng văn và hướng xử lý

Đổi giỏ/báo tổng/nhận số đo thường gọn, đúng lượt. Nhắc hai số đo vừa sửa giúp kiểm thông tin; hai dòng giá SD375 giúp chọn hàng, không phải liệt kê vô ích.

Ba phần còn cứng: owner nói “hệ thống/chưa xác nhận chế độ bán lẻ”; lời tư vấn dồn “bay bổng/sang trọng/nhã nhặn/thanh thoát” và nhắc lại ngân sách; code nói “2 sản phẩm/màu BE/ghi nhận xác nhận mua hàng”. Không xử lý cả ba bằng gói prompt giọng văn: phần cuối là formatter. Các chỗ chưa mượt nhưng vẫn hữu ích chỉ ghi polish, không ép FAIL.

Đề xuất tiếp theo, **chưa triển khai**:

1. Giỏ: kiểm riêng lựa chọn → read đúng biến thể → action trong budget, dùng captured requests khi thử cách biểu diễn tool/state. Không thêm chỉ dẫn đã tồn tại. Diagnostic phạm vi read cần snapshot cố định thật; snapshot lịch sử nền chưa có nên vẫn NOT_RUN, không giả live là replay cũ.
2. Tiền: giữ nguyên số code tính, phân biệt subtotal/discount/total. Nếu sửa phục hồi câu báo tổng, kiểm khả năng tái dùng summary từ giỏ hiện hành đã xác minh; không regex sửa draft, không bỏ gate.
3. Sân khấu: kiểm quyết định search và nguồn nhận về trước một sửa prompt nữa. Chọn phương án mặc/phối hữu ích trong căn cứ hiện có, giới hạn ngắn đúng lo ngại khách; không lấy tơ mềm thành áo xuyên hoặc lớp chân váy thành áo kín, không hỏi lại ý đổi đã nêu. Query tốt chưa đủ cấp bằng chứng che phủ.
4. Nguồn lỗi: giữ “chưa biết offer” khác “không bán offer”. Treatment3/3 không bịa quy định nhưng chưa chứng minh ổn định vì không đổi riêng cơ chế này.
5. STALE: dùng diagnostic/readback hiện hữu giữ phần snapshot đổi ở lần kiểm có mục tiêu; chưa đủ evidence để nới gate.
6. Giọng: sửa đúng owner paragraph hoặc formatter tạo câu cứng; giữ câu đã gọn, không khôi phục gói voice rollback, không ép CTA/đánh đổi/mẫu câu hoặc thêm ví dụ bám case để đẩy điểm.

## Accounting và verification

168 generation requests:123 owner/45 verifier; tối đa1 upstream/invocation, retry0. Verifier36 PASS/8 FAIL/1 TIMEOUT; một PASS bị STALE. Ba SEND_ELIGIBLE là code recovery, không phải model PASS. [Metrics](METRICS.json), [request accounting](REQUEST_ACCOUNTING.json), [diagnosis](DIAGNOSIS.json).

4 lỗi generation/168 (2,38%):2 tool-mode violations HTTP200,1 malformed completion HTTP200,1 verifier timeout. Không gọi ba HTTP200 đó là lỗi mạng/quota. Verifier timeout1/45 (2,22%). Latency verifier p50/p95=7,56s/23,37s; added verification=9,10s/26,41s; whole-turn=20,36s/55,52s, không gồm toàn bộ scheduler/build/session startup. Provider báo762.826 input/76.829 output tokens, usage167/168; cost NOT_EXPOSED.

Terminals:38 SEND_ELIGIBLE,9 FALLBACK,6 NO_SEND của private code (đều có code message),13 HANDOFF (6 chốt mua+6 xin nhân viên+1 STALE). Fallback13,64%. Không coi mọi HANDOFF/NO_SEND là không trả lời hoặc đã có nhân viên phục vụ.

Audit109 raw hashes,40 source blobs,3 helper hashes,45 verifier bindings/35 exact model PASS send matches. Không thấy evaluator/private-fixture leak trong captured requests; private turns0 model requests;6 DB đã drop; sendEnabled=false. New checkout bridge vẫn chỉ có deterministic proof: harness tự cấp private fixture không chứng minh owner chủ động mời intake. Preview mới không nằm trong checkout sources này. Không full population, deploy, POS/staff/live-delivery claim.

Byte audit ban đầu của cases.b1.json thất bại do Git-normalized line endings khác temp dispatch file. File thực thi vẫn đúng frozen SHA và cùng records; giữ nguyên tại metadata/dispatched-cases.json, metadata dùng -text. Không thay input/nhãn hoặc chạy lại. [Audit bổ sung và giới hạn](SOURCE_AND_WIRE_AUDIT.json).

Staged whitespace check sau đó báo CR cuối dòng trong file dispatch cần giữ nguyên bytes. Shell vẫn tiếp tục commit/push dù check đó thất bại; đã sửa bằng thuộc tính `whitespace=cr-at-eol` chỉ cho metadata giữ CRLF, không sửa raw bytes hoặc tắt các kiểm whitespace khác. Chạy lại diff check cho toàn bộ khoảng thay đổi và kiểm committed raw/corpus hashes trước khi chốt báo cáo.

Commands thực sự chạy: `python C:/Users/nguye/AppData/Local/Temp/c3-isolated-agreed-20261018-run.py`; bốn preflight/12 job có exact argv và exit0 trong [commands](metadata/commands.json). Hai nhánh stateful build worker exit0. Fresh source readback PASS/providerGenerations0; B1 preflight chỉ config readiness, không tự nhận đã kiểm kết nối.

Sau provider chạy `node .../c3-isolated-agreed-20261018-collect.mjs`, `...-render-primary.mjs`, `...-audit.mjs`, `...-diagnose.mjs`, exit0; kiểm Git/helper/corpus hashes/tools NONE theo audit bổ sung và `git diff --check`. Không chạy lại suite không bị thay đổi hoặc gán kết quả test implementation cũ thành test mới. Prior deterministic results nằm tại [implementation](../../../../../docs/specs/c3-phase-b-agreed-fixes-implementation-20261018.md).

Complexity delta: chỉ artifacts/review/accounting/bảo toàn bytes metadata; không thay runtime/config, role, parser, tool, framework, durable state, production gate, repair loop hoặc retry. Dừng ở báo cáo này trước một run khác.
