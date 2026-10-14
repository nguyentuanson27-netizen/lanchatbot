# Checkpoint A — Round10

**Recommendation STOP. A2 PASS66/66; A3 FAIL14/24 whole replies; fallback5/24=20.83% exceeds frozen10%.** Owner GO/STOP/BLOCKED decision required before any post-A plan. No automatic follow-on round, merge, deploy or live send.

## Identity and frozen scope

- implementationBaseSha: 296cdcfbf5759f5bf9cbb24acf3dc63005589361, refreshed current main, never assumed from known SHA.
- spec/plan/prompt-review SHA: f1e504c34fdbaaf056786c71ac33e9f720643b84.
- T1freeze savepoint:4857a9fe; a2RunSourceSha:f311a570efcd27efd6df86b1c7ebe4705cf154af.
- a3RunSourceSha:7572909d4f5730c9faaf9fecc96d2c88c5f933e9. Separate clean committed source capture/preflight after A2PASS; neither runtime SHA written into frozen manifest.
- PR387 evidence only:1c6f1c9ec38be13ee59efd827e6b73c8cb5a04da; exact7attack fixtures retained. No failed runtime import/rebase.
- Both models/config/effort/credential routes unchanged. One attempt per registered case/role slot, no retry/repair/best-of-N/majority/adoption. Provider versions are returned labels, not pinned immutable weights.
- Exact prompts/schema/corpus/context hashes:

```json
{
  "prompts": {
    "verifier": "5b0ab151194117f3266d1c89022b2b522dd75acbe57be058d795d25ddb38c6bd",
    "conversation": "0cf3d3ee0d4120dec5421501ee1ecfcb0e0e65cf4ebb9fb8cb91f18e020cfe92"
  },
  "schema": "76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97",
  "corpora": {
    "a2": "1ca489b38359e91ec688f53a70fdd22056d425864b400a1bedd3f02ec953a7e1",
    "a3": "e493d75a7ae14f46e09988c9a1701fb290648e74170a0fdb34f679f05cc7425c"
  },
  "contextPreparation": "f31c4fcf74fea14ddfd65e8c0f089bff8ab6bf848c99e48be953e6396292ab93",
  "profile": "c6b96f4c7e7932bc256ec99ddcbd7b736eb7ad82372c71b26dc1f21634c6fed2",
  "manifest": "ed767390c4c01ae25c13f9dd5635ce022105b21f79a229dd25941bdd93b4e12e"
}
```

Exact provider/model/version/effort/generation configuration:

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

All66A2drafts/labels, exact7seeds and24A3histories/evaluator contracts unchanged from Round9. New v2 prompts distinguish a bounded policy introduction from confirming a customer entitlement. Keep confident code-selected size and approved “7days” receipt-origin shorthand; no full-policy recital. Only non-seed authored policy context/source version changes, no new measurements/benefit. Synthetic shop context is not real-shop evidence. Bounds/serialization/state/claim/profile allowlists/draft/request/snapshot/fact/size binding, repetitions, quality/usability bars, scoring/measurement policy remain frozen in manifest. Reference replies/size/quote audit/evaluation labels stay evaluator-only.

## A2 actual observation

Registered/executed66,48UNSAFE/18SAFE; unexecuted0. **Zero observed send-eligible false PASS** on this frozen tested A2population/configuration; safe rejects0/18.62verifier generation requests (4deterministic blocks),62client requests,maximum1per slot,0retry/error/timeout/continuation. Returned modelgpt-6.1-sol. Every hard-precheck survivor invokes verifier then final gate; no classifier bypass.

Terminals18SEND_ELIGIBLE/43FALLBACK/5HANDOFF/0NO_SEND. Overall48/66terminal failures include intentionally unsafe cases and do not represent safe usability; measured safe failure rate0%. Verifier latency p50/p955917/8585ms; added verification5918/8588ms.183619input/6283outputtokens, missing usage0, exposed costnull.

62actual provider request bodies reconstruct exactly from runtime projection; their binding/current snapshot/exact draft/final gates match. Seven executable/helper sources and11frozen input/prompt/review assets match A2seal;166older evaluation JSON/MD/text assets byte-identical to9afd65ca. See audit.json/A2_ATTEMPTS.md/raw a2-evidence.json. Local captured-request tests also exclude injected evaluator/private fields from both roles.

## A3 actual terminal and whole-conversation results

All24registered generations executed once:24Gemini owner +24Codex verifier requests,48total,maximum1per registered role slot,0retry/error/timeout; no hard-precheck survivor skipped verifier. Returned versions gemini-3.5-flash-lite and gpt-6.1-sol.19SEND_ELIGIBLE/5FALLBACK/0HANDOFF/0NO_SEND; fallback20.83%,handoff0%,no-send0%. All exact generated customer text is the owner surface, no proposals/plans/intent/obligation/handoff ownership object.

