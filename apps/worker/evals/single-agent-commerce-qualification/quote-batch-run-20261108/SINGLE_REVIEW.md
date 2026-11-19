# Review độc lập duy nhất — toàn bộ chiến dịch 08/11/2026

Kết quả: còn lỗi trọng yếu về hoàn thành bán hàng. Trong 34 ca: **23 TASK_OK, 6 MATERIAL_FAIL, 4 EXPECTED_HANDOFF, 1 CONTROL_NOT_REACHED**. Giữ nguyên R1 FAIL của j1 lượt 3; việc owner yêu cầu chạy tiếp toàn bộ không xoá kết luận đó. Đây là quan sát N1, không phải formal qualification, C3 parity hay GO.

Đã đọc ALL_CONVERSATIONS.md trước tiên, toàn bộ 55 kết quả khách thực nhận trong packet, rồi đối chiếu tool/state/required outcomes của REVIEW_COMPACT và exact facts, policy, native frames cần thiết. Không dùng draft bị chặn để chấm như tin đã gửi. Không chạy provider, sửa code/runtime/commit hay nguyên bản evidence.

Run source: `06b3901b8986233766d181534c0805691729f98a`; world: `9b6d8b1e69965b719c476395f70b600e0cffe4cd359eefd4ea790dbcb395c41a`. HEAD quan sát là `db4afe0538b903c39cc821e6aa654df438cb95d3`; diff stat so với run source chỉ ở 16 file báo cáo/tasks. Run dùng Vertex Gemini 3.5 Flash Lite HIGH làm owner, GPT-6.1 Sol HIGH làm verifier; N1/retry 0, caps 3 owner / 1 verifier / 6 primitive / 2 rounds.

## Accounting và giới hạn kiểm tra

Tự cộng lại packet: **55 lượt = 33 model SEND_ELIGIBLE + 7 CODE_OWNED_SEND + 10 HANDOFF + 5 HUMAN NO_SEND**; 120 generation records / 120 HTTP = 84 owner + 36 verifier; 119 OK + 1 MALFORMED; 1.176.409 input / 98.741 output tokens. Các tổng này khớp AUTOMATED_INTEGRITY; không có NOT_RUN. Chi phí không được provider expose.

Audit tự động báo source writes 0, live sends 0, isolated DB đã drop 4/4, caps/firewall/hash/binding và replay final gate tại thời điểm đã ghi đều PASS. Review này đã tự cộng tổng và xem các proof chọn lọc, **không tự chạy lại từng hash, firewall hay 55 replay**. PASS kỹ thuật không đồng nghĩa đủ hữu ích để bán hàng. Không dùng đồng hồ hiện tại để phán snapshot đã hết hạn.

## Sáu ca lỗi trọng yếu

**F01 — c-20261028-j1, lượt 3 — HIGH**

Khách thực nhận: “Dạ, áo lẻ Set Thạch Thảo có hai màu Trắng và Be. Chị chọn màu nào cho size M và size L để em tính tổng tiền và phí ship chính xác cho mình nhé ạ?”

R1 FAIL lịch sử được giữ: câu hỏi tổng cả phí ship không được trả lời. Owner lặp add_to_cart khi còn thiếu màu và quote_cart bị DEPENDENT_EFFECT_REJECTED thay vì lấy pre-cart total; verifier PASS không kiểm chất lượng hoàn thành. Không yêu cầu bot tự tính hoặc giả cart commit.

Nguồn: REVIEW_COMPACT.json:j1/T1–T3; SOURCE_REFERENCE.json:3c5f16cef5261ca6f8b89a0633ed044916519520558db924da50a1b0cd53e811; REVIEW_COMPACT.json:s13/T1:PRE_CART_TOTAL_V1.

**F02 — c-po-20261031-p04, lượt 1 — HIGH**

Khách thực nhận: “(không gửi tin nhắn)”

Một generation OWNER MALFORMED, errorCode PROVIDER_ERROR. Handoff chặn tin sai nhưng làm mất tư vấn size, rồi mất giá T2; không có evidence đây là thiếu shop data hay 429. N1 không định lượng xác suất lỗi.

Nguồn: REVIEW_COMPACT.json:p04/T1–T2:generationStatuses/recovery; AUTOMATED_INTEGRITY.json:groups.r2.

**F03 — c-20261028-s15, lượt 1 — MEDIUM**

