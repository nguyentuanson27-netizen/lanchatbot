# Phase B — implementation input/context revision 2

Ngày 2026-10-25. **IMPLEMENTED / INDEPENDENT REVIEW FINDINGS FIXED; chưa provider run, B chưa GO.** Owner yêu cầu implementation → review độc lập → fix. Base `72ecbe39b75a98e7612f8d5b148ec532ee3547c4`; [plan revision 2](c3-phase-b-input-context-improvement-plan-20261025.md), [independent plan REVISE](c3-phase-b-input-context-independent-review-20261025.md). Plan savepoint `e6e5e43d`, P1 `41a9f1ff`, P0 `7cf144a8`, P2 `228ef27c934a57a9d8f72c0babd90399434d351b`. [Independent implementation review](c3-phase-b-input-context-implementation-independent-review-20261025.md) ghi HEAD228 REVISE và ba findings đã đóng trên follow-up worktree, kèm hashes; không đổi kết luận HEAD228 thành APPROVE một HEAD chưa review. No deploy/live send/source publish/migration; production entrypoints không đổi. Candidate giữ một owner/tối đa một verifier.

## P0 — accepted public history và current quote

Code-owned receipt recovery công bố numeric summary metadata chỉ sau khi đủ điều kiện trả RECEIPT_BACKED_CART_SUMMARY. Ingress gắn scope, response group/sequence, cart/version và exact message hash vào payload mã hóa cùng Outbox transaction hiện có. Không có marker cho reply model tùy ý, private checkout hoặc ACK không có quote. Claim Outbox loại marker khỏi message trước transport; không gửi nội dung nội bộ cho khách.

`readAcceptedCommerceCartSummaries` đọc tối đa30rows đúng page/conversation/customer; chỉ accepted/delivered/read có messageId, payload còn đọc được. Kiểm recipient/group/sequence/hash và strict schema trước projection. Output chỉ có numeric record, UUIDcart/version, eventId/messageHash/acceptedAt; không trả plaintext, tên món, màu, size hoặc dữ liệu giao hàng. Data cũ không có marker không được backfill bằng đoán. Không cần migration: marker mới nằm trong encrypted JSON hiện có.

**Thu hẹp so với danh sách field dự kiến:** record chỉ giữ grandTotal và discount khi renderer thật đã nói mức giảm; không ghi subtotal/phí ship như thể khách đã được báo riêng từng số đó. Đây là communication history, không current price/effect authority. Cả owner và verifier nhận record trong untrusted acceptedCommunicationHistory; trusted/cartQuote/receipt gate không đổi. Không nạp receipt cũ khác revision, không sửa expiry. Nếu owner vẫn viết lời báo effect không có receipt hiện tại, verifier vẫn có quyền chặn; chưa tuyên bố chữa mọi câu đàm phán.

Giới hạn:2events/768bytes; metadata chung với memory ảnh tối đa1024bytes trong tổng history4096bytes/8textentries. Giữ text/correction trước, public event dùng phần còn lại rồi media dùng phần còn lại nữa. Dedup event identity, exact message hash đã có trong text; bỏ record toàn bộ khi thiếu dung lượng, không cắt nửa câu hay đẩy correction. Có dropped invalid/duplicate/bound/unavailable telemetry; reader fail không đổi thành fake firstContact. Current quote không phụ thuộc event còn nằm trong window.

Test producer→consumer dùng receipt recovery thật, ingress commit intent, encrypted persisted-payload reader sau accepted, rồi kiểm cả owner/verifier input lượt kế tiếp với history redacted. Đây là local test với store/query doubles; không nhận là actual PostgreSQL delivery hoặc một provider hội thoại mới.

## P1 — whole-look metadata

`descriptionEvidence` giữ flag wholeLook cho approved FULL_SET/FULL_LOOK/FULL_BODY, cùng confirmedParts hiện có. Whole-look không chứng minh từng component, chất liệu, màu hoặc kết quả sử dụng; componentKnown=false không xóa nghĩa whole-look. Cùng projection vào tool response và trusted media literal. Không mở visual inspection hoặc thêm quyền recovery từ referent chưa chứng minh.

