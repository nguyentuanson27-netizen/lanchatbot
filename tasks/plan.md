# Kế hoạch sửa C3 và năng lực bán hàng — 26/09/2026

**Bản hiện hành. Trạng thái: kế hoạch triển khai; chưa thực hiện P00–P12.** Các sửa đổi đã có được ghi riêng bên dưới. Kế hoạch này thay thế thứ tự triển khai cũ, không tuyên bố thiết kế guard đã được chứng minh. Checklist hiện hành ở [todo.md](todo.md). Review Astra 24/09 là review kế hoạch cũ, không phải review bản này hoặc code hiện tại.

## 1. Mục tiêu, nguồn và giới hạn

Bot phải hiểu quyết định hiện tại của khách, dùng đúng dữ liệu, xử lý băn khoăn, hỏi tiếp có ích, nhớ lựa chọn/sửa ý, thực hiện đúng giỏ/checkout và nói tự nhiên theo giọng La.na. Đánh giá cả câu khách nhận lẫn trạng thái nghiệp vụ.

- Giữ form báo giá lần đầu theo spec; adaptive không bị ép vào chuỗi giá → size → checkout hoặc ngân hàng câu.
- Giữ Strategist chọn việc tư vấn; code sở hữu dữ liệu, phép tính và quyền nghiệp vụ; Responder viết lời theo nhiệm vụ được cấp.
- Tái sử dụng kernel, CAS/fencing, current-cart binding, Inbox/Outbox, history recovery, policy, search, rubric và harness.
- Đánh giá cuối bằng **gpt-6-luna**, lưu toàn bộ lịch sử và model stages. Không âm thầm thay model; thiếu provider/quota/judge phải báo thiếu evidence.
- Bàn giao dự kiến: code + spec + tests/evidence + residual + draft PR đúng HEAD. **Không merge, deploy, bật traffic, gửi khách, ghi dữ liệu live hoặc đổi authority/allowlist.**
- Đây là kiểm chứng local/synthetic; chưa bao gồm thử nghiệm conversion hoặc doanh thu khách thật.

### Baseline đã kiểm tra

| Nguồn | Giá trị |
|---|---|
| Repo/branch | `lanchatbot-c3-runtime-integration` / `codex/c3-runtime-canonical-integration` |
| Local + remote HEAD | `ce558e6d4028dd06bd6efc960286464425a26a85` |
| Remote main | `a28bd12a8b15c4bbf65914c52236adac4ac41594` |
| PR371 | `88a1ce4` đã xác minh là ancestor của HEAD |
| DEV70 mới nhất | source `92612ad182bc4b2540cd741a6278b4ed76928049`; tới HEAD chỉ thêm evidence docs |
| Source fingerprints | Sáu file được run ghi nhận đều khớp hiện tại; không suy thành xác minh mọi artifact |
| Spec C3 SHA-256 | `498fcffb7dbf373274bd932c546c716355503c1383ddec79905d0cff6c7f7ff1` |
| Rubric SHA-256 | `54437743f5e135f123e17c0de5a71fa5061c6eb54782defdd7bb3f70bd4aabf5` |

Yêu cầu người dùng ưu tiên. Spec trực tiếp: `docs/specs/track-c-c3-strategy-contract.md`; invariants: `AGENTS.md`, `docs/current/architecture-program/OPERATING_MODE.md`; compatibility: `docs/current/REALTIME_AGENT_UPGRADE_PLAN.md` và baseline r31.3/r32.2 được repo dẫn chiếu. Tài liệu lịch sử không xác nhận phiên bản live hiện tại.

Kế thừa candidate branch vì người dùng yêu cầu giữ fix đã review; không bắt đầu lại từ main/cherry-pick mù. Đầu lượt implementation kiểm tra HEAD/status/remote; nếu baseline đổi, ghi diff và tái kiểm chứng phần bị ảnh hưởng.

## 2. Hiện trạng: bảo toàn phần đã sửa

