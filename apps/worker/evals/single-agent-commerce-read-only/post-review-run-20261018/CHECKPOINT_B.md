# Phase B — post-review candidate, 2026-10-18

**Đủ45/45lượt; recommendation STOP.** Whole-outcome review: **32USABLE /4NEEDS_EDIT /6UNUSABLE /3ownership controls**. Vòng trước36/2/4/3: lần này không cải thiện tổng thể. Preview đã hiện áo/màu/size đúng; ba hành trình vẫn tới xác nhận, nhưng hành trình thứ ba có hai lần chưa tạo được giỏ và một fallback khi sửa số đo. Không chạy16ca còn lại. A vẫn OWNER_BYPASS, B chưa sales/live accepted; ownerAcceptance=null.

## Source và cấu hình

- implementationBaseSha/main vừa fetch `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; intake plan `4659fb73d6f07002e8b2bc61e558e24e071e87a4`. [Plan](../../../../../docs/specs/c3-phase-b-post-replay-fix-plan-20261018.md), [implementation/V0/checks](../../../../../docs/specs/c3-phase-b-post-replay-implementation-20261018.md).
- Savepoints: P1`d6ea3d4d`, P2`e8de0f80`, P3/P4`2c53d7c0`. Exact clean **bRunSourceSha `f85144f5830ecafa06932838ac2bb598a690909f`**; raw`25be35e1` trước whole-primary`a2eaff1f`, sau đó mới diagnosis/audit. Không đổi executable/config/frozen inputs giữa run.
- Owner Vertex global **gemini-3.5-flash-lite /HIGH**, version exact model id, candidateCount1/textplain/max8192/thinkingHIGH/includeThoughtsfalse; temperature/topP omitted. Verifier **gpt-6.1-sol /high**, existing Codex login/CLI0.159.2 Responses bounded relay, toolsnone/strict verdict schema,90s, retry0/max1upstream generation mỗi invocation. Không substitute.
- Owner prompt SHA256 `cea1529cbc51ab8d396b044bac4f385be8bf114d769154e63842599d9b6adb65`,12684bytes (+206 từ baseline rollback); verifier unchanged`5d35e5de46030ea7e1ad10e6a4bde3bdf28a968ee48c8eb6825543ec0b61dbfd`; schema unchanged`76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. Exact config/files/corpus/tool schemas/helper hashes: [FROZEN_INPUTS](FROZEN_INPUTS.json).
- [Frozen scope](SCOPE.md):3owner generations/2tool rounds/6calls/1verifier/public turn; owner65536/verifier32768wire bytes. Một owner/tối đa một verifier; code authority/state/permission/receipts/privacy và final gate unchanged. Không router/parser/thirdrole/repair/retry/newstate hoặc tăng budget.

## Complete denominator và actual outcomes

Same15unique priority cases ×3=45outcomes: ba independent ordered seven-turn journeys và8B1×3. Max168generationrequests; actual117. Cả sáu processes exit0; cả ba disposable DBdropped. Native concurrency tối đa2, shared build/import startup serialized. Giữ mọi lỗi/downstream/repetition; không vote/best-of/replacement hoặc chạy bù. Remaining16 NOT_RUN theo criteria đăng ký; không phải full24B1 qualification.

| Population | USABLE | NEEDS_EDIT | UNUSABLE | Controls |
| --- | ---: | ---: | ---: | ---: |
| B1,24outcomes | 18 | 3 | 3 | 0 |
| Stateful,21outcomes | 14 | 1 | 3 | 3 |
| Total | **32** | **4** | **6** | **3** |

32USABLE gồm25model replies,1code recovery,6code preview/confirmation.29modelPASS không có nghĩa29USABLE: bốn PASS còn cần sửa bước tiếp/quyết định. Primary là kỹ thuật chủ quan, không blind/human acceptance độc lập. [Toàn45histories/captures/state/reasons](CONVERSATIONS_AND_REVIEW.md), [primary JSON](CANDIDATE_PRIMARY.json).

Terminal **30SEND_ELIGIBLE /6FALLBACK /3NO_SEND /6HANDOFF**.30eligible=29modelPASS+1code receipt summary.3NO_SEND là private-code preview có capture;6HANDOFF=3purchase confirmations có capture+3ownership controls im lặng. Không gọi tất cả HANDOFF/NO_SEND là failure hay actual staff handling. Fallback13,33%; nhãn HANDOFF13,33%/NO_SEND6,67% có nghĩa như trên.

