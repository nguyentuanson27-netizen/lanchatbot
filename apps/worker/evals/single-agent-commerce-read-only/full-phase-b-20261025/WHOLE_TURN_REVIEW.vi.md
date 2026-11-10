# Review đủ 51 kết quả — Phase B 2026-10-25

Nguồn chạy: `18df7cc9fa7c52a570ce8ab5356c35e4aee13cbd`. Owner Gemini 3.5 Flash Lite HIGH; verifier GPT-6.1 Sol HIGH. Đọc lại 24 đầu vào/kết quả B1, 27 đầu vào/kết quả persisted, và trace nguồn/tool/verifier của các finding. Đây là nhận xét toàn lượt theo mục tiêu bán hàng, không phải lần chấm độc lập hoặc thay nhãn để đạt acceptance. Không chạy thêm provider, không sửa runtime trong lượt review này.

## Kết luận

Phần hỏi giá, mua lẻ, thay giỏ, tính tổng, thời hạn và các trường hợp đã vi phạm điều kiện đổi hoạt động tốt trong mẫu chạy. Khả năng giúp khách chọn vẫn yếu: gặp băn khoăn thì đọc mô tả, trấn an rồi đưa lại lựa chọn cho khách. Ảnh đã đi được qua luồng thật của candidate nhưng hai lượt có ảnh hợp lệ vẫn kết thúc không có ảnh. B chưa GO.

42 SEND_ELIGIBLE không phải 42 ca tư vấn tốt. Bốn FALLBACK gồm ba lỗi generation và một verifier FAIL. Ba HANDOFF gồm xác nhận mua, khách yêu cầu chuyển xử lý và một snapshot mismatch. Hai NO_SEND của checkout vẫn có tin do code tạo được capture; không được hiểu là hai khách không nhận câu trả lời. Mỗi ca chỉ chạy một lần. Thời gian toàn attempt trên 51 records: nearest-rank p50 23,50 giây, p95 52,39 giây; đây là thời gian runner, không phải latency production.

## Finding và căn cứ

### 1. Ca ảnh cận: snapshot đổi vì metadata, không phải thiếu ảnh

`media-detail-next:continue`: khách xin cận phần thêu áo. Tool chọn thành công ảnh DETAIL/CLOSEUP, confirmedParts=[AO]. Owner viết “Dạ, em gửi chị ảnh cận cảnh họa tiết thêu nổi trên áo của set Thạch Thảo nha chị!”; verifier PASS. Final gate trả STALE/CURRENT_SNAPSHOT, recovery đổi thành HANDOFF/DEPENDENCY_FAILURE; khách nhận “Em chưa tra được thông tin này ngay. Shop sẽ kiểm tra lại rồi trả lời chị nhé.” và không có ảnh.

So sánh toàn bộ trusted gửi verifier với `result.currentPublicContext` chỉ thấy bốn đường dẫn đổi:

- `policyLiterals[2].observedAt`: 02:04:35.533Z → 02:34:35.633Z.
- `policyLiterals[2].expiresAt`: 04:04:35.533Z → 04:34:35.633Z.
- `policyLiterals[2].sourceVersion`.
- `state.factSnapshotVersion`.

Literal là `offers:SV2447`; text cả hai bên vẫn là `{productId:SV2447, availableOffers:[AO,CV,SET_VAY]}`. Revision vẫn 0; không có thay đổi khác trong hai trusted context. `single-agent-commerce-read-only-tools.ts` tạo sourceVersion từ `{releaseId, observed, availableOffers}`. Gate làm đúng hợp đồng hash hiện tại; cách version hóa refresh metadata gây gián đoạn không cần thiết cho yêu cầu ảnh này. Cần tách identity của nội dung nghiệp vụ khỏi metadata của lần đồng bộ, vẫn kiểm freshness và thay đổi thật; không bỏ gate hoặc mặc định mọi snapshot khác nhau đều tương đương. Chưa xác định vì sao upstream refresh đúng thời điểm đó.

### 2. Ca ảnh cả bộ: metadata chưa đủ nhưng recovery bỏ luôn phần có thể dùng

`media-overview-next:continue`: tool chọn hai ảnh MODEL, FRONT và BACK. FRONT xác nhận AO+CV; BACK có confirmedParts=[] và componentKnown=false. Owner giới thiệu “ảnh mẫu mặc set Thạch Thảo ở cả mặt trước và mặt sau … phom dáng áo và chân váy”. Verifier chặn theo giới hạn mô tả ảnh hiện hành.

