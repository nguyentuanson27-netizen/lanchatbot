# Phase C — kế hoạch sửa căn cứ và đường đọc dữ liệu

Revision: **2 — APPROVE PLAN** bởi cùng reviewer `/root/full22_run_review`, exact reviewed HEAD `f9b6e0843382e1c2be192137c5148a9d3f8e0c96`. Planning base: `cda76805ed939049f1fe0f8f987bff2226d07feb`. Branch hiện có: `feat/c3-phase-c-qualification-20261028`. [Review record](c3-phase-c-evidence-read-path-plan-review-20261030.md). Task này chỉ lập/sửa/review kế hoạch; không sửa runtime, gọi provider hoặc triển khai. Dòng status này cập nhật sau verdict; nội dung kế hoạch không đổi từ exact reviewed HEAD.

## 1. Mục tiêu và bằng chứng

Khách nhận được giá, lựa chọn phù hợp và bước mua tiếp theo khi shop có dữ liệu. Đọc toàn hội thoại để đánh giá kết quả, không tối ưu theo keyword. Hạn chế giọng nhẹ tạm chấp nhận. Giữ một owner, tối đa một verifier; code là authority cho identity/truth/freshness/state/permission/effects/receipts/privacy. Handoff im lặng khi thiếu dữ liệu shop ảnh hưởng nhu cầu; thiếu thông tin khách thì hỏi bổ sung.

Nguồn: architecture20261004, boundary amendment20261005, Phase C qualification plan20261028, tasks/plan và todo; full22 rerun source68d5c33b và [CASE_REVIEW](../../apps/worker/evals/single-agent-commerce-qualification/full22-rerun-20261029/CASE_REVIEW.md). Kết quả34lượt:10eligible/2code-owned/15handoff/7no-send,62generation requests,1malformed. Đây là development đã quan sát. Primary campaign cũ và raw giữ bất biến. Blind judge mới hết credits trước khi lưu điểm; không có quality pass rate mới.

Bản trước sửa F1 selectionOptions cho owner nhưng chưa đưa cùng căn cứ vào RuntimeProductEvidence/verifier. Readback replay các read trong một turn; sang turn mới read history không tự phục hồi read intent. Ba dependency failures chưa có lower trace. Vì vậy approval unit/PG trước không chứng minh đã hết lỗi E2E.

| Nhóm | Bằng chứng | Chưa được kết luận |
|---|---|---|
| j1/j4 | Owner có NO_COLOR IN_STOCK/BE PRE_ORDER; verifier presentation thiếu BE; owner tự gọi “tiêu chuẩn” | BE không tồn tại; mọi verifier refusal đều sai |
| j3 | T1 có giá/size/2ảnh, T3 snapshot chỉ mô tả; câu hỏi size bị từ chối | Cho phép history tự cấp truth/freshness |
| s02/s04/s15 | DETAILS_ONLY bỏ giá; lặp read/search rồi PRODUCT_BOUND; cảm ơn lại phụ thuộc giá | Verifier gây mọi handoff; nguồn thiếu giá |
| s13 | TOOL_RESULT_BOUND sau hai details reads | Tăng trần là giải pháp; mọi field thừa đều có thể xóa |
| s11 | HTTP200 STOP; offerType OBJECT; OWNER_TOOL_OUTPUT | Hết quota/API outage; có quyền sửa ngầm args |
| j2 | Correction vào recommend_size; OUT_OF_RANGE/HANDOFF, missingInputs=[] | Thiếu chart; khách phải đo thêm; phải chọn M/L |
| s01/s03/s07 | DEPENDENCY_FAILURE, thiếu lower trace | Shop thiếu ảnh/giá, media fetch lỗi cụ thể |

## 2. Scope và nguyên tắc tránh lặp

Ưu tiên worker candidate adapters và evaluation instrumentation. Không sửa source POS/Redis/Qdrant/Sheets hoặc policy để làm ca qua. Không thêm semantic router/parser, role, agent framework, repair/reverify loop, hidden retry hoặc case-specific production regex/template. Không tăng model/tool/byte budget, sửa ngưỡng/rubric hoặc ép handoff thành reply. Không đụng checkout/payment đã đạt ngoài regression. Legacy/default và production entrypoint giữ nguyên; mọi candidate-only path cần opt-in hiện có hoặc option nội bộ mặc định legacy.

