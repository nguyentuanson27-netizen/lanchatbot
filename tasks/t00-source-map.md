# T00 — source and ownership map (24 September 2026)

## Source pin

- Implementation starting HEAD: `92ef9c5dff1e6508fdd4278459c3efe7a0937046` on `codex/c3-runtime-canonical-integration`.
- `88a1ce4` is an ancestor of that HEAD. `origin/main` and merge base at inspection: `a28bd12a8b15c4bbf65914c52236adac4ac41594`. Local `main` was older (`1c64f177689efcc461382cbc54018c64d21e94d0`); do not use it as the PR base without fetching.
- Frozen C2 rubric content SHA-256: `54437743f5e135f123e17c0de5a71fa5061c6eb54782defdd7bb3f70bd4aabf5`; manifest Git blob SHA-1: `4a06598f1d0cab43fa539a6ecc38fc23aaa22cc5`. The benchmark validator passed at this source pin. No rubric edit is authorized by this map.
- The pre-existing uncommitted `plan.md`, `todo.md`, review and handoff are user material. Keep them in the working tree and include deliberately at handoff.

## Owner and call path

| Decision or data | Producer and timing | Consumer and final authority |
| --- | --- | --- |
| Admission, human ownership, blocking tag | `RealtimeRunner.processOne` preflight, conversation event/reducer | Runner short circuit before model or SalesCycle; an existing HUMAN owner cannot be resumed by model text |
| Current customer's buying request | Inbound text plus `AgentSalesSignalsV1.buyingIntent` from the existing proposal call, reconciled by `buildCanonicalDecisionEvidenceV1` | SalesCycle checks committed action, product, state, readiness, CAS; the C3 six fields do not authorize cart mutation |
| Recipient details and payment | Raw current inbound handled inside the private SalesCycle boundary; local parser and source-bound model evidence | `CHECKOUT_DETAILS_CAPTURED`, revalidation and preview; model dialogue and analytics receive redacted text/presence only |
| Verified commercial data | Product/POS and policy adapters, canonical claim producers, fresh cart readback | Selectable evidence, guard, SalesCycle readiness and transaction readback |
| Adaptive conversational choice | C3 Strategist six-field decision when its existing gate admits the turn | C3 compiler and Responder; existing legacy/SalesCycle paths still own some replies, so single-owner migration is **not yet complete** |
| Customer-facing reply/effect | Responder or fixed first-contact policy, then final guard and atomic state/Outbox commit | Delivery group gate; external effect claims need their own receipt |

The baseline runtime still has a proposal generation call before C3. A normal adaptive turn can therefore involve proposal, Strategist and Responder calls. The benchmark lane call count is not the total runtime call count. T11 must measure this via runtime traces and remove redundant decisions only after the replacement path has equivalent authority evidence. C3 input uses the state at the time of decision, including valid same-turn SalesCycle transitions, while commit still checks revision/fence.

## Requirement trace

| Finding | Spec/contract | Current producer → consumer | Owning task and required proof |
| --- | --- | --- | --- |
| F01 routing/payment | C3 §6c, §8; post-sale ownership rules | Inbound event and checkout parser → reducer/SalesCycle | T02/T04: negation, question versus choice, open cart versus existing order via `processOne` |
| F02 fabricated details | C3 §6c; checkout evidence contract | Proposal extraction → private checkout capture | T03: source-value and recipient-role negatives, no preview |
| F03 redacted extraction | C3 §6b, appendix PII boundary | Raw inbound local parser; redacted model context → SalesCycle | T03: natural unlabelled and labelled capture, raw PII absence at model boundary |
| F04 divided strategy | C3 §2–5, runtime appendix | Legacy/proposal/SalesCycle and C3 → final reply | T11a/T11b: stateful call/decision trace and one chosen reply on converted branches |
| F05 cart/search capability | C3 §3, §6b and §6d | Canonical buying intent, POS/search → kernel/C3 | T05/T08: actual variant mutation and alternative search with binding |
| F06 preferences/context | C3 §2, §6b | Profile/history → model context | T09: correction and long-history journeys |
| F07 accepted history | C3 §6b, delivery invariant | Accepted Outbox → canonical/Redis history | T10: fault/recovery without resend |
| F08 factual wording | C3 §6, 24 September follow-up | Selected evidence → Responder/guard | T06/T07/T12: typed provenance and bounded editorial regression |
| F09 eval gap | C3 §9, §11; C2 rubric | Benchmark and runtime harness → report | T01/T15: frozen70 separate from stateful journeys, full Luna transcripts |
| F10 MCP allowlist | MCP OAuth membership | Configured users → token verifier | T14: empty list denied with positive control |

## Compatibility and amendments

The r31.3 and r32.2 boundaries remain the comparison baseline. This work intentionally changes the handling of negated handoff, open-cart edits, payment questions and source-bound checkout capture; those are new deviations and are not inherited from the old D1–D6 list. First-contact quote, verified fact/media preservation, human ownership, group delivery gate and malformed-model fallback remain required. T05 variant editing, T08 search/comparison, T09 memory, T10 history recovery and T12 broader factual realization require their own code and spec diff before claiming support. No live flag or authority mode changes are part of this task.
