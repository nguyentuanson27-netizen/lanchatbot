# Phase B — thiếu dữ liệu shop ảnh hưởng yêu cầu thì handoff

Owner chốt25/10/2026: “Thiếu dữ liệu shop thì handoff; thiếu thông tin khách thì hỏi bổ sung”. Base `21ae025b`. Áp dụng cho candidate PhaseB; không deploy/đổi policy upstream hoặc viết vào production entrypoint trong lượt này.

## Còn thiếu gì trong evidence hiện có

| Phần | Evidence và phạm vi | Xử lý từ quyết định này |
| --- | --- | --- |
| Cách bán/giá/tồn | b1-partial-source-v2 chủ động bật POS_UNAVAILABLE. Offers chưa xác nhận, không có PRICE/STOCK. Đây là fault mode của test; ba B1 khác vẫn đọc được giá799k/449k/499k. Không phải kết luận shop thiếu toàn bộ bảng giá. | Khách cần giá/tồn/cấu hình mua mà nguồn không đọc được thì handoff; không suy chỉ bán nguyên set hoặc khuyên mua cấu hình khác dựa trên sự thiếu dữ liệu. |
| Ảnh đúng màu/loại | Gallery có2ảnh chung nhưng chưa chứng minh đúng màu be. Một số truy vấn feedback/cận chi tiết không có asset đủ metadata theo yêu cầu. Không đồng nghĩa shop không có ảnh hoặc không bán màu đó. | Xin đúng màu/loại mà chưa xác nhận hoặc gửi được thì handoff; không tự đổi sang ảnh chung để coi là xong yêu cầu. Ảnh chung vẫn dùng khi khách hỏi xem mẫu chung hoặc đã chốt yêu cầu đó. Quy tắc này thay acceptance tạm thời trước đây cho gallery, từ run mới; không sửa nhãn lịch sử. |
| Phiên bản nguồn | Discovery có giá/tồn/mô tả nhưng sourceVersion/observedAt đổi trước final gate. | Giữ handoff theo dependency/freshness, không dùng PASS cũ cho snapshot đã thay đổi. Đây là vấn đề nhất quán nguồn, không phải cần điền thêm mô tả sản phẩm. |
| Size | Không kết luận thiếu chart cho mọi mẫu: Thạch Thảo đã có cơ chế chia sẻ chart cùng tên theo owner. Khi thực sự không có verified chart hoặc không đọc được nguồn size, không được chọn size. | SIZE_RULE_UNAVAILABLE→handoff. Nếu chart có nhưng thiếu số đo khách, hỏi missingInputs. Khách tự chọn L và chỉ sửa hồ sơ không mặc định cần thêm kết luận fit. |
| ETA/chính sách/đặc tính riêng |14lượt vừa rồi không chứng minh mọi dữ liệu này thiếu; phải đọc nguồn khi câu hỏi cần. Một field chưa đọc/null chưa đủ để nói shop không có. | Đã đọc mà vẫn thiếu dữ liệu shop quyết định câu trả lời thì handoff. Thiếu khu vực nhận/nhu cầu do khách chưa nói thì hỏi khách. |

Không thêm nguồn sản phẩm mới hoặc bù số liệu giả. Mô tả/attributes đủ trả câu hỏi về chất/dáng thì dùng phần đó; không chuyển chỉ vì một field tùy chọn chưa có. Lời nhận xét thẩm mỹ/cách phối có căn cứ vẫn theo giới hạn tư vấn hiện hành, không đòi một phép thử riêng cho mọi nhận xét.

## Phân công owner và code

- Owner đọc hội thoại để biết phần nào cần cho câu trả lời. Chưa đọc nguồn thì gọi tool; thiếu dữ liệu shop cần thiết sau khi đọc thì bắt buộc request_handoff, không hỏi khách có muốn chuyển không, không chỉ viết lời hứa rồi kết thúc. Không có quyền handoff thì không báo đã chuyển.
- Code tự phát hiện các **kết quả tool không trả được nguồn**: search/read source unavailable/stale, policy-read failure, nguồn size lỗi, ảnh không có verified match/không bind màu/lỗi đọc. Gọi luồng handoff hiện có và kết thúc trước generation tiếp; không phân tích câu tiếng Việt bằng regex. Read_product trả OK nhưng thiếu một phần giá/tồn/ETA thì giữ partial result cho owner xác định phần thiếu có liên quan hay không. Không tự coi các trường trả kèm hoặc mọi selling option đều bắt buộc.
- DETAILS_ONLY có content/attributes đủ dùng không bị chặn chỉ vì offers null. SIZE_UNSUPPORTED/OFFER_NOT_FOUND là phản hồi domain đã biết, không tự biến thành thiếu nguồn. Thiếu customer measurements vẫn là missingInputs; checkout tiếp tục thu thập riêng trong code.
- Những thiếu hụt chỉ xác định được khi hiểu câu hỏi (ví dụ một đặc tính cụ thể không được nguồn nhắc tới) thuộc trách nhiệm owner gọi request_handoff. Đây chưa phải bảo đảm deterministic rằng mọi câu trả lời thiếu ý sẽ bị code nhận ra; cần provider acceptance riêng, không thêm classifier/model thứ ba.
- Handoff chỉ được báo thành công sau transaction/current readback: ownership/event/tag-intent/holding message theo port hiện có. Nếu commit bị từ chối/không rõ kết quả thì NO_SEND, không tiếp tục tư vấn hay thử commit lại trong cùng turn. Không lấy policy/quyền/recipient chưa xác nhận để tự chuyển.

