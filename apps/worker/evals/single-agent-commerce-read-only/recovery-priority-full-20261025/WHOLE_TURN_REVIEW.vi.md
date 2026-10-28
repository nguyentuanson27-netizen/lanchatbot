# Review toàn vòng recovery priority — 2026-10-25

Review sau run, không thay nhãn hoặc denominator đã đăng ký. Source chạy `33d83f685411f44dffd2a0d7c61c92a607c34d62`, HEAD đọc `72ecbe39b75a98e7612f8d5b148ec532ee3547c4`. Đã đọc 51 terminal, đầu vào/history tương ứng, đối chiếu trace các lỗi và review vòng trước. Đây là self-review, không phải đánh giá độc lập hay vòng provider mới.

## Kết luận

Vòng này cải thiện continuity khi lỗi: generic FALLBACK từ 4 xuống 0, HANDOFF từ 3 lên 7. SEND_ELIGIBLE vẫn 42/51. Năm lượt lỗi vẫn chưa giải đáp nhu cầu mua hàng; hai handoff khác là bước nghiệp vụ bình thường. Hai NO_SEND của đường model vẫn có thông điệp/preview checkout do code tạo. Không coi 42 là 42 hội thoại bán hàng đạt, hoặc handoff là đã giải quyết câu hỏi.

17 controls PASS (8 SAFE, 8 UNSAFE, 1 probe); chỉ kết luận zero observed send-eligible false PASS trên population/config đã kiểm. Native có 41 verifier PASS, 4 verifier FAIL; một FAIL được cứu bằng summary giỏ có receipt. Hai lỗi owner khác kết thúc bằng handoff. Không có retry generation.

## Finding mới: câu đã gửi bị mất khỏi history vì nhận nhầm PII

`negotiation-price-objection` đã gửi:

> Ưu đãi 30.000đ. Tổng 499.000đ, đã gồm phí giao hàng. Có món đặt trước, chị nhé. Giỏ của chị: 1 áo (mẫu “Set váy Thạch Thảo”) màu be, size M.

Sang `negotiation-total-control`, cả request owner lẫn verifier đều không có câu này. History còn lời báo 529.000đ, câu khách xin bớt, rồi câu hỏi tổng tiền. Trusted cartQuote đã là version 2, discountTotalVnd=30000, grandTotalVnd=499000; effectReceipts rỗng. Owner gọi lại record_negotiation, bị REJECTED/NEGOTIATION_SOURCE_OR_CART, rồi viết đã áp dụng ưu đãi. Verifier chặn EFFECT_WITHOUT_RECEIPT; khách nhận holding reply thay vì tổng tiền.

Kiểm tra trực tiếp hàm đang build, dùng đúng publicTerminalText ở ACTUAL_TERMINALS:

```js
import fs from 'node:fs';
import {isPrivateCommerceText, commerceHistory} from './dist/single-agent-commerce-ingress.js';
import {redactAnalyticsMessage} from '@lana/database';
const data=JSON.parse(fs.readFileSync('evals/single-agent-commerce-read-only/recovery-priority-full-20261025/ACTUAL_TERMINALS.json','utf8'));
const text=data.actualTerminals.find(x=>x.caseId==='negotiation-price-objection').publicTerminalText;
console.log(JSON.stringify({isPrivate:isPrivateCommerceText(text),redacted:redactAnalyticsMessage(text).text,projectedHistory:commerceHistory([{senderType:'BOT',text}])}));
```

Đã chạy qua PowerShell here-string pipe `node --input-type=module`, cwd apps/worker, exit 0. Kết quả: `{"isPrivate":true,"redacted":"[ADDRESS]","projectedHistory":[]}`. Source ingress dòng 42–50 gọi redactor và loại toàn tin bị coi private. Đây là cơ chế mất history tái hiện được, không chỉ lỗi hiển thị capture. Chưa chứng minh chỉ phục hồi history là đủ để model ngừng gọi tool sai; còn khoảng trống receipt và phân công đọc quote/ghi ưu đãi.

