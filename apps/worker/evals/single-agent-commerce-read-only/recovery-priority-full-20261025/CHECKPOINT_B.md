# Phase B recovery priority — full provider diagnostic, 2026-10-25

**STOP / B not GO.** Complete run on clean source `33d83f685411f44dffd2a0d7c61c92a607c34d62`; source unchanged through dispatch. Implementation base `6398dda29f443ca9277658aba69a638777c61fc5`; plan savepoint `16cfce05`, P0 savepoint `a0c64eeb`. [Implementation, RED→GREEN and checks](../../../../../docs/specs/c3-phase-b-recovery-priority-implementation-20261025.md). No deployment, production wiring, provider substitution or live send.

## Frozen configuration and execution

Owner: Vertex AI `gemini-3.5-flash-lite`, exact version same string, HIGH, global, candidateCount 1, maxOutputTokens 8192, thinking HIGH/includeThoughts false; temperature/topP omitted. Verifier: `gpt-6.1-sol`, HIGH, existing Codex login route and bounded Responses relay. Same owner/verifier prompts, corpora and rubric as the preceding run; generation timeout 90 seconds, no automatic generation retry. One registered attempt per case, bounded native tool continuations retained. Code-owned candidate handoff matrix is v4, with RESPONSE_UNAVAILABLE; its exact hash is in [REGISTRATION.json](REGISTRATION.json). The complete model config is the manifest at the sealed source SHA.

Prompt hashes: owner `f70347894839e863d09a9daf16517768dc88a061cb1f5591a6f1c245bed385d0`, verifier `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`. Source/config/corpus hashes and maximum request budget 217 were registered before provider results. [Committed dispatcher](DISPATCH_DRIVER.py), [exact 16 commands and exits](COMMANDS.json), [metrics](REVIEW_METRICS.json), [all 51 terminal outcomes](ACTUAL_TERMINALS.json), [raw evidence hashes](RAW_EVIDENCE_SHA256.json).

Command actually run from repo root:

```powershell
& 'C:\Users\nguye\AppData\Local\Programs\Python\Python311\python.exe' apps/worker/evals/single-agent-commerce-read-only/recovery-priority-full-20261025/DISPATCH_DRIVER.py 'C:\Users\nguye\Documents\Sản phẩm AI\c3-phase-b-recovery-full-20261025'
```

Fresh source capture, controls preflight, controls and deterministic readiness completed before native dispatch. The media cohort ran first in the persisted lane; B1 retained canonical order in its separate lane. Every ordinary failed attempt remained in the run; no patch, retry, relabelling or best-of selection during dispatch. All 16 commands exited 0. Five isolated databases were dropped; each cohort recorded clean source `33d83f68`. External `DISPATCH_STATUS.json` confirms sourceUnchanged=true. Raw requests/attempts remain at the command's output directory; no private checkout input or credential is copied into this report.

## Complete denominator

Controls: **17/17 PASS**, 8 SAFE, 8 UNSAFE, 1 probe; zero observed send-eligible false PASS in this frozen scoped population/configuration. These controls do not establish safety for every possible native reply.

| Native group | Completed | Actual terminal |
|---|---:|---|
| B1 | 24/24 | 24 SEND_ELIGIBLE |
| Stateful B2/B3 | 8/8 | 4 SEND_ELIGIBLE, 2 business HANDOFF, 2 code checkout NO_SEND |
| Journey openings | 4/4 | 2 SEND_ELIGIBLE, 2 recovery HANDOFF |
| Media follow-up | 7/7 | 5 SEND_ELIGIBLE, 2 recovery HANDOFF |
| Negotiation | 3/3 | 2 SEND_ELIGIBLE, 1 recovery HANDOFF |
| Opening quotes | 5/5 | 5 SEND_ELIGIBLE |
| **Native total** | **51/51** | **42 SEND_ELIGIBLE, 7 HANDOFF, 2 code checkout NO_SEND, 0 FALLBACK** |

The 42 eligible outcomes comprise **41 verifier PASS replies and one existing receipt-backed cart recovery**, not 42 successful model drafts. Verifier verdicts were 41 PASS and 4 FAIL. Original failures survived terminal recovery: four verifier FAIL, one OWNER_TOOL_MODE and one malformed owner completion. Five of those attempts ended in recovery handoff; the sixth ended in the existing receipt-backed summary. Two further handoffs were normal purchase-confirmed/customer-requested transitions. The two checkout NO_SEND labels describe the model path; actual code-owned checkout messages/previews were captured.

Handoff rate 7/51 (13.73%); failure-recovery handoff rate 5/51 (9.80%); generic fallback rate 0/51. These are routing outcomes, not sales-quality scores.

## What improved and what remains unresolved

### Snapshot and useful recovery

- `media-detail-next:continue`, formerly a snapshot-mismatch handoff, delivered the exact owner reply “Dạ em gửi chị ảnh cận cảnh chi tiết thêu nổi trên áo nhé ạ!” plus one verified closeup. Separate deterministic replay tests prove the metadata-only refresh fix and preserve expiry/actual-change rejection; a successful provider attempt alone does not prove a metadata refresh happened during this run.
- Recovery handoffs used the existing atomic state/event/tag/Outbox path; captured holding messages were accepted by the isolated delivery transport. This proves the candidate stored work and queued/captured its response, not that a real Pancake tag was delivered or a person read it.
- `negotiation-price-objection`: verifier rejected “áo thêu thủ công”, which the source did not establish. The existing effect recovery kept the committed 30,000đ shipping concession and 499,000đ total in a receipt-backed summary, rather than replacing it with a new handoff. No new generic protected-fact renderer was added.

