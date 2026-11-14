# Phase C — tool-contract screen, 10/11/2026

**Đã chạy đủ 13 ca/27 lượt. Recommendation: STOP.** Code đã được review độc lập APPROVE, nhưng kết quả model còn ba ca lỗi đáng kể và chưa exercise writer→quote. Không chạy lại để tìm mẫu PASS, không mở phần full còn lại.

Source sạch: `8b4e190c8c6e048b4412c45c254de1c75872cf1b`; world `4eeaa30adc2252335387c677c76125d292332bdc35d1106fc87b42b9943dd4a4`. Đây là development screen N1/retry0 trên các ca đã biết, không phải qualification hay bằng chứng độ ổn định. Xem [toàn bộ 27 lượt](https://github.com/nguyentuanson27-netizen/lanchatbot/blob/e6cf2884697494ab2e0d88dad4b46da25719ed6b/apps/worker/evals/single-agent-commerce-qualification/tool-contract-screen-run-20261110/CONVERSATIONS.md), [kết quả từng ca/gate](REVIEW.json), [review độc lập](INDEPENDENT_REVIEW.md), [provenance/config/commands](PROVENANCE.json).

## Kết quả thực tế

- 62 attempts = 62 generation HTTP: 42 owner, 20 verifier. Tất cả provider results OK, không timeout/error/malformed, không generation retry hoặc thay model. Semantic verdict FAIL không phải provider error.
- 17 lượt model SEND_ELIGIBLE, 5 lượt code-owned checkout send, 4 silent HANDOFF và 1 NO_SEND. Bốn handoff gồm S16 thiếu provenance, J4/P07 draft bị chặn, và checkout đã xác nhận mua. NO_SEND là lượt sau handoff của J4, không phải generation bị bỏ qua.
- 9/12 ca bán hàng đạt bước xử lý cần thiết trong lượt này; bao gồm hỏi bổ sung màu hợp lệ, không nghĩa chín đơn hoàn tất. Ba ca material fail: **J1, J4, P07**. S16 là một source-gap control riêng, không cộng vào chất lượng bán hàng.
- Verifier chặn ba draft: S16, J4, P07. Không đánh đồng handoff an toàn với câu trả lời tư vấn thành công. Không có unsafe send mới được nhận diện trong review này; không có formal safety qualification/full final-gate replay.

## Ba ca chưa đạt và nguyên nhân quan sát được

| Ca | Khách thực sự nhận được | Nguyên nhân / phạm vi kết luận |
|---|---|---|
| J1 lượt3 — hỏi tổng hai áo M/L cả ship | Tiếp tục bị hỏi màu để thêm giỏ, không có tổng | Owner lại gọi add_to_cart hai lần thiếu màu, rồi quote_cart bị DEPENDENT_EFFECT_REJECTED. Actual declarations đã có quote_product trước giỏ. Không phải code giấu tool, thiếu nguồn giá hay verifier chặn; model vẫn chọn đường mutation cho câu hỏi giá. Không quy nhân quả toàn bộ cho code từ một sample. |
| J4 lượt2 — xin hỗ trợ giá | Silent handoff; lượt3 NO_SEND vì HUMAN đã sở hữu hội thoại | Giỏ chưa tạo vì thiếu màu. record_negotiation trả NOT_EVALUATED, supportAvailability UNKNOWN, effectCommitted=false. Owner lại nói shop chưa có giảm thêm; giá sản phẩm không chứng minh chính sách không giảm. Verifier chặn đúng. Đây khác lỗi batch writer+quote bị cấm trước đây. |
| P07 — nhờ chọn size từng phần | Silent handoff | Hai kết quả COMPONENT đúng áo M/quần M, không có alternative. Owner tự đề xuất quần L để thoải mái theo thói quen khách. Verifier chặn đúng; dữ liệu/engine đã cung cấp được kết quả, owner vượt quyền diễn giải. |

S16 vẫn có draft nhận ảnh feedback như thể đáp ứng yêu cầu ảnh khách mặc, dù source chỉ xác nhận DETAIL/CLOSEUP và wearer NOT_RECORDED. Handoff đúng; chưa có positive capability/source để gửi ảnh khách mặc. Không đổi historical failure thành PASS.

## Những điểm giữ được / cải thiện quan sát được

- **P06:** trả đúng ba món 989.000đ, có ảnh SD023 và không gọi component thiếu nhãn là hai quần.
- **J2:** ba lượt đều gửi; sửa56→51kg, giữ162/88/70/94, commit RELAXED và dùng TOP/M đúng engine. Không còn provider transport failure trong sample này.
- **S04:** actual flat offerTypes reads hợp lệ, trả Trắng/Be; không lặp malformed public read. **S09:** đọc care policy và trả đúng; sample này không thử lại nhánh DETAILS_ONLY nên không claim native branch đó đã được exercise.
- **P08:** REPLACE chưa commit do thiếu màu thì hỏi màu, không báo đã thay giỏ xong. Giỏ cũ được bảo toàn; đây là bước chờ thông tin khách, chưa hoàn tất đổi lựa chọn.
- **P09:** phân biệt đúng set quần/váy rồi đọc đúng SET_QUAN/M; không gộp facts theo tên.
- **Checkout:** đúng set M829.000đ, hỏi thông tin còn thiếu, preview trước xác nhận, receipt CONFIRM_PURCHASE và silent handoff PURCHASE_CONFIRMED. Không lộ giá trị giả lập tên/điện thoại/địa chỉ vào provider wires.

Giọng vẫn có câu dài/lặp: J2 nhắc lại dữ kiện ở cả ba lượt; S15 biến ACK thành báo giá/hỏi thêm; S09 chen “gentle cycle”; S08 nhiều tính từ và lại hỏi khách chọn. Ghi nhận hạn chế, chưa mở thêm vòng vá giọng. S08 chọn Diệp An với đánh đổi Odette có sẵn; không có ảnh sai mẫu, nhưng affected comparison-photo path không được exercise.

## Gate và giới hạn

W1 valid flat read, W3 single quote/photo và W4 composition: **EXERCISED_PASS** trong phạm vi sample. W2 writer→quote: **NOT_EXERCISED** — S15 dùng apply+read; J4 dùng rejected negotiation rồi read, không có quote_product. Không dùng PG synthetic controls thay native evidence. Multi-candidate/two-quote photo và native transport-error paths chưa exercise. J1/P07 controls **EXERCISED_FAIL**. Vì vậy screen gate FAIL, chưa mở full remainder.

Không có lỗi cap, missing attempt, source freshness, schema/provider transport trong run này. Snapshot thật được recapture trước run; không gia hạn timestamps để cứu kết quả. S16 source-gap và test color/chart/support/media assumptions đều khóa trước generation. Nguồn world mới khác vòng trước nên cải thiện/lùi ở N1 không tự chứng minh nguyên nhân hoặc độ ổn định.

## Đo vận hành và integrity

Verifier provider latency p50 **7,905s**, p95 **16,270s**; adapter window p50 **8,736s**, p95 **17,087s**, n20. Adapter window là thời gian thêm của khâu gọi verifier, không tự là toàn bộ added end-to-end verification latency gồm mọi final readback/gate; phần đó chưa có span độc lập. Input635.370/output40.298 token được provider expose trên62/62 rows; cost không expose. Handoff4/27=14,8%, NO_SEND1/27=3,7%, static fallback text0. Ba recovery handoff là11,1%; một handoff còn lại là purchase completion.

[Integrity](INTEGRITY.json): toàn bộ request/raw hashes, evaluator-label firewall, caps6 primitive/2 rounds/3 owner/1 verifier, history chain, accepted-text Outbox hashes và17 exact-final-draft bindings PASS. Model DB và initial-state DB đã drop; live send0/source shop write0. Mechanical integrity không tự chấm chất lượng và không là replay toàn final gate.

## Thay đổi, kiểm tra và hướng tiếp theo

Giữ kiến trúc một owner/tối đa một verifier. Không role/layer semantic mới; không production wiring, parser/router, regex ca riêng, repair loop hay tăng cap. W1–W5 sửa contract/code-owned evidence/accounting; prompt tư vấn/verifier không đổi. Input review phát hiện rule chấm ảnh cũ; evaluator-only TASK_OUTCOME_CONTEXT_V3 đã khớp phạm vi unique/cart/successful quote, giữ search-pool exemption và strict SELECT/cart.

Structural delta từ implementationBase36058803 tới run8b4e190c: tám file worker TypeScript ngoài test, +208/−60 dòng; technical eval/schema/transport modules và tests ghi riêng trong Git diff. Số dòng không tự đo chất lượng kiến trúc. Online semantic roles vẫn OWNER/VERIFIER; không thêm role, knowledge store hoặc orchestration framework.

Acceptance implementation: focused worker1094, Node102, protected/reply22, PG14 và worker build/typecheck/lint/dataset PASS; exact approved runtime f4ba36b5. Sau narrow evaluator correction8b4e190c: observed RED33/1 → focused qualification/diagnostic41/41 PASS. [Implementation và commands/tests gốc](../../../../../docs/specs/c3-phase-c-tool-contract-completion-implementation-20261109.md). Không claim rerun canonical worker checks sau thay đổi chỉ evaluator. Raw RED log có trailing spaces nguyên trạng; không xóa để làm diff-check đẹp. Một số log acceptance cũ Git normalize newline; verification record giữ raw-run hashes, không coi đó là hash của một LF clone.

Hướng tiếp theo cần tách hai việc: (1) hành động báo giá trước giỏ và xử lý kết quả thương lượng UNKNOWN để owner không tự chuyển sang kết luận chính sách; (2) không đổi kết quả fit thành size thay thế khi engine chưa cho phép. Dùng lại exact world/control để kiểm affordance và actual wires trước khi quyết định sửa, không thêm ví dụ theo J1/J4/P07, tự tạo màu/giỏ, nới verifier cho unsupported claim hoặc lặp thêm sample để săn PASS. Chưa triển khai hướng sửa mới trong report này. Không có Phase C GO/C3 replacement claim.
