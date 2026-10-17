# Phase B — runtime boundary correction and one stateful replay

**STOP: hành trình mua chưa hoàn tất.** Thu đủ7outcomes N1, không B1/A2/A3 generation. Actual4static fallback/2handoff/1no-send; primary1USABLE ownership-only/6FALLBACK_OR_NO_SEND. Không giỏ, không quote, không preview hoặc xác nhận mua. [Bảy hội thoại](CONVERSATIONS.md), [finding/root cause](FINDINGS.md), [review từng lượt](PRIMARY_REVIEW.md).

## Source và frozen configuration

- implementationBaseSha/refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Intake: `042cad7cd2a2622cbf802c6b221587ab3535ec4f`; code `fdf99f95ea0a70637797c0cdad3c49ecbcdae90b`, compatibility correction/verification `964c5270137cf12ac3faf38bf9a5c557f5e2c7cd`.
- Clean runtime **bRunSourceSha `13e69d43dc3ae9f792140ba8d16e9ad3057fcbb7`**, captured at runtime without writing it back into frozen source. Prep docs saved8301adda, frozen inputs sealed13e69d43 before preflight/provider results.
- Raw savepoint `691fd9126b488e0d4dfd5b5a6d68f6b3529a81ce`, primary `a8b74138e82dde0c4f1fd5259154b3c5db8ba7dc`, diagnosis/accounting only afterward.
- Exact models/config, prompt/schema/native/corpus/input/spec/plan hashes: [FROZEN_INPUTS](FROZEN_INPUTS.json). Gemini3.5FlashLiteHigh/Vertex global owner; GPT6.1SolHigh/Codex login verifier. Verifier is configured but receives0calls this run. Provider-returned owner identity matches all13responses.
- Owner prompt11.756bytes/SHA256 `8cb461c2874522915aabdbd7d945768df656577ce60a426d6b7f4636bf5702f3`; verifier11.646bytes/SHA256 `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24`. Native declarations unchanged, composed hash `a0b9ab8ae3eaa8fc5193df5f0ac0d0e9524596c0d3fdf2c7a5f2660231f615c3`.
- Existing corpus7/one sales journey six turns plus separate human control, N1/max24generations. One upstream generation per invocation, no automatic retry, replacement, reseed, extra canary, post-result patch or new model request. Live source reads are not a paired fixed-snapshot experiment; human acceptance null.

## What changed and how it was verified

Five existing runtime files changed, **52 insertions/29 deletions, net+23lines**. Optional STALE diagnostic at the existing gate, enabled by B only and retained through code recovery; historical A JSON default preserved. Exact public fact arrays may be reused from trusted instead of repeated in native product results. Rejected owner requests retain measured requestBytes. Existing ETA resolver distinguishes unmatched region keys; no region mapping was invented. No new runtime module/semantic role/layer/parser/router/regex/template/repair loop/retry/store/framework/gate, production wiring, shared-package source, schema or live source mutation.

[Preparation and actual failures/commands](PREPARATION.md): diagnostic RED48PASS/4FAIL→52PASS; recovery RED19/1→20PASS; ETA7/1→8PASS; adapter27/1→28PASS, plus the bound-byte reproduction. First full Node eval487PASS/4FAIL/2SKIP exposed exact legacy A evidence incompatibility. A focused legacy-terminal RED52/1 led to B-only diagnostic opt-in; historical fixtures/checks were not edited or weakened.

