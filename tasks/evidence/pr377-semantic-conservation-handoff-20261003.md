# PR377 semantic conservation — Agent 2 handoff

## Source identity and scope

- PR: https://github.com/nguyentuanson27-netizen/lanchatbot/pull/377 (DRAFT).
- Remote branch: `feat/pr375-sales-implementation-20260929`.
- Local branch: `fix/pr377-obligation-lanes-20261002`.
- Initial exact remote/local HEAD: `88fef8b5ee37c5958e03b4da4305a944f71301f6`.
- Initial parent: `cf5dfa7f583ebd0b0cd6b4c66b788e8494570a66`.
- Integration base: `7c1f10f2a27db2b6258581f21955d1bc62681821`, branch `codex/c3-runtime-canonical-integration`.
- Tested implementation HEAD: `9fe0f17858e34f1d486b7036f55f38f34cfc4e2e`.
- Implementation parent: `7df9bd94b57568b361e87037360c644de38a106c`.
- This handoff is the only subsequent documentation change. Final pushed HEAD,
  its parent, drift readback, and exact-head CI are recorded in the accompanying
  `Agent-2-final-handoff.md` outside the repository, avoiding a self-referential
  commit hash. Use `git rev-parse HEAD HEAD^` for the checked-out document commit.
- Working source: `C:\Users\nguye\Documents\Sản phẩm AI\lanchatbot-pr377-obligation-lanes-20261002`.
- Logs/readbacks: sibling directory `pr377-semantic-evidence-20261003`.

All implementation commits descend from the initial HEAD. The remote remained
at that exact HEAD through the final pre-push readback; no reset, force push,
merge, deployment, or live traffic is part of this task.

Changed implementation files relative to the initial HEAD:

```text
apps/worker/src/realtime-customer-input.ts
apps/worker/src/realtime-runner.ts
apps/worker/src/track-c-c3-benchmark-parity.test.ts
apps/worker/src/track-c-c3-benchmark-parity.ts
apps/worker/src/track-c-c3-conversational-guard.ts
apps/worker/src/track-c-c3-obligation-families.test.ts
apps/worker/src/track-c-c3-obligation-resolution.ts
apps/worker/src/track-c-c3-semantic-conservation.test.ts
apps/worker/src/track-c-c3-semantic-handoff.test.ts
apps/worker/src/track-c-c3-strategy-contract-runner.ts
apps/worker/src/track-c-c3-strategy-contract.ts
apps/worker/src/track-c-c3-total-coverage-guard.test.ts
apps/worker/src/track-c-c3-v5-benchmark-runner.ts
packages/contracts/src/index.ts
```

The sole documentation addition is this file.

## Incremental implementation

| Slice | Commit | Owning change |
|---|---|---|
| D1 | `bad6c50d` | Code-owned obligation IDs and shared source-to-request mapping; live Q052 plumbing. |
| D2 | `9f065d83` | Complete evidence selection from current obligations; total typed outcomes and independent subjects/scopes. |
| D3 | `52f4a64f` | Mandatory outcome realization, two-way final coverage, and source qualifier validation. |
| D4 | `7df9bd94` | Producer-inclusive and frozen full typed benchmark entry points. |
| Regression corrections | `9fe0f178` | Pending checkout, policy scopes, prior rejected subject, ambiguous references, and corresponding controls. |

The first Q052 RED preceded production changes. Its owning live-path control
was GREEN before any Responder payload extension or real-model evaluation.
Producer instructions were not prompt-tuned. The six public Strategist fields
remain `replyAct`, `goal`, `proposition`, `evidenceRefs`, `continuation`, and
`canonicalAction`. No new online model role was introduced.

## Findings, causes, and RED/GREEN evidence

