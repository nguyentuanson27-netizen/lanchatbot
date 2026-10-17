# Phase B — bounded-source fix and full31 replay

**Recommendation: STOP for sales/live acceptance; source-backed checkout remains BLOCKED.** The independently reviewed code fix is implemented and this one full run is complete. A remains OWNER_BYPASS; no A2/A3 qualification, deployment, live send or Phase C follows.

Whole actual-outcome review: **21USABLE /7NEEDS_EDIT /3FALLBACK_OR_NO_SEND**, compared with21/6/4 in the preceding full31. The21 includes one silent ownership-only control; it is not21 sales replies or completed purchases. B1 improves17->18USABLE, while stateful drops4->3USABLE because two receipt replies confuse speaker roles. Overall usable count is unchanged.

## What was reviewed and changed

Read all31 baseline conversations and public context, then traces. One explicitly requested independent reviewer returned REVISE_PLAN: the proposed prompt wording repeated existing instructions, so it was removed. [Review](INDEPENDENT_REVIEW.md), [revised plan](PLAN.md), [scope](SCOPE.md), [implementation/actual commands](IMPLEMENTATION.md).

Only two code behaviors changed:

1. B owner HTTP body cap32768->65536bytes; explicit manifest/preflight/registration bounds, checked before auth/generation. Same3owner generations/2tool rounds/6calls/1verifier; latest/history/product/output/token bounds unchanged. Verifier and legacy comparison cap stay32768. Native signatures, IDs and parts stay intact.
2. Partial read_product with unavailable price/stock keeps the independent description/attributes/presentation/charts in its local function response even when identical to trusted.products. Complete reads/search dedup, changed historical values and native facts are preserved. No status/router/template/parser/rewrite/repair/reverify/new store or source write.

Owner/verifier prompts, tool declarations, models/config, cases, quality criteria, policy/size/state/effect/receipt/privacy/final-gate logic are unchanged. Structural delta: net4JS lines plus4manifest lines across the existing boundary/registration files;0runtime TS/shared-package changes,0semantic roles/layers/gates added. Tests add46net lines. Independent review is offline engineering review, not a third runtime role.

## Identity and frozen inputs

| Identity | Value |
| --- | --- |
| implementationBaseSha, freshly fetched main |296cdcfbf5759f5bf9cbb24acf3dc63005589361|
| Intake |7f20f3f2125c29a30c19622ac621497197e1df86|
| Reviewed scope savepoint |0ddfef5b|
| Code/verification source |3514691de093be5595881d1e250dff9e1248cab3|
| Clean runtime runSourceSha |487816d8c3f27299b62daaccca8bd861d81abee1|
| Raw before primary |17a74bf94ad0dd4d9a0f379e855c08b187be0079|
| Primary before trace diagnosis |50d8f8a43f10abe1586a1fa581af231148ee71c8|
| Owner |Vertex AI global /gemini-3.5-flash-lite, modelVersion gemini-3.5-flash-lite, HIGH|
| Verifier |GPT-6.1 Sol High /gpt-6.1-sol, existing CODEX_CHATGPT_LOGIN bounded relay|
| Owner prompt SHA256, unchanged |ee4377287c3c07ba232574e4542a4a5f1988e8ee8277506fb4d26f17bd8cd3a6|
| Verifier prompt SHA256, unchanged |b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24|
| Verdict schema SHA256, unchanged |76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97|
| Owner/verifier wire cap |65536 /32768bytes|

Exact models/generation settings, credential-launcher hash, all13input/executable hashes,5runtime hashes,6spec/plan blobs, corpus/native declaration hashes and terminal map/fallback identity are in [FROZEN_INPUTS.json](FROZEN_INPUTS.json). Owner8192output tokens/HIGH/includeThoughts=false; provider-default temperature/topP,1candidate,90s timeout/retry0. Verifier tools[]/tool_choice=none/store=false,90s timeout, one upstream request maximum per registered generation; no refresh/retry of a failed generation. CLI0.159.2 identity retained. No credentials committed.

Spec Git blobs: parent architecture7e0265e3b6b3d556d8fb0f3c7267abccef5de86a; verifier amendment4a09b55d2f3a972a65697738876cc5eab21e7a2b; B executiona452326d77e4493b88b02c0072cef808fecad2d8; approved B advisory boundary5a531cfeb03fcc20e178517a47f5be5a234e1593. Current plan/todo blobs are frozen separately.

## Complete population and actual outcomes

