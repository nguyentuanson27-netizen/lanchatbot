# Phase C — sửa đường giá, ý định thao tác và bằng chứng ảnh

Revision 2 — chờ review độc lập bản kế hoạch. Implementation base dự kiến: `f405a6f6a714b845e2723d14b53a08b5fc1c0588`. Tài liệu này sửa phương án sau review; chưa triển khai executable, chưa chạy provider mới.

[Review R1 độc lập](evidence/c3-phase-c-next-repair-review-20261110/plan-r1.md) yêu cầu sửa bốn điểm. NR1_J4: bỏ engine/thương lượng giả trước giỏ, dùng P1 bên dưới. NR1_P09: bỏ metadata-as-consent, giữ giới hạn P2. NR1_S16: chỉ triển khai đường thiếu provenance, không cấp nguồn positive qua enum, theo P3. NR1_MEDIA_DEDUP: P4 tách attachment khỏi toàn bộ source proofs. Approval của kế hoạch không là approval của implementation.

## Bằng chứng và giới hạn kết luận

[Screen đã chạy](../../apps/worker/evals/single-agent-commerce-qualification/owner-result-screen-run-20261110/REPORT.md): đủ 13 ca/27 lượt, 66 generation/HTTP, không lỗi provider, N1/retry0. J1/P07 tiến bộ ở sample; J4/P09 lỗi tác vụ và S16 có một observed send-eligible semantic false PASS. W2 native writer→quote chưa exercise. Không đổi kết quả lịch sử hoặc coi source-gap nằm ngoài kiểm tra an toàn.

- J4: hai lần thương lượng chưa có cart/negotiation, tiếp tục thử khi prerequisite chưa đổi. Owner đã nhận UNKNOWN đúng nghĩa; final context có policy nhưng tự diễn giải sai set thành hai đơn vị và nói giá tốt nhất. Đây không chỉ là thiếu câu cảnh báo. `quote.ts:total()` đã dùng `evaluateShopPolicy` để tính PRE_CART_TOTAL, với closing evidence không có thương lượng; không cần dựng engine mới.
- P09: prompt đã phân biệt trả lời phân biệt mẫu với yêu cầu mua. Declaration của add_to_cart lại nói chọn offer/size thì gọi trực tiếp. Owner gọi mutation từ câu phân biệt; code kiểm authority/source/commit, không chứng minh nghĩa mua của câu khách. Receipt đúng không chứng minh yêu cầu mua đúng.
- S16: feedback là nhãn test đã duyệt; không có bằng chứng khách mặc. `descriptionEvidence` hiện trả NOT_RECORDED cho mọi asset. Tool có FEEDBACK nhưng không biểu diễn yêu cầu bằng chứng khách mặc. Verifier có câu hỏi và giới hạn metadata, vẫn bỏ sót hàm ý của lời nhận gửi ảnh. Đây vừa là thiếu khả năng biểu diễn yêu cầu, vừa là lỗi verifier quan sát được; thêm enum không bảo đảm model chọn đúng enum.
- Gửi trùng ảnh: ingress dedup theo productId+URL; hai parent chung asset vẫn tạo hai attachment. Cùng selectedMedia đang được dùng cho cả attachment và binding nguồn. Dedup chỉ theo URL rồi bỏ một parent có thể làm mất bằng chứng cần revalidate.

## Phạm vi giữ nguyên

Một conversational owner, tối đa một semantic verifier; code giữ authority identity/truth/freshness/state/permission/effects/receipts/privacy. Không classifier/router/parser câu khách, regex theo ca, vai trò model thứ ba, pre-effect semantic judge hoặc repair/reverify loop. Verifier vẫn chỉ kiểm protected meaning của exact final reply.

Giữ model/effort, tool/generation caps, retry0, native signatures, privacy intake và code-owned checkout; không production wiring, source-shop writes, merge/deploy/live send. Giữ đường quote J1, component fit P07, hồ sơ J2, atomic replacement P08 và checkout. Không mở lại đợt tối ưu giọng văn; S15/J2/S08 friction giữ trong báo cáo.

Không tạo concession mới trước giỏ, giả negotiation receipt, mặc định giá tốt nhất, gắn feedback thành khách mặc, hoặc ghi lại nguồn test để làm control đạt.

