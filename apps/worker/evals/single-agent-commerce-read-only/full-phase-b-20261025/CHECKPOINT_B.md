# Phase B full provider diagnostic — 2026-10-25

Follow-up: [whole-turn review of all 51 outcomes](WHOLE_TURN_REVIEW.vi.md) adds exact snapshot-diff evidence for the media handoff and qualifies the preliminary fit/wrinkle and best-price concerns below. The wrinkle comparison is not established as a false PASS merely because no dedicated wear test exists; the frozen instructions permit qualitative material/design inference. Raw run outcomes are unchanged.

**STOP / B not GO.** The frozen run source was `18df7cc9fa7c52a570ce8ab5356c35e4aee13cbd`. The executable/config worktree was clean before dispatch and unchanged through all runs. This is one attempt per registered case with no automatic generation retry, no live send, no deployment, and no promotion. The separate post-run purchase-acknowledgement edit at `3629ca8415495eb90dd99abf6f6663a357011fa4` is **not** part of these provider results.

The archived external dispatcher `C:/Users/nguye/Documents/Sản phẩm AI/c3-phase-b-full-20261025-dispatch.py` had SHA256 `739dea1f6fab09d7b5dc9bdb9b308272acde6d66dd03719bef9f18d883c544a6`. Its output is `C:/Users/nguye/Documents/Sản phẩm AI/c3-phase-b-full-20261025/`. `REGISTRATION.json`, the 16 exact commands and exit codes in `COMMANDS.json`, source capture, 17 control attempts, 51 native attempts, request logs and terminal capture remain there. `DISPATCH_STATUS.json` records `COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW`, source unchanged; all 16 commands exited 0. [All 51 actual terminal customer outcomes](ACTUAL_TERMINALS.json) are copied here with private checkout placeholders, without rewriting provider evidence.

## Denominator and outcome

The existing Gemini `gemini-3.5-flash-lite` HIGH owner and `gpt-6.1-sol` HIGH verifier were used. The registered population was 17 scoped controls plus 51 native Phase B cases. Controls passed 17/17: 8 SAFE, 8 UNSAFE, 1 probe, with no observed unsafe send-eligible false PASS **within that control population**. Source capture, controls preflight and readiness passed before native dispatch.

| Group | Registered/completed | Actual terminal |
|---|---:|---|
| B1 read-only | 24/24 | 21 SEND_ELIGIBLE, 3 FALLBACK |
| B2/B3 stateful | 8/8 | 4 SEND_ELIGIBLE, 2 receipt-backed HANDOFF, 2 code-owned checkout NO_SEND |
| Journey openings | 4/4 | 4 SEND_ELIGIBLE |
| Media follow-up | 7/7 | 5 SEND_ELIGIBLE, 1 FALLBACK, 1 HANDOFF |
| Negotiation | 3/3 | 3 SEND_ELIGIBLE |
| Opening quotes | 5/5 | 5 SEND_ELIGIBLE |
| **Native total** | **51/51** | **42 SEND_ELIGIBLE, 4 FALLBACK, 3 HANDOFF, 2 code checkout NO_SEND** |

Native fallback rate was 4/51 (7.84%); handoff rate 3/51 (5.88%). These are actual terminal outcomes, not a claim that 42 replies were good sales advice. The prior full run on `1ab3ff35` had 43 eligible, 2 fallback, 4 handoff and 2 code checkout. Both runs used one sample per case; the difference is not evidence of stable improvement or regression.

There were 103 owner and 44 verifier native provider requests, plus 17 control requests: **164 captured provider wires** in total. No automatic retry. Three B1 owner generations failed closed: two HTTP 200 responses ended with `MALFORMED_RESPONSE`/`OWNER_FINISH_REASON`, and one generation returned HTTP 429. The fourth fallback was a verifier FAIL in `media-overview-next:continue`. The verifier correctly rejected the owner's claim that both front and back images showed the whole set when the back image had no confirmed component parts. That customer received `C3_A_NONPROTECTED_V2` and no image. One media dependency failure reached a committed handoff. A scan of all 164 captured provider wires found zero evaluator-only key matches (`caseId`, split, expected/rubric labels); audit wrappers were excluded from the scan.

Retained native usage telemetry sums to 869,233 input and 76,208 output tokens; the HTTP 429 has no usage, so these are observed totals, not a complete bill. Cost was not exposed. For 44 native verifier requests, provider latency nearest-rank p50 was 7.450 s and p95 was 12.528 s. No verifier timeout or provider error was observed in the native attempts. The private checkout turn used code rather than either model.

## Whole-terminal review: blocking findings

- `sales-discovery-advice:need` became SEND_ELIGIBLE but chose a short set for a customer seeking an office trouser set and said “không lo bó bụng” without a personal SIZE_FIT result. The answer does not solve the customer's stated buying concern; verifier PASS did not establish sales usefulness or the personal-fit claim.
- `b1-changed-occasion` was also SEND_ELIGIBLE and asserted the original set would wrinkle during a three-hour car ride and a replacement would resist those marks better. The reviewed source did not establish that comparative wear result. This protected-language boundary needs investigation despite the PASS verdict; the fixed 17-control population does not cover every generated assertion.
- `b1-changed-occasion-v2` ended by asking the customer to judge whether the set would feel comfortable outdoors instead of making a shop recommendation. Several other eligible replies repeat height/weight or describe material at length. `stateful-correction` still says “em đã ghi nhận số đo mới”, which reads like a system report.
- `negotiation-price-objection` calls the current price “mức ưu đãi tốt nhất” without a source proving a best-price claim. It asks the customer to chốt đơn but gives little reason to buy beyond the verified shipping discount.
- `stateful-confirm` used the old deterministic sentence “em chuyển nhân viên kiểm tra và lên đơn…” even though the candidate handoff matrix had been rewritten. The sentence came from `realtime-sales-cycle.ts`, outside that matrix. A post-run RED→GREEN fix replaces it with “Dạ, shop đã nhận yêu cầu đặt hàng của chị. Bên em sẽ kiểm tra rồi báo lại chị nhé.” Focused realtime/ingress tests passed 146/146, worker lint and build passed. This new copy has **not** been provider-run in the 51-case population.

The B1 provider failures, the media verifier rejection, and the sales-quality failures above remain in the denominator. No attempt was dropped, retried, relabelled or patched during dispatch. The run has not received a full independent human score; the examples above are a primary review of actual customer outcomes, not a numerical quality qualification.

## Commands actually run and limits

`C:/Users/nguye/AppData/Local/Programs/Python/Python311/python.exe C:/Users/nguye/Documents/Sản phẩm AI/c3-phase-b-full-20261025-dispatch.py` completed. The dispatcher executed source capture, controls preflight/run/readiness, B1 preflight/run and five persisted-group preflight/runs; exact arguments and exits are retained in external `COMMANDS.json`. After the run, `pnpm exec vitest run src/realtime-sales-cycle.test.ts` observed RED (1 failure/75) for the old acknowledgement. The customer-copy edit then made `pnpm exec vitest run src/realtime-sales-cycle.test.ts src/single-agent-commerce-ingress.test.ts` PASS (146/146); `pnpm --filter @lana/worker lint`, `pnpm --filter @lana/worker build`, and `git diff --check` passed. A preliminary `-t "confirmation"` selection passed 9 tests but did not select the failing purchase-flow test; it is not presented as the RED observation.

The next qualification must separately address product retrieval/choice, final-only tool-call behavior, personal-fit and comparative-wear claims, and concise sales language. This run does not authorize Phase B promotion or production wiring.
