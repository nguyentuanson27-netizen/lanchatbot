# Phase B — implementation đọc sản phẩm và lịch sử, 2026-10-25

Trạng thái: **IMPLEMENTED_AND_EXECUTED; CAMPAIGN_CLOSED_STOP; B chưa GO.** [Run report](../../apps/worker/evals/single-agent-commerce-read-only/tool-history-run-20261025/CHECKPOINT_B.md). Source9e352f38 chạy17controls +21native,30native NOT_RUN. Privacy regression phát hiện offline làm dừng dispatch ở persisted attempt boundary; bản sửa94cb6b08 có71DB/291worker/build/lint PASS, chưa chạy model. Phần mô tả savepoint ban đầu dưới đây giữ chronology; không đọc các nhãn pending cũ thành trạng thái hiện hành.

Implementation base `00ffd3ee9075774ed7be13605a07d505886010cd`; worktree ban đầu chỉ có ba file kế hoạch do lượt trước tạo. Plan savepoint `f35e94a9`, T1 `1eadac90`, T2 `9985e93a`, T3 `e788f2c3`. [Kế hoạch](c3-phase-b-tool-history-fix-plan-20261025.md). Campaign cũ vẫn đóng; không sửa raw hoặc 20 NOT_RUN cũ. Owner đã yêu cầu implementation và một run mới ngày 25/10.

## T0 và T1: offer discovery

Observed RED: test search không tìm được offer literals nào; original search chỉ giữ content/attributes. Structural fixture ba parent + hai nhóm ba offers tái hiện SUBJECT_BOUND (3+3+3 > 8), read bị reject không làm thay đổi snapshot. Đây là fixture tổng hợp cùng cấu trúc; không có exact historical POS snapshot SQ748 trong captured tool response, không nhận là exact replay.

Sửa: search đọc metadata nguồn cho từng candidate đã qua bound, tối đa số products hiện hành; không resolve price/stock/ETA hoặc thêm variants. Metadata theo product/offer/version/freshness đi qua offer literals hiện có để adapter đưa availableOffers/offerLabels cho owner. Read cụ thể tiếp theo dùng offerType hiện có. Search/metadata readback kiểm lại nguồn; các read nguồn đi qua catalog port và counters catalog/POS hiện hữu. Chi phí mới là tối đa một catalog/POS metadata read mỗi candidate của search (và readback khi chưa full-read), không generation/tool-call bổ sung. Failure metadata giữ UNKNOWN, không xóa independent content.

Kiểm lại bounds sau await để concurrent search không vượt giới hạn. Null offer vẫn giữ compare semantics và có thể bị bound nếu thực sự đọc quá nhiều lựa chọn; không truncate, tự chọn phần mua hoặc tăng cap. Explicit whole-set hai products giữ 5 subjects thay vì 9. Giá component, offer filters và freshness giữ scope cũ.

## T2: accepted media history và capture

Observed RED: chưa có phương thức đọc durable accepted media. Đã thêm read-only method trên runtime store, SELECT Outbox accepted/delivered/read theo page/conversation/customer, rồi kiểm private encrypted media binding, recipient hash, response group, sequence/message hash và exact image URL. Chỉ chiếu productId, assetRef hash theo identity selector hiện có, status và occurredAt; không URL/recipient/private binding hoặc suy góc ảnh. Binding thiếu/expired/không đọc được không tạo facts lịch sử.

Không migration hoặc ghi bảng mới. Reader lấy từ durable Outbox nên không phụ thuộc chat-history write best-effort. Giới hạn 30 accepted rows được đọc, 6 images được trả; model summary tối đa 1024 bytes nằm trong 4096-byte/8-entry history. Giữ text/correction trước, cắt metadata trước; nếu hết slot thì nối summary vào shop entry có sẵn, không tạo lời khách giả. Summary nêu history không đầy đủ và chưa biết khách đã xem hay chưa. Không có rule cấm resend; không coi selected/enqueued/failed là sent.

