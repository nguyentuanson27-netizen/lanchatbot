# Independent review — Phase B input/context improvement plan

Ngày 2026-10-25. Reviewer độc lập `/root/review_input_context_plan`, theo yêu cầu owner. **Kết luận: REVISE trước implementation.** Hướng ưu tiên dữ liệu/context đúng; ba điểm dưới đây cần thiết kế cụ thể để tránh sửa được triệu chứng nhưng vẫn không hoàn thành tác vụ.

- Reviewed HEAD: `72ecbe39b75a98e7612f8d5b148ec532ee3547c4`.
- Plan: `docs/specs/c3-phase-b-input-context-improvement-plan-20261025.md`, chưa commit, SHA256 `9783ea783d9e059f74de976348a9c26312dc848836128c503d42443d29d58a40`.
- Source của provider run được đọc: `33d83f685411f44dffd2a0d7c61c92a607c34d62`.
- Đọc AGENTS, governance hiện hành, plan mới, review51/CHECKPOINT_B, tool-history plan/implementation trước và recovery-priority plan. Đối chiếu code consumer, captured wire và kết quả thực tế. Không gọi provider, không sửa runtime/prompt/plan, không chạy suite/build. Chỉ ghi báo cáo này.

## Findings bắt buộc

### R1 — P1: Preflight sau batch đọc không còn lượt để chọn lại offer

**Vị trí plan:** dòng 85–93, đặc biệt 88. **Code:** `apps/worker/src/single-agent-commerce-read-only.ts:115`, `:123`, `:130`; `single-agent-commerce-read-only-tools.ts:337`.

Trace thực tế là search ở tool round 1, hai `read_product` ở round 2, rồi generation cuối `FINAL_REPLY`. Plan đề xuất preflight trả về phần cần chọn offer khi batch vượt cap. Tại thời điểm nhận lỗi đó model đã hết tool rounds. Báo lỗi có cấu trúc tốt hơn không giúp nó đọc lại; nếu từ chối cả batch còn có thể mất cả phần đọc thành công vốn đủ giá để tư vấn. Việc tăng tính deterministic cần làm, nhưng không đủ để nhận đã chữa discovery.

Code hiện có `invokeBatch = Promise.all(calls.map(invoke))`; bound được kiểm trước commit của từng read sau source read. Hợp 3 parent + 6 offer subjects là 9 > 8. Đổi thứ tự hoàn tất có thể đổi read giữ lại. Kế hoạch cũ đã đòi hoàn tất trong budget và đã thêm offer metadata; model vẫn yêu cầu null. Không nên tiếp tục đặt kỳ vọng vào lời nhắc hoặc thêm trạng thái lỗi cho model tự xoay sở lúc hết lượt.

**Sửa plan:** chốt một call graph hoàn tất được trong hai round trước implementation: search → đọc đúng phạm vi đã chọn → final. Chọn rõ cách biểu đạt scope trong tool contract (bao gồm explicit compare nếu vẫn cho đọc nhiều offers), hoặc một đường discovery có facts đúng scope ngay trong budget. Không tự chọn offer theo keyword, âm thầm truncate, tăng cap hay thực thi late tool. Cần ghi rõ batch vượt ngân sách là all-or-nothing hay giữ tập read theo thứ tự yêu cầu; cách nào cũng phải bảo toàn independent evidence và không tùy tốc độ network. Staging/preflight phải tính trên đúng snapshot được commit, không đọc preflight nguồn A rồi commit nguồn B đã đổi.

**Acceptance bổ sung:** replay hai thứ tự source hoàn thành phải cùng kết quả/context; chỉ có hai tool rounds; ngay trước final phải có dữ liệu đủ cho lựa chọn dự định hoặc báo giới hạn rõ. Tách hai kết luận: code đã xử lý bound/race và owner đã thực sự kết thúc tư vấn. Final-only violation còn tái diễn thì ghi owner/protocol residual, không tuyên bố preflight đã sửa nó.

