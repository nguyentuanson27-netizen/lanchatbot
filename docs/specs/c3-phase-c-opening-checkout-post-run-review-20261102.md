# Review bản sửa checkout và hai lượt model ngày02/11/2026

Review tại head `63e2bd0feff93f657b374342e823bfb745e373ff`; implementation base84b3989e, runtime603c391b, deterministic run/testdd88, model run sources2628987a và1f6a358b. Đây là primary engineering review, không phải locked blind quality grade hoặc independent approval. Không sửa runtime/prompt/model, không gọi provider hoặc đổi grades/cohort trong review này.

## Kết luận

Bản sửa đã bổ sung đúng khả năng native checkout commit text+ảnh cùng state/receipts/Inbox, giữ gate trước sequence0 và ngân sách. Tuy nhiên model runs chưa đi tới thành công ở luồng cần chứng minh: nhiều hành trình đã handoff trước confirm. Cần sửa đường nối dữ liệu màu sang media và làm rõ phạm vi bắt ảnh trước khi thêm một vòng chỉnh giọng hoặc nới verifier.

| Batch | Source | Ca/lượt thực chạy | SEND_ELIGIBLE | SilentHANDOFF | HUMAN NO_SEND | Generationrecords/HTTP |
| --- | --- | --- | --- | --- | --- | --- |
| Opening checkout | 2628987a | 21/28 | 5 | 17 | 6 | 36/36 |
| Phần còn thiếu | 1f6a358b | 12/20 | 1 | 12 | 7 | 21/20 |

Hai source/world registrations riêng; không biến bảng này thành một paired quality/safety population. Cả hai hoàn tất, không NOT_RUN; các lượt HUMANNO_SEND đã thực thi. Handoff đơn cũ/lỗi sản phẩm đúng policy không tự là lỗi tư vấn. Verifier tổng cộng chỉ có7 quan sát (6PASS/1FAIL), nên không giải thích được phần lớn các lượt không có reply bằng việc verifier siết semantics.

## F1 — Đã tái hiện lỗi chuyển sentinel màu thành màu ảnh

Ba ca p08/j6 của batch21 vàj4 của batch12 đều đã CART_OPENED, sau đó MEDIA_SELECT ERROR/UNKNOWN_INTERNAL và silent handoff. Trước review này, báo cáo frozen giữ unknown; review hiện tại bổ sung bằng chứng offline, không sửa lịch sử.

Đường lỗi:

1. Cart thật có components.color=`__NO_COLOR__`, là sentinel không có nhãn màu trong lựa chọn mua.
2. `single-agent-commerce-opening-media.ts` lấy mọi string màu từ cart rồi `normalizeCatalogToken`, biến sentinel thành `NO_COLOR`.
3. Code gọi `prepareProductImage(..., 'NO_COLOR')` như một màu khách yêu cầu. SHA256 của exact query `{subjectRef:'SV2447',intent:'GENERIC',color:'NO_COLOR'}` khớp selectorHash trong actual MEDIA_SELECT của cả3ca.
4. Replay `eligibleCommerceMedia` trên đúng frozen product/clock trong captured turn ném `MEDIA_COLOR_BINDING_UNVERIFIED`. Bỏ điều kiện màu trong counterfactual offline trên cùng source thì có2ảnhGENERIC hợp lệ.
5. `commerceDiagnostics.run` luôn ghi mọi exception là UNKNOWN_INTERNAL, che mất loại lỗi thật ở diagnostic. Media tool còn có structured error classification, nhưng final opening failure được gom thành PREPARATION_UNAVAILABLE.

Đây là lỗi nối kiểu dữ liệu ở code, không phải model bịa màu, verifier từ chối, thiếu toàn bộ ảnh hay hai màu thành phần mâu thuẫn. Không cần nguồn thông tin mới để tái hiện immediate failure này. Replay dùng clock tại last owner generation start trong captured turn, không phải timestampinstrumented của MEDIA_SELECT; không suy diễn expiry transition hoặc live-source parity. Không có provider/network/send/state mutation; output JSON là artifact review. [Replay evidence](c3-phase-c-opening-checkout-media-replay-review-20261102.json).

Hướng sửa: phân biệt rõ sentinel/unspecified với màu thật ngay tại adapter màu→media; giữ nguyên canonical cart tuple và stock identity, giữ chặn ảnh sai màu khi thực sự có màu xác định. Áp dụng nhất quán cho readiness/currentPhotos/preparation/final egress. Không vá bằng cách cấp ảnh màuNO_COLOR, thay cart sentinel bằng màu đoán, hoặc bỏ gate ảnh toàn cục.

