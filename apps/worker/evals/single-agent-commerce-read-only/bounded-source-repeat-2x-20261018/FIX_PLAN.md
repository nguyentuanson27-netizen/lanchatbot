# Phương án sửa sau review 93 lượt — 2026-10-18

Trạng thái: IMPLEMENTING theo yêu cầu owner; đã nhận ba finding trong INDEPENDENT_PLAN_REVIEW.md. Baseline HEAD e54961fb4344c86b2b5f75bb5e2c0e03fa77d916; refreshed main/implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361. [Review 93 lượt và giọng văn](REVIEW_93.md). Giữ branch PR391, không reset về main. Source/commands/results mới ghi riêng ở ../review93-fix-20261018/.

## 1. Kết quả cần đạt và những thứ giữ nguyên

- Khách chọn hàng → giỏ đúng màu/size/số lượng → nhận sửa số đo → báo tổng code tính → private checkout → xác nhận đúng preview. Dùng địa chỉ thông thường; toàn miền Nam dùng thời gian vận chuyển chung MIEN-NAM theo xác nhận owner.
- Tư vấn giúp chọn mua, có lý do phù hợp và giọng nhắn tin. Upsell có ích được phép; không ép phương án rẻ nhất. Khách đổi hoàn cảnh thì lời khuyên phải theo hoàn cảnh mới.
- Không kể thao tác hệ thống hoặc chép bài quảng cáo. Không hỏi thêm thứ bot không dùng được; không tự tạo lý do thương mại từ nguồn unavailable.
- Owner Gemini 3.5 Flash Lite HIGH; verifier GPT-6.1 Sol HIGH. Giữ generation config/credential route, 3 owner generations/2 tool rounds/6 calls/1 verifier tối đa mỗi public turn, retry0 và wire bounds hiện tại.
- Giữ exact-final-text, mandatory verifier và final deterministic gate. Không thêm model role, router, parser tiếng Việt tổng quát, regex theo case, template final reply hay vòng sửa/reverify.
- Không thay verifier/policy/fallback trong candidate đầu. Không đổi câu hỏi, số ca corpus, nhãn cũ hoặc dùng câu trả lời tốt nhất trong nhiều lần. Review policy trước đây đã đính chính nằm trong REVIEW_93.md; không biến việc chấm lại thành tiến bộ model.
- Chỉ candidate B cô lập; không ghi nguồn công khai, deploy, live send, tạo đơn POS thật, merge hoặc mở Phase C. Chỉnh mô tả registry cho thử nghiệm không đồng nghĩa publish nguồn shop.

## 2. S1 — Nối địa chỉ miền Nam vào ETA hiện có

**Vấn đề xác nhận:** realtime-sales-catalog.ts/resolveRegion hiện so chuỗi địa chỉ với key vùng. Có MIEN-NAM/transit, nhưng TP Hồ Chí Minh không chứa chữ MIEN-NAM. Cả ba private checkout dừng trước model.

**Cách sửa cụ thể**
1. Tìm/tái sử dụng danh mục tỉnh-thành và cơ chế chuẩn hóa địa chỉ có sẵn trước. Kết quả cần là tỉnh/thành hoặc vùng có cấu trúc trong đường private checkout, không đưa địa chỉ cá nhân vào prompt.
2. Dùng một bảng dữ liệu tỉnh/thành → vùng giao của shop. Owner đã chốt toàn miền Nam chung một thời gian; không cần trường thời gian cho mỗi tỉnh. Nếu repo thiếu danh mục, bổ sung danh mục có nguồn và version vào cấu hình candidate, đối chiếu nguồn địa danh chính thức khi thực hiện. Giữ alias cũ nếu khách vẫn dùng tên cũ; trường hợp tỉnh sau sáp nhập có cách phân vùng chưa rõ thì giữ unresolved, không tự áp cùng ETA cho vùng ngoài phạm vi được chốt.
3. Trong resolveRegion hiện có, ưu tiên vùng canonical/địa danh xác định được; tra MIEN-NAM từ snapshot hiện hành. Nhánh key explicit/default cũ vẫn tương thích. Không lấy một từ tên tỉnh xuất hiện trong tên đường làm tỉnh nhận hàng; mâu thuẫn địa danh hoặc không xác định được vẫn unresolved.
4. Tiếp tục tính ETA bằng prep + transit hiện tại. Hàng preorder dùng zero-stock prep. Không hardcode 3–6 vào code và không hứa ngày giao cố định.
5. Giữ cơ chế revalidation/CAS/freshness/recipient/ownership hiện có. Không bỏ kiểm ETA chỉ để checkout đi tiếp.

