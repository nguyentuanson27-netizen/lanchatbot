# Phase B — model qualification sau explicit quote task, 27/10/2026

**COMPLETE:17controls +51native outcomes,0chưa chạy. B chưa GO.** Native **37 SEND_ELIGIBLE /10silent HANDOFF /4 NO_SEND**; fallback text0. **141generation requests,0generation errors/timeouts,retry0.** Đã đọc đủ51hội thoại và actual outcomes; không coi37eligible là37sales-qualityPASS.

Owner yêu cầu một vòng sau implementation đã review, giữ51caseIDs/CompactV2/N1/models, không sửa executable/config/rubric trong run. [Toàn bộ hội thoại](CONVERSATIONS.md), [review từng ca](WHOLE_TURN_REVIEW.json), [actual terminals](ACTUAL_TERMINALS.json).

## Kết quả mục tiêu của bản sửa

**Ba ca báo giá mở đầu đã thực hiện đủ tác vụ trong lần chạy này:** opening-ad, opening-organic, opening-multipart đều gọi quote_product riêng một lần, mỗi task read1/select1, mỗi ca capture2ảnh. Multipart trả đúng bộ799k/áo499k, không tự mở giá chânváy. So với R2, organic/multipart từ0→2ảnh mỗi ca. Lượt hỏi lại giá không gọi quote hoặc lặp ảnh; chưa rõ mẫu thì hỏi ảnh/tên.

[Quote accounting](QUOTE_TASK_ACCOUNTING.json) kiểm actual proposals/trace/capture và schema identity:3outerquote calls,6reservedunits,3read+3selectioninvocations;6cohortregistrations có quoteTask/schemahash đúng.27persisted results theo PRIMITIVE_WORK_V2;3bypass là2HUMANfollowups+1privatecodeonly. Prepare vẫn nằm cap6, terminalhandoff cap1, primitive/admission attempts<=7. Không lấy proposedcalls làm executed, không gọi DB/source reads làtoolunits.

Media-decision chủ động gửi2ảnhchung; media-and-size gửi1ảnhcậnTOP và sizeM. Tổng actualimages **9**, gồm6báogiá+2tưvấn+1cậnsize. Nhiều ảnh hơn không tự là tư vấn hay hơn. Media-decision vẫn chủ yếu nói mềm/rũ/thanhthoát để trấn an về ren, chưa có cách phối cụ thể.

**Giới hạn:**3/3targetedquote tasks được gọi và hoàn tất ở N1 không chứng minh owner luôn gọi đúng hoặc code loại mọi omission. Chưa có live send/human acknowledgement/stabilityqualification. Khách hỏi tồnM/giá trong B1 vẫn dùng read_product hiện có; B1 không được cấpquote/media, nên không chấm thiếu ảnh ở21eligibility-onlyslots.

## Finding quan trọng: discovery đổi kiểu thất bại

Khách tìm bộ áo quần đi làm **dưới1triệu**, không bó bụng. Lần này:
1. Owner ghi RELAXED và search nhu cầu công sở.
2. Đọc SQ675/SET_QUAN: PRICE **1279000**, STOCK PRE_ORDER đềuOK.
3. Chưa đọc giá các ứng viên còn lại, owner gọi request_handoff/PRICE_UNAVAILABLE ở generation3.

Actual handoff commit HUMAN/event1/tag1, không có lời tư vấn gửi khách; **verifier generations0**. [Exact final-wire diagnosis](OWNER_DECISION_DIAGNOSIS.json) xác nhận giá1279000 hiện diện trong final owner request. Không thể gọi đây là bằng chứng shop thiếu giá hoặc verifier chặn quá tay. Mẫu đã đọc vượt ngân sách, giá ứng viên khác chưa đọc; khả năng chọn/đọc phương án phù hợp và đánh giá kết quả tool vẫn là hạn chế owner. Không suy biết lý do nội bộ model hoặc quy lỗi nhân quả cho quote_product từ một campaign.

Hai vòng trước cùng case handoff vì verifier chặn bảo đảm không bó/cấn bụng. **Lần này không viết claim đó không chứng minh đã chữa lỗi fit**: owner bàn giao trước final reply, nên vẫn chưa giải quyết nhu cầu. Giữ whole-terminal evaluation, không chấm thành cải thiện chỉ vì sốverifierFAILgiảm1→0.

