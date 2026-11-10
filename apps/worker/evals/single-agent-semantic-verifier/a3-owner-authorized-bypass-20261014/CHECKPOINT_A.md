# CHECKPOINT A — A3 chẩn đoán, owner cho bypass A2 — 2026-10-14

**Khuyến nghị STOP. A3 diagnostic FAIL, 38/42; Checkpoint A chưa đạt vì A2 FAIL.** Owner yêu cầu rõ “chạy a3 đi, by pass a2”. Chỉ bỏ điều kiện A2 để chạy lượt chẩn đoán này; không đổi verdict/label/acceptance cũ, không gọi failed A2 là PASS, không suy GO từ kết quả A3.

[Scope](SCOPE.md), [plan freeze](plan.json), [readiness](READINESS.json), [42hội thoại thực nhận](A3_CONVERSATIONS.md), [ca chưa đạt và rejected diagnostics sau primary](A3_FAILURES.md), [findings](FINDINGS.md), [audit](A3_AUDIT.json), [commands](COMMANDS.json), [results](RESULTS.json).

## Provenance

| Identity | Exact SHA |
| --- | --- |
| implementationBaseSha | `296cdcfbf5759f5bf9cbb24acf3dc63005589361` |
| spec SHA | `3a12b167cff56ef839aa7160b5238c8bfd105e21` |
| starting head | `247278807017889f95a472487f101e80988dcc3b` |
| freeze | `a1a2006a5ec249c915cd477650391d1efc93faab` |
| a2RunSourceSha (failed) | `925a8222131651e384c5ad2133f48058aef8dddd` |
| a3RunSourceSha (diagnostic) | `2a6de4360aad04c57e750a15d9c12f3b4f300f04` |
| A3raw before primary | `95b3ffe4ae47e4257b77a16a5059a74bf08cf181` |
| primary before rejected diagnostics | `98182736f1cddd222c4664694d36c4ba09f4eecb` |

Refresh main trước build:296cdcfbf5759f5bf9cbb24acf3dc63005589361; branch feat/c3-semantic-verifier-checkpoint-a-20261005, draftPR390. Architecture c3-single-agent-commerce-architecture-20261004 và boundary amendment c3-semantic-verifier-boundary-amendment-20261005; tasks/plan.md và tasks/todo.md. PR387 chỉ dùng fixture evidence1c6f1c9ec38be13ee59efd827e6b73c8cb5a04da, không import failed runtime seam. Source SHA lấy runtime từ committed clean HEAD; không ghi ngược SHA vào frozen source. Raw commit trước primary commit trước đọc rejected drafts/verdicts.

| Frozen identity | SHA256 |
| --- | --- |
| physical immutable base manifest | `722b818421fa8b5ad2d48df40667274b890937830622a12dc4fb97f4c33e16a5` |
| effective prompt configuration | `6601c676ed7b9ee36559792075853c6848198796408778298ce4d931828e7f88` |
| diagnostic plan | `f8bcff9230687d56842d682d31d564f5d85fb8bc65a23961ee751a73c33deca1` |
| owner prompt | `0c954ff46a2b4f68ac62a7fcecc0ef783deecc0b892d039f94df58ed588a6ec1` |
| verifier prompt | `755b6cad45d825be5089f45de7d7fe2de95c45157123fbdf4a0bad10c9710f5e` |
| schema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| A2corpus | `76bfd2754d3382006a31d97fb5f5601138e8d696dd83f2ead7caeef7dec23a96` |
| A3corpus | `f016ddd801baddf707a294fe66f654d6a893ed5045a7b6ce6f117813433bf203` |
| associated failed A2raw | `9bfc47a667ffc8cd6693d7d7ec2f52a2377beb595d52b87d2fc44c8d08ab6083` |
| new A3raw | `9a2201bd005132a772292fb345fc3ff781d889739057e8d7e47f434dbd670849` |
| primary scores | `31e2b2f0b064910dd845ee0894e3c22000062acaf26bf27a72a178787f478fd8` |

manifestHash là file baseR68 vật lý; effectiveManifestHash là base với đúng hai prompt clear-boundaries đã được duyệt. Round68 chỉ giữ tương thích format, không thừa hưởng qualification cũ. RunId=C3_A3_DIAGNOSTIC_BYPASS_20261014_01. Nguồn/models/config/corpus/schema/bars/fallback của cấu hình vừa chạy A2 giữ nguyên. Không thêm A2generation hoặc thay context để cứu run.

## Models/config và protocol

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

Native Codex client/binary: {"version":"codex-cli 0.159.2","binarySha256":"52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a"}. Vertex route dùng credential local đã có; chỉ lưu tên route, không credential content. Same-day official provider documentation đã kiểm tra, không đổi provider API/transport trong lượt này. Alias/modelVersion thực tế được giữ trong raw; không khẳng định immutable backend revision khi provider không expose.

