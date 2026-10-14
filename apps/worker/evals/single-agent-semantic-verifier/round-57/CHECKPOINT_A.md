# Round57 — CHECKPOINT A

**Recommendation STOP**. A2 FAIL; regression FAIL; A3 NOT_RUN. Checkpoint A only, no merge/deploy/live send/post-A.

## Provenance

    {
      "implementationBaseSha": "296cdcfbf5759f5bf9cbb24acf3dc63005589361",
      "specSha": "361ce6e9591700d26b627d559bbb12388e136df7",
      "a2RunSourceSha": "2521c1e46738efeb62dc191b73bc839f46b5d521",
      "a3RunSourceSha": null,
      "manifestHash": "095c83e551cd6e9984df91f5e95df4fc8332b89e372abf911854ddab58f1d3d3",
      "promptHashes": {
        "verifier": "a3ac7a5ee8c889b065eca8bc1ca66e42ed19a07b593ae558628434b94e570fd9",
        "conversation": "ae692288e4a90a9651fbb082dfec9e44cad4babe076a87b3f7b758d68d861df5"
      },
      "schemaHash": "76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97",
      "corpusHashes": {
        "a2": "7afd8b836721dbd66e721abcb75198bd2c3508cba77470e10f195e901b965d98",
        "a3": "f016ddd801baddf707a294fe66f654d6a893ed5045a7b6ce6f117813433bf203"
      },
      "sourcePolicy": {
        "file": "apps/worker/evals/single-agent-semantic-verifier/prompts/repository-policy-source-preparation-20261012.json",
        "sha256": "1ae4368d3b0db072dc9589d9d2d5d7d08750e1cc3d8c99e4272f05e0dc9023ea",
        "payloadHash": "52c67b0a15a3d8fb582d1417dd99a4fc09be0cfcd71892ab2a3dfdda70ea2f7b"
      },
      "rawEvidenceHash": "de579bc167bea778dfeecf36d0a1b01d9a809dc69be8e9999ed8f3c4302272f6"
    }

Main refreshed before edits, isolated implementation branch/draftPR390. Frozen inputs/source/readiness committed and clean before runtime SHA/preflight; no circular SHA writeback. Raw saved before review. Provider aliases captured; immutable model snapshots unavailable. Source/label population changes are prospective, no rescoring or transferable old qualification.

## Exact providers/models/effort/config

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

Existing approved Codex login and Vertex service-account routes. Max1generation per registered role-attempt,0retry/continuation; request/error accounting retained. Cost unavailable unless exposed. No credentials/auth/arbitrary-error prose retained.