## P1 — dùng đường giá đã có, giữ riêng phần thương lượng chưa xét

1. Dùng lại `quote_product`/`evaluateShopPolicy`, không thêm tool hay calculator. Kết quả đọc giá trước giỏ phải phân biệt: giá/tổng đã tính, ưu đãi thông thường đã áp dụng, và thương lượng riêng chưa được xét. PRE_CART_POLICY không áp negotiation receipt; cartQuote hiện hành vẫn là authority khi có cart/hỗ trợ thật.
2. Nếu cần thêm presentation, lấy trực tiếp từ policy và evaluated result đã bind đúng target/quantity/version. Nêu đơn vị đếm và set/combo tính một đơn vị từ trường nguồn; không nhét quy tắc 2 sản phẩm/5% cố định vào prompt, không tự tạo quote cho món chưa có price proof. Không sao chép toàn bộ policy thành nhiều block.
3. Không loại record_negotiation khỏi toàn bộ declaration chỉ vì chưa có giỏ tại đầu lượt: một batch hợp lệ có thể tạo đủ prerequisite trước lời gọi đó. Nếu thêm chặn lặp, chỉ áp dụng sau một kết quả NOT_EVALUATED được code xác nhận và chỉ khi prerequisite/source/binding không đổi. Tính lại trước từng invocation; cart/negotiation đổi hợp lệ phải mở lại đường cũ. Đây là tối ưu tùy chọn, không phải điều kiện để claim đã giải quyết nghĩa thương lượng. Không cache failure qua tin mới, binding/revision mới hoặc unknown commit; không thay lỗi bằng một kết quả no-support giả.
4. Chưa xét được hỗ trợ riêng: owner có thể trả phần giá/ưu đãi thông thường đã xác nhận và hỏi lựa chọn khách còn thiếu nếu cần tiếp tục giao dịch. Không nói đã được giảm thêm, không có giảm, hoặc giá cuối cùng từ UNKNOWN. Không coi lời hỏi bổ sung là đã giải quyết xong yêu cầu hỗ trợ.
5. Nếu việc xét concession riêng thật sự cần trước giỏ, đó là thay đổi nghiệp vụ/state riêng cần kế hoạch khác. Không mở rộng quyền từ request này để bịa một lượt phản đối giá hay đánh giá giỏ giả bằng engine.

Acceptance: giá/tổng đúng ngay cả khi chưa có màu/size nếu nguồn giá đủ; standard discount không bị gọi là thương lượng; một set hoặc combo ba món quantity1 tính một parent unit, quantity2 theo engine hiện có tính hai; sửa policy fixture về ngưỡng/tỷ lệ khác vẫn lấy đúng nguồn. Unknown không thành no-support/best-price. Cart/negotiation đủ, kể cả sau một writer hợp lệ trong cùng batch nếu contract hiện hành hỗ trợ, thì luồng hỗ trợ cũ vẫn được gọi và dùng đúng receipt. Nếu không chứng minh được việc giữ đường này thì bỏ tối ưu chặn lặp khỏi implementation, không nới contract hoặc tăng cap.

## P2 — sửa hợp đồng thao tác, không biến metadata thành bằng chứng ý định

1. Sửa declaration add_to_cart để yêu cầu mua là điều kiện trước câu tối ưu gọi trực tiếp. Chọn đủ offer/size chỉ tránh đọc lại sau khi đã có yêu cầu mua, không tự tạo yêu cầu mua. Cùng nghĩa với prompt hiện có; thay phần cạnh tranh, không thêm bộ ví dụ theo P09.
2. Xác định mẫu/phần bán để trả câu hỏi thông tin dùng đường read/selection hiện có. Kết quả chọn mẫu không tự cấp cart capability mới hoặc phát sinh CART_OPENED. Không thêm field purchaseAuthorized do owner tự khai rồi coi là authority.
3. Không thêm sourceQuote để tuyên bố đã chứng minh ý định mua. Gắn tin nguồn nếu cần audit chỉ chứng minh provenance của lời model dựa vào; không kiểm được nghĩa. Không đổi receipt, operation-id/idempotency, CAS hoặc hiệu lực confirm_purchase trong sửa declaration này.
4. Kiểm hành vi hai phía bằng cùng câu trả lời ngắn nhưng lịch sử thật khác nhau: hỏi tồn/giá rồi phân biệt mẫu không tạo giỏ; yêu cầu mua rõ vẫn tạo giỏ trực tiếp; bổ sung màu/size cho một yêu cầu mua đã có được tiếp tục; sở thích/cảm ơn không thêm giỏ. Nhánh thông tin không có cart CAS/CART_OPENED/CART_MUTATED hoặc receipt mua; nhánh mua có đúng một thay đổi giỏ, đúng lựa chọn. Ghi lựa chọn sản phẩm bằng chức năng hiện có, nếu cần, không được nhầm với thay đổi giỏ và không được xóa dữ liệu khách hợp lệ. Không áp xác nhận lần hai cho mọi câu mua rõ. Acceptance model là toàn mạch hội thoại và actual state/events/receipts, không phải owner stub hoặc key word.