Exactly existing7ordered stateful outcomes, then24B1 priority cases, N1/max120generation invocations. No subset replacement, reseed, canary, automatic second run or post-result runtime change. Live public PostgreSQL/Redis/Qdrant reads; policy capture and stateful writes only in uniquely named disposable test DB. Both control and provider DBs dropped. Delivery only captured, never sent to real customers.

| Population | USABLE | NEEDS_EDIT | Unfinished |
| --- | ---: | ---: | ---: |
|24B1|18|5|1|
|7stateful|3 (one ownership-only)|2|2|
|31total|21|7|3|

Actual terminals: **27SEND_ELIGIBLE /1staticFALLBACK /2HANDOFF /1NO_SEND**. B1:23eligible/1fallback. Stateful:4exact captured eligible replies/2handoff/1no-send. Static fallback1/31=3.23% (B1 1/24=4.17%); handoff2/31=6.45%; no-send1/31=3.23%. Combined noneligible4/31=12.90% includes the successful ownership-only control, hence differs from the three unfinished primary outcomes.

Static fallback is unchanged C3_A_NONPROTECTED_V2: Phần này em chưa trả lời được, chị nhé. SHA256 cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2. Handoff uses the existing policy terminal; these two provider handoffs captured no holding message. NO_SEND has no customer text. No new fallback text/template added.

[All31 conversations and actual public state](CONVERSATIONS.md), [whole-outcome review](PRIMARY_REVIEW.md), [exact primary text/context/scores](PRIMARY_REVIEW.json). Ten0/1/2dimensions support reasons; no sums, keyword matching or ideal-answer matching. Same sales/usefulness/context/naturalness/safety criteria and approved subjective advice/upsell boundary as baseline. Human acceptance null. Primary was saved before rejected draft/verdict detail diagnosis.

## Findings, root cause and limits

1. **Observed32KB rejection corrected in code; new provider run did not exercise extra headroom.** Baseline third request33430 failed locally after a real cart commit. Tests now admit exact65536 and reject65537 before auth, preserving opaque signatures through captured HTTP. New largest dispatched request is29840, all below the old cap. Open still follows state+read ->add ->final; shorter opaque signatures contribute to smaller requests (2700 then3540characters in its continuations). No new local rejection occurred, but it would be wrong to credit this N1 result to the larger cap or claim all future bodies fit.
2. **Partial evidence reaches the owner at the point of use.** All three partial cases have identical available content in trusted and the native read result; each now does read_product ->FINAL, with no component search or NONE violation. Former B1slot5 fallback now gives the known skirt material/cut and admits price/stock unavailable. This confirms the projection and is consistent with the locality hypothesis; two code changes, N1 and live per-read data do not prove behavioral causality.
3. **Partial-source voice remains weak in all three cases.** They retain material/design facts but repeat catalog prose and describe the system/data connection. Slot19 adds a generic invitation unrelated to the unanswered price/stock. This is owner output quality; verifier correctly has no style-grading role. Source absence explains unknown price/stock, not the machine-like wording. Do not cure it with fabricated stock, a fake wait/handoff or a required CTA.
4. **Two cart ACKs confuse the speaker.** The cart/profile effects are correct and the first reply now discloses PRE_ORDER. But both replies say the customer has added/updated the cart, then address the same customer as chị. This is more than the acceptable minor administrative tone of the baseline variant reply. It is a new observed speaker/voice regression under the unchanged prompt, not evidence of a broken mutation or a missing product fact. Receipt text/context influences are a hypothesis; no causal isolation was run.
5. **Two concern replies remain too promotional or indecisive.** Slot3 still answers concern by praise and offers size selection outside B1 capability. Slot6 now acknowledges the real tradeoff with plain clothes and suggests separating the shirt, but buries its recommendation in three paragraphs and returns to praising both choices. That is a partial improvement, not a quality pass. Legitimate upsell at slot23 remains accepted; it explains extra outfit uses within budget, not lower cash spend.
6. **The sole fallback is the stage-light semantic boundary.** Rejected draft says the fabric will have a definite optical effect under strong lights, then gives an inner recommendation with absolute reassurance. Verifier returns FAIL/UNSUPPORTED_PROTECTED_ASSERTION on product:SV2447; this is neither timeout nor quota. The source has material/design but no optical test. Approved boundary allows ordinary risk, layering and reassurance; the enum does not identify the precise clause judged. Preserve FAIL and mark whole-meaning adjudication unresolved before any prospective verifier change. Do not change a verdict or create a word ban to rescue the result. [Exact draft/verdict and diagnosis](DIAGNOSIS.json).
7. **Policy/state/transaction basics remain useful.** Current policy questions use15days/30k instead of old7days/25k, without the previous tags-only approval phrase. Worn-to-work, worn briefly indoors and washed/cut-tag cases are rejected for their decisive situation, not because every reply must list all conditions. Time-scope answers are not treated as approval receipts. Four stateful turns preserve BE/Lx2, quote978100 and correction74/96; no fit invented for a customer-chosen size.
8. **Checkout is a source dependency, not a failed conversational answer.** Private code path still stops at PLANNER/CART_ETA_REGION_UNRESOLVED with zero model requests. Four duration regions exist; an approved address-to-region map does not. Confirm remains NO_SEND after ownership change. Source attributes/sizeCharts forSV2447 remain absent; no transfer drop was demonstrated. Do not guess mapping, claim employee service or publish facts within this experiment.

