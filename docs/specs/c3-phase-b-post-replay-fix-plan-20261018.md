# Phase B — phương án sửa sau review độc lập 45 lượt

Trạng thái: **PLANNED**. Owner yêu cầu sửa phương án; lượt này chỉ cập nhật tài liệu. Intake `f70f5a9e0021c0ace9d3fdd61d72dfe7d65aca82`, branch `feat/c3-phase-b-commerce-20261014`, PR391. A vẫn OWNER_BYPASS; B chưa được chấp nhận cho bán hàng/live. Không có provider request hoặc implementation mới trong lần chỉnh kế hoạch này.

Phương án này thay phần đề xuất tiếp theo sau F1–F3; không mở lại các bước F1–F3 đã hoàn thành trong [kế hoạch trước](c3-phase-b-rollback-and-contract-plan-20261018.md) và [implementation](c3-phase-b-contract-fixes-implementation-20261018.md). Nguồn: [45 hội thoại](../../apps/worker/evals/single-agent-commerce-read-only/contract-fixes-run-20261018/CONVERSATIONS_AND_REVIEW.md), [trace/diagnosis](../../apps/worker/evals/single-agent-commerce-read-only/contract-fixes-run-20261018/DIAGNOSIS.json), [report](../../apps/worker/evals/single-agent-commerce-read-only/contract-fixes-run-20261018/CHECKPOINT_B.md). Reviewer độc lập đọc đủ 45 actual outcomes và code tại intake, kết luận **REVISE**. Bản chỉnh này chưa có verdict ACCEPT mới.

## Bằng chứng và điều chỉnh nhận định

- Run source `7d01e594c79ec88d45886d832c80b3137b03da4d`: 36 USABLE / 2 NEEDS_EDIT / 4 UNUSABLE / 3 ownership controls. Cả ba hành trình tới preview/confirmation; opening chỉ một model PASS, một code recovery và một fallback. Không gọi đó là ba opening thành công bằng model.
- Initial request rep2 chỉ có subject/label, chưa có verified offers: `read_product` round đầu hợp lý. Sau read đã có AO/CV/SET_VAY, gọi `recommend_size` thay vì add mới là thao tác không cần thiết. Hai tool completions dưới NONE vẫn là lỗi; chưa biết nguyên nhân bên trong provider.
- Chín partial-source outcomes giữ phần hữu ích, không bịa chỉ bán cả bộ/hẹn xử lý. Bảo toàn kết quả này và sửa số đo/giữ lựa chọn trong state.
- Correction cho review cũ: cả ba preview **chỉ hiện `SV2447 size L ×2`**, không hiện áo riêng/màu be/tên Thạch Thảo. Ghi chú cũ đã suy text đủ thông tin từ state đúng. Giữ nguyên raw, frozen primary và score; correction được ghi tại đây, không sửa ngược artifact.
- Stage rep1 PASS là **ứng viên false PASS theo adjudication độc lập**: từ nguồn mềm/thoáng/form nhẹ suy áo mỏng và sẽ thấu dưới đèn. Đây là nhận định về toàn câu trong câu hỏi độ kín, chưa phải kết luận cơ chế verifier chặn theo từ. Compound rep3 chưa xác định được chính xác mệnh đề gây FAIL từ kind/ref.

## Phạm vi và thứ tự

Giữ một conversational owner, tối đa một verifier, code authority cho identity/freshness/state/permission/effects/receipts/privacy. Reuse validation, renderer, tool responses và final gate hiện có. Không thêm gate, intent classifier, parser tiếng Việt, regex theo ca, template tư vấn theo sản phẩm, persistent display-name state, model role, repair loop hoặc budget/retry mới. Prompt sửa bằng thay đoạn hiện có; mọi tăng độ dài phải có lý do riêng, không lấy giảm phần trăm làm mục tiêu.

