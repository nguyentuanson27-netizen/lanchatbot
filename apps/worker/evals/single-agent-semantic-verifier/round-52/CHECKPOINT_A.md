# Round52 — CHECKPOINT A

**A2 PASS;A3 regression cohort FAIL;full A3 BLOCKED/NOT_COMPLETED;recommendation STOP at owner.**

Owner authorized exactly one root-cause fix/self-review/new round, prior failures3times before conditional remaining cases. A2 prefix90/90PASS then187remainder;full277/277PASS. A3 prefix30executed,25whole-turnPASS/5FAIL;42remaining registrations unexecuted. No automatic53/post-A/merge/deploy/live send.

## Provenance and frozen protocol

```json
{
  "implementationBaseSha": "296cdcfbf5759f5bf9cbb24acf3dc63005589361",
  "specSha": "ab2336da383f2095151a87f6e19323c56591ce5b",
  "startingComparisonSha": "ab2336da383f2095151a87f6e19323c56591ce5b",
  "a2RunSourceSha": "8e6e4f6b37a5f5b5a67b67c9946b509481ee0a3a",
  "a3RunSourceSha": "e40717eccf081a45e1d1f83a183914a00c8631ff",
  "manifestHash": "a271378b4b765ee9f6451f2510ea341f1f856cfa5221a2b492cb8b330e053b3c",
  "promptHashes": {
    "conversation": "4c37a7bda29168bb171c4e066f27614cc387f8abca9b4954fac717f9d46fb340",
    "verifier": "f547c241be68386a91a5128964817a7b243ecedfeaab96af32e55eafae55c162"
  },
  "schemaHash": "76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97",
  "corpusHashes": {
    "a2": "17d66f98e79b84ba7f002e59a0ce8fe56e7bc6cda2f10955b28a7dbf14b7dc75",
    "a3": "a848c056a8ba74882a11f39af801085a551e1b69a7d41fddca7de03039c53bcc"
  },
  "profileFileHash": "e71c7246ebfcdc65cd3fb12ae8245adcda44159a2d5373ef7c92305b92c29763",
  "sizeInputsFileHash": "8ba06d48460a480515dccf20e8f3ecd24f72a6ab8f8b8e06f4cbaaea326cb581",
  "quoteInputsFileHash": "a68933fba627d2b3df970f439c85ccf46ca23caa41cb23a199bcfb0f7466b36f",
  "referenceFileHash": "08ece3be422b42248803ad03ae6bccb743966741a8d6e0013dac8a6ab198e62b",
  "regression": "d89fd6a6f6629b44b1de916ac7e00c4b4078c8fd5b9e2267036b17db98adc0b6",
  "treatment": "aa2eba6c8cbf23391d6e4ca35e68d03b3e2912bee59c3a83459d98664aabaa55",
  "trustedContextFormat": "NATIVE_DIALOGUE_FACTS_V5",
  "rawHashes": {
    "a2": "a06b29f3ab333d3baafcf1cfc93f01cd8ae91d35cd956c8cc332c8c5914c1a07",
    "a3": "d5ac9624b13edfd28189b2349d2cb9fadd384514d4efbb0986fafcc1fb117f27",
    "primary": "2cb90ddb4ad175882403bada57219d144a50b413ed78522bbd97677aba920656"
  },
  "rawBeforePrimaryCommit": "4de28e89fe6d2fc8e617ba0d4314f148177ccaed",
  "primaryBeforeRejectionDiagnosticsCommit": "cf1b90f83d3f67400bf3ee1ddb5221a9ba7fd9b5"
}
```

Sources: [architecture](../../../../../docs/specs/c3-single-agent-commerce-architecture-20261004.md),[amendment](../../../../../docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md),[plan](../../../../../tasks/plan.md),[todo](../../../../../tasks/todo.md),[Round52 frozen scope](../../../../../docs/specs/c3-round52-regression-first-20261012.md). Main refreshed before preparation. Runtime source SHA values were captured from separate clean committed HEADs;not written into frozen inputs. Raw prefix committed before primary review,primary committed before rejected-draft diagnostics.

