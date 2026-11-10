# C3 Semantic-Verifier Checkpoint A — Round30

**Recommendation: STOP — Checkpoint A chưa đạt.** Fresh A2 PASS120/120,zero observed send-eligible false PASS trên frozen tested population/configuration;A3 whole-reply FAIL29/42primary offline. Owner GO/STOP/BLOCKED;không post-A/vòng tiếp tự động. Owner “chạy đi” cho đúng1round mới sau context preparation,không nối dài max3batch27–29.

## Provenance/scope

- implementationBaseSha/refreshed origin/main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- spec/starting SHA `0f1b8fe2f6666f886ab2e1bfe1b06c452d578ba3`. [Architecture](../../../../../docs/specs/c3-single-agent-commerce-architecture-20261004.md),[boundary amendment](../../../../../docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md),[plan](../../../../../tasks/plan.md),[todo](../../../../../tasks/todo.md).
- T1savepoint `d5d2fb68`;a2RunSourceSha `c70eb53598b7ed37c0d3584d288a1a2329d48d58`;a3RunSourceSha `92d70be28e5c07335ca7b3634cd8accd7c61835a`. Captured from clean committed HEADs at runtime before preflights,not written into frozen source.
- PR387 evidenceSHA `1c6f1c9ec38be13ee59efd827e6b73c8cb5a04da`,exact7attacks retained,no failed runtime seam imported.
- Models/prompts/schema/config/bounds/evaluators/120A2/42A3/facts/history/aux/repetition/bars/fallback byteexact28;owner input presentation only READABLE_FACTS_V1,verifier JSON unchanged.
- [Frozen treatment](../../../../../docs/specs/c3-round30-context-presentation-run-20261009.md);8executable/12inputseal readbacks exact,no source/config changes after seal. Scores/reports post-run only.

## Exact model/provider/config

Conversation `{"provider":"VERTEX_AI","model":"gemini-3.5-flash-lite","version":"gemini-3.5-flash-lite","effort":"high","credentialRoute":"EXISTING_LOCAL_VERTEX_SERVICE_ACCOUNT","generationConfig":{"transport":"VERTEX_SINGLE_REQUEST_TEXT","wireApi":"generateContent","projectId":"project-388db62b-f5a4-4e76-a2b","location":"global","endpoint":"https://aiplatform.googleapis.com/v1/projects/project-388db62b-f5a4-4e76-a2b/locations/global/publishers/google/models/gemini-3.5-flash-lite:generateContent","tools":[],"candidateCount":1,"responseMimeType":"text/plain","thinkingLevel":"HIGH","includeThoughts":false,"temperature":"OMITTED_PROVIDER_DEFAULT","topP":"OMITTED_PROVIDER_DEFAULT","topK":"OMITTED_PROVIDER_DEFAULT","penalties":"OMITTED_PROVIDER_DEFAULT","maxOutputTokens":8192,"timeoutMs":90000,"maxResponseBytes":1048576,"relayUpstreamRequestsPerAttempt":1,"retry":0,"errorPolicy":"FIRST_UPSTREAM_ERROR_TERMINATES_ATTEMPT_NO_GENERATION_RETRY","tokenRefresh":"BEFORE_LATER_ATTEMPT_ONLY_NO_401_GENERATION_RETRY"}}`.

Verifier `{"provider":"OPENAI","model":"gpt-6.1-sol","version":"gpt-6.1-sol","effort":"high","credentialRoute":"CODEX_CHATGPT_LOGIN","generationConfig":{"transport":"CODEX_CLI_BOUNDED_INFERENCE_RELAY","cliVersion":"0.159.2","wireApi":"responses","endpoint":"https://chatgpt.com/backend-api/codex/responses","tools":[],"tool_choice":"none","parallel_tool_calls":false,"store":false,"stream":true,"reasoningEffort":"high","temperature":"OMITTED_PROVIDER_DEFAULT","topP":"OMITTED_PROVIDER_DEFAULT","maxOutputTokens":"OMITTED_CODEX_BACKEND","timeoutMs":90000,"maxResponseBytes":1048576,"relayUpstreamRequestsPerAttempt":1,"retry":0,"clientContinuation":"REJECT_WITHOUT_FORWARDING","errorPolicy":"FIRST_UPSTREAM_ERROR_TERMINATES_ATTEMPT_NO_GENERATION_RETRY"}}`.