Khách thực nhận: “(không gửi tin nhắn)”

Tin thích màu/cảm ơn chỉ cần ACK/preference đúng phạm vi. Owner gọi đọc hàng và chọn ảnh màu không bắt buộc; media thiếu binding màu Be dẫn DEPENDENCY_FAILURE và chuyển HUMAN. Guard ảnh không sai; việc để tool không cần thiết làm hỏng ACK là mất hữu ích tránh được. Profile không ghi màu, cart vẫn null.

Nguồn: REVIEW_COMPACT.json:s15/T1; native s15/T1:observed.result.readCoverage ordinal 5 MEDIA_COLOR_BINDING_UNVERIFIED; native s15/T1:before/after.publicState.profile.

**F04 — c-20261028-j2, lượt 2 — HIGH**

Khách thực nhận: “(không gửi tin nhắn)”

T2 đã cập nhật profile đúng: revision 4 giữ 162cm, thay 56kg bằng 51kg và thêm ngực 88, eo 70, mông 94. Tuy nhiên lần recommend_size đầu bị MEASUREMENT_SOURCE_INVALID (diagnostics ghi UNKNOWN_INTERNAL), lần sau bị STATE_OR_REF, rồi recovery STATE_UPDATE_INCOMPLETE dẫn handoff. Lệnh đầu có gửi lại chiều cao với sourceQuote từ lượt trước. Không có SIZE_FIT mới hoặc bằng chứng thiếu chart. Lỗi quan sát là flow recommend/recovery không hoàn thành sau sửa số đo; chưa xác định đầy đủ nguyên nhân nội bộ, không được nói profile còn giữ 56kg.

Nguồn: REVIEW_COMPACT.json:j2/T2:tools/recovery; native j2/T2:before/after.publicState.profile; native j2/T2:diagnostics ordinals 14–23.

**F05 — c-20261028-j4, lượt 2 — HIGH**

Khách thực nhận: “(không gửi tin nhắn)”

T1 có exact selection SV2447/AO/M: TRẮNG IN_STOCK và BE PRE_ORDER. Sang T2, snapshot verifier không có selectionEvidence, presentation chỉ còn NO_COLOR. FAIL có căn cứ trong frame verifier thực nhận, nhưng không chứng minh màu bị bịa trong thế giới đóng băng. Owner gọi record_negotiation khi chưa có cart nên bị NEGOTIATION_SOURCE_OR_CART, rồi lặp hỏi màu thay vì giải quyết xin hỗ trợ; proof màu không được đọc lại hoặc truyền sang frame. Handoff có thể tránh do đường context/tool; câu hỏi tổng tiền T3 bỏ trống là hậu quả. Chưa chứng minh lỗi riêng của model verifier.

Draft bị chặn, không gửi: “Dạ, áo lẻ Thạch Thảo có giá 499.000đ chị ạ. Chị chọn màu trắng (sẵn hàng) hay be (hàng đặt trước) để em hỗ trợ mình tiếp nhé ạ?”

Nguồn: native j4/T1:generations.VERIFIER.verifierInput.trustedSnapshotJson.runtimeProducts.selectionEvidence; native j4/T2:cùng path, selectionEvidence absent; presentation.variants NO_COLOR; REVIEW_COMPACT.json:j4/T2:record_negotiation REJECTED.

**F06 — c-20261028-s04, lượt 1 — MEDIUM**

Khách thực nhận: “(không gửi tin nhắn)”

Exact tuples xác minh TRẮNG có sẵn và BE đặt trước cho S/M/L/XL. Completeness FIRST_8_EXACT_TUPLES_NOT_COMPLETE_INVENTORY không chứng minh danh sách màu đầy đủ. Verifier có cơ sở hẹp để phản đối khẳng định đúng hai màu, nhưng hai màu được nêu đều có bằng chứng. Trong ngữ cảnh bán hàng, câu có 2 màu cũng có thể chỉ liệt kê lựa chọn đang biết; chưa đủ để kết án hallucination vật chất cao. Actual silent handoff vẫn làm câu hỏi màu không được phục vụ dù đã có dữ kiện dùng được: lỗi flow mức vừa, không phải lỗi bịa hai màu.

Draft bị chặn, không gửi: “Áo Thạch Thảo có 2 màu là Trắng và Be chị nhé. Trong đó màu Trắng có sẵn, còn màu Be là hàng đặt trước ạ.”