| Phần | Đã có | Còn thiếu |
|---|---|---|
| Cart/size/payment | Runtime synthetic mở giỏ, đổi M→L, preview, COD, confirmation; retest payment tại 8cd20ab | Model hiểu ý định đầu luồng đang mock; regression khi chuyển owner |
| Checkout private/binding | Code/test ràng buộc value/evidence và capture trước redaction | Model thật, vai trò recipient, phủ định/correction xuyên lượt |
| History/profile | Accepted Outbox recovery, bounded preference/session context | Câu hỏi đang dở, referent nhiều sản phẩm, hội thoại dài |
| Catalog | Producer và source-path tests; khảo sát 25/09 ghi thiếu typed attributes ở index | Producer→readback→canonical trong môi trường thử nghiệm |
| C3 wording | Có adaptive prose; facts còn khóa câu | Editorial và guard chưa giải quyết trọn vẹn |
| Ownership | C3 sau proposal/SalesCycle, chỉ nhận một số nhánh | Một nơi chọn bước hội thoại trên từng nhánh chuyển |
| Guard | Có replay chặn uncertainty và fact qua goal | Phân loại đầy đủ; sửa dữ liệu/kiểm tra đúng boundary |
| MCP | Allowlist fix f448911 và focused evidence | Giữ nguyên nếu không chạm ranh giới này |

DEV70 hiện là **52 COMPLETED_NOT_JUDGED, 16 fail, 2 expected stale reject**, chưa phải quality passes. Runtime 9 journeys tại baff6a5 và 2 retest tại 8cd20ab không phải toàn bộ chạy trên HEAD mới nhất.

## 3. Thiết kế đích và các quyết định bắt buộc