**File dự kiến:** apps/worker/src/realtime-sales-catalog.ts, realtime-sales-catalog.test.ts; dữ liệu mapping tối thiểu và đường truyền private destination nếu chưa có. Chỉ chạm shared contract nếu private checkout hiện không truyền được dữ liệu cần thiết; lúc đó dùng field tối thiểu, không thêm dịch vụ địa chỉ mới.

**RED → GREEN**
- Địa chỉ thường TP Hồ Chí Minh + snapshot chỉ có MIEN-NAM: trước unresolved, sau READY.
- Ít nhất hai địa chỉ miền Nam khác tra cùng transit; địa chỉ miền khác không bị map MIEN-NAM. Tên đường trùng tên tỉnh, thiếu tỉnh, tỉnh mâu thuẫn: không đoán.
- Đổi transit trong snapshot thì ETA đổi theo; thiếu key hoặc stale vẫn từ chối.
- PRE_ORDER lấy đúng prep riêng, không thay bằng in-stock prep.
- Sau sửa, chạy disposable-DB COD hiện có với source thật/current capture, giữ địa chỉ gốc; phải đi qua preview và confirm, không chỉ test resolver. Nếu lộ blocker mới thì ghi rõ và dừng ở blocker đó.

**Hoàn thành khi:** checkout không còn bị chặn vì địa chỉ miền Nam hợp lệ; preview/current receipt đúng, stale/change/handoff vẫn được bảo vệ. Chưa đủ nguồn địa danh là phần việc nguồn còn thiếu, không quay lại hỏi owner thời gian vận chuyển từng tỉnh.

## 3. S2 — Giữ lựa chọn khách khi gọi tool, không tăng budget

**Vấn đề xác nhận:** R3 chọn be nhưng add_to_cart nhận null; trước đó read_product tốn một vòng, sau đó gọi sửa màu dưới NONE. Không thiếu source color; schema required color nhưng nullable không bảo đảm hiểu lựa chọn.

**Thay đổi**
- Chỉ chỉnh nơi mô tả mua/sửa giỏ trong effectDeclarations ở gemini-inference.mjs và bỏ phần lặp ở owner.vi.txt. Hướng dẫn trực tiếp ở tool: lấy product/offer/size/color/quantity theo yêu cầu hiện tại; phần khách không đổi lấy từ giỏ/history; null chỉ khi thực sự chưa có lựa chọn.
- Với khách đã chọn size: add_to_cart trực tiếp vì tool tự xác minh nguồn; không bắt recommend_size hoặc read_product trước. apply_customer_state vẫn phải hoàn tất trước thao tác thật sự phụ thuộc hồ sơ. Không ghép thao tác phụ thuộc vào batch song song để tiết kiệm lượt.
- Giữ color:null hợp lệ khi khách chưa chọn màu; không đổi required/nullable chỉ để case be chạy qua. Không tự chọn màu duy nhất, không parse lời khách bằng regex, không tạo một selection object từ model khác.
- Giữ typed failure và available choices trả về. Giữ NONE là cấm thực thi; output vi phạm không được tự chạy hay retry.