## Implementation

1. `single-agent-commerce.ts`: sau tool results, map missing-shop-source outcomes sang reason handoff sẵn có. Chỉ bật khi caller đã cung cấp handoff port; không tạo capability/handoff giả trong B1read-only. Giữ nguyên raw tool results, không rewrite reply hay gọi thêm model. Một automatic handoff attempt/turn; no-send nếu không chứng minh được, chặn gọi tool tiếp sau lỗi đó.
2. `single-agent-commerce-state.ts`: lỗi đọc size source trả UNAVAILABLE/SIZE_SOURCE_UNAVAILABLE, tách khỏi lỗi đầu vào khách; tiếp tục chặn tác vụ phụ thuộc. No-chart recovery đã có giữ nguyên.
3. Owner prompt và tool declaration ghi quy tắc chung; cập nhật owner hash trong manifest. Không thêm ví dụ theo caseId, không đổi verifier prompt/model/config hoặc corpus.
4. Candidate handoff matrix v5: PRICE/STOCK/ETA/POLICY_UNAVAILABLE dùng holding ngắn rồi chuyển; không nhắc bot/nhân viên. Isolated policy clone áp dụng mode mới, giữ tag upstream. Không update admin pointers hoặc live policy.

Lưu ý khi model chọn đọc ảnh chủ động: code coi thao tác lấy/xem ảnh đã gọi là nhu cầu nguồn của lượt đó; nếu nguồn trả thiếu ảnh thì chuyển. Owner nên gọi tool ảnh khi nó phục vụ yêu cầu/tư vấn, không mặc định gọi để lấp mọi lượt. Self-review phát hiện chỉ dẫn mở đầu cũ bắt tìm ảnh cả khi khách chỉ hỏi giá; đã bỏ yêu cầu đó để tránh handoff không cần thiết. Bộ test positive giữ trường hợp ảnh sẵn có, caption vẫn phải qua verifier; không chuyển chỉ vì verifier UNCERTAIN nếu independent verified-media recovery hiện hành vẫn hợp lệ.

## Review độc lập và sửa sau bản đầu

Reviewer kết luận REVISE trên `adbee7b0b08e42e5b0eb8db53b7a49e9460098d9`: P2 unnecessary handoff. Khách chỉ hỏi giá, giá499.000đ đã xác minh nhưng stockUNKNOWN thì helper tự handoff STOCK_UNAVAILABLE. Root cause là coi mọi field read_product trả kèm đều cần cho câu hỏi. Các tests cũ xanh nhưng thiếu control này.

Sửa nhỏ nhất: bỏ scan per-field PRICE/STOCK/ETA/stockUNKNOWN/variant từ kết quả OK. Không thêm requestedFacts hoặc framework/schema mới. Giữ partial result, owner đọc câu hỏi rồi request_handoff nếu phần thiếu thực sự cần thiết; code kiểm quyền và commit/readback như cũ. Full source failure vẫn tự handoff; DETAILS_ONLY, size-source failure, ảnh, privacy và final gate giữ nguyên. Prompt chỉ thêm một câu phân biệt dữ liệu trả kèm với dữ liệu cần.

Observed RED trước runtime change:3 tests fail (price-only bị handoff, stock handoff của owner bị auto short-circuit, ETA trả kèm gây handoff). Sau sửa109 focused PASS, gồm16 missing-information và93 ingress. Ba ca relevant gap PRICE/STOCK/ETA đọc partial rồi owner gọi handoff và commit thật; giá đủ/tồnUNKNOWN thì FINAL vẫn verifier+gate, không chuyển. Đây là mocked owner outputs, không phải bằng chứng model hiểu đúng mọi ca.