Không có cơ sở từ trace để kết luận ảnh BACK thực tế sai hoặc không có cả bộ: dữ liệu chỉ chưa xác nhận. Vì vậy nên gọi đây là khoảng trống mô tả ảnh cộng với câu dẫn vượt metadata, thay vì khẳng định đã phát hiện ảnh sai. Sau chặn, khách chỉ nhận “Phần này em chưa trả lời được, chị nhé.”; ảnh FRONT đã được xác minh cũng không được dùng. Cần bổ sung metadata từ nguồn ảnh nếu có, và chuẩn bị đường trả ảnh/caption được code kiểm tra riêng cho kết quả media hợp lệ; không gửi lại draft bị reject hoặc viết lại sau PASS rồi giữ verdict cũ.

### 3. Ba fallback do provider, không phải verifier không hiểu chính sách

| Ca | Lỗi quan sát | Kết quả khách nhận |
|---|---|---|
| b1-buying-concern | Owner lần 2 HTTP 200 nhưng rawFinishReason=MALFORMED_RESPONSE | Fallback chung |
| b1-current-policy-v2 | Owner lần 2 HTTP 200 nhưng rawFinishReason=MALFORMED_RESPONSE | Fallback chung |
| b1-component-stock-v2 | Owner lần 2 HTTP 429 | Fallback chung |

Các ca đã đi qua lượt tool trước lỗi. Không có final draft được verifier chấm ở ba ca này. HTTP 429 chưa đủ kết luận hết quota ngày hay giới hạn tốc độ cụ thể. Không có bằng chứng để quy hai MALFORMED_RESPONSE cho prompt tư vấn hay policy. Khi sửa cần kiểm riêng provider boundary và đường phục hồi phần dữ liệu đã xác minh; không thêm quy tắc policy để chữa ba lỗi này, không hidden retry.

### 4. Discovery: kết quả tìm ít phù hợp, owner chọn theo giá rồi hợp thức hóa

Khách: “Chị tìm bộ áo quần đi làm, dưới một triệu thôi, đừng bó bụng quá.” Query thực tế: `bộ đồ công sở đi làm`. Kết quả có một váy, SQ748 quần short, SQ675 quần dài. Owner đọc hai set: SQ675 giá 1.279.000đ, SQ748 giá 799.000đ, rồi chọn SQ748.

Vì vậy không đúng nếu nói đã có một set quần dài phù hợp ngân sách mà owner bỏ qua. Trace cho thấy owner chưa tìm được lựa chọn đồng thời thỏa nhu cầu và giá. Nó chọn món rẻ hơn rồi mô tả “ngọt ngào và thanh lịch”, chưa giải quyết việc quần short có hợp nơi làm của khách hay không. Khách chưa nói cấm quần short; đây là thiếu cơ sở cho quyết định bán hàng, không phải một lệnh cấm quần short.

“Không lo bó bụng” cần xét nghĩa cả câu: lời khuyên chung từ quần suông/cạp chun đã được cho phép, nhưng bảo đảm vừa cơ thể cụ thể thì cần fit. Không tự kết luận false PASS chỉ vì trace chưa có SIZE_FIT. Phần chắc chắn cần sửa là chọn món chưa đủ thuyết phục và diễn đạt quá chắc trước khi chọn size.

Hướng xử lý: kết quả tìm kiếm phải giúp thấy loại quần, giá và lựa chọn mua có thể dùng; khi chưa tìm được món phù hợp, owner tìm tiếp hoặc làm rõ một đánh đổi thực sự. Không coi đứng đầu tìm kiếm hoặc rẻ hơn ngân sách là đủ điều kiện để khuyên mua.

### 5. Tư vấn dài và thiếu quyết định dù prompt đã yêu cầu ngược lại

- `b1-changed-occasion-v2`: khách dễ nóng, tiệc chuyển ra sân vườn; bot đọc đặc điểm vải rồi hỏi “chị cân nhắc xem mức độ này đã đủ thoải mái…”. Khách không được giúp ra quyết định.
- `b1-buying-concern-v2`: mở đầu thừa nhận nhiều chi tiết, sau đó khen “sang trọng vừa đủ”, rồi đề xuất cả bộ/áo/chân váy. Không chốt hướng mua dù khách hỏi có nên lấy.
- `media-decision:ask`: dùng “ren mềm, form nhẹ, độ rũ” để trấn an nỗi lo nhìn nhiều ren. Độ rũ không tự giải quyết gu ít chi tiết; có gửi ảnh nhưng lời tư vấn vẫn quảng cáo chung và mở lại mọi phương án.
- `b1-buying-concern-v3`: đã chọn áo vì khách có chân váy, nhưng đoạn cuối quay lại giới thiệu cả bộ chỉ vì vẫn trong ngân sách. Phần đầu có ích, phần sau làm yếu quyết định.

