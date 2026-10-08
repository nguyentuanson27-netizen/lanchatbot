# Round25 — commands actually run

Checkpoint A only. Refreshed main/implementationBaseSha296cdcfbf5759f5bf9cbb24acf3dc63005589361;starting/specSHA30285850594bf5495c32c6a2bd70d6bd755cb50b. T1savepoint dc4e25992b4001ba131560ebf9994aff1bb5a5db. No provider generation before freeze/readiness/source seal. Existing isolated branch/draftPR390.

|Actual command|Observed result|
|---|---|
|git fetch origin main;git rev-parse origin/main HEAD;git status --short --branch|exit0;main296cdcfb,starting30285850,clean isolated implementation branch|
|node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round25.mjs|initialexit1:temporary helper addressed absent manifest.operational;no provider calls. Corrected bounded incomplete-freeze guard/property,rerun exit0;108A2/42A3,61existing-engine status-first summaries,536historical evalfiles inventoried,0generation|
|git diff --check;git add -- explicit T1files;git commit -m 'eval(c3): freeze self-reviewed Round25 decision context experiment'|exit0,T1dc4e2599|
|C3_CHECKPOINT_A_ROUND=24;node --test apps/worker/evals/single-agent-semantic-verifier/size-input-context-decision.test.mjs|before change exit1,RED0/3:missing status/presentation;full/partial/out-of-range cases|
|same env;node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference-diagnostics.test.mjs|before change exit1,RED0/3:missing stage/bounded diagnostic metadata|
|C3_CHECKPOINT_A_ROUND=25;node --test apps/worker/evals/single-agent-semantic-verifier/round-25.test.mjs|before selector exit1,RED0/1 UNKNOWN_CHECKPOINT_ROUND;partial selector exit1,1/3 VARIANT_IDENTITY;complete selector before retention exit1,RED2/3 missing expected exception|
|C3_CHECKPOINT_A_ROUND=24;node --test apps/worker/evals/single-agent-semantic-verifier/size-input-context-decision.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference-diagnostics.test.mjs|after minimum source change exit0,GREEN6/6|
|C3_CHECKPOINT_A_ROUND=25;node --test apps/worker/evals/single-agent-semantic-verifier/round-25.test.mjs apps/worker/evals/single-agent-semantic-verifier/size-input-context-decision.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference-diagnostics.test.mjs|after retained-data contract exit0,GREEN9/9;all61prepared summaries reproduce,changed status invalidates oldPASS,both-role captured marker firewall|
|pnpm --filter @lana/worker build|exit0,worker/dependency builds|
|pnpm --filter @lana/worker lint|exit0|
|pnpm --filter @lana/worker typecheck|exit0,worker/dependency builds|
|C3_CHECKPOINT_A_ROUND=25;C3_TEST_CODEX_TRANSPORT=1;node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference-diagnostics.test.mjs|exit0,23/23=protocol9/Codex11/diagnostics3,0skips;installed CLI against LOCAL upstream stub,0real generation|
|pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts|exit0,77/77=boundary43/Vertex34|
|pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts|exit0,41/41=claims7/assembly14/SizeEngine20|
|C3_CHECKPOINT_A_ROUND=25;C3_TEST_CODEX_TRANSPORT=1;node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs > C:/Users/nguye/AppData/Local/Temp/c3-round25-full-tests.log 2>&1;read final summary|exit0,143/143,0skips;legacy preparations still reproducible|
|C3_CHECKPOINT_A_ROUND=25;node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs|exit0,FROZEN_PROTOCOL_VALID;108A2/42A3|
|git diff --check;git diff --numstat;focused source self-review|exit0;code+43/-18 across3eval-only sources:protocol25/-8,adapter13/-8,helper5/-2|
|C3_CHECKPOINT_A_ROUND=25;existing C3_VERTEX_CREDENTIAL_FILE selected;node C:/Users/nguye/AppData/Local/Temp/c3-inspect-round25-providers.mjs|exit0,CLI0.159.2/ChatGPTlogin/exactbinaryhash/approvedVertexcredentialavailable,0generation/noquota probe/no secrets printed|

Official OpenAI provider-config/auth/request-id pages searched/opened before adapter diagnostics changes. Existing endpoints/config/login unchanged;no credential mutation,quota probe or retry. Diagnostic codes/stages and validated identifiers only;raw provider/client/error/credential data are not retained. CLI auth refresh HTTP accounting is not exposed;upstream generation count is enforced by the relay. Diagnostics do not establish an availability fix.

Prepared61code summaries change representation/hash,not facts or fit authorization. Retained108A2/exact42histories/evaluators/businessfacts/models/verifier/schema/bars/fallbacks. Owner prompt6380→6116bytes with generic voice demonstrations outside corpus. Three new focused files/nine tests. Semantic roles/layers/gates/state added0;no shared/worker runtime/production change. Tests establish deterministic contracts,not model obedience. Source/config must be committed and clean before runtime HEAD seal/preflight.

## Actual A2 execution

|Actual command|Observed result|
|---|---|
|node C:/Users/nguye/AppData/Local/Temp/c3-secret-scan-round25.mjs|exit0,17named currentfiles,0secret-patternmatches;synthetic fixtures|
|git add -- explicit T2files;git commit -m 'eval(c3): qualify size decision context and bounded provider diagnostics';git status --short;git rev-parse HEAD|exit0,clean executable/config source3d3ad8d3a476dd76f3eeeb96649c69da019f7a31|
|C3_CHECKPOINT_A_ROUND=25;A2_RUN_SOURCE_SHA=current clean HEAD;node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2|exit0,FROZEN_PROTOCOL_VALID|
|same environment;node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs|exit0,A2PASS108/108=69UNSAFE/39SAFE;zero observed send-eligible false PASS;safe failures1/39=2.56%|
|C3_CHECKPOINT_A_ROUND=25;node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2|exit0,complete denominator/binding/finalgate|
|same environment;node C:/Users/nguye/AppData/Local/Temp/c3-audit-round25.mjs|exit0,8sources/11frozenassets/104capturedbodies match;533/536historical evalfiles exact,only3declared executable changes|

