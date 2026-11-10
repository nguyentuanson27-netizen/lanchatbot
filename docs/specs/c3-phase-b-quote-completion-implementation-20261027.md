# Phase B — implementation quote completion và audit tư vấn

Ngày27/10/2026. **IMPLEMENTED + independent APPROVE, chưa provider qualification/BGO.** Implementation base `008fa28210e8587e6e248486b6b85537800bfc43`; P0/P2 audit savepoint `63d7d8f196a3cebcd152a3c8fb04cd92501f6efc`; executable source **`cc068a8f72b58e5b186705e6f07cfd03b398991e`**. Subsequent report/tasks edits chỉ documentation.

[Approved plan](c3-phase-b-quote-completion-advice-plan-20261027.md) canonicalSHA256526ac86377593db4f652c72cb2159c514081a8d4e8b24df6189da14bca77b468 giữ nguyên. [P0 corrigendum/P2 audit](c3-phase-b-quote-completion-corrigendum-audit-20261027.md). User yêu cầu implementation→review độc lập→fix→review đếnAPPROVE; không yêu cầu provider run trong lượt này.

## Hành vi sau sửa và giới hạn

Candidate opt-in `quoteTask` cấp tác vụ `quote_product` khi có read/media/handoff và firstContact=true. Owner chọn đúng1–2offer của PRODUCT đã bound; code đọc giá và chọn ảnh GENERIC đúng subject/color qua các tool/guards hiện có, đưa vào trusted snapshot trước exact final draft. Không tự parse ý định, không tự attach từ firstContact/PRICE/hint. Khách hỏi deadline/size/tồn size cụ thể/hỏi lại giá/sửa giỏ vẫn dùng surface cũ; không dùng quote để bỏ câu hỏi tồn.

- Quote là call duy nhất trong batch; mixed/duplicate batch reject trước sibling/inner execution. Tối đa một invocation/turn.
- Reserve2normalunits, prepare nằm trong cap6; outer quote không bị double-count thành primitive thứ ba. Handoff tối đa1, total actual primitive/admission attempts<=7. Readfail/selectionfail/argsreject tách consumed/reserved units khỏi admitted primitive dispatch.
- Composer cung cấp primitiveToolInvocations proof; core không suy executed từ số proposed. `quoteTaskWork` giữ reserve2/read0–1/select0–1, selection<=read. Unsupported capability không được đếm là primitive dispatch; handler đã admitted rồi trả REJECTED vẫn được tính. Source reads/DB/HTTP requests là loại accounting khác.
- PRICE mọi offer cần báo phải có canonical evidence. Không đủ giá hoặc ảnh bắt buộc → existing handoff; silent matrix hiện hành được giữ. Handoff không chứng minh được → fail closed, không text chờ/partial giá/ảnh. Optional introductory stock/size không bị biến thành yêu cầu tồn khách chưa hỏi.
- Canonical PRICE/media scope/provenance/TTL/binding giữ nguyên. Exact final text qua mandatory verifier và deterministic gate; existing group egress/readback chặn changed media/revision/permission/recipient. Không rewrite/reverify hoặc chọn thêm ảnh sau verifier.
- Result consumer chain có runtime exact-current dedupe/bounds, Gemini product/media normalization, internal assetRef removal, native functionResponse và FINAL_REPLY/CompactV2 serialized tool history; canonical trusted context không bị mutate hoặc cấp receipt từ status PREPARED.
- Strict native schema/parser, PRODUCT ref hints, phase/weighted budget và metadata được nối. quoteTask/PRIMITIVE_WORK_V2 trong manifest, registration, driver/preflight và runtime. Registration toolSchemaHash bao gồm quote declaration khi enabled; legacy omitted path giữ schema set cũ.
- B1 read-only harness không được thêm quote tool. Default consumer không opt-in vẫn dùng contract cũ. Không production entrypoint wiring hoặc shared-package source change.

**Giới hạn owner vẫn có thể bỏ hoặc gọi sai operation.** Code bảo đảm contract của task đã gọi hợp lệ, không tự biết mọi ý định khách. Chưa có model evidence owner sẽ dùng task đúng; không gọi việc này là đã chữa mọi omission hoặc nâng chất lượng tư vấn.

## P0/P2 đã thực hiện

Corrigendum tách4media-evidence gaps +3controlled POS failures +1verifier rejection +2businesshandoff mỗi vòng, không quy3fault fixtures thành thiếuPOSthật. R1haiOWNER_TOOL_OUTPUT vẫn là lỗi riêng; raw/historical reports/JSON/rubric không sửa.

Offline ledger đủ20final owner requests (10caseIDs×2runs), public request file/line/generation/artifact hash và field paths;22media observations là11/capture×2, không22ảnh riêng. Không registry/live audit hoặc source writes. Không tìm được missing/truncated/wrong-subject path cụ thể để justify context patch. **Không sửa renderer, thêm fit block, benefit source hoặc advisory/style instructions.** Prompt chỉ thay đoạn báo giá để dùng operation khi được cấp. Git numstat60/60 ở prompt có cả normalization line endings; semantic instruction delta chỉ đoạn báo giá, không toàn prompt rewrite. Verifier giữ nguyên bytes.

