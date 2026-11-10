# Phase B execution-contract replay — 2026-10-18

**Đã chạy đủ45lượt; recommendation STOP.** Primary whole-outcome review: **23USABLE /8NEEDS_EDIT /11UNUSABLE /3ownership controls**. Cả ba hành trình tới preview và xác nhận mua, nhưng không hành trình nào hoàn thành đúng lượt nhận mua đầu tiên. B1 giảm rõ và còn ba nhóm semantic cần phân xử. Không chạy16ca còn lại theo tiêu chí đã freeze, không patch hoặc mở candidate tiếp trong run này. A vẫn OWNER_BYPASS, không phải A2/A3 hoặc A PASS.

## Source, mô hình và phạm vi

- implementationBaseSha/main vừa fetch: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; intake/implementation `6c5befcac1edbc3465887e54c02762f39d1a9962`.
- Exact bRunSourceSha: **`4619eaa5c4cf430f8864716ddbfcb2d2fdebe880`**, clean sau freeze và trước preflight/generation. Raw savepoint **`374e8e0fb71118721226191e053b40269b7631f1`** trước primary **`92738a5e`**, rồi mới đọc rejected drafts/verdict/tool traces.
- Owner: Vertex AI global **gemini-3.5-flash-lite /HIGH**, version exact model ID, candidateCount1, text/plain, maxOutputTokens8192, thinkingLevelHIGH/includeThoughtsfalse, temperature/topP provider defaults. Verifier: **gpt-6.1-sol /high** qua Codex login/CLI0.159.2 bounded relay, toolsnone, strict JSON schema, no generation retry. Exact transport/config/routes trong [freeze](FROZEN_INPUTS.json).
- Prompt owner `71e0ef0b6cc5864111a6c346744ee0b1f51c78bfe2414bfcf4858fb0061d4fab`; verifier `5d35e5de46030ea7e1ad10e6a4bde3bdf28a968ee48c8eb6825543ec0b61dbfd`; verdict schema `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`. Exact corpus/tool/schema/executable/source-config and task-local runner hashes, criteria/spec-file hash are frozen before results.
- [Scope](SCOPE.md), [implementation and observed RED/GREEN/checks](../../../../../docs/specs/c3-phase-b-execution-contract-fix-20261018.md). Combined owner guidance + system execution projection + completion accounting correction; cannot attribute aggregate changes to one edit. No new role/gate/store/tool/schema/parser/repair/retry or budget increase. Code still owns identity, truth, freshness, state, permissions, effects, receipts and privacy.

## Complete denominator and actual outcomes

Same15unique cases ×3 as previous run: 8priority B1×3=24, 3independent ordered stateful journeys×7=21. Stateful journeys dispatched first; up to2native processes overlap inference, shared builds/import starts serialized. All45retained, including failures/downstream, no majority/best-of/replacement. Source live per-read worlds and stateful histories can differ; not a paired causal experiment or stability proof.

| Population | USABLE | NEEDS_EDIT | UNUSABLE | Controls |
| --- | ---: | ---: | ---: | ---: |
| B1 | 9 | 8 | 7 | 0 |
| Stateful | 14 | 0 | 4 | 3 |
| Total | **23** | **8** | **11** | **3** |

14stateful usable includes6code-owned preview/confirmation milestones; the other8are model replies. Three human-request controls have no captured reply and are not sales conversations or evidence of actual staff service. No code recovery supplied a SEND_ELIGIBLE model-like reply in this run.

Terminal: **25SEND_ELIGIBLE /11FALLBACK /3NO_SEND /6HANDOFF**. Three NO_SEND are PRIVATE_CHECKOUT_COMMITTED with captured preview, not missing customer outcomes. HANDOFF includes3PURCHASE_CONFIRMED with capture and3CUSTOMER_REQUESTED_HUMAN controls without capture. Preview/confirmation is candidate code behavior, not proof of external POS orders, payments, human handling or delivery.

All actual conversations and case-specific reasons: [CONVERSATIONS_AND_REVIEW.md](CONVERSATIONS_AND_REVIEW.md), [primary JSON](CANDIDATE_PRIMARY.json). Review is subjective engineering assessment, ownerAcceptance=null, not independent human acceptance. Minor wording alone is not failure; legitimate upsell, confident aesthetic advice, useful measurement readback and choosing the set are still accepted.