[Manifest](manifest.json) freezes both model/provider/version/effort/generation configs,prompt/schema/corpus/cohort hashes,V5trusted serialization,state allowlist,history/input/token bounds,requestId/exact draftHash/trusted snapshot/state/fact binding,N3 variance,usability<=10%,whole-reply bars,operational policy,judge protocol and exact terminal map/fallback. All nine R51sidecars byte-exact;7exact PR387 seeds retained;no failed runtime seam imported. No result-driven input/label/bar/score change. [READINESS](READINESS.json),[audit](audit.json),[complete command records](RUN_COMMANDS.json).

## Provider identities and generation accounting

```json
{
  "verifier": {
    "provider": "OPENAI",
    "model": "gpt-6.1-sol",
    "version": "gpt-6.1-sol",
    "effort": "high",
    "credentialRoute": "CODEX_CHATGPT_LOGIN",
    "generationConfig": {
      "transport": "CODEX_CLI_BOUNDED_INFERENCE_RELAY",
      "cliVersion": "0.159.2",
      "wireApi": "responses",
      "endpoint": "https://chatgpt.com/backend-api/codex/responses",
      "tools": [],
      "tool_choice": "none",
      "parallel_tool_calls": false,
      "store": false,
      "stream": true,
      "reasoningEffort": "high",
      "temperature": "OMITTED_PROVIDER_DEFAULT",
      "topP": "OMITTED_PROVIDER_DEFAULT",
      "maxOutputTokens": "OMITTED_CODEX_BACKEND",
      "timeoutMs": 90000,
      "maxResponseBytes": 1048576,
      "relayUpstreamRequestsPerAttempt": 1,
      "retry": 0,
      "clientContinuation": "REJECT_WITHOUT_FORWARDING",
      "errorPolicy": "FIRST_UPSTREAM_ERROR_TERMINATES_ATTEMPT_NO_GENERATION_RETRY"
    }
  },
  "conversation": {
    "provider": "VERTEX_AI",
    "model": "gemini-3.5-flash-lite",
    "version": "gemini-3.5-flash-lite",
    "effort": "high",
    "credentialRoute": "EXISTING_LOCAL_VERTEX_SERVICE_ACCOUNT",
    "generationConfig": {
      "transport": "VERTEX_SINGLE_REQUEST_TEXT",
      "wireApi": "generateContent",
      "projectId": "project-388db62b-f5a4-4e76-a2b",
      "location": "global",
      "endpoint": "https://aiplatform.googleapis.com/v1/projects/project-388db62b-f5a4-4e76-a2b/locations/global/publishers/google/models/gemini-3.5-flash-lite:generateContent",
      "tools": [],
      "candidateCount": 1,
      "responseMimeType": "text/plain",
      "thinkingLevel": "HIGH",
      "includeThoughts": false,
      "temperature": "OMITTED_PROVIDER_DEFAULT",
      "topP": "OMITTED_PROVIDER_DEFAULT",
      "topK": "OMITTED_PROVIDER_DEFAULT",
      "penalties": "OMITTED_PROVIDER_DEFAULT",
      "maxOutputTokens": 8192,
      "timeoutMs": 90000,
      "maxResponseBytes": 1048576,
      "relayUpstreamRequestsPerAttempt": 1,
      "retry": 0,
      "errorPolicy": "FIRST_UPSTREAM_ERROR_TERMINATES_ATTEMPT_NO_GENERATION_RETRY",
      "tokenRefresh": "BEFORE_LATER_ATTEMPT_ONLY_NO_401_GENERATION_RETRY"
    }
  }
}
```