## P2 — explicit read scope và batch admission

Native read_product yêu cầu SINGLE+offerType, COMPARE+2–3offerTypes khác nhau, hoặc DETAILS_ONLY. Native null/omitted scope bị reject; signed transcript giữ nguyên, adapter chỉ map execution args. Domain resolver cũ vẫn phục vụ legacy callers bằng args không scope như trước; current native route không tạo legacy null-all call nữa.

COMPARE chỉ giữ facts/variant subjects của các offer được chọn; DETAILS_ONLY trả content/metadata và notRead, không tự thêm giá/tồn. Domain readback giữ đúng args comparison. Batch read fetch nguồn một lần mỗi product, clone source, xử lý admission/commit theo input order; từng call toàn vẹn, call quá cap không giữ facts dở dang, call hợp lệ không bị rollback bởi call khác. Current caps và final freshness gate giữ nguyên. State wrapper chuyển independent catalog reads qua base.invokeBatch thay vì bỏ qua ordering mới.

Structural replay ba parents + hai full reads cho kết quả input-order cố định khi đảo network completion; explicit hai whole-set reads chỉ cần5subjects. Đây là bằng chứng code path, không chứng minh owner thật sẽ luôn chọn SINGLE hoặc ngừng gọi tool ở FINAL_REPLY. Không tăng rounds/calls/generations hoặc tự thực thi tool muộn.

Owner prompt chỉ thay hai reference đến contract đọc; không sửa phần giọng, bán hàng hoặc policy. Owner prompt hash mới `323b9c3c2ae272b03c26d4d41eeebbcb4842102e23ab63a9bf8cd4001d506e1a`; verifier prompt giữ `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`. Current manifest cập nhật; archived run inputs không đổi. Trước sửa declaration đã tra [official Google function calling](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling); schema dùng object/string enum/array/required. Chưa kiểm live API bằng generation request.

## RED → GREEN và kiểm tra thực chạy

- P1: test whole-look thiếu flag đã FAIL trước sửa; sau sửa media32PASS.
- P0: reader test FAIL `readAcceptedCommerceCartSummaries is not a function`; implementation qua test đó. Metadata module test ban đầu chưa load được module; không nhận failure này là bằng chứng hành vi privacy riêng. Chuỗi recovery/reader/request đã qua test sau implementation; privacy false positive nguyên bản đã được audit tái hiện trong review trước.
- P2:2tests explicit compare/details bị REJECTED trước sửa, sau sửa PASS. Native explicit selection test FAIL trước sửa execution mapping; sau sửa PASS.
- Worker focused13files **466PASS**: read-only tools/read-only/public-history/boundary/ingress/media/media-delivery/handoff/handoff-delivery/persistence/effects/state/session. Command có thêm hai tên file không tồn tại protected-claims/reply-assembler; chúng không được Vitest chạy, không tính thành PASS. Đã chạy riêng existing `track-b-protected-claim-boundary.test.ts`:18PASS. Follow-up ingress/public-history/protected110PASS.
- Database `realtime-runtime.test.ts shadow-mirror.test.ts chat-history.test.ts`: **72PASS**. Lần đầu build fail thiếu type meta_message_id; đã bổ sung type. Lần chạy suite đầu còn một expected cartId bị sửa nhầm trong test cũ; đã khôi phục, suite72PASS sau đó.
- Contracts `commerce-public-history.test.ts`: **8PASS** (reject arbitrary fields, bad money/cart identity).
- Node `protocol.test.mjs gemini-inference.test.mjs`: **82PASS**; thêm `b1-owner-prompt.test.mjs`: **85PASS**. Lần đầu protocol fail prompt hash sau reference edit, đã cập nhật current manifest rồi PASS.
- `pnpm --filter @lana/contracts build`, `pnpm --filter @lana/database build`, `pnpm --filter @lana/worker typecheck`, direct worker `tsc --noEmit`, worker build: **PASS** ở pre-review source. Worker build log ngoài repo `C:\Users\nguye\Documents\Sản phẩm AI\c3-input-context-worker-build-20261025.log`. Sau review fix đã chạy worker direct `tsc` emit build, worker lint, contracts typecheck, database direct `tsc --noEmit`: **PASS**. Không claim đã chạy lại full dependency-build graph lần nữa khi chỉ thay read-tools/test.

