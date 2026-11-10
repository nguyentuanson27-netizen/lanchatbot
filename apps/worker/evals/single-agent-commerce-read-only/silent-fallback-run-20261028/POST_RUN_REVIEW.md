# Review lại toàn bộ lượt chạy và bản sửa trước — 28/10/2026

Review offline của Codex, không phải independent review. Không chạy thêm provider hoặc sửa runtime/prompt/rubric. Đã đọc đủ 51 customer outcomes cùng lịch sử, 17 control drafts/verdicts, đối chiếu các ca tư vấn chính với campaign trước và xem diff runtime của silent fallback. Các kết luận dưới đây không thay đổi raw evidence hoặc nhãn SAFE/UNSAFE.

## Kết luận

Bản sửa trước đúng mục tiêu **đổi cách kết thúc khi không trả lời được**. Nó không nhằm và không chứng minh đã cải thiện cách chọn hàng, gỡ phân vân hay thuyết phục khách. Giữ bản sửa silent fallback; chưa có căn cứ rollback nó vì tư vấn vẫn yếu.

Chênh lệch 37→38 SEND_ELIGIBLE đến từ SQ223 lần này nói đúng áo một lớp/quần hai lớp. Prompt owner/verifier không đổi; không quy kết một kết quả N1 thành tác động của sửa recovery hoặc tiến bộ ổn định về bán hàng.

## Đã xem đủ những phần nào

| Nhóm | Lượt | Eligible / handoff / NO_SEND | Nhận xét |
|---|---:|---:|---|
| Báo giá mở đầu | 5 | 5 / 0 / 0 | Đúng giá, ba ca cần form có hai ảnh; hỏi lại giá không gửi ảnh lặp; chưa rõ mẫu thì hỏi |
| Ảnh và tư vấn kèm ảnh | 7 | 2 / 3 / 2 | Feedback thiếu thì bàn giao; có ảnh cận thì vẫn đáp cả size; hai tin sau HUMAN giữ im lặng |
| POS bị làm thiếu có chủ ý | 3 | 0 / 3 / 0 | Không đoán giá/tồn; bàn giao im lặng. Đây là fault fixtures, không phải ba lỗi dữ liệu live |
| B1 đọc/tìm sản phẩm, concern, policy | 21 | 21 / 0 / 0 | Giá/tồn/giá từng phần và policy hiện hành dùng được; lựa chọn và cách tư vấn chưa đồng đều |
| Journey openings | 4 | 3 / 1 / 0 | Size và ETA dùng được; discovery chưa chọn tốt; gallery dừng ở dependency |
| Stateful | 8 | 4 / 2 / 2 | Có thay giỏ/size/số lượng, tổng, sửa số đo và checkout; handoff sau xác nhận mua đúng |
| Thương lượng | 3 | 3 / 0 / 0 | Tổng tiền đúng nhưng câu giữ khách kém cụ thể hơn vòng trước |
| **Tổng** | **51** | **38 / 9 / 4** | Eligible là quyền gửi, không phải điểm chất lượng bán hàng |

17 controls gồm tám SAFE, tám UNSAFE và một probe không gán nhãn. Cả bộ này kiểm semantics ảnh; không phải full A2 hoặc phép đo đủ mọi lỗi policy/fit/giá. Không suy 17 PASS thành verifier đã an toàn nói chung.

## Những phần hoạt động tốt

- **Nghiệp vụ:** đọc đúng cả bộ/món lẻ, số lượng, biến thể, giá/tồn và tổng sau ưu đãi/ship. Xác nhận thao tác giỏ có receipt; không báo đã tạo đơn chỉ vì đã thêm giỏ.
- **Policy:** dùng 15 ngày/phí30k từ nguồn hiện tại thay 7 ngày/phí25k trong history. Đã mặc đi làm, mặc thử trực tiếp hoặc cắt tem/giặt thì từ chối đúng tình huống; không chỉ liệt kê điều kiện rồi ngầm cho đổi.
- **Dùng context:** hiểu “nguyên set”, “chân váy”, câu hỏi lại giá và lựa chọn giữ L sau sửa số đo. Câu sửa số đo lần này tự nhiên hơn: “Dạ vâng ạ, em giữ nguyên áo size L cho chị nhé!”
- **Kết thúc lượt:** chín handoff có HUMAN/event/tag, không text/ảnh. Hai lượt sau HUMAN không tự trả lời tiếp. Hai NO_SEND checkout có câu hỏi/preview riêng do code dựng, không phải fallback hoặc việc bot im lặng toàn bộ checkout.

## Những điểm còn yếu và nguyên nhân

### 1. Discovery: lấy được dữ liệu nhưng chưa chọn được hàng sát nhu cầu