| Symptom | Root cause / owner | RED control | Fix / GREEN evidence |
|---|---|---|---|
| Q052 loses wrinkle after PRICE focus | Runner discarded request identity; compiler selected evidence defined completeness | Original five Q052 controls failed on the initial source; D2 controls still failed after D1 | Preserve IDs and compile PRICE ANSWERED plus WRINKLE BOUNDED_UNAVAILABLE; live final reply and both metadata goal variants pass. |
| First contact loses current color need | Fixed task did not accept current obligations | Family controls failed before obligation-aware fixed compilation | Fixed lane compiles the same obligations, completes color evidence, and does not ask for an already requested color. |
| Split stock, deadline, comparison, and criteria collapse | Producer schema/request metadata lacked qualified subjects and relation operands | Family suite initially 14 failures / 6 passes, then 10 failures / 12 passes as controls expanded | Typed component/size/color/criteria/deadline/related-product survive; final family suite 22/22. |
| Wrong proposition creates false Q053 limitation | Semantic goal derived LIMIT from proposition instead of typed results | Supported design-attribute control | WAIST_CONSTRUCTION and SILHOUETTE map actual attribute projections independently; both ANSWERED, no false limit. |
| Missing/surplus/tampered coverage accepted | Optional resolution envelope and incomplete final readback | Missing, duplicate, unknown, and promoted-outcome controls | Recompute code-owned coverage, compare exact IDs/subjects/status/outcome/evidence/relation, and require matching final segments. Guard suite 14/14. |
| Unsupported uncertainty could hide an effect | Final GENERAL egress lacked the existing draft effect check | Uncertainty-versus-effect and negative-fact controls | Reuse the existing bounded no-effect check at final egress; exempt only exact validated code outcome text. |
| Benchmark omitted Producer or froze partial/mutable context | Historical fact snapshots were not a semantic boundary | New parity module initially absent; async source mutation control failed before source freezing | Full typed snapshots and preferred Producer path use the shared live runner; final parity suite 9/9. |
| Full suite loses checkout request after valid fact completion | Previous rejected selection had accidentally triggered checkout recovery | Existing `realtime-c3-deterministic.test.ts` checkout control failed during first full run | Validate the original model decision, then derive only the already-permitted missing checkout request from canonical state. Existing deterministic runtime suite 34/34. |
| Referential rejection targets new alternative | Runner/resolver used post-search binding for non-fact rejection | Live old-subject rejection control; benchmark prior-subject RED expected CB182 but received SQ9012 | Carry pre-delta canonical subject explicitly; new alternative and rejected old product remain distinct in state, task, and final reply. |
| Ambiguous request becomes arbitrary first-product answer | Runner fallback overrode the shared mapper's null subject | `multi-product referential` RED received CB182 instead of null | Remove duplicate fallback; live task retains null and bounded outcome. |
| Source size/deadline/criteria could be fabricated | New optional qualifiers initially only schema-validated | Fabricated qualifier controls | Validate qualifiers against the exact source span before assigning code identity; preserve existing source/PII boundary. |

The first workspace run had four failures: two newly added policy controls were
still RED, one existing checkout regression, and one old test expecting missing
selected evidence to be rejected. The latter now checks correct compiler
completion while retaining its unrelated-evidence rejection and absent-wrinkle
negative control. No tests were deleted or newly skipped. An initial D3
test-fixture type error was found after that slice commit and corrected in the
regression commit; the final candidate's typecheck/build pass.

## Semantic regression matrix

Counts below describe deterministic scripted/typed fixtures, not Producer
recall on arbitrary customer language or model quality on DEV70.

| Family / control | Obligations in | Outcomes out | Outcome / separation proved | Silent drops | Wrong mappings | Unsupported promotions |
|---|---:|---:|---|---:|---:|---:|
| Q052 price + unsupported wrinkle | 2 | 2 | ANSWERED + BOUNDED_UNAVAILABLE, even PRICE-only focus | 0 | 0 | 0 |
| First contact price + color | 2 | 2 | Both ANSWERED with respective refs; same fixed path | 0 | 0 | 0 |
| Conditional customer offer | 1 | 1 | BOUNDED_UNAVAILABLE; shop PRICE cannot authorize offer | 0 | 0 | 0 |
| Top S + bottom M stock | 2 | 2 | Independent component/size refs; absent sibling remains bounded | 0 | 0 | 0 |
| Reject + shape/avoid/budget search | 2 | 2 | ACTIONED acknowledgement + BOUNDED_UNAVAILABLE search; budget stays canonical state | 0 | 0 | 0 |
| Q053 waist + silhouette | 2 | 2 | Both ANSWERED from actual attribute projection, different proposition allowed | 0 | 0 | 0 |
| ETA + deadline relation | 2 | 2 | ETA and code-derived conditional deadline distinct; max 4/6 versus deadline 5 | 0 | 0 | 0 |
| Two prices + cheaper comparison | 3 | 3 | Independent price refs and exact-pair derived comparison; wrong pair rejected | 0 | 0 | 0 |
| Q086 policy + component stock + retail + set availability | 6 | 6 | Five supported parts; retail cannot prove whole-set availability | 0 | 0 | 0 |
| Conditional split/set purchase through live runner | 4 | 4 | Policy, TOP S, BOTTOM M, FULL_SET retained; absent projections bounded, no cart | 0 | 0 | 0 |
| Fit needs canonical missing measurements | 1 | 1 | ASK_REQUIRED_INPUT and correct MEASUREMENTS clarification | 0 | 0 | 0 |
| Two-product unresolved referent through live runner | 1 | 1 | Null subject stays null; BOUNDED_UNAVAILABLE | 0 | 0 | 0 |
| Rejected prior product + new alternative in benchmark | 2 | 2 | Old product ACTIONED; constrained search bounded; no false rejection of new item | 0 | 0 | 0 |

