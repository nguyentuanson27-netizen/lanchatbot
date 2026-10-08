# Round23 — actual readiness and run evidence

Owner confirms quota available and requests new round;no quota probe/investigation. Environment `C3_CHECKPOINT_A_ROUND=23`,installed local transport tests `C3_TEST_CODEX_TRANSPORT=1`. Existing Gemini/Codex routes/models/config retained. implementationBaseSha/refreshed main `296cdcfbf5759f5bf9cbb24acf3dc63005589361`;starting/spec `7fb625023e0122f4cabf9b96816e0a25fd6f812b`. Isolated implementation branch/PR390. No production wiring/live send.

|Actual command|Observed result|
|---|---|
|git fetch origin main;git rev-parse origin/main;git rev-parse HEAD;git branch --show-current|exit0,exact identities above|
|C3_CHECKPOINT_A_ROUND=22;node --test apps/worker/evals/single-agent-semantic-verifier/size-input-context.test.mjs before helper|RED0/4,missing module|
|same focused size-context command after minimum helper|GREEN4/4,0skip|
|node C:/Users/nguye/AppData/Local/Temp/c3-freeze-round23.mjs|exit0,108A2/42A3/61code sizing admissions,486oldfiles inventoried,0generation|
|inline Node final owner-prompt cleanup before T1commit|exit0,remove duplicated old voice section,7433bytes versus prior7591,final prompt hash frozen before provider|
|git diff --check;git diff --cached --check;git commit -m "eval(c3): freeze Round23 decision prompt and engine sizing context"|exit0,T1savepointdf94964a|
|C3_CHECKPOINT_A_ROUND=22;node --test apps/worker/evals/single-agent-semantic-verifier/round-23.test.mjs|RED0/3,UNKNOWN_CHECKPOINT_ROUND/PROFILE_BOUND|
|C3_CHECKPOINT_A_ROUND=23;same round-23.test.mjs after fixed23selection support,before retention block|RED2/3,changed evaluator was not rejected;initial Temp string replacement missed CRLF anchor|
|same round23 command after retention block|GREEN3/3,0skip|
|C3_CHECKPOINT_A_ROUND=23;node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs|exit0,9/9,0skip|
|C3_CHECKPOINT_A_ROUND=23;C3_TEST_CODEX_TRANSPORT=1;node --test apps/worker/evals/single-agent-semantic-verifier/*.test.mjs|exit0,131/131,0skip|
|same environment;node --test apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs|exit0,11/11,0skip;local stub only|
|pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts|exit0,77/77(43boundary+34Vertex)|
|pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts|exit0,41/41(7claims+14assembly+20engine)|
|pnpm --filter @lana/worker typecheck|exit0,existing dependency lifecycle builds|
|pnpm --filter @lana/worker build|exit0,existing dependency lifecycle builds|
|pnpm --filter @lana/worker lint|exit0|
|C3_CHECKPOINT_A_ROUND=23;node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs|exit0,FROZEN_PROTOCOL_VALID108/42|
|git diff --check;inline historical-file hash readback|exit0,485/486oldfiles exact,only declared protocol changed|
|node --check C:/Users/nguye/AppData/Local/Temp/c3-audit-round23.mjs|exit0;report helper prepared,no generation|

Protocol+21/-8lines fixed23selection/retention only. Evaluation-only22line helper reuses existing verified chart selection/recommendSize/missingInputs and bounded/hash-bound profile sizeChart;4focused tests+3round tests. No new payload field/authority/proof/gate/state/role/framework/parser/regex/replytemplate;existing worker/shared/provider source unchanged. Old boundaryRED/GREEN evidence retained,all61prepared profiles admit through existing hard-precheck/finalgate;changed size hint invalidates oldPASS snapshot. Captured owner/verifier requests omit evaluator/admission labels,maxdraft bounds tested. One conversational owner and one verifier,mandatory verifier for every hard-precheck survivor,code sole authority preserved.

Frozen owner SHA256 `e456b2ba76d4f434a8a65fe4c09404120ec6080d4ed1b3658674016e224421cf`;verifier exact22 `23976555204d32eca1b29e106ca58d15f98ca32c29bb785506404f94b5b93f8b`. Source/profile/fit/policy/bounds/config/bars retained;only owner decision/voice and engine-derived existing-profile summaries changed. Stage-light replacement and actual height/weight chart ranges remain unavailable in current corpus/repo sources;no fabricated facts. Synthetic evidence,not realshop data;one repetition/no causal quality claim. Provider source seals and run outcomes recorded after actual execution below.

|Actual execution after readiness|Observed result|
|---|---|
|git diff --check;git diff --cached --check;git commit -m "test(c3): pass Round23 sizing and verifier readiness"|exit0,T2savepoint `4f01e246dcc844935fc96f10340a85439f304bbc`|
|$env:C3_CHECKPOINT_A_ROUND='23';$env:A2_RUN_SOURCE_SHA=(git rev-parse HEAD).Trim();node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2|exit0,clean executable/config worktree;runtime sourceSHA `4f01e246dcc844935fc96f10340a85439f304bbc`|
|same frozen environment;node apps/worker/evals/single-agent-semantic-verifier/run-a2.mjs|exit0,A2PASS108/108,69UNSAFE/39SAFE,zero observed send-eligible false PASS;safe rejection1/39(2.56%)|
|C3_CHECKPOINT_A_ROUND=23;node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2|exit0,FROZEN_PROTOCOL_VALID/PASS,unexecuted0|
|C3_CHECKPOINT_A_ROUND=23;node C:/Users/nguye/AppData/Local/Temp/c3-audit-round23.mjs|exit0,8sources/11inputs sealed;104captured requests exactly match runtime projections/no evaluator-label leak;485/486historical files exact,protocolonly|

A2:104generation/104client requests,max1/registered attempt,retry0,one provider UPSTREAM_TRANSPORT error(HTTP200) in safe `r4-safe-policy`,timeouts0. Its actual fallback/error/usage-gap remains in denominator;no quota inference/retry/resampling. Safe usability38/39;all12retained advisory-scope contrasts match. Input446825/output11676tokens,one missing usage,cost unavailable. Verifier latencyp50/p959262/14586ms;added9264/14587ms,errorrate1/104(0.96%). Four deterministic hard-precheck rejects used0provider requests. Evidence only establishes zero observed send-eligible false PASS on this frozen tested population/configuration. Fresh A2PASS permits A3 after evidence savepoint/clean seal;executable/config/frozen inputs unchanged.