Hướng sửa: bảo toàn public output có provenance và receipt/current-cart binding qua lịch sử/context; giữ dữ liệu checkout riêng tư ngoài model. Không whitelist cả tin chỉ vì sender BOT, không bỏ privacy filter toàn cục. Câu hỏi tổng tiền dùng quote hiện tại; không cần thực hiện lại negotiation. Nếu mô tả effect cũ, phải cung cấp bằng chứng còn áp dụng cho đúng cart/version, không dùng prose cũ làm authority. Test cả chuỗi giảm giá → code summary được gửi → hỏi lại tổng, cùng đối chứng đổi cart/hết hạn/private checkout.

## Media: có dữ liệu nhưng projection và recovery chưa khớp

`media-overview-next:continue` bị chặn ở câu “ảnh chụp trọn bộ ... trước và sau”. Raw asset mặt sau có `partsVisible:["FULL_SET"]`; `descriptionEvidence()` chỉ giữ AO/CHAN_VAY/QUAN nên cho `confirmedParts:[]`, `componentKnown:false`. Cả hai biểu diễn được đưa vào context. Vì vậy kết luận cũ “nguồn chưa có metadata” chưa đủ chính xác: có nhãn whole-look, nhưng projection không biểu diễn nghĩa của nó. `media-selector-v2.ts` có alias FULL_SET → FULL_LOOK ở taxonomy loại ảnh; alias này chưa tự chứng minh từng bộ phận hay chất liệu của ảnh.

Cần chốt nghĩa nhãn nguồn rồi normalize một lần dùng chung owner/verifier/recovery. Giữ phân biệt toàn bộ dáng nhìn thấy với xác nhận cụ thể từng phần; không tự biến FULL_SET thành mọi part. Đồng thời recovery vẫn thiếu referent có provenance (`currentProductId=null`): sửa projection không tự chữa được mọi nhánh recovery.

`media-decision:ask` khác: owner gọi ảnh đã chọn là “ảnh cận cảnh chất liệu ren và thêu”, trong khi description evidence không xác nhận nội dung đó. Đó không phải lỗi của lời tư vấn chủ quan về thanh lịch/điệu. Cần tool trả rõ ảnh đáp ứng yêu cầu nào, ảnh thay thế nào, phần nào được xác nhận. Không chữa bằng nới verifier cho mọi caption. Khách lượt này cần lời khuyên mua; ngay cả draft trước chặn vẫn mở lại áo lẻ/cả bộ, chưa giúp quyết rõ.

`media-detail-next:continue` nay gửi một ảnh CLOSEUP và caption đúng. Test riêng chứng minh metadata-only refresh không còn làm mất snapshot; run thành công không chứng minh lần này đã xảy ra refresh. `media-overview-next:ask` cũng đã gửi hai ảnh mẫu thay vì chỉ mời xem như vòng trước. Lượt continue sau đó vẫn thất bại, không nên chấm cả chuỗi thành công chỉ vì lượt đầu có ảnh.

## Hai lỗi owner generation và giới hạn recovery

- Discovery: một search (cùng call ID xuất hiện lại trong history, không tính thành hai lần), hai read_product; một read bị SUBJECT_BOUND, một read trả SQ629 giá 749.000đ/PRE_ORDER. Ở generation cuối, mode NONE và 0 tools, owner vẫn trả read_product → OWNER_TOOL_MODE. Chưa có final advisory draft. **Audit đầu vào sau review làm rõ:** cả SQ748 và SQ629 đều là PRODUCT đã bind; owner đọc cả hai với offerType=null, mỗi mẫu ba offers. Hợp 3 parent + 6 variants vượt cap 8. Đây là expansion quá giới hạn, không phải chọn PRODUCT chưa bind. Cần kiểm batch/offer scope và dữ liệu chọn hàng; không chỉ tăng vòng tool hoặc thêm câu cấm gọi tool vào prompt. Chi tiết trong [audit đầu vào](../../../../../docs/specs/c3-phase-b-input-context-improvement-plan-20261025.md).
- Deadline Cần Thơ sáng mai: tool đã trả ETA 4–8 ngày, nhưng owner kết thúc MALFORMED_RESPONSE/HTTP 200. Handoff giữ việc, song câu “Em chưa tra được thông tin này ngay” chưa mô tả sát thực tế: dữ liệu đã có. Đây là khoảng trống recovery dựa trên fact đã xác minh và copy failure, không phải thiếu mapping miền Nam hay chưa có ETA.