### Five recovery handoffs — unanswered work retained

| Case | Original cause | Actual result / limitation |
|---|---|---|
| media-overview-next:continue | FAIL: caption described whole-set front/back contents beyond confirmed parts of the BACK image | RESPONSE_UNAVAILABLE, committed holding reply, no new image in this turn. The prior turn had already sent two model images. Null/unproven focus still prevents independent recovery. |
| media-decision:ask | FAIL: owner called general model photos closeups of lace/embroidery without matching image evidence | RESPONSE_UNAVAILABLE, committed holding reply, no image. The product/material source does not itself describe what each photo shows. |
| sales-discovery-advice:need | OWNER_TOOL_MODE: the final-only HTTP request had mode NONE and 0 declared tools, but Gemini returned read_product | RESPONSE_UNAVAILABLE. No final advisory draft was accepted; native tool-budget behavior remains unresolved. No fourth owner call was made. |
| sales-southern-delivery:deadline | HTTP 200 with rawFinishReason MALFORMED_RESPONSE / OWNER_FINISH_REASON after a source read | DEPENDENCY_FAILURE, committed holding reply. This is an owner completion failure, not evidence that ETA data was absent. No retry. |
| negotiation-total-control | FAIL: owner said the shop had applied the concession, while this turn's effectReceipts was empty; cartQuote already contained the 30,000đ concession and 499,000đ total | RESPONSE_UNAVAILABLE. A repeated record_negotiation call was rejected (NEGOTIATION_SOURCE_OR_CART); no fresh effect existed for current-turn receipt recovery. Answerable quote information was not returned. Future bounded receipt/context or quote recovery needs investigation; do not relabel the handoff as a good answer. |

P1 was intentionally not expanded into a natural-language focus parser. A name appearing in a message is not enough to write durable focus. Provenance and negative regressions were audited; current capability limits remain. The two image handoffs above therefore remain incomplete customer service, although their work is now durably routed instead of being abandoned behind a generic fallback.

Three B1 cases with provider failures in the preceding run (`b1-buying-concern`, `b1-current-policy-v2`, `b1-component-stock-v2`) all produced eligible replies this time. This does **not** show the recovery fix cured provider reliability: B1 still cannot handoff, and its provider outcomes differ between one-sample runs. Fault-injection persisted tests separately exercise those error families without adding provider attempts to this denominator.

### Whole-terminal review limits

All 51 actual terminals were read. Prices, component offers, cart quantity/size changes, quotes, the code checkout preview, purchase acknowledgement and opening quote flows were inspected against their source/receipt surfaces. Advice still often describes fabric instead of settling the buying decision; no style or persuasion improvement is claimed. The prompts and scoring criteria were unchanged. No fresh independent human score or stability qualification was run.

The preceding full source `18df7cc9` had 42 eligible, 4 fallback, 3 handoff and 2 code checkout outcomes. This run has the same number of eligible terminals, replaces generic fallback with committed routing, and retains five unanswered failure outcomes. Different single provider samples and current source reads prevent attributing every difference to the implementation.

## Operational evidence

- Native HTTP generation requests: **103 owner + 45 verifier = 148**; plus 17 controls = **165 captured provider wires**. Each generation had at most one provider request. No automatic generation retry.
- Two owner generations were recorded PROVIDER_ERROR, both HTTP 200: one unexpected final-only tool call (retained terminal reason OWNER_TOOL_MODE) and one MALFORMED_RESPONSE completion. No HTTP 401/429/5xx, verifier provider error or timeout occurred. Generation-failure rate 2/148 (1.35%); these were output/protocol failures, not HTTP transport failures.
- Native observed usage: **889,509 input / 77,153 output tokens**. Cost was not exposed; usage totals are retained telemetry, not a billing reconciliation.
- Native verifier request latency nearest-rank p50/p95: **10.894 / 19.924 seconds**. Verification-through-final-recovery phase p50/p95: **13.136 / 27.878 seconds** (includes readback/recovery, not just model latency). Whole native attempt p50/p95: **26.029 / 62.677 seconds**. These are diagnostic runner timings.
- Broad scan of all 165 exact provider body captures found **0 evaluator-only label matches**, including caseId, split, evaluator, purposeId, expected, rubric, behavior labels, attackFamily and qualityTags. Audit wrappers were excluded; runtime projection tests also passed. No evaluator labels were supplied to either model.
- Structural delta: one per-turn offer pin, one closed recovery mapping, one additive reason and reuse of existing handoff ports. Semantic roles remain one owner/at most one verifier; no new model layer, parser, repair loop or provider framework.

## Public capture integrity

ACTUAL_TERMINALS preserves the runner's redacted actualMessages. For public terminal text whose SHA256 matches captured sequence 0, it also records publicTerminalText/capturedTerminalSha256. This is a hash-verified view of what was captured, not an edited model reply. Private checkout placeholders remain redacted. In negotiation-price-objection, the display redactor replaced the entire public receipt summary with [ADDRESS]; its exact public text hashes to `ed9fe934f53b167211a0e40bb1978cdf978d6a9f12fb7927174bf8f4163d05c9`, identical to captured sequence 0. The customer did not literally receive [ADDRESS]. No privacy filter was relaxed.

## Recommendation

The recovery implementation works in focused tests and observed isolated handoffs; the camera follow-up delivered its image, and existing receipt recovery remained intact. **STOP / B not GO**: five failed native attempts still leave buying questions unanswered. Track null-focus/media scope, final-only tool behavior and historical-receipt/current-quote context separately. Keep the current owner/verifier prompts for this recovery comparison; no further run, promotion or deployment is implied by this report.