Không đặt target “mọi case đều gửi được”. Đích là đúng đường đọc, hai model thấy cùng căn cứ đã được code kiểm, journey không mất căn cứ vì scope/turn reset. Đã handoff thì không tự giành lại quyền để chạy các lượt sau.

## 3. P0 — trace nguyên nhân trước khi sửa hành vi

Files dự kiến: `single-agent-commerce.ts`, read-only-tools/sources/media và isolated evaluation capture. Mỗi tool attempt phải giữ bản ghi bounded ngay khi bắt đầu và khi kết thúc, kể cả early handoff. Các field: ordinal/parent attempt, tool name, normalized typed selector đã allowlist, stage, status, safe reason code, source version/hash, result byte count và terminal mapping. Không raw prompt, URL token/query, credential, PII, exception message tự do hoặc raw checkout text. Error đưa code đóng; chưa phân loại được ghi UNKNOWN_INTERNAL, không suy diễn.

Đặt stage tối thiểu: ARGUMENT_VALIDATION, CATALOG_READ, POS_READ, POLICY_READ, MEDIA_SELECT, MEDIA_FETCH, MEDIA_VALIDATE, RESULT_PROJECTION, RESULT_BOUND, CURRENT_READBACK, FINAL_GATE. Không tạo telemetry service/framework; tái dùng artifact observer evaluation hiện có, không đổi outcome để thêm trace. Trace failure không được che original failure hoặc cấp send.

Offline replay fixture được rút từ raw/source có hash, không gọi lại model, không tự coi replay là quan sát production. Với s01/s03/s07: chỉ sửa behavior khi tái hiện được stage/cause; nếu replay không tái hiện, giữ UNKNOWN và đưa vào diagnostic đã đăng ký sau. Không bịa root cause để hoàn tất P0.

Acceptance: mỗi early failure có một final tool status hoặc explicit UNKNOWN; original disposition/source guards giữ nguyên; injected dependency failures xác định đúng stage; count/request denominator không đổi; trace không chứa secret/PII.

## 4. P1 — một nguồn căn cứ tuple cho cả hai model

Files dự kiến: realtime-sales-catalog, read-only-tools/context, effects, semantic-verifier-boundary, product-evidence serializers/tests. Tái dùng `candidateCartOptions` và candidate selection mode; không viết resolver thứ hai. Chuẩn hóa bounded evidence gồm product/offer/size/color/quantity, identityHash và identity variant/BOM theo source, availability IN_STOCK/PRE_ORDER/OUT_OF_STOCK/UNKNOWN, sourceVersion/observedAt/expiresAt và completeness. Cùng query phải cho owner và trusted snapshot cùng nội dung nghiệp vụ; presentation cũ chỉ là view, không phủ nhận tuple mới.

Read_product và add_to_cart selection failure chỉ thêm evidence khi resolver đã kiểm đủ identity/scope/freshness/quantity/policy. Tool error hint không tự trở thành fact. Unavailable/rejected/ambiguous hint chưa có validation → không cấp protected evidence. Nếu cần mở RuntimeProductEvidence, schema đóng/bounded và hardPrecheck phải kiểm field mới, product binding, snapshot hash và freshness; không nhét JSON vào policy literal để né type checks. Verifier prompt/schema verdict giữ nguyên, chỉ serialization của trusted data thay đổi và phải có hash/run identity mới.

Freshness tuple dùng hạn sớm nhất giữa: expiry resolver, observedAt + maxFactAgeSeconds của read path, expiry policy có liên quan và các source/claim bounds áp dụng. `candidateCartOptions` có thể trả 48 giờ nhưng không được kéo read evidence từ 2 giờ thành 48 giờ. Hydrate/readback identical source không gia hạn TTL. Sau expiry phải đọc source thật và có observation hợp lệ mới; không thay timestamp trong snapshot để cứu run.