Nguồn: native s04/T1:verifierInput.trustedSnapshotJson.runtimeProducts.selectionEvidence; REVIEW_COMPACT.json:s04/T1:verdict/rejectedDraft.

## Mười handoff và năm NO_SEND

Có **5 handoff đúng nghiệp vụ hoặc thiếu nguồn thực sự**: s03 thiếu proof ảnh ren; s10 đổi màu đơn cũ; s12 lỗi hàng; j5 hỏi đơn cũ; checkout-complete lượt 7 đã CONFIRM_PURCHASE APPLIED và chuyển HUMAN/PURCHASE_CONFIRMED. s03 có PRODUCT ren nhưng ảnh chỉ DETAIL/FRONT, confirmedParts rỗng, componentKnown=false; verifier chặn đúng mô tả “cận ren nổi”. Không cần sửa policy đóng băng để kết luận các handoff này hợp lệ.

Có **5 handoff do gián đoạn hoặc đường xử lý có thể tránh**: p04 (provider malformed), s15 (ảnh màu không cần thiết), j2 (size/update/recovery), j4 (mất proof màu và tool negotiation), s04 (completeness/wording). Đây không phải năm lỗi model đồng nhất. j1 là lỗi hữu ích dù vẫn SEND_ELIGIBLE, không nằm trong 10 handoff.

Ba NO_SEND ở p04 lượt 2, j2 lượt 3 và j4 lượt 3 là hậu quả của ba handoff đã đếm; không tính thành ba lỗi mới. Hai NO_SEND ở j5 lượt 2–3 giữ HUMAN đúng nghiệp vụ. Tổng số lỗi độc lập bổ sung từ NO_SEND: **0**.

## Verifier và hoàn thành bán hàng

- s03: chặn có căn cứ; không suy nội dung ảnh chỉ từ chất liệu sản phẩm.
- j4: frame verifier lượt 2 thực sự chỉ còn NO_COLOR, khác exact selection lượt 1 có trắng/Be size M. Chặn theo frame có lý; gọi màu là “bịa trong shop” vượt bằng chứng. Cần quy về mất context/tool path trước khi quy lỗi riêng cho verifier.
- s04: exact tuples có trắng/Be và trạng thái, nhưng FIRST_8 không chứng minh toàn bộ màu. Cảnh báo exhaustive có cơ sở; sắc thái “có 2 màu” không đủ để tự kết án hallucination vật chất cao. Actual im lặng vẫn là mất bán hàng tránh được khi đã có dữ kiện dùng được.
- j1: semantic PASS không bảo đảm khách đã được báo tổng. Chất lượng/completion không thuộc trách nhiệm của semantic verifier.

## Kết quả từng ca