### R2 — P1: Chưa chốt cách đưa sự kiện cũ vào verifier mà không làm hỏng current receipt gate

**Vị trí plan:** dòng 65–70. **Code:** `single-agent-semantic-verifier-boundary.ts:131–133`, `single-agent-commerce-effects.ts:63–66`, `:117`, `:150–153`.

Plan đúng khi cấm đổi revision/timestamp của receipt cũ. Nhưng contract hiện hành chỉ có `effectReceipts` dùng cho SUCCESS cùng recipient, revision hiện tại và còn hạn. Thêm một receipt lịch sử khác revision hoặc hết hạn vào mảng này làm hard precheck chặn toàn reply, ngay cả khi cartQuote hiện tại đủ trả tổng. Cụm “bổ sung event/receipt còn áp dụng” chưa chọn đường nào, chưa xác định verifier sẽ dùng event ở đâu. Đây là chỗ dễ lặp lại vòng nối thêm context rồi phát sinh stale/fallback mới.

**Sửa plan:** tách ba ý nghĩa thành hợp đồng cụ thể:

1. Public history chứng minh khách đã nhận nội dung gì, với trạng thái accepted và hash/scope. Đó không phải authority cho giá hiện tại hoặc effect mới.
2. Current cart quote cung cấp tổng/giảm đang có, kiểm cart/version/freshness như hiện hành. Trả tổng hiện tại không bắt buộc phải nạp receipt cũ.
3. Chỉ khi cần xác nhận thao tác trước, dùng receipt đúng contract hiện hành nếu vẫn hợp lệ; nếu muốn hỗ trợ historical event khác revision thì phải thiết kế projection/readback/binding riêng, không trộn vào `effectReceipts` rồi nới gate. Có thể defer nhánh này và giới hạn bản sửa đầu vào public history + current quote.

Nguồn durable cho public fields phải được chỉ rõ; hash của whole text và nhãn BOT chưa đủ chứng minh không có PII trong field text tự do. Cần chọn text đã chứng minh public-field contract hoặc bounded event, không để lựa chọn này tới lúc implementation tự suy rộng.

**Acceptance bổ sung:** thay số lượng/size sau giảm giá; concession đã bị thu hồi; cart mới; event cũ hết hạn; unrelated state revision thay đổi; accepted text cũ khác quote hiện tại; failed/pending Outbox; metadata public bị sửa. History vẫn có thể ghi lời đã nói, nhưng current quote thắng về giá hiện tại; lịch sử không cấp thêm quyền ghi hoặc báo thao tác mới. Empty historical evidence không được tự làm mất quote đủ căn cứ.

### R3 — P2: Public history/event chưa có ngân sách và quy tắc merge cụ thể

**Vị trí plan:** dòng 65–70 và 116–124. **Code:** `single-agent-commerce-ingress.ts:48–69`.

History hiện giới hạn 8 entries/4096 bytes; media memory dùng tối đa 1024 bytes trong cùng ngân sách và ưu tiên text hiện có. P0 định thêm public outcomes/events từ durable Outbox nhưng chưa quy định bao nhiêu entries/bytes, đặt vào đâu, ordering và dedup với history. Nếu nối event vô điều kiện, correction vừa có thể bị đẩy ra hoặc cùng summary xuất hiện hai lần. Nếu giữ filter/trim cũ nguyên xi, public summary vừa phục hồi lại có thể bị bỏ ngay. Kế hoạch history ảnh trước đã từng cần chốt chính phần này.

**Sửa plan:** chọn một projection bounded trước seal: source/status được đọc, số rows tối đa, event types/fields tối thiểu, ordering theo accepted outcome, dedup theo identity/hash, byte cap và ưu tiên khi hết chỗ. Không tăng history cap ngầm. Không biến metadata event thành câu khách/shop chưa từng nói. Current quote vẫn độc lập với historical-event window.

**Acceptance bổ sung:** đủ 8 entries, sát 4096 bytes, nhiều media accepted, duplicate callback/restart, accepted text đã có trong chat history, history write thất bại, customer correction mới nhất. Kiểm exact request ở cả owner và verifier, không chỉ helper; ghi rõ outcome nào bị bỏ vì bound.