Existing semantic/projection/price-comparison/runtime suites retain the negative
pairs: wrinkle versus smoothness, cheaper versus lighter/superiority, customer
size versus fit, locality versus address, referent versus fact, customer price
versus shop price, missing evidence versus negative fact, and uncertainty versus
dispatch/cart effects. Scripted runtime controls assert no unauthorized cart
mutation and reuse existing duplicate/stale-effect fences. These passing
controls do not certify arbitrary Vietnamese prose.

## Architecture and bounded limitations

The existing customer-input mapper owns IDs and qualified requests. Strategist
still chooses focus/action within code permissions. The existing compiler
validates model selection first and deterministically completes only matching,
realizable, source-bound evidence. `trackCResolveObligations` owns one explicit
outcome per request. Typed results, rather than goal prose, own completeness.
The legacy Responder draft is retained; code assembles mandatory claim/outcome
segments, and the existing final guard requires their readback against typed
coverage. Recovery retains the already-compiled task and independent outcomes.

`runTrackCProducerBenchmarkCase` runs Producer, freezes full typed input and
canonical prior subject/customer state, performs supplied deterministic lookup,
then calls `runTrackCStrategyLive`. `runTrackCFrozenProducerBenchmarkCase`
requires the same full snapshot and revalidates it. Expected answers are never
forwarded to model context. Lookup must return exactly the frozen binding.
The result uses the existing V5 scorer-compatible candidate envelope and
declares evaluation-only/side-effects-disabled execution.

Historical DEV70 fact-only fixtures and CLI runs remain legacy evidence, not
Producer parity. A new acceptance run must use these Producer/full-snapshot
entry points; no historical artifact has been overwritten or reclassified.
The new entry points have deterministic tests but no real-model DEV70 corpus
run yet. Benchmark and live runtime share semantic mapping/compiler/Responder/
guard, while benchmark business lookup is scripted and has no durable commit.

Shape/avoid-constrained search remains explicitly unavailable until evidence
proves those criteria for the candidate. Component and split/alteration policy
requests also remain bounded when live business projections omit those typed
facts. Product discovery, price, generic stock, or exchange policy are not
promoted as substitutes. Source deadline qualifiers currently require numeric
tokens in the source span; spelled-out or inferred deadlines are rejected for
recovery rather than guessed. Legacy customer-input without `obligations` keeps
its existing compatibility path and is refused by the new parity entry points.
Conservation proves identified requests survive; real Producer extraction recall
is still an unmeasured model acceptance boundary.

## Self-review, in requested order

1. Correctness: reviewed the complete increment against the initial HEAD;
   fixed both ambiguous and prior-subject counterexamples, canonical checkout
   recovery, and false proposition limitations. Count/unique-ID coverage is
   recomputed at final egress. No unknown/duplicate resolution is accepted.
2. Security: no evidence authority, cart permission, claim hash, freshness,
   binding, PII, CAS, or effect fence was relaxed. New free-text qualifiers use
   existing safe-text projection; effects still require canonical code action.
   Comparison and deadline arithmetic remain code-owned.
3. Architecture: extended existing obligation/resolution/compiler/guard functions;
   no parallel semantic engine, persistent store, reviewer LLM, router, or
   additional online coverage call. Prior subject is existing canonical state,
   carried in replay rather than reconstructed from new binding.
