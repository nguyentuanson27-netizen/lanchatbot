# Independent implementation review — Phase B input/context

Ngày 2026-10-25. Reviewer `/root/review_input_context_plan`. Review code theo yêu cầu owner; không gọi provider/live DB, không sửa implementation. **Kết luận trên exact HEAD ban đầu: REVISE.** Follow-up: hai bug và gap regression Outbox đã được implementer sửa trong worktree và reviewer kiểm lại. Ba findings đã đóng trên phạm vi diff/test nêu dưới; không đổi kết luận lịch sử HEAD228 hoặc nhận là đã review một commit mới chưa tạo.

- Base `72ecbe39b75a98e7612f8d5b148ec532ee3547c4`.
- Exact reviewed implementation HEAD `228ef27c934a57a9d8f72c0babd90399434d351b` (P1 `41a9f1ff`, P0 `7cf144a8`, P2 `228ef27c`).
- Plan revision 2 SHA256 `afb88437c1530ae57ddd34d97713fe4d68d5ab4be4cbfb8337a6dcb90ce36321`.
- Đọc diff base→HEAD, revision 2, consumer wrappers, producer/reader/projection, adapter và tests mới. Trong phần đầu giữ source HEAD ổn định; sau khi báo findings, implementer sửa hai file read-only-tools và tests. Follow-up bên dưới ghi riêng, không đổi kết luận lịch sử của HEAD228.

## Findings và trạng thái

### R1 — P1: batch fetch chạy trước permission/privacy/argument guard — đã sửa trong worktree

Tại HEAD228, `apps/worker/src/single-agent-commerce-read-only-tools.ts:349–358` tạo catalog promises trước khi `invoke` kiểm permission, privacy, BOT ownership và tool arguments. Một call cuối cùng bị REJECTED vẫn đã đọc nguồn. Diagnostic local với `permission=false` xác nhận `result=REJECTED/PERMISSION`, `catalogReads=1`. Không quan sát leak vào model, nhưng đây là regression source-access guard và accounting.

Fix cần có: kiểm authority và read args trước tạo promises; recheck trước consume; malformed call không thừa hưởng nguồn đã fetch của sibling hợp lệ; source failure/undefined không gây hidden reread.

**Follow-up:** đã đọc bản sửa worktree có `permitted()`, shared `readArgs`, revalidation trước consume, source undefined/null thành failure thay vì optional loaded fallback. Targeted tests chạy lại 79 read-tools PASS. Finding này không còn mở trên diff đã kiểm; chưa gọi đây là approval một commit mới vì source chưa commit.

### R2 — P2: COMPARE bị guard của legacy full expansion từ chối — đã sửa trong worktree

Tại HEAD228, `single-agent-commerce-read-only-tools.ts:170` kiểm `!query.offerType && availableOffers.length>8` trước `selectedOffers`. COMPARE có offerTypes nhưng không có offerType nên dù chỉ chọn hai offers và một parent vẫn bị SUBJECT_BOUND khi nguồn có chín offers.

Diagnostic source fixture chín offers/chọn AO,CV: trước1subject, REJECTED/SUBJECT_BOUND, sau1subject. Đây là edge contract bug, không phải bằng chứng catalog của run trước có chín offers.

Fix cần có: guard full expansion chỉ áp dụng legacy unscoped read; explicit COMPARE tính cap trên tập offers yêu cầu, không truncate nguồn hay tự đổi sang SINGLE.

**Follow-up:** worktree đổi guard thêm `!selectedOffers`, có regression explicit compare. Đã kiểm diff và chạy focused tests. Finding này không còn mở trên diff đã kiểm.

### R3 — P2: test P0 chưa đi qua writer/transport thật của metadata mới — đã bổ sung và kiểm lại

`apps/worker/src/single-agent-commerce-ingress.test.ts:441` thực hiện real effect/recovery, nhưng `commitWithinTransaction` là mock; test lấy metaPlan rồi **tự encrypt** message+publicCartSummary để seed reader. `packages/database/src/realtime-runtime.test.ts:43` cũng tự tạo payload. Vì thế cả hai đều bỏ qua thay đổi writer ở `realtime-runtime.ts:3630–3633` và transport strip ở `:2723`.

Code nhìn thấy đã đặt metadata cạnh encrypted payload và strip trước transport, chưa tìm bug trực tiếp tại đó. Nhưng acceptance revision 2 yêu cầu producer→durable accepted→reader, không seed event vượt bước chứng minh. Tests hiện tại vẫn PASS nếu writer quên ghi field hoặc transport quên strip metadata; đây là gap đáng sửa vì payload chứa IDs/binding chỉ dành cho nội bộ.

