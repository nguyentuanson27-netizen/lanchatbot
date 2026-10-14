# Phase B1–B3 — implementation evidence, 2026-10-14

**Code candidate implemented; real-source verification BLOCKED.** Owner requested “thực hiện b1 b2 b3”. This is engineering evidence for isolated code, not a provider evaluation, measured A GO, qualification or live activation. [Execution scope](../../../../docs/specs/c3-phase-b-execution-20261014.md) / [B1 plan and B roadmap](../../../../docs/specs/c3-phase-b-read-only-integration-plan-20261014.md) / [usage and limits](README.md).

## Source identity

| Identity | Exact value |
| --- | --- |
| bImplementationBaseSha, refreshed main | `296cdcfbf5759f5bf9cbb24acf3dc63005589361` |
| Candidate foundation, unmerged PR390 | `dd5c9d46f41f1514982210034f551a95cd356f68` |
| Executable implementation savepoint | `40d69428a3222a86beb24a6d77fe59e441115e0e` |
| Branch | `feat/c3-phase-b-commerce-20261014` |
| Architecture spec Git blob SHA | `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a` |
| Boundary amendment Git blob SHA | `4a09b55d2f3a972a65697738876cc5eab21e7a2b` |
| bRunSourceSha | **null — no provider run** |

Final report/task commits may follow the executable savepoint. A future provider run must capture its own clean current HEAD at runtime; this savepoint is not adopted as a run identity. Historical A data, prompts, registrations, raw evidence and scores remain unchanged. OWNER_BYPASS remains a progression decision, not a measured A PASS.

## Delivered behavior and limits

| Slice | Implemented and tested | Still unverified |
| --- | --- | --- |
| B1 | Existing policy/search/catalog/POS ports; public source context; refs/variants; independent missing facts; bounded native owner; mandatory verifier and current exact-draft gate | Actual PostgreSQL/Redis/Qdrant connection/readback and eight source-backed model conversations |
| B2 | Existing profile merge/CAS adapter; SET/REPLACE/CLEAR with source provenance; accepted state before size/quote; per-product fit/chart binding; current source quote; two-turn continuity | Real database CAS/expiry behavior through this candidate and real customer-state/history composition |
| B3 | Existing canonical cart/sales-cycle executor; code permission/op IDs; atomic repository contract; current receipts; ambiguity reconciliation; COD/bank confirmation with private preview/revalidation; receipt-backed recovery | Real atomic repository adapter/effect delivery and upstream checkout/stage composition; external POS order creation is not implemented or claimed |

The CLI exposes B1 read-only capabilities only. B2/B3 are typed candidate composition ports exercised with isolated repositories; no live writer is wired. Existing sales-stage, private checkout, preview and bank-policy prerequisites remain intact. Tests explicitly seed prior domain stages as a prior accepted conversation; the runtime never fabricates FACTS_PRESENTED/SIZE_RECOMMENDED to open a cart. The separate two-turn state test keeps one persisted profile across both turns and applies the later correction.

One conversational owner, at most one verifier. Code owns truth/freshness/identity/state/permission/effects/receipts/privacy. Every final hard-precheck survivor takes the verifier once, including ordinary acknowledgements. A post-effect recovery acknowledgement is code-owned from a current receipt and scope; it is not another model generation or a generic path to skip verification. There is no production entrypoint import, live send, policy pin/audit writer, migration, C3 removal or live order/cart mutation.

## Provider/protocol identity

- Owner: Vertex AI **gemini-3.5-flash-lite**, version identity `gemini-3.5-flash-lite`, effort **high**, global. One candidate; plain text/native function calls; max output8192tokens; HIGH thinking with thoughts excluded; temperature/topP omitted; timeout90s; automatic generation retries0. Different/missing returned model version or non-supported media/code output fails closed.
- Verifier: **gpt-6.1-sol**, version identity `gpt-6.1-sol`, effort **high**, existing Codex ChatGPT-login bounded Responses relay, CLI0.159.2. Tools empty/tool_choice none; strict verdict schema; store false/stream true; timeout90s; response1MiB; max1upstream request per generation; retries0. Incomplete streams are errors. No provider or credential substitution.
- Budget: max3owner generations/2tool rounds/6domain calls/1verifier per turn. An auth/401/429/5xx/timeout/error terminates that generation. A tool continuation requires new tool results, never a repair/retry of a failed generation.