## Các phần giữ được và hạn chế tư vấn

- Giá/tồn/cáchbán đúng trong các ca đã kiểm. Policy hiện hành15ngày/30k thắng history7ngày/25k; đã mặc đi làm/thử vào người/cắt tem-giặt được hiểu và từ chối đổi đúng tình huống.
- RELAXED/M-only tiếp tục chọnM, không tự thêmL. Size/giá/ảnh có bằng chứng không được gọi là guaranteedwearcomfort cho mọi khách.
- Giỏ thêmáobeM/preorder, đổiL/2chiếc và correction74/96 đúng; quote998000−49900+30000=978100; private checkout/preview code-owned, confirmation PURCHASE_CONFIRMED/HUMAN không gửi thêm text. Không coi ACKL là fitrecommendation.
- **Negotiation còn lặp lỗi dùng context:** record_negotiation/currentquote đã có hỗ trợship30k, nhưng reply phảnđốigiá chỉ nói “hệ thống chưa có thêm chương trình giảm giá” rồi mời chốt. Sau đó hỏi tổng mới trả499k đúng. VerifierPASS là đúng/nghĩa an toàn trong scope, không chứng minh sức thuyết phục tốt. Không sửa voice/upprompt giữa run.
- Các concern vẫn nhiều lời khen; changed-occasion-v3 chọncảbộ có thể hợp lý, nhưng lý do kéo tiệctối về dù lịch đãđổi. Buying-concern-v3 có chọncảbộ/táchphối để mặc lại, rồi mởáolẻ và giao quyết định vềkhách; upsell không tự là lỗi, nhưng chưa cải thiện rõ usefulness.
- Correction không lặp đủ sốđo/ngoặc; size vẫn đọc lạiheight/weight/preference. Ghi minorvoice đã tạm chấp nhận, không mở thêm vòng sửa giọng.

Whole-turn annotations:32USABLE,7MINOR_LIMITATION,4CORRECT_HANDOFF_MEDIA_EVIDENCE_GAP,3CORRECT_HANDOFF_CONTROLLED_SOURCE_FAILURE,2CORRECT_NO_SEND_AFTER_HANDOFF,1NEEDS_FIX(discovery),2CODE_OWNED_OUTPUT. Đây là self-review theo cả hội thoại, không threshold mới, keywordgrading hoặc independentjudge approval.

## Handoff và NO_SEND phải đọc đúng nguyên nhân

10handoff = **4media evidence gaps +3controlledPOSfaults +1owner-selecteddiscoveryhandoff +2businesshandoffs**. Cả10actual HUMAN/event1/tag1 và0customer text/images. Bốn media needs là3feedback+1colorbindingbe, theo nguồn/capture đã quan sát; không suy shop-wide absence. Ba POS_UNAVAILABLE là fault injection, không livePOSdata-gap evidence. Xem [corrigendum hiện hành](../../../../../docs/specs/c3-phase-b-quote-completion-corrigendum-audit-20261027.md).

4NO_SEND =2HUMANfollowups giữimlặng+2checkout code-ownedquestion/preview. Placeholder NAME/PHONE/ADDRESS trong public artifact là analytics masking, không literalcustomerreply. Private slot owners0/verifiers0 và known synthetic private canaries không có trong model requests. Không claim đã quan sát nhân viên nhận và xử lý tiếp trong test.

## So sánh hai vòng trước

[Cùng51caseIDs](PRIOR_COMPARISON.json); mọi case giữ cùng disposition, nhưng nội dung/calls/reasons khác.

| Chỉ số | R1 | R2 | Hiện tại |
| --- | --- | --- | --- |
| Native terminals |37/10/4|37/10/4|37/10/4|
| Actualimages |7|3|9|
| Requests |143|143|141|
| Generationerrors |2OWNER_TOOL_OUTPUT|0|0|
| Nativeverifier |37PASS/1FAIL|37PASS/1FAIL|37PASS/0FAIL;discoverykhôngfinal|
| Input/outputtokens |971229/84835|958241/89234|955122/89030|