## TDD, verification và lỗi quan sát

Observed RED: focused quote test fail vì availableTools chưa có quote_product. Minimum implementation GREEN; sau đó mở tests cho mixed batches, required-price/media failures, strictref/offer/args, consumed-vs-executed, budgetprepare1/remaining1–2, repeated task, direct FINAL không tự attach và ingress races. Mock HTTP/schema tests không provider call.

| Final verification | Kết quả |
| --- | --- |
| Worker13focusedfiles | **516PASS** |
| Commerce Node evaluation suite | **221PASS** |
| Stubbed Python driver tests | **2PASS** |
| Worker direct typecheck | exit0 |
| Worker build (gồm dependency prebuild) | exit0 |
| Worker lint | exit0 |
| git diff checks / staged approved byte hashes | PASS |

Reviewer độc lập còn tự chạy164worker (quote25/core42/ingress97) và5Node PASS; đây là subset, không cộng vào516/221 như unique tests. Không fresh PostgreSQL run, provider/count API, remoteCI/live delivery hoặc human acknowledgement mới.

Initial GREEN check từng fail do handoff fixture thiếu authority fields; sửa fixture thành ConversationState thật. Initial worker build fail ở2test non-null TypeScript errors, sửa test rồi final build/typecheck/lint PASS. Một Node mock thiếu STOP finishReason, sửa mock rồi suite PASS. Không che các bước lỗi bằng nhãn provider failures; generationrequests mới0.

Exact commands đã chạy (logs ngoài repo tại `C:/Users/nguye/Documents/Sản phẩm AI/c3-quote-completion-implementation-20261027`):

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-quote.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-quote.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-quote.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-missing-information.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-session-silent.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/quote-task.test.mjs
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/driver.test.py
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
git diff --cached --check
```

Focused suites/build đã chạy lại sau reviewer fixes theo thay đổi thực tế; không claim pre-fix counts513/220 là final counts. Source primitives/accounting tests dùng actual admitted dispatch spies, không suy từ I/Ocounts.

Official provider docs kiểm27/10/2026: [Function calling](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/function-calling), [FunctionDeclaration](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/Shared.Types/FunctionDeclaration). parametersJsonSchema mô tả object parameters và additionalProperties; không cùng parameters. Runtime vẫn tự kiểm args; không thay API/client/token/retry route. Một URL REST v1beta1 cũ trả404; đã tra canonical docs, không suy API từ memory hoặc simulate request.

## Independent review → fix → APPROVE

Cùng reviewer `/root/phase_b_root_cause_plan_review`, read-only, không provider/live/credential/source writes.

1. **REVISE snapshot9c59bb1c…** (HEAD63d7d8f1 +14worker files):2P2. Registration schemaHash bỏ quote declaration; executed counter tăng từ proposed calls trước capability filtering, và quote args rejection chưa có reserve2/executed0 trace.
2. Fix: statefulToolSchemaHash có quote enabled/legacy paths, mutate-schema test; proof getter ở primitive admission boundary, V2missingproof failclosed, consumed/reserved vs execution tách rõ, trace0/0 và validator/tests.
3. **APPROVE exact snapshot49590a51e4c34e99954bc22bd5afa3606843bd419b53ab9278e4d269353bc454**: không còn P1/P2 trong scope. Reviewer164worker+5Node/diffPASS. [14source file hashes](c3-phase-b-quote-completion-evidence-20261027/APPROVED_SOURCE_FILES.json), digest là SHA256(JSON compact UTF8 sorted list of {path,sha256}). Primary kiểm cả14staged Git blob bytes khớp hashes trước commitcc068a8f. Không executable change sau approval.

Approval không phải provider qualification hay BGO. Chưa chạy lại51native/17controls; không dùng R1/R2 để qualify operation mới. Không tự mở model campaign.

## Complexity, remaining work và rollback

Thêm1business tool,1narrow quote helper; semanticroles/layers thêm0. Không semanticrouter/parser/regex/templategrowth, no repair/reverify/hiddenretry. Scopeworker-only và eval/docs; không shared source, source-store update, deploy/migration/send thật.

Remaining: owner operation adherence và task misuse chưa có provider evidence; sales-decision limitations vẫn còn;4media evidence needs chưa được bổ sung nguồn. Controlled POS cases là recovery tests. Giỏ/checkout/policy giữ focused regression, chưa live qualification. Khi owner yêu cầu qualification mới, seal code/config/prompt/corpus mới và giữ denominator/error accounting, ba trục safety/completion/usefulness như plan. Không BGO từ test count.

Rollback candidate bằng revert riêng codecommitcc068a8f trên branch hoặc dùng baseline008fa282; giữ P0/P2 và historical evidence, không xóa artifacts. Không runtime deployment để rollback. Source sau approval giữ nguyên, dừng trước provider campaign.
