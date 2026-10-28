# Phase B — kiểm riêng tác động của form báo giá

Base `ce734c405fb6d7ddac0bf196eaa5a530c476f950`, candidate PR391. Owner yêu cầu cùng reviewer review phương án→fix→APPROVE, implementation→review/fix→APPROVE rồi chạy model. Không live send, deploy, merge, ghi nguồn shop hoặc đổi model.

## Review và phạm vi đã thu hẹp

Reviewer cũ REVISE phương án ban đầu: phần advice lặp prompt hiện có; contract tham số báo giá chưa rõ; ảnh chưa được verifier cùng nhìn; chưa có causal proof. Không implement các phần rộng đó cùng lúc.

Audit actual last owner wire cho8ca cho thấy chỉ concern-v2/price/price-v3 có openingQuote. Hai concern còn lại vẫn dài dù không có field này. Reviewer tiếp tục REVISE phép thử8cặp/ngưỡng2concernwins: các cặp không khác đầu vào chỉ đo variance. Revision này nhận đầy đủ đề nghị thu còn3ca exposed, không tiêm form giả hoặc chọn ca theo kết quả provider.

Đây là **captured-world final-reply diagnostic**, không native ingress/tool-choice/delivery/current send eligibility. Chỉ bỏ field trình bày `openingQuote` của read_product khỏi dữ liệu owner nhận. Runtime/tool API/prompt/verifier/ảnh/source/receipts giữ nguyên. Chưa thêm bool tool, chưa chọn sửa runtime; nếu không cải thiện thì dừng giả thuyết này, không nối stylefix để cứu kết quả. Một concern N1 không đủ promote hoặc tự mở full51.

## Population và arms

Nguồn capture: full run source `468d85ea6577c428cf2f6f155c9774926537364b`, external c3-b-pos-refresh-model-20261026; exact artifacts/hash của3caseIds b1-buying-concern-v2, b1-price, b1-price-v3. Lấy last dispatched owner generation bằng thứ tự registered generations, không chọn theo reply/verdict. Frozen input giữ PUBLIC_CONTEXT_CAPTURE canonical trusted/context/capturedAt, actual OWNER_REQUEST và runtime latest/history từ registered case. Không dùng reply cũ làm baseline; hai arms đều gọi mới.

- A: giữ openingQuote thật đã capture.
- B: bỏ duy nhất response.data.openingQuote trong các read_product functionResponse đã đăng ký. Giữ facts/sizeAvailability/availability/offers/giá/nguồn thiếu đầy đủ.
- N1 mỗi case/arm:6slots, một owner+max một verifier mỗi slot, max12generationrequests. Fixed alternating AB/BA/AB. Không generation retry, không loại lỗi khỏi denominator. Owner Gemini3.5FlashLiteHIGH/verifier GPT6.1SolHIGH như manifest.
- Năm ca không exposed (buying-concern/v3, price-v2, current-policy, changed-occasion-v3) là offline no-change controls, không chạy provider.
- 17 fresh controls của same executable/config identity là prerequisite riêng, fresh captured source riêng, không ghép clocks/worlds vào diagnostic historical context. Total23registered outcomes/max29generationrequests. Controls fail→STOP trước6slots; không claim controls qualify historical source hiện tại.

## Dựng request và golden proof

Captured OWNER_REQUEST là wire đã projected. Không đưa native functionResponse đã projected qua projection lần nữa. Cả hai arms được chuẩn hóa bằng cùng phép biến đổi có định nghĩa:

1. Giữ system prompt/generation config/turnTime và customer/shop history text nguyên bytes. Không thêm lời nhắc giọng mới.
2. Từ tool turn đầu, chuyển text/functionCall/functionResponse thành completedToolTurns JSON data; bỏ provider opaque signatures/thoughts khỏi cả hai như final-only path hiện có. Không đưa raw evaluator wrappers vào request.
3. availableTools/callableTools=[]; phase FINAL_REPLY, toolsAllowed=false, toolBudget=0; tools=[]/mode NONE. Đây là forced text-only post-read probe, không đánh giá owner có chọn tool đúng không.
4. Dùng canonical context từ capture để build owner view; turnTime giữ processingAt gốc, evaluation/freshness clock dùng capturedAt đã lưu. Không renew evidence hoặc trộn dữ kiện hiện tại.
5. Golden compare constructed A wire với expected normalized frozen wire; ngoài execution/trace normalization đã khai báo, không được đổi nội dung. Golden A/B diff chỉ các node openingQuote và neutral generationIds ngoài model contents. Treatment/evaluator labels không vào provider requests. Full request/schema bounds và private-marker scan trước dispatch.

Missing/duplicate/mismatched captures, source dirty/drift, malformed quote shape, normalized baseline mismatch hoặc không thể prove chỉ bỏ presentation→BLOCKED zero provider cho diagnostic; không substitute ca. Một slot lỗi sau dispatch vẫn nằm denominator, không overwrite artifacts.

Mọi final draft qua hardPrecheck; nếu sống sót thì verifier bắt buộc. finalGate dùng exact draft/canonical captured snapshot và historical clock của chính ca, không state mutation hoặc send. Report exact terminal fallback/no-send, không chấm draft bị chặn như câu khách nhận. Đây là replay outcome, không actual customer capture. Không đưa receipt semantics mới vào model.

## Chấm và điểm dừng

Reviewer độc lập đọc paired outputs X/Y đã shuffle, không có arm mapping; mapping ngoài review file đến khi kết luận đã freeze. Whole-turn assessment: giải quyết đúng băn khoăn/chọn mua tốt hơn, có bỏ thông tin thừa mà không mất thông tin cần thiết, mạch và giọng, factual/action safety. Ngắn hơn hoặc đủ keyword không tự thắng.

Một target concern-v2 chỉ được ghi positive signal khi candidate tốt hơn rõ cả về đáp nhu cầu và usefulness, không factual/action safety regression. Hai price controls phải giữ tên/phần bán/giá/size và những phần form nguồn có cung cấp; không bắt material khi source không có. Không giá/tồn bị mất, không tạo mới quyền/receipt. Repeat-price, ảnh, stateful/cart/checkout không được provider qualification bởi6slots này; chỉ regression offline/focused có sẵn được report riêng.

Nếu không rõ improvement, tie, có regression/error hoặc controls fail: report inconclusive/negative và dừng; không promote/remove runtime field hoặc chạy full51 để tìm kết quả đẹp. Nếu có signal tốt: chỉ đề xuất bước native qualification bằng kế hoạch riêng, không tự coi B GO. Source, form API, vision và prompt redesign cần evidence/plan mới, không tự tiếp tục trong run.

## Verification và savepoint

RED observed trước implementation: exact normalized wire giữ form A/bỏ form B, không đổi canonical context/trusted verifier input; offline unexposed unchanged; malformed/tampered capture blocked; labels không leak; errors retained/no retries; all six slots unique/preregistered. GREEN tối thiểu reuse existing Gemini/verifier transports, không provider API mới/framework.

Focused Node tests cho diagnostic và Gemini, existing commerce tests, worker typecheck/build/lint khi cần dist runtime; protected claims/assembler giữ nguyên. Independent executable APPROVE trước generation. Commit source + frozen capture/config + runner, require clean worktree, capture HEAD ngoài repo, preflight/controls→6slots. Source/config đổi invalidates identity. Final report ghi exact commands thực chạy, denominator/token/error/latency/request bodies, raw hashes và giới hạn. Old full51/STOP/scopedfix evidence giữ nguyên.