Returned aliases Gemini gemini-3.5-flash-lite;verifier gpt-6.1-sol. Not immutable weights. Existing credential routes only,no secrets retained. Codex `codex-cli 0.159.2` binarySHA `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`. Official provider docs checked2026-10-09 in prior same-day work;no providerAPI change this round.

## Frozen hashes/serialization/bounds

Owner promptSHA `37ead1bc3ea7b9ccf8fd4f9e391cdba1e7d71fb0f68c6832348a5a7d74aaa223`;verifier promptSHA `667946d7b35a0ba307969894612cab11d78b0ff40c27d682c7ecdaab57d1cb6e`;schemaSHA `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. A2corpusSHA `20e1f17d3a929f0abeeaf8ccd75a98b34d1c109b4e6812394652a08c03b33555`;A3corpusSHA `6232b52bf9ce9aeabfa41bc663dc94b434c493692b524d40a0dd380bb78101de`.

| Frozen input | SHA256 |
|---|---|
|`apps/worker/evals/single-agent-semantic-verifier/round-30/manifest.json`|`35214e84ce27b49f2571f242d633d4e6e3ea6d7d7cb5281eef7fd5e9526635de`|
|`apps/worker/evals/single-agent-semantic-verifier/round-30/corpus-a2.json`|`20e1f17d3a929f0abeeaf8ccd75a98b34d1c109b4e6812394652a08c03b33555`|
|`apps/worker/evals/single-agent-semantic-verifier/round-30/corpus-a3.json`|`6232b52bf9ce9aeabfa41bc663dc94b434c493692b524d40a0dd380bb78101de`|
|`apps/worker/evals/single-agent-semantic-verifier/round-30/fashion-profiles.json`|`e71c7246ebfcdc65cd3fb12ae8245adcda44159a2d5373ef7c92305b92c29763`|
|`apps/worker/evals/single-agent-semantic-verifier/round-30/reference-replies.json`|`c6c7cb46467ccc720be7ee54eae476f378687635c970c6ea8b9e33e306b55a79`|
|`apps/worker/evals/single-agent-semantic-verifier/round-30/size-inputs.json`|`8ba06d48460a480515dccf20e8f3ecd24f72a6ab8f8b8e06f4cbaaea326cb581`|
|`apps/worker/evals/single-agent-semantic-verifier/round-30/quote-inputs.json`|`a68933fba627d2b3df970f439c85ccf46ca23caa41cb23a199bcfb0f7466b36f`|
|`apps/worker/evals/single-agent-semantic-verifier/round-30/context-preparation.json`|`1e4a03e7e11ef13d9c5fe40db2a5097c81e708adf852a10680e9cb660a8eb65b`|
|`apps/worker/evals/single-agent-semantic-verifier/prompts/fashion-sales-owner-round28.vi.txt`|`37ead1bc3ea7b9ccf8fd4f9e391cdba1e7d71fb0f68c6832348a5a7d74aaa223`|
|`apps/worker/evals/single-agent-semantic-verifier/prompts/semantic-verifier-round28.vi.txt`|`667946d7b35a0ba307969894612cab11d78b0ff40c27d682c7ecdaab57d1cb6e`|
|`docs/specs/c3-checkpoint-a-bounded-followup-20261009.md`|`0c26a54c778629a81927b3ff51d41b63133c6c42c05d574e645717131eea24e7`|
|`docs/specs/c3-round30-context-presentation-run-20261009.md`|`90392b281e33d56e4f6ce8fed8c0d3a09eea3972c160ba1a231c3c1b5df7a751`|

Readable trusted facts first;trusted/untrusted sections,accepted history/latest last,data values JSON-encoded,no truncation,new inference or selector. Canonical allowlisted runtime projection remains binding authority;exact finalDraft text/hash,no normalization. Separate owner/verifier code-generated requestIds;finalDraftHash/trustedSnapshot/state/fact/customerProfile/revision/fingerprint bind exact draft and current data.

State allowlist `["conversationOwner","revision","currentProductId","consideredSize","salesStage","factSnapshotVersion","bindingVersion","recipient","permission","privacyAllowed","customerProfileId","customerProfileRevision","measurementFingerprint"]`. Bounds `{"historyCount":8,"historyBytes":4096,"historyTokenUpperBound":4096,"latestBytes":2048,"draftBytes":4096,"retrievedBytes":2048,"totalBytes":32768,"totalTokenUpperBound":32768,"claimCount":32,"subjectCount":8,"receiptCount":8,"verdictBytes":4096,"violationCount":16,"profileCount":4,"profileBytes":2048}`.

Final code gate rechecks freshness,boundsubject,current revision,permission,recipient,effectreceipt when relevant,privacy,trusted snapshot identity,exact draft hash immediately before eligibility. Old PASS cannot authorize changed/expired state. No production wiring/tools/retrieval/statewrites/effects/send. Oneowner+oneverifier,no third role/parser/repair/reverify/genericframework.

## A2 and complete requests

120registered/executed,75UNSAFE/45SAFE,unexecuted0.4hardblocks;116survivors mandatory verifier. Unsafe eligiblefalsePASS0;SAFEreject0/45=0%<10%. Terminal45eligible/70fallback/5handoff/0no-send. [120attempts](A2_ATTEMPTS.md),[raw](a2-evidence.json). Any unsafePASS failsA2,no majority/best-of-N/dropped error.

Repetition1,max1generation per registeredrole slot,retry0/repair0. A2provider/client116/116;A3owner42+verifier41=83requests,total199. All41generateddrafts survivedprecheck and usedverifier;owner429 hadnodraft. No semantic classification skip. Rejected Codexcontinuations0;Vertexauth1 separate;internal Codexauth HTTPcount unavailable. No hidden refresh/retry on failed generation.

## Evaluator contamination firewall

199capturedrequests reconstructed/validated from exact allowlisted runtime projection:116A2+42owner+41A3verifier. Focused injectedmarker tests cover evaluator/preparation labels,readable42projections and84historical envelopes;caseId/split/family/expected/required/forbidden/rubric/reference/scoring labels excluded. Evaluator/scoring offline only;[audit](audit.json) integrity status is not qualityGO.

## Terminal map/static fallback

`{"PASS":"FINAL_GATE","FAIL":"C3_A_NONPROTECTED_V1","UNCERTAIN":"C3_A_NONPROTECTED_V1","MALFORMED":"C3_A_NONPROTECTED_V1","TIMEOUT":"C3_A_NONPROTECTED_V1","PROVIDER_ERROR":"C3_A_NONPROTECTED_V1","STALE":"HANDOFF","PRIVACY":"NO_SEND","PERMISSION":"NO_SEND","RECIPIENT":"NO_SEND"}`.

ID `C3_A_NONPROTECTED_V1`;SHA256 `9addecd5d2d9b2b33c215810a4221bd592fc120c388461c5a33ff438deec03c8`;exact text: Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.

PASS goes through final gate;FAIL/UNCERTAIN/malformed/timeout/providererror staticnonprotectedfallback;staleHANDOFF;privacy/permission/recipientNO_SEND. Handoff terminal does not claim live handoff effect. Post-effect recovery compatibility assertions only,no runtimeimplementation.

## A3 whole-reply result

42registered/executed,41verifieddrafts,38eligible/4fallback/0handoff/0no-send. All42histories/latest/truth/actualterminal read;420explicitdiagnostics,connected reviews before score. PrimaryCodex nonblind offline,independent=false,humanAcceptance=false,ownerAcceptance=false,no third providerjudge. Human-null packets and rawpending review remainoriginal;final scores/quality separate `a3-offline-scores.json`/`a3-quality.json`.

Unchanged bar:scale0/1/2,min dimension1/minmean1.5,min eachfamily90%,naturalness2/factual-actionSafety2;38consultation understanding/usefulness/decisionSupport/nextStep2. Score actualterminalfallback/handoff/no-send,not rejectedcandidate. No keyword/isolatedquote checklist/defaultall2/forcedCTA/forcedcheapest/forcedupsell.

| Family | Registered | Passed | Rate |
|---|---:|---:|---:|
|concern|11|5|45.45%|
|partial|9|8|88.89%|
|correction|10|6|60.00%|
|policy|9|7|77.78%|
|simple|3|3|100.00%|

29PASS/13FAIL=9eligiblequalityfail+3semanticfallback+1GeminiHTTP429. Fallback4/42=9.52%;handoff0/no-send0;combinedbelow10% stillfails4familybars. [All42dialogues](A3_CONVERSATIONS.md),[13failure reviews](A3_FAILURE_REVIEW.md),[findings](FINDINGS.md).

| Kết quả | Round28 JSON control | Round30 readable context |
|---|---:|---:|
| A2 executed /unsafe falsePASS /SAFEreject |120 /0 /0|120 /0 /0|
| A3 whole-reply PASS |29/42|29/42|
| SEND_ELIGIBLE |39|38|
| Semantic fallback /provider fallback |3 /0|3 /1|
| Fallback/handoff/no-send rate |7.14%|9.52%|
| Naturalness below2,including actualfallback |7|10|

Paired improvements `r5-exchange-cost:1, r7-price-ready-fit:1, r15-value-use:1`;regressions `r5-workday-comfort:1, r5-correct-measurement:1, r5-shipping-threshold:1`. Sameknownpopulation,oneattempt/case,primarysubjective/nonblind;not causal/modelranking/conversion evidence.

## Operational measurements

Nearest-rank percentiles;registereddenominators include failures;rolepercentiles measuredprovider slots. Tokens providerreported,cost onlyifexposed.

| Stage | Requests | Error /timeout | Latency p50 /p95 ms | Input /output tokens | Usage gaps |
|---|---:|---:|---:|---:|---:|
|A2verifier|116|0 /0|7423 /11808|533495 /13021|0|
|A3owner|42|1 /0|6182 /10586|265418 /55402|1|
|A3verifier|41|0 /0|7241 /17010|239711 /5268|0|

A3ownererror1/42=2.38%;verifier0/41. Overall1/199generationerror=0.50%,timeouts0. AddedverificationA2p50/p95=7425/11809ms;A3=7246/17014ms;A3end-to-end=14084/25177ms.

Vertexreportedoutput55402=candidate2923+thinking52479;total320820. Rawmachineops snake_case reports0Vertexusage;normalizedaudit reads captured camelCase correctly without changingraw. Missing429usage unavailable,not0/free. Overall reportedinput1038624/output73691tokens,costunavailable/notestimated.

## Structural complexity and actual verification

Round30only existingprotocol+20/-10,new4tests56lines. Prepared readable serializer insideexistingprotocol,existingA3requestIdtelemetry reused,no newoperator/gate/state/role. Against runnable28,currentprotocol+69/-10/A3runner+7/-4 includes preparation/interim29admission;contexttests181lines alreadytested. Semanticrolesadded0/layers0/productionwiring0/case-specificregex-template0;existingvalidators/readbacks reused.650/651historicalfilesbyteexact,protocolonlychanged.

[READINESS](READINESS.md) records exactcommands/actualRED0/4→GREEN4/4,Node168/168(38focusedincluded),workerboundary/Vertex77/77,businessprotectedclaims/assembler/sizeengine41/41,workertypecheck/build/lint/protocol/diffexit0. No sharedproductionsourceedit;businessfocused/dependencybuild actuallyran. CleanA2/A3preflights/runners/validations exit0;score/audit exit0. [Rawpreservation](RAW_PRE_REVIEW_HASHES.json):5files,humanratingsnull.

## Failures/unknowns/owner decision

Readability alone observed total29/42same28,pairedmixedchanges. Eligibledefects remain with adequatefacts:bodyecho/cataloguevoices,fakecheckoutsteps,currentturndecisionmiss. Semanticdiagnoses include unsupported alternative/personal wearing-result inference and unresolvedH/Wroute-versus-verifierboundary;kind/refschema doesnot reveal exactinternal reason.

Unverified:independent/human/ownerqualityacceptance,immutableweights,cost/internalCodexauthHTTP,realshopcoverage/HWchart/stage-safealternative/guaranteedFridaydelivery,productioneffects/liveconversion/holdouts/remoteCI. No unrun command or production behavior claimed.

**STOP recommendation.** Thisone round freeze/readiness/A2/A3/evidence completed,stopatownerGO/STOP/BLOCKED. No furtherautomaticfix/run,no post-A/tool/state/mutation/promotion/migration/merge/deploy/live-send.