Five primary outcomes changed: stateful variant USABLE->NEEDS_EDIT; stage USABLE->fallback; partial skirt fallback->NEEDS_EDIT;10day policy NEEDS_EDIT->USABLE;9day policy fallback->USABLE. Both prompts/criteria unchanged. The old provider UNKNOWN finish and NONE violation did not recur; their root cause is not fixed or proven by this run. No receipt recovery was exercised, so preorder loss in generic recovery remains a known risk.

## Request, token and latency evidence

**88invocations =88generation HTTP200:60owner +28verifier.** These are model requests for31outcomes, not88cases.0unknown request accounting,0automatic retries,0provider errors/timeouts/quota/auth failures.28generated finals all submitted once to verifier;27PASS/1FAIL. All27eligible finals match exact verified draft/binding;4stateful captures match exact eligible text. No code ACK recovery substituted for a model final this run.

| Measurement | Observed |
| --- | --- |
| Verifier latency p50/p95, N28 |4.891 /7.200s|
| Added verification interval B1 p50/p95, N24 |5.441 /7.870s|
| Added verification interval stateful p50/p95, N4 |8.272 /9.358s|
| Whole B1 p50/p95, N24 |10.592 /14.718s|
| Whole stateful p50/p95, N7 |25.870 /44.208s|
| Owner input/output tokens, N60 |230404 /26085|
| Verifier input/output tokens, N28 |129034 /2112|
| Total input/output tokens, coverage88/88 |359438 /28197|
| Thinking breakdown (already in output) |23466owner /1425verifier|
| Cost |Not exposed; no estimate|

Owner token auth requests2; Codex auth count not separately exposed. Latencies are measured adapter/whole-turn intervals including source/DB/relay work, not a live SLA. No statistical latency or stability claim from N1.

[Audit](AUDIT.json):43raw/input disk-and-Git hashes,13frozen executable/input files,5runtime files,6reference blobs,60owner dispatch hashes,28exact verifier bindings/27eligible draft matches,35native model-part preservation occurrences;0observed evaluator-label/private-fixture leaks. Prepared/dispatched capture and tests, not independent provider-side echo. [Full request denominator](REQUEST_ACCOUNTING.json), [metrics](METRICS.json), [raw hashes](RAW_HASHES.json). No new A2 population was tested; no global semantic safety or A PASS claim.

## Verification and delivery

Observed focused behavior RED38PASS/4FAIL ->GREEN42PASS. Full canonical worker:1843VitestPASS/131files;496NodePASS/2existing optionalSKIP. Focused protected claim/reply/product/size tests52PASS. Worker typecheck/build/lint each exit0. COD25/25PASS/0provider generations/DBdropped; fresh public-source reads, existing source/config/stateful preflights; clean sealed source. No shared package changed. No remote CI or full repository pnpm check claimed.

Exact executed commands, the initial test syntax correction, first raw-copy helper path failure and offline reporting tools are recorded in IMPLEMENTATION.md. No failure removed or provider attempt repeated. Only reporting artifacts changed after the run-source seal; runtime/input hashes match.

Next direction after this completed run: make speaker roles explicit in a narrowly reviewed owner contract if changing voice, rather than adding another broad list of style bans; prepare source-backed structured product fields and approved region mapping through existing producers; adjudicate the complete stage-light reply against the already approved advisory boundary before changing verifier behavior. These are findings/proposals, not automatically executed follow-up rounds or permission for live source writes.

**Stop here.** Technical boundary checks are green; overall sales quality has not improved in usable count and checkout is still incomplete. No automatic extra generation, merge/deploy, live send or Phase C.