Prompt hiện hành đã có chỉ dẫn chọn một hướng, không chép mô tả, không đọc lại hồ sơ và không báo cáo lưu state. Tiếp tục thêm câu “tự nhiên hơn/chọn một món” sẽ lặp hướng sửa cũ. Nguồn catalog có nhiều lời khen; câu trả lời tái sử dụng chính các tính từ đó. Đây là bằng chứng về việc output bám văn mô tả, chưa phải bằng chứng nhân quả rằng riêng prompt hoặc riêng context gây toàn bộ lỗi. Nên thử thay cách trình bày dữ liệu phục vụ chọn mua, giữ dữ kiện gốc và đối chứng cùng ca, thay vì sửa đồng thời prompt, rubric và verifier.

### 6. Giọng chat: tốt ở hỏi đáp ngắn, chưa tốt ở tư vấn

Giá/mua lẻ/ETA có nhiều câu dùng được. Câu tư vấn dài thường lặp tình huống khách, dùng nhiều tính từ, ngoặc giải thích, hoặc kết bằng “cần hỗ trợ thêm…”. `stateful-correction` vẫn “em đã ghi nhận số đo mới”; có receipt nên không phải báo thao tác giả, nhưng là giọng hệ thống mà owner đã yêu cầu bỏ. `stateful-confirm` còn câu chuyển “nhân viên”; đã sửa bằng code sau run tại `3629ca84`, không tính là cải thiện đã quan sát trong run.

Nhắc một dữ kiện có ích không tự là lỗi. Ví dụ một lần nhắc chiều cao/cân nặng bên cạnh kết quả size không đáng chấm FAIL chỉ vì có nhắc lại; nên bỏ khi không thêm giá trị. Báo chi tiết tạm tính/ship/ưu đãi ở checkout cũng hợp lý. Ngược lại, câu hỏi chỉ cần tổng tiền thì `negotiation-total-control` đang giải thích lại phép tính dài không cần thiết.

### 7. Tool state tự phục hồi được nhưng có một lần vấp hợp đồng input

`stateful-open` gửi cùng sourceQuote “Eo chị 76, mông 98” cho từng field, bị QUOTE_MUST_CONTAIN_ONE_VALUE; add_to_cart bị DEPENDENT_STATE_REJECTED. Owner sửa quote thành “Eo chị 76” và “mông 98”, rồi ghi state/thêm giỏ thành công. Đây là một lần sửa tham số tool có kiểm soát, không phải generation retry sau provider lỗi và không phải repair/reverify draft.

Log `toolResponses` chứa response được lặp lại trong lịch sử request sau. Phải đếm theo call ID; không dùng số dòng lặp để kết luận model đã gọi lại cùng tool nhiều lần. Các `counts` persisted cũng tích lũy theo group, không được cộng chúng như số request riêng từng ca.

## Điều chỉnh nhận xét sơ bộ

- Ca đi xe/độ nhăn: nguồn xác nhận tơ, ren, cấu trúc hai lớp và đứng form của món thay; prompt và corpus cho phép so sánh định tính từ chất liệu/thiết kế. Không chấm false PASS chỉ vì không có phép thử ba giờ. Reply còn dài và khá quả quyết, nhưng review này không kết luận đã vi phạm ranh giới được owner chốt.
- “Ưu đãi tốt nhất” trong negotiation: code xác nhận freeship/tổng tiền, chưa xác nhận tuyên bố tốt nhất. Nên bỏ câu thừa và nói mức hỗ trợ cụ thể; không mặc định đây là claim so sánh toàn thị trường hoặc một false PASS đã xác lập.
- Ca ảnh cận không phải truy xuất ảnh thất bại. Nguyên nhân trực tiếp đã xác định là refresh metadata của offers làm đổi snapshot.
- Số 42 chỉ là SEND_ELIGIBLE. Một số câu tư vấn vẫn cần sửa; các thao tác checkout do code có thể thành công dù nhãn terminal model là NO_SEND.

## Rà từng kết quả