Nếu mở recovery quote/ETA, dùng contract code-owned, binding/freshness và delivery gate; không lấy câu từ rejected draft, không tạo parser câu hỏi hay renderer riêng cho từng benchmark. Handoff tiếp tục là lựa chọn cho phần chưa có recovery hợp lệ.

## Bán hàng, policy và giọng

Phần giao dịch khá tốt ở lượt quan sát: đúng bộ/áo/váy, giá và tồn theo tool; đổi số lượng/size, giữ lựa chọn sau correction, tổng/preview/confirmation tiếp nối đúng. Năm opening quote đều gửi được; hỏi lại giá không gửi lặp ảnh. “Có sẵn S/M/L/XL” trong opening organic khớp source IN_STOCK của SET_VAY; không được lấy PRE_ORDER của áo màu be trong giỏ khác để kết luận câu này sai.

Policy: ba ca mốc cũ dùng thời hạn/fee hiện hành trong candidate; ba ca đã dùng/thử/cắt tem giặt từ chối đúng nguồn của run. Không ép câu hỏi thời hạn phải liệt kê lại toàn bộ điều kiện. Các con số 15 ngày/30.000đ là dữ liệu của run, không tuyên bố policy live.

Ba ca POS_UNAVAILABLE cố ý chỉ trả phần chất liệu. Đúng giới hạn B1 read-only, vẫn là partial về nhu cầu mua. Không tính thành ba ca đã hoàn tất giá/tồn hoặc yêu cầu giả receipt handoff trong harness này.

Tư vấn còn hai điểm rõ: `b1-buying-concern` dùng độ mềm/rũ để khẳng định không rườm rà, trong khi điều khách ngại là nhiều ren; `b1-buying-concern-v2` trả dài và mở nhiều hướng khi khách hỏi có nên mua. Không kết luận lỗi an toàn chỉ vì lời cảm nhận đã được owner cho phép. `b1-buying-concern-v3` tốt hơn vòng trước: chọn áo và không quay lại bán cả bộ chỉ vì còn ngân sách. `b1-changed-occasion-v2` đã trả trực tiếp “nhẹ nhàng và thoáng”, không đẩy khách tự quyết mức thoải mái như lần trước; lý do vẫn thiên về kể chất liệu.

Giọng tốt ở câu hỏi giao dịch ngắn. Các câu tư vấn vẫn nhiều “form nhẹ”, “độ rũ tự nhiên”, “thanh nhã”, cùng câu mời chung. Correction vẫn “em ghi nhận số đo mới”; có receipt nên không phải báo effect giả, nhưng vẫn giọng hệ thống. Nhắc một dữ kiện phục vụ size không tự là lỗi. Theo ưu tiên owner, không đưa polish giọng thành vòng prompt mới.

## Rà đủ 51 terminal

Nhận xét toàn lượt, không phải điểm keyword hay nhãn PASS mới. “Dùng được” không chứng minh ổn định. Các placeholder checkout là redaction, không phải câu khách nhận bị cụt.

