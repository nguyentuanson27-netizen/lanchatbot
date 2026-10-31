# Review root cause sau full model run — 31/10/2026

Review base `5a011a55dcea7755ea41d2f3db0b9834c3fcef59`; model run source `e43e1b75c6ba3da2b3f77243e17bd6045131731a`. Đã đọc22ca/34turns, raw provider requests/tool history, prompt/schema hiện hành và hai frozen worlds trước/sau. Thực hiện thêm **offline deterministic probes**, không provider/network/effect/PG/model rerun; runtime/source shop/prompt/grades giữ nguyên. [Evidence](ROOT_CAUSE_EVIDENCE.json), [toàn hội thoại](CONVERSATIONS.md), [report giữ nguyên](REPORT.md).

## Kết luận

**Owner điều chỉnh hướng fix,31/10:** [kế hoạch tiếp theo](../../../../../docs/specs/c3-phase-c-purchase-options-read-path-plan-20261031.md) ưu tiên một mã có nhiều lựa chọn mua; hai mã trùng tên là nhánh phụ. Đối chứng B–C §3 đã thấy thiếu preparation khi hai refs bound ở **cả B lẫn C**, không quy toàn bộ finding context này thành hồi quy C. Các traces hai mã dưới đây vẫn là evidence thực tế của lượt đã chạy, không phải phân bố ưu tiên nghiệp vụ hoặc lý do chỉ sửa nhánh hai mã. Historical grades/raw giữ nguyên.

Không có một nguyên nhân chung là verifier quá chặt hoặc model không hiểu tiếng Việt. Các điểm nghẽn lớn nằm ở **chuỗi lấy dữ liệu chưa tới fact khách cần, dữ liệu màu thiếu nghĩa có thể dùng để bán, media hết eligibility, và context chấm thiếu quyết định owner**. Giọng còn dài là hạn chế riêng; sửa giọng không làm các luồng này hoàn tất.

Code hai lỗi trước đã được sửa đúng boundary, nhưng toàn hành trình vẫn có thể dừng ở một blocker khác trước khi chạm phần đã sửa. Không dùng507unit/76PG làm bằng chứng bán hàng tốt hơn; cũng không dùng whole-turn giảm để kết luận cần rollback toàn bộ.

## 1. Đã bound sản phẩm nhưng owner vẫn phải tự dựng chuỗi metadata → facts trong hai lượt tool

**Xác nhận từ exact requests và code, không còn chỉ là nhãn lỗi.**

- s07/s13 bắt đầu với hai PRODUCT refs SQ2447/SV2447, label rõ set quần/set váy, nhưng `products=[]`, `facts=[]`, chưa có availableOffers. `prepare()` chỉ hydrate khi currentProductId hoặc đúng một bound product; hai refs và không focus thì không prepare gì.
- Hai ca này owner vẫn search “áo Thạch Thảo” dù refs đã bound. Search bị PRODUCT_BOUND đúng như thiết kế, không xóa target. Một tool round đã tiêu thụ.
- Round tiếp owner batch DETAILS_ONLY hai ref. Kết quả OK nhưng ghi rõ `notRead: PRICE/STOCK/ETA/SIZE_FIT`; không có fact giá hoặc fit.
- Request thứ3 chuyển `TERMINAL_HANDOFF_OR_REPLY`, chỉ còn callable request_handoff. **Còn3call units nhưng0read rounds**: không thể đọc fact hoặc gọi size engine nữa. Owner chọn SIZE_RULE_UNAVAILABLE/PRICE_UNAVAILABLE, dù chưa thực hiện các phép đọc đó.
- s02 còn1round sau details nhưng kết thúc bằng hỏi mẫu, không đọc giá. s04 còn1round nhưng chọn handoff. Vì vậy budget là nguyên nhân trực tiếp của s07/s13 sau bước search sai; không phải lời giải thích đầy đủ cho mọi early exit.

**Offline control trên frozen world/clock actual:**

| Phép kiểm | Kết quả |
|---|---|
| read_product đúng AO của SQ2447 | OK, PRICE499000 |
| read_product đúng AO của SV2447 | OK, PRICE499000 |
| commerceSizeSource + recommendSize cho160cm/55kg, fitPreference RELAXED, SV2447 | Chart đã được owner cho dùng chung, RECOMMENDED M, missingInputs[] |
| Cùng input với SQ2447 | RECOMMENDED M, missingInputs[] |

Đây chứng minh **nguồn và code có đường lấy được fact**, không chứng minh owner chắc chắn sẽ chọn đường đó hoặc được bỏ hỏi phân biệt mẫu. Kết quả size là engine theo chart/config đã có, không tự bảo đảm mọi áo cùng tên vừa như nhau hoặc ép M khi khách chưa xác định mẫu. Không lấy reason SIZE_RULE_UNAVAILABLE do owner chọn làm bằng chứng engine thiếu chart. Report trước giữ nguyên; review này bổ sung bằng chứng engine thực sự có thể chạy cho input s07.