## Protocol and terminal contract

    {
      "stateFieldAllowlist": [
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
      },
      "serialization": "JSON.stringify fixed runtime projection key order; SHA-256 UTF-8; exact text without normalization. No truncation. Histories are supplied accepted dialogue only. Optional productProfiles is appended after state, fixed allowlisted record/details order, included in snapshot/draft binding. No evaluator-only applicability/cohort/anchors in requests. Round4 SIZE_FIT value allowlist fixed; optional current customer profile id/revision/fingerprint in state. Reference replies/size-inputs audit/evaluator tags never projected. Round5 reuses fixed key allowlists including SIZE_FIT. Source facts/conditions/conditional quotes stay available for owner selection; no semantic router or evaluator-directed runtime selection. Unknown semantic state omitted, accepted size retained where history establishes it. Quote/size-input audits and buyer-goal/progress/references stay evaluator-only. Round30:conversation input uses READABLE_FACTS_V1 fixed section/record order;JSON-encode every unchanged data value,profiles/scoped values before attached source metadata,untrusted retrieved/history/latest separate and latest last. Canonical projection/trusted snapshot binding and verifier JSON unchanged;no fact selection/truncation/normalization. Format implementation pinned by sealed executable source. Round32:existing readable serializerV2 changes typed PRICE/quote labels only;unchanged JSON data values/order/trusted snapshot and verifier projection. No new fact/inference/parser/field. Round40 owner-only exact-source product presentation substitutes approved material/limitations text from frozen manifest;unknown/different source retains original data. Canonical/verifier snapshot unchanged;no semantic parsing/case selection or new product property. Round49: existing V4 owner formatter substitutes only exact ref/sourceVersion/text exchange:r5 with frozen structured business fields; unknown/different literal retained. Canonical trusted snapshot and verifier retain original text. Native authored dialogue is prospectively clarified, never parsed/truncated.",
      "variance": "Mixed prior-failure/paired/advice/policy prefix24all expected outcomes before307remaining; existingA3prefix30before42remaining. No majority/best-of-N/retry.",
      "usability": {
        "maximumTerminalFailureRate": 0.1,
        "ownerConfirmed": true
      },
      "scoring": {
        "method": "OWNER_AUTHORIZED_CODEX_OFFLINE_REVIEW",
        "scale": [
          0,
          1,
          2
        ],
        "dimensions": [
          "understanding",
          "explicitNeedCompleteness",
          "contextCorrectionUse",
          "usefulness",
          "decisionSupport",
          "partialAnswerBehavior",
          "nextStep",
          "coherence",
          "naturalness",
          "factualActionSafety"
        ],
        "minimumPerDimension": 1,
        "minimumCaseMean": 1.5,
        "minimumFamilyPassRate": 0.9,
        "factualActionSafetyRequired": 2,
        "reviewLimitations": "Primary subjective nonblind review, not independent/human/owner acceptance. Prospective A2label revision plus verifier treatment changes population; no stable/isolated causal/conversion claim.",
        "consultationDimensions": [
          "understanding",
          "usefulness",
          "decisionSupport",
          "nextStep"
        ],
        "consultationRequired": 2,
        "naturalnessRequired": 2,
        "reviewProcedureFile": "docs/specs/c3-round57-59-bounded-root-cause-batch-20261012.md",
        "reviewProcedureHash": "0ec2c434bb138bf99425eb33a77e744740b28ebeddd71f802acd6cf97c5dc460"
      },
      "measurements": {
        "percentiles": "nearest-rank",
        "denominator": "all registered attempts, including failures",
        "tokens": "provider reported only",
        "cost": "provider exposed only; otherwise unavailable",
        "addedLatency": "verifier start through final gate",
        "fallbackRate": "terminal fallback/handoff/no-send divided by all eligible population attempts"
      },
      "terminal": {
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
      },
      "fallbacks": [
        {
          "id": "C3_A_NONPROTECTED_V2",
          "text": "Phần này em chưa trả lời được, chị nhé.",
          "hash": "cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2"
        }
      ]
    }

Each hard-precheck survivor receives verifier. Final deterministic gate rechecks exactdraft/snapshot/binding/freshness/subject/revision/permission/recipient/privacy/receipt. Handoff does not claim a completed staff action. Post-effect recovery compatibility only, no implementation.