Chuẩn bị phân xử nghĩa V0; sau đó P1 preview → P2 câu code → P3 tool/search → P4 decision/voice. V1 chỉ áp dụng nếu V0 chỉ ra quy tắc cần sửa. Các bước có savepoint riêng; chỉ một candidate cuối khi owner yêu cầu chạy, không tự chạy các nhánh thử.

### V0 — Phân xử câu còn tranh luận, trước khi sửa verifier

Đọc whole reply + câu hỏi + nguồn cho stage rep1/rep3, stage rep2 Khánh Trang và compound rep3. Ghi một nhận định riêng cho từng lời khẳng định, lý do và mức chắc chắn; không dự đoán chain-of-thought của verifier. Đối chiếu cảnh báo rủi ro, gợi lớp mặc thông thường, báo đặc tính của món và khẳng định giải pháp đủ kín. Nhận xét thẩm mỹ/cảm giác được phép; kết luận độ che phủ cụ thể vẫn cần căn cứ. Nguồn không có phép thử cũng không chứng minh sản phẩm có khuyết điểm.

**Đạt:** phân biệt câu được phép với câu vượt nguồn bằng nghĩa trong ngữ cảnh; ghi unresolved nếu chưa kết luận được. Câu từng PASS không tự thành nhãn chuẩn. Ví dụ phân xử ở tài liệu evaluator, không chép câu của corpus vào prompt. Không đổi frozen scores/corpus. Nếu có đề xuất thay ranh giới nghiệp vụ đã được owner chốt, nêu riêng quyết định đó; không tự đổi để cứu điểm.

### P1 — Bản chốt cho khách nhìn rõ món đã chọn

**Files:** `apps/worker/src/realtime-sales-cycle.ts`, test cùng tên; composition chỉ chạm nếu cần truyền nhãn đã có và đúng binding.

- Sửa `cartSummary` từ dữ liệu cart hiện có: offerId/offerKind/componentRole, màu, size, số lượng. Giữ quan hệ từng component khi set có màu/size khác nhau; không gom thành danh sách khiến khách không biết màu/size thuộc món nào.
- Cart và CartSelectionResult hiện không có productName. Chỉ dùng tên từ context đã bind đúng parentProductId nếu composition cấp được trong luồng hiện hữu; nếu không, dùng mã cùng loại hàng/màu/size. Không thêm catalog read riêng/durable schema chỉ để có tên. Không lấy tên theo vị trí mảng hay theo tên mẫu khách vừa nhắc.
- Kiểm các consumer dùng chung: preview, checkout template, thay giỏ, thương lượng. Giữ số tiền/ưu đãi/ship/ETA và ranh giới dữ liệu riêng tư ở code.

**Đạt:** actual text phân biệt áo riêng với cả set, hiển thị màu/size đúng từng món và tổng đúng; không cần suy từ backend state. **Kiểm:** RED→GREEN cho áo riêng, set nhiều component, nhiều dòng và thiếu nhãn; consumer regression tại renderer hiện hữu. Không snapshot toàn đoạn chỉ để khóa giọng.

### P2 — Câu xác nhận do code tạo

**Files:** `single-agent-commerce-effects.ts`, `realtime-sales-cycle.ts` và tests tương ứng.

Thay lời thuật thao tác “ghi nhận xác nhận”, “có món đặt trước” bằng xác nhận ngắn, rõ lựa chọn/kết quả thực sự đã commit. Reuse cart/receipt và renderer nếu phù hợp; giữ fallback ID/semantics riêng biệt. Báo đặt trước đúng món khi dữ liệu đã xác nhận. Không nâng CART_OPEN thành đã lên đơn POS, giữ hàng hoặc nhân viên đã nhận việc. Khi thiếu nguồn mới cho tổng/stock, recovery vẫn chỉ nói phần được phép theo boundary hiện hữu.

**Đạt:** câu code có ích và đọc tự nhiên, các nhánh receipt stale/revision/recipient/permission đổi vẫn chặn như cũ. Kiểm cùng focused effects tests; không mở rộng recovery để vớt phần model chưa kiểm.

