# Phase B — audit giữ quy tắc nghiệp vụ, 26/10/2026

Audited source: `461e6e571ce60a18b3e231a4d5ce889afb151f6f`, branch `feat/c3-phase-b-commerce-20261014`. Owner yêu cầu kiểm tra form báo giá có ảnh không và rà các quy tắc bị bỏ qua. Đây là audit, chưa sửa runtime/prompt, chưa chạy provider mới; B chưa GO.

Đối chiếu yêu cầu owner mới nhất, AGENTS.md, các spec Phase B về opening quote, turn completion, media, policy, handoff, history, checkout và [21 actual outcomes gần nhất](../../apps/worker/evals/single-agent-commerce-read-only/missing-information-run-20261025/CONVERSATIONS.md). Không coi mọi yêu cầu lịch sử là còn hiệu lực khi owner đã thay đổi phạm vi.

## 1. Form báo giá mở đầu có ảnh, nhưng hiện không được bảo đảm — P2

[Spec mở đầu](c3-phase-b-opening-quote-integration-20261024.md) yêu cầu owner dùng card tên/mã, giá, chất liệu/form đã xác minh, size và gọi selector GENERIC nếu có capability ảnh khi mở đầu báo giá. Không yêu cầu lặp card khi hỏi lại, hay báo giá khi chưa xác định mẫu.

Hiện `prompts/owner.vi.txt:57` cho phép không dùng đủ openingQuote; dòng 59 nói chỉ hỏi giá không bắt buộc tìm ảnh. Hai thay đổi xuất hiện lần lượt ở `eae06606` và `adbee7b0`. Guard tránh giới thiệu không liên quan có cơ sở trong turn-completion plan để giữ deadline/size/correction đúng trọng tâm; không cần bỏ toàn bộ guard. Phần còn thiếu là ngoại lệ báo giá mở đầu theo form khi chính khách đang hỏi giá. Review độc lập yêu cầu phân biệt rõ phạm vi này và không handoff chỉ vì thiếu material/form trình bày tùy chọn.

Run gần nhất có cả 5 lượt opening không ảnh. Trong đó **3 lượt cần đối chiếu form** là opening-ad, opening-organic và opening-multipart. Hai lượt hỏi lại giá và chưa rõ mẫu không phải ca bắt buộc gửi lại card/ảnh.

- opening-ad: tool trả card giá + size, thiếu chất liệu/form trong typed verified attributes. Mô tả có thông tin chất liệu nhưng không đồng nghĩa có quyền điền mọi trường bằng cách suy từ search. Owner nhận card ngắn và trả giá + size, không gọi ảnh.
- opening-organic: owner dùng COMPARE, trả cả giá set/áo/chân váy dù khách hỏi set; không có card một offer cụ thể.
- opening-multipart: khách hỏi set và áo lẻ; owner còn đưa giá chân váy, không có card một offer cụ thể.

`single-agent-commerce-read-only-tools.ts` chỉ dựng openingQuote khi giá/firstContact/offer rõ. `buildVerifiedFactBlocks` dùng thuộc tính đã xác minh; component không được nhận thuộc tính parent tùy tiện. Adapter không phải chỗ làm mất card trong các trace đã đọc. Code không tự gắn ảnh vào card; vẫn cần tool chọn ảnh riêng.

**Hướng xử lý:** khôi phục hợp đồng riêng cho báo giá mở đầu đã xác định sản phẩm, giữ lượt hỏi lại ngắn và lượt hỏi việc khác đúng trọng tâm. Kiểm tra dữ liệu typed có đủ trường cần cho form, giữ provenance/offer scope. Test actual response group phải kiểm form và ảnh đúng sản phẩm, không chỉ kiểm tool có trường openingQuote. Không ép model chép field chưa có nguồn.

Giới hạn đã ghi từ đầu: hiện một TEXT có các đoạn rồi IMAGE; chưa tách đúng hai Meta text bubbles của luồng lịch sử. Đây là giới hạn tích hợp đã công bố, không phải lỗi mới của run này.

## 2. Handoff làm mất phần đã biết — P2, xung đột giữa hai yêu cầu

Owner yêu cầu thiếu dữ liệu shop cần thiết thì handoff. Đồng thời AGENTS yêu cầu bảo toàn verified facts/media; prompt hiện hành yêu cầu trả đủ nhiều ý, thiếu ảnh không làm mất giá, và đổi/trả đủ căn cứ thì báo kết luận ngắn rồi hướng dẫn quy trình.

`single-agent-commerce-handoff.ts:74–87` kết thúc bằng tin tĩnh từ policy sau commit/readback. Khi batch có handoff, lượt kết thúc trước khi owner viết phần trả lời dựa trên dữ liệu đã biết. Handoff là tác vụ thật trong candidate, không phải chỉ viết lời hứa.