Self-review bổ sung hai lỗi: accepted ảnh nhưng history write mất phải giữ returning entry; lỗi đọc delivery memory không được thành empty-history/first-contact. Nhánh lỗi thứ hai có observed RED (firstContact=true), sửa thành firstContact=null khi cả text lẫn delivery history chưa chứng minh được; không dựng receipt hoặc xác nhận đã gửi. Metadata nullable chỉ cho trạng thái chưa biết, không thêm state/mutation. Normal known first/returning cases giữ boolean cũ.

Post-run self-review phát hiện street guard bỏ lọt standalone lowercase/abbreviated values. Đã dừng source9e352f38, giữ toàn bộ81requests và21actual outcomes; scoped17controls PASS không bao phủ lỗi DLP này. Correction94cb6b08 thêm conservative standalone/location frames không phụ thuộc casing, có RED→GREEN và through-history test. Cụm ngắn mơ hồ mở đầu bằng street token vẫn có thể bị che; không nhận parser hoàn hảo hoặc khôi phục history cũ. Model results không qualify correction này.

Capture giữ SHA256 của exact transport text trước redaction theo sequence, không thêm plaintext. Hash là evidence egress, không sửa history và không chứng minh nội dung khi không có preimage hợp lệ. Isolated PostgreSQL N4 đã bổ sung kiểm actual accepted image, cross-customer isolation và request lượt kế tiếp; chưa nhận PASS trước khi chạy.

## T3: privacy redaction

Observed RED: caption mô tả đường thêu thành ADDRESS và biến mất ở commerceHistory. Sửa bộ lọc chung: từ chỉ đường phố cần house-number/named-street/location frame, không tự coi từ “đường” là địa chỉ. Giữ administrative location signals, explicit address declarations và PII filters. Không whitelist caption/tên sản phẩm hoặc miễn BOT khỏi lọc. Tests gồm caption cũ, mô tả đường viền/đường cắt mới, địa chỉ có/không số nhà/viết tắt/lẫn product text.

Residual: rule-based DLP vẫn có thể che nhầm hoặc chưa nhận một kiểu địa chỉ khác; không claim generic Vietnamese parsing hoặc khôi phục lịch sử đã bị che. Customer checkout/private input vẫn qua deterministic privacy intake hiện hành.

## T4: ADVICE_NO_INTERVENTION

Đối chiếu ba actual outcomes và owner input của turn-completion: concern-v2 có mô tả áo thêu/chân váy ren nhưng đáp bằng chất liệu/lời khen rồi trả lựa chọn lại; changed-occasion-v2 có thiết kế/chất liệu nhưng vẫn đưa quyết định thời tiết lại khách; media-decision đã có ảnh/giá nhưng chưa giải quyết mức trang trí khách ngại. Không thấy field quyết định bị serialization bỏ mất ở ba traces; dữ liệu cảm giác mặc không thể chứng minh chắc khách sẽ không nóng.

Owner prompt hiện yêu cầu chọn hướng mua, chỉ thêm lựa chọn khi có đánh đổi, không gom lời khen, không giao lại cùng quyết định. Chưa xác định chỉ dẫn mâu thuẫn cụ thể để thay. Vì vậy giữ baseline owner/verifier/prompts/rubric/models, không cộng examples hoặc chỉ dẫn “tự nhiên/thuyết phục” nữa. Chất lượng tư vấn còn residual; T1–T3 không được báo là đã sửa giọng/sức thuyết phục.

## Verification và campaign

Evidence đang lưu ngoài repo `c3-tool-history-checks-20261025` và sẽ archive khi đóng run. RED worker 2 failures, RED redaction 1 failure, RED media method 7 failures. GREEN ban đầu worker289/database70/business21/Node95. Typecheck lần đầu fail vì literal union trong test mới, đã sửa; không nhận PASS của command thất bại. Final build/typecheck/lint và isolated COD/BANK còn pending tại savepoint này.

Runner riêng `tool-history-campaign.py` đăng ký một run mới 51 native + 17 scoped controls, prefix31 nằm trong51, N1/retry0/max221. Source capture/preflight trước provider; controls PASS mới native, whole-prefix review mới mở 20 remaining. Source/config phải sạch, sourceSha runtime trong registration, không ghi SHA ngược executable. Chưa gọi provider ở savepoint này. Independent review mới chưa hoàn tất vì credits, không có APPROVE giả. Không fullA, production wiring, publish, merge, deploy hoặc live send.
