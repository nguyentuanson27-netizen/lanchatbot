# POS refresh và owner wire — implementation/evidence

Base `106d0c341f1e5f2e47e8850916c33cfc063f666f`; [plan](c3-phase-b-pos-refresh-wire-plan-20261026.md). Candidate only, no production/source-store writes or deploy.

## Review phương án và thay đổi

Cùng reviewer độc lập REVISE revision1/P2: full parsed raw khác không bảo đảm trusted hash khác vì có fields chưa chiếu. Revision2 thêm sticky direct invalidation, latest-seen monotonic, unknown passthrough/version negative tests; reviewer APPROVE trước implementation. Regression sau đó giúp thu hẹp pin chỉ tại full readProduct: metadata-only prepare/search/DETAILS_ONLY giữ offer-only invariant, không bắt lượt xem ảnh phụ thuộc giá/tồn chưa dùng. Reviewer nhận refinement hợp lý, chờ review executable cuối.

createReadOnlyTools giữ request-local per-product original parsed POS snapshot cùng full fingerprint bỏ duy nhất root synced_at. Giữ mọi trường còn lại, gồm strict root và passthrough nested. Lần full read mới phải là nguồn thật, đúng scope/status, fresh/nonfuture, observed không lùi so với latest seen. Resolve claims/filter/presentation từ clone observation gốc khi equality đúng; không ghi lại nguồn hoặc đổi clock. Original expiry khôngrenew. Anyotherfield, invalid/null/future/stale/rollback/originalexpiry hoặc source error sau pin làm bridge invalid đến hết request, kể cả nguồn hồi phục. Direct read và staged batch lỗi đều covered. Final gate/hash/draft/permission/privacy/recipient/state/receipt contract không thay.

Hai tool descriptions trong Gemini owner wire được đồng bộ với silent handoff: request_handoff không dạy model trả partial; select_product_media không dạy giữ reply khi thiếu ảnh bắt buộc phải chuyển. Giữ prepared-vs-committed distinction, source of authority, call budget, lịch sử và receipts. Không rewrite prompt tư vấn, đổi model/verifier/corpus hoặc thêm role/router/regex/repair loop. Chưa chứng minh cải thiện giọng; full model sẽ review outcome thực tế.

## RED → GREEN thực chạy

- New POS refresh suite trước code: 28 FAIL/2 PASS trên30 tests; actual-wire test FAIL vì declaration cũ bảo trả phần đã biết. Sau sửa suite30 PASS; wire test có thêm lỗi test-fixture AbortSignal clone đã sửa bằng so dữ liệu không so object signal.
- Self-review bổ sung source throw direct/batch: observed RED2/30PASS trước fix, GREEN32 sau sticky source-error fix.
- Broad suite đầu616 có16 failures chủ yếu do old tests đợi changed context thay vì direct failclosed. Đã cập nhật đúng requirement; metadata-only price-change invariants được giữ bằng cách thu hẹp pin, không đổi chúng để nhận thêm dependency. Unknown-region ETA check chuyển trước khi cố tình invalid request, không bỏ assertion.
- Final focused worker636 PASS/23files (commerce+boundary+track-b-protected), Node commerce190 PASS, protected-claims/reply-assembler21 PASS. Worker build exit0, direct TypeScript exit0 sau source-error fix, worker lint exit0. Không cộng suite overlap thành số test duy nhất.
- PostgreSQL targeted3 PASS trên working tree đã build: synced_at-only source refresh exact verified reply capture sau restart/drain2, stock-change và expired giữ handoff/failclosed. Database test dropped; không gọi working-tree evidence là exact committed source qualification. Full DB exact-source qualification và reviewer approval sẽ cập nhật sau savepoint.

Commands thực chạy:

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-pos-refresh.test.ts --reporter=dot
node --test --test-name-pattern='actual owner wire describes silent' apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/single-agent-semantic-verifier-boundary.test.ts --reporter=dot
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts --reporter=dot
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts --reporter=dot
pnpm --filter @lana/worker build
pnpm --filter @lana/worker exec tsc -p tsconfig.json
pnpm --filter @lana/worker lint
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <fresh-external-output> COD --composed-only --candidate-handoff --check-prefix 'B composed snapshot invalidation '
```

## Preregistration và giới hạn

[Campaign](../../apps/worker/evals/single-agent-commerce-read-only/pos-refresh-run-20261026/PREREGISTRATION.md):17controls+51native, target22→full29, max217requests,N1/retry0. Same models/config/prompt, frozen cases và actual request labels firewall; seal clean source sau executable APPROVE. Chưa provider ở savepoint này. Raw source-change fixture là structural reproduction đủ entire parsed snapshot, không giả lấy được snapshot lịch sử của race cũ từ diagnostic bị giới hạn.

Không pin media/cart selection/policy/static catalog/state/receipts, không nới freshness ở delivery hoặc dùng PASS cũ authorize changed world. Một field POS không liên quan thay đổi trong full read vẫn sẽ failclosed do conservative full equality; không tự giới hạn ở PRICE/STOCK để nâng pass rate. B chưa GO, giọng vẫn residual; rollback qua revert commit mới trên candidate, không runtime mutation.

## Exact source closure và full model

Reviewer APPROVE `468d85ea6577c428cf2f6f155c9774926537364b`, độc lập168worker+69wirePASS. Source sạch/không đổi; PostgreSQL49COD+49BANKPASS trênexactHEAD, cả2testDBdropped. Node190PASS được chạy lại exactHEAD. Sau đó mới dispatchprovider; không thay executable/config/prompt/corpus trong campaign.

Đủ17controlsPASS+51native, target22 được parent/reviewer review trước mở29. Model37eligible/10newhandoffsilent/4NO_SEND,142requests/0errors/0labelprivateleak/6DBdrop; allnewHANDOFF đềuHUMAN/eventtag/0newOutboxcapture. Timestamp refreshonly đã chứng minh deterministic; modelcase449kM eligible không chứng minh live refresh đã xảy ra. Discoverydraftkhôngbóbụng vẫn bịverifierchặn đúng, galleryhandoff vìảnhđúngmàuchưađủbinding; checkoutquestionspreview/confirm hoạtđộng. Voiceconcern/correction vẫn yếu. ReviewerAPPROVEscopedevidence, toànBchưaGO. [Full report/evidence](../../apps/worker/evals/single-agent-commerce-read-only/pos-refresh-run-20261026/CHECKPOINT_B.md).

Actual owner wire audit cũ87requests có44handoff/42media instructionconflicts; mới87 có0 cảhai. Chỉchứngminhcontradictionremoved, khôngclaimcausalvoiceimprovement. Historical fullrun count đínhchính11newevents(10silent+1ACK), vì humanrequest làjourneyriêng, khônginherited; raw/terminalcounts/STOPgiữnguyên. Không tựfixstyle/runvòngmới/deploy.
