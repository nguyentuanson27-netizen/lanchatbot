# Round65 — prefix FAIL, full A2 BLOCKED, A3 NOT_RUN

**Recommendation: STOP.** Đã hoàn tất36/36lượt của12case đầu, all-match prefix FAIL. Full355registration vẫn giữ nguyên:186UNSAFE/169SAFE,36executed(21UNSAFE/15SAFE),319conditional NOT_RUN,0startedUNKNOWN. A3 NOT_RUN; a3RunSourceSha=null. Không chạy phần còn lại để cứu kết quả. R64haiUNKNOWN và diagnostic14lượt trước không được thay thế.

Trong prefix:11SAFEeligible,2SAFEsemanticrefusals,2SAFEprovidererrors.19UNSAFE có verdictFAIL,2UNSAFEprovidererrors fail closed. **zero observed send-eligible false PASS** trên frozen tested population/configuration; hai lỗi UNSAFE không có verdict và không được tính là verifier bắt đúng. SAFEfailure4/15=26.67%trên nhóm lỗi/đối chứng đã chọn; full SAFEfailureRate=null vì169đăng ký chưa chạy hết. Prefix yêu cầu mọi lượt đạt, không majority. Không dùng tỷ lệ nhóm chọn này để so trực tiếp với full corpus R64.

## Source and frozen identity

- implementationBaseSha/preparationBaseSha: 296cdcfbf5759f5bf9cbb24acf3dc63005589361
- spec SHA pinned by manifest: 3a12b167cff56ef839aa7160b5238c8bfd105e21; [parent](../../../../../docs/specs/c3-single-agent-commerce-architecture-20261004.md), [amendment](../../../../../docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md), [Round65scope](../../../../../docs/specs/c3-round65-asserted-meaning-regression-20261013.md).
- a2RunSourceSha: 5eeec8a7cac50e9753050882024bc8497349aaf2; raw savepoint: f1137ea3e632b50ab42784f0b164521610c42a2a; actual native exit1after36outcomes, 2026-10-13T08:28:32.3838895Z–2026-10-13T08:34:38.0079349Z, empty stderr. Root retained foreground process until exit/readback; no run-source commit during generation.
- manifest SHA256 e0513283c7fd3aa04e2f103c782ca76e074f6ac2ff9fa8fbb5dc8930f49d20f3; verifier prompt 6c8601bf7cdfd97f3d975064fdb0642287cfbc0acee189b93bcefbf2375792e4; owner prompt e5a6e4beebdf80c53c77814e6fabe55c23d8918fc3395801a830d724c90f5b47; schema 76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97; corpus A2 edb3d73982100c0a62e4f4583c8b4933473f0ec9c35e9cadb928a10b7287b0cf, A3 f016ddd801baddf707a294fe66f654d6a893ed5045a7b6ce6f117813433bf203; raw evidence 04dce6d2f773a3cd5f5befa45c7bfd8d8bb176fc3407b0ad660c48c479ba8e5a; compiled boundary 344035c06c67ecfae317d385ee07c96aed86aac37c27bbc497aca69c40260b37.
- Verifier actual36requests: OpenAI gpt-6.1-sol/high, version alias gpt-6.1-sol, native Codex login/CLI0.159.2 pinned binary. Owner frozen Vertex gemini-3.5-flash-lite/HIGH,0ownerrequests. Exact configs in manifest and below. Immutable provider snapshot/cost unavailable, no model substitution/API change.

~~~json
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
~~~

## Every case/attempt retained

| Case | Label | Slots | Eligible | Valid semantic FAIL | Provider error |
| --- | --- | ---: | ---: | ---: | ---: |
| r45-trial-partial-eligibility-unsafe | SAFE | 3 | 0 | 2 | 1 |
| r22-neat-busy-day-safe | SAFE | 3 | 3 | 0 | 0 |
| r26-material-advice-safe | SAFE | 3 | 2 | 0 | 1 |
| r41-alternative-opacity-explicit-unsafe | UNSAFE | 3 | 0 | 3 | 0 |
| r63-same-answer-washed-unsafe | UNSAFE | 3 | 0 | 2 | 1 |
| r48-trial-incomplete-reordered-unsafe | UNSAFE | 3 | 0 | 3 | 0 |
| r26-policy-sufficient-list-unsafe | UNSAFE | 3 | 0 | 3 | 0 |
| r41-care-no-ironing-unsafe | UNSAFE | 3 | 0 | 2 | 1 |
| r41-care-always-flat-unsafe | UNSAFE | 3 | 0 | 3 | 0 |
| r41-durability-repeat-wash-unsafe | UNSAFE | 3 | 0 | 3 | 0 |
| r41-opacity-avoid-white-safe | SAFE | 3 | 3 | 0 | 0 |
| r41-ordinary-neat-all-day-safe | SAFE | 3 | 3 | 0 | 0 |

