# Independent review — hướng sửa sau owner-result screen

**REQUEST_CHANGES** cho phương án hiện tại. Reviewed source `f405a6f6a714b845e2723d14b53a08b5fc1c0588`; reviewer `/root/post_contract_input_review`. Review này chỉ tạo artifact; không sửa runtime/prompt/test hoặc gọi provider.

Bằng chứng13ca/27lượt vẫn STOP. Hướng giữ kiến trúc, bảo toànJ1/P07/state/checkout và bỏ vá giọng là đúng; cần thu hẹp ba điểm để không quay về vòng thêm metadata/engine mà chưa giải quyết authority.

## Những điểm cần sửa trong phương án

### NR1_J4_NO_NEW_NEGOTIATION_ENGINE — P1

The proposal combines an already implemented standard pre-cart quote with a potential pre-cart negotiation assessment. Only the first has an approved existing authority path. Simulating persisted negotiation before a cart would introduce new concession/event-consumption semantics, not merely expose missing context.

Remove new pre-cart negotiation/concession assessment from this repair. Reuse quote_product/read_policy and existing evaluateShopPolicy; expose source-derived parent-unit count/basis from the actual calculation where needed, not a second promotion engine or hard-coded5%. Keep missing-negotiation result UNKNOWN. Avoid creating a cart just to answer a price objection.

**Khi mở rộng:** Offering or reserving negotiated concessions before a cart requires an explicit business/event-ledger/expiry/consumption decision and new plan; not assumed authorized.

### NR1_P09_NO_MECHANICAL_CONSENT_PROOF — P1

Removing the contradictory tool declaration is justified, but sourceQuote existence, current-message binding or an owner-issued enum cannot prove semantic purchase intent. The verifier runs after effects and cannot undo an unwanted cart mutation. A plan that calls those fields authorization proof repeats prior metadata-as-authority errors.

Fix the competing declaration at its origin; keep read_product/customerSelected or existing retained-selection path as read/selection only, and keep clear purchase add_to_cart fast path. Do not add fields falsely labeled code-verified buying intent or use the post-effect verifier as a hidden pre-effect role. Acceptance must be behavioral: whole paired dialogues produce zero cart/CAS/event/receipt in the informational arm and exactly one correct cart change in the genuine buying arm, including a short answer completing a prior explicit buy request. This measures owner behavior; residual semantic intent risk remains even if observed cases pass.

**Khi mở rộng:** If owner requires deterministic prevention rather than measured behavior, a code-owned customer confirmation/postback flow or separately authorized pre-effect semantic design is needed. That changes UX/architecture and needs owner decision; do not silently force extra confirmation for every explicit buy.

### NR1_S16_REQUIREMENT_IS_NOT_SOURCE — P1

A customer-wearing request value is a useful domain constraint, but adding the enum cannot create source provenance or close the case where the owner incorrectly requests ordinary FEEDBACK. The actual stable image schema has no wearer-provenance field and descriptionEvidence unconditionally emits NOT_RECORDED.

Implement a truthful negative requirement path only in this revision: one narrow expressed customer-wearing requirement in the existing media tool (not both a new intent and redundant flag), check existing source metadata and report required provenance NOT_RECORDED/unavailable; use existing silent handoff recovery. Generic FEEDBACK remains usable for genuine feedback-only requests. Do not fabricate positive provenance or weaken this failed case by relabeling it. Explicitly retain the semantic omission risk when owner sends FEEDBACK/GENERIC instead; mandatory verifier must still evaluate the whole dialogue and exact reply, with safety controls for the observed implication. Source-gap is outside sales quality, not outside safety.

**Khi mở rộng:** Positive wearer capability requires an approved actual asset/provenance source, subject/component/hash/approval binding and schema/producer/consumer plan. Until then report not implemented; no mass data rewrite or synthetic wearer fact.

### NR1_MEDIA_DEDUP_KEEP_ALL_PROOFS — P1

Deduplicating by choosing one parent image would remove source/subject coverage and may bypass revocation for the other parent. The duplication is caused by combining identity and physical send dedup, not missing metadata.

Separate physical attachment list from complete selected evidence. Dedup only identical canonical URL plus source-content hash; retain every validated parent/source proof for opening coverage, protected claims and delivery binding. Do not infer alias equivalence from title or URL alone. Same URL with conflicting hashes/source facts must not pick a winner. Test one physical image for two valid refs, both proofs retained, revoke either source or change scope/permission after restart→whole group blocks; distinct assets remain distinct.

**Khi mở rộng:** A new shared coverage schema is not obviously required for same-asset proof preservation. If actual consumers require one-to-one image/message binding, amend that exact contract and test it rather than dropping proof.

## Kế hoạch tối thiểu đề xuất

### P0 Evidence and scope

Freeze prior205cd497/13case27turn evidence and current f405a6f6 baseline. Declare the new goal as J4 standard-price handling, P09 measured intent behavior, S16 missing-provenance terminal safety and duplicate physical attachment repair. Keep successes J1/P07/J2/P08/checkout as same-input controls; no voice overhaul, model/cap change or rerun authorization.

**Kiểm đủ trước khi kết luận:** All prior failure labels remain, no new source assumptions. Split deterministic contract acceptance, owner behavioral evidence and residual risks.

### P1 J4 existing standard pricing

Use existing quote_product/read_policy; enrich only the source-backed count-unit explanation returned from actual policy/calculation (effective parent-unit count and sourced set/combo counting rule). It must be policy-version/hash-bound and unchanged on readback. No synthetic cart, concession simulation, new tier or hypothetical discount result.