**Kiểm chứng**
- Test schema/projection, quyền/capability và typed failure hiện có vẫn pass; không viết unit test chỉ kiểm prompt chứa câu “giữ màu”.
- Dùng trace provider của stateful-open/variant qua ba hành trình mới: args đúng BE/M rồi BE/L ×2, không đọc giá/tồn lặp trước add chỉ để cấp quyền, không gọi tool dưới NONE. Test deterministic riêng giữ trường hợp chưa chọn màu/khách đổi màu và failed mutation không ghi state.
- Nếu owner vẫn bỏ field với context đầy đủ, báo reliability chưa đạt. Đây là thay đổi được đem kiểm chứng, không gọi là bảo đảm sửa bằng code.

## 4. S3 — Giữ đúng lỗi completion để chẩn đoán

**File:** gemini-inference.mjs và gemini-inference.test.mjs.

- Giữ nguyên kiểm finishReason=STOP và failure code. Bổ sung raw finishReason nếu là mã enum dạng chuỗi ngắn an toàn; giới hạn độ dài/ký tự, không ghi finishMessage hoặc provider free text. Mã không hợp lệ giữ UNKNOWN.
- Phân biệt HTTP thành công, completion không hợp lệ, và tool output dưới NONE. Giữ mỗi generation một HTTP request, không retry.
- Test response STOP, known non-STOP, unknown enum, missing reason, mã quá dài/không hợp lệ, functionCall dưới NONE. Kiểm không lộ body/secrets.
- Chưa sửa API hoặc generation config vì chưa có evidence lỗi ở đó. Nếu cần đổi API sau này phải kiểm official docs tại thời điểm sửa.

## 5. S4 — Trình bày dữ liệu sản phẩm để tư vấn, không làm bài quảng cáo

**Đường có sẵn:** product registry description_override → p23c-profiles.ts/description_xml + authority/version → p23c-jobs.ts → Qdrant StableProductDocument → single-agent-commerce-read-only-tools.ts/content → Gemini trusted.products/native response.

**Việc làm**
1. Chuẩn bị bản mô tả trung tính cho sản phẩm liên quan, dựa hoàn toàn bản nguồn đã capture; dùng field description_override có sẵn. Giữ bản gốc và bảng đối chiếu nội dung để reviewer thấy không mất chất liệu, cấu tạo, form, care hoặc đặc điểm có ích.
2. Với SV2447, thông tin cốt lõi đã có: áo tơ Hàn thêu, chi tiết thêu nổi; váy ren tơ Hàn; mềm/thoáng/nhẹ, form và độ rũ theo nguồn. Không thêm lớp lót, độ xuyên, chất lượng chịu giặt, dịp khách phải chọn hay kết luận bán riêng. Không đưa giá/tồn vào mô tả.
3. Thử bằng snapshot registry/catalog cô lập qua readProduct port hiện có. Giữ provenance/version của candidate rõ ràng; không giả làm snapshot WEBSTORE cũ và không publish Qdrant/Sheets đang dùng. Nếu runner chưa hỗ trợ nguồn cô lập, chỉ thêm khả năng chọn snapshot catalog trong harness bằng read port có sẵn; không thêm runtime framework/overlay service.
4. Owner và verifier nhận nguồn nhất quán; verifier giữ prompt như cũ. Không thêm một model tóm tắt, không dùng parser cắt tính từ và không hardcode mô tả theo caseId trong adapter.
5. Mẫu nào chưa được biên tập vẫn dùng bản nguồn hiện hành. Không nhân scope thành làm lại toàn bộ catalog. Không tuyên bố candidate biên tập vài mẫu chứng minh đã cải thiện toàn shop.

**Nguồn partial**
- Giữ content có sẵn trong cả trusted/native như bản sửa đã chứng minh. Giữ availableOffers/sellingOptions unknown nếu không có nguồn.
- Trong owner projection chỉ bỏ reason POS_SNAPSHOT_UNAVAILABLE; giữ status và tất cả reason khác, đặc biệt SIZE_UNSUPPORTED/VARIANT_NOT_FOUND/DELIVERY_REGION_REQUIRED. Diagnostic log và verifier/final gate giữ dữ liệu gốc. Kiểm cả đối chứng input/variant reason. Không tạo hệ phân loại mới.
- Không đổi unknown thành false, không che mất status và không tạo lời giải thích “thiết kế theo set nên không bán riêng”.
- Không xin số đo để khôi phục POS; không hứa báo lại khi chưa có tác vụ đó.