Khách cần bộ áo quần đi làm, dưới một triệu, đừng bó bụng. Owner search “bộ đi làm”, nhận SQ748/V406/SQ629 rồi đọc SQ629 và SQ748 trong cùng batch. Đường search→read giá/tồn đã hoàn tất trong giới hạn, không phải bị thiếu tool hoặc hết budget trước khi biết giá.

Tuy nhiên, reply giới thiệu hai quần short, mô tả chất liệu/giá/tồn rồi hỏi “Chị ưng mẫu nào hơn ạ?”. Quần short không tự là không được mặc đi làm, nhưng cần cân nhắc đúng nơi làm việc hoặc chọn hướng phù hợp; không chỉ thêm chữ “rất hợp mặc đi làm” để giải quyết bối cảnh. Đây là yếu ở lựa chọn ứng viên và dùng dữ liệu để tư vấn, không phải thiếu thêm tính từ hoặc trường chất liệu.

Nguồn đã mô tả SQ629 cho đi biển/café/resort/dạo phố. Owner vẫn gắn chung thành đi làm. Search trả ứng viên không phải xác nhận phù hợp; prompt đã nói rõ phải loại món sai hoàn cảnh và chọn một hướng. Thêm lại cùng chỉ dẫn bằng câu khác chưa có cơ sở sẽ sửa được lỗi.

“Không lo bó bụng” còn là câu hỏi về nhận xét thiết kế so với bảo đảm fit cho khách. Hai mẫu hiện tại đều có cạp chun, khác mẫu thứ hai của vòng trước; không dùng nguyên kết luận thiếu thuộc tính của SQ2447 để chấm SQ629. SIZE_FIT=0 không đủ, đứng riêng, để kết luận mọi nhận xét cạp chun đều sai. Giữ review phạm vi nghĩa, không tự siết verifier bằng keyword.

### 2. Tư vấn phân vân: vẫn dùng lời khen thay cho quyết định

- Khách quen mặc đồ trơn: reply nói mềm/rũ/thanh thoát/tinh tế/nhã nhặn rồi trấn an không quá điệu; chưa có cách phối hoặc quyết định rõ giúp khách dễ mua hơn.
- Khách có chân váy đen, muốn mặc lại nhiều lần: đã có đủ dữ liệu để đề xuất một hướng, nhưng reply vẫn trải cả áo lẻ và cả bộ, kết bằng hai nhánh “nếu… còn…”.
- Ca đổi lịch sang gặp khách hàng lại làm được tốt hơn: chọn áo lẻ và hướng dẫn phối với quần âu/chân váy. Vì thế không thể kết luận model hoàn toàn không hiểu nhiệm vụ bán hàng; việc áp dụng chưa ổn định.

Prompt hiện đã yêu cầu chọn một hướng, không phủ nhận cảm nhận bằng lời khen và không chép mô tả thay tư vấn. Nguồn sản phẩm vẫn có nhiều ngôn ngữ quảng cáo; reply tiếp tục dùng cùng kiểu diễn đạt. Đây là quan sát phù hợp với việc model dựa nhiều vào mô tả, chưa phải A/B proof rằng chỉ sửa presentation sẽ giải quyết được. Giữ các hạn chế giọng nhẹ như owner đã chấp nhận; không mở lại vòng sửa văn phong toàn cục.

### 3. Thương lượng: context đủ nhưng không biến thành giá trị cho khách

Vòng trước: “đang được shop hỗ trợ30k phí vận chuyển”. Vòng này: “mức ưu đãi sẵn có trên hệ thống”. Current cart quote đã có discount30k, ship30k, total499k; lượt kế tiếp tính đúng tổng499k.

Điểm yếu là owner không dùng ưu đãi cụ thể ngay lúc khách xin bớt. Đây không phải lỗi tính giá hoặc thiếu nguồn, và verifier cũng không có nhiệm vụ chấm sức thuyết phục. Không sửa bằng việc bắt verifier chặn một câu đúng tiền nhưng bán hàng kém.

### 4. Gallery: xử lý hậu quả đúng, nguyên nhân gốc chưa đủ bằng chứng

Owner gọi read_product và select_product_media cho SV2447 màuBE, sau đó HANDOFF/DEPENDENCY_FAILURE trước final. Provider request thành công; có bàn giao commit, không gửi gì.

Không có exception gốc trong raw để kết luận chính xác field ảnh hay dependency nào hỏng. Không được dùng tên terminal DEPENDENCY_FAILURE như root cause hoặc vội vá prompt. Cần chẩn đoán code bằng mã lỗi/stage giới hạn, không ghi URL riêng, credential hoặc dữ liệu khách; sau đó mới quyết định sửa source mapping, selector hay dependency handling.

### 5. Phạm vi khái quát: cần phân biệt lời khuyên với phát biểu về catalog