Commands chạy từ root, trừ các pnpm exec vitest cwd packages/database hoặc apps/worker được nêu rõ:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-public-history.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-handoff-delivery.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-session.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-public-history.test.ts src/single-agent-commerce-ingress.test.ts src/track-b-protected-claim-boundary.test.ts
pnpm exec vitest run src/realtime-runtime.test.ts src/shadow-mirror.test.ts src/chat-history.test.ts
pnpm --filter @lana/contracts exec vitest run src/commerce-public-history.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
pnpm --filter @lana/contracts build
pnpm --filter @lana/database build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
git diff --check
```

## Fix sau independent review và kết quả cuối

Reviewer phát hiện R1: batch prefetch chạy trước permission/privacy/owner và arguments. Thêm test cho cả bốn nhóm đã observed RED; shared readArgs và permitted guard nay kiểm trước tạo promises, revalidate trước consume. Source trả undefined trước đây có thể gây đọc lại hoặc DETAILS_ONLY báo OK; thêm RED regression rồi chuyển thiếu nguồn thành một UNAVAILABLE cho mỗi call, không hidden reread. Promise scheduling cũng bắt synchronous source throw.

R2: COMPARE hai offers vẫn bị legacy guard full expansion khi nguồn có hơn8offers. RED fixture9offers/chọn2 đã tái hiện; guard nay chỉ áp legacy unscoped expansion, explicit pair giữ3subjects/4claims. Metadata quá cap không dựng literal giả/truncate. Sau sửa read-tools **79PASS**; reviewer độc lập chạy read-tools+history **81PASS** và đóng R1/R2 trên diff đã kiểm.

R3: test đầu chưa đi qua actual encrypted writer. Bổ sung `writes public recovery metadata through the actual Outbox writer, strips it for transport, then reads accepted numeric history`: actual store.commit/insertMetaPlan → ciphertext SQL args → claimMetaOutbox trả đúng public message → pending chưa có history → accepted row reader có numeric event. Không tự encrypt để bypass writer; transaction/query là test double, không phải actual PostgreSQL. Reviewer đã chạy targeted1PASS/55skipped và đóng R3. Bổ sung negative exact message hash, extra private field, marker thiếu, payload hết hạn và stripping khỏi customer message.

Final focused worker command gồm13files ở trên + `src/track-b-protected-claim-boundary.test.ts`: **491/491PASS**,14files. Final database ba files: **74/74PASS**. Contracts8PASS và Node85PASS retained, không đổi executable contracts/adapters sau các kết quả này. Typecheck/build/lint và diff check PASS theo phạm vi nêu trên. Không nhập6test mới FAIL vào số PASS; RED chỉ ghi evidence trước fix.

Lưu ý giới hạn telemetry: dropped counters mô tả record đã tới history projection; encrypted rows thiếu provenance bị reader loại trước đó không có counter riêng theo từng nguyên nhân. Không suy count=0 nghĩa mọi source rows đều hợp lệ. Dữ liệu cũ thiếu marker không được phục hồi.

Chưa chạy provider, actual PostgreSQL integration mới, remote CI, full worker suite, sales scoring hoặc stability qualification. P3/P4/search enrichment deferred. B vẫn chưa GO; zero-fallback của vòng cũ không qualify code mới. Các findings độc lập đã đóng ở follow-up file hashes trong report; chưa có provider outcome mới để kết luận tư vấn tốt hơn.