Informational option có quantity scope rõ ràng, không authorize action. Read quantity1 chỉ chứng minh lựa chọn cho1; cart quantity2 phải resolver lại exact query, có receipt và final effect gate. UNKNOWN nghĩa chưa xác minh khả năng đáp ứng, không phải hết hàng; IN_STOCK/PRE_ORDER phân biệt; first8/incomplete không chứng minh tuple ngoài danh sách không tồn tại.

Canonical projection: cùng validated source observation + exact product/offer selector tạo cả tuple view và presentation view. Không gửi hai views mâu thuẫn rồi yêu cầu verifier ưu tiên view nào. Legacy presentation thiếu tuple được bổ sung/rebuild từ source đã validate theo đúng scope; không lấy việc thiếu dòng làm phủ định. Nếu hai validated views khác nhau trên **cùng exact tuple/source/quantity và field so sánh được**, publication thất bại SOURCE_EVIDENCE_CONFLICT và giữ fail-closed; không drop view bất lợi để qua gate. Khác offer hoặc quantity không được so như mâu thuẫn. Test cả missing row, actual contradiction, cross-offer và incomplete source.

Final readback replay đúng selector/quantity/source path đã cấp evidence. Stock, fulfillment policy, BOM, recipient, permission, revision hoặc expiry thay → oldPASS không gửi. Giữ scan64/first8, không Cartesian product và không fallback explicitBE sangNO_COLOR. Việc cấp evidence mới phải atomic: validate toàn bộ trước khi thay context maps, không để partial claims sau reject.

NO_COLOR là “nguồn không ghi màu”, không phải màu gốc/bản tiêu chuẩn. Không tạo customer-facing label thay cho physical attribute. Khi hai tuple không đủ nhãn để khách quyết: vẫn ambiguity/handoff; không force select. Thử case neutral khác sản phẩm/màu/size và negative controls để tránh fit riêng j1/j4.

Acceptance: inspect captured owner+verifier requests thấy cùng tuple meanings; deterministic hard check từ chối forged/stale/cross-offer/quantity mismatch; real PG selection/receipt/changed-source/outbox còn đúng. Không tự kết luận semantic PASS trước provider.

## 5. P2 — đọc đủ nhu cầu với payload có giới hạn

Giữ tool surface SINGLE/COMPARE/DETAILS_ONLY. Mô tả tool thể hiện rõ kết quả từng mode, không nhận DETAILS_ONLY thành đã đọcPRICE/STOCK. Thêm current data status per offer có enum NOT_READ/AVAILABLE/UNAVAILABLE; đây là read coverage từ code, không model-generated intent/obligation JSON. Nhãn/số lượng offer lấy đúng source; không đoán selected offer từ tên rút gọn.

Audit s13 bằng đo serialized bytes theo field trước/sau projection: dùng cùng projector cho budget check và actual provider wire; chỉ bỏ exact duplicates đã có trong current trusted context. Không bỏ provenance khỏi trusted gate, condition, offer identity, correction, missing/error status hoặc requested result. Nếu vẫn quá8192 thì fail-closed và ghi bound cụ thể; không tăng trần hay cắt tùy tiện. Same query trong một batch được deduplicate I/O nhưng replay kết quả đúng thứ tự/id; input khác selector không được collapse. Không đổi global per-turn caps.

Đường dùng tool do owner quyết theo khách. Chỉ sửa declaration/contract hướng dẫn một lần ở mức khái quát sau khi chứng minh input thiếu rõ ràng; không thêm mẫu câu/caseID, không yêu cầu mọi lời cảm ơn phải đọc giá. Code không tự phân loại intent tiếng Việt để điều khiển calls. Verifier kiểm semantics, không thành judge độ đầy đủ câu trả lời; s02bỏgiá phải bị đánh chất lượng dù verdictPASS.

Với s11: kiểm actual generated request declaration và validator có cùng enum string/selection constraints. Schema test chứng minh OBJECT bị reject và enums được khai báo từ bound offers; không convert OBJECT thành string, không regenerate/retry. Nếu declaration hiện tại đã đúng, ghi đây là model compliance residual, không thêm parser. Chưa implement API change; nếu thực sự cần sửa provider API surface, đọc current official provider docs trước code và ghi ref/shape đã kiểm.

## 6. P3 — cấp lại căn cứ hiện hành qua lượt, không lấy lời cũ làm truth