Giới hạn: P2 là sửa chỉ dẫn cạnh tranh và kiểm behavioral regression, không phải deterministic proof of purchase intent. Owner vẫn có thể chọn tool sai. Nếu vòng đo mới tiếp tục sai mutation, cần quyết định riêng về quy trình staged action/xác nhận; không lén đổi nhiệm vụ verifier sang xét proposal trước commit. Test stub owner gọi đúng tool không chứng minh model hiểu khách.

## P3 — yêu cầu bằng chứng ảnh phải biểu diễn được

1. Trong cùng công cụ ảnh hiện có, biểu diễn riêng yêu cầu có bằng chứng khách mặc, giữ phân biệt với FEEDBACK/GENERIC. Ưu tiên field requirement hẹp trong worker, tránh đổi shared enum/source schema chỉ để thêm một giá trị không có đường nguồn thật.
2. Với dữ liệu hiện hành không ghi wearer proof: yêu cầu này trả một kết quả không đủ bằng chứng đúng scope; không chọn ảnh detail/feedback để thay. Lượt đã khai requirement này nhưng thiếu proof không được gửi text/ảnh dù owner viết lời nhận gửi; dùng recovery handoff im lặng hiện có với receipt thực, hoặc fail-closed NO_SEND nếu không xác nhận được handoff. Không thêm lời chờ hoặc sửa draft sau verifier. Các truy vấn feedback thông thường/generic/detail vẫn giữ nghĩa cũ. NOT_RECORDED không được trình bày thành khẳng định shop không có ảnh ở mọi nơi.
3. Capability/result/readback phải dùng chung requirement và source identity; không hint MATCH_AVAILABLE cho yêu cầu khách mặc chỉ vì có feedback=true. Không làm mới nguồn, tự nhận ảnh có người là khách, hoặc tạo positive proof giả trong fixture để claim đã nối nguồn thật.
4. Nguồn/schema positive customer-wearing chưa có: ghi NOT_IMPLEMENTED, không đưa vào acceptance đạt. Chỉ bổ sung khi có nguồn được xác nhận và kế hoạch nguồn riêng. Owner-approved feedback test flag hiện tại không phải approval đó.
5. Verifier vẫn đọc câu hỏi, reply và selected-media evidence. Điều chỉnh phần nghĩa để lời nhận gửi ảnh không tự được PASS khi ngầm đáp ứng loại ảnh mạnh hơn nguồn. Không chỉ bắt từ khóa, không thêm mẫu S16 vào prompt. Kiểm cả diễn đạt gián tiếp và cách diễn đạt giới hạn đúng.

Giới hạn: owner có thể khai yêu cầu ảnh sai thành FEEDBACK/GENERIC; code không tự đọc câu khách bằng parser. Khi đó verifier vẫn là ranh giới ngữ nghĩa, không được coi enum là proof mọi yêu cầu đã được đáp ứng. Model test sau phải đo trường hợp này, không giả định deterministic negative path đã giải quyết hết false PASS.

## P4 — một attachment, giữ đủ bằng chứng các parent

