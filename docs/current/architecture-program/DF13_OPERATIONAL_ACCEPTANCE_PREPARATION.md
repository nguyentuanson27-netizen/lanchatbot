# DF13 Operational-Acceptance Preparation

**Status:** `SOURCE_FOUNDATIONS_COMPLETE / OPERATIONAL_ACCEPTANCE_PENDING`; not an activation, release, deployment, migration, canary, or cutover authorization.

**Source completion:** DF13 source contracts/tooling merged on `main` through PR #247
(`a8f6e500a8a33f652f7fd2051a135c3b245c5386`). This source merge is not
immutable Release Train evidence and does not authorize a runtime operation.

## Purpose and hard boundary

DF-C / DF13 source foundations are complete. This preparation records the exact
evidence and fail-closed runbook that a separately authorized Release Train must
use before the first mutating boundary. It does not create an immutable release,
inspect a runtime host, apply pending migration `0035`, change
`salesAuthorityMode` or `stateReadMode`, or start UR.

For the first controlled DF13 PREPROD exercise only, the owner-selected
[`DF13_PREPROD_FRESH_PROCESS_DECISION.md`](DF13_PREPROD_FRESH_PROCESS_DECISION.md)
supersedes this document's former in-process fence/CAS sequence. That exercise
uses a sealed, stopped, and drained service set as its quiescence boundary, then
starts exactly one fresh COMMERCE build. It is not a zero-downtime cutover and
does not relax immutable candidate, single-authority, safety, or exact LEGACY
rollback requirements. A later hot transition remains governed by the durable
fence contract.

The reviewed source establishes the single-authority, resolver, candidate, and
consumer contracts before conversation-state, model, product, or durable-commit
work. Normal startup remains `LEGACY` and delegates to the existing runner
unchanged. A narrowly scoped follow-up source change must bind the real
fresh-process COMMERCE composition before an operational train can exist; this
preparation does not claim that a test wrapper or a generic operator is that
binding. The COMMERCE start path must require immutable release evidence, an
exact release-source pointer, and an exact `DATABASE` behavior identity, and
must block stale, incomplete, or resolver-failed identity rather than falling
through to LEGACY. None of that source work changes deployed runtime or permits
activation by itself.

The fresh COMMERCE composition must read the exact behavior identity from
`DATABASE` at startup and before authority-dependent work; `CACHE`, LKG, and
startup defaults cannot become a COMMERCE final authority. Its sole Context V2
bootstrap is a new conversation at revision zero with a pristine Commerce
`DISCOVERY` state. Every Commerce commit must persist its required next Context
V2 capture atomically with durable state/Outbox work; an absent plan or failed
capture blocks the work. These requirements do not reintroduce a running
LEGACY/COMMERCE co-authority.

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
  `0036_df13_commerce_authority_fence` exact blob identities, which the current
  release-evidence implementation still re-derives as a dormant source artifact.
  The first stopped-process exercise neither applies nor rehearses `0036`; a
  future focused source change may split evidence profiles if that binding is no
  longer desired; and
- the required rollback target: the exact pre-cutover LEGACY pointer with the
  same eight consumer readbacks.

A changed blob, field, fingerprint, trusted ref, source tree, authority bundle,
or candidate consumer list is a fail-closed mismatch. A Gate E manifest hash
copied into a later release is not evidence; a candidate mismatch requires a
new authorized DF-P6/Gate E evaluation on the final candidate.

## Pending-migration rehearsal

`0035` and `0036` remain in `packages/database/pending-migrations/` and are
deliberately outside automatic migration discovery. The first stopped-process
exercise may consider only separately approved `0035`; it neither applies nor
rehearses `0036`. Current evidence tooling nevertheless requires the exact
`0036` source blobs to be present and re-derived. `0036` remains the durable
page-scoped hot-cutover-fence schema, not an Inbox-batch fence substitute. A
Release Train may test either artifact only in a new disposable database with no
shared endpoint, persistent volume, host port, or production/preprod credential.

Required rehearsal assertions are:

1. apply the required core schema through the existing `0030` behavior-mode
   schema, then exact `0035` up SQL;
2. prove LEGACY versions still accept a null authority-bundle value;
3. prove COMMERCE rejects a missing or malformed bundle and every state-read
   mode other than LEGACY;
4. prove a valid 64-hex COMMERCE bundle is accepted;
5. if a future hot-cutover train elects to use `0036`, separately prove it
   records only a full immutable pre-cutover LEGACY and target COMMERCE identity,
   re-read field-by-field from the current durable pointer and immutable versions
   before insert, cannot mutate identity fields afterward, reconciles lost
   acquire/release ACKs without a second fence, and uses PostgreSQL time rather
   than a process clock for lease acquire, recovery, and release; and