P3 trước hết audit existing currentProductId/cart/accepted history metadata. Không parse prose để suy offer, không coi “shop từng nói S–XL” là stockproof và không thêm persisted semantic memory.

### 6.1 Admission và work accounting đóng

Giữ chính xác predicate `prepare()` hiện có: scope còn permission/privacy và BOT ownership; chưa prepared/full-read product; product ID là `currentProductId` hợp lệ và nằm trong bound PRODUCT refs, hoặc `currentProductId` null và **đúng một** bound PRODUCT. Nếu nhiều bound products mà không có current hợp lệ: không read-ahead. j3 hiện currentProductId=null nhưng singleton SV2447, nên singleton fallback bắt buộc được giữ. Không suy từ prose/history, không mặc định mọi initialProducts đều eligible.

Chỉ lấy summary từ source observation mà prepareProduct đang đọc; cùng source/product một lần, không loop đọc lại từng offer, không thêm search/ảnh/policy/producer call. Local extraction tối đa3offers của snapshot đã có. Catalog-only fallback read hiện có khi POS lỗi được giữ đúng cơ chế cũ, phải quan sát và đếm riêng actual source I/O; không gọi đây là một source read nếu thực tế đã đọc hai lần. Không thêm retry generation hoặc retry source khác ngoài hành vi fallback cũ đã được test.

Preparation work vẫn trả1 và bị trừ khỏi tổng6normal tool work của turn; owner nhận callsRemaining5. Revalidation cuối giữ accounting readback hiện hành, ghi source reads riêng, không tạo model/tool lượt mới. Effect work/accounting và terminal handoff budget không đổi.

### 6.2 Candidate summary và admission bounds

Summary chỉ có offer identity, current price/stock/status và confirmed size availability từ cùng adapter P1. Không chọn offer thay khách, không tự mua, không cấp SIZE_FIT từ stock sizes. Owner và verifier cùng snapshot. Candidate-only, không đổi default legacy preparation.

Staging trước publication phải thỏa: một eligible product; tối đa3offers; total bound subjects≤8, runtime products≤4, unique claims≤32; tuple scan64/first8 theo P1 nếu có tuple query; tool response budget8192 bytes; owner/verifier text wire≤65536 bytes (media path riêng giữ bounds hiện hành, không đổi). Latest≤2048/history≤8 và history bytes≤4096 giữ nguyên; không đẩy correction/history ra ngoài để nhét summary. Không tạo extra bound variant subjects hoặc claims từ offer không validate.

Nếu >3offers, subject/claim/product bound hoặc predicted wire/projection vượt trần: **không publish một phần numeric summary**. Giữ source offer identities và NOT_READ/coverage code đúng giới hạn cũ, để owner chọn SINGLE/COMPARE. Không chọn first3, không cắt field nhạy nghĩa. Đo actual serialization trước provider; nếu input nền đã vượt bound thì giữ failure cũ. Numeric admission là điều kiện bổ sung, không nới validator cũ.

### 6.3 Optional acquisition không được làm mất independent evidence

Catalog content và giá/tồn là hai đóng góp độc lập. Khi acquisition hoặc validation của optional price/stock thất bại ngay lúc prepare: giữ fresh catalog/details hợp lệ; không chèn stale/invalid numeric claim vào snapshot; coverage báo NOT_READ/UNAVAILABLE kèm safe reason theo thực tế. Đây không phải fact âm “không có hàng/không có giá”. Không tự handoff chỉ vì read-ahead không sẵn; owner có thể trả styling/care/ACK nếu căn cứ tương ứng đủ. Nếu khách cần price/stock, owner vẫn dùng tool/handoff hiện hành, không được bịa fact.

Nếu summary đã usable và publish/bind vào snapshot: không được rút nó sau khi verifier PASS chỉ để vượt final gate. Readback phải replay/pin cùng selectors; changed/expired source vẫn block toàn exact reply theo boundary hiện hành. Không thêm classifier “câu này không dùng fact đó” để bỏ revalidation. Tránh poison bằng admission đúng từ đầu, không bằng selective semantic pruning sau kết quả.