## Four stateful failures and successful later recovery by the dialogue

| Lượt | Trace sau primary | Actual outcome |
| --- | --- | --- |
| Rep1 mở giỏ | apply_customer_state uses the same quote containing76and98 for both fields; numeric source contract rejects it. Owner then ends with a question about helping add/fit instead of resolving fields/adding. | Hard precheck STATE_UPDATE_INCOMPLETE; no verifier call, no profile or cart, static fallback. |
| Rep1 đổi L/lấy2 | Read first, then replay old measurements/sourceQuote from history and add with colornull. State reject blocks dependent add. Final-only generation again calls add/colornull. | OWNER_TOOL_MODE; no late execution/cart. |
| Rep2 mở giỏ | Profile76/98commits. Read then addAO/M with colornull despite BE in current message; selector rejects. Corrected BE add arrives only under NONE. | OWNER_TOOL_MODE; profile accepted but no cart. |
| Rep3 mở giỏ | Profile commits; first add includes BE/M but omits offerType, so selection does not bind the requested AO offer and returns CART_COLOR_NOT_FOUND. Subsequent read shows all offers; final says áo không có màu be. | Verifier FAIL; no cart, static fallback. A failed selection does not prove the áo offer lacks BE. |

Rep1 finally adds correct2AO/BE/L at the quote question; reps2/3add them at the change request. All later correction profiles end74/96 and keepL; all three previews/confirmations complete. This does not erase the4earlier failed outcomes or prove opening reliability. Rep1 correction initially uses a two-number quote again, then fixes both per-field quotes within the existing tool budget; both generations remain counted. No new fit recommendation was made, but read-before-add and color loss persist.

`offerType` optional in native add schema plus default-offer selection is a concrete remaining contract assumption: a syntactically accepted call can select a different offer scope from the customer's article. `realtime-sales-catalog.resolveOffer` uses OFFER_PRIORITY when no offer is supplied. This is separate from missing stock and should be reviewed before adding more instructions. Current source was not changed after results.

## Seven B1 fallbacks and eight needs-edit replies

All11static fallbacks use frozen `C3_A_NONPROTECTED_V2`, “Phần này em chưa trả lời được, chị nhé.”, text hash `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`.

- **3/3 skirt partial-source replies** infer bán nguyên set/không có lựa chọn bán riêng from missing POS despite independently available material/form. Verifier rejects; these are recurring owner unsupported-commerce assertions, not evidence that source really forbids separate sale.
- **Rep1 changed-to-business meeting:** set799k is said to save money versus buying only the499kshirt. Verifier rejects the price comparison. Choosing/upselling the set itself is permitted.
- **Rep3 compound concern:** owner invents “không đính bèo nhún”. Description not mentioning frills does not establish their absence. Verifier rejects; relaxed confidence about style does not authorize new construction details.
- **2/3 stage replies** are rejected. Rep2 links extra thin lining to “hoàn toàn yên tâm”; rep3 says layering is kín đáo and does not affect form. Both exceed a bare layering suggestion in some readings, but kind/ref alone does not prove which clause the verifier meant. Keep unresolved interpretation of suggestion versus promised coverage/form, rather than asserting all blocks are correct or all are overblocks.

Eight NEEDS_EDIT outcomes, already fixed in primary before rejection diagnostics:

1. Rep1stage: asks again about changing product rather than acting on the customer's stated condition. Source does not establish measured opacity; generic risk warning versus definite product property remains unresolved.
2. Rep1compound concern: price comparison “799k… áo499k hay váy449k” has unclear same-basket versus alternative-item scope. Useful set/styling advice remains; this is not a blanket ban on upsell.
3. Rep2compound concern: lists áo riêng/váy riêng and asks the customer to decide without selecting a preferred direction for their gu/dịp.
4–6. All3partial-source set-M replies give known material but end with waiting/recontact/check-later despite no B1 tracking/handoff implementation for that promise. The concrete next step is wrong; the word “hệ thống” alone is not the reason.
7. Rep2repeat-wear: “tiết kiệm hơn hẳn” after comparing the799kset to the499kshirt leaves comparison scope unclear, even though more garments and wardrobe combinations are legitimate value.
8. Rep3repeat-wear: good set reasoning ends with “để em giữ hàng chuẩn size” outside B1 capabilities. It is a future-step quality failure, not a completed hold/fit claim.

