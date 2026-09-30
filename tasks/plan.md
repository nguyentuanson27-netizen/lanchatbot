# Kế hoạch sửa C3 và năng lực bán hàng — cập nhật 30/09/2026

**Bản hiện hành kế thừa PR375. PR377 đã triển khai một phần; acceptance P00–P12 chưa hoàn tất. PR378 chỉ sửa kế hoạch trước khi tiếp tục fix PR377.** Không tạo roadmap thứ hai hoặc đánh dấu implementation hoàn thành từ việc sửa tài liệu. Checklist hiện hành ở [todo.md](todo.md). Review Astra 24/09 là review kế hoạch cũ, không phải review bản này hoặc code hiện tại.

Bản cập nhật 27/09 đã tiếp thu và hiệu chỉnh [comment 5847545097](https://github.com/nguyentuanson27-netizen/lanchatbot/pull/375#issuecomment-5847545097); [đối chiếu findings](evidence/c3-plan-review-comment-5847545097.md) ghi rõ phạm vi từng bằng chứng. Chỉ sửa tài liệu; chưa sửa hành vi ứng dụng hoặc chạy lại Luna.

Self-review tại `d36f213` được xử lý trong bản này: đặt extraction trước các quyết định ngữ nghĩa đầu luồng, tách acceptance harness P05 khỏi sửa nghiệp vụ P06, đưa context cùng lượt về P06 trước P07. Các task triển khai vẫn chưa hoàn thành.

### Phạm vi PR378

PR375 đã merge tại `7c1f10f2a27db2b6258581f21955d1bc62681821`; head cuối của PR375 là `a5167f9f629a7a9015a66d86af52dcae8fded99c`. Baseline tiếp tục PR377: `7576e6ec964aca0f22ca19c24eddc773030a0866`, branch `feat/pr375-sales-implementation-20260929`. Hai head có cùng blob `tasks/plan.md` là `bd4f21b7c5699b0f18df91767c05348196fb16ca`: phần lớn đề xuất mới đã nằm trong P00–P12.

Dùng lại draft PR378 vốn phục vụ exact-head CI, target nhánh PR377 để diff chỉ chứa kế hoạch. Giữ lịch sử CI; không dùng đổi base để né kết quả fail. Chỉ sửa `tasks/plan.md` và `tasks/todo.md`; dừng để owner review trước khi fix, không đổi runtime/operating mode/process profile, không merge/deploy/gọi model/gửi khách hoặc ghi dữ liệu live.

## 1. Mục tiêu, nguồn và giới hạn

Bot phải hiểu quyết định hiện tại của khách, dùng đúng dữ liệu, xử lý băn khoăn, hỏi tiếp có ích, nhớ lựa chọn/sửa ý, thực hiện đúng giỏ/checkout và nói tự nhiên theo giọng La.na. Mục tiêu là giúp khách chọn và mua sản phẩm phù hợp bằng tư vấn có căn cứ, không chỉ trả lời FAQ hoặc đẩy trạng thái tới PURCHASE_CONFIRMED. Đánh giá cả câu khách nhận lẫn trạng thái nghiệp vụ; không gây áp lực hoặc kéo dài hội thoại chỉ để có thêm lượt.

- Giữ form báo giá lần đầu theo spec; adaptive không bị ép vào chuỗi giá → size → checkout hoặc ngân hàng câu.
- Giữ Strategist chọn việc tư vấn; code sở hữu dữ liệu, phép tính và quyền nghiệp vụ; Responder viết lời theo nhiệm vụ được cấp.
- Tái sử dụng kernel, CAS/fencing, current-cart binding, Inbox/Outbox, history recovery, policy, search, rubric và harness.
- Đánh giá cuối bằng **gpt-6-luna**, lưu toàn bộ lịch sử và model stages. Không âm thầm thay model; thiếu provider/quota/judge phải báo thiếu evidence.
- Bàn giao dự kiến: code + spec + tests/evidence + residual + draft PR đúng HEAD. **Không merge, deploy, bật traffic, gửi khách, ghi dữ liệu live hoặc đổi authority/allowlist.**
- Đây là kiểm chứng local/synthetic; chưa bao gồm thử nghiệm conversion hoặc doanh thu khách thật.

### Snapshot lịch sử của kế hoạch ngày 27/09/2026

Bảng này giữ nguồn PR375, không mô tả HEAD hoặc runtime hiện tại. Baseline tiếp tục implementation nằm ở phạm vi PR378 phía trên.

| Nguồn | Giá trị |
|---|---|
| Repo / application baseline branch | `lanchatbot-c3-runtime-integration` / `codex/c3-runtime-canonical-integration` |
| Plan PR/branch | PR375 / `docs/c3-sales-fix-plan-20260926` |
| Application baseline / remote PR374 head | `ce558e6d4028dd06bd6efc960286464425a26a85` |
| PR375 head trước amendment này | `d0c8a3119009baded942c77c7d045c402b4a8a22`, chỉ thêm plan/checklist trên application baseline; local/remote khớp khi bắt đầu |
| Remote main | `a28bd12a8b15c4bbf65914c52236adac4ac41594` |
| PR371 | `88a1ce4` đã xác minh là ancestor của HEAD |
| DEV70 tại snapshot | source `92612ad182bc4b2540cd741a6278b4ed76928049`; tới HEAD chỉ thêm evidence docs |
| Source fingerprints tại snapshot | Sáu file được run ghi nhận khớp source khi đó; không suy thành xác minh HEAD hiện tại hoặc mọi artifact |
| Spec C3 SHA-256 | `498fcffb7dbf373274bd932c546c716355503c1383ddec79905d0cff6c7f7ff1` |
| Rubric SHA-256 | `54437743f5e135f123e17c0de5a71fa5061c6eb54782defdd7bb3f70bd4aabf5` |

Yêu cầu người dùng ưu tiên. Spec trực tiếp: `docs/specs/track-c-c3-strategy-contract.md`; invariants: `AGENTS.md`, `docs/current/architecture-program/OPERATING_MODE.md`; compatibility: `docs/current/REALTIME_AGENT_UPGRADE_PLAN.md` và baseline r31.3/r32.2 được repo dẫn chiếu. Tài liệu lịch sử không xác nhận phiên bản live hiện tại.

Kế thừa candidate branch vì người dùng yêu cầu giữ fix đã review; không bắt đầu lại từ main/cherry-pick mù. Đầu lượt implementation kiểm tra HEAD/status/remote; nếu baseline đổi, ghi diff và tái kiểm chứng phần bị ảnh hưởng.

## 2. Hiện trạng: bảo toàn năng lực và invariants đã đúng

“Kế thừa fix” nghĩa là giữ kernel/capability và ràng buộc đã chứng minh, **không giữ nguyên regex kích hoạt đang hiểu sai ý khách**. Typed input phải thay những quyết định ngữ nghĩa này tại đúng boundary. Không mở rộng regex trên chữ bỏ dấu hoặc thêm câu mẫu để vá từng ví dụ. Parser định dạng và tìm kiếm có thể tái sử dụng; chúng không tự cấp quyền sửa giỏ, ghi preference, chọn payment hoặc quyết định handoff.

| Phần | Đã có | Còn thiếu |
|---|---|---|
| Cart/size/payment | PR377 có typed input/current-cart readback; run e76a9667 giữ L, trả lời phí giao và tới confirmation | Câu nhiều ý, confirmation và đường phủ định/sửa ý chưa đủ acceptance; không làm lại happy path đã có |
| Checkout private/binding | Capture riêng tư/source checks; typed UNCLEAR/REJECT không bị legacy positive ghi đè | Đủ coverage recipient/điều kiện/correction xuyên lượt với model thật |
| History/profile | Accepted Outbox recovery, context cùng lượt cho budget/occasion/rejected products | Câu hỏi đang dở, lý do băn khoăn, referent nhiều sản phẩm, vượt window |
| Catalog | Registry/XML → serialized index → adapter/C3 có tests; HTTP index đang mô phỏng | P02 cần isolated producer/index/readback thật và coverage, không suy đã có từ mock |
| C3 wording | Prompt tập trung tại track-c-c3-prompts.ts; adaptive prose có facts giới hạn | Editorial, guard và chất lượng lời hoàn chỉnh trên exact head |
| Ownership | Producer trước routing/text selection trên nhánh opt-in; preflight vẫn trước model | Commerce wording, media/URL và nhánh tương thích chưa chuyển hết |
| Guard | Loại cart facts thiếu independent binding trước model; recovery có diagnostic | Guard hai chiều, nghĩa văn xuôi và độ đầy đủ câu hỏi qua recovery |
| MCP | Allowlist fix f448911 và focused evidence | Giữ nguyên nếu không chạm ranh giới này |

Nguồn hiện trạng: [runtime amendment PR377](../docs/specs/pr375-customer-input-runtime-20260929.md) và [DEV70 tại e76a9667](evidence/pr377-dev70-e76a9667-diagnostic.md). Báo cáo ghi 52 candidate hoàn thành, 16 generator/guard failures, 2 expected pre-model rejects; 43/52 được chấm (14 PASS, 23 PASS_WITH_NOTE, 6 FAIL), 9 JUDGE_ERROR còn lại. Đây là evidence của source ghi trong báo cáo, không phải chạy lại head 7576e6ec hoặc conversion. Full traces ngoài repo chưa được kiểm tra lại trong PR378.

Evidence lịch sử PR375: happy path M→L ở `8cd20ab` đã thành công; không ghi thành “đổi size đang RED”. Positive đó chưa chứng minh không đổi nhầm giỏ hoặc full-intent model. Probes ở `d0c8a31` tái hiện planned M→L từ “Chị thấy size L hơi rộng”; câu “Lấy size M nhé, size S còn không?” bị parser chọn S nhưng canonical hạ decision thành NONE, chưa mở giỏ S qua đường đã thử. Đây là lỗi intent/binding, không phải bằng chứng live effect.

## 3. Thiết kế đích và các quyết định bắt buộc

```text
Admission / ownership hiện có / safety preflight (no-call khi bị chặn)
 → tin khách + history + state + canonical snapshots đã có
 → typed customer input có nguồn; capture PII tại boundary riêng tư
 → validate intent mới: hậu mãi/handoff; nhánh handoff dừng tư vấn bán hàng
 → resolve/search product theo intent, bind referent
 → cập nhật context hợp lệ cùng lượt; fact lookup theo yêu cầu đã hiểu
 → FIRST_CONTACT_FIXED hoặc Strategist chọn bước tư vấn
 → code resolve/validate/derive và command đủ quyền
 → Responder nhận task, facts, kết quả được phép công bố
 → output checks + atomic state/Outbox commit
 → fake delivery trong test; history chỉ ghi lời accepted
```

Lookup mới có đường resolve hữu hạn; nếu kết quả đổi lựa chọn, chọn lại trên dữ liệu mới. Ghi tổng calls thật. Sáu trường Strategist hiện không phải tool API.

### Quyền sở hữu

| Nội dung | Owner và ràng buộc |
|---|---|
| Khách hỏi/chọn/sửa/từ chối | **Customer Input Producer** hiểu delta tin mới theo mệnh đề, đối tượng, phủ định và điều kiện; history chỉ giải referent. Không viết lời bán hàng, chọn chiến lược hoặc cấp quyền effect; span/confidence không tự chứng minh ngữ nghĩa |
| Chọn đáp/evidence/progression | **Strategist** xác định quyết định khách cần giải quyết, chọn evidence liên quan và tối đa một bước tiếp theo hữu ích; tiếp tục câu hỏi đang dở khi có thông tin bổ sung. Không viết lời khách nhận hoặc tự bịa phương án. Fixed first-contact policy vẫn là owner riêng theo spec |
| Cart/payment/preview/confirm | Code/kernel; state quyết định gồm cập nhật hợp lệ cùng lượt; recheck revision khi commit |
| Commercial facts | Nguồn có thẩm quyền + code binding/derivation; goal/dialogue không cấp shop authority |
| Lời nói | **Responder** diễn đạt task thành lời Messenger tiếng Việt tự nhiên, đủ câu trả lời/giới hạn và đúng bước tiếp theo; không tự đổi strategy/evidence, thêm lợi ích hoặc nhận công effect chưa thành công |
| Công bố effect | Transaction/readback/receipt; internal confirmation không phải receipt tạo đơn POS |

Giữ sáu trường `replyAct`, `goal`, `proposition`, `evidenceRefs`, `continuation`, `canonicalAction`. Goal cần nêu nhu cầu, known customer inputs, giới hạn và lý do bước tiếp theo; không thêm taxonomy/state machine chỉ để chia đoạn văn thành nhiều trường.

Ở baseline PR375, typed intent đến từ proposal call sau một số quyết định ngữ nghĩa. PR377 đã thêm producer trước các consumer trên nhánh opt-in; P06 kiểm chứng và hoàn thiện phần còn thiếu, không xây producer thứ hai. Consumer đã chuyển tái dùng kết quả validate; ghi rõ các nhánh chưa chuyển. Bỏ quyền chọn lại chiến lược của proposal/legacy trên nhánh đó. Chỉ hợp nhất extraction với call khác sau khi schema/PII/evidence được chứng minh bằng amendment/test. Không xóa producer để làm đẹp con số hai calls. Hai vai trò hội thoại không đồng nghĩa mọi lượt runtime đúng hai calls.

Preflight dựa ownership/tag/authority đã xác minh vẫn đi trước model. Yêu cầu mới của khách muốn gặp nhân viên hoặc xử lý hậu mãi thuộc input cần hiểu sau preflight; không đồng nhất với trạng thái đã có human owner. Trước extraction chỉ đọc snapshots/history và dữ kiện định danh đáng tin cần thiết; không loại current product, ghi rejected product hoặc tạo handoff event từ regex ngữ nghĩa. Extraction có thể giữ referent chưa resolve; code lookup/bind sau đó, thiếu căn cứ thì hỏi rõ hoặc dùng fallback đúng boundary, không tự mutation. Không gọi lại producer chỉ để mỗi consumer tự phân loại cùng một tin.

Typed input phân biệt hỏi/chọn/nhận xét/từ chối/sửa ý theo mệnh đề và đối tượng. Tái dùng fields hiện có, bổ sung tối thiểu operation, product/cart-line, attribute/value và nguồn còn thiếu; bind revision ở code. Span/confidence/JSON hợp lệ chưa chứng minh hiểu đúng. Kernel đã có `SET_LINE_VARIANT`: sửa giỏ không cần biến thành commitment mua mới hoặc mặc định thêm action vào `AgentBuyingIntentV1`. Một tin chọn M và hỏi S phải giữ cả hai ý nhưng chỉ một progression theo spec; khi đối tượng còn mơ hồ, hỏi rõ phần đó và không tự mutation.

### Guard và quyền diễn đạt

1. Code kiểm tra giá trị, chủ thể, scope, freshness, current-cart revision, policy, quyền và receipt bằng dữ liệu có cấu trúc.
2. Không dùng việc thêm whitelist “chưa/không/chắc...” làm giải pháp chính. Regex có thể kiểm tra định dạng/mã/token; không gọi đó là chứng minh ngữ nghĩa tiếng Việt.
3. Đúng con số, claim annotations hoặc nhãn uncertainty do model khai đều chưa chứng minh câu tự do đúng nghĩa. Không bỏ output checks rồi coi structured input là bảo đảm output.
4. Mở editorial theo nhóm fact: giữ values/subjects/conditions/negation/modality; so giá do code tính không cho phép suy “đáng tiền hơn”; ETA dự kiến không cho phép hứa kịp hạn.
5. Nhóm chưa chứng minh được output verification thì giữ projection giới hạn cho nhóm đó và báo residual. Không khóa toàn bộ câu adaptive thành template; không hứa kiểm tra tất định mọi câu tự do.
6. Không thêm model reviewer online vào mọi lượt theo mặc định. Nếu thử nghiệm cho thấy cần semantic verifier để đạt phạm vi tự do mong muốn, ghi rõ lựa chọn kiến trúc, sai số, calls và độ trễ; task wording chưa được coi là hoàn thành.

### Lựa chọn model: thử nghiệm hữu hạn trong P05/P11

Luna là ứng viên ưu tiên theo trao đổi với owner, không phải kết luận đã bán hàng tốt hơn Flash-Lite hoặc quyết định đổi provider live. Giữ vai trò độc lập với tên model; cùng model không có nghĩa gộp trách nhiệm. Thử model chỉ giới hạn Producer/Strategist/Responder, không đổi model của Shadow/media/P2.3/Size Chart.

P05 tái dùng transport/harness để xác minh model ID, đường gọi, schema/null, lỗi và private-input boundary. Harness Luna qua Codex CLI là test adaptation, không chứng minh API đích. Trước khi thử API khác, kiểm tài liệu chính thức và access thực tế; không giả danh provider để vượt identity check hoặc đưa PII/secret vào artifact.

P11 đối chiếu cùng source/facts/history/contract/rubric: baseline Flash-Lite → chỉ đổi Strategist sang Luna (`medium` là baseline Luna đã ghi nhận) → thử thêm Responder/Producer khi cần phân biệt đóng góp. `low` cho hai vai trò sau chỉ là giả thuyết cần xác minh hỗ trợ và đo. Ghi mức reasoning của cả hai bên; dùng đối chứng Flash-Lite phù hợp tác vụ trước khi quy chênh lệch cho model. Không chạy ma trận mọi tổ hợp. Đo hiểu ý, trả lời đủ, giữ mạch, bước tiếp theo, giọng La.na, guard false positive/negative, calls/token, p50/p95 đầu-cuối và chi phí mỗi lượt thành công gồm retry. Không đổi prompt/model/rubric cùng lúc rồi gọi đó là cải thiện riêng model.

Giữ cấu hình đơn giản đã kiểm chứng nếu Luna không cải thiện hoặc thiếu evidence; không thêm model router, framework đa-provider, reviewer online hoặc fallback chain. Giá/quota/đặc tính phải xác minh khi thử, không lấy khẳng định trong chat làm acceptance. Thử provider không chặn các fix code độc lập.

## 4. Thứ tự triển khai

| Chặng | Task | Kết quả |
|---|---|---|
| Bằng chứng/input | P00 → P01; P02 theo sản phẩm thử | Phân loại lỗi đúng; cart/variant/source tới đúng nơi |
| Wording/guard nhỏ | P03 → P04; P05 có thể làm độc lập | Phương án được kiểm chứng, câu cuối runtime hữu ích |
| Hành trình bán hàng | P05 quan sát → P06 sửa intent/routing/context cùng lượt → P07; P08 mở capability | Hiểu ý định thật, tư vấn, mua/checkout giữ state |
| Độ bền hội thoại | P09, P10 | Giữ context qua window/recovery, lỗi không làm lệch nhiệm vụ |
| Đánh giá/bàn giao | P11 → P12 | Luna DEV70 + runtime, full history, scores/residual, draft PR |

Đường đầu: **P00 → P01 → P03 → P04**; P02/P05 không phải chờ guard xong. Dùng Luna sớm sau một lát nhỏ chạy được. Không cần agent song song hoặc một PR cho mỗi task.

### Đối chiếu trùng với PR375

| Nội dung được đề xuất lại | Task đã có / owner chính | Xử lý trong PR378 |
|---|---|---|
| Audit baseline và kiểm chứng cuối | P00 / P11–P12 | Audit đầu vào khác acceptance cuối; sửa trạng thái cũ, không làm lại phần đã đủ evidence |
| Cart/source/variant và sửa giỏ | P01 / P06 | P01 xác minh dữ liệu; P06 xử lý ý định/mutation; thêm CHANGE kèm mua và mua kèm hỏi policy vào P06 |
| Guard, câu hỏi nhiều phần, fallback | P03 → P04 / P10 | Thử phạm vi → tích hợp coverage → giữ coverage khi lỗi; không dựng ba verifier |
| Harness, quyết định runtime, quality | P05 / P06 / P11 | Quan sát → đúng hành vi → chấm hành trình; tái dùng harness, không thêm gate mỗi finding |
| Context cùng lượt và hội thoại dài | P06 / P09 | Một updater; P09 kéo dài qua window, không triển khai updater thứ hai |
| Phản đối, tìm mẫu, so sánh | P07 / P08 | P07 chọn cách giúp khách; P08 thực hiện retrieval/derivation; không dùng prompt thay capability thiếu |
| Chuyển model | P05 / P11 | Bổ sung kiểm chứng provider và đối chiếu theo vai trò; không thêm P13/roadmap migration |

Hai mục chấm cùng bundle e76a9667 trong todo được gộp; nguồn DEV70 92612ad lặp ở mục 10 được gộp, giữ nguồn/lịch sử. Các giao điểm task trên là phân công, không phải lý do xóa acceptance khác nhau.

Không thêm store, taxonomy/state machine, bank câu, public schema, service observability hoặc lớp điều phối vì nhu cầu giả định. `pendingQuestion`/`unansweredParts` là khái niệm, không phải field bắt buộc: dùng task/session hiện có trước; chỉ amendment tối thiểu khi test chứng minh thiếu biểu diễn, giữ sáu trường Strategist.

## 5. Task chi tiết

Quy mô S: 1–2 file chức năng; M: khoảng 3–5. Files là điểm bắt đầu, không bắt sửa tất cả. Task vượt nhiều boundary phải chia thành hành vi chạy trọn vẹn; không bàn giao interface rồi để integration vô thời hạn.

### P00 — Phân loại evidence và khóa baseline

**Phụ thuộc:** không. **Quy mô:** S. **Kế thừa:** T00/T01/T15.

- Khóa exact head PR377; tách finding từ code với lỗi tái hiện runtime. Đọc nguyên nhân CI full regression thất bại tại 7576e6ec trước khi gọi baseline đạt; không quy lỗi cho prompt hoặc né CI bằng đổi base PR kế hoạch. PR378 không sửa CI/code.
- Đối chiếu đủ 70 cases: request, raw outputs, task/evidence, detailed guard reason, actual reply nếu có. Fail phân loại input/contract, model, guard false positive, capability, provider; completed cases vẫn kiểm tra false negative và chất lượng.
- Pin source/build/benchmark/rubric/model; kiểm tra admission/stage cardinality và tương thích goal với stage judge. Mismatch phải có amendment/version mapping; không sửa rubric sau khi thấy điểm.
- Giữ raw runs; thêm findings vào evidence hiện có. Sửa chẩn đoán Q035/Q063 trong addendum dẫn raw output, không ghi đè lịch sử.
- Dùng bảng đối chiếu comment làm đầu vào, phân biệt reproduced ở hàm/evaluator, source-only và kết luận đã hiệu chỉnh. Sửa ví dụ handoff #7, hệ quả mở giỏ #8 và cách gọi M→L “RED”; không coi mọi finding là full-runtime failure hoặc đã đóng. Review này không thay phần audit guard/data chưa được comment kiểm tra.

**Nghiệm thu/kiểm chứng:** mỗi họ lỗi có replay/trace; missing input không chấm thành lỗi model; UNKNOWN được giữ. Replay full output cho họ bị ảnh hưởng, ghi rõ nếu chỉ replay một slot.

**Files:** evidence report; benchmark runner diagnostics/test nếu mất reason; quality adapter tests. Không đổi hành vi guard trong task này.

### P01 — Current-cart và variant input

**Phụ thuộc:** P00. **Quy mô:** M, tách cart/variant nếu cần. **Kế thừa:** T01/T04/T06.

- Cart từ snapshot/readback độc lập, khớp ID/revision/policy; không dựng cart từ chính claim cần xác minh. Q024 thiếu snapshot là input gap.
- Variant label từ mapping POS/catalog, không đoán từ chuỗi ID. Stock phải gắn đúng product/color/size; thiếu mapping không biến thành phủ định stock.
- Fixture chẩn đoán có version riêng trước; frozen DEV70 giữ nguyên. Amendment bundle phải version/mapping và giữ run cũ; production reachability chỉ nâng khi runtime có capability thật.

**Nghiệm thu:** input hợp lệ trả lời được; stale/mismatch/missing phân loại đúng; không lộ ID giỏ/metadata. **Kiểm chứng:** positive/negative pairs đổi revision/product/color/size độc lập, chạy producer→compiler→final output.

**Files:** materialization/adapter tests; canonical input/selectable evidence/egress tests.

### P02 — Catalog tới canonical evidence

**Phụ thuộc:** P00; giới hạn sản phẩm của hành trình đầu. **Quy mô:** M. **Kế thừa:** T06/T07.

- Tái dùng catalog/Sheets, xác minh authority từng trường. AUTO_OK/NEED_REVIEW không tự đồng nghĩa APPROVED cho mọi field.
- Chạy producer→index readback→runtime adapter trong local/isolated với dữ liệu được phép dùng; không ghi index live hoặc yêu cầu nhập lại catalog.
- Ghi coverage/mẫu số: thuộc tính liên quan, size chart, policy, ETA theo địa bàn. Không suy chống nhăn/độ bền từ tên vải hoặc thời gian nhận từ thời gian chuẩn bị.

**Nghiệm thu:** trường có nguồn tới đúng selectable evidence; unknown không thành fact; source chưa truy cập được báo riêng. **Kiểm chứng:** round-trip nguồn→payload→readback→C3 cho đủ/thiếu trường, không mock sẵn ProductFacts cả đường.

**Files:** P2.3 producer/adapter tests; catalog evidence report thêm kết quả có ngày, giữ số liệu cũ.

### P03 — Thử nghiệm thiết kế realization/guard hữu hạn

**Phụ thuộc:** P00/P01; P02 cho thuộc tính thực. **Quy mô:** M. **Kế thừa:** T12a.

- Bảng PRICE/STOCK/FIT/ETA/POLICY/ATTRIBUTES/EFFECT: invariant, authority, editorial được mở, phần không chứng minh được. Nhãn do model khai không được miễn guard.
- So baseline với candidate bounded editorial: thay lịch sự/trật tự và các biến thể đổi phủ định/chủ thể/điều kiện/cam kết dù vẫn giữ số. Thử goal-fact bypass, dẫn lời khách, compound request và instruction-like dialogue.
- Chọn phạm vi từ kết quả: false positive đã tái hiện được loại, negative controls vẫn bị chặn. Nhóm chưa có verifier đáng tin giữ giới hạn, công khai residual.

**Nghiệm thu:** amendment nêu thuật toán/check thực tế cho phạm vi chọn, có code probe và kết quả hai chiều. “Thêm regex sau” hoặc “gắn claimId là đủ” không đạt.

**Kiểm chứng/files:** replay trước/sau; Luna trên lát runtime nhỏ khi P05 sẵn sàng; spec C3 + contract runner/projection egress tests/helpers. Không bật live.

**Điểm rẽ:** nếu các candidate đủ tự nhiên vẫn bỏ lọt nghĩa thương mại, báo hạn chế và hai phương án về quyền diễn đạt/semantic verification có tradeoff. Data/checkout tiếp tục độc lập; wording chưa đóng. Không mở vòng nghiên cứu/model online vô hạn.

### P04 — Tích hợp Responder và guard đã được chứng minh

**Phụ thuộc:** P03. **Quy mô:** M từng nhóm fact. **Kế thừa:** T12a/T12b/T13.

- Task thống nhất: customer need, selected facts có subject/conditions, unresolved parts, một progression, kết quả nghiệp vụ được phép công bố. Reuse contracts; goal/history không cấp shop authority.
- Câu hỏi ghép phải giữ phần chưa có evidence dù một proposition là SUPPORTED và `unrealizedEvidence=[]`. Kiểm giá + chống nhăn: trả lời giá, nêu đúng phần chưa biết. Ưu tiên task hiện có; chỉ thêm biểu diễn tối thiểu khi test chứng minh cần, không mặc định mở rộng sáu trường Strategist. P10 tái dùng coverage khi recovery.
- Mở wording và thứ tự tổ chức lời ở nhóm P03 chứng minh; giữ first-contact. Không thêm ngân hàng câu chê giá/ghi nhận/CTA.
- Chỉ bỏ classifier trùng khi boundary tương ứng có kiểm tra thay thế; không bypass free prose vì có claim refs. Giữ PII/effect/cart/freshness; kiểm tra cả câu cuối để thấy lặp/mâu thuẫn.

**Nghiệm thu:** uncertainty fit/stock/ETA hợp lệ được giữ trong phạm vi sửa; goal không thành evidence; harmful variants vẫn bị chặn; first-contact không mất form/facts.

**Kiểm chứng/files:** focused contract/egress tests và runtime compound question; contract runner, realization/style/projection + tests, chia theo nhóm nhỏ.

### P05 — Harness model thật và đường gọi từ server

**Phụ thuộc:** P00. **Quy mô:** M. **Kế thừa:** T01/T15.

- Tái dùng harness PR377 đã gọi producer/C3 thật qua test adapter; hoàn thiện coverage/đường API cần thử theo mục 3, không dựng harness thứ hai. Giữ scripted mode cho test deterministic, gắn nhãn rõ.
- Fake external ports, local state; không seed committed intent/checkout đủ trong lượt chứng minh model hiểu. Reuse COMMERCE admission/fence/policy helpers, không bypass preflight.
- Ghi mọi call/prompt/schema/output/error, before/after state, task/evidence, detailed guard reason và actual accepted reply. Synthetic raw history ngoài repo; bản commit redact, không lộ secret/PII.
- Kiểm tra server config → C3 admission/invocation → quan sát candidate ở DRY_RUN, với fake external ports. PR377 đã tách candidate khỏi outbound selection; kiểm đúng đường compose và giữ candidate diagnostics, không bật LIVE để vượt mismatch. Phân biệt candidate, reply được chọn và send; C3-off/no-call/human-owner paths vẫn có controls.

**Nghiệm thu:** trên nhánh được gọi, tin khách qua producer model thật, output được consumer hiện tại nhận; trace ghi đầy đủ input/output/state/calls và lý do nhánh không gọi. Runtime trace từ server composition chứng minh DRY_RUN gọi/ghi nhận candidate và không gửi thật. Hỏi/chọn/phủ định có thể còn sai ở baseline nếu lỗi được tái hiện và ghi đúng; sửa quyết định là acceptance P06, chất lượng tích hợp là P11. P05 không phụ thuộc P06 pass. LIVE + fake ports trong harness không thay bằng chứng server composition; không mặc định mỗi lượt hai calls/cart read.

**Kiểm chứng/files:** focused server config/runner tests cho wiring; Luna sớm trên no-cart→commitment→checkout; `realtime-server.ts`, `realtime-runner.ts`, `track-c-c3-luna-runtime-smoke.test.ts`, provider/schema adapter hiện có. Không thêm eval framework.

### P06 — Một owner trên hành trình một sản phẩm

**Phụ thuộc:** P01/P05; P04 cho wording được mở. **Quy mô:** M theo nhánh. **Kế thừa:** T02–T05/T11a.

- Đưa typed input lên trước `isPostSaleRequest`/`conversationEvent`, quyết định giữ/loại current product trong `resolveProducts` và cập nhật rejected/session context trên nhánh chuyển. Các consumer này dùng kết quả đã validate thay trigger cũ; trusted ownership/no-call preflight vẫn đi trước. Proposal/legacy không chọn lại next step; mutation vẫn từ kernel/source-bound input. Ghi các nhánh chưa chuyển để không tuyên bố full coverage.
- Bind/cập nhật budget, preference, correction và rejected product hợp lệ trước khi dựng structured context cho Strategist và consumer hội thoại còn dùng trên phạm vi sửa. Extraction đọc snapshot trước lượt + tin mới; context cho quyết định tiếp theo đọc bản sau update đã validate. Không để legacy đọc summary cũ còn C3 đọc bản mới; “Bộ LN123” không được tạo rejection. Differential C3-off cho timing thay đổi, ghi deviation theo compatibility hiện hành.
- Nối producer sửa variant tới `SET_LINE_VARIANT` hiện có, xác minh đúng dòng/thuộc tính/giá trị/source/current revision rồi reprice/revalidate. Nhận xét “thấy size L” không sửa giỏ; yêu cầu đổi sang L phải sửa được. Câu chọn M + hỏi S giữ lựa chọn M và câu hỏi S; dấu hỏi/phủ định ở một mệnh đề không xóa ý hợp lệ ở mệnh đề khác.
- No-cart: chọn size chưa phải mua; commitment mở đúng một giỏ; đổi size reprice/invalidate preview; hỏi payment không tự chọn; checkout hỏi đúng phần thiếu.
- Reproduce hai rủi ro source: `variant.CHANGE` hạ buying intent về NONE; policy branch bỏ qua sales cycle. Khi đủ binding/terms, “đổi sang L, lấy luôn một chiếc” phải giữ ý mua độc lập; mua kèm hỏi kiểm hàng giữ cả hai ý. Đối chứng: chỉ sửa size không mở giỏ, “500k thì lấy” không cam kết ở giá shop; điều kiện mua chưa giải quyết thì không tự mutation. Kiểm final reply và state, không chỉ JSON; không bỏ guard để làm ca dương pass.
- Capture checkout tại boundary riêng tư, phân biệt tên người nhận với nhãn trường/người được nhắc tới; lựa chọn COD không bị địa chỉ Hội An làm mất. Không khôi phục nguyên trạng model fallback cũ chỉ vì có enum/confidence/span; không để parser tên không nhãn ưu tiên ghi đè role evidence đã xác minh.
- State cập nhật hợp lệ trước compile; atomic commit/receipt xác định lời công bố. Giữ human owner, no-call preflight và group delivery safety; thay quyết định ngữ nghĩa phủ định handoff theo mệnh đề/đối tượng. Yêu cầu gặp nhân viên khác vẫn có hiệu lực dù từ chối người cũ; giỏ mở không loại yêu cầu hoàn tiền cho hàng đã nhận. Không đưa model vào đường đã xác định human ownership chỉ để phân loại lại.

**Nghiệm thu:** trace chứng minh extraction trước quyết định routing/search/context ngữ nghĩa và có một owner hội thoại. Correction/budget/rejection cùng lượt xuất hiện đúng trong state và prompt thực tế trước P07; không chỉ có trong raw history. Kiểm cả cho phép đúng và chặn nhầm: nhận xét/đổi size, hỏi/chọn payment, recipient/field label, người cũ/người mới, màu/mẫu và bộ/bỏ. Nhánh human-owned không gọi model; duplicate/old preview/ambiguous confirm không effect sai.

**Kiểm chứng/files:** model runtime thật + sales/intent regressions; DB integration nếu chạm CAS/commit/history. Runner, canonical evidence/input, sales cycle và tests; chia extraction/orchestration/cart khi cần. Differential với r31.3/r32.2, ghi deviation mới vào spec/evidence.

### P07 — Băn khoăn và giọng La.na

**Phụ thuộc:** P02/P04/P05/P06 trên nhánh đầu. **Quy mô:** M. **Kế thừa:** T12b.

- Phân biệt thiếu tiêu chí khách với thiếu shop evidence; hỏi một điều làm thay đổi tư vấn. Không hỏi lại budget/số đo hoặc mặc định ACK+KEEP_OPEN cho mọi phản đối.
- Chọn thuộc tính đúng băn khoăn và sở thích đã biết, không suy ưu thế/đáng tiền. Không có bước hữu ích thì kết thúc tự nhiên; khách đồng ý thì chuyển đúng nghiệp vụ.
- Responder không bắt buộc empathy opener, recap lịch sử, CTA hoặc Dạ/ạ từng đoạn; đánh giá lời hoàn chỉnh.
- Khách bổ sung/sửa mã cho câu hỏi đang dở: Strategist tiếp tục trả lời trên binding mới, không chỉ ACKNOWLEDGE; P09 giữ nhu cầu đó qua window. Tinh gọn prompt tại `track-c-c3-prompts.ts` theo mục tiêu từng vai trò; kiểm request/câu trả lời thực, không chỉ test có chứa câu chỉ dẫn.
- First-contact đã biết màu/số đo: kiểm chống hỏi lại. Spec hiện yêu cầu đúng một progression; khi không còn input hữu ích, ghi và duyệt amendment tối thiểu trước khi thay policy. Không âm thầm bỏ form/đổi lane hoặc ép câu hỏi vô ích.

**Nghiệm thu:** budget/comparison/prior experience/fit có phần được giải quyết hoặc hỏi hữu ích; không reset discovery; giọng tự nhiên không đo bằng đếm tiểu từ.

**Kiểm chứng/files:** cùng facts nhiều cách hỏi, known/unknown criterion, corrected preferences, objection xen checkout; không golden reply. Runner instructions/tests và runtime journeys/evidence.

### P08 — Tìm phương án và so sánh

**Phụ thuộc:** P01/P02/P06; chốt retrieval contract trước consumer. **Quy mô:** hai lát M. **Kế thừa:** T08/T11b.

- P08a dùng search hiện có cho yêu cầu tìm mẫu theo budget/tiêu chí; loại current/rejected products; verify giá/tồn. No result được nói thật; “giá cao” không tự là lệnh tìm hàng/giảm giá.
- Dùng intent/binding/rejected context cùng lượt từ P06 để phân biệt đổi màu với tìm mẫu khác trước khi loại current product. Không tái phân loại “màu/mẫu” hoặc “bộ/bỏ” bằng regex tại search; mở rộng kiểm chứng sang retrieval nhiều phương án/no-result, không dừng ở classifier.
- P08b bind mỗi evidence theo subject; code tính ordering/difference từ cùng offer/unit/currency. Thuộc tính/policy cần evidence riêng; rẻ hơn không suy tốt hơn.
- Lookup request/result tái dùng boundary hiện có; nếu cần enum/envelope mới có amendment tối thiểu, không nhét vào goal. Resolve hữu hạn và chọn lại sau kết quả nếu cần.

**Nghiệm thu:** lựa chọn có căn cứ hoặc no-result; comparison đúng thuộc tính; chọn sản phẩm khác cập nhật cart/fit binding.

**Kiểm chứng/files:** known/unknown budget, rejected items, no stock, khác offer, giá đổi; runtime lookup→reply. Search/tests, realtime integration, comparison derivation/evidence/guard tests.

### P09 — Mạch hội thoại và sửa ý

**Phụ thuộc:** P06/P07; P08 cho multi-product. **Quy mô:** M. **Kế thừa:** T09/T10.

- Reuse profile/session/history; giữ preference/correction, câu hỏi đang dở và tiêu chí/lý do băn khoăn thực sự làm thay đổi tư vấn. Kiểm cùng nhu cầu trước/sau khi rơi khỏi cửa sổ 14–15 message hiện tại; tăng context model không thay việc cấp thiếu input. Không thêm durable state nếu fields/history hiện có đủ.
- Tách customer report khỏi shop facts; referent theo binding. Sửa nhu cầu vô hiệu dữ liệu phụ thuộc, giữ facts độc lập.
- Tái dùng cơ chế update context cùng lượt đã nghiệm thu ở P06; kiểm tra correction/referent khi vượt window, xen chủ đề và nhiều sản phẩm. Không trì hoãn sửa timing cơ bản đến task này hoặc dựng updater thứ hai.
- Bảo toàn accepted Outbox recovery; pending/failed send không được coi bot đã nói, không resend để sửa history.
- Differential C3-off cho canonical history recovery; timing cùng lượt đã thuộc P06. Ghi thay đổi có chủ đích theo compatibility/deviation hiện hành, không rollback recovery hữu ích chỉ vì khác baseline. Đo phần chi phí recovery khi đường đọc bị thay đổi; không tạo thêm history store hoặc gate.

**Nghiệm thu:** không hỏi lại dữ kiện còn hợp lệ; correction/referent đúng; mất Redis projection không gây gửi trùng trong đường đã hỗ trợ.

**Kiểm chứng/files:** vượt window, xen chủ đề, hai sản phẩm, sửa budget/size/payment, history fault; session/profile/history producer/tests. Không sửa lại DB recovery nếu không có regression.

### P10 — Fallback giữ nhu cầu và facts

**Phụ thuộc:** P04/P06; mở rộng cùng P08/P09. **Quy mô:** M. **Kế thừa:** T13.

- Inject lỗi Strategist/Responder/guard/lookup/commit riêng. Giữ verified facts/effects theo compatibility, tránh baseline giá/CTA lạc đề. Xung đột bảo toàn baseline với mục tiêu hiện tại phải giải quyết trong spec deviation/test, không tự bỏ facts/media.
- Lỗi một phần không xóa câu trả lời độc lập; capability thiếu được nêu cụ thể. Không fallback riêng cho từng case hoặc repair loop vô hạn.
- Tái hiện recovery câu hỏi ghép từ P04: facts-only không làm mất giới hạn chưa biết của câu giá + chống nhăn. `unrealizedEvidence=[]` không chứng nhận coverage; chưa bảo toàn được phần thiếu thì không dùng recovery đó. Giữ selected facts độc lập/diagnostic gốc, không đổi nghĩa hoặc mở quyền model.
- Reuse telemetry: data gap/model error/guard block/final fallback, sanitized detailed reason, calls/token/latency; không budget/observability service mới.

**Nghiệm thu:** không effect sai; không generic ACK thay toàn câu khi facts còn đủ; malformed model không FAILED_PERMANENT; no-call owner paths giữ nguyên.

**Kiểm chứng/files:** fault injection và actual final reply/state; runner error handling/readiness/contract diagnostics tests, telemetry mapping nếu cần.

### P11 — Luna DEV70 và review toàn bộ hành trình

**Phụ thuộc:** P01–P10 trong scope candidate. **Quy mô:** M, execution/evidence. **Kế thừa:** T15.

- Đối chiếu model hữu hạn theo mục 3 sau khi P05 xác minh đường gọi; ghi từng vai trò, final accepted reply và chi phí/latency thật. Không thay acceptance Luna bằng bảng so model hoặc suy conversion từ synthetic.
- Frozen DEV70 đúng revision, gpt-6-luna/effort ghi rõ (baseline medium); giữ mọi case/error/retry/stage. Diagnostic fixtures báo riêng. Amendment bundle có identity/mapping; không gọi khác bundle là cải thiện model thuần túy.
- Chấm theo rubric/stage judge hiện có; COMPLETED_NOT_JUDGED không nâng PASS. Đọc cả 70 lịch sử, accepted/rejected và final reply; mỗi họ lỗi còn lại có nguyên nhân, không chỉ label.
- Runtime full-intent giữ state trên họ mục 7 và wording ngoài DEV70. Lượt khách phân nhánh theo vấn đề được giải quyết, không luôn tự mua; scripted branches vẫn không phải chứng minh conversion khách thật.
- Regression deterministic chứng minh boundary parser/state/wiring; Luna kiểm chứng hành trình hiểu ý định và bán hàng tích hợp. Không ép một lần gọi Luna riêng cho từng finding; một câu Luna đúng cũng không thay controls. Giữ khác biệt planned state, synthetic commit, external receipt và live effect trong báo cáo.

**Nghiệm thu:** scores/errors/history truy về source; compiler simulation không thay commerce evidence; đạt mục 8 hoặc báo chưa đạt/blocker.

**Kiểm chứng/files:** build/import target/model calls/identities; existing eval/harness + evidence. Không mở holdout để tune. Nội dung holdout đã vô tình thấy không gọi là blind; dùng registered holdout còn sạch theo cơ chế sẵn có nếu cần, thiếu thì báo. Không đổi rubric sau nhìn điểm.

### P12 — Self-review, spec và draft PR

**Phụ thuộc:** P11, source tích hợp. **Quy mô:** S.

- Đối chiếu diff/spec/invariants/P00; cập nhật capability và coverage thật, không đóng task từ schema hoặc mock-only pass.
- Source cuối có focused/full verification theo risk, CI theo process hiện hành. Evidence commit sau source cần mapping tree tương đương; code đổi tiếp rerun phần ảnh hưởng.
- Tạo/cập nhật draft PR trên nhánh phù hợp; mô tả evidence/residual/complexity delta. Giữ ancestry PR371; mỗi PR có lát chạy trọn vẹn, không chuỗi PR chỉ mở đường.

**Nghiệm thu/kiểm chứng:** code/spec/tests/evidence/PR đúng source, residual đọc được, diff self-review và required CI; không merge/deploy/live. Independent reviewer không là gate mặc định.

## 6. Kiểm chứng theo ranh giới

Lệnh hiện có, dùng từ repo root sau thay đổi tương ứng:

```powershell
pnpm --filter @lana/worker exec vitest run src/track-c-c3-strategy-contract-runner.test.ts src/track-c-c3-projection-egress.test.ts
pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/realtime-runner.test.ts
pnpm --filter @lana/business-tools exec vitest run src/size-claim-guard.test.ts src/business-tools.test.ts
pnpm --filter @lana/worker benchmark:c2:validate
pnpm --config.enable-pre-post-scripts=false -r build
pnpm --config.enable-pre-post-scripts=false -r --no-bail test
```

Focused `exec vitest` không tự build dependencies; build package/dependencies liên quan trước nếu source đổi. Không chạy toàn workspace sau mỗi sửa tài liệu. Full build/test cho candidate tích hợp; DB integration khi transaction/history/CAS bị ảnh hưởng. Required CI/secret/data checks theo repo vẫn giữ.

Ví dụ từ comment là seeds cho cặp positive/negative theo invariant; biến đổi mệnh đề, thứ tự, dấu, đối tượng và trạng thái giỏ độc lập. Không thêm route theo câu/case ID, template, gate hoặc durable state để làm các seed xanh. Chỉ chạy lại tầng bị ảnh hưởng rồi nghiệm thu hành trình tích hợp.

Runtime opt-in hiện dùng `LUNA_REALTIME_SMOKE=1`, `LUNA_REALTIME_SMOKE_ARTIFACT_DIR` tuyệt đối ngoài repo và `LUNA_REALTIME_SMOKE_JOURNEY_IDS` cho debug. PR377 đã có run gọi producer thật qua test adapter; flag đơn thuần không chứng minh full-intent hoặc mọi đường đều được gọi. P05 ghi mode/provider/calls trong artifact; P11 kiểm chất lượng tích hợp đúng source. Không ghi credentials vào lệnh/tài liệu.

## 7. Hành trình bắt buộc

| Họ | Trường hợp | Chứng minh |
|---|---|---|
| First contact | Ad/organic metadata, thiếu binding | Quote đúng form, không suy acquisition từ câu chữ |
| Chê giá | Lý do chưa rõ, budget đã biết, đối thủ, trải nghiệm cũ | Giải quyết rào cản hoặc hỏi hữu ích |
| Fit | Thiếu/đủ số đo, không chart, nhắc size chưa chọn | Đúng authority, không hỏi lại hoặc nhầm uncertainty |
| Stock | Đúng màu/size, thiếu mapping, hết hàng | Scope và giới hạn đúng |
| Giao hàng | Địa bàn có/thiếu, dispatch khác ETA, deadline | Không biến dự kiến thành cam kết |
| Tìm/so sánh | Budget, rejected item, nhiều offer, no result | Lookup thật, subject/derivation đúng |
| Mua/checkout | No-cart, chọn chưa mua, mua rõ, đổi size, hỏi/chọn payment, nhập tự nhiên | Transitions/source/fields/preview/confirm đúng |
| Ý định nhiều mệnh đề | Chọn M + hỏi S; nhận xét size; tên địa bàn + chọn COD; nhãn trường + dữ liệu người nhận | Giữ ý hợp lệ, đúng subject/role; không mutation từ token cuối hoặc chữ bỏ dấu |
| Handoff/hậu mãi | Từ chối người cũ + yêu cầu người khác; lỗi hàng/hoàn tiền khi có giỏ mở | Phạm vi phủ định đúng, không kéo khách vào pre-sale sai; human-owner no-call giữ nguyên |
| Nhớ/sửa ý | Đổi budget/size/mẫu, referent, vượt window | Context không reset, dữ liệu phụ thuộc cập nhật |
| Sự cố | Model/guard/lookup/history error, duplicate/stale preview | Fallback đúng, no duplicate effect |

Đổi wording, thứ tự và facts độc lập; positive/negative controls; không route/prompt theo case ID. Tình huống ngoài DEV70 định nghĩa từ invariant trước output candidate. Không thêm hàng chục case chỉ để tăng số lượng nếu không bảo vệ boundary mới.

## 8. Điều kiện hoàn thành và mức smoke

### Nghiệp vụ

Không invented fact/benefit, effect ngoài quyền, checkout sai nguồn, stale cart/preview hoặc duplicate effect trong bộ đã chạy. False positive và false negative đều là defect; fail-closed không miễn đánh giá chặn nhầm.

### Chất lượng

- Rubric 0–4; weighted threshold BEHAVIOR_SIMULATION 3, PRODUCTION_CONTRACT 3,2.
- QUESTION_RESOLUTION/FACT_GROUNDING ít nhất 3; floor khác/domain/stage overrides áp đúng file. Production grounding 4; nhiều domain cũng yêu cầu 4.
- Hard failure làm FAIL; mọi stage bắt buộc phải đạt. Expected stale reject zero generator calls. ADAPTER/PROVIDER/JUDGE_ERROR và CONTRACT_SKIP không phải pass.
- Frozen DEV gate: mọi regression bắt buộc đạt PASS/PASS_WITH_NOTE hoặc expected reject. Input gap phải xử lý đúng contract/version, không loại mẫu để công bố green.
- **Mục tiêu đề xuất cho runtime sales smoke:** QUESTION_RESOLUTION, CONTEXT_USE, NEXT_MOVE_QUALITY, NATURALNESS_LANA ≥3 ở lượt áp dụng; không hard failure, grounding 4 ở domain bắt buộc. Chốt trước run, không sửa rubric frozen.

Review phải chỉ rõ khách được giúp quyết định ở đâu, bước tiếp theo có ích vì sao hoặc vì sao không hỏi thêm là đúng. Điểm trung bình không che nhánh checkout sai/bế tắc. Internal PURCHASE_CONFIRMED chưa phải đơn POS hoặc doanh thu.

**Bàn giao đạt:** code/spec/evidence đủ scope và ngưỡng; có thể đề nghị smoke có kiểm soát. Đề nghị không tự cấp quyền traffic/test page.

**Bàn giao chưa đạt:** phần đã sửa + blocker/residual; task liên quan còn mở. Không đổi nhãn thành sẵn sàng để kết thúc.

## 9. Rủi ro và điểm rẽ

| Rủi ro | Xử lý |
|---|---|
| Editorial đổi nghĩa dù số đúng | P03 hai chiều; chỉ mở nhóm chứng minh, residual nhóm khác |
| Không chứng minh toàn bộ free prose | Công khai giới hạn; lựa chọn kiến trúc dựa evidence, không thêm regex vô hạn |
| Span thật nhưng intent/recipient sai | Test role/negation/referent/state, ambiguity hỏi đúng phần thiếu |
| Bỏ proposal mất extraction | P05/P06 chứng minh trước, báo calls thật |
| Sheets có nhưng runtime thiếu | P02 readback isolated, không publish live |
| Full-intent chạm PII/effects | Synthetic/private capture/fake ports, raw owner-local |
| Guard fail làm lặp baseline | P10 kiểm actual final reply và partial success |
| Benchmark mismatch | Version/amendment có mapping, không sửa ngầm hoặc tự chấm pass |
| Quota/provider/judge unavailable | Báo evidence thiếu; tiếp tục code độc lập được |
| Phình kiến trúc | Reuse boundary; mỗi thay đổi nêu invariant hiện tại và phần đơn giản hóa |

Không hứa số phiên trước P03/P06. Ước lượng lại sau thử nghiệm nhỏ; báo tiến độ bằng hành trình đã chứng minh.

## 10. Nguồn để bắt đầu

- [Đối chiếu comment 5847545097](evidence/c3-plan-review-comment-5847545097.md): findings đã hiệu chỉnh, source anchors, phạm vi probes và mapping tới task; không phải acceptance implementation.
- [DEV70 review lịch sử](evidence/c3-luna-dev70-92612ad-report.md) và [full history](evidence/c3-luna-dev70-92612ad-full-history.md); raw owner-local `../../LUNA6_DEV70_C3_92612ad_20260926T033240Z/case-records.json`. Focused guard/cart replay ngoài repo; kết quả tóm tắt trong evidence/P00, không coi path workstation là artifact đã đọc.
- Audit 24/09 ở owner-local `LANCHATBOT_INDEPENDENT_AUDIT_20260924/AUDIT.md`: kiến trúc/probes, không chứng nhận bao phủ mọi guard error; không có bản audit này trong PR.
- [Runtime 9 journeys](evidence/c3-luna-stateful-runtime-baff6a5-report.md), [checkout retest](evidence/c3-luna-stateful-runtime-8cd20ab-checkout-history.md).
- [Catalog lịch sử](evidence/catalog-field-path-20260925.md), [owner/source map](t00-source-map.md), [F01–F10 status](evidence/c3-f01-f10-status-20260926.md).
- [Spec C3](../docs/specs/track-c-c3-strategy-contract.md), [rubric](../apps/worker/evals/track-c-c2/v2/rubric.json).

## 11. Self-review bản kế hoạch này

Self-review PR378 do cùng một agent thực hiện, không phải independent review. Đã sửa: trạng thái chưa-implementation lỗi thời; kết quả chấm/nguồn trùng; nguy cơ tạo roadmap mới từ P00–P12; mặc định thêm schema/store; xung đột first-contact luôn hỏi với input đã biết. Luna là thử nghiệm theo vai trò, không quyền đổi provider live.

Phạm vi kiểm chứng tài liệu: chỉ hai Markdown; giữ P00–P12/dependencies/ngưỡng mục 8 và commands; không tick implementation mới hoặc thay spec hành vi. Kết quả kiểm tra và exact-head readback ghi trong PR378. Application tests, model A/B và sửa CI source PR377 chưa thực hiện trong amendment này. Owner review kế hoạch trước khi fix.

Kết luận self-review PR375 được bảo toàn bên dưới, không phải lần chạy mới:

- Bảo toàn capability/invariants đã đúng; thay trigger ngữ nghĩa sai. Checkbox cũ chưa tick không bị coi là chưa có code; positive M→L không chứng minh negative/full-intent coverage.
- Guard là thử nghiệm hữu hạn có đầu ra/điểm rẽ; không hứa semantics bằng typed data/claim annotations.
- Full-intent model khác với mock proposal giữ state; nguồn customer-script mua không được gọi bằng chứng thuyết phục.
- Source, fixture và runtime authority không bị đánh đồng; frozen rubric không đổi để làm đẹp điểm.
- First-contact/private PII/human owner/CAS/Outbox/compatibility/live scope được giữ rõ.
- Task có phụ thuộc, nơi sửa, nghiệm thu, kiểm chứng; ngưỡng runtime là đề xuất, khác rubric frozen.
- Self-review `d36f213`: ba khoảng trống về thứ tự routing/extraction, acceptance P05/P06 và ownership context P06/P09 đã sửa trong tài liệu này. P05 chứng minh khả năng quan sát, P06 chứng minh quyết định/context đúng, P09 chứng minh độ bền lịch sử; chưa phải code đã đạt các acceptance đó.
- Không thêm approval/gate/operator hoặc online reviewer mặc định. Đây là self-review tài liệu, chưa có code/model test mới trong lượt lập kế hoạch.
