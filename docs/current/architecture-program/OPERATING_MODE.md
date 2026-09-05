# LANA Chatbot — Operating Mode

**Status:** Authoritative repository-wide governance
**Current mode:** `ENGINEERING_PREPROD`
**Current process profile:** `SOLO_PREPROD_MINIMAL`
**Process-profile lifetime:** remains active until an explicit owner instruction changes the process profile or operating mode.
**Current program point:** `TRACK_B_COMPLETE`, after `GATE_F_PREPROD_ACCEPTED / DF_C_COMPLETE`; Track C remains owner-start-only and is not authorized by this status.
**Live page role:** `PREPROD_TEST_PAGE`
**Approved page:** `1198992073286645`

This document defines how changes are reviewed, grouped, verified, and released. It does not replace fresh runtime-state evidence, authorize deployment, change the page allowlist, or weaken durable correctness/security/rollback invariants.

## 1. Current operating mode

The project operates in `ENGINEERING_PREPROD` until the owner explicitly requests a different operating mode such as `PRODUCTION_HARDENING`.

The connected page is a bounded engineering test environment. It is not public production, does not provide a production traffic population, and is not evidence that an architecture Gate is production-ready.

`DF-C` and `Gate F-PREPROD` are already complete and accepted. Their recorded activation, rollback and reactivation evidence is historical/current-state evidence, not an unfinished workflow to rerun.

`SOLO_PREPROD_MINIMAL` is the current default process profile for **all work performed while this `ENGINEERING_PREPROD` profile remains active**. V5 Track B is complete; Track C remains the next owner-start-only roadmap consumer. Neither Track bounds this process profile or changes it by completion alone.

Current evidence strategy must therefore prove the owning technical boundary without pretending PREPROD has production traffic characteristics.

## 2. Review classes

Every future requirement is classified as one of:

- `CURRENT_REQUIRED`: correctness, security, architecture, data-integrity, authority, or rollback behavior needed now. Missing evidence blocks the owning Gate or changed contract.
- `CURRENT_VERIFICATION`: deterministic/integration/replay/controlled evidence used to prove a current requirement in PREPROD.
- `DEFERRED_PRODUCTION_HARDENING`: traffic-scale or operational-readiness work that becomes mandatory only after an explicit hardening decision or measured scale/risk justifies it.

Reviewers must not treat a deferred production-hardening mechanism as a missing PREPROD acceptance criterion. Conversely, PREPROD simplification must never be used to waive a `CURRENT_REQUIRED` invariant.

## 3. SOLO PREPROD change/release flow — current default

While `SOLO_PREPROD_MINIMAL` is active, the default flow for ordinary PREPROD work is:

```text
branch
-> code + focused verification
-> PR
-> exact-head verification
-> merge
-> deploy exact merged commit
-> smoke / controlled check
-> done
```

A PR remains the focused change/verification unit. Keep scope small and verify the changed contract/risk boundary. **Verification authority is the exact PR head, not a specific CI vendor.** Accepted execution backends are, in preference order: a functioning GitHub-hosted CI run, a functioning GitHub Actions self-hosted CI run using the canonical checks, or `CI_UNAVAILABLE_FALLBACK` only when remote CI cannot start or executes zero repository steps because of an external provider condition. Independent exact-head review is not a mandatory solo-PREPROD gate unless a concrete risk boundary specifically requires it.

A Release Train is **not** the default unit for ordinary solo PREPROD work. It is optional/risk-triggered and may be used when a migration, broad integration boundary, authority transition, multi-service release, or later production-hardening concern justifies batching/full verification.

For a normal PREPROD deploy, the minimum release identity is:

- exact merged source commit;
- new release/build identity for each affected service that runs that commit;
- exact previous release/build/commit for each affected service, kept as that service's rollback target;
- one release-local machine-readable record containing those affected-service identities and, when an authority/config boundary changes, the exact previous authority/config identity needed for rollback before activation;
- migration identifier/checksum only when a migration is involved;
- authority/config readback only when that boundary changed.

Annotated tag/tree/blob attestation, full release-manifest ceremony, append-only runtime-state promotion, per-file artifact attestation, and a second owner-approval record are not default gates for a normal solo PREPROD deploy unless a concrete current risk requires them.

A source merge is never an implicit deploy. An explicit owner instruction to deploy a candidate/commit to `PREPROD_TEST_PAGE` is authorization for that scoped deploy. Migration, authority-mode switch, routing/page-allowlist change, destructive data action, or mutation outside the requested deploy scope still requires explicit authorization.

Before activation/switch, run any candidate readiness/health checks that are meaningful without serving live traffic. After activation, run the applicable live smoke/readback/controlled checks. A check that only has meaning after activation is not required pre-switch. Failed or unknown runtime state stops further mutation and requires rollback to the exact previous affected-service identity or an explicit diagnostic decision before continuing.