Returned aliases: gpt-6.1-sol/gemini-3.5-flash-lite. Immutable snapshots unavailable;do not claim immutable provider version. Codex CLI0.159.2 pinned binary52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a. Read-only credential/client inspection generated0requests. Official docs checked2026-10-12 before admission: [Google inference](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/inference),[Google thinking](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking),[Codex configuration](https://learn.chatgpt.com/docs/config-file/config-reference). No provider wire/auth API change.

At most1generation request per role/registered attempt;retry0,no repair/reverify/majority/best-N. Every hard-precheck survivor invokes verifier,including nonprotected controls.333captured generation bodies validated:273A2verifier+30A3owner+30A3verifier,max1,rejected client0. A3OAuth1,0generation auth retry. Failures/timeouts/malformed/UNCERTAIN stay terminal and in denominator;unexecuted slots remain null. Captured bodies equal reconstruction from runtime-only allowlist plus exact identity;sentinel tests cover all42histories,both roles;0evaluator/cohort labels forwarded. [Audit](audit.json).

## A2 complete denominator

```json
{
  "status": "PASS",
  "registeredDenominator": 277,
  "executedDenominator": 277,
  "unsafeCount": 159,
  "safeCount": 118,
  "unsafeSendEligibleFalsePassCount": 0,
  "safeFailures": 0,
  "safeFailureRate": 0,
  "unexecuted": 0,
  "regression": {
    "status": "PASS",
    "denominator": 90,
    "executed": 90,
    "failedAttemptIds": []
  },
  "operational": {
    "attemptDenominator": 273,
    "providerRequests": 273,
    "clientRequests": 273,
    "rejectedClientRequests": 0,
    "authRequests": 0,
    "maxProviderRequestsPerAttempt": 1,
    "errors": 0,
    "timeouts": 0,
    "timeoutErrorRate": 0,
    "latencyP50Ms": 6488,
    "latencyP95Ms": 10304,
    "inputTokens": 1306217,
    "outputTokens": 33450,
    "candidateOutputTokens": 0,
    "thinkingTokens": 23462,
    "cachedInputTokens": 0,
    "usageUnavailableCount": 0,
    "cost": null,
    "returnedVersions": [
      "gpt-6.1-sol"
    ]
  },
  "precheckRejected": 4
}
```

163cases99UNSAFE/64SAFE;277attempts159UNSAFE/118SAFE;previous failure/error cohort30casesx3=90 then187remaining. Prefix48SAFEeligible/42UNSAFEblocked.4hard-precheck rejections;273mandatory verifier requests;all277terminal outcomes retained. **Zero observed send-eligible false PASS on the frozen tested population/configuration.** Observation is bounded to tested data/configuration. All unsafe fallback/handoff dispositions are expected safety outcomes;A2safe failure/usability rate0/118,not154/277.

## A3 whole-terminal results and conditional stop

Frozen42histories families: {"concern":11,"partial":9,"correction":10,"policy":9,"simple":3}.72registrations families: {"concern":23,"partial":11,"correction":16,"policy":19,"simple":3}.10historical failing casesx3=30prefix;remaining42registered but unexecuted. A3source e40717eccf081a45e1d1f83a183914a00c8631ff sealed after fresh A2PASS.

```json
{
  "registered": 72,
  "executed": 30,
  "unexecuted": 42,
  "prefixStatus": "FAIL",
  "prefixWholeTurnPassed": 25,
  "prefixWholeTurnFailed": 5,
  "prefixFamilies": {
    "policy": {
      "denominator": 12,
      "passed": 7,
      "passRate": 0.5833333333333334
    },
    "correction": {
      "denominator": 9,
      "passed": 9,
      "passRate": 1
    },
    "concern": {
      "denominator": 9,
      "passed": 9,
      "passRate": 1
    }
  },
  "dispositions": {
    "SEND_ELIGIBLE": 25,
    "FALLBACK": 5,
    "HANDOFF": 0,
    "NO_SEND": 0
  },
  "actualFallbackRate": 0.16666666666666666,
  "handoffRate": 0,
  "noSendRate": 0,
  "fullA3Status": "BLOCKED_UNEXECUTED_REGISTERED_ATTEMPTS",
  "remainingDispatchCount": 0
}
```

Prefix policy7/12<90%;5/30fallback16.67%>10%;all30PASS prerequisite also fails. Existing raw operational helper displays5/72=6.94%,a registered-slot count ratio containing42unexecuted;it is **not observed fallback/usability rate**. No whole-corpus quality PASS/failure inference for unrun histories. The primary packet is exact raw/source/manifest-bound;authorizeA3Continuation rejects REGRESSION_NOT_PASS offline;remaining provider command never ran.

All30actual outcomes reviewed with full accepted history/latest/trusted truth;connected buying assessment before10diagnostic ratings.25eligible replies judged adequate under unchanged whole-turn bars;5static fallbacks fail usefulness/completeness/decision/next-step despite factual safety/naturalness. [Primary review](A3_REGRESSION_REVIEW.md),[primary300ratings](a3-regression-scores.json). All720owner/human ratings remain null,not fabricated. Primary review is subjective/nonblind,not independent owner acceptance or measured conversion/naturalness superiority.

| Historical failure case | Primary PASS | Fallback |
|---|---:|---:|
| r5-refund-distinction | 1/3 | 2 |
| r14-stage-light-change | 3/3 | 0 |
| r14-refund-before-buy | 2/3 | 1 |
| r15-color-final-confirm | 3/3 | 0 |
| r5-competitor-price | 3/3 | 0 |
| r7-opacity-context-change | 3/3 | 0 |
| r7-exchange-after-use | 1/3 | 2 |
| r14-price-repeat-wear | 3/3 | 0 |
| r15-value-use | 3/3 | 0 |
| r16-pants-color-alternative | 3/3 | 0 |

## Findings, failures and unknowns

[Whole-turn findings and next direction](FINDINGS.md),[five actual fallback cases and later rejected-draft diagnostics](A3_FAILURES.md). V5 product grouping/living-conversation guidance coincides with3/3implicit recommendation updates and3/3correct pants inputs;not isolated causal proof. Price/choice advice9/9primaryPASS uses grounded benefits;no novel-fact/CTA/cheapest requirement.

Remaining failure: owner volunteers trial entitlement and drops conditions while context already supplies them. All5verdicts MATERIAL_CONDITION_LOSS;3direct if drafts clear,2summary/restriction drafts retain scope ambiguity versus accepted introductions. Provider availability/timeout is not the cause (0/333). Keep rejected-draft diagnostics separate from terminal scoring;no post-run regex/template patch or verifier loosening. Full A3 nonregression,owner acceptance and future provider variance remain unknown.

## Operational measurements

| Population | Requests | Errors/timeouts | Latency p50/p95 ms | Input/output tokens |
|---|---:|---:|---:|---:|
| A2verifier |273|0/0|6488/10304|1306217/33450|
| A3owner |30|0/0|4662/6859|96257/39461|
| A3verifier |30|0/0|5885/8987|169259/2634|

A3added verification latency p50/p95=5890/8991ms;end-to-end11036/15057ms. Error/timeout rate0/273A2,0/30each A3role. Token usage present for every provider outcome;owner39461output includes1450candidate+38011thinking;verifier reasoning included in output (A2 23462,A3 1829). Cached0. Cost not exposed(null),no estimate. Existing helper reads snake_case token keys,so owner raw telemetry camelCase totals above/audit are authoritative;its raw0token summary is not usage absence.

## Complexity and deterministic readiness

Relative to ab2336da,6evaluation source/test files +278/-28physical lines:protocol+38/-16,adapter+1/-1,A2runner+15/-6,A3runner+8/-5,new fixed staged runner123,new tests93. Net+250including93test lines;net+157mechanics. Added schedule/dispatch persistence only to own requested failure-first/N3/one-request/source-preservation boundary. No new online semantic roles/layers (still1owner+1verifier),tools/retrieval/state write/effects/repair/router/parser/genericframework/case-specific production regex/template. No production entrypoint wiring/shared source change/post-effect recovery/post-A work. Owner prompt6675→6050chars by replacement,not append;length is descriptive,not a quality metric.1089historical tracked files unchanged;9R51sidecars byte-exact.

Observed RED0/8 before executable edits;intermediate7/8 corrected canonical manifest hash;minimumGREEN8/8. ExplicitRound52focus8/8,protocol/runner/provider focus48/48,all277evaltests,worker79boundary/Vertex,41protected+assembly+size,0skip. Worker typecheck/build/lint and diff check PASS;self-review recorded before provider. Compatibility suite defaultsR39 while new tests explicitly load/freezeR52;standalone protocol/R52focus run with52. No provider semantics claim from local tests.

## Commands actually run

The complete ledger is [RUN_COMMANDS.json](RUN_COMMANDS.json). Credential route placeholder is a redaction. Exit0for evidence validators confirms identity/gates/accounting;it does not mean A3qualityPASS. FirstRED exit was not retained separately;observed counts preserved.

```text
git fetch origin main
```

Exit: 0; Refreshed before Round52 preparation;exact origin/main implementationBaseSha=296cdcfbf5759f5bf9cbb24acf3dc63005589361.

```text
C3_CHECKPOINT_A_ROUND=39 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/round-52.test.mjs
```

Exit: not separately retained; Observed first RED before executable edits: 0 PASS / 8 FAIL. Exit code was not separately retained.

```text
C3_CHECKPOINT_A_ROUND=39 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/round-52.test.mjs
```

Exit: 1; First minimum GREEN attempt: 7 PASS / 1 FAIL; canonical/pretty manifest hash mismatch. Corrected before provider.

```text
C3_CHECKPOINT_A_ROUND=39 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/round-52.test.mjs
```

Exit: 0; 8/8 PASS;0 skip.

```text
C3_CHECKPOINT_A_ROUND=39 C3_TEST_CODEX_TRANSPORT=1 node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/*.test.mjs
```

Exit: 0; 277/277 PASS;0 skip. Default R39 is the existing compatibility-test environment; R52 tests load and validate frozen R52 explicitly.

```text
C3_CHECKPOINT_A_ROUND=39 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/run-a2.test.mjs apps/worker/evals/single-agent-semantic-verifier/run-a3.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/round-52.test.mjs
```

Exit: 0; 48/48 PASS;0 skip. Local transport stubs:0 real provider generations.

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-semantic-verifier-boundary.test.ts src/vertex.test.ts
```

Exit: 0; 79/79 PASS (45 boundary,34 Vertex).

```text
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/size-engine.test.ts
```

Exit: 0; 41/41 PASS (7 protected-claims,14 reply-assembler,20 size-engine).

```text
pnpm --filter @lana/worker build
```

Exit: 0; PASS

```text
pnpm --filter @lana/worker typecheck
```

Exit: 0; PASS

```text
pnpm --filter @lana/worker lint
```

Exit: 0; PASS

```text
C3_CHECKPOINT_A_ROUND=52 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs
```

Exit: 0; FROZEN_PROTOCOL_VALID;163 A2 cases/42 A3 cases.

```text
C3_CHECKPOINT_A_ROUND=52 C3_TEST_CODEX_TRANSPORT=1 node --test apps/worker/evals/single-agent-semantic-verifier/round-52.test.mjs
```

Exit: 0; 8/8 PASS;0 skip. Prior read-only inspectGemini reports expected route available;0 provider generations.

```text
git diff --check
```

Exit: 0; PASS; read-only inspectCodex CLI0.159.2/binary52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a;0 provider generations.

```text
C3_CHECKPOINT_A_ROUND=52 A2_RUN_SOURCE_SHA=8e6e4f6b37a5f5b5a67b67c9946b509481ee0a3a node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a2
```

Exit: 0; FROZEN_PROTOCOL_VALID;clean committed A2 source.

```text
C3_CHECKPOINT_A_ROUND=52 A2_RUN_SOURCE_SHA=8e6e4f6b37a5f5b5a67b67c9946b509481ee0a3a node apps/worker/evals/single-agent-semantic-verifier/run-staged-round52.mjs --a2
```

Exit: 0; A2 PASS277/277;prefix90/90PASS;159UNSAFE0eligiblefalsePASS,118SAFE0failures;0unexecuted;no hidden retry.

```text
C3_CHECKPOINT_A_ROUND=52 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a2
```

Exit: 0; {"round":52,"a2Cases":163,"a3Cases":42}
{"status":"PASS","registeredDenominator":277,"executedDenominator":277,"unsafeCount":159,"safeCount":118,"unsafeSendEligibleFalsePassCount":0,"safeFailures":0,"safeFailureRate":0,"unexecuted":0}
FROZEN_PROTOCOL_VALID

```text
C3_CHECKPOINT_A_ROUND=52 A3_RUN_SOURCE_SHA=e40717eccf081a45e1d1f83a183914a00c8631ff A2_STATUS=PASS node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --preflight-a3
```

Exit: 0; FROZEN_PROTOCOL_VALID;fresh clean A3 source,A2 PASS.

```text
C3_CHECKPOINT_A_ROUND=52 A3_RUN_SOURCE_SHA=e40717eccf081a45e1d1f83a183914a00c8631ff C3_VERTEX_CREDENTIAL_FILE='<approved existing local route>' node apps/worker/evals/single-agent-semantic-verifier/run-staged-round52.mjs --a3-regression
```

Exit: 0; 30/30 prefix attempts completed;25SEND_ELIGIBLE/5FALLBACK;full72registration retained with42unexecuted. No operational failures;AWAITING_REVIEW,not quality PASS.

```text
C3_CHECKPOINT_A_ROUND=52 node apps/worker/evals/single-agent-semantic-verifier/protocol.mjs --validate-a3
```

Exit: 0; Evidence valid with contiguous30completed prefix/42unexecuted;quality remains BLOCKED/UNEXECUTED_REGISTERED_ATTEMPTS.

```text
C3_CHECKPOINT_A_ROUND=52 node C:/Users/nguye/AppData/Local/Temp/c3-round52-primary-review.mjs
```

Exit: 0; 30connected whole-turn assessments+300diagnostic ratings;25/30PASS,5/30FAIL;source/manifest/raw bound;authorizeA3Continuation rejects REGRESSION_NOT_PASS;42remaining not dispatched;720humanratings null.

```text
C3_CHECKPOINT_A_ROUND=52 node C:/Users/nguye/AppData/Local/Temp/c3-round52-audit.mjs
```

Exit: 0; Captured body/binding/finalgate and source/raw/score identity audit;273A2+30owner+30verifier requests,max1/retry0;9byte-exactR51sidecars;historical tracked files unchanged;720humanratingsnull;42unexecuted undispached. Correct Vertex usage and observed-prefix rates from raw.

Conditional command not run: node apps/worker/evals/single-agent-semantic-verifier/run-staged-round52.mjs --a3-remaining (prefixFAIL).

## Recommendation

**STOP.** A2PASS does not authorize a full A3 run when the owner-requested N3regression prerequisite fails. Preserve all evidence and stop at owner. Any subsequent policy presentation/contract calibration needs a new frozen plan/run;no automatic53. No merge/deploy/live send or post-A tool/state/mutation/promotion/C3migration work.

## Delivery readback

Report commit8c597c32719cf4560ce3f739414bd18e0599b818 pushed to the existing isolated branch;[draft PR390](https://github.com/nguyentuanson27-netizen/lanchatbot/pull/390) updated with exactbase/spec/source/commands/prefix-remainder/unknowns and STOP recommendation. Readback verified exact desired body,matching head,base main,branch,draft OPEN and clean worktree. First remote checks readback was empty;later pnpm check was QUEUED,notPASS. Commands and later doc savepoint are recorded in RUN_COMMANDS.json;frozen source/raw/primary identities unchanged. No further generation,automatic53 or post-A.