“Dùng được” là nhận xét cho đúng lượt quan sát, không chứng minh ổn định. “Gọt câu” không đồng nghĩa lỗi an toàn. Dấu * ở checkout nhắc rằng bản capture đã che dữ liệu, không chấm lời thoại dựa trên placeholder.

| # | Ca | Nhận xét toàn lượt |
|---:|---|---|
| 1 | b1-changed-occasion | Có chọn món thay và lý do; dài, quả quyết. Không kết luận lỗi an toàn chỉ vì suy luận độ nhăn. |
| 2 | b1-current-policy | Dùng được: đúng thời hạn hiện tại và phí; không yêu cầu đọc thêm mọi điều kiện. |
| 3 | b1-partial-source | Trả phần có nguồn, phần giá/tồn chưa có; hơi dài, chưa giúp tiếp việc mua. |
| 4 | b1-price | Dùng được; thêm size không gây khó hiểu. |
| 5 | b1-component-stock | Dùng được, đúng áo/size/giá. |
| 6 | b1-search-read | Dùng được: phân biệt áo dài lẻ/cả bộ khi câu hỏi chưa rõ phần mua. |
| 7 | b1-buying-concern | Fallback vì owner MALFORMED_RESPONSE; chưa đánh giá được khả năng tư vấn. |
| 8 | b1-policy-used | Đúng từ chối hàng đã mặc; câu phí cho trường hợp hợp lệ tách rõ. Có thể ngắn hơn. |
| 9 | b1-changed-occasion-v2 | Cần sửa: giao lại cho khách việc đánh giá bí/nóng thay vì tư vấn. |
| 10 | b1-current-policy-v2 | Fallback vì owner MALFORMED_RESPONSE, không phải lỗi hiểu policy đã quan sát. |
| 11 | b1-partial-source-v2 | Trả đúng chất liệu; “chưa có sẵn thông tin” kém tự nhiên hơn nói chưa tra được. |
| 12 | b1-price-v2 | Dùng được; câu hỏi size cuối chưa cần thiết. |
| 13 | b1-component-stock-v2 | Fallback HTTP 429, mất thông tin giao dịch đã tra. |
| 14 | b1-search-read-v2 | Dùng được, tìm đúng tên và báo giá. |
| 15 | b1-buying-concern-v2 | Cần sửa: dài, tự đổi lập luận, mở nhiều hướng mà không chọn. |
| 16 | b1-policy-used-v2 | Đúng phạm vi nguồn HOLD_UP_ONLY; giải thích quá dài cho câu hỏi cụ thể. |
| 17 | b1-changed-occasion-v3 | Có tiến bộ về quyết định: chọn áo lẻ theo hoàn cảnh mới; gọt tính từ. |
| 18 | b1-current-policy-v3 | Dùng được: cập nhật thời hạn, không bắt khách đọc lại policy. |
| 19 | b1-partial-source-v3 | Giữ phần đã biết nhưng kể nhiều đặc điểm và nhắc “hệ thống”; cần gọt câu. |
| 20 | b1-price-v3 | Dùng được. |
| 21 | b1-component-stock-v3 | Dùng được, ngắn và đúng phần khách mua. |
| 22 | b1-search-read-v3 | Đúng dữ kiện nhưng mở thêm bảng giá áo/quần và CTA chung khi khách hỏi mẫu set. |
| 23 | b1-buying-concern-v3 | Lựa chọn đầu có ích; giới thiệu lại cả bộ vì còn ngân sách làm yếu lời khuyên. |
| 24 | b1-policy-used-v3 | Dùng được: đã cắt tem/giặt thì từ chối đúng tình huống. |
| 25 | stateful-open | Giỏ đúng, báo pre-order; một lần sửa sourceQuote trước khi thành công. |
| 26 | stateful-variant-quantity | Đổi L, hai áo và tổng đúng theo code; dùng được. |
| 27 | stateful-quote | Tổng đúng, đáp đúng câu hỏi; ngoặc ưu đãi có thể gọn hơn. |
| 28 | stateful-correction | State đúng; cần sửa giọng báo cáo “ghi nhận số đo mới”. |
| 29 | stateful-request-checkout | Code xin thông tin còn thiếu; capture bị che*, không chấm như câu bị cụt. |
| 30 | stateful-private-checkout | Code tạo preview, giữ số lượng/tổng/pre-order; cần bảng tóm tắt ở bước này*. |
| 31 | stateful-confirm | Handoff đã commit; copy nhắc nhân viên trái yêu cầu, đã sửa sau run. |
| 32 | stateful-human-request | Handoff theo yêu cầu, câu xác nhận gọn; dùng được. |
| 33 | sales-discovery-advice:need | Chưa đủ tốt: set quần short được chọn chủ yếu vì giá; chưa xử lý hợp chỗ làm/eo. |
| 34 | sales-product-gallery:overview | Gửi hai ảnh chung, không nói sai là đúng màu be; đáp ứng một phần yêu cầu màu. |
| 35 | sales-size-advice:height-weight | Code chọn M; dùng được, bỏ kể lại hồ sơ và CTA chung sẽ tự nhiên hơn. |
| 36 | sales-southern-delivery:deadline | Dùng được: từ chối hẹn sáng mai theo ETA 4–8 ngày, không khuyên chuyện ngoài shop. |
| 37 | media-overview-next:ask | Báo không có feedback đúng kết quả tìm; chỉ mời xem ảnh, chưa gửi phương án thay. |
| 38 | media-overview-next:continue | Metadata ảnh BACK chưa đủ; verifier FAIL, fallback mất toàn bộ ảnh. |
| 39 | media-detail-next:ask | Phân biệt feedback/ảnh mẫu, gửi hai ảnh; dùng được. |
| 40 | media-detail-next:continue | Ảnh đúng, draft đúng, verifier PASS; code chuyển xử lý do refresh metadata. |
| 41 | media-and-price:ask | Gửi ảnh mẫu và giá áo; gọi đúng loại ảnh, đáp phần có thể phục vụ. |
| 42 | media-and-size:ask | Ảnh cận + size có căn cứ; dùng được, nhắc lại chiều cao/cân nặng là polish. |
| 43 | media-decision:ask | Có ảnh nhưng tư vấn chưa gỡ lo nhiều ren; trấn an bằng lời khen và mở lại lựa chọn. |
| 44 | negotiation-cart-setup | Giỏ/pre-order/tổng đúng; câu mời hỗ trợ chung không giúp chốt bước tiếp. |
| 45 | negotiation-price-objection | Mức hỗ trợ và tổng đúng; “tốt nhất” không được tool xác nhận, nên bỏ câu này. |
| 46 | negotiation-total-control | Tổng đúng; trả lời vòng qua phép tính/ngoặc rồi chốt thêm không cần thiết. |
| 47 | opening-ad | Báo giá + hai ảnh đúng mẫu ads; dùng được. |
| 48 | opening-ad-repeat | Gọn, dùng đúng lịch sử, không gửi lại ảnh; tốt. |
| 49 | opening-organic | Báo giá + ảnh đúng mẫu; dùng được. |
| 50 | opening-unresolved | Hỏi tên/ảnh để xác định mẫu; đúng bước, có thể bớt “giúp”. |
| 51 | opening-multipart | Trả đủ giá bộ/áo + ảnh; giá chân váy thêm không cần thiết. |