| Ca | Trạng thái | Nhận định |
|---|---|---|
| c-po-20261031-p06 | TASK_OK | Báo đúng giá 989.000đ của composite ba món, không cộng giá lẻ sai. |
| c-po-20261031-p07 | TASK_OK | Engine trả M cho cả TOP/PANTS sau khi tool đầu bị từ chối; tin cuối đúng kết quả engine, không ép quần L chỉ từ thói quen khách. Giữ PASS lịch sử R1. |
| c-po-20261031-p08 | TASK_OK | T1 có cart set M và tổng 829.000đ; T2 replace không commit vì màu, bot hỏi màu chứ không nói đã sửa xong. Cart cũ còn nguyên đang chờ khách; hành trình dừng ở clarification hợp lệ. Giữ PASS R1. |
| c-20261028-j1 | MATERIAL_FAIL | Lặp hỏi màu ở T3 thay vì dùng khả năng báo tổng trước giỏ cho hai áo. Giữ nguyên R1 FAIL lịch sử; chưa có cart commit và không chứng minh nhánh sửa quantity đã hoàn thành. |
| c-po-20261031-p04 | MATERIAL_FAIL | T1 provider trả MALFORMED/PROVIDER_ERROR, chuyển HUMAN; T2 hỏi giá cũng không có câu trả lời. Đây là gián đoạn khả dụng, không phải thiếu dữ liệu shop hay lỗi size engine. |
| c-po-20261031-p09 | TASK_OK | Nêu rõ hai loại set, khách chọn bộ quần rồi trả đúng M còn hàng, 769.000đ và ảnh; không hỏi lại loại set đã chọn. |
| c-20261028-s03 | EXPECTED_HANDOFF | Nguồn DETAIL/FRONT không xác nhận phần ren; draft khẳng định ảnh cận ren bị chặn đúng. Bàn giao theo thiếu proof ảnh là hợp lệ, không tính draft là lời đã gửi. |
| c-20261028-s13 | TASK_OK | quote_product tạo PRE_CART_TOTAL_V1 cho 1 áo/Cần Thơ: 499.000 + 30.000 = 529.000đ; không đòi màu để trả tổng. |
| c-20261028-s15 | MATERIAL_FAIL | Khách chỉ nói thích màu/cảm ơn; owner đọc hàng và chọn ảnh màu không cần thiết, MEDIA_COLOR_BINDING_UNVERIFIED kéo cả ACK thành handoff. Không có cart hay lưu preference giả. |
| c-20261028-s16 | TASK_OK | Gửi 1 ảnh với provenance feedback=true, confirmedParts=[AO]; không dùng MODEL làm FEEDBACK. Review dựa metadata, chưa kiểm trực quan nội dung ảnh. |
| c-20261028-j2 | MATERIAL_FAIL | T1 chọn M đúng engine. T2 profile thực đã sửa 51kg, giữ 162cm và thêm 88/70/94, nhưng recommend_size bị từ chối rồi STATE_UPDATE_INCOMPLETE dẫn handoff; T3 im lặng là hậu quả HUMAN, không thêm một lỗi độc lập. |
| c-20261028-j4 | MATERIAL_FAIL | T1 có exact selection trắng/Be size M. T2 negotiation bị từ chối do chưa có cart; snapshot verifier mất selectionEvidence và chỉ còn NO_COLOR, draft lặp màu bị chặn. Mất hỗ trợ thương lượng và tổng Cần Thơ T3; không có giảm giá giả. |
| c-20261028-j6 | TASK_OK | T1 thêm set M thật; T2/T3 code hỏi tên còn thiếu, COD được capture bằng code. Không coi nhãn semantic NO_SEND là không có tin, không ép preview khi chưa có liên hệ. |
| c-po-20261031-p01 | TASK_OK | Báo áo bán riêng 499.000đ, mô tả áo và size đúng nguồn, ảnh được chấp nhận. |
| c-po-20261031-p02 | TASK_OK | Báo quần lẻ 429.000đ đúng offer QUAN, không dùng giá áo hay cả bộ. |
| c-po-20261031-p03 | TASK_OK | Trả lời chân váy M còn hàng và 449.000đ đúng offer CV; chất ren tơ Hàn theo description nguồn. |
| c-po-20261031-p10 | TASK_OK | Không nhận vơ mẫu khách xem hôm trước; hỏi phân biệt 2 ứng viên, giá/tồn đã đọc cho từng ứng viên chứ không gán vào một mẫu đã xác định. |
| c-po-20261031-h01 | TASK_OK | Thiếu lựa chọn màu của khách; hỏi trắng sẵn/Be đặt trước từ exact selection, không handoff hay báo thêm giỏ thành công. |
| c-po-20261031-h02 | TASK_OK | Giá set Khánh Trang 999.000đ, giá lẻ 499.000đ/món và set S/áo S,L có source; không nhầm component với cả bộ. |
| c-20261028-s05 | TASK_OK | Có gợi ý chính SQ629 phù hợp hướng đơn giản rồi nêu một lựa chọn họa tiết; giá/thiết kế được đọc. Còn hỏi sở thích giữa 2 mẫu nhưng đã có lời khuyên dùng được, không nâng thành lỗi trọng yếu. |
| c-20261028-s06 | TASK_OK | Trả lời khả năng phối quần nâu bằng nhận xét thẩm mỹ hợp lệ; mô tả áo và 499.000đ có nguồn. Không đòi chứng cứ thực nghiệm cho đánh giá phối màu. |
| c-20261028-s08 | TASK_OK | Chọn một mẫu Diệp An, giải thích 2 lớp/cổ tròn/form suông đúng nguồn và hỏi dữ liệu size còn thiếu. Không buộc phải lặp mọi chi tiết mẫu Odette. |
| c-20261028-s09 | TASK_OK | Trả đúng cả hai phần giặt tay/giặt máy theo frozen customerFaq: giặt tay ưu tiên; máy với túi giặt và gentle cycle được phép. |
| c-20261028-s10 | EXPECTED_HANDOFF | Yêu cầu đổi màu đơn cũ chưa nhận thuộc EXCHANGE; handoff hợp lệ, không nhận đã đổi đơn. |
| c-20261028-s12 | EXPECTED_HANDOFF | Lỗi khóa váy vừa nhận thuộc DEFECT; handoff hợp lệ, không tự cam kết kết quả xử lý hoặc sửa đơn. |
| c-20261028-s14 | TASK_OK | Tôn trọng khách muốn xem thêm, ACK ngắn và dừng; không thúc mua. |
| c-20261028-s01 | TASK_OK | Báo đúng 999.000đ và phân biệt set S sẵn với M/L/XL đặt trước; mô tả Khánh Trang đúng nguồn. |
| c-20261028-s02 | TASK_OK | Báo đúng giá 499.000đ của áo chung; không bắt khách phân biệt parent và không nhận tạo đơn. |
| c-20261028-s04 | MATERIAL_FAIL | Trắng/Be và trạng thái thật đều có exact tuples; qualifier FIRST_8 không cho kết luận inventory đầy đủ. Draft dùng có 2 màu dẫn verifier FAIL và im lặng, trong khi đủ dữ kiện để nêu các màu đã xác minh. Handoff tránh được, không phải bịa hai màu. |
| c-20261028-s07 | TASK_OK | Dùng preference RELAXED, engine TOP trả M; không tự tăng L hoặc hỏi lại số đo có sẵn. |
| c-20261028-s11 | CONTROL_NOT_REACHED | Hỏi phân biệt set quần/set váy hợp lý; chưa kiểm màu Be/L/quantity 2 nên nhánh SHOP_GAP không được chạm. Không gọi đây là acceptance của missing-source control. |
| c-20261028-j3 | TASK_OK | Tư vấn áo với quần nâu, giải thích tái phối chân váy rồi tôn trọng chọn áo. Không cart/váy bị thêm trái ý; ghi nhận trong hội thoại không khẳng định receipt lưu/chốt. |
| c-20261028-j5 | EXPECTED_HANDOFF | Hỏi đơn cũ → handoff; T2/T3 giữ HUMAN/NO_SEND hợp lệ, không tự quay BOT hoặc bịa quyền đọc đơn. |
| c-20261104-checkout-complete | TASK_OK | Đúng cart SET_VAY/M, code hỏi lần lượt tên/điện thoại/địa chỉ/thanh toán, preview 829.000đ/COD/4–8 ngày trước xác nhận; CONFIRM_PURCHASE APPLIED ở T7 và HUMAN/PURCHASE_CONFIRMED. Handoff cuối là thành công code trong phạm vi test, không chứng minh đã gửi Meta hay tạo đơn POS. |