Tests bắt buộc: multi-bound ambiguity không auto-read; singleton fallback j3 được prepare; work1/remaining5; source I/O bằng baseline và không fanout từng offer; >3/overflow không partial publish; optional acquisition fail vẫn giữ catalog để thanks/styling/care; fake price/stock không xuất hiện; đã publish rồi thay source/expiry giữa verifier–send vẫn block. Nếu current source product không bound hoặc source/correction thay sang product khác: không kéo fact cũ sang.

Không thêm persisted field/migration/read-intent memory. Nếu one-observation extraction không làm được hoặc measured request bounds/neutral controls không đạt: P3 dừng tại không ship, báo limitation và replan; không tự tăng budget hoặc mở scope.

## 7. P4 — audit size correction và giữ các phần đã tốt

Replay j2 với đúng profile revision/measurement fingerprint, chart ID/version/applicability và product-group shared-name rule owner đã cho phép. So sánh trước 56kg và sau 51kg + 88/70/94; kiểm unit conversion, interval boundaries, composition và fitPreference. Expected dựa trên chart nguồn, không theo mong muốn ca PASS.

Nếu chart hiện tại không hỗ trợ fit: giữ OUT_OF_RANGE/handoff, ghi limitation. Nếu code chọn sai chart hoặc bỏ correction: sửa đúng mapping/evaluation, thêm boundary tests. Không mở sharing sang khác tên hoặc offer không có rule nguồn, không đổi chart shop, không hỏi lại input đã đủ.

Regression giữ: care FAQ s09; ảnh j3T1; phối đồ s06; code COD j6; explicit color; order/defect/exchange silent handoff. Không sửa display/voice để che state/effect. NAME question repeat là hạn chế nhẹ, ngoài scope vòng này.

## 8. TDD, real adapters và lệnh verification dự kiến

Đây là lệnh **phải chạy ở implementation sau**, chưa chạy trong task lập kế hoạch. RED quan sát trước GREEN tối thiểu; không mock provider result thành evidence.

| Thay đổi | RED/negative và kết quả cần có |
|---|---|
| Trace | Early exception/UNAVAILABLE/media/bytebound cóstage; status không đổi; secret/private marker không lọt observer |
| Tuple | Owner/verifier thiếuBE, forged evidence, identity/offer/BOM/quantity/freshness mismatch; single shared source thay đổi là gateblock |
| Read/budget | DETAILS_ONLY không cấpPRICE; equal duplicates giảmbytes cảbudget+wire; conditions/newselectors không bịdrop; oversized vẫnblock; repeated calls không vượtcaps |
| Journey | Current offer summary đủdata choj3T3 nhưnghistory khôngauthorize; changedsource/expired/revoked/crossproduct đềublock; >3offers không chọnfirst3 |
| Size | Latest correction đúngchart/range hoặc legitimateOUT_OF_RANGE; đủinput không bịMISSINGINPUT; chartexpired/wrongproduct/unsupportedsharing khôngchoose |
| Legacy/privacy | Default callers unchanged, pendingprivatecheckout/rawPII nevermodel/trace; historyOutbox/receipt/handoffguard/recipient giữ nguyên |

Final verification order (repo root; lệnh dự kiến, chưa chạy):

```text
# Build shared dependencies hiện hành trước TS tests dùng workspace dist.
pnpm -r --filter "@lana/worker^..." build
pnpm --filter @lana/worker exec vitest run src/realtime-sales-catalog.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
# Chỉ sau current worker build: Node evals/PG import worker dist.
node --test "apps/worker/evals/single-agent-commerce-qualification/*.test.mjs"
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker lint
```

Các filenames đã đối chiếu bằng rg --files. TDD focused RED/GREEN chạy theo nhóm code đang sửa; final sequence phía trên bắt buộc dựng current shared/worker trước khi chạy bất kỳ Node eval hay PG nào consume dist. Bổ sung focused media/source/schema suites theo files thực chạm. Nếu chạm shared contracts/business-tools/database, thêm focused tests/typecheck/build của package đó; build dependency không thay shared tests. Không gộp overlapping counts, báo SKIP/FAIL rõ ràng.

Actual PostgreSQL provider-free, sau commit sạch và config current source:

```text
node apps/worker/evals/single-agent-commerce-qualification/cli.mjs init --out ../c3-evidence-read-config-<run>.json
# Tạo local registration chỉ cho real-adapter driver: runSourceSha=currentHEAD,
# config=init output, identity=qualificationIdentity(config); không SEALED provider run.
node apps/worker/evals/single-agent-commerce-qualification/real-adapter-driver.mjs ../c3-evidence-read-adapter-registration-<run>.json ../c3-evidence-read-pg-<run>
# Actual child do driver ghi trong COMMAND.json:
python apps/worker/evals/single-agent-commerce-read-only/source-session.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <out>/postgres COD
```

Không truyền --provider-run/--phase-c-registration; synthetic domain inputs với actual disposable DB/capture, không generation. Tests mới thêm vào harness phải replay tuple/current-read/correction/permission/changed-source thật trước full driver. `--check-prefix <exact prefix>` dùng targeted reproduction khi cần, output mới mỗi lần; không đánh targeted subset là full verification. Driver toàn bộ giữ các check cũ và validate đúng7invariants: stale_revision, duplicate_source, crash_after_commit, ambiguous_reconciliation, operation_idempotency, history_outbox_recovery, no_duplicate_effect. Driver yêu cầu current clean source, DB dropped, providerGenerations0 và sendEnabledfalse. Source/capacity fail ghi BLOCKED, không giả actual PG bằng mock.

## 9. Savepoints, review và vòng model tương lai

Task hiện tại: plan → cùng independent reviewer → sửa plan → review lại đến **APPROVE PLAN**. Ghi từng finding/revision và exact reviewed source trong review record. Không tiếp tục implementation/provider chỉ vì plan được approve.

Task implementation khi owner giao: P0 trace/reproduce → P1 tuple evidence + boundary → P2 read/budget → P3 current read-ahead → P4 size audit → final focused tests + PG. Commit riêng theo nhóm; cùng reviewer kiểm actual consumers/final gate/legacy và sửa đến APPROVE source. Không đổi payment/mutation ngoài scope.

Model diagnostic khi owner yêu cầu sau readiness:

- Giữ đúng 22 cases / 34 customer turns, N1, max136, retry0; models, customer scripts, branches và rubric giữ nguyên.
- Nếu ưu tiên ca bị tác động, đóng băng toàn thứ tự và scope validator/test/review trước seal/request; không đổi thứ tự sau khi thấy kết quả, không tự tăng case hoặc repetitions.
- Batch tiếp tục sau known malformed, quality failure hoặc handoff; giữ hard stop cho privacy/source/effect/unknown accounting. Remaining ghi NOT_RUN nếu dừng, không substitute/retry.
- Chấm actual customer outcomes/state/receipts/images của cả journey. Draft chỉ dùng chẩn đoán. Primary review giữ riêng independent SolHigh blind judge; nếu quota thiếu thì giữ pending grade, không đổi model hoặc tự gán điểm.
- Controls không được regress. Giảm avoidable handoff phải đi cùng câu trả lời hữu ích và căn cứ đúng; không nới authority. Handoff cần thiết không tự bị tính là lỗi chất lượng.

Ngay cả full22 development PASS cũng chưa mở C3 comparison: qualification còn cần safety riêng, exposure mapping, fresh holdout, absolute 90% riêng hai mode và matched parity theo plan C. Giữ nguyên lịch sử và denominator của run cũ.

## 10. Điều kiện hoàn tất và rollback

Task này hoàn tất khi exact plan được reviewer **APPROVE**, review record/tasks/PR được cập nhật và source clean chỉ có documentation changes. Nếu reviewer/quota không sẵn sàng thì ghi BLOCKED review; không tự approve. Mọi finding phải có acceptance, verification và stop rõ ràng; không để implementation tự chọn business decision chưa được duyệt.

Rollback implementation tương lai bằng revert incremental scoped commits, giữ original raw/registration/grades. Không DB migration, source publication, deploy, live-send hoặc merge. Nếu P3 không đáp ứng bound/neutral controls thì không ship read-ahead; replan thay vì tăng prompt/budget. Online roles/layers thêm: 0. Verifier vẫn chỉ đánh exact final semantics; final deterministic gate giữ toàn authority.