Final: worker130files/**1.806PASS**; focused provider/protocol/comparison49PASS; protected-claims/reply21PASS; legacy-focused21PASS; full Node**491PASS/0FAIL/2existing optional SKIP**. Worker typecheck/build/lint each exit0 after correction. Full worker used the bounded Windows placeholder/junction wrapper and restored tracked bytes. No full-repo pnpm check or remote CI PASS claim.

Controlled real PostgreSQL COD**24/24PASS**,0provider generations, source964c5270/sourceDirty=false and testDatabaseDropped=true. [Control](controls/cod.json) is synthetic-domain/current-captured-policy integration, not a completed live-source purchase. Bank control was not rerun.

Offline60captured bodies keep trusted view/native parts and all other fields when proven duplicate facts are restored;66arrays/20.072bytes total reused. Max remains31.352/32.768bytes. Controlled long-signature variation**35.905bytes still rejected**; not the exact uncaptured failed request. Payload headroom remains unresolved. This provider run has0bound failures/max30.799bytes, so bound is not its observed fallback cause.

## Actual denominator and quality

| Outcome | Count |
| --- | ---: |
| Registered/completed outcomes |7/7|
| Public/code-private turns |6/1|
| Static fallback |4/7 (57,1%)|
| Handoff |2/7 (28,6%)|
| No-send |1/7 (14,3%)|
| Send-eligible model reply |0|
| USABLE |1, requested ownership transfer only|
| FALLBACK_OR_NO_SEND primary |6|

Four first turns consume the tool budget before a usable final; slots3/4 actually add without color and receive CART_VARIANT_AMBIGUOUS/availableColors BE, then corrected calls arrive under NONE. All four final-only HTTP requests still return native calls; they are not thought-only parts and are not executed. Profile correction persists but cart stays null. Private checkout stops at PLANNER/NO_TRANSITION_PLAN, not the new ETA branch. Confirm is no-send after handoff. No rejected draft or later operation rescues an earlier outcome.

The current input treatment removed repeated facts from per-offer tool results while retaining them in the first trusted message. That changes how the model joins data, so information fidelity alone does not establish behavioral compatibility. It is a concrete hypothesis for the extra AO read, not causal proof: first-generation read happens before fact reuse, source/N1 variance remains, and missing-color/NONE failures already occurred historically. Do not call this a successful optimization or blame all failures on model/verifier hardness.

## Request, privacy and operational evidence

[Accounting](REQUEST_ACCOUNTING.json), [metrics](METRICS.json), [audit](AUDIT.json), [raw hashes](RAW_HASHES.json):

- **13unique invocations/13upstream generation HTTP200 =13owner+0verifier**, within24. Unknown accounting0, generation error/timeout0/13, retry0, owner OAuth requests1; verifier auth network not measured. HTTP success does not mean task success.
- **65.186input/7.057output tokens**, usage complete13/13; owner output includes thinking tokens. Cost not exposed, no estimate. Source preflight separately records1embedding call/0conversational generations; provider batch embedding0.
- Four actual requests with tools[]/NONE return functionCall, blocked by runtime. Thirteen owner body hashes/bytes match the adapter's exact dispatched wire. Zero model FINALs and zero verifier calls: verifier p50/p95, added verification latency and verifier binding acceptance are **NOT_EXERCISED**, not 0ms or a verifier PASS rate.
- Owner invocation p50/p95**2,107s/4,506s** (N13, includes client/auth/parse). Whole-turn p50/p95**19,468s/24,720s** (N7, includes source/DB/capture). Nearest-rank quantiles; no speed-improvement claim for a failed journey doing different work.
- Four exact terminal texts match captured static fallback. Fourteen raw/preflight/control file hashes match both disk and Git;16frozen input/runtime file hashes checked. 0observed evaluator labels/private-fixture text in13model bodies; private checkout and dependent confirm each0model calls. No provider coverage claimed for new STALE diagnostics, receipt recovery, cart guard or region-unresolved branch because they did not execute.
- Actual code-owned static fallback remains C3_A_NONPROTECTED_V2: “Phần này em chưa trả lời được, chị nhé.” SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. Terminal map/model config are frozen in unchanged manifest and source. Handoff is an isolated committed ownership transition, not proof of real employee service.
- Source PG/Redis/Qdrant read-only. Provider disposable DB dropped/readback true; delivery capture-only. No POS order/payment/hold, real human notification, source/index/policy publication, deploy, merge, customer send or live migration.

## Collection/evidence commands actually run

Preparation lists focused/full tests and exact failed corrections. Runtime/evidence commands:

```text
node C:/Users/nguye/AppData/Local/Temp/c3-runtime-boundary-freeze-20261017.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-runtime-boundary-provider-unused-20261017 COD --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-runtime-boundary-source-20261017
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-runtime-boundary-stateful-20261017 COD --provider-run
node C:/Users/nguye/AppData/Local/Temp/c3-runtime-boundary-primary-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-runtime-boundary-audit-20261017.mjs
```

Config preflight returned CONFIG_READY_CONNECTIONS_UNVERIFIED; stateful preflight PASS and actual source readback completed with exit0 before generation. Runtime HEAD remained13e69d43 through collection; executable/config did not change. Raw/source/protocol identities are not reused as proof of conversational quality.

**Recommendation: STOP sales/live acceptance.** Candidate result regressed versus the preceding stateful5USABLE/2unresolved, but there is no isolated causal measurement. Proposed next correction is to restore native per-offer fact locality while retaining bounded diagnostics, then examine final-only provider conformance; do not broaden prompt, verifier, budget or architecture to rescue this run. No post-result code rollback or extra generation performed. Source-backed purchase and destination mapping remain unresolved; A stays OWNER_BYPASS, no A2/A3 rerun/qualification or automatic Phase C.