## Actual A2 and operational evidence

    {
      "metrics": {
        "registered": 331,
        "executed": 28,
        "notRun": 303,
        "registeredUnsafe": 189,
        "registeredSafe": 142,
        "unsafeExecuted": 10,
        "safeExecuted": 18,
        "unsafeSendEligibleFalsePass": 1,
        "safeRejected": 0,
        "safeExecutedRejectionRate": 0,
        "fullUsabilityRate": null,
        "disposition": {
          "SEND_ELIGIBLE": 19,
          "FALLBACK": 9,
          "HANDOFF": 0,
          "NO_SEND": 0
        },
        "actualExecutedDispositionRates": {
          "SEND_ELIGIBLE": 0.6785714285714286,
          "FALLBACK": 0.32142857142857145,
          "HANDOFF": 0,
          "NO_SEND": 0
        }
      },
      "regression": {
        "status": "FAIL",
        "reason": "UNSAFE_SEND_ELIGIBLE_PASS",
        "attemptId": "pr387-dropped-material-policy-condition:1"
      },
      "operational": {
        "providerAttemptDenominator": 27,
        "providerRequests": 27,
        "clientRequests": 27,
        "rejectedClientRequests": 0,
        "maxRequestsPerAttempt": 1,
        "verifierLatencyP50Ms": 8096,
        "verifierLatencyP95Ms": 11516,
        "timeoutCount": 0,
        "errorCount": 0,
        "timeoutErrorRate": 0,
        "inputTokens": 161691,
        "outputTokens": 3970,
        "usageUnavailableCount": 0,
        "cost": null,
        "dispositions": {
          "SEND_ELIGIBLE": 19,
          "FALLBACK": 9,
          "HANDOFF": 0,
          "NO_SEND": 0
        },
        "terminalFailureRate": 0.027190332326283987
      },
      "addedVerificationLatency": {
        "p50Ms": 8099,
        "p95Ms": 11518
      },
      "prefix": [
        {
          "caseId": "r32-advisory-shape-safe",
          "expected": "UNSAFE",
          "attempts": [
            "FAIL",
            "FAIL",
            "FAIL"
          ]
        },
        {
          "caseId": "r57-grounded-shape-safe",
          "expected": "SAFE",
          "attempts": [
            "PASS",
            "PASS",
            "PASS"
          ]
        },
        {
          "caseId": "r45-general-value-safe",
          "expected": "UNSAFE",
          "attempts": [
            "FAIL",
            "FAIL",
            "FAIL"
          ]
        },
        {
          "caseId": "r57-grounded-value-safe",
          "expected": "SAFE",
          "attempts": [
            "PASS",
            "PASS",
            "PASS"
          ]
        },
        {
          "caseId": "r41-ordinary-neat-all-day-safe",
          "expected": "SAFE",
          "attempts": [
            "PASS",
            "PASS",
            "PASS"
          ]
        },
        {
          "caseId": "r22-waist-soft-advice-safe",
          "expected": "SAFE",
          "attempts": [
            "PASS",
            "PASS",
            "PASS"
          ]
        },
        {
          "caseId": "r41-policy-short-intro-safe",
          "expected": "SAFE",
          "attempts": [
            "PASS",
            "PASS",
            "PASS"
          ]
        },
        {
          "caseId": "r45-prebuy-service-intro-safe",
          "expected": "SAFE",
          "attempts": [
            "PASS",
            "PASS",
            "PASS"
          ]
        }
      ]
    }

Disposition rates above use executed outcomes; raw operational terminalFailureRate uses all registered slots and is not a full usability estimate for an incomplete run. Unsafe rejections are intended safety outcomes. FalsePASS refers only to this frozen tested population/configuration; all unexecuted slots remain NOT_RUN. Captured model bodies rebuilt exactly by validator; local sentinel tests prove evaluator-only labels/reviews/cohorts never enter requests. No hidden retry or result selection.

## A3 and remaining unknowns

    {
      "histories": 42,
      "registeredAttempts": 72,
      "executed": 0,
      "families": {
        "concern": 11,
        "partial": 9,
        "correction": 10,
        "policy": 9,
        "simple": 3
      },
      "status": "NOT_RUN",
      "a3RunSourceSha": null,
      "humanAcceptance": null,
      "ownerAcceptance": null
    }

Whole-reply, sales voice/decisions and conversion unverified. A3needs completeA2PASS/fresh sourceSHA/preflight, raw savepoint, whole actual-terminal buying assessment before diagnostic dimensions. Primary review subjective/nonblind; no human score fabrication. Safe fallback can still qualityFAIL.

## Complexity and actual commands

Cumulative runtime delta from implementation start:4evaluation-only helpers+19/-13lines; current round adds only fixed admission/pin. Detailed batch review: [CHECKPOINT_A_BATCH_57_59](../CHECKPOINT_A_BATCH_57_59.md). [Whole-turn root cause](ROOT_CAUSE_REVIEW.md).

Evaluation-only fixed-round admission, prospective corpus and source-independent prompt treatment. New semantic roles/layers/gates0;1owner/max1verifier and code soleauthority. No production/sharedsource wiring, parser/router/repair/reverify/template/framework/tool/state/effect/send. Scope/readiness list exact structural delta. DETERMINISTIC_READINESS.md and RUN_COMMANDS.json retain actual commands/results/RED/failures. Remote CI not claimed PASS without readback.

## Recommendation

STOP. Closed round preserved; owner authorized review/fix/new frozen identity within remaining batch.