## Điểm mạnh và phần chưa biết

Giá áo/quần/chân váy/cả bộ và phí ship được dùng đúng ở các ca gửi được; s13 có pre-cart total 529.000đ. s02 không bắt khách phân biệt hai parent của cùng áo; s08 chọn một mẫu Diệp An theo nhu cầu đi lễ; j3 dùng quần nâu sẵn có để tư vấn và tôn trọng quyết định chỉ mua áo. s07 dùng RELAXED và kết quả engine M; p07 không tự gợi quần L trái engine. Cart bị từ chối không được nói đã sửa thành công, j4 không tự giảm giá/freeship.

Checkout là điểm mạnh của code: 7 CODE_OWNED_SEND trong toàn chiến dịch là nội dung khách thực nhận, không phải 7 lần bot im lặng. Hành trình bổ sung có cart đúng, hỏi đủ trường còn thiếu, preview 829.000đ/COD/4–8 ngày rồi CONFIRM_PURCHASE APPLIED trước HUMAN. Đây là evidence isolated test; không chứng minh đã gửi Meta hoặc tạo đơn POS. Không công bố giá trị liên hệ tổng hợp.

s11 có câu hỏi làm rõ set quần/set váy dùng được, nhưng chưa kiểm Be/L/quantity 2; nhánh SHOP_GAP **chưa được chạm**, không có bằng chứng control thiếu nguồn đã đạt. j1 cũng chưa chứng minh sửa quantity/cart không cộng thành 3 vì chưa có cart commit. j2 đã sửa profile đúng; nguyên nhân nội bộ của STATE_OR_REF/recovery vẫn chưa được xác định hoàn toàn.