Bằng chứng deterministic có sẵn: `single-agent-commerce-ingress.test.ts:450` hỏi “Cho chị xem ảnh khách mặc, áo này bao nhiêu em?”. Giá đã xác minh nhưng feedback thiếu; assertion hiện khóa kết quả chỉ một tin handoff, không giá, không owner final/verifier. Test PASS chứng minh hành vi này đang được duy trì; không chứng minh yêu cầu bảo toàn nội dung được đáp ứng.

Cùng cơ chế, ca cần xử lý đổi/trả có thể chỉ nhận holding tĩnh, bỏ kết luận/quy trình đã có nguồn mà prompt yêu cầu. Đây là finding từ code path; **21 lượt gần nhất không có provider case đổi/trả để khẳng định tần suất**.

**Hướng xử lý:** thiết kế một terminal handoff giữ phần đã xác minh, đồng thời thực hiện chuyển quyền đúng policy. Không bỏ handoff để giữ giá; không ghép draft chưa kiểm tra vào holding sau verifier. Nội dung, ảnh, receipt và message group phải được xét cùng nhau trước enqueue. Cần regression hai tình huống: giá đủ/ảnh thiếu và đổi/trả đủ căn cứ/cần xử lý thực tế.

## 3. Hết lượt tool thì không gọi được handoff dù vừa biết thiếu dữ liệu — P2

Sau sửa `2fa14323`, read_product OK nhưng một field thiếu được giao cho owner xét có liên quan câu hỏi không; code không tự handoff theo mọi field null, tránh chuyển nhầm ca chỉ hỏi giá.

Nhưng `single-agent-commerce-read-only.ts:144–158` chỉ cho hai tool rounds. Chuỗi search → read_product có thể đến cuối round 2 mới biết tồn UNKNOWN. Lượt owner cuối chỉ được trả text; request_handoff cũng bị chặn. Đây là xung đột giữa phân công và budget, không chỉ là owner chưa làm theo prompt.

Local probe với owner/verifier mock, state trong bộ nhớ, không provider/DB/send:

| Sau search → read_product tồn UNKNOWN | Kết quả ở runCommerceTurn | Handoff commit |
| --- | --- | --- |
| Owner trả “Em chưa xác nhận được mẫu này còn hàng chị nhé.”, verifier mock PASS | SEND_ELIGIBLE/PASS | 0 |
| Owner gọi request_handoff STOCK_UNAVAILABLE | FALLBACK/OWNER_TOOL_MODE | 0 |

Probe thứ nhất không phải evidence verifier thật chấp nhận câu này. Nó chứng minh semantic PASS và câu trả lời trung thực vẫn không thực thi quy tắc workflow bắt buộc handoff. Không giao thêm nhiệm vụ điều phối cho verifier.

Persisted ingress có recovery OWNER_TOOL_MODE → RESPONSE_UNAVAILABLE, có thể chuyển handoff nếu quyền/policy còn hợp lệ. Vì vậy không kết luận mọi lỗi này đều gửi fallback cho khách. Tuy nhiên final text PASS ở nhánh đầu không tự đi qua recovery đó.

**Hướng xử lý:** bảo đảm quyết định terminal handoff vẫn thực hiện được sau lượt đọc cuối, với permission/revision/recipient/readback như hiện tại. Chốt cách dành quyền terminal riêng hoặc phân bổ budget phù hợp; không âm thầm tăng generation/tool budget hay cho mutation tùy ý sau FINAL_REPLY. Test cả missing field cần cho câu hỏi và field thiếu không liên quan.

## 4. Fallback cũ và catalog hiện hành lệch nhau — P2 cho accounting, phạm vi runtime có điều kiện

`stateful-provider.mjs:40` vẫn đăng ký `C3_B_MEDIA_NEXT_STEP_V1` với câu “Chị muốn xem ảnh tổng thể hay ảnh cận chi tiết của mẫu này ạ?”. Manifest recoveryFallbacks chỉ có VERIFIED_MEDIA_V1 và MEDIA_UNAVAILABLE_V1; protocol chỉ kiểm hai ID này.

Đây không chỉ là text lịch sử: `single-agent-commerce-media.ts:174` vẫn có thể chọn NEXT_STEP, và media test hiện còn assert câu hỏi đó. Probe B1 không có handoff port, FEEDBACK không xác định, verifier mock UNCERTAIN đã đi tới NEXT_STEP.

Ở persisted candidate có handoff port, thiếu feedback được chuyển trước; **chưa có evidence câu cũ xuất hiện trong 21 actual outcomes mới nhất**. Không gán finding B1 này thành provider regression của persisted B2/B3.

