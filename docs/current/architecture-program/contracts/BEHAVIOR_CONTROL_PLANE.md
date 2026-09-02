# Durable Contract — Runtime Behavior Control Plane

Behavior modes are versioned, database-backed, page-scoped, immutable, auditable, and dynamically resolved. Environment variables are startup fail-safe defaults only.

Required properties:

- immutable behavior-mode versions with canonical content hash;
- CAS-protected current pointer/revision;
- append-only activation audit with actor, prior/new revision, reason, and timestamp;
- worker readback of version, hash, resolved value, and source;
- bounded cache propagation of at most five seconds;
- bounded last-known-good use of at most five minutes;
- explicit safe fallback after last-known-good expiry;
- least-privilege database access;
- no secret or PII in payload, audit, or readback;
- audited emergency override that requires no redeploy.

Current durable mode dimensions:

```text
confirmation: V2_ACTIVE; emergency CLARIFY_ONLY
sales authority: LEGACY; future COMMERCE
state read: LEGACY; future V2
```

## Authority transition contract

In `ENGINEERING_PREPROD`, `SHADOW` is not a required runtime authority state. Replacement authority may move directly:

```text
sales authority: LEGACY -> COMMERCE
state read:       LEGACY -> V2
```

A direct authority switch is allowed only after the owning future Gate has deterministic/replay/comparator evidence for the replacement path and an explicit rollback path.

Because control-plane propagation is bounded rather than instantaneous, a direct switch must occur inside a verified page-scoped **quiescent cutover boundary**. The cutover protocol must:

1. hold admission of all new authority-dependent eligible work for the target page;
2. verify no authority-dependent message, read, classification, context/phase/CTA/reconciliation decision, command, cart/order transition, or side-effect plan is in flight;
3. drain or hold all eligible queued events that can observe or consume the changing authority;
4. CAS-activate the new authority revision;
5. keep all authority-dependent work held through the propagation interval until every relevant authority consumer reads back the exact new revision/hash/source;
6. release held work only after that exact readback succeeds; after rollback or
   recovery, retain the fence until every relevant consumer instead reads back
   the exact restored `LEGACY` revision/hash/source.

If quiescence cannot be proven, a relevant consumer does not converge to the exact revision within the reviewed bound, or readback is ambiguous, activation must abort/fail closed and remain or return to complete `LEGACY` authority.

Authority-dependent work includes non-side-effecting inputs whose classification, state read,
phase, context, strategy, CTA, reconciliation, or subsequent plan can differ by authority.
Only a finite class proven by reviewed contract tests to be independent of both authorities
may bypass the fence; merely being outside the protected-side-effect set is insufficient.

This quiescent boundary is an atomicity/correctness requirement for direct cutover. It is not a traffic canary, SHADOW stage, or percentage rollout. Episode/cart pinning is not a default PREPROD invariant; it may be introduced later only if the implementation cannot prove a safe quiescent boundary for a specific authority-sensitive lifecycle.

Every activation remains page-scoped, CAS-audited, read back from the worker, bounded by the existing propagation contract, and reversible to complete `LEGACY` authority.

### Track B COMMERCE authority-bundle replacement

The bounded `COMMERCE/V1 -> COMMERCE/V2` Track B replacement uses one explicit
stopped-service mutation protocol:

```text
persist exact release-local rollback identity
-> stage exact target service stopped/non-admitting
-> acquire the durable page fence
-> prove DATABASE admission HELD for every authority-dependent claim transition
-> stop the exact source service and prove zero in-flight authority-dependent work
-> exact pointer CAS and DATABASE readback
-> start the exact staged target
-> exact runtime, activation-audit and full-consumer DATABASE readback
-> release the fence
```

Staging cannot start the target. Fence release cannot start or replace a
service. Applied and verified migration `0038_track_b_commerce_admission_gate` supplies the
atomic database admission boundary for `webhook_inbox -> PROCESSING`,
`meta_outbox -> SENDING`, and `pancake_tag_outbox -> APPLYING`. The source trace
finds no other independent live authority-dependent claim: the Inbox
conversation-head lease is acquired in the same transaction and is rolled
back/cleared when the Inbox claim is not returned, while per-work DF13 fences
are downstream of that claim. A matching unreleased page/channel fence blocks
new or replacement leases even after its lease expires; inserts remain durable
and existing leases may complete. Installation/removal serializes with fence
acquisition, and down refuses while any unreleased fence exists. The migration
depends on `0036/0037`; its source hashes are up
`9dcf65e97671777991ad366cdb738ee986b4ee943635a744884c8733f4001140` and down
`5dd292a169a5ecce5f21896bf8e11f1d7727a34a55758c92b8abc98f3de64d9a`.
Its governed ENGINEERING_PREPROD rehearsal, live apply, and exact readback are complete. This database state does not itself authorize a service deployment or pointer mutation.