Reviewer được gọi lại trên diff sửa này và kết luận **APPROVE**, không có finding mới cần sửa; độc lập chạy109 focused,17 protocol và diff check PASS. Không sửa tiếp runtime khi không có finding xác nhận. Chưa provider acceptance hoặc B GO.

## Verification bản đầu (historical, trước review P2)

Quan sát RED trước sửa: các test required price/policy handoff và denied/unknown commit chưa đạt. GREEN minimum sau khi nối composition. Thêm kiểm stockUNKNOWN, ETA thiếu fulfillment, ảnh thiếu, nguồn size lỗi, no-handoff capability, DETAILS_ONLY đủ thông tin, customer missingInputs và persisted ingress có ownership/event/tag/message atomic.

Các test media followup trước đây dùng thiếu feedback để tạo fallback đã được đổi sang **ảnh đủ nguồn nhưng caption UNCERTAIN**; vẫn giữ mục tiêu history/fallback/verifier coverage. Thêm ca riêng xác nhận thiếu feedback trong cùng batch có giá vẫn handoff. Không xóa coverage whole-draft PASS/UNCERTAIN khi ảnh đủ nguồn.

Commands thực sự chạy từ repo root:

| Command | Kết quả |
| --- | --- |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-missing-information.test.ts` | 13 PASS sau RED→GREEN. |
| `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/single-agent-semantic-verifier-boundary src/track-b-protected-claim-boundary` | 568 PASS / 21 files, gồm 93 ingress và 13 missing-information tests. Run trước đó 563 PASS / 4 FAIL do fixture media còn theo policy cũ; đã sửa fixture, giữ mục tiêu coverage và chạy lại toàn bộ. |
| `node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"` | 161 PASS, gồm protocol hashes, adapter, evaluator firewall và candidate handoff. |
| `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts` | 21 PASS. Lệnh đầu dùng nhầm worker path `src/track-b-protected-claims src/track-b-reply-assembler` báo no test files/exit1; không tính lệnh đó là PASS. |
| `pnpm --filter @lana/worker typecheck` | PASS sau khi sửa fixture readonly images; lần trước TS2339 do dùng push trên readonly array. |
| `pnpm --filter @lana/worker lint` | PASS. |
| `pnpm --filter @lana/worker build` | PASS, gồm build các workspace dependencies. |
| `git diff --check` | PASS. |

Self-review: giữ source/permission/recipient/privacy/revision gates và receipts; không thêm model, parser, regex xử lý ngôn ngữ hoặc generation retry. Handoff failure không biến thành lời báo đã chuyển. Test ingress dùng transaction/store mock, chưa phải PostgreSQL/provider integration mới. B1 không có handoff port vẫn chỉ là read-only eligibility, không được coi là acceptance cho luồng handoff mới.

**IMPLEMENTED; PROVIDER_ACCEPTANCE_NOT_RUN; B chưa GO.** Chưa chạy provider, DB integration, live send hoặc deploy mới; các model outcomes cũ không thuộc prompt/policy mới này. Chưa chứng minh mọi thiếu hụt phụ thuộc ngữ nghĩa đều được owner nhận ra, hoặc việc tự chọn tool ảnh không cần thiết đã hết trong model run. Source-version refresh của discovery vẫn là finding riêng chưa sửa; không nới freshness để xử lý quyết định này.

## Verification sau sửa theo review

Base sửa `adbee7b0b08e42e5b0eb8db53b7a49e9460098d9`. Không đổi runtime sau reviewer APPROVE; phần bổ sung sau đó là documentation và verification.

- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-missing-information.test.ts`: trước runtime sửa,3 FAIL/11 PASS là RED đã quan sát.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-missing-information.test.ts src/single-agent-commerce-ingress.test.ts`:109 PASS cuối cùng, reviewer chạy độc lập cùng kết quả.
- `pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/single-agent-semantic-verifier-boundary src/track-b-protected-claim-boundary`:571 PASS /21 files.
- `pnpm --filter @lana/worker build`:PASS, gồm dependencies.
- `pnpm --filter @lana/worker lint`:PASS.
- Reviewer: `node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs`:17 PASS, cùng diff-check PASS.
- `node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"`:161 PASS.
- `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit`:PASS sau build dependencies; đây là direct typecheck, không ghi là chạy lại script pretypecheck.
- `pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts`:21 PASS.
- `git diff --check`:PASS.

Không tăng role/layer/budget/generation/retry hoặc bỏ verifier/final gate. Không có provider, database hoặc live run mới; review không phải bằng chứng sales acceptance/stability/B GO.