**Hướng xử lý:** đồng bộ catalog với mọi terminal thực sự reachable theo capability và kiểm bằng preflight/tests; sau đó thay câu/đường phục hồi cũ theo quyết định hiện hành. Không sửa artifacts của run đã đóng để làm như chúng được đăng ký theo catalog mới.

## 5. Acceptance chưa giữ được quy tắc gốc — nguyên nhân chung

Các focused tests kiểm wiring, safety boundary hoặc chính hành vi hiện tại. Vì vậy test có thể xanh trong khi form báo giá/ảnh biến thành tùy chọn hoặc handoff bỏ giá đã biết. Report gần nhất ghi mở rộng bảng giá là minor, nhưng chưa đánh giá riêng việc thiếu form/ảnh theo hợp đồng opening ban đầu.

Mỗi lần sửa cục bộ đã đổi tương tác giữa các quy tắc: tránh ảnh không cần thiết → mất ảnh mở đầu; bắt buộc handoff → mất partial answer; tránh handoff vì null không liên quan → giao cho owner nhưng owner cuối không còn tool. Thêm vài câu prompt không giải quyết các xung đột code này.

**Hướng xử lý:** nối từng yêu cầu với assertion trên actual terminal/group và trường hợp đối chứng. Chấm whole reply phục vụ nhu cầu mua hàng, không tính đủ keyword. Giữ kiểm thử authority riêng, không bắt verifier chấm giọng văn hay workflow. Không mở thêm vòng chỉnh giọng cho các ca minor owner đã chấp nhận.

## Những điểm đã kiểm tra và không ghi nhận là bị bỏ

- Policy vẫn lấy trusted/read_policy; không coi policy ví dụ cũ là quy định shop hiện tại. Quyết định owner tạm dùng policy cũ và chart cùng tên là thay đổi được duyệt.
- Thiếu thông tin khách vẫn hỏi bổ sung; không auto handoff vì chưa có số đo/tên/địa chỉ. Ảnh đúng màu/loại thiếu thì handoff theo yêu cầu mới, không tự đổi ảnh chung.
- Một owner, tối đa một verifier; final draft sống qua hard precheck vẫn cần verifier. Không thấy thêm role, parser, repair loop hoặc hidden generation retry trong các đường hiện hành đã rà.
- Freshness/snapshot, subject/revision, permission/recipient, privacy, receipt và group gate vẫn giữ. Run gần nhất còn ghi STALE do refresh provenance và chặn sai tổng 100đ; không bỏ gate để cứu eligibility.
- Lịch sử bounded, public/private checkout và correction vẫn nối. PURCHASE_CONFIRMED chưa phải tạo đơn POS; real delivery/human acknowledgement vẫn chưa được run này chứng minh.
- Handoff giữ transaction/readback; customer copy hiện hành không nhắc bot/nhân viên. B1 không có handoff capability phải được phân biệt với persisted ingress.

## Thứ tự sửa đề xuất

1. Sửa xung đột terminal handoff/budget; bảo đảm thiếu shop data liên quan thật sự chuyển được, thiếu thông tin khách thì hỏi.
2. Giữ phần đã xác minh trong handoff, trước hết giá và quy trình đổi/trả; cùng group/gates, không nối text sau kiểm tra.
3. Khôi phục hợp đồng opening form + ảnh và dữ liệu cần cho form, giữ repeat/unresolved làm đối chứng.
4. Đồng bộ fallback catalog/runtime và thêm regression theo actual customer outcome cho các mục trên.

Chưa thực hiện các sửa đổi này. Sau implementation và focused checks mới đăng ký provider run phù hợp; không suy test mock hay N1 thành ổn định/B GO.

## Verification thực sự chạy trong audit

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-handoff.test.ts -t "offers the existing price card only for first contact|hands off missing requested feedback even when the price|uses an actionable static media question|uses the configured rule and forbids"
node "C:/Users/nguye/Documents/Sản phẩm AI/c3-phase-b-rule-audit-20261026/probe.mjs"
```

Focused tests: **5 PASS, 217 skipped**, không phải toàn suite. Probe exit 0, ba kết quả như mục 3–4; dùng compiled candidate sẵn có và đọc đối chiếu source, không chạy provider/network/DB/delivery. Các lệnh đọc git/rg/PowerShell dùng để đối chiếu source, lịch sử thay đổi và artifacts; không có verification CI/typecheck/build/full-suite mới trong audit này.

Local probe SHA256 `72267d785d8c225a048f0343ade22b527980734c1366a823cceb4101093b1879`; local `PROBES.json` cùng thư mục SHA256 `ef5a0bb9d3141694fe22f7f39f13f5636995fb50a36da2e89067bb13982305e6`. Đây là bằng chứng audit local, không phải preregistered provider evidence.