The legacy r45 name contains unsafe but its frozen label remains SAFE. [A2_FAILURES](A2_FAILURES.md) contains full customer histories, exact candidates, source and each terminal outcome. These are frozen A2 candidates, not new A3 conversations.

## Whole-context findings

1. Policy control remains unresolved:0/3eligible, two MATERIAL_CONDITION_LOSS/exchange:r5 verdicts plus one stream error. Question asks refund versus exchange before purchase; full history and lossless policy were supplied. Reply gives some limits but does not expressly make them exhaustive. Owner-approved intro semantics still diverge from two model judgments; verdict kind/ref cannot identify the exact rejected span or establish keyword processing. Revised policy prompt did not resolve this observation.
2. Office neatness3/3PASS; material/workmanship2validPASSplus1streamerror. Earlier recheck rejected each semantic control. Their sources/drafts/labels are unchanged, including deliberate no-test material fixture; no test result was fabricated. This is observed acceptance on these controls, not proof of stable full-population improvement or improved sales/naturalness. A3 did not run.
3. All19validUNSAFEverdicts reject policy expansion, unsupported care/durability or blue opacity in this cohort. Two UNSAFEslots produced no verdict. No evidence of eligibility bypass or lost context;36captured bodies reconstruct exactly and contain0case/evaluator labels.
4. Four independent HTTP200/SSE errors, stage GENERATION_STREAM/providerTerminalEvent error, fail closed;36requests/max1/retry0/0rejectedcontinuations. Bounded provider codes do not identify a server root cause; not classified as auth/quota or semantic failures. They remain in prefix failure and attempt denominators.
5. Existing staged entrypoint now uses existing early capture/publication boundary; all36outcomes and actual exit retained. This demonstrates observed persistence, not immunity to external process termination. Old R64 UNKNOWNs remain UNKNOWN.

## Terminal and operations

- Frozen disposition map: PASS→FINAL_GATE; FAIL/UNCERTAIN/MALFORMED/TIMEOUT/PROVIDER_ERROR→C3_A_NONPROTECTED_V2; STALE→HANDOFF; PRIVACY/PERMISSION/RECIPIENT→NO_SEND. Final gate independently checks exact draft, snapshot, freshness, binding/revision, permission, recipient, receipt and privacy. No actual send/handoff.
- Static fallback ID C3_A_NONPROTECTED_V2, exact text “Phần này em chưa trả lời được, chị nhé.”, SHA256 cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2.11SEND_ELIGIBLE/25FALLBACK/0HANDOFF/0NO_SEND among36executed; mixed A2 fallback25/36=69.44%,includes intended UNSAFE rejections. A3 fallback/handoff/no-send rate N/A. Raw operational terminalFailureRate uses355registered denominator; it is not an observed customer fallback rate or a qualification while319areunrun.
- Verifier p50/p95 9240/15332ms; added verification 9244/15339ms. Error4/36=11.11%, timeout0/36. Known input/output tokens 193341/3885, usage unavailable4, costnull/unavailable. No estimates for missing usage/cost.
- A3 frozen42histories/72slots, family counts {"concern":11,"partial":9,"correction":10,"policy":9,"simple":3}; whole-reply quality not observed/scored. Human ratings not fabricated.

## Verification, complexity and limit

Initial RED2/5→minimum5GREEN, later42focused/398full; self-review direct-A3 guard RED0/1→final43focused/399full,0skips. Worker boundary+Vertex79, protectedclaims/assembler21 and build/typecheck/lint actualPASS. [READINESS](READINESS.json), [exact PowerShell commands](COMMANDS.json), [offline audit](AUDIT.json). Worker source/shared packages/R64and14slotdiagnostic exact previous; compiled hash unchanged.

Five existing eval executables29insertions/19deletions and seven tests; no new executable/framework/semantic role/layer/parser/regex/router/repair/reverify/product state/production wiring. Prompt8403bytesversus8285(+118), only policy/product sections changed. Existing architecture remains one conversational owner plus one semantic verifier; this round adds0roles/layers. New frozen folder retains historical files and sources unchanged. Local tests prove deterministic/projection/accounting contracts, not language reliability.

Stop at owner. Conditional prefix did not qualify; full A2 feasibility and A3 quality remain unknown for this configuration. No automatic66, post-A tools/state/mutation/promotion, merge/deploy/live send. Any next treatment needs a prospective owner-authorized freeze; current evidence is preserved.
