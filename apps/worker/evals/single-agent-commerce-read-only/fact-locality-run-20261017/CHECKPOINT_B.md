# Checkpoint B — native offer fact restoration

**Recommendation: STOP sales/live acceptance; source checkout BLOCKED.** Four cart/profile/quote steps now complete in this run, but checkout/purchase does not. A remains **OWNER_BYPASS**, not PASS. One existing seven-outcome stateful run, N1; B1/A2/A3 not run.

## Provenance

- implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361` after fresh `git fetch origin main`.
- Intake: `4fde4dabbd0d7c6728c82e92b51619883ada8238`.
- Code verification savepoint: `10276d541024e54d4ca927ed205d5d93975c08f0`.
- Clean runtime bRunSourceSha: `c6476301539988f134f0843a0e3f2a31fff0560e`.
- Raw savepoint: `2dffdfa7733bd0c2311d87814803c2aabd1f8178`, before primary `bece64521d1801f61362065c2e9b1db0e353c6e9`, before detailed diagnosis.
- No executable/config mutation, retry, replacement, reseed, additional business generation, or source publication after seal. Live public sources may vary; not a paired fixed-snapshot experiment.

[Scope](SCOPE.md), [plan](PLAN.md), [frozen full model/config/schema/input identities](FROZEN_INPUTS.json), [preparation and commands](PREPARATION.md), [raw hashes](RAW_HASHES.json).

## Frozen identities

| Item | Exact identity |
| --- | --- |
| Owner model/provider/effort | `gemini-3.5-flash-lite / VERTEX_AI global / high` |
| Verifier model/provider/effort | `gpt-6.1-sol / OPENAI via CODEX_CHATGPT_LOGIN / high` |
| Owner prompt SHA256 | `8cb461c2874522915aabdbd7d945768df656577ce60a426d6b7f4636bf5702f3` |
| Verifier prompt SHA256 | `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24` |
| Verifier schema SHA256 | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| Stateful native tool schema SHA256 | `a0b9ab8ae3eaa8fc5193df5f0ac0d0e9524596c0d3fdf2c7a5f2660231f615c3` |
| Stateful corpus SHA256 | `51d53b26a9d85ee37786a269df1700cbbe9b4b2fd16ec243bc4a2bce56f3a749` |
| Source config SHA256 | `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e` |

Exact generation config/version/credential routes are in FROZEN_INPUTS and runtime registration: owner candidate1/text-plain/max8192/thinkingHIGH, verifier high/tools-none/store-false/stream/one-upstream-request/timeout90000. No automatic generation retry.

Spec/plan blob identities at runtime source:

- `docs/specs/c3-single-agent-commerce-architecture-20261004.md`: `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a`.
- `docs/specs/c3-semantic-verifier-boundary-amendment-20261005.md`: `4a09b55d2f3a972a65697738876cc5eab21e7a2b`.
- `docs/specs/c3-phase-b-execution-20261014.md`: `a452326d77e4493b88b02c0072cef808fecad2d8`.
- `docs/specs/c3-phase-b-advisory-and-chat-boundary-20261016.md`: `5a531cfeb03fcc20e178517a47f5be5a234e1593`.
- `tasks/plan.md`: `aa75a350aa99b63c0459257abbf1b84019e0b82b`.
- `tasks/todo.md`: `cc9cbd6f0c12346f6885c45ad32bb71b2293cbb7`.

## Actual results and denominator

| Measure | Observed |
| --- | --- |
| Registered / complete outcomes | 7 / 7, N1, maximum24 generation invocations |
| Conversational invocations / measured upstream requests / HTTP200 | 13 / 13 / 13 |
| Owner / verifier | 9 / 4 |
| Generation retry / error / timeout / unknown accounting | 0 / 0 / 0 / 0 |
| Actual terminal | 4 SEND_ELIGIBLE, 0 static FALLBACK, 2 HANDOFF, 1 NO_SEND |
| All surviving final drafts verified + current gate | 4 / 4, exact draft/captured text |
| Primary whole-turn review | 5 USABLE task milestones, 0 NEEDS_EDIT, 2 FALLBACK_OR_NO_SEND; sales journey not completed |
| Requested-human control | Ownership-only; not real employee service or a completed sale |
| Evaluator/private-fixture leaks observed | 0 on the 9 owner and 4 actual verifier requests |
| Private checkout / dependent confirmation model calls | 0 / 0 |
| Disposable database | Dropped, true |

[All seven conversations and committed state](CONVERSATIONS.md), [primary review and caveats](PRIMARY_REVIEW.md), [tool-level diagnosis](DIAGNOSIS.json), [request accounting](REQUEST_ACCOUNTING.json), [audit](AUDIT.json).

Created AO/be/M×1, changed to L/BE×2 using two commands in one batch, answered978,100VND including30,000VND shipping from current code quote, accepted profile74/96 while retaining chosen L×2. No later turn rescues an incomplete quantity. The first turn still reads once before add. No receipt ACK recovery or speculative effect success was used.

Checkout now reaches **PLANNER/CART_ETA_REGION_UNRESOLVED**; the previous run never reached that boundary because cart was null. The following confirmation is fenced with CURRENT_AUTHORITY_CHANGED. No checkout preview/purchase completes and no customer traffic is sent.

## Operational measurement

Nearest-rank p50/p95; small populations, not stability estimates. Actual invocation intervals include client/auth/parse; whole turn includes source/DB/capture.

- Verifier invocation: N4, p50/p95 4394/5722ms.
- Recorded verification interval including runner readback/gate: N4, p50/p95 6225/8686ms.
- Owner invocation: N9, p50/p95 2169/4854ms.
- Whole turn: N7, p50/p95 21809/43236ms.

The recorded verification interval is measured, not a counterfactual E2E difference from a run without verification. Input68,082/output6,408tokens, accounting complete13/13; output includes owner thinking. Cost not exposed, no estimate. Error/timeout rate0/13. Fallback0/7, handoff2/7, no-send1/7; one handoff is the requested-human control. Owner OAuth1 request; verifier auth network count not measured. Source preflight separately used one embedding call; stateful run embedding0.

Actual max owner wire31,877/32,768bytes, remaining891bytes. One NONE request, zero unexpected tool calls. This is not a fix/proof for the older four NONE violations. Controlled signature variation still35,905bytes and rejects before provider dispatch; no signature trimming/bound increase.

## Terminal map and unused fallback

```json
{
  "PASS": "SEND_ELIGIBLE_SEND_DISABLED",
  "FAIL": "STATIC_FALLBACK",
  "UNCERTAIN": "STATIC_FALLBACK",
  "MALFORMED": "STATIC_FALLBACK",
  "TIMEOUT": "STATIC_FALLBACK",
  "PROVIDER_ERROR": "STATIC_FALLBACK",
  "STALE": "HANDOFF_NO_SEND_CAPABILITY",
  "PERMISSION": "NO_SEND",
  "PRIVACY": "NO_SEND",
  "RECIPIENT": "NO_SEND"
}
```

Static fallback `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.”; SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. Used0times. Code-owned handoff/no-send paths remain capture-only; see actual reasons in the conversation report.