The `SOLO_PREPROD_MINIMAL` profile remains the default after any Track/Gate completes. Only an explicit owner instruction changes or replaces this process profile.

### 3.1 `CI_UNAVAILABLE_FALLBACK`

Remote CI is preferred. The fallback below is allowed only when the attempted remote backend cannot start or executes zero repository steps because of an external condition such as billing, quota, runner/provider outage, or service failure. It is forbidden when a repository command ran and failed, when the cause is ambiguous, or when a run was cancelled to avoid a result.

Because the canonical backend now runs on a self-hosted runner this project owns, `runner/provider outage` is not self-declarable. A self-hosted runner that is offline, unregistered, misconfigured, or saturated does **not** qualify; restore the runner and re-run the canonical checks instead. The two cases are distinguishable in the provider's own record — a provider failure completes the job having executed zero repository steps, while an unavailable self-hosted runner leaves the job queued and never started — so an eligible fallback requires the former, evidenced independently of the operator's own assertion. A self-hosted host that also serves live product traffic being unavailable is a reason to stop and diagnose, not a reason to relax verification.

For an eligible fallback:

1. record the exact remote PR head/base and the unavailable remote run/provider evidence;
2. verify from a clean environment with the repository-pinned runtime/package manager;
3. run frozen install plus focused/risk-applicable checks; run full `pnpm check` when the changed boundary or an explicitly selected Release Train requires it;
4. record commands, tool versions and exit results without secrets/PII;
5. re-check that the PR head did not change after verification; if it changed, discard the fallback evidence and any owner merge override for the old head, then repeat verification against the new exact head;
6. before merge, retain one concise PR comment that ties together the exact head SHA, unavailable remote run, local commands/results, and the owner's merge override for that head;
7. record `LOCAL_EXACT_HEAD_VERIFIED_CI_UNAVAILABLE`, never synthesize or claim `CI_PASS`.

This fallback deliberately does **not** require a second independent reviewer, log-hash ceremony, Release Train, tag, or manifest. A later production-hardening decision may require functioning independent remote CI as a separate mandatory gate.

## 4. Architecture-program PREPROD grouping

Original DF01-DF13 and UR00-UR10 identifiers remain traceable. PREPROD groups them into fewer vertical slices because production-scale rollout ceremony is not a useful item boundary in the current environment.

### DF

| Train | PREPROD slices | Original IDs | Boundary |
|---|---|---|---|
| `DF-A` | `DF-P1..DF-P3` | DF01-DF06 | Minimum decision telemetry/normalization then canonical evidence/readiness. |
| `DF-B` | `DF-P4..DF-P6` | DF07-DF10 | Deterministic phase/barrier, Context V2, locked offline/replay evaluation with exact candidate identity. |
| `DF-C` | `DF-P7` | DF11-DF13 | **COMPLETE / Gate F accepted.** Historical stopped-process `LEGACY -> COMMERCE`, critical journeys, exact LEGACY rollback and fresh COMMERCE reactivation are recorded in current state/evidence. |

### UR

| Train | PREPROD slices | Original IDs | Boundary |
|---|---|---|---|
| `UR-A` | `UR-P1..UR-P2` | UR00-UR03 | State V2 contract then atomic persistence. |
| `UR-B` | `UR-P3` | UR04-UR07 | Measured migration/comparator then quiescent direct `LEGACY -> V2` read switch/rollback. |
| deferred retirement | — | UR08-UR09 | Resume only after later stability/hardening evidence intentionally closes the legacy rollback window. |
| destructive cleanup | — | UR10 | Separate later approval only. |

UR / State V2 are trigger-only under adopted V5 sequencing unless separately authorized. Regrouping may not weaken logical dependencies or durable contracts. Sequencing decisions do not implicitly change the active process profile.

## 5. PREPROD evidence semantics

Preferred evidence stack:

1. deterministic unit/contract tests;
2. focused integration tests;
3. immutable incident/counterexample replay;
4. locked offline model/context corpus with pre-declared expected behavior and exact candidate identity;
5. side-effect-free legacy/new comparator where semantic equivalence matters;
6. transition/concurrency/idempotency/revision-fence matrices;
7. bounded controlled human E2E at explicit architecture/system checkpoints;
8. exact runtime identity/readback/rollback evidence for an owner-authorized deployed candidate when that boundary changed.

Use the smallest evidence that proves the owning current risk. Do not rerun accepted Gate E/Gate F evidence merely because a later source revision exists; rerun/re-derive only when a changed boundary makes the old evidence no longer applicable.

Do not manufacture Messenger traffic merely to satisfy a numeric Gate. Synthetic fixtures are valid deterministic test data but are not production statistical evidence.

Overlapping legacy defects may prevent a human conversation from reaching the component under test. Focused deterministic/integration evidence may therefore close a component-level criterion when it proves the actual owning boundary. Full-journey testing remains mandatory only at explicit later checkpoints that are still active.

