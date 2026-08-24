# DF13 Operational-Acceptance Preparation

**Status:** `PRE_MERGE_SOURCE_PREPARATION`; not an activation, release, deployment, migration, canary, or cutover authorization.

## Purpose and hard boundary

DF-C / DF13 source work is complete. This preparation records the exact evidence
and fail-closed runbook that a separately authorized Release Train must use before
the first mutating boundary. It does not create an immutable release, inspect a
runtime host, apply pending migration `0035`, construct the default-off consumer
in the live runner, change `salesAuthorityMode` or `stateReadMode`, or start UR.

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
- `0035_df13_commerce_behavior_mode` up/down blob and SHA-256 identities; and
- the required rollback target: the exact pre-cutover LEGACY pointer with the
  same eight consumer readbacks.

A changed blob, field, fingerprint, trusted ref, source tree, authority bundle,
or candidate consumer list is a fail-closed mismatch. A Gate E manifest hash
copied into a later release is not evidence; a candidate mismatch requires a
new authorized DF-P6/Gate E evaluation on the final candidate.

## Pending-migration rehearsal

`0035` remains in `packages/database/pending-migrations/` and is deliberately
outside automatic migration discovery. A Release Train may test it only in a
new disposable database with no shared endpoint, persistent volume, host port,
or production/preprod credential.

Required rehearsal assertions are:

1. apply the existing `0030` behavior-mode schema and exact `0035` up SQL;
2. prove LEGACY versions still accept a null authority-bundle value;
3. prove COMMERCE rejects a missing or malformed bundle and every state-read
   mode other than LEGACY;
4. prove a valid 64-hex COMMERCE bundle is accepted;
5. prove down refuses while an immutable COMMERCE version exists and preserves
   that version; and
6. in a separate clean disposable database, prove down succeeds, removes the
   bundle column, and restores the LEGACY-only constraint.

Record exact SQL SHA-256 values, image/runtime identity, isolation properties,
redacted command log hash, and cleanup confirmation. Never use `migrateUp` to
discover or promote this pending artifact. Successful disposable rehearsal is
schema evidence only; it does not authorize applying `0035` anywhere.

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
Inbox-claim release, and fence completion. Lost acknowledgement is recovered as
`ALREADY_COMPLETED`; a lease expiry, replay, stale epoch, concurrency conflict,
crash/restart, partial completion, or missing consumer readback fails closed
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
