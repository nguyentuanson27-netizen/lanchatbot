# Phase B — contract fixes / full39 / T5 BLOCKED

**FULL39_COMPLETE — T5_BLOCKED_VERIFIER_QUOTA — CHƯA B GO.** Ngày22/10/2026. Implementation base `47b0cd995952eb7ac7e0c51174a853220698d17e`; T1–T4 `afc989e0`, T5 `dc311422`. Independent reviewer vòng trước: lượt1 REVISE → fix → lượt2 APPROVE exact `dc3114229d2e126937a15d611dd0883e1490a777`. Provider runtime source `6e38c54104010c7e137481a560b99da21e961e73` (commit sau chỉ ghi tài liệu). [Plan](../../../../../docs/specs/c3-phase-b-contract-and-advice-fix-plan-20261022.md), [implementation/reviews/checks](../../../../../docs/specs/c3-phase-b-contract-and-advice-implementation-20261022.md).

## Đã chạy bao nhiêu

Đủ39/39, mỗi ca1lần:24B1 +8stateful +4openings +3negotiation. Không retry, chạy bù, thay model/case hoặc sửa executable/config giữa run. Openings chạy trước, các journey giữ thứ tự nội bộ. Raw/source checks và hashes tại [registration](REGISTRATION.json), [commands](commands.json), [accounting](REQUEST_ACCOUNTING.json), [metrics](METRICS.json), [raw hashes](RAW_HASHES.json).

T5: corpus6/12slots đã chuẩn bị trước provider, approved assets/bytes/readback prerequisite PASS với0generation;12comparison **không dispatch**, chưa seal campaign/SHA riêng vì verifier hết quota. [Image inputs/pins](image-registration.json), [corpus](frozen-inputs/cases.image-comparison.json). Không nhận51outcomes đã chạy hoặc test ảnh đã cải thiện tư vấn. Conditional12 vẫn BLOCKED, không âm thầm bỏ khỏi scope.

## Models/config và provenance

Owner **VERTEX_AI / gemini-3.5-flash-lite / version gemini-3.5-flash-lite / HIGH**, global, candidate1, text/plain, maxOutputTokens8192, thinkingLevelHIGH/includeThoughtsfalse, timeout90000ms, retry0. Credential route C3_VERTEX_CREDENTIAL_FILE.

Verifier **OPENAI / gpt-6.1-sol / version gpt-6.1-sol / HIGH**, Codex ChatGPT login, pinned CLI0.159.2 bounded relay, max1HTTP/generation, toolsnone/storefalse/streamtrue, timeout90000ms, maxResponseBytes1048576, retry0. Temperature/topP/output-token defaults giữ nguyên; exact [manifest](frozen-inputs/manifest.json) và [provider preflight](provider-preflight.log).

Giữ3owner generations/2tool rounds/6runtime tool calls/1verifier. Existing preparation vẫn tiêu1call như baseline; preload chỉ là source I/O riêng, không đổi budget hai arm. T1 chỉ sửa1operation clause trong owner prompt để không nói nhầm mọi reject đều chưa ghi; giọng/quyết định mua và verifier giữ nguyên. Không có third role/router/parser/repair/reverify hoặc production wiring.

Prompt/schema hashes:

- owner: `a7beafb9cf4ad14b0a76fe4213f46cece0bca1b3dff83ab0041eda5c316e89a6`
- verifier: `0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde`
- verdictSchema: `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`

Corpus/config exact bytes đã giữ trong frozen-inputs; hashes ở RAW_HASHES/REGISTRATION. 110unique generation IDs,110wire bodies, max1HTTP/generation,0evaluator-key leaks; runtime projection không chứa caseId/evaluator/purposeId/expectedSafe/requiredBehaviors/qualityScore. Không hidden retry. Error outcomes vẫn trong39 và request accounting.

## Kết quả kỹ thuật và terminal thực tế

| Nhóm | Ghi nhận | Eligible | Fallback | Handoff | NO_SEND |
|---|---:|---:|---:|---:|---:|
| B1 |24|9|15|0|0|
| Stateful |8|2|2|2|2|
| Openings |4|2|1|1|0|
| Negotiation |3|2|1|0|0|
| Tổng |39|15|19|3|2|

110generation requests =76owner +34verifier. Owner0errors/0timeouts. Verifier13verdicts (11PASS,2FAIL) và21HTTP429 `usage_limit_reached`; tổngHTTPerror21/110=19,1%, verifier21/34=61,8%, timeout0. Không tự đổi provider/model hoặc dùng một agent để thay verifier.

19fallback gồm **17do quota verifier +2do verdictFAIL**. Bốn attempt có verifier429 vẫn phục hồi bằng code từ receipt/quote đã ghi (open giỏ, đổi size/quantity, negotiation setup/discount), không phải verifier PASS. Hai NO_SEND có actual code intake/preview đãcapture; không đồng nghĩa khách im lặng. Ba handoff: SIZE_RULE_UNAVAILABLE im lặng, PURCHASE_CONFIRMED có holding reply, HUMAN ownership control im lặng. Fallback19/39=48,7%; handoff3/39=7,7%; raw no-send2/39=5,1%. Hai actual không có text là sizehandoff và ownershipcontrol.