## Verification actually run

- Observed adapter RED26PASS/2FAIL, then focused provider/protocol/comparison49PASS.
- Full worker130files/1,806PASS; Node eval491PASS/0FAIL/2existing optionalSKIP.
- Protected-claims/reply-assembler21PASS; worker build/typecheck/lint exit0. No shared source changed.
- Offline60prior captured inputs serialize identically to the action-contract version, with trusted view/native parts intact and no fact-array removal. No provider generation in this check.
- Read-only current complete variant selection: M×1 and L×2 READY, stock0/PRE_ORDER; zero source writes/generations.
- Config preflight reports CONFIG_READY_CONNECTIONS_UNVERIFIED; stateful preflight PREFLIGHT_PASS and actual source readback PASS precede collection. Local config preflight without temporary route initially reports missing environment names; wrapped existing route is ready. The initial temporary selection probe had a non-UUID lineId; corrected before source-selection PASS. These are preparation failures, not retries or dropped provider attempts.
- 16 raw/preparation hashes match disk and Git; 16 frozen input/runtime file hashes, 6 reference blobs at run source, 9 owner wire hashes, 4 actual verifier wires/bindings, 4 exact captures.
- Existing domain controls remain historical evidence; not rerun/claimed here. Full-repo pnpm check, remote CI, bank integration and live deploy/send are not run or claimed PASS.

Exact additional collection/evidence commands:

```text
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-stateful-preflight-20261017 COD --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-source-readback-20261017
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-stateful-run-20261017 COD --provider-run
node C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-freeze-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-primary-20261017.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-fact-locality-audit-20261017.mjs
git diff --check
```

Freeze occurred before the collection commands; primary/audit occurred after raw collection. The above command list is not a chronological execution order. Focused/full verification commands and failed preparation command details are in PREPARATION and the retained preparation JSON.

## Failures, unknowns and next boundary

- Authoritative address-to-region mapping remains absent. Do not guess MIEN-NAM or add DEFAULT. Need an approved mapping or existing valid region key supplied by the private checkout flow; generic Vietnamese location parsing is outside this fix.
- Both models receive selected PRE_ORDER facts, but four captured ACK/quote replies do not disclose preorder. No in-stock assertion or completed purchase occurred; disclosure of material ordering/lead-time conditions before real confirmation still needs verification. This is a communication/coverage gap, not missing context or proof verifier should demand every keyword.
- Current action fulfillment improved in N1; causal attribution to fact locality, recurrence rate and prior NONE cause remain unknown. B1 fashion-advice naturalness is unmeasured; ACK4 still has a verbose status-report rhythm.
- Runtime STALE diagnostic and guarded rejected action/receipt recovery were not exercised by provider; keep unit/control coverage distinct. Human acceptance and real employee service remain unmeasured.
- Structural delta this slice: runtime3insert/7delete, net-4lines; semantic roles/layers/gates/stores added0. No prompt growth, production wiring, repair/reverify loop, parser/regex/template, framework, source publication, merge/deploy or live send.

Keep the narrow restoration as an input presentation candidate. **STOP sales/live acceptance; source checkout BLOCKED.** Stop after this registered run; no post-result patch/generation or Phase C. [Findings and concrete next work](FINDINGS.md).