| # | Ca | Nhận xét |
|---:|---|---|
| 1 | b1-changed-occasion | Chọn món thay và so sánh theo hoàn cảnh; dài, quả quyết. Giữ ranh giới suy luận định tính owner đã chốt, không đòi phép thử riêng. |
| 2 | b1-current-policy | Dùng được: trả đúng thời hạn mới và phí. |
| 3 | b1-partial-source | Partial đúng thiết kế: có chất liệu, chưa có giá/tồn. |
| 4 | b1-price | Giá đúng; hỏi thêm size không cần cho câu hỏi này. |
| 5 | b1-component-stock | Dùng được, đúng áo M và giá mua riêng. |
| 6 | b1-search-read | Dùng được: giá áo dài lẻ/cả bộ. |
| 7 | b1-buying-concern | Có trả lời, nhưng lập luận mềm/rũ → không rườm rà chưa giải quyết gu nhiều ren. |
| 8 | b1-policy-used | Dùng được: đã mặc đi làm thì không đổi; không cần bàn phí giả định nữa. |
| 9 | b1-changed-occasion-v2 | Trực tiếp hơn vòng trước; vẫn chủ yếu kể chất liệu, chưa phải cải thiện tư vấn đã ổn định. |
| 10 | b1-current-policy-v2 | Dùng được: mốc 15 ngày và phí hiện hành thắng history. |
| 11 | b1-partial-source-v2 | Partial đúng; nhắc “hệ thống” không hữu ích cho khách. |
| 12 | b1-price-v2 | Dùng được, đúng nguyên bộ. |
| 13 | b1-component-stock-v2 | Dùng được, đúng chân váy M/giá. |
| 14 | b1-search-read-v2 | Tìm đúng mẫu, báo giá; gợi mua lẻ không làm sai nhu cầu. |
| 15 | b1-buying-concern-v2 | Cần cải thiện quyết định: cả bộ/áo/váy đều mở lại, đoạn dài. |
| 16 | b1-policy-used-v2 | Đúng policy HOLD_UP_ONLY của nguồn: đã mặc thử thì từ chối. |
| 17 | b1-changed-occasion-v3 | Chọn áo lẻ cho hoàn cảnh mới, lý do dùng được; gọt từ là việc sau. |
| 18 | b1-current-policy-v3 | Dùng được, không bị mốc cũ chi phối. |
| 19 | b1-partial-source-v3 | Partial đúng; chưa hoàn tất giá/tồn. |
| 20 | b1-price-v3 | Dùng được. |
| 21 | b1-component-stock-v3 | Dùng được, đúng phần mua. |
| 22 | b1-search-read-v3 | Đúng giá/tồn; bảng áo/quần thêm hơi nhiều so với hỏi set. |
| 23 | b1-buying-concern-v3 | Lựa chọn áo có ích, dùng món khách đã có, không quay lại upsell cả bộ vô cớ. |
| 24 | b1-policy-used-v3 | Từ chối đúng tình huống đã cắt tem/giặt. |
| 25 | stateful-open | Thêm giỏ có căn cứ, báo hàng đặt trước. |
| 26 | stateful-variant-quantity | Đổi 2 áo L, tổng đúng. |
| 27 | stateful-quote | Tổng/ship/giảm đúng; đáp câu hỏi. |
| 28 | stateful-correction | Giữ giỏ theo yêu cầu; còn giọng báo cập nhật hồ sơ. |
| 29 | stateful-request-checkout | Code xin thông tin thiếu; NO_SEND ở đường model không có nghĩa khách bị bỏ im. |
| 30 | stateful-private-checkout | Preview có tổng/đặt trước/ETA; dữ liệu cá nhân che trong artifact. |
| 31 | stateful-confirm | Handoff nghiệp vụ có commit, không nhắc nhân viên; không giả đã tạo đơn POS. |
| 32 | stateful-human-request | Handoff theo yêu cầu, xác nhận gọn. |
| 33 | sales-discovery-advice:need | Chưa trả lời: SUBJECT_BOUND rồi final-only tool call; có handoff. |
| 34 | sales-product-gallery:overview | Có hai ảnh, nhưng màu be chưa được bind. Partial về đúng màu, không khẳng định ảnh sai màu. |
| 35 | sales-size-advice:height-weight | Size M có căn cứ; nhắc dữ kiện không tự là lỗi. |
| 36 | sales-southern-delivery:deadline | Chưa trả lời dù ETA có sẵn; owner malformed, handoff. |
| 37 | media-overview-next:ask | Báo thiếu feedback và gửi ảnh mẫu thay, hữu ích hơn vòng trước. |
| 38 | media-overview-next:continue | Không có ảnh mới, handoff; projection FULL_SET và referent recovery cần xử lý. |
| 39 | media-detail-next:ask | Phân biệt feedback/ảnh mẫu, có gửi hai ảnh thay thế. |
| 40 | media-detail-next:continue | Có ảnh cận và caption hợp lệ; target recovery cải thiện. |
| 41 | media-and-price:ask | Có ảnh mẫu và giá áo; chưa có feedback như khách muốn nhưng không gọi nhầm ảnh khách. |
| 42 | media-and-size:ask | Có ảnh cận + kết quả size, dùng được. |
| 43 | media-decision:ask | Không nhận tư vấn/ảnh, chỉ handoff; draft bị sai lời giới thiệu ảnh. |
| 44 | negotiation-cart-setup | Giỏ, pre-order, tổng đúng; CTA chung không phải lỗi nghiệp vụ. |
| 45 | negotiation-price-objection | Owner tự thêm “thêu thủ công”; code cứu bằng summary đúng ưu đãi/tổng. |
| 46 | negotiation-total-control | Không trả được tổng dù quote đủ; mất history public + receipt cũ, gọi mutation lại. |
| 47 | opening-ad | Báo giá + ảnh; gợi giá mua lẻ không phải lỗi an toàn. |
| 48 | opening-ad-repeat | Gọn, không gửi lặp ảnh. |
| 49 | opening-organic | Giá/size tồn + ảnh đúng tool; CTA dư nhẹ. |
| 50 | opening-unresolved | Hỏi tên/ảnh để biết món, đúng bước. |
| 51 | opening-multipart | Đủ giá bộ và mua áo lẻ; câu hỏi không yêu cầu ảnh. |