Natural traffic, long soak, live sample volume, statistical confidence, and traffic-percentage canaries are supplemental in `ENGINEERING_PREPROD` unless a specific changed risk has an explicit owner-approved requirement.

### Exact offline-candidate provenance

When an offline/replay evaluation is the primary generative evidence for a future authority cutover, PASS must bind to an immutable candidate manifest rather than to an informal label such as “Context V2”. The manifest must include the exact model identifier, generation configuration, prompt/template version+hash, Context/evidence-envelope schema versions, relevant generation/interpretation policy versions, exact source revision used for the scored run, corpus/rubric identity, and a canonical content fingerprint of every candidate-affecting source/build artifact.

Before **every authority-sensitive activation that relies on a prior offline/replay PASS**, re-derive the final candidate identity and content fingerprint from the artifact being activated and compare them field-by-field with the evidence being cited. If any material candidate-identity field or fingerprint differs, or the comparison cannot be reproduced, rerun the owning evaluation before activation. Ordinary deploys that do not change or activate an authority-sensitive candidate do not inherit this comparison by default.

## 6. Authority transition semantics

Current accepted PREPROD state is:

```text
sales authority: COMMERCE
state read:       LEGACY
```

The first DF13 `LEGACY -> COMMERCE` stopped-process exercise and exact rollback/reactivation cycle are complete. `DF13_PREPROD_FRESH_PROCESS_DECISION.md` and the Gate F acceptance record are historical/current-state evidence for that completed transition; they are not a default future release procedure and do not authorize a new authority mutation.

Any future authority change remains a correctness boundary. A direct hot switch must use the page-scoped quiescent cutover contract from `contracts/BEHAVIOR_CONTROL_PLANE.md` unless a separately reviewed stopped-process decision applies:

1. hold all new authority-dependent eligible work;
2. prove no authority-dependent message, read, classification, context/phase/CTA/reconciliation decision, command, cart/order transition, or side-effect plan is in flight;
3. drain or hold all queued work that can observe or consume the changing authority;
4. CAS the new revision;
5. keep work held until every relevant authority consumer reads back the exact new revision/hash/source;
6. release authority-dependent work only after convergence is proven.

Only a finite, reviewed class proven by contract tests to be independent of both the old and new authority may bypass the fence; absence from the protected-side-effect set is not enough.

A legacy/new comparator may be used offline or in controlled side-effect-free verification. It is verification tooling, not a third authority state.

Default episode/cart pinning is not required when the quiescent boundary can be proven. If a future implementation cannot safely quiesce a specific authority-sensitive lifecycle, pinning may be added narrowly for that lifecycle as a correctness mechanism, not as traffic-rollout ceremony.

## 7. Production-hardening trigger

`PRODUCTION_HARDENING` begins only after explicit owner instruction and a recorded governance transition.

That phase is the proper home for traffic-scale and operational-readiness mechanisms when measured risk/traffic makes them useful, including:

- stronger immutable release provenance/attestation where warranted;
- release trains and independent approval boundaries where warranted;
- real eligible legacy/new or V1/V2 traffic sampling;
- statistically meaningful comparison with pre-registered thresholds;
- traffic strategy/canaries and realistic soak;
- capacity/load evidence;
- SLOs, dashboards, alerting, incident runbooks and rollback drills;
- final security/compliance/operational-readiness review;
- public-production go/no-go.

The old `>=100` pair/non-inferiority concept is not automatically carried forward unchanged; it must be reassessed against the real future population before becoming mandatory.

## 8. Invariants preserved in every mode

- every protected business claim has fresh typed verified provenance;
- model output may propose decisions/wording but cannot authorize protected side effects;
- URL/network handling remains SSRF/phishing fail-closed;
- PII, credentials and secrets remain protected;
- auth/authz/least privilege/audit requirements remain enforced;
- database changes remain additive/backward-compatible unless separately approved;
- no partial authority merge or mixed legacy/new field synthesis is allowed;
- direct authority changes satisfy their reviewed quiescence boundary before any authority-dependent work resumes;
- evaluated generative candidates retain reproducible manifest/content-fingerprint provenance when that evidence is being relied on for an authority-sensitive change;
- readback and complete rollback to the exact previous authority/config state remain required for authority changes;
- no silent data loss, unsafe fallback, direct VPS source edit, premature retirement or destructive cleanup is authorized;
- when a Release Train is explicitly selected, its stronger Git/release/runtime provenance requirements remain mandatory.

## 9. Precedence

For process questions this file owns operating mode, batching, current PREPROD evidence semantics, and the `PRODUCTION_HARDENING` trigger. `program-state.json` and fresh runtime evidence own current Gate/runtime facts. `contracts/` own durable technical invariants. V5 owns roadmap sequencing but does not limit or expire `SOLO_PREPROD_MINIMAL`. Older BF/DF/UR planning documents may retain historical Release Train wording for traceability; that wording does not override this file for the current process profile. Historical DF-C/Gate F plans/evidence remain traceable but do not reopen completed work.