**Test:** original/neutral content giữ identity/provenance; owner không nhận evaluator labels; native parts/thought signatures không bị sửa; full và partial đều giữ các fact/offer đúng scope; bounds không tăng. Nếu harness dùng snapshot khác nguồn thật, báo rõ điều đó trong kết quả.

## 6. S5 — Sửa phần tư vấn/giọng bằng thay thế đoạn cũ, sau phép thử context

Tám diagnostic đầu giữ exact owner prompt và tool declarations baseline; chỉ thay presentation context S4 (mô tả cùng POS reason), không quy riêng tác dụng cho mô tả hay reason. S1 không ảnh hưởng B1, S3 chỉ telemetry. Chỉ áp S2 sau tám diagnostic, seal HEAD mới; mọi nhóm evidence được báo đúng source identity, không coi source khác nhau là một qualified N3 run. Nếu cần S5 thì giữ S4 và áp S2/S5 trong candidate mới, ghi rõ không tách được tác dụng riêng của S2/S5. Không tạo framework A/B.

Nếu tám ca B1 ưu tiên vẫn cho thấy lỗi giọng/quyết định, thay các đoạn “khách phân vân/đổi dịp”, “partial source” và “Giọng shop” bằng nội dung ngắn, chức năng rõ sau đây; không nối thêm ở cuối:

> Khi khách nhờ chọn, nói shop khuyên món nào và giải thích bằng điểm liên quan đến điều khách đang phân vân. Có thể bán thêm nếu khách được lợi rõ. Nếu vẫn khuyên món cũ sau khi hoàn cảnh đổi, giải thích vì sao nó còn phù hợp. Đừng quay lại khen mọi phương án khiến khách phải tự chọn lại.
>
> Dùng mô tả sản phẩm để lấy thông tin, không chép thành lời giới thiệu. Nói như đang nhắn tiếp với khách: trả lời hoặc đưa lựa chọn trước, giải thích phần cần cho quyết định. Xác nhận món/màu/size/số lượng vừa chốt; kết quả tool cho biết việc nào đã xong, không cần kể thao tác giỏ hay hồ sơ.
>
> Nhắc thông tin khách khi nó giúp giải thích hoặc xác nhận điều vừa sửa. Không đọc lại cả ngân sách/hồ sơ chỉ để chứng minh đã hiểu. Chỉ hỏi khi câu trả lời giúp chọn hàng hoặc thực hiện bước bot đang làm được. Đủ ý thì dừng.
>
> Có mô tả nhưng chưa tra được giá/tồn: trả phần liên quan đã biết, nói rõ phần chưa kiểm tra được. Không tự suy lý do thiếu nguồn, không hẹn báo lại hoặc xin dữ liệu không giải quyết được việc đó.

Đây là bản nội dung định hướng để đưa vào diff cụ thể, không phải prompt đã chạy. Khi sửa phải đối chiếu toàn prompt để không bỏ size-fit, policy scope, fact, receipt, privacy và giới hạn inference. Giữ chủ quan thẩm mỹ/cảm giác/layering được phép; không thêm giọng dè dặt. Không chèn ví dụ từng case hay ép hai câu.

**Cách review giọng mới**
- Đọc nguyên câu hỏi/history/reply; đánh giá reply có giúp quyết định và tiếp tục mua không.
- Tách “dùng được nhưng có thể gọn hơn” khỏi “cần sửa vì khách vẫn phải tự giải quyết hoặc bước tiếp không làm được”.
- Danh sách giá, xác nhận số đo vừa sửa, upsell cả set đều có thể tốt. Không blacklist từ nối, “ạ/nhé”, số tính từ hay số câu.
- Lý do nhận xét phải gắn với tác dụng cả đoạn; trích câu minh họa không phải cách tính điểm.
- Không đổi verifier để chặn văn chưa hay. Không đòi điểm tối đa mọi chiều để full run.