4. Simplicity: bounded typed distinctions replace missing semantic operands;
   no DEV case IDs or expected-answer strings occur in production. The existing
   effect grammar was shared verbatim, not expanded into a semantic whitelist.
5. Performance: deterministic loops are bounded by current obligation/evidence
   collections; no new runtime history scan, database read, or model call for
   coverage. Preferred benchmark adds only the Producer role it previously lacked.

This is same-agent self-review with delegated regression authorship, not an
independent Agent 2 approval. Merge/activation readiness remains blocked on
model acceptance and the existing P11/P12 requirements.

## Verification commands actually executed

All commands ran from the working source above. Logs are preserved in the
sibling evidence directory. Focused RED commands use selectors; their skipped
siblings are selector exclusions, not changes to test skips.

| Command | Exit | Result |
|---|---:|---|
| `pnpm -r build` | 0 | PASS, earlier full build (`workspace-build.log`). |
| `pnpm -r test` | 1 | Initial FAIL, root causes described above (`workspace-test.log`). |
| `pnpm -r test` | 0 | Earlier corrected full run; worker 2112 PASS / 4 pre-existing opt-in SKIP (`workspace-test-final.log`). |
| `pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit` | 0 | Corrected fixture/source typecheck PASS; earlier type failures were fixed. |
| `pnpm --filter @lana/worker exec vitest run src/track-c-c3-semantic-conservation.test.ts -t 'multi-product referential'` | 1 | RED: wrong arbitrary product mapping (`multi-product-binding-red.log`). |
| `pnpm --filter @lana/worker exec vitest run src/track-c-c3-semantic-conservation.test.ts src/track-c-c3-obligation-families.test.ts src/realtime-c3-deterministic-runtime.test.ts src/track-c-c3-strategy-contract-runner.test.ts` | 0 | 131 PASS across three actual matching files; `realtime-c3-deterministic-runtime.test.ts` does not exist and matched nothing (`binding-adjacent-green.log`). The correct runtime suite was subsequently run below. |
| `pnpm --filter @lana/worker exec vitest run src/track-c-c3-benchmark-parity.test.ts -t 'prior rejected'` | 1 | RED: benchmark rejects new product instead of old (`parity-prior-subject-red.log`). |
| `pnpm --filter @lana/worker exec vitest run src/track-c-c3-semantic-conservation.test.ts src/track-c-c3-benchmark-parity.test.ts src/realtime-c3-deterministic.test.ts src/realtime-c3-obligation-recovery.test.ts` | 0 | 61 PASS (`runtime-parity-final-green.log`). |
| `pnpm typecheck` | 0 | Full workspace build + typecheck PASS (`workspace-typecheck-final.log`). |
| `pnpm --config.enable-pre-post-scripts=false -r build` | 0 | Latest source full build PASS; same topological build configuration as CI (`workspace-build-source-final.log`). |
| `pnpm --config.enable-pre-post-scripts=false -r test` | 0 | Latest committed source full workspace PASS; worker 2114 PASS / 4 existing opt-in SKIP, 147 files PASS / 2 SKIP (`workspace-test-source-final.log`). |
| `node deploy/runtime-state/dataset-boundary-guard.mjs --self-test` | 0 | Self-test and repository dataset boundary PASS. |
| `git diff --check` | 0 | PASS; line-ending notices only. |

Source identity commands (`gh pr view`, fetch/readback, `git rev-parse`,
merge-base/ancestry checks, and `git diff --name-only`) were read-only PASS.
Final normal push and exact-head CI readback are recorded in the external final
handoff. No CI status from a historical HEAD is substituted for this candidate.

## Acceptance state

- Implementation: implemented and locally verified; model acceptance remains open.
- Deterministic semantic verification: PASS, focused and latest full workspace source run.
- Exact-head CI: NOT RUN at this documentation commit; final pushed-HEAD result, run ID, and SHA are in the final handoff.
- Real-model runtime acceptance: NOT RUN for this candidate.
- DEV70 R2: NOT RUN for this candidate.
- P11: OPEN.
- P12: BLOCKED.
- PR377: DRAFT.
- No merge, deploy, or live traffic.