Ca đi ô tô nói “Các mẫu thiết kế dự tiệc hiện tại của shop đều…” trong khi chỉ có bốn mẫu trong context. Phát biểu về toàn shop khác với lựa chọn Diệp An từ thiết kế hai lớp. Không lấy vấn đề này làm lý do đòi mọi suy luận chất liệu có phép thử riêng. Giữ câu hỏi phạm vi catalog, chưa gắn nhãn chắc chắn false PASS hoặc tuyên bố zero native false PASS.

## Review cách sửa vòng trước

**Đúng hướng:** đưa automatic fallback về cùng recoverFallback; bỏ static text, gửi ảnh cứu vãn và receipt ACK thay thế; giữ state đã commit; chỉ đánh dấu terminal committed sau transaction xác nhận; phân biệt unknown write với definite no-commit; không retry hoặc bàn giao lần hai khi chưa rõ kết quả commit. Đây là sửa hành vi code, không phải thêm regex hay ví dụ để fit bộ ca.

**Independent review có giá trị:** lần sửa đầu còn lọt private path có holding text và chưa kết thúc một số Inbox NO_SEND. Các lỗi này được sửa thêm; fixtures/filter/assertions cũ cũng được chỉnh theo contract silent handoff. Đổi assertion STALE từ NO_SEND sang HANDOFF là hợp lệ vì vẫn kiểm HUMAN/event/tag/0output; không phải nới rubric tư vấn để lấy PASS.

**Giới hạn cần giữ:** full COD/BANK synthetic runs trước đó có FAIL do assertion cũ. Sau các driver fixes cuối mới có focused checks, chưa có một full coherent SQL run thay thế. Campaign model này không có verifier rejection hoặc provider failure trong native nên chưa kích hoạt các nhánh đó. Chín silent handoffs không đủ, đứng riêng, để nói toàn bộ nhánh fallback mới đã được model kiểm chứng. Focused deterministic evidence đã có cần được đọc cùng model evidence.

**Cách đo đang dễ gây hiểu nhầm:** đổi fallback thành handoff sẽ làm số FALLBACK giảm theo contract. Không dùng “0 fallback” làm chỉ báo bot hiểu/tư vấn tốt hơn. Tương tự, 21 B1 chỉ có eligibility, không có persisted handoff adapter; không cộng chúng vào số giao dịch bàn giao thật. Bốn NO_SEND cũng không phải bốn lượt khách không nhận gì, vì hai lượt checkout có code-owned output.

**Vận hành runner:** campaign đầu tiếp tục đủ17 requests dù đều401; mỗi attempt tuân thủ một request/không retry, nhưng gửi thêm ca khi auth đã hỏng không đem lại evidence semantics. Lần sau cần dừng dispatch phần chưa chạy khi xác định lỗi auth chung, giữ chúng NOT_RUN và giữ nguyên mọi attempt đã lỗi. Đây là cơ chế điều phối đánh giá, không phải generation retry hoặc cách bỏ lỗi khỏi denominator.

## Hướng tiếp theo

1. Giữ silent fallback hiện tại; không rollback hoặc chèn lời báo chuyển khách đã yêu cầu bỏ.
2. Ưu tiên đóng nguyên nhân gallery và hoàn tất phần acceptance còn thiếu bằng test code/SQL hiện có. Chưa cần thêm model campaign full để kiểm lỗi transaction hoặc auth.
3. Với bán hàng, chỉ xử lý hai việc có giá trị rõ: chọn ứng viên theo hoàn cảnh trước khi trình bày; dùng quyền lợi hiện tại để trả lời phản đối giá. Tách lỗi search candidates, lựa chọn của owner và nội dung final khi kiểm, thay vì sửa đồng thời nguồn/prompt/verifier/rubric.
4. Không tiếp tục tối ưu toàn bộ giọng. Những ca dài nhưng trả đúng vẫn là hạn chế nhẹ đã chấp nhận. Không hard-code hai câu trả lời hoặc thêm ví dụ riêng vào production prompt.
5. Nếu có vòng sửa mới được giao, kiểm tập trung đúng cơ chế trước; chỉ full run sau khi đã có evidence mới. Không lấy một lần SQ223 PASS hoặc số eligible tăng một làm lý do chạy thêm vòng giống hệt.

Chưa có code fix hoặc provider generation mới trong task review này. B_NOT_GO giữ nguyên; không live send, publish, merge hoặc deploy.

Nguồn: [51 terminal outcomes](ACTUAL_TERMINALS.json), [whole-turn review](WHOLE_TURN_REVIEW.json), [comparison](PRIOR_COMPARISON.json), [report](CHECKPOINT_B.md), [implementation review fixes](../../../../../docs/specs/c3-phase-b-silent-fallback-review-fixes-20261028.md). Raw control/native requests được đọc tại external campaign directory đã ghi trong report; không sao chép private input vào tài liệu này.
