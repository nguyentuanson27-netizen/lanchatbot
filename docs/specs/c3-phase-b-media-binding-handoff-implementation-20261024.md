# Phase B — implementation binding ảnh và handoff thiếu chart

Lịch sử source871ba419 bên dưới. **Acceptance tiếp theo đã hoàn tất trên af482367:** T1/T2 PASS, đủ51native +17controls; B chưa GO vì các residual ngoài hai target. [Báo cáo hiện hành](../../apps/worker/evals/single-agent-commerce-read-only/media-size-acceptance-20261024/CHECKPOINT_B.md). Không dùng các dòng “chưa chạy model” bên dưới làm trạng thái source mới.

**IMPLEMENTED_WITH_RESIDUALS; chưa chạy model, B chưa GO.** Owner yêu cầu triển khai [kế hoạch sau independent review](c3-phase-b-media-binding-handoff-plan-20261024.md). Implementation base `db4f2dbb`; savepoints `59861c86` (binding), `6bad1143` (atomic mixed group), `871ba419769ece9bd17b089959ac0409355c7a31` (self-review corrections). Không có independent implementation review trong lượt này; không dùng review kế hoạch làm approval cho code.

## Thay đổi

1. Recovery ảnh dùng đúng mã được source resolve của lượt hoặc tên đầy đủ từ source xuất hiện nguyên nghĩa đen trong tin hiện tại; khi không có hint mới, giữ focus hợp lệ hiện hữu. Binding không ghi focus giả vào state, không lấy productId từ rejected draft, không coi selected asset hoặc mọi boundSubject là ý khách. Nhiều tên/mã hoặc mã/ads không resolve thì không cấp recovery mới; unknown code không rơi về focus cũ. Dùng normalize/token boundary hiện hữu, không diễn giải ngữ nghĩa hay tên rút gọn.
2. Automatic NO_VERIFIED_CHART recovery được chuẩn bị ảnh độc lập khi nguồn handoff có holding reply. Trước commit kiểm snapshot/readback, request/recipient/revision, Inbox hiện hành, authority, expiry và PRODUCT_MEDIA claim đúng product/URL/version. Deduplicate ảnh theo identity. Explicit handoff do customer/model không mở nhánh này; silent policy không tự nhận thêm tin.
3. Handoff port nhận optional code-prepared media. Một transaction chứa ownership HUMAN, handoff event, tag intent, Inbox completion và một protected Outbox response group: lời dẫn ảnh tĩnh hiện hữu → ảnh → holding reply từ policy. Readiness kiểm claim set/product/URL/payload; ảnh sai hoặc partial Outbox làm rollback, không effect retry. Ingress không tạo group BOT thứ hai sau group đã commit.
4. Self-review bổ sung kiểm policy identity và authority ngay trong transaction trước commit, thay vì chỉ lúc prepare; source/state/InBox thay đổi sau prepare chặn cả nhóm. Vẫn áp dụng CAS/fence hiện hữu. Không thêm bảng/service/schema migration hoặc production wiring.
5. Giữ owner/verifier prompts, provider/config, corpus, fallback text/IDs/hashes và generation/tool budgets. Dùng lại `C3_B_VERIFIED_MEDIA_V1`: “Em gửi chị ảnh của mẫu để mình xem trước nhé.” Handoff text theo rule hiện hành, không thêm policy vào prompt.

## Observed RED → GREEN và self-review

- Test first-contact + source title + focus null bị FALLBACK MEDIA_UNAVAILABLE thay vì ảnh; code-token control đã PASS trước sửa. Sau T1 cả hai qua, sau đó kiểm thêm ambiguous/not-requested/shortened title/unresolved ad.
- Test mixed đã sửa kỳ vọng có protected group tại chính handoff transaction: RED vì `metaPlan` không tồn tại tại handoff commit. Sau T2 GREEN với configured holding policy; default silent giữ nguyên.
- Thêm negative controls source/HUMAN/revision/Inbox/unknown transaction, customer-requested handoff không ảnh, claim sai URL, stale validator và truncated intents. Kiểm hai selection cùng một ảnh không gửi trùng, size input sửa đúng trong 2 owner generations/6 calls.
- Self-review bắt thêm unknown code + old focus vẫn có ảnh: observed RED; sửa recovery hint độc lập với fallback focus. Existing ad extractor còn tìm mảnh trong chiều cao/cân nặng; chỉ literal whole code hoặc resolved code được dùng làm hint. Không thêm parser số đo. Policy thay trước commit có test chặn nhóm.
- Lỗi test fixture ads thiếu nullable fields đã sửa. Typecheck/build lần đầu báo readonly claims fixture không gán được mutable array; sửa bản sao array rồi chạy lại. Không gọi các lần đầu này PASS.

## Kiểm tra thực chạy

