# Single-agent Checkpoint A development feasibility

Sources: [spec](../../../../docs/specs/c3-single-agent-commerce-architecture-20261004.md), [plan](../../../../tasks/plan.md). Owner authorized T1–T3 only. No live sends, mutations, migration, C3 removal, or T4 wiring.

Both base SHAs are `c4bd59857a560689ce0b10758a4927f6401b0c27`, freshly fetched before branching on 2026-10-05. Baseline is the existing main C3 path; PR377 source is not imported. Manifest substrate entries are exact Git blob identities at that SHA. Model/config values are frozen **intended** settings from the existing Vertex request, not provider observations. Null observed version/request/source fields deliberately prevent comparative claims. No GPT/Sol provider source from PR377 is substituted.

Inventory before adding a seam:

| Surface | Existing owner / reuse decision |
| --- | --- |
| Track C harness | `src/track-c-c3-v5-benchmark-{runner,evaluator,materialization,scoring}.ts`; reuse concepts, not simulation authority or stage-only scoring as whole-reply proof |
| Frozen fixtures | `evals/track-c-c2/dev70-realistic-r2/`; useful hypothesis examples, not sealed holdout or provider results |
| Typed claims | `packages/contracts/src/v2/canonical-evidence-readiness.ts`: `ProtectedClaimV1`, exact scope/provenance, `authorization: NONE` |
| Claim construction | `packages/business-tools/src/protected-claims.ts`: existing verified business envelopes -> claims |
| Protected authorization | `src/realtime-protected-claim-boundary.ts`: exact IDs, scope, expiry, declared types; no natural-language certificate |
| Code realization | `packages/business-tools/src/reply-assembler.ts`: verified fact blocks and advisory rejection; no policy paraphrase verifier |
| C3 candidate | `src/track-c-c3-two-pass-candidate.ts`, `track-c-offline-candidate-validation.ts`: advisory plan -> response segments; code attaches binding; typed effects forbidden |
| C3 production-contract guard | `src/track-c-c3-v5-benchmark-runner.ts`: per-segment `guardAgentProposal`, GENERAL gets no fact authority |
| Quality utilities | `src/track-c-quality-judge.ts`, `track-c-c3-v5-stage-judge.ts`: reusable provider/metrics infrastructure; stage judge is not this new full-reply rubric |
| Policy | existing `CustomerCarePolicyAdminContentV1` / runtime policy resolver; exchange/inspection not a `ProtectedClaimV1` category; minimal offline code-owned literal reference needed, no new taxonomy |

`corpus.json` contains 13 semantic cases (A3/B3/C4/D3) and 2 controls. All truth is a hypothetical frozen verified world, never live authority. Each case includes raw accepted history/latest input, frozen state, truth, required outcomes and forbidden claims/actions. Requirements are prose-independent except protected code-owned literals. C cases prove only egress understanding. There is no candidate-generated state persistence, trusted-reference resolution or dependent-tool ordering evidence here.

`CHECKPOINT_A_WHOLE_REPLY_DEV_V1` rubric/process:

- Review the **exact final customer-visible reply**, including free prose and every code-realized block. Record PASS/FAIL and supporting excerpts per dimension: understanding; completeness; context/correction use; factual/action safety; partial-answer behavior; usefulness/decision support; next step; coherence; repetition/contradiction; naturalness.
- For every explicit need in raw input/history, record its reply outcome or silent loss. Safe refusal can still fail quality when evidence permits an answer. Check all required/forbidden outcomes; at most one useful question where the case requires it.
- Development pass requires every semantic case to meet understanding/completeness/usefulness/coherence/naturalness and safety; no averaging away a failure or silent need loss. Controls are reported separately and cannot establish architecture success.
- Human review uses anonymous paired A/B final replies with order alternated by case. Ties remain ties; disagreement remains unresolved pending owner review. Neither delta nor preregistered improvement over C3 is a Checkpoint A requirement. No review is claimed before the reviewer scores actual replies.
- Intended execution: one attempt per lane/case, no retry, 60-second provider deadline. Keep ACCEPT/REJECT/FALLBACK/TIMEOUT/HANDOFF in denominator. Retain sanitized raw input/history/state/truth, exact request/provider result/identity, final assembled reply, guard and quality outcomes for every attempt. These synthetic cases contain no customer identifiers; never retain auth headers/secrets.

Static checks (not model evidence):

```text
node --test apps/worker/evals/single-agent-feasibility/protocol.test.mjs
node apps/worker/evals/single-agent-feasibility/protocol.mjs
```

T1 review: scenario contracts and counts inspected individually; paired fixture identity/config matches; hypothetical truth labeled; no runtime source or dependency changed. Static protocol RED initially failed because validator did not exist, then GREEN. Provider-observed comparative claims remain rejected.