Giọng còn dài, nhiều tính từ, nhắc lại ngân sách và đôi chỗ “giúp em”. Ordinary concern replies with correct light/drape reasoning remain USABLE with polish notes, consistent with previous scoring. Neither fixing a single word nor penalizing every confident “không rườm rà” would address decision/next-step failures. Correction readback of74/96is useful, not a forbidden facts list.

## Verifier and code boundaries

34model finals produced;1fails deterministic precheck for unresolved state update, **all33surviving finals invoke verifier**. Verifier25PASS/8FAIL; all25eligible model texts match exact final drafts/bindings. No classifier skips verification; private checkout0modelcalls.

Two prohibited tool completions are marked generationPROVIDER_ERROR / OWNER_TOOL_MODE despite HTTP200; these are completion contract failures, **not** transport/auth/quota outages. Native wire NONE plus empty declarations and system executionNONE are present;2of8final-only requests still return calls. Owner parsed outputs/telemetry are retained, no call is executed or retried. Provider-internal cause remains unknown. Moving execution into system has not established conformance.

The25PASS population contains open readings already noted in primary: stage risk warning/property and two price-comparison scopes. Do not claim a safety proof or hide these under a zero-error headline. No definite new protected false PASS is adjudicated here; unresolved readings remain unresolved. Verifier verdict kind/ref lacks a clause explanation, so post-review reasons are reviewer inferences, not provider explanations. The B1 source subset andN3 do not establish broader verifier calibration.

## Comparison with prior run

| Same45outcomes | Offer projection b3107465 | Execution contract4619eaa5 |
| --- | ---: | ---: |
| USABLE / NEEDS_EDIT / UNUSABLE / controls | 32/1/9/3 | **23/8/11/3** |
| B1 usable | 20/24 | **9/24** |
| Stateful usable, excluding3controls | 12/18 | **14/18** |
| Fallback | 7 | **11** |
| First4public turns all useful | 2/3 (one code recovery) | **0/3** |
| Preview + confirmation | 2/3 | **3/3** |
| Final-only calls / final-only requests | 5/9 | **2/8** |
| Verifier FAIL | 3 | **8** |
| Generation requests | 115 | **117** |

Later purchase recovery improves and unnecessary recommend_size disappears in this sample, but opening0/3 and overall useful count worsens. Fewer NONE calls do not establish a stable fix, and2completion errors now have corrected accounting rather than being hidden as generationOK. Subjective primary differences, current live snapshots and diverging histories prevent causal attribution; raw actual failures11versus7are objective terminal differences. We did not retrospectively rescore old replies or change thresholds/corpus to improve this result.

## Operational evidence

- **117generation invocations /117HTTP requests =84owner +33verifier**, max1request/invocation, retry0, no unknown request accounting. HTTP200117/117; transport/auth/quota/generation-finish error0, completion-mode errors2/117=1.71%, timeout0. Verifier errors/timeouts0/33.
- Verifier p50/p95 **7.804/16.499s**,N33; added verification interval **9.153/19.491s**,N33, includes readback/gate overhead rather than a paired experiment. Owner p50/p95 **2.150/4.897s**,N84; whole turn **17.588/50.516s**,N45.
- Input **527,760** /output **54,632** tokens, coverage117/117; cost NOT_EXPOSED. Embedding/source requests are separate from owner/verifier generation accounting.
- Fallback11/45=24.44%. HANDOFF6/45=13.33%, NO_SEND3/45=6.67%, with successful code preview/confirmation/control meanings above; not all of these are sales failures.
- Audit68raw hashes, frozen source/config/prompt/corpus hashes,33bindings/25exact eligible drafts, request privacy/evaluator-label firewall:0observed leaks. Actual max owner request32,009/65,536bytes. Three disposable DBs dropped; no live source publication/customer/POS mutation or real delivery.
- [Metrics](CANDIDATE_METRICS.json), [complete request accounting](CANDIDATE_REQUEST_ACCOUNTING.json), [post-primary diagnosis](DIAGNOSIS.json), [attempt index](CANDIDATE_ATTEMPT_INDEX.json), [raw hashes](CANDIDATE_RAW_HASHES.json), [actual process commands and exits](commands.json). Raw hashes are disk bytes; four metadata JSON files use CRLF normalized by Git; executable comparison checks both disk freeze hashes and Git text normalization, not an assertion that every Git blob equals disk bytes.

