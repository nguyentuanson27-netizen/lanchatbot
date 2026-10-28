# Chẩn đoán B2/B3 sau primary

Source6477c840e5cd678d795d336a55b1ba95e287116f. Raw59c2c5b0, exact Windows evidence bytes được giữ ởd6252104, rồi primary32fa82a15a0a500e1fab39ffed7270befe5f69e0 trước khi xem drafts/tool traces. Không sửa primary theo diagnostics. Giữ7registered steps;6terminal records và1interrupted terminal UNKNOWN, không fake lượt7hoặc chạy lại provider.

## Kết quả và root cause theo từng bước

| Bước | Điều thực sự xảy ra | Phần chịu trách nhiệm |
| --- | --- | --- |
|1/chọn mua áo beM | Profile76/98lưu thành công, giá499k/PRE_ORDER đúng và verifierPASS; không add_to_cart, chưa có giỏ | Owner thực hiện sai field lần đầu và đọc default cả set, mất2rounds rồi chỉ báo thông tin. Không phải guard từ chối một cart mutation. |
|2/đổiL, lấy2 | Search thừa, đọc default, generation3truyền offer ref như product ref khi hết lượt; sau đó NO_SEND/EGRESS_READINESS | Hai lỗi: owner chưa thực hiện mua; outbound gate đòi coverage cho cả3sản phẩm search không liên quan, chặn luôn static fallback. |
|3/hỏi tổng ship | Hai lần đọc sản phẩm; generation3mới add_to_cart+quote_cart, bị BUDGET trước invoke; fallback được capture | Owner chọn tool muộn/sai thứ tự trong budget, chưa có cart để quote; không phải verifier phản đối tổng tiền. |
|4/sửa số đo | Lưu74/96 và thực sự tạo giỏ2áo beL; code trả RECEIPT_BACKED_ACK “Giỏ hàng đã được cập nhật, chị nhé.” | Ghi state/effect đã chạy. Câu cuối đến từ code recovery, không phải giọng Gemini; trigger gốc dẫn tới recovery không được giữ trong output. |
|5/private checkout | Code-only,0model; advancePrivateCheckout không commit được bước checkout rồi chuyển ownershipHUMAN/DEPENDENCY_FAILURE | Có giỏ nhưng không có preview; dependency/commit subreason không được log, chưa đủ để quy riêng ETA, policy hay transaction. |
|6/chốt | Sau bước5handoff, NO_SEND/CURRENT_AUTHORITY_CHANGED,0model | Kiểm soát quyền đúng. Checkout chưa hoàn tất nên không phải một lỗi hiểu câu chốt mới. |
|7/gặp nhân viên | Owner gọi request_handoff đúng reason; database readback thấy HUMAN/event/case/tag intent, nhưng chưa có terminal file và Inbox còn PROCESSING khi host/tool ngắt | Handoff commit đã được xác minh; final readback/Inbox completion/capture của lượt7chưa quan sát được. Không claim lượt hoàn tất hay nhân viên đã nhận notification. |

## 1. Field projection đúng chưa đủ bảo đảm model gọi đúng

Owner generation1vẫn gửi `field:'WAIST_CM'/'HIPS_CM'` thay enum `measurements.WAIST_CM/HIPS_CM`; code trả STATE_OR_DOMAIN_INPUT. Generation2sửa đúng và CAS/readback nhận profile revision2. Đây là lỗi đã thấy trước, vẫn tái diễn dù schema/description đúng và adapter đã sửa read paths. Lần đầu profile rỗng nên không có measurement.field đã biết để model dùng lại; schema enum vẫn có đủ path. Không gán chắc provider bỏ qua schema nếu chưa xác minh API/client behavior.

Cùng lượt đó owner đọc SV2447 không chọnAO trước, rồi mới đọcAO/be/M. Source trả0/PRE_ORDER chính xác; final báo499k/đặt trước được verifier cho qua, không còn tự kết luận mặc vừa. Nhưng chưa có add_to_cart, nên customer request mua chưa được thực hiện. Wire continuation3là27.595bytes, đã qua bound; không được gọi đây là lỗi context-bound mới.

Hướng tiếp: sửa tính rõ ràng và khả năng thực thi của interface/profile paths/product-offer selection; xác minh schema thực tế được model tuân thế nào. Không strip prefix/đổi field sau khi nhận sai, thêm parser hoặc câu mẫu riêng cho ca này. Ưu tiên thao tác mua được khách yêu cầu thay cho luôn lấy thêm dữ liệu.