Quiescence counts every claimed/in-flight class at zero. Durably queued rows may
remain or grow while admission is held; they are recorded in evidence but are
not required to be zero because no worker may claim them before exact release.
An admission-suppressed Inbox batch restores the speculative conversation-head
attempt count together with its lease, so held polling cannot consume retry
budget or poison queued work.

The CAS writer accepts only the recorded prior and target authority
identities and exact live lease; a post-CAS recovery may reuse that same
unreleased forward lease only to reverse the exact audited transition at the
next pointer revision. A separately requested rollback obtains its own exact
reverse fence.

Before CAS failure handling must leave the pointer at the recorded prior
identity, discard the staged target, restore and read back the exact prior
service if it was stopped, and only then release the fence. After CAS failure
handling must CAS back to the recorded prior authority, restore/start the exact
prior service, prove runtime plus full-consumer convergence, and only then
release the fence. Unknown pointer, fence, stopped-service, staged-service,
runtime, audit or consumer identity retains the fence and fails closed. This
protocol does not authorize deployment or pointer mutation by itself.

If exact fence release commits but its acknowledgement is lost, re-entry uses
the durable `ALREADY_RELEASED` fence identity and reconciles exact pointer,
service/runtime, audit when a CAS occurred, and all DATABASE consumers. It may
report the exact target active, exact prior untouched, or exact prior restored;
otherwise it reports released-state ambiguity and never claims a hold that no
longer exists.

### Narrow first-DF13 PREPROD exception

For the first isolated DF13 PREPROD exercise only,
[`DF13_PREPROD_FRESH_PROCESS_DECISION.md`](../DF13_PREPROD_FRESH_PROCESS_DECISION.md)
seals admission, gracefully drains and reconciles eligible work to zero, then
stops the finite service set and re-proves zero eligible work instead of using
an in-process hot transition. This is the quiescence evidence: no authority-dependent process
remains to observe either identity while the exact COMMERCE pointer is recorded
and one fresh COMMERCE service set starts. Any unknown work, wrong identity,
incomplete consumer set, or start/readback failure drains/reconciles COMMERCE to
zero, stops it, restores
the exact captured LEGACY pointer, and restarts its captured release/configuration.

The exception does not turn the generic operator into a COMMERCE writer. A
dedicated, non-generic first-PREPROD writer may record only the reviewed exact
forward or captured exact rollback identity after the drain/stop proof and must
emit an audit record. It cannot use an environment-only authority flag, accept a
mutable ref, operate while an authority-consuming service is running, or blind
replay a lost acknowledgement. State V2, any zero-downtime operation, page
expansion, and public production remain subject to the ordinary direct cutover
contract above.

The generic control-plane operator is intentionally LEGACY-only. Its generic
CAS path must reject a COMMERCE target. The only permitted COMMERCE writers are
the narrow first-PREPROD writer described above for the isolated stopped-process
exercise, and a dedicated DF13 hot-cutover adapter that owns the full durable
quiescent fence, immutable authority-bundle identity, activation-audit
reconciliation, and exact consumer readbacks for a later hot transition. The
pending DF13 `0035` behavior-mode and `0036`
durable cutover-fence artifacts are outside the active migration directory;
shared LEGACY reads and writes remain schema-compatible until a separately
authorized release promotes and applies them.
Defining the COMMERCE schema/version or pure fence/evidence contract is not
permission to promote or apply its migration, bind a consumer to the live
pipeline, or activate runtime authority.

The resolver derives and returns typed authority provenance for every resolution
and retains it through cache/LKG expiry, page rejection, and audit failure. An
effective LEGACY-shaped fail-safe from a COMMERCE pointer is therefore not a
LEGACY authority decision and cannot be admitted by a future Commerce boundary.
Provenance is not itself persisted. When its audit write succeeds, a refused or
failed COMMERCE-origin candidate is durably marked by its
`RUNTIME_BEHAVIOR_COMMERCE_*` reason code on the resolution audit row; a
successful resolution remains bound by its
immutable version, content hash, and pointer revision. A first-class provenance
audit column requires a separately authorized migration and is not part of this
source contract.
Commerce itself is default-off: it requires a page-scoped, validation-only
dedicated consumer boundary to admit the exact resolved identity before any
future composition root could consume it. This source contract does not bind
that consumer to the live pipeline or change the active LEGACY runtime.

Offline or controlled legacy/new comparison is verification tooling, not a live authority mode. It must not create protected side effects.

Traffic shadowing, traffic-percentage canaries, long soak, or statistical promotion gates are not durable PREPROD invariants. They may be introduced later by an explicit `PRODUCTION_HARDENING` decision if measured traffic/risk makes them useful.

Incident policies may extend the versioned payload, but they must not become env-only flags or independent untracked authorities. Security fallback must remain fail-closed. Claim verification must never have a mode that restores an unverified business claim.