## F2 — Phạm vi bắt ảnh làm nghẽn cả câu hỏi làm rõ/care/ACK

Owner đã chọn mọi opening identified-product reply cóảnh. Implementation hiện lấy mọi bound PRODUCT và cart product làm requiredProducts; có thể gồm cả2design candidates khi khách chưa chọn, hoặc3kết quả search trước câu hỏi phân biệt.

- p10: owner search bộhoa rồi draft hỏi khách chọn trong3mẫu; một mandatory lookup rỗng làm câu hỏi không được gửi.
- s06/s09: phối đồ/chăm sóc áo,2initial refs; ảnh trở thành prerequisite dù lượt không xin ảnh.
- s15: khách cảmơn/chọn màu; explicit color-media binding failure và code rule cùng làm handoff.

Các trường hợp này một phần là tradeoff của yêu cầu đã chốt, không nên sửa ngầm bằng skip ảnh. Nhưng prompt hiện hành dòng62 còn dặn “không biến ảnh thành điều kiện để tiếp tục tư vấn”, mâu thuẫn với code opening rule. Owner không thấy đầy đủ hậu quả terminal khi một ref không có ảnh.

Hướng xử lý cần chốt contract: phân biệt sản phẩm đã thực sự được xác định/chọn để gửi với tập ứng viên chỉ được admit để so sánh/phân biệt. Nếu vẫn giữ mọi opening identified-product reply cóảnh, readiness/source chuẩn bị phải phản ánh đúng phạm vi này và chấp nhận rõ tradeoff care/ACK. Không dùng parser/classifier mới hoặc owner tự khai nhãn quote để bypass. Không tự mở ngoại lệ chưa được owner duyệt.

## F3 — Test xanh chưa chứng minh luồng bán hàng trên trạng thái source thật

PG118/118+7invariants và worker893/Node819PASS chứng minh bounded implementation, atomicity/capture/privacy/authority. Positive add→confirm tại isolated-integration:689 có màu thậtnavy; các checkout positives cũng dựa trên giỏ synthetic đó. Chưa có positive opening checkout xuyên qua exact sentinel cart+generic media của source thật. Các guard riêng lẻ vẫn có thể đúng trong khi adapter giữa chúng sai.

Mặt khác j6 được đăng ký SALES_READY từ selection+generic media, nhưng readiness không diễn tập post-cart color-to-media query. p10 chỉ có lookup scope sau search. Readiness đang chứng minh một số dữ kiện tồn tại, chưa chứng minh prerequisites của đường tiếp theo khớp nhau. Không sửa cohort sau kết quả; cần thêm proof này trước run mới.

Ưu tiên deterministic replay actual cart/context/selected scope của ba ca trên trước; sau đó kiểm sentinel/màu thật/không rõ màu/màu mâu thuẫn/expiry/remainingbudget và exact group gate. Giữ add→confirm/private preview positives; không chỉ tăng số unit tests lặp implementation.

## F4 — Continuation và tool schema vẫn còn lỗi cũ

- s13: continuation66639/65536byte, PRE_DISPATCH/0HTTP; không phải quota hoặc model chậm. System22000/schema18608/trusted11945/dialogue13826byte trong telemetry. P1 trước chỉ có headroom393byte trên constructed envelope, không bảo đảm các actual2-product continuations khác đều vừa.
- s11: HTTP200/STOP nhưng `read_product.color=null` ở SINGLE không hợp tool contract, OWNER_TOOL_OUTPUT/MALFORMED. Đây là mismatch output/schema, không phải verifier hoặc thiếu credentials.
- s04: search khi đã bound2products bị PRODUCT_BOUND, read_product vẫn OK rồi owner tự handoff. Không thể chỉ thêm câu “đọc dữ liệu trước” vào prompt; cần xem owner đang thấy callable restrictions/result đủ rõ chưa.

Hướng sửa: đo exact owner body sau từng actual tool result trên các frozen failures; factor/dedup phần cấu trúc lặp, giữ nguồn/ref/schema meaning và không tăng cap. Đồng nhất nullable/omission contract ở tool surface và decoder, không tự bỏ màu khách yêu cầu hoặc nới validation để thực thi query khác. Không thêm generation retry/repair loop.