## 2. Gate đang dùng toàn bộ search context như phạm vi protected reply

Owner tìm “Áo Thạch Thảo” dù sản phẩmSV2447đã bound, nhận3gợi ý không trúng. Sau read_product defaultSET_VAY, generation3lại gọi `read_product({subjectRef:'offer:SV2447:AO'})`. Tool call này chưa chạy vì hết2rounds; do đó runtime sinhBUDGET fallback, không có final draft/verifier.

Ingress sau đó lấy **mọi PRODUCT subject trong world** làm productIds và **mọi claim type đã đọc** làm protectedClaimTypes cho PROTECTED_OUTBOUND, dù payload chỉ là fallback tĩnh. Captured snapshot cuối cóSQ675/SQ748/SV2447/V406, nhưngPRICE/STOCKchỉ củaSV2447. Existing `validateEffectClaimSemanticsV1` đòi từng type cho từng productId:6coverage holes ở3mẫu không liên quan. [Offline captured coverage diagnosis](EGRESS_COVERAGE_DIAGNOSIS.json) tái hiện đúng điều kiện missing của rule; không dựng provenance/claim giả hoặc gọi provider, và không claim replay full readiness với thời gian/authority đã mất.

Terminal thực tếEGRESS_READINESSphù hợp điều kiện code trên. Đây là **sai phạm vi hợp đồng**: candidates đã tìm kiếm không tự trở thành mọi subject mà outbound payload khẳng định. Cần sửa đúng context-to-effect binding/fallback path bằng existing boundary; không thêm gate hoặc nới permission/receipt/freshness. Cần regression trên search có nhiều candidates + bounded/static fallback trước khi chạy lại model. Chưa implement sửa trong task chạy này.

## 3. BUDGET và NONE chưa bảo đảm provider trả final

Generation3của bước2và3đều có prepared `functionCallingConfig.mode=NONE`, availableTools=[],roundsRemaining=0, nhưng response vẫn parse thànhTOOLS. Bước3muốn add_to_cart+quote_cart quá muộn, runtime không invoke cả hai; không có quote mà verifier đã chặn. Đây là cùng hiện tượng observed ởB1. Gemini evidence là prepared body từ cùng builder + adapter fake-HTTP captures; không có independent live HTTP echo, nên chưa gán chắc cho API hay client.

Không tăng vòng/retry sau khi thấy kết quả. Cần kiểm contract cuối lượt và native schema/call association với official provider behavior trước khi thay config; đồng thời giảm read default→read offer lặp bằng interface chọn đúng ngay lần đầu. Không biến điều này thành script tool routing từ tiếng Việt.

## 4. Giỏ đã commit, nhưng câu máy móc là code-owned ACK

Ở bước4owner dùng đúng measurement paths ngay lần đầu, sửa74/96. Round2đọcAO/be/Lvà gọi add_to_cart quantity2. DB stateCART_OPEN/revision4, cart có2áoL/BE, đơn giá499.000đ, subtotal998.000đ, ưu đãi5%=49.900đ, ship30.000đ, total978.100đ. Số này là code quote đã commit trong giỏ, **khách chưa nhận báo giá này ở bước3**.

Chỉ có2owner generations và không có final draft/verifier. Effect recovery dùng current committed receipt, trả `RECEIPT_BACKED_ACK` và static text từ single-agent-commerce-effects.ts. Không được tính như verifierPASS thứ hai hoặc đổ giọng “Giỏ hàng đã được cập nhật” cho model. Nó đúng với cart commit nhưng không đáp sát câu vừa sửa số đo, và che mất nguyên nhân fail-closed ban đầu. Có thể là context/tool-result bound hoặc bước khác trước generation3; raw không giữ original recovery reason nên chưa xác định hẹp.

Hướng tiếp là giữ original terminal/recovery trigger trong telemetry hiện có, rồi sửa đúng nguyên nhân và thông điệp bounded từ receipt của operation. Không chỉ thêm prompt “nói tự nhiên hơn”; không đổi receipt thành lời hứa khác hoặc replay mutation. Quan sát này chứng minh create-cart và sửa profile đã commit với nguồn thật, chưa chứng minh variant change thực hiện đúng ở lượt2hay hành trình hội thoại đã tốt.