Các tính từ, lặp số đo/câu dài thuộc phần giọng đã được owner defer; không nâng thành lỗi trọng yếu bằng keyword rubric. s05 còn hai lựa chọn nhưng đã có gợi ý chính và lý do dùng được. s05/SQ629 và s08/Diệp An có PRE_ORDER trong facts nhưng không nhắc trong lời khuyên; khách không hỏi tồn/ngày cần, bot cũng không nói hàng sẵn, nên chưa đủ để kết luận lỗi trọng yếu. Nếu lịch nhận ảnh hưởng quyết định thì cần xử lý ở câu tiếp theo.

Chưa kiểm trực quan từng ảnh; s16 được chấp nhận theo metadata feedback=true và confirmedParts AO. N1 không chứng minh ổn định hay tỷ lệ lỗi, không có conversion/handoff SLA hoặc đo end-to-end latency. Không gán nguyên nhân cải thiện cho một thay đổi từ một lần chạy.

## Lỗi projection của packet

**D01:** có 13 occurrences URL ảnh trong REVIEW_COMPACT chứa `[PHONE_TEST]` vì đoạn số trong media identifier bị regex redact nhầm; ví dụ j2 lượt 1, j4 lượt 1. Đây là bản publication bị đổi, không phải bằng chứng runtime gửi URL hỏng.

**D02:** policyLiteralRefs ở p02 lượt 1 và j3 lượt 3 chứa `[PHONE_TEST]`, nên không lookup được key exact trong SOURCE_REFERENCE. Mọi product sourceRef vẫn lookup được. Không tự tính hash trên bản đã redact để bác hash nguyên bản. Không sửa nguyên bản evidence; giới hạn này cần được giữ khi trích xuất/kiểm hash từ packet.

## So với chiến dịch 06/11

Đối chiếu FULL_REPORT.md của task-path-model-run-20261106: cùng 34 ca/55 lượt, trước đó 31 model send + 5 code send + 13 handoff + 6 NO_SEND; hiện tại 33 + 7 + 10 + 5. Trước có 113 records / 112 HTTP, 110 OK, 1 bound local trước HTTP và 2 verifier HTTP429; hiện 120 records / 120 HTTP, 119 OK và 1 malformed. Input/output quan sát trước là 1.051.127/76.050; hiện 1.176.409/98.741.

Prior report ghi p07/s13/p01/s05/s01 bị chặn, s02/s08 chưa đủ hữu ích; hiện các ca đó có outcome dùng được. Tuy nhiên source/world khác nhau, N1 và các lỗi hiện tại khác nhau; các chênh lệch outcome không phải điểm chất lượng và không chứng minh batching gây cải thiện hay suy giảm. Prior source `9b2cfff594c89d09a11e32c9c4274556291d72a1`, world `436a5be7095ec64c2eaa851b1fcdf7c0a6a6ee5b381a049c3a84978be1159b4f`.

## Bước tiếp theo có bằng chứng, chưa triển khai

1. Ưu tiên báo tổng trước giỏ cho j1 từ quote/policy thật, không buộc có cart/màu mới trả câu hỏi tiền.
2. Chẩn đoán j2 theo ranh giới source quote → profile commit → size fact/recovery; giữ sự thật là profile đã sửa đúng.
3. Làm rõ mất selectionEvidence ở j4 và hành vi thương lượng khi chưa có cart; phân biệt nguồn shop với frame verifier.
4. Giảm dependency ảnh/đọc hàng không cần thiết cho ACK ở s15; phân biệt liệt kê màu biết được và khẳng định inventory đầy đủ ở s04, giữ chặn ảnh thiếu proof ở s03.
5. Xem exact malformed output/recovery của p04 để biết phần verified facts còn dùng được; không suy sẵn nguyên nhân hoặc tự thêm retry ngoài caps.
6. Lần xuất packet sau redact theo typed contact fields để giữ nguyên URL/hash/reference keys; không sửa evidence gốc của lần này.

JSON đi kèm giữ chỉ mục ca/lượt, actual text, draft không gửi, cause domains, evidence, phân loại handoff/NO_SEND và giới hạn review. Chỉ có một lần review độc lập sau khi chạy hết; không yêu cầu thêm review hay thực thi thay đổi trong phạm vi này.