Input soR2 giảm0,33%, soR1 giảm1,66%. Không quy giảmrequests/token cho operation mới: owner/toolpaths/freshsource/clocks khác, discovery bỏverifier nhưng một sốca cótoolcontinuation nhiều hơn. Prompt/code/config hiện đổi so prior; same models/verifier/corpus. BaN1campaigns không causalbenchmark, majorityvote hoặc stabilityproof. Có evidence completion ởquote trongtestedpopulation; chưa evidence tiến bộ tổng thểtưvấn.

## Source/config/provenance và wire audit

- Exact runsource **342ef0cff2888908518872f707ea33ede0f9c290**, sạch vàunchanged toàncampaign; implementationbase008fa28210e8587e6e248486b6b85537800bfc43, executableindependentlyreviewedcc068a8f72b58e5b186705e6f07cfd03b398991e. [Implementation/readiness/review](../../../../../docs/specs/c3-phase-b-quote-completion-implementation-20261027.md).
- [Approved plan](../../../../../docs/specs/c3-phase-b-quote-completion-advice-plan-20261027.md) SHA256526ac86377593db4f652c72cb2159c514081a8d4e8b24df6189da14bca77b468;14approvedsourcehashes vàdist hashes đốichiếu trước run. Subsequentreportchanges chỉdocs/evidence.
- OwnerVertex **gemini-3.5-flash-lite HIGH/global**,candidateCount1/textplain/maxOutput8192/thinkingHIGH; verifier **gpt-6.1-sol high**,CodexChatGPTlogin. Exactaliases observed87owner/54verifierincludingcontrols. Temperature/topP omitted,retry0,timeout90000ms,max1upstream/generation. No substitution.
- Existing scopedCLI0.159.2/hash52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a/login precheckPASS, global client unchanged.
- OwnerpromptSHA256a9fdb61fcbdbb26e2b79a1e70e0cb6637d0ed265ebe6f191f4971c98b8cc1ce1; verifier8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c. SchemaHash19a67ac0… là existingverdictschema, khôngtooldeclarationhash. Stateful toolSchemaHash **43e9f0c4f34023852f5c5f0365f10c90800a56f474ea7a0324f287d3865508fa** gồmquote declaration; sixregistrations match.
- [Registration](REGISTRATION.json), [runcontext](RUN_CONTEXT.json), [CLI](CLI_PRECHECK.json), [commands](COMMANDS.json). Foundation implementationBaseSha dc1308c9… trong reusable driver là historicalfoundation, không bị viết lại để giả implementationbase mới.
- [Wireaudit](MEDIA_SIZE_WIRE_AUDIT.json):87actualownerrequests,43cócapabilityhint/44không, max2161B/field/3products; dưới1024B/product,4096B/field.37nativeverifiertrustedcontexts không thêmhint. B1readonly khôngcóhint khôngphảiomission.
- 141actualbodies,87ownerhash/bytesmatches,33verifierpre-dispatchshadowmatches gồmcontrols/persisted và21B1capture/telemetrymatches. Bounded evaluator-only/secret-key/case-ID/private-canaryscan0matches, khôngprivacyproofphổquát. Actualquotes6primitiveworkscounted, nohidden-generationretry. Chỉ one actualnative valid size response được audit fieldco-location; không diễn giải sốresponse thành sốca size đãverify nếu response nằm trong existingserializedtrace.

21B1eligibility-only;30persistedslots isolatedPostgreSQL/ingress/capture,1privatecode-only. Live public catalog/current policy reads trongapprovedharness, mô tả candidate cóisolatedregistrydescription override như cácvòngtrước; khôngsource-storewrite/publish. NoMeta/Pancake/POSmutationthật,livecustomersend0.6testDBsdrop. Đây là PhaseBqualification, không fullA2/A3mới; CheckpointA vẫn owner-bypassed.

## Operational accounting