## 5–6. Checkout nguồn thật còn chưa hoàn tất, không tự gán thiếu ETA

Khác run trước, cart đã có ở bước5. Private form đi code-only, `advancePrivateCheckout` không đạt committed, ingress khởi tạo existing handoff với DEPENDENCY_FAILURE. Ledger xác nhậnBOT_TO_HUMAN/event/case/tag intent. Terminal modePRIVATE_CODE_PATH/enqueued0, không có preview hoặc message cho khách. Subreason từ sales-cycle output/readiness/transaction không được đưa vào report; vì vậy **chưa đủ bằng chứng để nói do ETA/địa chỉ/giá hay lỗiDB**.

Deterministic COD/bank12/12mỗi nhóm đã qua, gồm preview/confirmation/handoff ở controlled inputs. Nó không chứng minh các input/evidence từ nguồn thật đáp ứng cùng contract. Cần giữ failure reason đã có từ executor/readiness trong output chẩn đoán, kiểm current-source prerequisites trên đúng lựa chọn2áoL/BE, rồi sửa mismatch nếu có. Không điền ETA mặc định/fixture hoặc gọi thêm model xử lýprivate input.

Sau handoff, lượt6dừng vìHUMANauthority là đúng. Đây là hệ quả của bước5, không phải model không hiểu “Chốt đơn”. Không cần nới permission gate để làm case chốt đi qua.

## 7. Host interruption và cleanup

Tiến trình local/tool bị ngắt sau OWNER_RESULT của request_handoff. Có13known generation responses (12owner+1verifier), đềuHTTP200; không generation retry hoặc generation error quan sát được. Runtime integration.json mới flush count12sau6lượt, nên request thứ13được tính từ OWNER_RESULT telemetry và ghi evidenceSource riêng. Không tạo provider-attempt-7.json; terminal/elapsed/capture cuối vẫnUNKNOWN.

Post-interruption đọc đúng owned testdatabasec3_b_test_18b0997926ff7a18: marker c3-b-isolated, eventCUSTOMER_REQUESTED_HUMAN/HUMAN, caseNEW/tagPENDING; Inbox có1PROCESSING. Đã xác minh0active sessions, drop đúng database này và đọc lại pg_database không còn target. Không chạm serving database/schema/customer, không gửiMeta/Pancake/POS. [Readback/cleanup](INTERRUPTION_RECOVERY.json) riêng với raw integration vẫn giữcleanup=false/statusabsent tại thời điểm process bị ngắt. Hai databaseCOD/bankcũng đã drop; tổng3/3cleanup.

Cleanup helper lần đầu không resolve đượcpg trước khi kết nốiDB; sửa cách resolve từ existing database package rồi chạy thành công. Git tự normalizeCRLFcủa2metadata files; giữ exact disk bytes bằng file-local -text ởraw savepointd6252104trước primary, không sửa raw/provider/primary để làm đẹp số. Batch exitCode không được ghiPASS; terminal capture chưa đủ là unknown thật, không là lỗi provider giả hoặc case bỏ khỏi denominator.

## Ưu tiên sửa tiếp

1. Outbound scope lấy đúng payload/subject đã được bảo vệ; static fallback không phụ thuộc đầy đủ giá/tồn của candidates không liên quan. Existing authority/freshness/receipt/privacy giữ nguyên.
2. Tool contract/profile paths/product-offer selection và final-only semantics: sửa chỗ model dễ gọi sai và tốnrounds, không thêm nhiều đoạn cấm trongprompt.
3. Giữ reason trước receipt recovery và private-checkout failure để lần sửa sau có chứng cứ; chưa tạo store/gate/logPII mới.
4. Sau khi mua/quote/checkout đi đúng, đánh giá câu trả lời hiện tại và code-ownedACK; không lấy số verifierPASS làm thước đo bán hàng. Cặp model/config không đổi trong request này, một lượt chưa kết luận ổn định.

**STOP sales/live acceptance.** Có progress thực: profile CAS/readback, tạo giỏ nguồn thật, current receipt ACK và handoff commit. Chưa hoàn thành lúc cần ở các lượt mua/quote/checkout; lượt7thiếu terminal do interruption. Không automatic extra batch/source fix, A2/A3/A PASS/PhaseC, merge/deploy hoặc live send.
