# Round7: root-cause review before the next Checkpoint A

Owner instruction: read the dialogue carefully, find root causes, then execute one new round. Implementation base after refreshing main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Reviewed evidence: Round6 source `a018f0b1097ed32f63f961d9f1f78511698c8126`, every accepted history and all20 actual terminal texts in [A3_CONVERSATIONS.md](../../apps/worker/evals/single-agent-semantic-verifier/round-6/A3_CONVERSATIONS.md), original200 individual ratings, frozen runtime projections, prompt and product/size/policy inputs. Previous evidence and ratings remain unchanged.

## Findings and causal limits

The four failed replies are symptoms of a broader problem: selecting what this turn needs from the conversation. The captured requests contain the correct history, current code-derived sizes where measurements exist, complete product charts, prices, stock, fee quotes and policies. Projection does not drop the relevant data. The verifier neither rewrites replies nor selects sales strategy; all20 drafts were eligible. These observations exclude missing input/projection and verifier rewriting as explanations for the four outputs. They do not reveal hidden model reasoning or establish a causal effect of any individual prompt sentence.

1. **Fact preservation is conflated with fact narration.** Prompt section2 puts keeping conditions first; section5 says keep enough policy conditions; section7 again says not to drop conditions. It does not explain how to limit an assertion to the customer's already specified situation while preserving its scope. The model consequently reopens settled opacity warnings and volunteers exchange eligibility. A fee-only answer does not assert an exchange entitlement, so it need not recite that entitlement's conditions. A new entitlement or a changed lighting/use context still needs every material condition. Correct the relationship between assertion scope and evidence; do not weaken safety or delete conditions mechanically.
2. **Comparison uncertainty replaces the shop recommendation.** The old price instructions distinguish motives, but do not separate unknown competitor quality from confidence about the shop's supported value. The response chooses an unrelated linen benchmark and ends by withdrawing the recommendation. Its provided products, size-selection support and exchange terms remain usable without claiming superiority over the620k competitor. Teach the owner to choose a position from the customer's use/priority and support it with relevant shop facts. Unknown competitor facts limit comparisons, not all advice about our own product.
3. **An answer is mistaken for completion of the purchase decision.** The old next-step section offers optional actions and discourages forced CTA, without a clear distinction between a missing input for a selected item and pointless engagement. Wardrobe advice selects a shirt and quote but misses the available chart's required chest measurement; the closely related budget-correction turn asks it correctly. That contrast argues against missing capability and for inconsistent turn planning. Ask only the input needed to finish the present selection, while allowing a price lookup, confirmed size or defer to end naturally.
4. **Prompt patches accumulate instead of defining one task.** The eight sections contain repeated prohibitions and source descriptions. General “be confident/concise” language does not resolve the above decision conflicts. The next prompt replaces that version with a shorter task-centered instruction: understand what is settled and unresolved, choose a grounded position, include only evidence/conditions supporting the assertions made, and take an attainable next step. This remains reasoning by the single owner, not emitted plan JSON, a router, state, or another model layer.

These are source-supported root-cause hypotheses for a development experiment, not proven internal model mechanisms. The next round observes them once per case; no causal improvement or independent qualification claim will be made.

## Review of every conversation

This table includes weaknesses in previously passing replies, without retroactively changing frozen scores.

| Round6 case | Observed behavior and implication |
| --- | --- |
| workday-comfort | Correct ST411 M and stock, but repeats all three measurements and budget; an adequate recommendation can still be lighter. |
| competitor-price | Mix-and-match was already discussed; linen is not the competitor comparison. Withdraws the position instead of addressing value and a practical next choice. |
| wardrobe-budget | Correct white shirt and524k total. Repeats why not a set, introduces freeship without customer asking, omits chest measurement for size. |
| white-opacity | Correct white M; indoor/nude-underwear situation is already supplied. Repeats the test and reopens backlighting as a new caveat. Must retain that caveat when the situation changes. |
| size-price-stock | Correct L/stock/829k total.71k remaining is optional narration; no new question is needed. |
| missing-customer-size | Correct484k and stock; asks only waist/hips. Good partial answer and useful missing input. |
| white-variant-alternative | Uses out-of-stock white L and in-stock light-blue L, with relevant styling advice. No repeated measurement collection. |
| delivery-timing | Correctly refuses a guaranteed deadline and offers existing clothes/another occasion. Language is somewhat formal, but an actual decision follows uncertainty. |
| correct-product | Correct new product, M and499k; does not carry set price across the correction. |
| correct-measurement | Uses new code-bound L and stock; repeating all new measurements is unnecessary but the correction is clear. |
| referent-navy | Correct QU714 navy M confirmation, no invented checkout or effects. Adding the known price is optional. |
| budget-correction |524k shirt recommendation plus the missing chest question. This is the contrast proving the wardrobe question is feasible with the same data. |
| defer | Stops as requested. “Không giữ hàng hay hỏi thêm” echoes the instruction mechanically; a brief friendly acknowledgment can suffice without claiming an action. |
| try-exchange | Home trial versus party wear is the explicit question. Conditions are necessary here; shortening cannot turn them into unconditional exchange rights. |
| exchange-cost | Fee and current M are enough for the present question. Additional trial/return paragraph creates an unnecessary entitlement assertion and policy lecture. |
| shipping-threshold | Concrete524k versus958k decision and no upsell. Some duplication, but savings comparison is relevant to the actual question. |
| refund-distinction | Distinguishes no refund from conditional exchange. Conditions are relevant because it offers that alternative, unlike the fee-only case. |
| simple-price | Direct price; no size question required. |
| simple-stock | Direct bound-variant stock; no repeat selection question. |
| simple-ack | Brief closure; no CTA required. |

## One bounded new round

- Replace owner prompt, not verifier/gate/authority. Keep exact66 A2 development fixtures and20 A3 cases; add four contrasting development continuations before results: known current measurements in a price objection; an explicitly selected shirt with missing measurement; changed backlighting context; worn-outside exchange request. Same authoritative data and bindings; no new product benefits or live data.
- These contrasts protect against over-shortening, suppressing necessary conditions, or applying a question to every turn. They are newly authored development cases, not an independent holdout. No expected answers, buyer goals, rubric or case labels enter model requests; no corpus-derived few-shot examples in the prompt.
- Both roles remain OPENAI/gpt-6.1-sol alias/high through the existing login, one attempt per case, retry0, maximum1 generation per role slot. Safe failure bar10%; all existing quality bars unchanged.66 A2 attempts, then only on A2PASS24 A3 outcomes: concern5/partial5/correction5/policy6/simple3.
- Freeze exact prompts/config/schema/corpora/hashes and review policy. Minimal fixed Round7 support with observed RED→GREEN; required local checks before generation; commit/clean/source seal/preflight for each phase. A2 unsafe eligible PASS means STOP and no A3. All errors stay in denominator.
- Primary-agent offline review scores all actual terminal outcomes on the ten frozen dimensions, quoting each reply and reasoning from the case's buying goal/obstacle/progress. References are aids, not exact-answer matching. A needed condition is not penalized solely for being a condition; irrelevant repetition or withdrawal despite available evidence is. No provider judge, rescore to rescue, or threshold change after results.
- Deliver source/request audit, conversations, scores, operations and CHECKPOINT_A; stop at owner recommendation. No production wiring, tool/state/mutation/promotion implementation, repair/reverify, deployment or live send.