## Điểm đã xác minh độc lập và nên giữ

- Đếm từ raw wire: **103 OWNER_REQUEST**, không có image input (`inlineData`, `fileData`, `input_image`, `image_url`) trong các body đó. Đây là bằng chứng model không được truyền ảnh trong run, không phải bằng chứng mở vision sẽ cải thiện.
- Đếm **45 verifier request**: 21 từ persisted cohorts và 24 body trong B1 DISPATCHED. SV2447 xuất hiện trong 35 request, content có 35; attributes/presentation/sizeCharts đều không có ở runtime product đó. Không suy rằng toàn catalog thiếu thuộc tính hoặc Size Engine thiếu chart.
- Diagnostic local trên public terminal text đúng case đã tái hiện `private=true`, redacted=`[ADDRESS]`, projected history=`[]`. Code ingress loại toàn message khi redactor nhận private. Chẩn đoán mất context có căn cứ; chưa chứng minh đây là nguyên nhân duy nhất của repeated negotiation.
- `descriptionEvidence()` tại `single-agent-commerce-media.ts:23–25` chỉ giữ AO/CHAN_VAY/QUAN nên raw FULL_SET biến thành `confirmedParts=[]`, `componentKnown=false`. P1 chuẩn hóa nghĩa whole-look dùng chung là đúng; không tự cấp bằng chứng mọi bộ phận, kỹ thuật thêu, màu hoặc độ kín.
- 9 subjects > cap8 đúng về cấu trúc. Không có exact historical source snapshot đầy đủ thì chỉ gọi structural replay như plan đã ghi.
- Code đã có quote hiện tại. Handoff không biến hỏi tổng thành tác vụ được trả lời; giữ cách báo denominator/actual terminal của plan. Không dùng eligible hoặc zero fallback làm điểm bán hàng.

## Điều chỉnh phạm vi nên làm

1. **P3 visual/attributes là thí nghiệm riêng**, sau audit source→consumer. Đừng gom thay nguồn sản phẩm, thêm ảnh và thay search vào cùng một số so sánh rồi quy kết tăng chất lượng. Nếu attributes đã có thì sửa mapping; nếu nguồn thiếu thì ghi thiếu và dùng candidate data có review, không bịa chỉ để chữa các câu concern. Có dữ liệu và có lời tư vấn tốt là hai acceptance khác nhau.
2. **P4 long-context nên deferred trong vòng sửa đầu**, vì hiện là risk từ cấu trúc chứ chưa có failure quan sát. Quote/ETA recovery có failure thật nhưng cũng cần diff/contract riêng. Giữ kế hoạch đầu tiên ở P0/P1 và một P2 đã có call graph rõ; không gọi toàn P0–P4 là một thay đổi nhỏ.
3. Trước provider phải freeze exact changed contracts, request accounting và stop rule cho safety/privacy. 51 native +17 controls N1/retry0 là denominator hợp lý cho một vòng kiểm chức năng; không tăng repetitions tự động. Visual A/B nếu có cần đăng ký riêng và cùng snapshot nếu muốn quy kết thay đổi input. Không cần chạy model chỉ để hoàn thành review này.

## Hoạt động đã thực hiện và giới hạn

Đã chạy read-only git status/HEAD/plan SHA256; đọc file/source và quét JSON local chỉ in counts/key names; chạy một diagnostic Node bằng built helper để kiểm public summary/history. Diagnostic trả exit0 với `{"private":true,"redacted":"[ADDRESS]","history":[]}`. Không build lại, không claim focused suite PASS. Đối chiếu code source xác nhận đường helper tương ứng; không coi diagnostic là test exact-head build mới.

Không thay plan hay runtime; không provider request mới, không source publish/live send. Báo cáo này review đúng SHA plan ở đầu tài liệu; bản sửa sau đó cần self-review theo ba finding bắt buộc, không tự gắn APPROVED bằng kết luận của bản này.