**Sửa cụ thể:** thêm bounded test gọi actual commit writer với transaction/pool giả hiện có, lấy đúng ciphertext được INSERT; dùng actual `readMetaOutboxPayload` để chứng minh payload transport chỉ có TEXT/text; chuyển chính row đó sang SENT_ACCEPTED rồi gọi `readAcceptedCommerceCartSummaries`. Assert metadata survives writer, không ra transport, hash binding đúng, chưa accepted thì không thành history. Thêm negative messageHash/sequence/customer binding/expired payload và fake private field. Không cần live DB hoặc provider để kiểm seam này. Các test hiện có vẫn giữ để kiểm both-model consumer.

**Follow-up R3 CLOSED:** test `writes public recovery metadata through the actual Outbox writer, strips it for transport, then reads accepted numeric history` gọi actual `store.commit`, lấy cipher fields từ INSERT meta_outbox, dùng chính row qua `claimMetaOutbox` (transport decryption) và accepted-history reader. Không tự encrypt payload ở test xuyên chuỗi này. Pending không thành event; message transport khớp exact TEXT/text; accepted event có số tiền/hash khớp và không mang plaintext. Reader negatives bổ sung hash mismatch/private field/no marker/expiry, transport strip có case public-summary. Reviewer đọc diff và chạy targeted command dưới, PASS. Không dùng pool giả này để claim SQL/live PostgreSQL đã integration-tested; nó đóng gap producer serialization→transport/read projection yêu cầu ở review.

## Phần đã xem là phù hợp thiết kế

- P0 chỉ giữ số tiền thực sự được code summary nói: grandTotal và discount khi có; không tự thêm subtotal/ship amount chưa được nói riêng. Numeric schema strict không nhận title/color/name/address tự do. Event nằm ở untrusted communication history của cả owner/verifier, không sửa effectReceipts hoặc current quote authority.
- Reader giới hạn30 source rows/2events, scope và message hash, accepted status, expiry; không backfill arbitrary BOT text. Adapter strip metadata trước provider serialization đúng hướng. Public history không tự cho phép báo effect mới.
- Metadata projection giữ text/correction, hai events tối đa768bytes, shared allowance1024 và history4096. Dedup theo event/hash; current quote độc lập khi event bị bound. Giới hạn coverage được giữ rõ, không claim phục hồi mọi history.
- P1 wholeLook không tự suy từng part. `componentKnown=false` không phủ định wholeLook; không mở quyền claims về chất liệu/độ kín.
- P2 native contract SINGLE/COMPARE/DETAILS_ONLY thay null expansion; original signed functionCall content giữ nguyên, chỉ domain args được map. State wrapper đã chuyển remote reads qua base batch. Batch admission theo input order, source clone theo product, readback vẫn kiểm lại. Không tăng tool budget, không generation retry.
- Diff prompt bỏ qua line-ending chỉ đổi hai reference theo tool contract, không thay giọng/policy/ví dụ bán hàng. P3/P4 deferred phù hợp phạm vi.

## Verification reviewer thực chạy

1. Read-only git status/HEAD/diff/hash, source/tests/plan reads.
2. Hai Node diagnostics local tại HEAD228: permission false vẫn1catalog read; COMPARE2 trên9offers bị SUBJECT_BOUND. Không provider/network.
3. `pnpm exec vitest run src/single-agent-commerce-public-history.test.ts src/single-agent-commerce-read-only-tools.test.ts`, cwd apps/worker: lần đầu **74/74 PASS** (2+72) trên HEAD228; suites lúc đó chưa phủ hai bug diagnostic.
4. Cùng command sau fix worktree: **81/81 PASS** (2+79), exit0. Không chạy full suite/build/typecheck riêng trong review, không nhận các lệnh implementer báo là do reviewer chạy.
5. Follow-up R3: `pnpm exec vitest run src/realtime-runtime.test.ts -t 'writes public recovery metadata'`, cwd packages/database: **1 PASS, 55 skipped**, exit0. Đây là targeted test, không claim 56 PASS.

Exact follow-up file SHA256 (chưa commit lúc kiểm): read-only-tools.ts `64c65396bbb3ff1768fecf3a45b1e1def1a7a0ab375cfef34bcb18e15abf1747`; read-only-tools.test.ts `940a778a5a696b7ca6c92533bb4cd9684f1b4d5ccdcac4e3491d3bf075e6c6be`.

R3 follow-up `packages/database/src/realtime-runtime.test.ts` SHA256 `0645a5f2a0ee992b305c70ca8522d3bcd3dbdb2ea944c98e236dfd30c507cc35`.

Review không chứng minh provider sẽ chọn đúng scope hoặc lời tư vấn tốt hơn. Model run mới vẫn cần seal source/config và denominator đã đăng ký. Không live send/deploy. Implementer ghi fix evidence/commit và final checks; không đổi báo cáo HEAD228 thành APPROVE mà không review bản mới. Không còn finding mở trong ba mục đã review sau follow-up bounded này.