104generation/104client/max1/retry0/providererror0/timeout0,allusage reported,costnull. Verifierp50/p956669/12584ms;added6672/12586ms;input450870/output11980. r4-safe-policy received semanticFAIL,not providererror. Fourdeterministicrejects take0generation. FreshA2PASS permits clean-sealed42A3once;no prompt/input/source rescue.

## Actual A3 execution and review

|Actual command|Observed result|
|---|---|
|git add -- explicit A2evidence/todo/readiness;git commit -m 'eval(c3): preserve Round25 A2 qualification evidence';git status --short;git rev-parse HEAD|exit0,clean A3source 0c3d3cb9744ca8e8c48e9539ef3b669d987193c5|
|C3_CHECKPOINT_A_ROUND=25;A3_RUN_SOURCE_SHA=currentcleanHEAD;A2_STATUS=PASS;existinglocalVertexcredential selected;node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3|exit0,FROZEN_PROTOCOL_VALID,clean runtimeSHA 0c3d3cb9744ca8e8c48e9539ef3b669d987193c5|
|sameenvironment;node apps/worker/evals/single-agent-semantic-verifier/run-a3.mjs|exit0,42/42complete;34eligible/8fallback19.05%,0handoff/no-send;42owner+42mandatoryverifiergeneration,max1/retry0|
|C3_CHECKPOINT_A_ROUND=25;node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3|exit0,FROZEN_PROTOCOL_VALID;rawqualityBLOCKEDpendingreview/human-null retained|
|node C:/Users/nguye/AppData/Local/Temp/c3-read-a3-round25.mjs with bounded batches covering0–42;read frozen product profiles/policy and compare all non-size profile fields;targeted history/evaluator reread|exit0,all42fullhistories/latest/currentfacts/actualterminals read before final scoring;future unexecuted slots reread after completion|
|C3_CHECKPOINT_A_ROUND=25;node C:/Users/nguye/AppData/Local/Temp/c3-score-round25.mjs|exit0,42connectedwhole-turnreviews/420diagnostics,0additionalprovider requests;primary30PASS/12FAIL,families5/11,8/9,8/10,6/9,3/3,A3FAIL|
|sameenvironment;node C:/Users/nguye/AppData/Local/Temp/c3-audit-round25.mjs after completed run/scoring|exit0,8sources/11inputs/188capturedclientbodies matchseals/firewall,533/536historicalevalfiles exact,3declaredexecutable edits|

All42drafts survived deterministic precheck and invoked verifier. 34PASS+8semanticFAIL,0providererrors/timeouts;no malformed/UNCERTAIN. 188upstreamgeneration/188capturedclientenvelopes,max1/retry0/rejected-client0. Reportedauth1fromVertex;Codex internaltoken-renewal HTTP accounting unavailable,not allnetworkrequests. Input936745/output73691,usagegap0/costnull. Gemini candidate2461+thinking54349=output56810 normalized by audit;legacy raw summaries unchanged. A3verifierp50/p956547/13470ms,added6550/13473ms,end-to-end12557/26599ms. Primary4eligiblequalityfailures separatefrom8fallbacks. Whole-meaning ambiguities retained,not automaticunsafe labels/keywordban. No probe/retry/substitution/resample/executable or frozeninput tuning.

Exact existingcredential-route environment used,without printing keys/tokens:

```powershell
$env:C3_CHECKPOINT_A_ROUND='25'
$env:A3_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim()
$env:A2_STATUS='PASS'
$env:C3_VERTEX_CREDENTIAL_FILE=(Get-ChildItem -LiteralPath 'C:/Users/nguye/Downloads' -Filter 'project-388db62b*.json' -File | Select-Object -First 1).FullName
```

## Actual artifact validation

|Actual command|Observed result|
|---|---|
|node C:/Users/nguye/AppData/Local/Temp/c3-record-a3-round25.mjs;node C:/Users/nguye/AppData/Local/Temp/c3-report-round25.mjs|exit0,42reviews/12failedturns/CHECKPOINT_A/readiness/todo/plan recorded;STOP recommendation|
|node C:/Users/nguye/AppData/Local/Temp/c3-normalize-markdown-round25.mjs|exit0,display trailing whitespace trimmed only in A3_CONVERSATIONS/A3_FAILURE_REVIEW/A3_HUMAN_REVIEW;all15JSONfiles unchanged|
|node C:/Users/nguye/AppData/Local/Temp/c3-verify-export-round25.mjs|exit0,42actualterminal exports/420ratings,rawJSON/human-null/sealedinputs/source identities intact,markdown links valid;188requests/936745input/73691output|
|node C:/Users/nguye/AppData/Local/Temp/c3-secret-scan-round25.mjs;git diff --check|exit0,30currentfiles scanned/0secret-patternmatches;synthetic fixtures|

Whitespace normalization is Markdown display only. Exact customer-visible text, requests, verdicts, hashes and blank human scoring remain in unchanged JSON;displays include every blocked candidate as diagnosis,never as the scored terminal. No provider generations during scoring/audit/report/export. Git/PRdelivery recorded after actual execution.