Final source bytes tại `871ba419`:

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-state.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/single-agent-commerce-persistence.test.ts
# 247 PASS / 7 suites; gồm 65 ingress, 18 handoff, 15 persistence, 56 boundary, 35 state, 28 media, 30 read-only.
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/delivery-capture.test.mjs apps/worker/evals/single-agent-commerce-read-only/feedback-controls.test.mjs
# 92 PASS. Fake providers/control mechanics, không phải provider 17-controls PASS mới.
pnpm --filter @lana/worker lint
# PASS; package command là tsc --noEmit.
pnpm --filter @lana/worker --config.enable-pre-post-scripts=false build
# PASS; tsc worker, dependencies đã build trong các full pretypecheck/prebuild trước.
pnpm --filter @lana/worker --config.enable-pre-post-scripts=false typecheck
# PASS trước self-review policy correction; final lint trên cùng compiler kiểm lại sau sửa.
node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs
git diff --check
# PASS.
```

Không chạm shared package source; không claim full repo tests, remote CI, provider chất lượng hoặc latency mới. Tổng unique local tests 339, không cộng các lượt chạy lại thành nhiều ca.

## PostgreSQL / capture

Existing audited `source-session.py` route: source policy đọc từ live bằng connection read-only; tạo database test tên `c3_b_test_<random>` để kiểm domain inputs giả lập. Meta adapter là capture transport, không live Send API. Không owner/verifier API generation, không Vertex credential fetch. Các model outputs dùng fixture deterministic, không làm bằng chứng model tư vấn tốt.

Commands đã dispatch (root ngoài repo `C:/Users/nguye/Documents/Sản phẩm AI/c3-media-handoff-checks-20261024`):

```text
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <root>/cod COD --candidate-handoff
# Intermediate working source: 37 PASS, DB dropped.
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <root>/cod-final COD --candidate-handoff --composed-only
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <root>/bank BANK_TRANSFER --candidate-handoff --composed-only
# Intermediate source6bad1143: 23 PASS mỗi mode, cả hai DB dropped; không gọi exact-final-head coverage.
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <root>/final-cod COD --candidate-handoff --media-handoff-only
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <root>/final-bank BANK_TRANSFER --candidate-handoff --media-handoff-only
# Final sealed executable871ba419, kết quả retained trong evidence bên dưới.
```

Final filter chỉ chọn năm kiểm tra liên quan: first human request; first size-rule handoff; mixed ảnh+size một group, capture chính xác và drain hai lần không trùng; source change trước commit không partial intents; mất provider link rollback ownership/event/ảnh. Không tự nhận filter này là full B hoặc full integration suite.

## Chart identity giữ gap

| Identity còn thiếu | Producer/nguồn đã trace | Consumer/giới hạn |
| --- | --- | --- |
| Brand có authority của product | POS snapshot có brand; stable catalog/Qdrant không cung cấp cùng identity | `sizeChartTarget` dùng LANA; chưa có mapping được xác nhận sang La.na Design |
| Parent/offer/component target | Catalog hiện không cấp đủ BOM/offer target identity cho chart | SQ2447 khác category/component; SV2447 khác parent scope |
| Chart được phép áp vào đúng món | Published policy có chart nhưng existence không chứng minh applicable | `evaluateSizeChartEligibility` tiếp tục NO_VERIFIED_CHART khi không khớp |

Kế thừa [audit 23/10](c3-phase-b-source-contract-fix-implementation-20261023.md#chart-authority-giữ-gap-có-chủ-đích); chưa refresh/publish upstream chart và không sửa brand/alias/category để ép fit.

## Giới hạn phải giữ khi đọc kết quả

- **Ca gallery raw cũ chưa được chứng minh hết fallback:** source title là “Set váy Thạch Thảo”, khách gọi “set Thạch Thảo”; catalog aliases không cấp tên rút gọn đó. Exact full-title/code controls qua không tự cấp binding cho tên rút gọn. Giữ fail-closed khi chưa có identity có authority; không thêm quy tắc bỏ chữ “váy” để fit ca. Bản sửa không thay raw run cũ thành thành công.
- Code chỉ thêm mixed group khi ảnh đã qua selector và binding đúng, holding policy cho phép. Nếu không đủ, handoff chuẩn tiếp tục; không khẳng định mọi ca media+size sẽ có ảnh hoặc đã chọn được size.
- Current-source/readiness validation diễn ra trước persisted eligibility/commit. Delivery tái dùng response-group gate hiện hữu trước sequence0 (blocking tag/read-error fail-closed); chưa nối một nguồn fresh catalog revalidator sau commit qua process restart. **Không claim đã chứng minh source/state đổi bất kỳ lúc nào trong khoảng sau commit–trước delivery đều bị chặn.** Phần acceptance mạnh hơn này của plan vẫn residual, không mở generic delivery framework trong patch này.
- Không cải thiện/đánh giá lại giọng hay sức thuyết phục bằng các test code. Các advice findings cũ vẫn còn. Không tools-off/context cleanup hoặc nới verifier để cứu tỷ lệ.
- Không chạy provider T4/full51/controls17 mới, không deploy/live send/merge. Chưa B GO; provider run sau cần seal/preflight đúng source và ghi rõ residual trên trước khi diễn giải prefix.

Hai job final đã kết thúc exit0, mỗi mode **5/5 PASS**, source871ba419/sourceDirty=false. Không đổi executable trong hai job. Cả năm database của lượt kiểm tra đã dropped; 0 provider generations. [Validation](../../apps/worker/evals/single-agent-commerce-read-only/media-binding-handoff-checks-20261024/VALIDATION.json), [raw hashes](../../apps/worker/evals/single-agent-commerce-read-only/media-binding-handoff-checks-20261024/RAW_HASHES.json) giữ năm integration reports và hai command logs byte-for-byte. Các assert kiểm actual capture/group/ownership; không biến deterministic fixture replies thành lịch sử provider mới.

Archive diff-check đầu báo CRLF của hai raw logs là trailing whitespace; giữ bytes/hash và dùng attribute `whitespace=cr-at-eol` chỉ cho raw log directory này, rồi kiểm staged diff lại. Không sửa log để làm kết quả đẹp hơn.

**Recommendation:** giữ bản sửa có giới hạn, chưa B GO. T1 còn tên rút gọn không có authority; T2 đã atomic group tại commit nhưng acceptance revalidation sau commit–trước delivery chưa đóng. T3 local/DB checks đạt trong phạm vi nêu trên; T4 NOT_RUN. Không claim toàn bộ kế hoạch đã hoàn tất hoặc reviewer đã approve implementation.