## F5 — Giọng và sức bán: có vấn đề nhưng phải đúng ngữ cảnh

P01 hỏi giá: đoạn tên/giá/chất liệu/form/size là form báo giá đã được owner quy định trong prompt dòng60. Không thể đồng thời yêu cầu form đó rồi chấm liệt kê mọi trường là sai. Tuy vậy source description hiện có đúng chuỗi “tơ Hàn thêu… form nhẹ… mềm, thoáng… độ bay tự nhiên”, nên model dễ sao chép nguyên thay vì chọn ý.

J3 lượt1 không hỏi giá: khách nói có quần nâu, muốn áo. Owner lại quote_product, trả499k+đoạn chất liệu+size, không đi vào phối với quần nâu. Đây là chọn sai việc cần làm/áp form rộng hơn trigger, không đơn thuần thiếu một từ ngữ tự nhiên. P04 nhắc lại height/weight không sai fact, nhưng không có lý do mới cần đọc lại cả hai giá trị.

Hướng xử lý: giữ form báo giá đúng trigger; với tư vấn, chọn dữ kiện trả lời được quyết định hiện tại của khách. Kiểm riêng owner trên cùng frozen context/không thêm tool dependency để tách advice khỏi execution failures. Không tiếp tục thêm adjective bans, ví dụ từng case hoặc một khuôn3câu cho mọi reply. Runtime/prompt chưa đổi ở review này.

## F6 — Một verifier FAIL cần review theo đủ ba giá

J3 lượt2 hỏi chân váy có dễ mặc lại không. Owner draft có tư vấn phối và upsellset799k, nói “tiết kiệm hơn hẳn… chỉ thêm300k”. Verifier chọn baseline muaáo499k rồi chặn savingsclaim. Tuy nhiên trusted snapshot thật đã có AO499k, CV449k, SET799k: so với mua riêng cảhai là948k, set rẻ149k; chênh so áo là300k.

Do đó không phải thiếu giá/facts. Cần đánh giá toàn câu/hội thoại và mốc so sánh: “thêm300k cócảbộ” là phép tính đúng; “tiết kiệm” thiếu baseline rõ có thể bị đọc quá chặt khi upsell. Không tự kết luận mọi FAIL này là đúng safety hoặc mặc nhiên cho qua quảng cáo sai tổng. Review riêng ca đủ ba giá với các controls tăng giá/giảm tiền giả; không nới verifier toàn cục để chữa29handoff từ nhiều nguyên nhân khác. Kết quả frozen1FAIL không đổi.

## Hướng tiếp theo

Giữ kiến trúc/atomic checkout/authority guards. Ưu tiên: (1) adapter sentinel màu và typed diagnostics, (2) readiness khớp post-cart/discovery media scope, (3) exact continuation/schema compatibility, rồi mới kiểm advice và verdict upsell trên inputs đã ổn. Chỉ sau deterministic reproduction/negative controls và review mới đăng ký lượt provider mới. Không cần rollback toàn bộ hoặc bổ sung hàng loạt nguồn mô tả để cứu lỗi code. Mục tiêu acceptance phải là hội thoại đi được đến hỏi thông tin/preview và quyết định mua, cùng actual sent outcome; không dừng ở118testPASS.

## Kiểm tra thực hiện trong review này

- Đọc cả hai transcript:33case IDs/48actualturns, raw failures/tool responses, current owner prompt/source description, implementation diff và approved plan/review.
- `git diff --exit-code 603c391b7e348b3b9b61d631c4ac15f0ec34bcda..HEAD -- apps/worker/src ':!apps/worker/src/*.test.ts' packages` PASS: runtime/shared bytes giữ nguyên từ implementation.
- `node ../c3-opening-checkout-review-media-replay-20261102.mjs`: initial review assertion phát hiện normalizer bỏ underscores (`__NO_COLOR__`→`NO_COLOR`); sửa expectation của script review, final3/3 exact-selector replay reproduced. Không sửa production runtime.
- Đọc actual verifier trusted snapshot j3t2, xác nhận đủ ba PRICEclaims499000/449000/799000; giữ nguyên draft/verdict.
- Không model/provider calls, state/effects/live send; không độc lập post-run approval mới. Batch21 có prior independent accounting/report approval; batch12 post-run audit vẫn NOT_COMPLETED_USAGE_LIMIT. Review này là primary, không thay thế phần độc lập còn thiếu.
