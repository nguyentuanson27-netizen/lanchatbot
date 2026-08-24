# DF13 Operational-Acceptance Preparation

**Status:** `SOURCE_COMPLETE / OPERATIONAL_ACCEPTANCE_PENDING`; not an activation, release, deployment, migration, canary, or cutover authorization.

**Source completion:** DF13 source contracts/tooling merged on `main` through PR #247
(`a8f6e500a8a33f652f7fd2051a135c3b245c5386`). This source merge is not
immutable Release Train evidence and does not authorize a runtime operation.

## Purpose and hard boundary

DF-C / DF13 source work is complete. This preparation records the exact evidence
and fail-closed runbook that a separately authorized Release Train must use before
the first mutating boundary. It does not create an immutable release, inspect a
runtime host, apply pending migration `0035`, change `salesAuthorityMode` or
`stateReadMode`, or start UR.

The reviewed source composes one explicit final-authority boundary before any
conversation-state, model, product, or durable-commit work. The normal startup
input remains `LEGACY` and delegates to the existing runner unchanged. An
isolated pre-production `COMMERCE` startup is separately fail-closed: it needs
the immutable release-evidence package, exact release-source pointer, exact
DATABASE behavior identity, the dedicated fence executor, and Context V2
capture. An invalid, resolver-failed, stale, or incomplete COMMERCE identity
blocks rather than falling through to LEGACY. Wiring this source changes no
deployed runtime and permits no activation by itself.

The isolated COMMERCE composition deliberately disables behavior-pointer cache
for both startup preflight and every turn: each authority decision must be a
new exact `DATABASE` read. Its sole Context V2 bootstrap is a new conversation
at revision zero with a pristine Commerce `DISCOVERY` state. Every fenced
Commerce commit must then persist its next Context V2 capture in the same
transaction; an absent plan or unsuccessful write rolls back state, Inbox
completion, and fence completion.

The only admissible authority topology remains one direct page-scoped transition:

```text
sales authority: LEGACY -> COMMERCE
state read:       LEGACY
```

There is no runtime `SHADOW`, dual writer, regex co-authority, mixed Context
V2/phase/reconciliation consumer set, or authority-independent bypass class.

## Immutable candidate package

At the Release Train boundary, use a clean isolated worktree checked out at the
exact proposed release commit. After a fresh `origin/main` fetch, build the
worker and run:

```text
node apps/worker/dist/df13-release-candidate-evidence-cli.js --revision <40-lowercase-hex-origin-main-commit>
```

The command accepts no movable ref and refreshes only
`refs/remotes/origin/main`. It emits canonical JSON only and succeeds only when
the requested revision is the refreshed trusted head, the self-hashed evidence
is `SOURCE_READY_NO_ACTIVATION`, and its validation is `MATCHED`. Its result
must be stored as a redacted immutable release-evidence artifact, with the
complete output SHA-256, command/runtime versions, start/end times, source tree
OID, and the final refetch recorded outside source history.

The package binds all of the following, with the candidate projection carrying
the complete ordered path/blob/content-SHA list rather than a copied fingerprint:

- exact release commit and tree;
- Gate E v15 manifest blob/content identity, manifest hash, evidence BODY and
  FINALIZATION hashes, admissibility, and durable-store status;
- every canonical candidate-affecting artifact and the re-derived candidate
  content fingerprint;
- the canonical DF13 authority-bundle hash and all eight consumers:
  classification, commerce state, Context V2, derived phase, strategy, CTA,
  final reconciliation, and side-effect plan;
- `0035_df13_commerce_behavior_mode` and
  `0036_df13_commerce_authority_fence` up/down blob and SHA-256 identities; and
- the required rollback target: the exact pre-cutover LEGACY pointer with the
  same eight consumer readbacks.

A changed blob, field, fingerprint, trusted ref, source tree, authority bundle,
or candidate consumer list is a fail-closed mismatch. A Gate E manifest hash
copied into a later release is not evidence; a candidate mismatch requires a
new authorized DF-P6/Gate E evaluation on the final candidate.

## Pending-migration rehearsal

`0035` and `0036` remain in `packages/database/pending-migrations/` and are
deliberately outside automatic migration discovery. `0036` is the durable,
page-scoped cutover-fence schema; it is not an Inbox-batch fence substitute. A
Release Train may test them only in a new disposable database with no shared
endpoint, persistent volume, host port, or production/preprod credential.

Required rehearsal assertions are:

1. apply the required core schema through the existing `0030` behavior-mode
   schema, then exact `0035` and `0036` up SQL in order;
2. prove LEGACY versions still accept a null authority-bundle value;
3. prove COMMERCE rejects a missing or malformed bundle and every state-read
   mode other than LEGACY;
4. prove a valid 64-hex COMMERCE bundle is accepted;
5. prove `0036` records only a full immutable pre-cutover LEGACY and target
   COMMERCE identity, re-read field-by-field from the current durable pointer
   and immutable versions before insert, and that identity fields cannot be
   mutated after insert;
6. prove its immutable operation ID reconciles lost acquire/release ACKs without
   inserting a second fence, and that lease acquire, recovery, and release use
   PostgreSQL time rather than a process clock; and
7. prove `0036` down refuses while any durable cutover or authority-fence
   evidence exists and preserves it; and
8. in a separate clean disposable database, prove `0036` down succeeds with no
   fence evidence; then separately prove `0035` down refuses while an immutable
   COMMERCE version exists and otherwise restores the LEGACY-only constraint.

Record exact SQL SHA-256 values for both migrations, image/runtime identity,
isolation properties, redacted command log hash, and cleanup confirmation.
Never use `migrateUp` to discover or promote either pending artifact. Successful
disposable rehearsal is schema evidence only; it does not authorize applying
`0035` or `0036` anywhere.

## Quiescent cutover plan

Before any future CAS, acquire the page/channel-scoped DF13 durable fence for
the exact immutable request. The held consumer set is the whole authority
surface above. No classification, state, context, phase, strategy, CTA,
reconciliation, side-effect plan/execution, cart/order transition, queued
eligible event, or in-flight eligible work may cross the fence.

Only after an empty in-flight/eligible-queue proof may the dedicated DF13
adapter attempt one audited CAS. Keep the fence held through propagation. Every
consumer must read back the exact database-resolved mode-version ID, canonical
content hash, pointer revision, source, authority/state modes, and authority
bundle. A cached, LKG, startup, stale, partial, ambiguous, or copied identity
is not convergence.

The atomic committer couples durable runtime state/Outbox work, exact
Inbox-claim release, the required next Context V2 capture, and fence completion.
Lost acknowledgement is recovered as
`ALREADY_COMPLETED`; a lease expiry, replay, stale epoch, concurrency conflict,
crash/restart, partial completion, missing Context V2 capture, or missing
consumer readback fails closed
and retains or reacquires the fence as required.

## Monitoring, abort, and exact rollback matrix

| Condition | Decision before held work is released |
|---|---|
| Any candidate/manifest/blob/fingerprint mismatch, missing commerce signal, or authority ambiguity | Abort before CAS; remain exact LEGACY. |
| Any eligible work in flight or queued, or an unlisted consumer/bypass | Do not CAS; retain/abort the fence. |
| CAS/audit/readback not exactly one expected revision/hash/source/bundle for every consumer within the reviewed propagation bound | Abort or roll back under the fence. |
| Replay, lost ACK, stale lease/epoch, concurrency conflict, crash/restart, or partial durable commit | Reconcile under the fence; do not derive or execute another plan until the durable outcome is exact. |
| Health/readiness, queue, SSRF/claim/provenance, PII/secret, auth, or DB-safety evidence unknown or degraded | Fail closed; do not release authority-dependent work. |
| Critical controlled journey fails | Roll back under the fence to the exact pre-cutover LEGACY pointer. |

Rollback means an audited CAS to the exact pre-cutover LEGACY version/content
identity at the next pointer revision, with a null/omitted authority bundle and
canonical LEGACY content hash. The fence remains held until all eight consumers
read back that exact `DATABASE` identity. Any stale LEGACY pointer, partial
Context V2/phase/reconciliation state, missing audit, or lost acknowledgement
is not rollback completion.

## Required authorization sequence

1. Merge reviewed source fixes only after an explicit owner merge command.
2. Re-run this package from the final trusted `origin/main` source and prepare
   immutable Release Train evidence.
3. Obtain a separate owner command for a named release/migration/cutover
   boundary; no source PR supplies it.
4. Only then perform the controlled PREPROD operation and collect real
   activation/readback/rollback evidence. Controlled human journeys follow
   successful convergence; Gate F remains unpassed until those records exist.

BF-03 remains foundation-only/non-activatable, BF-04 remains `PARTIAL / KNOWN_GAP`,
BF-10 natural-terminal evidence remains pending, and the separate `DATABASE_URL`
remediation is out of scope.