**Root cause phân công:** owner đang phải khám phá cả cấu trúc dữ liệu shop rồi lập chuỗi đọc dưới budget cố định; context ban đầu đã có identity nhưng chưa có metadata để gọi fact tool. Không có thông tin bị thất lạc ở transport: exact request ghi đúng budget/callableTools/notRead. Mô hình quyết định chưa tốt ở những ca này, đồng thời giao diện dữ liệu làm đường đúng dài và dễ hết round.

**Hướng xử lý:** ưu tiên làm metadata/khả năng đọc của bound targets sẵn rõ trong ngân sách hiện có, tránh phải search để biết mã đã có. Giữ read theo đúng offer/subject, không hydrate toàn catalog/all-offers hoặc tăng cap để che lỗi. Dùng owner cho quyết định tư vấn, code cho nguồn/đối tượng/budget/trạng thái đã đọc. Với giá hỏi chung cho hai mẫu có cùng giá, lấy fact hai scope rồi trả phần chung có căn cứ và chỉ hỏi phân biệt khi cần cho bước mua; không buộc hoàn tất mọi lựa chọn trước khi trả phần khách hỏi.

## 2. Vòng trước “mua được” vì owner truyền sentinel; vấn đề màu chưa từng được giải quyết dứt điểm

**Xác nhận bằng so actual arguments và resolver trên hai frozen worlds.**

| Ca | Actual vòng trước | Actual vòng mới |
|---|---|---|
| j1 mua áoL | add_to_cart(color=`__NO_COLOR__`) → OK | add_to_cart(color=null) → COLOR_REQUIRED |
| j4 mua áoM | add_to_cart(color=`__NO_COLOR__`) → OK | add_to_cart(color=null) → COLOR_REQUIRED |

Chạy current resolver với **null** trên source trước **và** source mới đều ra COLOR_REQUIRED: NO_COLOR IN_STOCK +BE PRE_ORDER; policy cả hai đều cho order_when_zero. Vì vậy không có bằng chứng source mới làm xuất hiện ambiguity này. Sự khác biệt quan sát được nằm ở **tham số owner chọn**, không phải CLAIM_CONFLICT M/L tái phát.

Tool description yêu cầu color từ lựa chọn khách và null khi chưa chọn. Khách hai ca không nói màu; source sentinel chỉ là chưa ghi nhận màu, không phải “tiêu chuẩn”, “mặc định”, màuảnh hoặc một màu vật lý đã duyệt. Vòng trước truyền sentinel và thành công cơ học không đủ chứng minh đã xử lý customer choice ổn định; chưa kết luận riêng rằng effect cũ trái phép khi chưa audit đủ permission của lượt cũ.

Code trả COLOR_REQUIRED bằng một tập gồm **màu biết tên** và **row chưa biết màu**. Nó bảo toàn dữ liệu nhưng chưa tạo được bước tiếp theo hữu ích trong chat: thiếu thông tin shop bị trình bày giống hai màu để khách chọn. Owner lấp nghĩa bằng “bản/màu tiêu chuẩn”; verifier thấy evidence ghi UNRECORDED và chặn đúng. Việc source thiếu màu + owner tự đặt tên mới là nguyên nhân, không sửa bằng cho verifier chấp nhận một tên màu chưa có căn cứ.

**Hướng xử lý:** xác nhận nghĩa/source binding và tên hiển thị của row đang có hàng tại nguồn hiện hành. Chỉ cấp default/canonical selectable option khi nguồn/quy tắc shop thực sự xác nhận; không model đoán, không regex đổi sentinel thành màu. Khi chưa có căn cứ, phân biệt thiếu dữ liệu shop với thiếu màu khách chọn và silent handoff đúng rule đã chốt. Kiểm riêng nhánh COLOR_REQUIRED/unknown và nhánh mixed M/L có selector đã xác định. Không lấy nhánh M/L synthetic thuận lợi thay acceptance về mua thực khi source chưa xác định màu.

## 3. Ảnh tồn tại nhưng không đủ điều kiện: ba ca media có hai nguyên nhân khác nhau

**Pure eligibility replay cùng actual clock:**