## Ưu tiên tiếp theo

1. Chữa mất public recovery trong history và nối quote/receipt đúng cart. Đây là lỗi cụ thể tái hiện được, ảnh hưởng trực tiếp lượt gần chốt mua. Giữ privacy và freshness.
2. Đồng bộ nghĩa metadata ảnh; tách whole-look/part/detail. Giải referent recovery bằng provenance, không tên case hoặc regex hội thoại.
3. Kiểm subject binding sau search và giao thức final-only trước khi mở ngân sách. Không coi handoff là đã chữa discovery.
4. Đánh giá khả năng phục hồi quote/ETA từ code-owned facts hiện có bằng hợp đồng riêng; sửa copy failure để không báo thiếu dữ liệu khi chỉ generation lỗi. Không dùng catch-all dựng protected prose.
5. Giữ giọng/rubric ổn định khi kiểm các sửa kỹ thuật; review riêng lựa chọn mua và nhu cầu chưa đáp ứng. Không chạy full lặp lại chỉ để chờ lần model may mắn.

## Giới hạn và hoạt động review

Một attempt/case, không có kết luận độ ổn định. Thời gian toàn lượt p50/p95 26,0/62,7 giây; verifier 10,9/19,9 giây, còn chậm ở một số chuỗi. 165 request gồm controls, không phải 165 ca. Handoff đã chứng minh lưu công việc và delivery capture trong môi trường cô lập, chưa chứng minh Pancake thật nhận tag hay người xử lý trả lời.

Lượt review này chỉ đọc evidence/source và chạy kiểm tra local privacy/history nêu trên; không gọi provider, không chạy lại suite/build, không sửa runtime/prompt. Nguồn tổng hợp: [CHECKPOINT_B](CHECKPOINT_B.md), [51 terminal](ACTUAL_TERMINALS.json), [metrics](REVIEW_METRICS.json), [review vòng trước](../full-phase-b-20261025/WHOLE_TURN_REVIEW.vi.md). Raw nằm ngoài repo trong thư mục c3-phase-b-recovery-full-20261025 ghi trong CHECKPOINT_B.