Handoff im lặng hiện theo policy: ba controls chứng minh chuyển ownership, chưa chứng minh nhân viên nhận việc. Rà đường nhận/event/tag hiện có và ghi đúng giới hạn; chỉ mở sửa connector nếu thấy lỗi cụ thể. Không tự thêm holding message hoặc thay policy handoff trong P2.

### P3 — Phạm vi chọn size và tìm mẫu thay

**Files:** `gemini-inference.mjs`, `prompts/owner.vi.txt`, adapter tests; state tool chỉ chạm nếu xác nhận cần sửa projection kết quả cho owner.

- Thay mô tả `recommend_size` hiện tại bằng: “Chọn size hoặc kiểm độ vừa khi khách nhờ shop tư vấn. Khách đã đặt một size thì dùng size họ chọn để mua; không gọi tool này chỉ để nhận mua. Thiếu bảng size chỉ giới hạn tư vấn độ vừa.” Đây là điều kiện sử dụng tool, không code classifier đọc ý khách.
- Đối chiếu `NO_VERIFIED_CHART/action=HANDOFF`: giữ status và việc chưa có SIZE_FIT. Làm rõ trong description/projection hiện hữu rằng kết quả chỉ áp dụng yêu cầu tư vấn fit, không là lệnh handoff toàn giao dịch khách tự chọn size. Không thay shared size-engine policy hoặc âm thầm bỏ action của consumer khác. Chỉ thêm thông tin vào response nếu description không thể biểu đạt rõ phạm vi, và ghi lý do delta.
- Thay bullet search mâu thuẫn: khách gọi tên/mã cụ thể thì tìm chính xác; khách cần mẫu thay thì tìm theo nhu cầu đã nói. AMBIGUOUS không chứng minh đã tìm đúng mẫu được gọi tên. Kết quả search chỉ cấp những thuộc tính nó có, không tự chứng minh mẫu thay khắc phục độ kín.
- `quote_cart` đã có hướng dẫn dùng cartQuote hiện tại. Giữ làm control, không thêm đoạn nhắc lại. Initial read khi thiếu offer vẫn được phép; add chỉ cần offer/lựa chọn đã biết, code tự kiểm giá/tồn.

**Đạt kỹ thuật:** captured request chứa đúng contract đã sửa, không mất schema/native history/verified context, selected size không tạo SIZE_FIT. **Đạt hành vi cần model mới:** sau khi biết offer, thực hiện mua khách đã chọn trong budget; không chọn size lại/quote thừa hoặc gọi dưới NONE. Offline test không chứng minh owner biết chọn tool. Mô tả tool là giả thuyết cải thiện, không bảo đảm chữa lỗi NONE.

### P4 — Quyết định mua và giọng tư vấn

**Files:** `prompts/owner.vi.txt`, active manifest/hash và tests consumer hiện có khi cần.

Thay bullet “Khách nhờ chọn” và phần giọng; không thêm mục lặp ở cuối prompt. Delta cụ thể: ưu tiên một phương án sau khi cân nhắc điều khách còn phân vân; giải thích một đánh đổi liên quan, chỉ đưa phương án phụ để giải quyết bất tiện phương án chính chưa giải quyết. Không khen mọi hướng rồi trả lại quyết định cho khách. Cho phép cả set, upsell và lựa chọn chi cao hơn có ích; không ép đáp án rẻ nhất hay một số câu cố định.

Giọng lấy hành động/nỗi lo hiện tại làm trọng tâm; mô tả nguồn chỉ dùng phần giúp trả lời, không chuyển cả catalog sang văn nói. Thông báo phần chưa tra được trực tiếp, không kể hệ thống. Xác nhận lựa chọn vừa đổi/số đo vừa sửa được phép; không nhắc cả hồ sơ/ngân sách cho đủ ý. Bỏ chỉ dẫn trùng sau thay, giữ nguyên nguồn chính sách và ranh giới nhận size khách chọn/fit.