## 7. Giữ verifier và fallback trong đợt đầu

- Không sửa chính sách chỉ vì thiếu một điều kiện trong câu trả thời hạn/phí. Giữ đính chính R3 policy-v2, không relabel raw.
- Với sân khấu, chấm nghĩa cả đoạn theo ranh giới owner đã duyệt: cảnh báo nguy cơ + gợi lớp trong được phép; thêm cấu tạo/kiểm nghiệm/đảm bảo độ kín cần nguồn. Không quyết định bằng chữ “yên tâm/hoàn toàn”.
- Nếu reviewer và verifier vẫn bất đồng ở exact draft mới, lưu cả verdict và nhận định, chỉ rõ phần nghĩa đang tranh luận; không tự nới prompt cho qua để hoàn thành.
- Câu fallback cụt được ghi là customer outcome chưa tốt; không thay bằng lời hẹn/handoff không có thật. Không thêm tầng recovery mới trong kế hoạch này. Ưu tiên giảm lỗi gây fallback trước.

## 8. Lịch kiểm chứng và số lượt cố định

**Trước provider:** RED→GREEN cho logic thay đổi; focused tests, worker typecheck/build/lint; disposable-DB controls hiện có. Self-review diff và freeze models/prompt/schema/source/corpus/criteria. Commit executable/config, clean worktree, lấy runSourceSha runtime, chạy preflights hiện có. Source đổi thì run mới; không chạy lại attempt cũ để thay kết quả.

**Tám ca B1 ưu tiên, dùng ID và lời thoại cũ**
1. b1-changed-occasion (slot1)
2. b1-buying-concern (slot3)
3. b1-partial-source-v2 (slot5)
4. b1-buying-concern-v2 (slot6)
5. b1-partial-source (slot8)
6. b1-changed-occasion-v3 (slot17)
7. b1-partial-source-v3 (slot19)
8. b1-buying-concern-v3 (slot23)

Đây là tám ca có phạm vi khác nhau, gồm upsell để kiểm không sửa quá tay. Dùng --range n:n hiện có; không thêm ca/corpus mới chỉ để điều phối.

**Nhánh thông thường: tối đa 61 outcomes**
- Tám B1 ưu tiên ×3 =24. Tám đầu diagnostic giữ owner prompt baseline; sau đó áp S2/seal source mới rồi chạy thêm hai repetition. Báo8+16 theo source riêng, không gộp thành same-source N3.
- Ba hành trình stateful ×7 =21; mỗi hành trình DB riêng, thứ tự thật, không reseed giữa lượt, giữ cả thất bại và downstream. Nhóm này vẫn nằm trước phần B1 còn lại.
- Khi nhóm ưu tiên đạt:16 B1 còn lại ×1 =16.
- Tổng24+21+16=61, vẫn31 unique cases. Không chạy lại thêm một full31 sau đó. Max provider generation requests=24×4 +3×24 +16×4=232; đây là trần, private/control có thể không gọi model.

**Nhánh cần S5: tối đa 69 outcomes cho kế hoạch này**
- Giữ tám outcomes context-first đã chạy; dừng candidate đó sau tám, không chạy tiếp full.
- Sửa tư vấn/giọng, seal candidate mới rồi chạy tối đa61 như trên. Tổng8+61=69, max264generation requests.
- Không có vòng thứ ba tự động. Nếu S5 vẫn thất bại thì dừng và báo phần còn lỗi, không sinh thêm hàng trăm attempt.
- Chỉ được rẽ sang S5 ngay sau tám diagnostic đầu. Nếu đã đi tiếp rồi lỗi mới lộ ở repetition/stateful thì giữ kết quả và dừng, không mở S5 muộn hoặc tăng trần. Giọng stateful chỉ được kiểm trong21lượt stateful, không suy từ tám B1.
- Hai candidate khác source SHA được báo riêng, không gộp điểm để lấy PASS. Cả tám diagnostic ban đầu đều giữ denominator của chúng.

