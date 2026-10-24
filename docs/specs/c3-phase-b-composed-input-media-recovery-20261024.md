# Phase B — ghi số đo trong yêu cầu size, chứng cứ ảnh và phục hồi ảnh

Base: `7d9bca7e2dd4b0f52a14fe8be13c753d745d0097`. Owner yêu cầu “thực hiện sửa đi” sau review campaign execution-media-run-20261024. Implementation + self-review + deterministic checks; chưa chạy provider. A vẫn OWNER_BYPASS, B chưa GO.

## Căn cứ và thay đổi

Campaign trước chạy 52/77 outcomes: controls 23, advice 8, native 21;25 native NOT_RUN. 16 native eligible có 7 câu còn vấn đề tư vấn. Không quy lỗi giọng cho code execution từ N1. Ca media+size không chạy trong campaign liền trước reviewed-feedback-run-20261023: nhãn regression trong report cũ không chứng minh so sánh hai lượt liền nhau. Giữ raw/report cũ; so sánh mới phải chỉ rõ artifact đối chứng.

1. recommend_size nhận optional customerStateOps, tái dùng schema/writer của apply_customer_state. PRODUCT ref được xác nhận trước ghi. Code kiểm toàn patch, CAS, đọc lại, tạo receipt rồi mới chọn size. Reject/commit chưa rõ không cấp fit. Batch hai writer, kể cả inline+riêng, bị từ chối. Signed native history giữ nguyên; chỉ execution enum đổi sang domain path. Một explicit update-and-size là một tool call; cap 3 generations / 2 rounds / 6 calls giữ nguyên. Không parser số đo mới, không bỏ sourceQuote.
2. Selection và snapshot cấp cùng descriptionEvidence: imageIndex, góc/loại, feedback, confirmedParts và componentKnown. Không suy vật liệu nhìn thấy từ mô tả vải của sản phẩm; UNKNOWN không chứng minh phần ren. Color null là chưa xác nhận, không phải ảnh không tồn tại. Không thêm asset IDs vào owner projection.
3. Persisted ingress có đường code-owned phục hồi ảnh đã chọn khi draft thất bại. Giữ FALLBACK và original reason. Chỉ ảnh thuộc currentProductId, khớp claim product/URL canonical hash/source version, snapshot readback không đổi, hardPrecheck đạt, BOT còn quyền/privacy và Inbox current. Dùng lời dẫn cố định C3_B_VERIFIED_MEDIA_V1 cùng ảnh trong một protected response group, qua readiness/transaction/Outbox hiện hữu. Không lấy đoạn nào từ rejected draft, không generation/reverify. Không phục hồi qua STALE/NO_SEND/HANDOFF/state chưa xác nhận; không tự gửi ảnh món thay sau draft FAIL.
4. Đã chọn ảnh hoặc đã yêu cầu loại cụ thể mà không thể gửi thì dùng C3_B_MEDIA_UNAVAILABLE_V1, không hỏi lại tổng thể/cận. Chỉ FEEDBACK chưa chọn được ảnh vẫn có thể dùng câu hỏi hiện hữu. Hai ID/text/hash mới nằm trong manifest, protocol đối chiếu code-owned text.
5. Schema verifier mới yêu cầu excerpt nguyên văn tối đa 256 ký tự và basis mô tả sai khác tối đa 320 ký tự cho mỗi violation. Gate kiểm excerpt thuộc exact draft, bounded/PII/ref và PASS không kèm violation. Metadata diagnostic chỉ dùng review, không gửi khách. Parser vẫn đọc legacy 2 fields cho evidence cũ; run mới cấp schema 4 fields. Không chain-of-thought, role hoặc review model mới.

Owner prompt chỉ đổi cách truyền input size; verifier đổi giải nghĩa metadata ảnh và diagnostics. Models/config/retries/corpus/labels/rubric giữ nguyên. Mô tả nguồn rút gọn chưa promote; không thêm chỉ dẫn giọng hoặc ví dụ theo ca.

Đường phục hồi ảnh là thay đổi có chủ đích so với mục hoãn recovery trong plan 20261023, theo owner yêu cầu triển khai hướng xử lý mới. Không ngầm mở generic prose/fact recovery hoặc ảnh sau HUMAN handoff.

## Self-review và giới hạn

- SourceQuote vẫn đòi đoạn nguyên văn chứa đúng một giá trị. Sửa này giảm số lệnh phải ghép, chưa chứng minh model hết trích sai. Test mixed tái hiện sai quote rồi corrected inline call đến no-chart/handoff trong budget.
- Fallback có ảnh vẫn là kết quả từng phần, không semantic/quality PASS. Thiếu câu trả lời giá/size vẫn phải chấm thiếu.
- Generic recovery giá/tồn chưa triển khai: dữ kiện còn trong snapshot nhưng không dựng câu giá thay draft FAIL. Không claim hoàn thành mọi mixed intent.
- Chart authority/scope vẫn gap; không alias/publish/chọn size giả. Không gửi ảnh sau chuyển HUMAN.
- Không thêm lời nhắc giọng văn. Advice diagnostic runner hiện có tiếp tục dùng để kiểm quyết định mua/lý do/bước tiếp theo/giọng trên cùng input; chưa có bằng chứng cải thiện provider mới.
- Ingress tests dùng fixture transaction/Outbox; không phải PostgreSQL integration hay capture thực. Không provider/live send/deploy/independent review trong lượt này.
- Self-review bổ sung guards khác product, pending state, nguồn/revision/human; sửa URL hash phải dùng canonical hash như producer. Một lỗi build do test chưa narrow union đã sửa. Một lỗi adapter test do fixture chưa bind PRODUCT đã sửa; không đổi runtime để chiều fixture.

## Verification

Observed RED: 5 test state/media/ingress fail trước implementation; 1 diagnostic test fail trước parser change. Sau sửa các nhóm GREEN. Kết quả cuối: worker 283 PASS / 7 suites; Node 95 PASS / 6 files; business-tools 64 PASS / 5 suites. Worker typecheck và build PASS. Worker lint và git diff --check PASS. Không claim remote CI hoặc provider PASS.

Commands thực sự chạy:

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-state.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/feedback-controls.test.mjs apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.test.mjs apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs apps/worker/evals/single-agent-commerce-read-only/source-layout-preparation.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/image-selection.test.ts src/qdrant-image-channel.test.ts src/size-engine.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Run mới cần clean source seal/preflight, không dùng controls PASS cũ. Ưu tiên mixed media+size, unknown component, color binding, source/state/permission changes và actual fallback attachments. Advice chấm nguyên reply, không keyword; không thay rubric để cứu kết quả. Đây là implementation, không provider qualification.