6. if `0036` is rehearsed, prove its down SQL refuses while any durable cutover or authority-fence
   evidence exists and preserves it; and
7. separately prove `0035` down refuses while an immutable COMMERCE version
   exists and otherwise restores the LEGACY-only constraint. If `0036` is
   rehearsed, prove in a separate clean disposable database that its down SQL
   succeeds with no fence evidence.

Record exact SQL SHA-256 values for both migrations, image/runtime identity,
isolation properties, redacted command log hash, and cleanup confirmation.
Never use `migrateUp` to discover or promote either pending artifact. Successful
disposable rehearsal is schema evidence only; it does not authorize applying
`0035` or `0036` anywhere.

## First PREPROD stopped-process replacement plan

Before the first COMMERCE start, seal new authority-dependent admission for the
reviewed page/channel. Gracefully drain and reconcile every eligible
queued/in-flight item to zero using the current LEGACY service set, then stop
the finite service set that can classify, read state/context/phase, choose
strategy/CTA, reconcile, plan, or execute an effect. Re-prove zero eligible
work. Unknown, non-zero, or stranded work aborts before starting the new build;
the first exercise has no held authority-dependent work class.

Only after that proof may the dedicated, non-generic DF13 writer record the
reviewed exact COMMERCE identity. Start one fresh immutable COMMERCE service set
and verify the complete eight-consumer surface has that one final authority.
The target identity must be re-read from `DATABASE` and match version, canonical
content hash, authority bundle, page/channel, and release evidence. Cached,
LKG, startup, stale, partial, ambiguous, or copied identity is not acceptance.

The fresh service set must preserve atomic durable state/Outbox and Context V2
capture semantics. A replay, crash/restart, partial completion, missing Context
V2 capture, missing commerce signal, incomplete consumer, or unexpected effect
fails closed: seal/drain and reconcile COMMERCE work to zero, stop it, restore the exact
captured LEGACY pointer through the narrow writer, then restart the exact
captured LEGACY release/configuration. The stopped-process protocol never issues
a second blind activation or permits both authorities to work concurrently.

## Monitoring, abort, and exact rollback matrix

| Condition | Decision before the replacement continues |
|---|---|
| Any candidate/manifest/blob/fingerprint mismatch, missing commerce signal, or authority ambiguity | Do not start COMMERCE; retain exact LEGACY. |
| Any eligible work in flight or queued, or an unlisted consumer/bypass | Drain/reconcile to zero under LEGACY or abort while sealed; do not start COMMERCE. |
| New build identity/readback is not exact for the one complete consumer set | Stop COMMERCE, restore the captured exact LEGACY pointer, and restart captured LEGACY. |
| Replay, lost acknowledgement, concurrency conflict, crash/restart, or partial durable commit | Stop COMMERCE; reconcile only by durable readback, restore exact LEGACY, and restart it unless a later owner command directs otherwise. |
| Health/readiness, queue, SSRF/claim/provenance, PII/secret, auth, or DB-safety evidence unknown or degraded | Fail closed; do not start or keep COMMERCE. |
| Critical controlled journey fails | Stop COMMERCE, restore the exact captured LEGACY pointer, and restart the exact captured LEGACY release/configuration. |

Rollback means sealing and draining/reconciling COMMERCE work to zero, stopping the COMMERCE
service set, then using the narrow writer to restore the exact captured LEGACY
behavior version/content identity at the next revision. The restored pointer
must have a null/omitted authority bundle and canonical LEGACY content hash, an
append-only audit, and an exact `DATABASE` readback before the captured LEGACY
release/configuration starts. A lost acknowledgement is reconciled by that
durable readback, never a blind replay. A stale LEGACY pointer, partial Context
V2/phase/reconciliation state, missing audit, or unknown restart outcome is not
rollback completion.

## Required authorization sequence

1. Merge reviewed source fixes only after an explicit owner merge command.
2. Re-run this package from the final trusted `origin/main` source and prepare
   immutable Release Train evidence.
3. Obtain a separate owner command for a named release/migration/replacement
   boundary; no source PR supplies it.
4. Only then perform the stopped-process PREPROD operation and collect real
   start/readback/rollback evidence. Controlled human journeys follow successful
   smoke and integration verification; Gate F remains unpassed until those
   records exist.

BF-03 remains foundation-only/non-activatable, BF-04 remains `PARTIAL / KNOWN_GAP`,
BF-10 natural-terminal evidence remains pending, and the separate `DATABASE_URL`
remediation is out of scope.