## Thứ tự xử lý đề xuất

1. Tái hiện bằng test snapshot offer refresh có nội dung không đổi; sửa identity/freshness cho đúng và giữ ca thay giá/tồn/quyền/recipient thật vẫn bị chặn. Không chữa bằng prompt.
2. Tái hiện hai đường mất thông tin: provider lỗi sau tool thành công và caption media bị reject khi vẫn có ảnh hợp lệ. Thiết kế recovery từ dữ liệu code sở hữu, có boundary riêng và actual terminal test; giữ denominator/no-retry.
3. Cải thiện discovery bằng thuộc tính quyết định và khả năng tìm được hàng đúng nhu cầu/ngân sách. Kiểm riêng chất lượng danh sách ứng viên trước khi sửa lời tư vấn.
4. Sửa phần tư vấn bằng một thay đổi context có đối chứng: dữ liệu giúp chọn/so sánh rõ, không lấy văn marketing làm lời thoại mẫu. Giữ nguyên ranh giới suy luận đã chốt và rubric, không thêm ví dụ đặc trị theo từng case.
5. Đánh giá lại cả đoạn: khách có biết nên mua gì/vì sao/bước tiếp theo không; sau đó mới xét độ ngắn, lặp, tính từ. Không chấm lỗi theo từng từ “nếu”, “gợi ý”, “cả ngày” hay theo việc có nhắc lại một dữ kiện.

Tài liệu gốc: [kết quả actual terminal](ACTUAL_TERMINALS.json), [báo cáo lượt chạy](CHECKPOINT_B.md). Raw attempts/requests ở thư mục local được ghi trong báo cáo. Không sửa hoặc thay kết quả cũ.