| Ca | Nguồn frozen | Root cause đã chứng minh |
|---|---|---|
| s01 Khánh Trang/SV1561 |11assets approved/verified,11hết freshness; observation28/09, expiry28/10, actual30/10 | Quote yêu cầu ảnh nhưng không còn ảnh eligible; giá đúng không cứu được mandatory photo |
| s03 Ngọc Trâm/V406 |11assets approved/verified,11hết freshness; observation05/09, expiry05/10 | Actual latest query DETAIL, không component filter; media fail do freshness, không gán query TOP của lần trước sang lượt này |
| s16 feedback/SQ2447 |10assets approved/verified,10hết freshness; feedback=true count0 | Actual query FEEDBACK/TOP cho set quần. Vừa không fresh, vừa không có verified feedback; không thay bằng ảnh mẫu hoặc ảnh của set khác |

Không phải mọi NO_VERIFIED_MATCHING_MEDIA là “shop không có file ảnh”, cũng không phải mọi ca thiếu ảnh cần sửa prompt. Exact generation RESULT journal được dùng để chốt actual query vì raw toolResponses có thể rỗng khi primitive media đã tự handoff. SV2447 có10ảnh fresh nhờ revalidation nhưng không phải product mà owner chọn ở s16; không lấy eligibility củaSV thay choSQ. Source của cả hai mẫu vẫn không có feedback=true. Đây là bổ sung attribution cụ thể cho báo cáo cũ, không sửa raw hoặc grades.

**Hướng xử lý:** tái xác nhận nguồn ảnh/metadata có approval đúng tại nguồn đã có; audit freshness và intent/component coverage trước khi seal. Không gia hạn clock/TTL, tự cấp metadata/feedback hoặc bỏ ảnh khỏi form báo giá. Thiếu shop data vẫn handoff; đừng tiếp tục full model reruns với cùng nguồn đã biết thiếu rồi mong owner sửa được.

## 4. Handoff reason đang trộn “model không lấy được fact” với “nguồn không có fact”

s07/s13 là ví dụ rõ: owner tự chọn SIZE_RULE_UNAVAILABLE/PRICE_UNAVAILABLE sau khi chưa gọi đúng source. Code kiểm policy/permission/revision và thực hiện handoff thật; **receipt handoff không chứng minh reason phản ánh một authoritative lookup đã thất bại**. RequiredReadHandoffReason giữ partial facts và chỉ tự handoff một số source failures; read_product OK nhưng thiếu fact phù hợp vẫn để owner quyết định.

Đây vừa là thiếu sót trong quyết định/tool planning, vừa là thiếu bằng chứng phân loại nguyên nhân khi xem log. Prompt phân biệt NOT_READ với thiếu dữ liệu đã đọc, nhưng tool request_handoff description nhấn mạnh các reason nguồn thiếu và không buộc đính kèm observed failed lookup. Không nên từ đó thêm parser hoặc model thứ3 để kiểm nhu cầu.

**Hướng xử lý:** giữ handoff an toàn, nhưng ghi riêng owner-declared reason và observed deterministic cause/read coverage: NOT_READ, lookupFAILED, budgetEXHAUSTED, UNKNOWN. Chỉ dùng failed lookup đúng scope để kết luận thiếu nguồn; không tạo fact hoặc retry để làm đẹp nhãn. Với thiếu thông tin khách/mẫu chưa xác định (s11), hỏi phân biệt thay vì xử lý như shop thiếu dữ liệu. Không nới handoff policy hoặc cấm mọi handoff khi một tool chưa chạy.

## 5. Judge thiếu delegation đã có; một số điểm không tách được source đúng với source chưa được gọi

`source-config.b1.json` đã có approvalRef `owner-same-name-size-sharing-20261024`; `commerceSizeSource` mở applicability chartSQ2447 sangSV2447 theo delegation rõ, không gộp giá/tồn. Offline replay xác nhận chart tồn tại và engine trảM cho cả hai mã ở input s07.

Public packet cung cấp chart gốc và source inventory nhưng không đưa rõ delegation/code applicability đã áp dụng. Judge vì vậy giữj2UNRESOLVED; cũng lý giải s07wholePASS bằng giả định thiếu chart. Không được kết luận runtime chọn sai chart hoặc sửa grades sau unmask; cần làm packet tương lai phản ánh đủ quyết định code/owner có hiệu lực. Giữ grade gốc và điểm9/16+3/6+1UNRESOLVED như historical observation có giới hạn.

**Hướng xử lý:** evaluator-only context phải kèm approved applicability/provenance và actual lookup coverage, phân biệt source inventory với đã dùng source. Không rò các label/caseId/expected/rubric vào owner/verifier. Completeness khi hỏi tên/size còn thiếu cũng phải định nghĩa trước seal, không thay cách chấm giữa các vòng.

## 6. Giọng dài vẫn có, nhưng chưa đủ căn cứ quy riêng cho prompt hay model