## Những gì sửa được và những gì còn lỗi

**Preview P1 được quan sát đủ3/3.** Text hiện `Áo SV2447 màu BE, size L ×2`, đúng998000trước giảm/49900ưu đãi/30000ship/978100tổng, đặt trước vàETA8–14ngày. Khác vòng trước chỉ có productId/size: khách đã nhìn được loại hàng và màu. Mã là fallback đã đăng ký vì renderer không có tên đã bind; không giả tên sản phẩm hoặc mở lookup/state mới. Multi-component/mixed-colour được kiểm deterministic, chưa có provider journey cho mọi loại set.

**State/quote đúng khi thao tác được thực hiện.** Cả ba profiles76/98, corrections74/96đúng field; cart cuối2AO/BE/L. Hai hành trình đầu nhận mua/đổi/tổng/correction đầy đủ bằng model; quote dùng dữ liệu đã có, không gọi quote_cart. Không có recommend_size call trong run này; không kết luận thay description đã chứng minh nhân quả hay ổn định từN3. Semantic field/person ngoài các ca hiện có chưa được kiểm.

**Color loss vẫn còn, không phải thiếu tồn màu đã chứng minh.** Rep3opening read không truyền màu/size rồi addAO/M/color=null, selector trả SELECTION_UNAVAILABLE; owner sửa BE ở generation cuối khi NONE nên call bị chặn, cart=null. Lượt đổiL/lấy2 lặp color=null rồi lateBE, vẫn chưa có giỏ. Lượt hỏi tổng sau đó add2AO/BE/Lthành công, nhưng owner tiếp tục gọi quote_cart dưới NONE; recovery mới trả đúng tổng/đặt trước. Có3NONEcompletion errors trong8final-onlyrequests;2fallback+1code recovery. Không execute call muộn, không retry. Root trực tiếp là mất lựa chọn đã nêu trong arguments; nguyên nhân nội bộ model/provider chưa biết. Require offer không giải quyết được nullable color khi khách thực sự đã chọn; không nên thêm regex suy màu hoặc tự gán màu tồn duy nhất.

**Correction rep3 bị lỗi verifier transport.** Owner ghi74/96đúng, final nhắc giữ2áoBE/Lvà978100; verifier gặp UPSTREAM_TRANSPORT, không có HTTP status/usage. Actual fallback vẫn UNUSABLE; không dùng draft/state đúng để nâng điểm. Không retry attempt này. Chưa phải bằng chứng owner hiểu sai số đo hoặc verifier semantic reject.

**Sân khấu3/3fallback.** Cả ba owner drafts vẫn suy tơ mềm/thoáng thành chắc sẽ thấu dưới đèn; hai còn nói Khánh Trang thô boi kín hơn, các đoạn phối áo trong còn trấn an như đã giải quyết rủi ro. Verifier chặn unsupported refs đúng hướng V0; không phải chặn chỉ vì thiếu mọi phép thử cho lời khuyên. Discovery search được gọi ởrep1/rep3, nhưng query chỉ`set váy`; tìm thấy mô tả không đồng nghĩa tìm được căn cứ giải quyết che phủ. Bổ sung quyền search theo nhu cầu chưa chữa cách suy tính năng. Verifier unchanged,3rejections không chứng minh reliability tổng quát; không lấy việc giảm eligible-risk bằng fallback làm tiến bộ tư vấn.

**Partial-source thụt lùi9/9→7/9USABLE.** Không thấy hallucination only-set/hết hàng; cả9vẫn trả chất liệu đúng và không bịa giá/tồn. Nhưngrep1chân váy vàsetM kết bằng đợi kiểm tra thêm/đợi một chút khi nguồn đã unavailable và không có follow-up capability. Hai câu modelPASS nhưng NEEDS_EDIT. Đây là lỗi bước tiếp; thêm SOURCE_UNAVAILABLE và quy tắc cấm hẹn đã có không bảo đảm model tuân theo.

**Decision/voice chưa ổn định.** Compoundrep2 vẫn trải hai hướng và hỏi khách tự chọn:NEEDS_EDIT. Rep1 chọn cả set,rep3 nghiêng áo riêng có đánh đổi hợp lý, USABLE theo whole reply; vẫn rất dài. Meeting cả3có ưu tiên hợp lý (2set/1áo), repeat-wear cả3hợp lý (1áo/2upsellset), không buộc rẻ nhất. Nhiều câu vẫn mở catalog, chồng tính từ/nhắc ngân sách; hai câu chép trực tiếp cấu trúc “điểm phải đánh đổi” từ instruction. Đây là evidence instruction wording ảnh hưởng bề mặt diễn đạt, không phải proof mọi lỗi ngôn ngữ có cùng một nguyên nhân. Không ép giảm số câu hoặc chấm keyword để làm điểm tốt hơn.