## Actual verification and commands

Implementation verification at unchanged6c5befca is reused: observed RED→GREEN, focused63Node/160worker/protected21PASS, full1,857Vitest PASS with max2/min1workers after retaining two default-concurrency timeouts, Node506PASS/2optionalSKIP; worker build/typecheck/lint exit0. Fresh source-check invokes the canonical worker build again and reads actual shop source with0generation. No new full-repository/remote CI PASS claimed.

```powershell
git fetch origin main
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/contract-replay-20261018/cases.priority.json --source-check --out C:/Users/nguye/AppData/Local/Temp/c3-execution-replay-source-20261018
node C:/Users/nguye/AppData/Local/Temp/c3-execution-replay-freeze.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py python C:/Users/nguye/AppData/Local/Temp/c3-execution-replay-preflight.py
python C:/Users/nguye/AppData/Local/Temp/c3-execution-replay-run.py
node C:/Users/nguye/AppData/Local/Temp/c3-execution-replay-collect.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-execution-replay-render-primary.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-execution-replay-audit.mjs
node C:/Users/nguye/AppData/Local/Temp/c3-execution-replay-diagnose.mjs
git diff --check
```

All six runner processes exit0, meaning the attempts/evidence completed, not all replies passed. Scope source readback/config/stateful preflight results and timestamps retained. Task-local helper hashes were frozen before results; primary judgments are human-like engineering review, not a new model/provider judge.

## Findings and next handling, not implemented in this run

1. **Repair the call contract before adding prompt reminders.** Optional offer scope allows an áo request to fall onto a set default. Next review should distinguish missing offer selection from truly unavailable color, using current source/typed results. Do not default to AO, infer color in a Vietnamese parser or make a new semantic router.
2. **State proof friction needs a concrete review.** Multi-number quotes are rejected by the single-scalar copy check even when correct values are in the current customer message; later history replay is a separate invalid-source case. Understand whether the existing argument/proof format can be made less error-prone without weakening binding/current-source guarantees. Do not merely accept stale quotes or add patterns per measurement sentence.
3. **Owner still treats unknown as a negative business rule.** Unknown offers became bán nguyên bộ3/3, and an incorrectly scoped variant failure became noBE. This is source interpretation, not missing more product facts. Clear absent/unknown versus rejected-selection contracts should be measured before another generic prompt rewrite.
4. **Separate sales/voice and verifier calibration.** Correct material/styling confidence is allowed; actual next steps must be achievable. Clarify the few open whole-reply meanings without keyword bans or broad permission for physical guarantees. No prompt/verifier result patch is made here.
5. **Stop rather than claim the hypothesis succeeded.** System execution instructions reached captured provider requests but failed to cure conformance/selection; combined treatment cannot identify a single causal mechanism. A future diagnostic should isolate a contract change on existing failed states before a broad run. Current source and all historical outcomes remain immutable.

**STOP owner; no remaining16/new candidate/automatic next round.** Staff processing, external orders, actual delivery, full B1 coverage, stable sales voice, provider NONE conformance and sales/live acceptance remain unverified. A stays OWNER_BYPASS; no merge/deploy/Phase C.

Final local verification actually run: `python C:/Users/nguye/AppData/Local/Temp/c3-execution-replay-final-check.py` exit0 verifies all frozen executable/runtime/runner/criteria/source hashes and68raw files, valid JSON/JSONL and57local links, with no historical/source diff. A separate secret-pattern scan reports0hits (not a universal guarantee). `git diff --check` exit0; remote CI remains separate.