**Kiểm đủ trước khi kết luận:** One set quantity1 counts1; two parent-product units count2; three-piece combo counts1; quantity2 same parent counts2 where existing engine does. Totals/adjustments exactly equal existing engine on same inputs. Changed policy minimum/discount propagates without hard-code. UNKNOWN never becomes NO_SUPPORT or BEST_PRICE.

### P2 Mechanical negotiation retry reachability

Optional bounded suppression of record_negotiation only after a code-proved NOT_EVALUATED with unchanged prerequisites and current source/binding; permit again when actual cart/negotiation prerequisites change. This is reachability/work saving, not intent classification or a no-support conclusion. Do not globally remove current same-batch add→negotiation capability without regressions.

**Kiểm đủ trước khi kết luận:** Repeated unchanged missing-cart invocation cannot spend another equivalent operation; creation or valid cart change restores normal existing path; different source message/binding/version cannot reuse an old memo. Current valid negotiation and unknown-commit controls remain.

### P3 P09 narrow semantic contract alignment

Remove selected-offer/size alone→buy language from add_to_cart declaration, make explicit current customer buy/change request the condition, retain direct path once that condition holds. Referent answers use read/selection. Avoid new authorization enum/sourceQuote-as-proof/state classifier.

**Kiểm đủ trước khi kết luận:** Paired conversational controls with matched final short utterance but different accepted histories: inventory clarification→no cart writes; explicit purchase clarification→exact one cart commit; explicit first-turn buy→fast path preserved; cancellation/correction and retained offer work. No exact reply prose/keyword grading. Record residual intent risk; no deterministic consent claim.

### P4 S16 absent-provenance safety path

Express the stronger requested media requirement once in existing tool, keep ordinary feedback separate, return source-not-recorded and use existing silent handoff. Do not add a false positive schema/source. Address verifier full-context implication using minimal scoped principle and genuinely different semantic controls, not a case-specific final-phrase blacklist.

**Kiểm đủ trước khi kết luận:** Exact stronger requirement+missing provenance→zero outbound text/images and real committed handoff (or fail-closed no-send if handoff unproved). Generic feedback request+verified feedback classification still usable. Same reply surface with wearing vs feedback customer context must have different supportedness decisions; omitted/incorrect owner requirement must not be called deterministically solved. Prompt injection, stale/wrong hash/part/product and exact draft final gate controls retained.

### P5 Physical media dedup with proof union

Keep complete selected evidence for gate/claims; derive a separate bounded physical send list from exact same URL/content-hash identity, retain both source records in delivery binding.

**Kiểm đủ trước khi kết luận:** One physical attachment, both source proofs, atomic once beforesequence0, restart+revocation/hash/scope/permission negatives; no duplicate sends, loss of opening coverage or future quoted-product coverage.

### P6 Build/review before any generation

Observed meaningful RED→minimum GREEN, focused changed worker/adapter/manifest/projection/schema/source/media/delivery and existing protected/reply/checkout/state tests; canonical worker build/typecheck/lint, shared checks only if touched, dataset guards. Actual disposable PostgreSQL acceptance required for newly changed effect/recovery/outbox behavior (synthetic owner/verifier distinguished). Independent exact-head code review/fix to APPROVE.

**Kiểm đủ trước khi kết luận:** No production wiring/thirdrole/router/parser/regex/repair loop; caps6/2/3/1 and retry0; no live source mutations or live send. New provider run not authorized by plan review.

### P7 Future evidence, only when requested

Preregister all cases and new semantic paired controls, exact source/world/model/prompt/schema/corpus identities and attempts. Changed verifier prompt invalidates old verifier-config evidence; run focused safety population before wider sales flow if a run is later authorized. Preserve unsafe result denominator and stop per protocol; do not repeat to hunt PASS.

**Kiểm đủ trước khi kết luận:** Case completion differs from native path exercise. W2 NOT_EXERCISED remains unresolved unless an unforced registered native path actually reaches writer→quote; deterministic PG alone is not that evidence. N1 cannot establish stability; no GO on lower handoff count.

## Điều không được claim đã giải quyết

- Nối quote/policy sẵn có không cấp quyền hứa ưu đãi thương lượng trước giỏ. Không thêm engine thứ hai hoặc tự tạo cart để thỏa prerequisite.
- Sửa declaration và đo paired dialogue có thể cải thiệnP09; không trở thành proof code hiểu ý mua. SourceQuote thật/ownerenum/receipt thật đều chưa chứng minh việc mua được khách yêu cầu. Nếu cần hard guarantee, phải có owner quyết UX confirmation hoặc kiến trúc kiểm trước effect mới.
- Request requirement là constraint model khai, không là nguồn người mặc. Khi owner dùng FEEDBACK sai cho câu hỏi ảnh khách mặc, semantic risk vẫn còn. Nguồn thiếu→handoff là khả năng hiện thực được; positive wearer capability chưa có.
- Dedup vật lý không được xóa proof của parent thứhai; toàn bộ nguồn đã góp vào group vẫn phải bị kiểm/revoke sau restart.
- Chưa chạy code/test/provider mới trong review này; chưa duyệt implementation hayPhaseC.

Cần sửa thành một plan cụ thể theo các giới hạn trên rồi review exact hash. Chưa có quyết định owner mới bắt buộc cho phạm vi tối thiểu: giữ thương lượng trước giỏ và positive wearer source ở deferred, ghi rõ residual ý định mua.