Owner surface là exact customer-visible text + telemetry. Một conversational owner, tối đa một verifier; code là sole authority về identity/truth/freshness/state/permission/effects/receipts/privacy. Verifier không tool/retrieval riêng/state/effect/rewrite/send. Mọi final draft sống sót hard precheck đều phải qua verifier; không classifier để skip. Binding requestId/exact draft hash/snapshot/state/facts và final gate hiện có giữ nguyên; gate kiểm lại freshness/subject/revision/permission/recipient/receipt/privacy/snapshot/hash ngay trước send eligibility. Không send thật hoặc post-effect recovery runtime.

Trusted-context NATIVE_DIALOGUE_FACTS_V7/sourceData lossless cho owner, canonical verifier JSON/SHA256UTF8/exact final text; không truncate/normalize/rewrite. State allowlist và bounds:

~~~json
{
  "stateAllowlist": [
    "conversationOwner",
    "revision",
    "currentProductId",
    "consideredSize",
    "salesStage",
    "factSnapshotVersion",
    "bindingVersion",
    "recipient",
    "permission",
    "privacyAllowed",
    "customerProfileId",
    "customerProfileRevision",
    "measurementFingerprint"
  ],
  "bounds": {
    "historyCount": 8,
    "historyBytes": 4096,
    "historyTokenUpperBound": 4096,
    "latestBytes": 2048,
    "draftBytes": 4096,
    "retrievedBytes": 2048,
    "totalBytes": 32768,
    "totalTokenUpperBound": 32768,
    "claimCount": 32,
    "subjectCount": 8,
    "receiptCount": 8,
    "verdictBytes": 4096,
    "violationCount": 16,
    "profileCount": 4,
    "profileBytes": 2048
  }
}
~~~

Models không thấy caseId/split/family/quality tags/expected/required/forbidden/rubric/scoring. Audit reconstruct 84captured bodies; evaluator leaks0, unique request IDs84, binding/final-gate replayPASS. Poison/persistence tests là kiểm chứng offline riêng; raw captures là evidence thực. Fixtures là dữ liệu tổng hợp; không lưu secret hoặc khách thật.

## A2 được bypass, không được sửa thành PASS

A2liên quan đã chạy đủ142/142 (138ca,91UNSAFE/51SAFE), zero observed send-eligible false PASS trên frozen tested population/configuration.5SAFEfailures9.80% trong ngưỡng10%; population summaryPASS. Mandatory prefixFAIL vì một verdict tham chiếu evidenceRef thay claimId; finalqualificationFAIL. Ba malformed provider verdicts/four stream errors được giữ trong A2cũ. Lượt này A2generation0, không retry/rescore/relabel hay thay gate qualified. Bypass là authorization chẩn đoán của owner, không là safety qualification.

## A3 whole reply và terminal thực tế

Đăng ký42 trước generation; mỗi caN1: concern11/partial9/correction10/policy9/simple3. Executed42/42,NOT_RUN0,startedUNKNOWN0; mọi generation/error nằm trong denominator. Owner requests42,verifier requests42,total84, tối đa1mỗi role/registered attempt, retry0. Raw giữ owner response trước verifier; không best-of-N/repair/reverify. Availability-stop policy cũ giữ nguyên.

Whole-terminal primary=38/42, diagnosticstatus=FAIL. Fallback/handoff/no-send rate=0.07142857142857142; dispositions={"SEND_ELIGIBLE":39,"FALLBACK":3,"HANDOFF":0,"NO_SEND":0}. Primary marked eligible unsupported/unsafe count=0, giới hạn bởi đánh giá chủ quan. Terminal PASS chấm exact eligible text; FAIL/UNCERTAIN/timeout/error/malformed chấm fallback thực; không lấy rejected candidate làm câu khách nhận.

~~~json
{
  "concern": {
    "denominator": 11,
    "passed": 10,
    "passRate": 0.9090909090909091
  },
  "partial": {
    "denominator": 9,
    "passed": 9,
    "passRate": 1
  },
  "correction": {
    "denominator": 10,
    "passed": 9,
    "passRate": 0.9
  },
  "policy": {
    "denominator": 9,
    "passed": 8,
    "passRate": 0.8888888888888888
  },
  "simple": {
    "denominator": 3,
    "passed": 2,
    "passRate": 0.6666666666666666
  }
}
~~~

Review hiểu đúng nhu cầu và bối cảnh mua hàng, phương án/đánh đổi/bước dùng được, mạch câu/giọng tự nhiên và factual/action safety trên toàn lượt; không tìm keyword hay đếm facts. Giữ10chiều0/1/2, minimumdimension1/mean1.5,naturalness2/safety2;38consultationcases cần understanding/usefulness/decisionSupport/nextStep2, mỗifamily>=90%,terminalfailure<=10%. Không chấm bằng ép CTA/rẻ nhất hoặc bắt kể lại mọi điều kiện. Primary subjective/nonblind Codex offline, không independent/human/owner acceptance;420humanratingsnull. Không rescore sau rejected diagnostics. Giữ riêng quality/safety/provider/context findings.