1. Tách danh sách attachment vật lý khỏi selected source evidence. Gộp chỉ khi cùng canonical URL đã được đường nguồn hiện hành kiểm tra và cùng source content SHA; không tự bỏ query/path hay tạo quy tắc chuẩn hóa URL mới để ép trùng. Không gộp theo màu hoặc hash giống nhau nhưng URL khác nếu chưa có identity contract tương ứng.
2. Giữ đủ selectedMedia cho opening coverage, PRODUCT_MEDIA claims và binding.images. Danh sách message chỉ có một attachment cho asset trùng. Không sửa shared delivery schema nếu schema hiện hành đã biểu diễn được nhiều source proofs cho một attachment.
3. Cùng URL nhưng hash xung đột: fail closed toàn response group; không chọn một proof tiện hơn. Không bỏ parent proof chỉ để giảm số ảnh; cả hai source versions phải được revalidate tại final/delivery gate.
4. Kiểm sau persistence/restart: một ảnh được gửi một lần; cả hai subject proofs còn; revoke/đổi bất kỳ proof nào đều chặn toàn group trước sequence0; ảnh khác nhau vẫn đủ số lượng và đúng scope.

## Thứ tự triển khai và kiểm

P1 dùng path có sẵn → P2 hợp đồng rõ → P3 negative requirement → P4 attachment/evidence. Mỗi thay đổi code quan trọng có observed RED trước, GREEN tối thiểu sau. Không viết assertion tìm một câu prompt rồi coi đó là behavioral acceptance.

- Focused quote/effects/state, native declaration/adapter/context presentation, media eligibility/capability/ingress/delivery binding; protected claims/reply assembler; worker typecheck/build/lint và dataset boundary.
- Kiểm actual request projection, evaluator firewall, byte bounds, unchanged signed parts; không đưa caseId/rubric/expected label vào model.
- Nếu thay persistence/transaction/delivery behavior, chạy disposable PG restart/group acceptance tương ứng trước provider. Giữ policy freshness/recipient/binding/permission/private-field negatives; không claim test cũ là test source mới.
- Reviewer độc lập kiểm diff/verification sau build; code approval không là model GO. Thay đổi shared package thì chạy focused tests/typecheck/build package đó; ưu tiên không chạm shared nếu worker đã đủ contract.

Commands dưới đây là kế hoạch, chưa chạy trong lượt sửa kế hoạch:

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/realtime-sales-catalog.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts --reporter=dot --maxWorkers=2 --no-file-parallelism
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm check:dataset-boundary
```

Chọn exact Node/PG focused commands từ test/harness thực tế bị thay đổi và ghi vào implementation record; không claim placeholder là một command đã PASS.

## Model run và điểm dừng

Chưa đăng ký hoặc dispatch generation ở lượt kế hoạch này. Vòng sau cần source commit sạch, input/config review trước provider, snapshot còn hiệu lực và population được chốt. Giữ các ca đã đạt làm đối chứng và thêm coverage mục đích còn thiếu theo quota đã duyệt; không tự tăng denominator hoặc ép tool choice để làm W2 exercise. Các câu kiểm phải tự nhiên, không nhập benchmark labels vào runtime.

Nếu verifier prompt/schema/config đổi, evidence cũ vẫn thuộc cấu hình cũ. Khi được yêu cầu chạy, cần freeze safety population phù hợp trước provider và kiểm safety theo gate hiện hành trước khi mở rộng đo bán hàng; không dùng approval plan để tự bỏ A2/safety gate hoặc tự dispatch. Hành vi nhận gửi ảnh với cùng reply surface nhưng câu khách hỏi feedback khác câu khách hỏi người mặc cần được phân biệt; owner bỏ/khai sai requirement là một nhánh kiểm nghĩa riêng, không bị loại khỏi denominator.

Chấm actual terminal/tác vụ, cả mutation và media; không chỉ đếm text được gửi. S16 thiếu wearer proof phải handoff im lặng, không trở thành sales PASS. Không coi W2 NOT_EXERCISED là PASS, không majority vote/rerun tìm kết quả đẹp. Mọi generation/error vẫn trong denominator. Nếu còn semantic false PASS hoặc mutation sai ý khách, STOP và giữ evidence.

Kế hoạch được approve không xác nhận ba lỗi đã được sửa; phải có implementation và behavioral evidence riêng. Không rollback các phần Phase C đã chứng minh hữu ích, không tự mở full qualification/C3 parity/merge/deploy.
