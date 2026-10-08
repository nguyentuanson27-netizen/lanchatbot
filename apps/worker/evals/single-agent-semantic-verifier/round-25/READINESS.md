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