Static fallback C3_A_NONPROTECTED_V2: “Phần này em chưa trả lời được, chị nhé.” Các code receipt/holding/checkout outcomes giữ nguyên actual trong [39hội thoại](CONVERSATIONS.md), không thay rejected draft thành câu “đáng lẽ nên trả”.

## Quality và attribution

Manual whole-turn:15USABLE/3NEEDS_EDIT/19FALLBACK/1SILENT_HANDOFF/1OWNERSHIP_CONTROL. [Primary từng ca](PRIMARY_REVIEW.json) đã khóa trước xem rejected drafts. Non-blind/N1, không human panel/keyword grading/qualification. Không loại21quota khỏi denominator hoặc chấm owner draft thay actual.

Ba NEEDS_EDIT: b1-changed-occasion-v2 trả lại quyết định chịu nóng cho khách; gallery dùng giọng hệ thống, thêm giá/chất liệu không khách hỏi và chưa cung cấp ảnh đúng màu; ETA đã có4–8ngày nhưng chưa trả lời trực tiếp deadline sángthứSáu. Concern ren vẫn dài/tính từ thừa nhưng có giúp quyết định, ghi polish theoT0 thay vì đổi nhãn tùy vòng.

**Có tiến bộ đúng tầng:** size request ghi158/52/RELAXED với source quote hợp lệ, không còn lỗi enum/late tool; chuyển sang missing verified chart đúng nguồn. Gallery không còn suy thiếu ảnh=không bán màu. CầnThơ lấy được keyMIEN-NAM, có ETA4–8ngày. Recovery trả giá nói ưuđãi30k/tổng499k; hỏi lại tổng không tăng tier/evidence/discount. Chưa chứng minh giọng tự nhiên/whole-sales quality cải thiện ổn định.

**Hai FAIL thật:** changed-occasion gợi ý treo áo để vải phẳng lại; discovery khẳng định không bó bụng/dễ chịu suốt ngày khi chưa có fit. Verifier chỉ ghi productRef, không span nên attribution exact clause là phân tích của reviewer; không gọi đó là explanation do verifier cung cấp. [Finding/root cause chi tiết](FINDINGS.md).

Không thấy protected error được xác nhận trong11reply model PASS đã quan sát, nhưng population N1 và21verifier error không cho phép kết luận verifier đã đạt safety/stability. Không sử dụng kết quả này để GO.

## Operations và usage

Verifier latency all34attempts: p50 6077ms/p95 17075ms; success13: p50 7650ms/p95 21082ms. Added verification stage/readback p50 8279ms/p95 21812ms. Quantile nearest-rank; error-heavy latency không tương đương baseline toàn success.

Known token usage: owner input356281/output54022 (thinking50305 theo telemetry); verifier input59748/output1639 (reasoning1290). Owner usage76/76, verifier13/34; usage của21error không expose, không coi unknown là zero. Cost không expose, không tự ước giá. [Metrics](METRICS.json).

## Verification đã chạy

Worker133files/1954tests PASS; Nodecommerce107PASS; protected claims/reply assembler21PASS; worker typecheck/build/lintPASS. Observed RED→GREEN và intermediate failures lưu trong implementation doc. COD32/32 và BANK32/32 PASS trênDB cô lập; cả5DBs (CODcontrol +3provider cohorts +BANKcontrol) đã drop. Source check PASS, providerpreflight0generationPASS; sourcecheck có1embedding riêng, không generation. [Commands thực sự chạy](COMMANDS.md).

Complexity delta: sửa existing state/media/ETA/effect paths; export resolver checkout dùng chung; eval-only diagnosis helper và branch image experiment trong runner/protocol.0service/table/migration/model role/runtime verification layer mới. Không thêm dữ liệu product/policy hardcode vào prompt. Không change production entrypoint, live send, POS order hoặc deploy.

## Giới hạn và quyết định

So baseline39 trước: fallback3→19 chủ yếu vì quota (17), không được diễn giải là17lỗi tư vấn/code mới. Openings trước3fallback+1silent ETA → nay1fallback+1silent size+2eligible, nhưng2eligible vẫn cần sửa chất lượng. Đã sửa contract không đồng nghĩa sửa toàn bộ tư vấn.

**Recommendation: BLOCKED để đánh giá model tiếp; CHƯA B GO.** 39đã hoàn tất;12imagecomparison chưa chạy vì quota. T5 chưa có runSourceSha hoặc win/loss results. Không promotion/defaultpreload hoặc tự thêm campaign. N3b terminal focus, staff-image byte access/readback, N6b privacy và28candidate slots chưa registered vẫn là giới hạn; không gọi đây full12journeys/A2/A3. A OWNER_BYPASS giữ nguyên. Không deploy/live send.