| Frozen implementation input | SHA256 |
| --- | --- |
| Owner prompt | `a42da3e0777bad1b37479e2f958aac5459b13eddceb7c49ecf0c41cc1d442216` |
| Verifier prompt | `fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957` |
| Verdict schema JSON | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| Manifest file bytes | `cb0a9f2deae5ce0057370cbebcbf1deaaad8228cc6d0352ed11815333828d568` |
| Source-backed case population | **not registered; source configuration/approved inputs missing** |

The B prompts retain the approved Vietnamese sales/semantic boundaries, replace A's no-tool capability paragraph with explicit scoped native tool use, and make accepted verdict refs precise. `provenance.evidenceRef` is not silently remapped or accepted as a verdict ref. No case-specific production regex/template or shop policy values are added. API shape was checked against [official function-calling documentation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling) and [official FunctionDeclaration JSON-schema contract](https://docs.cloud.google.com/dotnet/docs/reference/Google.Cloud.AIPlatform.V1/latest/Google.Cloud.AIPlatform.V1.FunctionDeclaration).

`buildReadOnlyContext` uses the existing canonical JSON serializer and explicit state projection. Product/variant refs, source claims, policy versions, profile revision/fingerprints and optional cart binding participate in the snapshot. Bounds and complete model config remain in README/manifest. Runtime case projection contains only latest/history/approved initial codes; evaluator fields remain separate. Stub-captured HTTP bodies include continuations/signatures/call IDs and exclude caseId/split/expected/required/forbidden/rubric canaries. The verifier body is independently captured with its own label-exclusion assertion. These are deterministic transport tests, not provider safety/quality observations.

## Actual terminal behavior

| Condition | Outcome |
| --- | --- |
| PASS, unchanged current scope/facts/exact draft | SEND_ELIGIBLE, `sendEnabled=false`, exact owner text |
| FAIL/UNCERTAIN/malformed/provider error/timeout/budget exhausted | Static `C3_A_NONPROTECTED_V2` fallback |
| Snapshot/binding/freshness invalid, current source read unavailable | HANDOFF disposition, no claim that a person was transferred |
| Privacy/recipient/permission invalid | NO_SEND |
| Owner/verifier failure after a proved commit | Current receipt-backed code ACK, or HANDOFF/NO_SEND; no effect replay |