**Owner tự mở phần xin dữ liệu riêng tư ởrep2opening.** Cart/giá/preorder đúng nhưng final xin tên/điện thoại/địa chỉ “để em lên đơn”. Bản owner đã giao checkout riêng tư cho code, nên đây là NEEDS_EDIT về bước tiếp/ownership. Không có PII thật lọt vào model được quan sát; không coi lời xin thông tin tự nó là đã tạo đơn POS. Handoff controls vẫn chỉ chứng minh chuyển quyền/event/tag intent trong isolated candidate, không chứng minh nhân viên nhận xử lý.

**Code wording P2 chưa đạt giọng shop tốt.** Confirmation rõ hơn nhưng còn “shop nhận yêu cầu chốt đơn”; recovery mới có đúng lựa chọn/tổng nhưng lặp nguyên cấu hình lần nữa khi báo đặt trước, dùng mã/rawBEvàkýhiệu×. Nó giúp cứu giao dịch trong một lượt, không chứng minh tư vấn tự nhiên hoặc ownerplanning đã tốt.

## So sánh với vòng trước và hướng xử lý tiếp theo

| Observation | Previous F1–F3 | This run |
| --- | ---: | ---: |
| U / EDIT / bad / controls | 36/2/4/3 | **32/4/6/3** |
| B1USABLE | 19/24 | **18/24** |
| StatefulUSABLE, ngoài controls | 17/18 | **14/18** |
| Fallback | 4 | **6** |
| Full preview/confirmation | 3/3 | **3/3**, choices visible |
| Valid opening | 2/3,1code recovery | 2/3modelPASS,1needs edit for private intake |
| NONE errors/final-only requests | 2/7 | **3/8** |
| Verifier FAIL/error | 3/0 | **3/1transport** |
| Upstream generation requests | 117 | **117** |

Criterion correction for preview and pre-run stage adjudication is explicit in scope; không gọi đây là so điểm hoàn toàn cùng rubric. Owner prompt/tool description và code wording đổi cùng candidate, live readbacks/histories cũng khác; không quy toàn bộ thụt lùi cho một edit. Dù vậy, regression step promises/color loss và câu dài có thật trong outputs; không thể giải thích hết bằng chấm khắt khe hơn.

Đề xuất sau run, chưa triển khai: giữ preview selection formatter; cân nhắc rollback riêng phần owner decision/voice vì lợi ích chưa thấy và instruction “đánh đổi” bị đọc thành câu chat; giữ search/fit scope nếu review không thấy hại riêng. Cô lập request ngay trước add để giải thích color=null dù current/latest/history đã cóbe, kiểm liệu projection có làm mất lựa chọn hay owner bỏ qua; không thêm persistent selection/parser/default. Tách tìm sản phẩm phù hợp khỏi khẳng định giải quyết độ kín, chỉ trả lợi ích của nguồn thực sự có; không tiếp tục thêm ngoại lệ theo mẫu hoặc nới verifier để đạt điểm. Hạ promise follow-up/PII intake về capability/code flow hiện hữu; nếu code thiếu một bước hợp lệ, xác định contract thiếu trước khi nhồi thêm prompt. Chưa kết luận nguyên nhân provider NONE; giữ fail-closed/accounting. Không tự chạy một treatment mới hoặc thay nhãn run này.

## Accounting, audit và hạn chế evidence