**Đạt:** review cả lượt cho thấy khách nhận được lời khuyên ưu tiên và lý do liên quan, câu ngắn hay dài theo nhu cầu; không chấm keyword/cấm riêng từ “giúp em”. Đọc diff để xác nhận không cấy câu trả lời/caseId/rubric vào model. Prompt hash mới được cập nhật trước seal; không thử rút gọn toàn prompt hoặc đổi system placement cùng lúc.

### V1 — Sửa verifier có điều kiện sau V0

Chỉ thay đoạn nghĩa nếu V0 chứng minh có thiếu/mâu thuẫn trong quy tắc hiện tại. Phân biệt cảnh báo/gợi phối và báo món cụ thể sẽ xuyên/đủ kín, theo toàn đoạn và tình huống; không thêm blacklist từ mỏng, vừa vặn hoặc thời lượng. Không dùng lần FAIL đơn lẻ để khẳng định nguyên nhân keyword. Nếu quy tắc đã rõ nhưng verdict biến động, giữ prompt và ghi giới hạn reliability; không tiếp tục chồng chỉ dẫn. Không thêm judge/runtime role, schema giải trình, reverify hay diagnostic generation ngoài scope đăng ký.

## Kiểm chứng và lần chạy sau

Các lệnh dưới là **dự kiến**, chưa chạy trong lượt chỉnh tài liệu. Chỉ chạy phần có boundary thay đổi, rồi build/typecheck; không lặp full suite khi chưa có thay đổi/rủi ro mới:

```powershell
pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce.test.ts src/single-agent-commerce-ingress.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Lint của worker là TypeScript noEmit; không cần thêm một lệnh typecheck trùng. Khi V1/final text boundary bị đổi, chạy thêm focused semantic-boundary/protected-claims/reply-assembler hiện có. Nếu chạm shared package thì kiểm đúng package/consumer tương ứng. Chốt danh sách test tồn tại và commands thực chạy trong implementation report, không claim PASS từ kế hoạch.

Khi owner yêu cầu chạy, đăng ký source sạch và frozen inputs mới theo [scope gần nhất](../../apps/worker/evals/single-agent-commerce-read-only/contract-fixes-run-20261018/SCOPE.md): cùng Gemini 3.5 Flash Lite High owner/Sol 6.1 High verifier, cùng 45 priority outcomes (3 hành trình ×7 +8 B1 ×3), max168 generation requests. Không thêm câu/attempt chẩn đoán. Giữ cả hành trình với actual history, kể cả downstream sau lỗi. Remaining16 chỉ chạy khi toàn priority đạt criteria đã freeze; tổng tối đa61 outcomes/232 requests. Mọi thay đổi semantic adjudication/preview criterion phải ghi trước run, không gọi so sánh điểm với run cũ là hoàn toàn cùng rubric.

Đọc actual capture và committed state riêng trước rejected drafts; giữ raw → primary → diagnosis và toàn denominator. Ghi riêng model PASS, code recovery, đúng state, đủ thông tin khách nhìn thấy, owner tool adherence, giọng/quyết định, handoff controls. Không dùng code recovery để nhận owner tool planning đã sửa, không dùng cuối hành trình thành công để xóa fallback đầu. Giữ source/request/privacy/binding audit, usage/latency/error accounting hiện hữu; không thêm lớp bằng chứng mới.

Self-review kế hoạch: mỗi thay đổi gắn lỗi hiện có; không coi initial read là lỗi; tên sản phẩm chưa có trong cart; quote là control; stage PASS chưa mặc định an toàn; các nguyên tắc sales đã chốt và partial-source/state fixes được giữ. Complexity hiện tại: tài liệu và liên kết nhiệm vụ; executable/model requests =0. Implementation dự kiến sửa các contract/renderer hiện có, không thêm runtime layer/store/gate.