**Điều kiện chuyển sang16ca còn lại**
- Không có known unsafe send-eligible; đúng tiền/giỏ/receipt/authority/privacy.
- Ba hành trình không còn lỗi bỏ màu/NONE và checkout phải qua preview/confirm; có lỗi nguồn/provider thì giữ FAIL/BLOCKED, không bỏ khỏi denominator.
- Tư vấn chọn được hướng có lý, trả đúng phần biết, không tự tạo lý do khi thiếu source và không hỏi bước vô ích. Giọng phải dùng được; chỉnh văn nhỏ không tự thành FAIL.
- Nếu semantic verdict đang bất đồng chưa giải quyết theo tiêu chí freeze, không gọi nó PASS. Review không thay verdict để mở full run.

## 9. Commands dự kiến — chưa chạy

Từ repo root; dùng đúng tập bị tác động, không cần chạy nhiều lần không có thay đổi mới:

~~~powershell
pnpm --filter @lana/worker exec vitest run src/realtime-sales-catalog.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-semantic-verifier-boundary.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/product-presentation.test.ts src/product-facts-v2.test.ts src/size-engine.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
~~~

Nếu sửa ingestion p23c, thêm focused p23c-profiles/p23c-jobs tests đang có. Nếu sửa shared package thì chạy typecheck/build/focused tests package đó; không mặc định sửa shared. Runner/build/credentials/preflight dùng đường hiện có trong [COMMANDS](COMMANDS.md); kiểm launcher còn tồn tại trước dùng, không in secrets.

Provider B1 dùng run.mjs --config source-config.b1.json --cases context-fix-20261016/cases.priority.json --range n:n --out <riêng từng attempt> --run. Giữ full registration24 và ghi rõ dispatch subset/aggregate coverage. Stateful dùng isolated-integration.mjs <out riêng> COD --provider-run. Credential wrapper như commands trước; không tạo route mới. Nếu dùng snapshot candidate, path/hash phải freeze qua cấu hình harness trước chạy; không tự nhận là live-source run.

## 10. Bàn giao và self-review kế hoạch

- Raw trước whole-turn review, rồi mới diagnosis; 31case coverage và mọi attempt được đối chiếu, không đổi dữ liệu lịch sử.
- Report tách source/code/provider/verifier/voice/decision; review toàn bộ actual outcomes, không chỉ fallback. Không dùng usable rate làm conversion rate.
- Báo số lần được gửi nhưng lời tư vấn vẫn yếu; số blocked do source; semantic disagreements; latency/token/error/denominator hiện có.
- Complexity delta dự kiến: một mapping dữ liệu dùng resolver hiện có, telemetry enum nhỏ, sửa tool descriptions/owner projection, bản mô tả nguồn candidate; tùy nhánh có sửa đoạn prompt. Không database migration, role/gate/durable state mới. Nếu cần vượt các phần này phải chứng minh vấn đề thực tế trước.
- Rủi ro còn lại: phân vùng địa danh sau thay đổi hành chính; mất nuance khi rút mô tả; model vẫn làm mất args; reviewer vẫn chủ quan ở thẩm mỹ. Test/đối chiếu nguồn và thử có giới hạn xử lý từng rủi ro; không khẳng định prompt mới sẽ sửa hết.
- Self-review đã loại phương án tăng budget, ép chọn áo riêng, whitelist từ tự tin, parser cắt quảng cáo và thêm chốt hỏi mọi lượt. Không dùng việc bảng size thiếu để làm bot hỏi ba vòng trong ca khách đã tự chọn size.
- Kế hoạch này là tài liệu chuẩn bị. Không có implementation, source publication hay generation được thực hiện trong lượt lập kế hoạch.