Static fallback: **“Phần này em chưa trả lời được, chị nhé.”**, SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`.

Receipt ACKs have reason `RECEIPT_BACKED_ACK`, fallbackId null: **“Giỏ hàng đã được cập nhật, chị nhé.”** (`c6e56ec5c0bf544e9ffeb525074e512686933862f63bea562538cb8ef4fb9271`) and **“Shop đã nhận xác nhận mua hàng của chị.”** (`7ca14758d08aaff00c7728897be822e94919547cc7baff10e1a7a6adb7920c18`). These exact static surfaces are used only after current receipt/revision/binding/recipient/permission/privacy checks. A duplicate cannot turn CART_OPENED into a new CART_MUTATED receipt or attach an old commit to a later revision. Missing old receipt fails closed instead of manufacturing one from history.

## RED → GREEN and self-review

Observed behavioral REDs before their fixes included: policy-only context rejected; wrong variant accepted; altered product hash accepted; valid independent facts lost with a failed contributor; multi-variant facts overwritten; chart changes retaining old fit; absent CLEAR lacking a tombstone; permission/revision races; a later failed effect hidden by an earlier receipt; changed-binding recovery accepted; stale quote overriding current cart totals; bank-policy resolver not forwarded; duplicate relabeling receipt; malformed variant arguments selecting another variant; post-commit revision drift getting a receipt; last-known-good policy accepted as a current read; wrong provider version/unsupported visible output accepted; modified generation/fallback config accepted. Focused suites are green after minimum boundary fixes. New source/protocol modules also first failed at their missing module/export before implementation.

Intermediate fixture failures (missing canonical line total, required legacy stage/policy port) were corrected in the test setup, not by weakening the domain state machine. The current code has no parser, classifier, repair loop, model router, extra semantic role, durable operation store or unchecked model-selected business totals.

Full verification found two harness/environment issues, recorded instead of counted as application PASS:

1. Vitest discovered Node `node:test` files and reported no suite. The package now explicitly runs all worker `src` suites with Vitest, then **all** Node eval suites with Node. No failing population is discarded.
2. Windows checked out the tracked `v4` symlink as16bytes of link text. Full worker tests use a temporary junction to the exact existing `track-c-c2/v2` target, then restore the original link bytes. The first full run also exposed fixed R39 tests importing validators under the caller's R68 input root; the test now selects R39 before module initialization. Runtime identity validation, fixtures and retained evidence are unchanged.

Build additionally caught exactOptionalPropertyTypes on an absent bank resolver; conditional forwarding fixed the type error. No command failure is represented below as a successful earlier run.

## Commands actually executed

All commands run from repository root unless stated. Counts are observations from those invocations, not provider attempts.

```powershell
git fetch origin main
git rev-parse origin/main
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-sources.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts src/redis-business-facts.test.ts src/realtime-sales-catalog.test.ts src/realtime-product-facts-v2.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
$env:C3_CHECKPOINT_A_ROUND='68'
$env:C3_TEST_CODEX_TRANSPORT='1'
node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/product-presentation.test.ts src/product-facts-v2.test.ts src/size-engine.test.ts
pnpm --filter @lana/worker test
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
node --check apps/worker/evals/single-agent-commerce-read-only/run.mjs
node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config $bConfigPath
git diff --check
```

| Check | Observed result |
| --- | --- |
| Main refresh/source readback | exit0, main SHA above |
| Final focused worker group | **139/139 PASS**,11files,0skip |
| B native adapter/protocol | **16/16 PASS**,0skip; fake HTTP only |
| A protected transport/protocol regression | **29/29 PASS**,0skip; logged-in CLI uses local upstream stub |
| Existing protected claims/reply assembly/presentation/facts/size | **52/52 PASS**,5files |
| Full worker command | **exit0:125Vitest files/1693tests PASS plus458Node eval tests PASS**,0skip |
| Worker typecheck | **exit0** on final current source; `exec tsc --noEmit` also exit0 |
| Worker build/lint | **exit0** at executable savepoint; previous bank optional-field error corrected |
| Node runner syntax / diff whitespace | exit0 |
| Source preflight | **BLOCKED**, nonzero exit, providerGenerations0, sendEnabledfalse |

Full command setup used the temporary Windows fixture junction described above; restoration is checked byte-for-byte. Earlier full command failures were101suites (mixed runners/link), then3missing-fixture suites, then2R39 identity tests after unit suites passed; they are retained as failures, followed by their focused fixes and final verification. No shared package source changed; existing shared focused tests ran, dependency builds ran through worker scripts, and no extra shared migration/build claim is made.

## Availability, metrics and recommendation

Checked both this worktree and the main checkout: only `.env.example`, no configured shop routes; no SSH config route was available. Codex local relay/login is covered by the stub test. The already approved service-account file exists and is recognized by B preflight; **B OAuth/generation was not invoked**. Preflight lacks PostgreSQL URL, Redis URL, Qdrant URL/key, approved channel/collection/search thresholds, the index's embedding model/location/dimension and the eight approved source-backed runtime cases. A concise route question is pending; coding/tests proceeded independently.

Therefore registered/executed provider turns, unsafe/safe population counts, observed model errors/false PASS, whole-reply quality, fallback/handoff/no-send rates, latency p50/p95, added verification latency, input/output tokens and cost are **N/A — no provider population/run**. There were **0 real B generation requests**. Do not substitute deterministic fixtures or past A numbers. B2/B3 real database/mutation/effect-delivery experiments were not run.

Complexity at the executable savepoint versus foundation:29files,2182insertions/17deletions, including tests/prompts/config/docs. Six candidate TS modules total654lines; three read, three state/size/quote and three effect native tools. There is one bounded conversational loop; state/effect decorators reuse existing domain owners. Semantic roles added above A:0 (one owner and one verifier remain). New durable stores/tables/outbound send paths:0. Production entrypoints/shared packages:unchanged. Test runner selection and a fixed-round test input initialization are the only collateral harness edits and own the concrete failures described above.

**Recommendation: review the code candidate; BLOCKED for real-source B verification.** Keep send-disabled and retain B2/B3 real-adapter work as unverified. No A GO, qualification/replacement, merge, deploy, live send or automatic Phase C follows from these tests.