```text
Admission / human ownership / safety preflight
 → tin khách + history + state + canonical data
 → typed customer input có nguồn; capture PII tại boundary riêng tư
 → lấy dữ kiện liên quan đã xác định được
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
| Khách hỏi/chọn/sửa/từ chối | Typed input producer; span/confidence không tự chứng minh recipient, đối tượng hoặc phủ định |
| Chọn đáp/evidence/progression | Strategist hoặc fixed first-contact policy; một owner trên nhánh chuyển |
| Cart/payment/preview/confirm | Code/kernel; state quyết định gồm cập nhật hợp lệ cùng lượt; recheck revision khi commit |
| Commercial facts | Nguồn có thẩm quyền + code binding/derivation; goal/dialogue không cấp shop authority |
| Lời nói | Responder; không tự đổi strategy/evidence hoặc nhận công effect chưa thành công |
| Công bố effect | Transaction/readback/receipt; internal confirmation không phải receipt tạo đơn POS |

Giữ sáu trường `replyAct`, `goal`, `proposition`, `evidenceRefs`, `continuation`, `canonicalAction`. Goal cần nêu nhu cầu, known customer inputs, giới hạn và lý do bước tiếp theo; không thêm taxonomy/state machine chỉ để chia đoạn văn thành nhiều trường.

Typed intent hiện đến từ proposal call. Phương án đầu: giữ producer cần thiết nhưng bỏ quyền chọn lại chiến lược trên nhánh chuyển. Chỉ hợp nhất extraction với call khác sau khi schema/PII/evidence được chứng minh bằng amendment/test. Không xóa producer để làm đẹp con số hai calls. Hai vai trò hội thoại không đồng nghĩa mọi lượt runtime đúng hai calls.

### Guard và quyền diễn đạt

1. Code kiểm tra giá trị, chủ thể, scope, freshness, current-cart revision, policy, quyền và receipt bằng dữ liệu có cấu trúc.
2. Không dùng việc thêm whitelist “chưa/không/chắc...” làm giải pháp chính. Regex có thể kiểm tra định dạng/mã/token; không gọi đó là chứng minh ngữ nghĩa tiếng Việt.
3. Đúng con số, claim annotations hoặc nhãn uncertainty do model khai đều chưa chứng minh câu tự do đúng nghĩa. Không bỏ output checks rồi coi structured input là bảo đảm output.
4. Mở editorial theo nhóm fact: giữ values/subjects/conditions/negation/modality; so giá do code tính không cho phép suy “đáng tiền hơn”; ETA dự kiến không cho phép hứa kịp hạn.
5. Nhóm chưa chứng minh được output verification thì giữ projection giới hạn cho nhóm đó và báo residual. Không khóa toàn bộ câu adaptive thành template; không hứa kiểm tra tất định mọi câu tự do.
6. Không thêm model reviewer online vào mọi lượt theo mặc định. Nếu thử nghiệm cho thấy cần semantic verifier để đạt phạm vi tự do mong muốn, ghi rõ lựa chọn kiến trúc, sai số, calls và độ trễ; task wording chưa được coi là hoàn thành.

## 4. Thứ tự triển khai

| Chặng | Task | Kết quả |
|---|---|---|
| Bằng chứng/input | P00 → P01; P02 theo sản phẩm thử | Phân loại lỗi đúng; cart/variant/source tới đúng nơi |
| Wording/guard nhỏ | P03 → P04; P05 có thể làm độc lập | Phương án được kiểm chứng, câu cuối runtime hữu ích |
| Hành trình bán hàng | P05 → P06 → P07; P08 mở capability | Hiểu ý định thật, tư vấn, mua/checkout giữ state |
| Độ bền hội thoại | P09, P10 | Sửa ý, dài lượt, lỗi không làm lệch nhiệm vụ |
| Đánh giá/bàn giao | P11 → P12 | Luna DEV70 + runtime, full history, scores/residual, draft PR |

Đường đầu: **P00 → P01 → P03 → P04**; P02/P05 không phải chờ guard xong. Dùng Luna sớm sau một lát nhỏ chạy được. Không cần agent song song hoặc một PR cho mỗi task.

## 5. Task chi tiết

Quy mô S: 1–2 file chức năng; M: khoảng 3–5. Files là điểm bắt đầu, không bắt sửa tất cả. Task vượt nhiều boundary phải chia thành hành vi chạy trọn vẹn; không bàn giao interface rồi để integration vô thời hạn.

### P00 — Phân loại evidence và khóa baseline

**Phụ thuộc:** không. **Quy mô:** S. **Kế thừa:** T00/T01/T15.

- Đối chiếu đủ 70 cases: request, raw outputs, task/evidence, detailed guard reason, actual reply nếu có. Fail phân loại input/contract, model, guard false positive, capability, provider; completed cases vẫn kiểm tra false negative và chất lượng.
- Pin source/build/benchmark/rubric/model; kiểm tra admission/stage cardinality và tương thích goal với stage judge. Mismatch phải có amendment/version mapping; không sửa rubric sau khi thấy điểm.
- Giữ raw runs; thêm findings vào evidence hiện có. Sửa chẩn đoán Q035/Q063 trong addendum dẫn raw output, không ghi đè lịch sử.

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
- Mở wording và thứ tự tổ chức lời ở nhóm P03 chứng minh; giữ first-contact. Không thêm ngân hàng câu chê giá/ghi nhận/CTA.
- Chỉ bỏ classifier trùng khi boundary tương ứng có kiểm tra thay thế; không bypass free prose vì có claim refs. Giữ PII/effect/cart/freshness; kiểm tra cả câu cuối để thấy lặp/mâu thuẫn.

**Nghiệm thu:** uncertainty fit/stock/ETA hợp lệ được giữ trong phạm vi sửa; goal không thành evidence; harmful variants vẫn bị chặn; first-contact không mất form/facts.

**Kiểm chứng/files:** focused contract/egress tests và runtime compound question; contract runner, realization/style/projection + tests, chia theo nhóm nhỏ.

### P05 — Harness với model hiểu ý định thật

**Phụ thuộc:** P00. **Quy mô:** M. **Kế thừa:** T01/T15.

- Mở rộng harness hiện có để thay `synthetic-baseline` bằng transport model thật cho proposal/typed extraction. Giữ scripted mode cho test deterministic, gắn nhãn rõ.
- Fake external ports, local state; không seed committed intent/checkout đủ trong lượt chứng minh model hiểu. Reuse COMMERCE admission/fence/policy helpers, không bypass preflight.
- Ghi mọi call/prompt/schema/output/error, before/after state, task/evidence, detailed guard reason và actual accepted reply. Synthetic raw history ngoài repo; bản commit redact, không lộ secret/PII.

**Nghiệm thu:** tin khách qua intent producer thật; hỏi/chọn/phủ định đổi quyết định đúng; calls không bị báo thành hai khi thực tế nhiều hơn.

**Kiểm chứng/files:** Luna sớm trên no-cart→commitment→checkout; `track-c-c3-luna-runtime-smoke.test.ts`, provider/schema adapter hiện có. Không thêm eval framework.

### P06 — Một owner trên hành trình một sản phẩm

**Phụ thuộc:** P01/P05; P04 cho wording được mở. **Quy mô:** M theo nhánh. **Kế thừa:** T02–T05/T11a.

- Chốt typed intent producer cùng lượt; proposal/legacy không chọn lại next step trên nhánh chuyển. Mutation vẫn từ kernel/source-bound input.
- No-cart: chọn size chưa phải mua; commitment mở đúng một giỏ; đổi size reprice/invalidate preview; hỏi payment không tự chọn; checkout hỏi đúng phần thiếu.
- State cập nhật hợp lệ trước compile; atomic commit/receipt xác định lời công bố. Giữ phủ định handoff, human owner và group delivery safety.

**Nghiệm thu:** trace có một owner hội thoại; correction cập nhật ngay; duplicate/old preview/ambiguous confirm không effect sai.

**Kiểm chứng/files:** model runtime thật + sales/intent regressions; DB integration nếu chạm CAS/commit/history. Runner, canonical evidence/input, sales cycle và tests; chia extraction/orchestration/cart khi cần. Differential với r31.3/r32.2, ghi deviation mới vào spec/evidence.

### P07 — Băn khoăn và giọng La.na

**Phụ thuộc:** P02/P04/P05/P06 trên nhánh đầu. **Quy mô:** M. **Kế thừa:** T12b.

- Phân biệt thiếu tiêu chí khách với thiếu shop evidence; hỏi một điều làm thay đổi tư vấn. Không hỏi lại budget/số đo hoặc mặc định ACK+KEEP_OPEN cho mọi phản đối.
- Chọn thuộc tính đúng băn khoăn và sở thích đã biết, không suy ưu thế/đáng tiền. Không có bước hữu ích thì kết thúc tự nhiên; khách đồng ý thì chuyển đúng nghiệp vụ.
- Responder không bắt buộc empathy opener, recap lịch sử, CTA hoặc Dạ/ạ từng đoạn; đánh giá lời hoàn chỉnh.

**Nghiệm thu:** budget/comparison/prior experience/fit có phần được giải quyết hoặc hỏi hữu ích; không reset discovery; giọng tự nhiên không đo bằng đếm tiểu từ.

**Kiểm chứng/files:** cùng facts nhiều cách hỏi, known/unknown criterion, corrected preferences, objection xen checkout; không golden reply. Runner instructions/tests và runtime journeys/evidence.

### P08 — Tìm phương án và so sánh

**Phụ thuộc:** P01/P02/P06; chốt retrieval contract trước consumer. **Quy mô:** hai lát M. **Kế thừa:** T08/T11b.

- P08a dùng search hiện có cho yêu cầu tìm mẫu theo budget/tiêu chí; loại current/rejected products; verify giá/tồn. No result được nói thật; “giá cao” không tự là lệnh tìm hàng/giảm giá.
- P08b bind mỗi evidence theo subject; code tính ordering/difference từ cùng offer/unit/currency. Thuộc tính/policy cần evidence riêng; rẻ hơn không suy tốt hơn.
- Lookup request/result tái dùng boundary hiện có; nếu cần enum/envelope mới có amendment tối thiểu, không nhét vào goal. Resolve hữu hạn và chọn lại sau kết quả nếu cần.

**Nghiệm thu:** lựa chọn có căn cứ hoặc no-result; comparison đúng thuộc tính; chọn sản phẩm khác cập nhật cart/fit binding.

**Kiểm chứng/files:** known/unknown budget, rejected items, no stock, khác offer, giá đổi; runtime lookup→reply. Search/tests, realtime integration, comparison derivation/evidence/guard tests.

### P09 — Mạch hội thoại và sửa ý

**Phụ thuộc:** P06/P07; P08 cho multi-product. **Quy mô:** M. **Kế thừa:** T09/T10.

- Reuse profile/session/history; giữ preference/correction và câu hỏi đang dở tối thiểu qua window. Không thêm durable state nếu fields/history hiện có đủ.
- Tách customer report khỏi shop facts; referent theo binding. Sửa nhu cầu vô hiệu dữ liệu phụ thuộc, giữ facts độc lập.
- Bảo toàn accepted Outbox recovery; pending/failed send không được coi bot đã nói, không resend để sửa history.

**Nghiệm thu:** không hỏi lại dữ kiện còn hợp lệ; correction/referent đúng; mất Redis projection không gây gửi trùng trong đường đã hỗ trợ.

**Kiểm chứng/files:** vượt window, xen chủ đề, hai sản phẩm, sửa budget/size/payment, history fault; session/profile/history producer/tests. Không sửa lại DB recovery nếu không có regression.

### P10 — Fallback giữ nhu cầu và facts

**Phụ thuộc:** P04/P06; mở rộng cùng P08/P09. **Quy mô:** M. **Kế thừa:** T13.

- Inject lỗi Strategist/Responder/guard/lookup/commit riêng. Giữ verified facts/effects theo compatibility, tránh baseline giá/CTA lạc đề. Xung đột bảo toàn baseline với mục tiêu hiện tại phải giải quyết trong spec deviation/test, không tự bỏ facts/media.
- Lỗi một phần không xóa câu trả lời độc lập; capability thiếu được nêu cụ thể. Không fallback riêng cho từng case hoặc repair loop vô hạn.
- Reuse telemetry: data gap/model error/guard block/final fallback, sanitized detailed reason, calls/token/latency; không budget/observability service mới.

**Nghiệm thu:** không effect sai; không generic ACK thay toàn câu khi facts còn đủ; malformed model không FAILED_PERMANENT; no-call owner paths giữ nguyên.

**Kiểm chứng/files:** fault injection và actual final reply/state; runner error handling/readiness/contract diagnostics tests, telemetry mapping nếu cần.

### P11 — Luna DEV70 và review toàn bộ hành trình

**Phụ thuộc:** P01–P10 trong scope candidate. **Quy mô:** M, execution/evidence. **Kế thừa:** T15.

- Frozen DEV70 đúng revision, gpt-6-luna/effort ghi rõ (baseline medium); giữ mọi case/error/retry/stage. Diagnostic fixtures báo riêng. Amendment bundle có identity/mapping; không gọi khác bundle là cải thiện model thuần túy.
- Chấm theo rubric/stage judge hiện có; COMPLETED_NOT_JUDGED không nâng PASS. Đọc cả 70 lịch sử, accepted/rejected và final reply; mỗi họ lỗi còn lại có nguyên nhân, không chỉ label.
- Runtime full-intent giữ state trên họ mục 7 và wording ngoài DEV70. Lượt khách phân nhánh theo vấn đề được giải quyết, không luôn tự mua; scripted branches vẫn không phải chứng minh conversion khách thật.

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

Runtime opt-in hiện dùng `LUNA_REALTIME_SMOKE=1`, `LUNA_REALTIME_SMOKE_ARTIFACT_DIR` tuyệt đối ngoài repo và `LUNA_REALTIME_SMOKE_JOURNEY_IDS` cho debug. **Flag hiện tại chưa chứng minh full-intent mode**; chỉ gọi evidence full-intent sau P05, mode phải có trong artifact. Không ghi credentials vào lệnh/tài liệu.

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

- [DEV70 review](evidence/c3-luna-dev70-92612ad-report.md) and [ordered history](evidence/c3-luna-dev70-92612ad-full-history.md). Focused guard/cart replay remains owner-local; the failure classification and result are summarized here and in P00 rather than linked to a workstation-only file.
- [Audit 24/09](../../LANCHATBOT_INDEPENDENT_AUDIT_20260924/AUDIT.md): kiến trúc/probes, không chứng nhận bao phủ mọi guard error.
- [DEV70 report](evidence/c3-luna-dev70-92612ad-report.md), [full history](evidence/c3-luna-dev70-92612ad-full-history.md); raw `../../LUNA6_DEV70_C3_92612ad_20260926T033240Z/case-records.json`.
- [Runtime 9 journeys](evidence/c3-luna-stateful-runtime-baff6a5-report.md), [checkout retest](evidence/c3-luna-stateful-runtime-8cd20ab-checkout-history.md).
- [Catalog lịch sử](evidence/catalog-field-path-20260925.md), [owner/source map](t00-source-map.md), [F01–F10 status](evidence/c3-f01-f10-status-20260926.md).
- [Spec C3](../docs/specs/track-c-c3-strategy-contract.md), [rubric](../apps/worker/evals/track-c-c2/v2/rubric.json).

## 11. Self-review bản kế hoạch này

- Bảo toàn fix đã có; checkbox cũ chưa tick không bị coi là chưa có code.
- Guard là thử nghiệm hữu hạn có đầu ra/điểm rẽ; không hứa semantics bằng typed data/claim annotations.
- Full-intent model khác với mock proposal giữ state; nguồn customer-script mua không được gọi bằng chứng thuyết phục.
- Source, fixture và runtime authority không bị đánh đồng; frozen rubric không đổi để làm đẹp điểm.
- First-contact/private PII/human owner/CAS/Outbox/compatibility/live scope được giữ rõ.
- Task có phụ thuộc, nơi sửa, nghiệm thu, kiểm chứng; ngưỡng runtime là đề xuất, khác rubric frozen.
- Không thêm approval/gate/operator hoặc online reviewer mặc định. Đây là self-review tài liệu, chưa có code/model test mới trong lượt lập kế hoạch.