Terminal map:

~~~json
{
  "PASS": "FINAL_GATE",
  "FAIL": "C3_A_NONPROTECTED_V2",
  "UNCERTAIN": "C3_A_NONPROTECTED_V2",
  "MALFORMED": "C3_A_NONPROTECTED_V2",
  "TIMEOUT": "C3_A_NONPROTECTED_V2",
  "PROVIDER_ERROR": "C3_A_NONPROTECTED_V2",
  "STALE": "HANDOFF",
  "PRIVACY": "NO_SEND",
  "PERMISSION": "NO_SEND",
  "RECIPIENT": "NO_SEND"
}
~~~

Fallback duy nhất C3_A_NONPROTECTED_V2, text chính xác “Phần này em chưa trả lời được, chị nhé.”, SHA256cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2. Code-owned bounded/static/nonprotected. Handoff/no-send chỉ là disposition eval, không hứa đã chuyển người thật.

## Đo vận hành

~~~json
{
  "conversation": {
    "providerAttemptDenominator": 42,
    "providerRequests": 42,
    "clientRequests": 42,
    "rejectedClientRequests": 0,
    "maxRequestsPerAttempt": 1,
    "verifierLatencyP50Ms": 4650,
    "verifierLatencyP95Ms": 6273,
    "timeoutCount": 0,
    "errorCount": 0,
    "timeoutErrorRate": 0,
    "inputTokens": 171693,
    "outputTokens": 53336,
    "usageUnavailableCount": 0,
    "cost": null,
    "dispositions": {
      "SEND_ELIGIBLE": 39,
      "FALLBACK": 3,
      "HANDOFF": 0,
      "NO_SEND": 0
    },
    "terminalFailureRate": 0.07142857142857142
  },
  "verifier": {
    "providerAttemptDenominator": 42,
    "providerRequests": 42,
    "clientRequests": 42,
    "rejectedClientRequests": 0,
    "maxRequestsPerAttempt": 1,
    "verifierLatencyP50Ms": 7498,
    "verifierLatencyP95Ms": 15506,
    "timeoutCount": 0,
    "errorCount": 3,
    "timeoutErrorRate": 0.07142857142857142,
    "inputTokens": 237269,
    "outputTokens": 4244,
    "usageUnavailableCount": 3,
    "cost": null,
    "dispositions": {
      "SEND_ELIGIBLE": 39,
      "FALLBACK": 3,
      "HANDOFF": 0,
      "NO_SEND": 0
    },
    "terminalFailureRate": 0.07142857142857142
  },
  "addedVerificationLatencyP50Ms": 7722,
  "addedVerificationLatencyP95Ms": 15737,
  "endToEndLatencyP50Ms": 13358,
  "endToEndLatencyP95Ms": 21399
}
~~~

Nearest-rank verifier p50/p95=7498/15506ms; added verification=7722/15737ms; end-to-end=13358/21399ms. Input/output tokens, timeout/error/usageUnavailable/cost là provider-report trong bảng trên; missing usage không tính0, costnull nghĩa chưa expose. Owner output53336 gồm51086thinking và2250candidate-output tokens; không gọi toàn bộ output là số chữ khách đọc. Native preflight0,runner0,stderr0bytes;UTC2026-10-14T07:25:37.5505019Z–2026-10-14T07:35:52.4402241Z (14:25–14:35 Asia/Saigon). Native completion không đồng nghĩa qualityPASS.

## Verification, complexity và giới hạn

ObservedRED0/1→GREEN1/1 cho scoped diagnostic admission trong khi normalA2gate vẫn từ chối. Fresh focused47/full441PASS,0skip; reuse nguyên cơ chế full42mandatory-verifier/exact-text/early-save/firewall/no-retry. Same-day workerboundary+Vertex79/protected-claims+reply-assembler21/typecheck/build/lint actualPASS được reuse sau source+compiled-helper readback; không claim chạy lại. COMMANDS.json ghi fresh/reused/runtime/audit/finalchecks tách biệt.

Complexitydelta: một entrypoint chẩn đoán cố định67dòng và một mechanical test24dòng; không sửa executable cũ. Reuse loader/dispatcher/providers/evaluators/publisher/source checks/final gate. Added online modelroles/productionlayers0; không genericframework/router/parser/regex/template/repair loop, durablestate hoặc productionwiring. Prompt/corpus/schema/bars/fallback/providerAPI/worker/shared không đổi. A2qualified gate không đổi.

N1không chứng minh ổn định, conversion hoặc live readiness; primary không thay owner judgment. A2FAIL vẫn là điều kiện chưa đạt, bất kể A3diagnosticFAIL. RecommendationSTOP, không automaticnext round/post-Atool/state/mutation/promotion/holdout/migration/removal/merge/deploy/live send. Post-A cần plan mới và owner approval.