- **117invocations/117upstream generation requests=84owner+33verifier**, max1/invocation, retry0, unknown request accounting0.116HTTP200;1verifier transport không có HTTPstatus.4errors=3ownerNONEcompletion+1verifiertransport; timeouts0. Verifier error rate1/33=3,03%; known total errors4/117=3,42% nhưng ba là completion contract, không phải lỗi mạng.
-33owner finals/33verifier attempts,33exact bindings,29modeleligible exact-draft matches;3FAIL+1errorretained.1code recovery riêng; privatecheckout0modelcalls.0observed evaluator/private-fixture leaks trong captured requests.68raw hashes verified; frozen files/runtime source/helper hashes retained,3DBdropped.
- Verifier latency p50/p95 **6,893/14,485s**,N33inclfailedattempt; added verification interval **8,948/15,720s**,N33inclreadback/gate, không paired causal estimate. Owner **2,223/5,864s**,N84; wholeturn **17,227/45,577s**,N45. Nearest-rank.
- Known tokens **516274input/57696output**, coverage116/117; transport attemptusageunknown, không coi là0. CostNOT_EXPOSED. Embedding/source requests ngoài generation denominator.
- Frozen audit ban đầu FAIL khi giả định capture luôn byte-equal terminal. Existing runner dùng redactAnalyticsMessage khi lưu capture; lời xin địa chỉ trongrep2 bị redactor che cả phần tiếp theo. Post-run **read-only analysis amendment** reuse đúng redactor cho capture comparison; giữ exact model-request/draft/binding checks, không sửa raw/outcome/source/config/criteria hoặc helper đã freeze. [Amendment/provenance](AUDIT_AMENDMENT.json). Corrected analysis auditPASS; không gọi original auditPASS hoặc claim unredacted capture byte-equality cho record đã che. Đây là lỗi giả định của validator, không phải một attempt model mới.
- Final read-only checkPASS:68raw hashes,70JSON/6JSONL,59local links, frozen source/config/helper bytes unchanged và0secret-pattern hits. Bốn metadata JSON do Python ghi CRLF được Git normalize; raw hashes giữ disk bytes, không gọi Git blob/disk byte-equal khi chỉ khác newline. Script final-check không sinh provider hoặc sửa outcome.
- [Metrics](CANDIDATE_METRICS.json), [request accounting](CANDIDATE_REQUEST_ACCOUNTING.json), [diagnosis](DIAGNOSIS.json), [raw hashes](CANDIDATE_RAW_HASHES.json), [actual commands](commands.json). Raw và primary đã commit trước diagnostics; scores không sửa sau khi thấy verdicts. Chủ quan kỹ thuật, không owner acceptance độc lập hoặc conversion evidence.

## Verification và commands thực sự chạy

RED3newformattertests, rồi broad-summary67PASS/2legacyFAIL trước narrowing; final sales-cycle69PASS. Recovery59PASS/3FAIL trước fix; ba expectation cũ cập nhật wording sau fix, không bỏ state/security assertions. Final focused worker192PASS/7files; focusedNode65PASS; fullworker1872PASS/131files; fullNode508PASS/2optionalSKIP; protected21PASS. Canonical build/lint(noEmit), helper syntax và diff checks exit0. No remote CI/full-repository PASS claim.

```powershell
git fetch origin main
pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts -t "customer-visible cart choices" --maxWorkers=2 --minWorkers=1
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts --maxWorkers=2 --minWorkers=1
pnpm --filter @lana/worker exec vitest run src/realtime-sales-cycle.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-handoff.test.ts --maxWorkers=2 --minWorkers=1
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/worker exec vitest run src --maxWorkers=2 --minWorkers=1
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts --maxWorkers=2 --minWorkers=1
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/contract-replay-20261018/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-post-review-replay-source-20261018
node C:/Users/nguye/AppData/Local/Temp/c3-post-review-replay-freeze.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py python C:/Users/nguye/AppData/Local/Temp/c3-post-review-replay-preflight.py
python C:/Users/nguye/AppData/Local/Temp/c3-post-review-replay-run.py
node C:/Users/nguye/AppData/Local/Temp/c3-post-review-replay-collect.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-post-review-replay-judge.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-post-review-replay-render-primary.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-post-review-replay-audit.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-post-review-replay-audit-redaction.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-post-review-replay-diagnose.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-post-review-final-check.py
git diff --check
```

Run.py thực hiện sáu command cụ thể lưu nguyên trong commands.json; source/config preflights0generations. Helpers chuẩn bị từ existing runners với prefix/output mới, giữ originals. Frozen audit failure và test RED nêu trên không được báo PASS. Post-run amendment chỉ đổi phân tích read-only; không có generation retry hoặc invalidation che source edit.

Structural delta: four existing runtime/prompt executables +active manifest, two test files; one shared formatter in existing module, no new runtime file/state/role/gate/operator/parser. Một semantic verifier role giữ nguyên, không thêm semantic layer. Evidence/docs là run artifacts, không production framework. Dừng sau report/tasks/PR391, không merge/deploy/live send/source publication/Phase C.