Owner prompt đã có mục tiêu bán hàng, giọng chat, yêu cầu không chép mô tả/chuỗi tính từ và chỉ hỏi phần cần. Exact replies s05/s06/j3 vẫn dùng nhiều từ từ description catalog, lời khen/điều kiện chung và CTA ít hữu ích. Đặc biệt descriptionSQ2447 giàu tính từ hơn descriptionSV2447 đã được rút gọn; context cũng không cung cấp được màu mặc cụ thể ở s06, nên lời tư vấn chuyển sang điều kiện chung.

Đây là quan sát về source/response alignment, **không phải ablation chứng minh mô tả dài gây ra giọng dài**. Không có model comparison/controlled prompt trial mới trong review này, nên không kết luận Gemini/Sol có năng lực ngôn ngữ kém hoặc prompt là nguyên nhân duy nhất. Ưu tiên giảm dữ liệu không phục vụ việc đang hỏi bằng projection hữu ích, giữ facts/quyền/receipts; chưa mở vòng tăng ví dụ, cấm từ nối hoặc áp khuôn câu.

## Phân nhóm13handoff và7no-send

- 3media: s01/s03/s16, source eligibility đã được kiểm.
- 4decision/read-planning/clarification: s04/s07/s11/s13; không mặc định mọi reason là source failure.
- 2verifierFAIL do owner tạo nghĩa màu: j1/j4.14verifier calls gồm12PASS/2FAIL; không có evidence quota/timeout hoặc chặn quá tay ở hai FAIL này.
- 1sizing OUT_OF_RANGE sau correction: j2, actual engine đã gọi; chart applicability trong grading chưa rõ chứ không bỏ qua correction.
- 3aftersales/order: s10/s12/j5, handoff đúng capability.
- 7no-send là hệ quả ownership HUMAN sauj1/j2/j4/j5, không thêm7root causes.

Ngoài13handoff, s02được gửi vẫn bỏ giá khách hỏi. Giọng nhẹ/CTA không hữu ích là vấn đề ở các reply đã gửi, không giải thích toàn bộ chặn luồng.

## Vì sao nhiều vòng chưa tiến triển, và thứ tự nên sửa tiếp

1. **Đang có nhiều blocker độc lập nối tiếp.** Sửa cap/claim đúng nhưng một lượt mới có thể fail trước đó do màu; terminal rate không cô lập được phần sửa. Regression evidence cần khẳng định actual request đã tới boundary cần kiểm, không chỉ đúng caseId.
2. **Một số PASS cũ phụ thuộc lựa chọn tham số tình cờ.** Null và sentinel tạo hai nhánh khác; không dùng một lần thêm giỏ thành công làm stable acceptance về lựa chọn khách.
3. **Lặp provider run trong khi thiếu source prerequisites đã biết.** Refresh snapshot chỉ làm observed source mới, không tự tái xác nhận ảnh/màu hoặc cấp feedback.
4. **Reason và score chưa đủ để attribution.** Handoff nguồn thiếu có thể chỉ là hết read round; grade gap về approvedchart làm điểm không đại diện riêng năng lực owner. Cần source/tool/decision/evaluator evidence riêng như review này.

Ưu tiên: **(a)** chốt khả năng dùng row màu tại nguồn, **(b)** rút đường bound-products→facts trong ngân sách hiện hành và phân biệt NOT_READ/FAILED, **(c)** sửa eligibility nguồn media, **(d)** bổ sung evaluator delegation/coverage trước seal mới. Giữ kiến trúc1owner+1verifier, receipt/atomicity/freshness và handoff silent. Không rollback toàn bộ, không nới verifier, không tăng cap/generation rounds, không vá regex/câu mẫu theo từng ca, không chạy full tiếp chỉ để hy vọng mẫu tốt hơn.

Đây là review và đề xuất hướng xử lý, **chưa implementation/plan approval/new model run**. Grade cũ không sửa. PhaseC vẫn BLOCKED/C3 NOT_RUN/B_NOT_GO.

## Commands/evidence mới trong task review

`node ../c3-variant-rootcause-review-final-20261031.mjs` exit0; exact current media queries đã đối chiếu generation RESULT journal. Probe trước dùng enum LOOSE sai được sửa thành RELAXED, và giả thiết media query từ lượt trước đã được thay bằng actual currentquery trước khi ghi kết luận. Failed/initial logs giữ nguyên, không dùng làm bằng chứng actual selection. Không có model/source modification. Script/output/log hashes trong ROOT_CAUSE_EVIDENCE.json, provider0/network0/effect0. Các assertions kiểm giá499k hai mã, COLOR_REQUIRED cả2worlds, mediaeligible0 đúng query/clock, request phase/budget và argument contrast.

Source reads: current prompt/schema, read-only loop/prepare/resolver/media eligibility/product-group delegation/evaluator inventory và raw request captures. Không chạy tests/build/PG hoặc provider trong task chỉ review; không gọi những kiểm tra implementation ở task trước là rerun mới.