| Chỉ số | Kết quả |
| --- | --- |
| Completeoutcomedenominator |68=17controls+51native;0not-run|
| Actualgenerationrequests/attempts |141=87owner+37nativeverifier+17controlverifier;cap217,max1upstream,retry0|
| Errors/auth/HTTP/timeouts |0/141;khôngdropattempt|
| Controls |8safeeligible/8unsafeblocked/1probeeligible;0errors|
| Nativeverifier |37PASS;0FAIL/UNCERTAIN/errors;khôngphải37qualityPASS|
| Handoff/no-send/fallbacktext |10/51=19,6%;4/51=7,8%;fallbacktext0|
| Verifierproviderlatency |37samples,p50 5,992s/p95 12,227s|
| Verification+readback |37samples,p50 7,546s/p95 15,085s;observedstage,khôngcausalestimate|
| Wholeslot |51samples,p50 20,972s/p95 44,288s;khôngliveSLA|
| Tokens |955122input/89030output;82325thinking/reasoning đã nằm trongoutput|
| Cost |Khôngexpose,null|
| Cleanup |6/6testdatabasesdropped|

**zero observed send-eligible false PASS** trên8unsafecontrols của frozen testedpopulation/configuration này. Không fullA2 hoặc proofsemantic safety. [Metrics](REVIEW_METRICS.json), [accounting](TASK_ACCOUNTING.json), [cleanup](DATABASE_CLEANUP.json), [controls](CONTROLS_OUTCOME.json), [rawhashes](RAW_SHA256.json).

## Commands thực chạy và giới hạn

Raw/script/logs ngoài repo `C:/Users/nguye/Documents/Sản phẩm AI/c3-b-quote-completion-model-20261027`. Không commit raw providerrequests/sourcecapture/privateinputs. Registration/reviewprotocol trướcnative, noexecutablechange. Hai driverphases và20childcommands exit0.

```powershell
$env:APPDATA='C:/Users/nguye/Documents/Sản phẩm AI/c3-eval-runtime-01592'
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/DISPATCH_DRIVER.py "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-quote-completion-model-20261027" controls
python apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/DISPATCH_DRIVER.py "C:/Users/nguye/Documents/Sản phẩm AI/c3-b-quote-completion-model-20261027" native
node "../c3-b-quote-completion-model-20261027/ANALYZE.mjs"
node "../c3-b-quote-completion-model-20261027/QUOTE_TASK_AUDIT.mjs"
node "../c3-b-quote-completion-model-20261027/AUDIT_MEDIA_SIZE.mjs"
node "../c3-b-quote-completion-model-20261027/OWNER_DECISION_AUDIT.mjs"
python "../c3-b-quote-completion-model-20261027/ACCOUNTING_AUDIT.py"
python "../c3-b-quote-completion-model-20261027/COMPARE.py"
python "../c3-b-quote-completion-model-20261027/WHOLE_TURN_REVIEW.py"
```

Offline audits PASS. Curated JSON parse, coverage51case IDs/hội thoại, local links,147raw file hashes và source/dist hashes được kiểm; chỉ public evidence được commit. Bounded credential-pattern scan và staged diff check thực hiện trước commit. Một commentaryshellread controls/summary sai cwd trảpathnotfound; independentdriver readiness vẫn đọcđúngexternalcontrols vàPASStrướcnative. Khôngproviderrerunhoặcexecutablesửa từ lỗiđọcbáocáonày. Markdowncuratedchỉchuẩnhóatrailingspaces,exactstringsgiữJSON/raw; khôngcapturetextrestoration cầntrongrunhiện tại.

Prior deterministicreadiness516worker/221Node/2stubbedPython,worker typecheck/build/lint PASS trênreviewedsourcecc068a8f; khôngchạy lại trongmodel-onlycampaign. KhôngremoteCIPASS hoặcindependentwholeterminalreviewmới. Structuralcomplexitydelta0vàsemanticroles/layers thêm0 trongcampaign; operation được implement trước run, khôngpostrunfix.

**Recommendation: B chưa GO.** Giữ kết quảvòngnày: quotecompletion quan sátđúng ở3ca, giao dịch/policy vẫn đúng; discovery chưa giảiquyết nhu cầu và negotiation/usefulness còn lặp hạnchế. Không tự sửa prompt/source, chạy thêm vòng, metadatawrite, merge/deploy/live send.