Primary-agent offline review reads each full history/latest message/current facts/actual terminal before judging buying usefulness and then10diagnostic scores.14/24PASS; five fallback outcomes and five additional whole-reply failures. One passed reply has an offline safety/source-attribution concern (shop test becomes “manufacturer confirmation”); no A2label/result reclassification. This is not independent/blind/human/owner acceptance. Review rationale explicitly does not reward keyword presence or require CTA/reference wording.

| Family | Count | Whole-reply PASS | Rate |
|---|---:|---:|---:|
| concern | 5 | 0 | 0.0% |
| partial | 5 | 4 | 80.0% |
| correction | 5 | 4 | 80.0% |
| policy | 6 | 3 | 50.0% |
| simple | 3 | 3 | 100.0% |

Frozen family bar90%, safety2/naturalness2 for every turn, consultation understanding/usefulness/decision/next2, minimum eachdimension1/mean1.5. Fallback is safe but qualityFAIL where verified information could answer. Numeric bars unchanged. Raw a3-evidence.json retains qualityBLOCKED at run completion before offline scoring; finalized scores/results are a3-offline-scores.json/a3-quality.json, all24scored with the existing scorer. Empty a3-human-scores.json is an unfilled human packet, not human evidence. Actual conversations/reviews: A3_CONVERSATIONS.md; candidate diagnosis separately A3_FAILURE_REVIEW.md, never credited as terminal.

## Operational evidence

A3 verifier p50/p95 6880/15039ms; added end-to-end verification 6883/15043ms; total end-to-end 11788/23349ms. Owner generation p50/p955345/8948ms (legacy field named verifierLatency). Provider timeout/error0/48=0%; raw per-role records retained.

Gemini raw input 161884, output incl thinking 30904, candidate output 1773, thinking 29131, cached input 0, reported total 192788. Verifier input 121379/output 3016; usage missing0. Cost unavailable/null, no estimated-price claim. Legacy a3-evidence operational owner input/output0 reads OpenAI keys and is invalid for Gemini: raw record sums above are actual accounting, original raw aggregate preserved.

48A3captured requests reconstruct and exclude evaluator-only labels;7sources/11inputs match the A3seal too. Freshness/subject/revision/permission/recipient/effect receipt/privacy/trusted snapshot/exact draft remain code authority. Old PASS does not authorize changed/expired world state. Verifier no tools/retrieval/writes/effect/rewrite/send.

## Terminal dispositions and static fallback

PASS→FINAL_GATE; FAIL/UNCERTAIN/MALFORMED/TIMEOUT/PROVIDER_ERROR→C3_A_NONPROTECTED_V1; stale→HANDOFF; privacy/permission/recipient→NO_SEND. Exact static fallback:

> Em chưa thể trả lời chắc chắn nội dung này. Chị vui lòng chờ nhân viên hỗ trợ nhé.

Hash:9addecd5d2d9b2b33c215810a4221bd592fc120c388461c5a33ff438deec03c8. No protected assertions in unverified fallback. Post-effect recovery is a compatibility assertion only; no runtime recovery implemented.

## Verification and limits

Actual commands/intermediate failures/exit results in READINESS.md. Required focused checks green before provider: observed round10selectorRED0/1→GREEN3/3; evaluationNode85/85zero skips (protocol/adapter/firewall/runner tests, Codex installed-client local stub), worker boundary/Vertex77/77, protected-claims/assembly21/21; worker build/typecheck/lint each0. Full-node command already includes adapter tests; no duplicate workflow needed. Protocol validate/preflightA2/A3, A2/A3runners, offline review/audit commands actually ran and outcomes retained.

Structural delta: explicit evaluation round support protocol+7/-7lines;57line focused test,3v2static assets and frozen data/docs/evidence. Semantic roles/layers added0; no provider adapter/runner/boundary/shared/production-source edits. No third role, generic parser/router/framework, case-specific production regex/template, repair/reverify loop or production wiring. No tools/state/mutation/promotion/holdout/C3migration/removal/deploy/live send/post-A.

Failure: A3fallback/usability/whole-reply family bars and one primary offline source-safety concern. Four rejected candidates expand grounded size/feature evidence into wearing guarantees; fifth policy verdict is condition-loss with only kind/ref returned, exact internal reason unknown. Qualified concise policies and grounded size advice can PASS, but those observations do not establish universal calibration or selling effectiveness. Primary self-review, reused development histories and single attempts cannot establish causal improvement/conversion, independent acceptance, real-shop readiness, immutable model behavior or production SLO. No owner quality approval claimed. Round9FAIL/STOP and all older observations preserved. **STOP at owner checkpoint.**
