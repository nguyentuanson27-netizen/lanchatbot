# Durable Contract — DF13 Fence and Release Evidence

**Status:** Source-only architecture contract. It never authorizes migration,
release, deployment, canary, runtime mutation, or `LEGACY -> COMMERCE` activation.

## Governing rule

Absence of proof of COMMERCE authority means the caller keeps the existing
LEGACY path. Only a positively identified but unusable COMMERCE pointer blocks.

This rule prevents a future COMMERCE gate from changing current LEGACY traffic.
The pure fence assessment, durable admission provider, admission dispatcher,
and default-off consumer adapter are not wired into `RealtimeRunner`; this
source unit adds no feature flag, composition-root binding, or live authority
consumer. The adapter is also the concrete resolver-facing Commerce consumer:
without separate authorization for the exact page/channel/version/content/
bundle/revision/source identity it rejects a COMMERCE pointer, rather than
letting resolution stand on a copied hash or an enable flag.

`RealtimeRunner` applies a single final-authority boundary before loading
conversation state, invoking the model, searching products, or committing a
result. A COMMERCE-origin resolver fallback is blocked, never reclassified as a
LEGACY final authority. A fresh exact COMMERCE identity is likewise blocked
unless a separately reviewed COMMERCE executor is bound; this default-off source
composition binds none.

## Pure fence assessment

`assessDf13CommerceAuthorityFence` is a side-effect-free pre-provider boundary.
It decides `LEGACY_ADMITTED` before inspecting any prospective COMMERCE fence
scope. Therefore an absent/startup/unknown/LEGACY provenance, any current batch
shape, and the current customer-burst cardinality cannot be blocked by DF13.

A positively identified COMMERCE pointer must instead produce exactly one of:

- `COMMERCE_FENCE_REQUIRED`, containing the full sorted unique durable Inbox-ID
  set, audit-only work ID, complete fixed consumer set, and immutable authority
  identity; or
- `BLOCKED`, containing a deterministic block ID and bounded reason code.

Invalid Inbox-ID multisets retain duplicates and malformed values for evidence,
but are sorted before block-ID hashing so the same work has one identity
regardless of caller ordering. `DF13_COMMERCE_PREPROD_SCOPE_V1` is the single
source for the reviewed page/channel scope; a later wrapper must also inject its
page list into the generic runtime resolver rather than create another policy.

The immutable identity includes mode-version ID, canonical content hash,
pointer revision, `DATABASE` or bounded `CACHE` source, `COMMERCE` sales
authority, `LEGACY` state read, and the single canonical authority-bundle hash.
LKG, startup, stale, missing, rejected, ambiguous, malformed, or mismatched
COMMERCE identity cannot produce a fence request.

There are no authority-independent bypass classes in this revision. The fixed
consumer set covers classification, commerce state, Context V2, derived phase,
strategy, CTA, final reconciliation, and side-effect planning. A later bypass
requires a finite enumeration and contract tests proving independence from
both authorities.

The pure assessment does not acquire or invent a lease. The source-only durable
admission store, its one worker adapter, and
`dispatchDf13CommerceAuthorityFence` form a dormant admission boundary. The
pending `0036_df13_commerce_authority_fence` schema is intentionally outside
`migrateUp` discovery and is not applied by this change.

The adapter rejects any direct request whose page/channel is outside
`DF13_COMMERCE_PREPROD_SCOPE_V1`, even if it carries the expected bundle hash.
This keeps reviewed page scope at the real durable-consumer boundary rather
than treating the pure preflight as the only enforcement point.

Before a future consumer may run, the provider takes one transaction-scoped
advisory lock and row locks every requested Inbox ID, then atomically writes
one claim for every ID. It rejects changed canonical request identity, missing
or cross-page Inbox IDs, a concurrent claim, a live lease, malformed input, and
partial claim writes. It never changes Inbox status/attempts, dead-letter state,
Outbox, or provider-delivery state. The stored identity is re-derived from every
canonical field and compared field-by-field on replay, including the sales and
state authority modes, canonical content hash, bundle hash, source, pointer
revision, and ordered Inbox IDs.

Every held lease has a new opaque UUID token stored only as a SHA-256 hash and a
monotonic epoch. An expired lease may be recovered only by the same exact
request and receives a new epoch, so a prior holder cannot complete or release
it. The admission path has no completion, retry, dead-letter, consumer, Inbox
state, Outbox, or provider-delivery operation.

The dispatcher intentionally returns `COMMERCE_HELD` rather than accepting an
`execute` callback or completion acknowledgement. The default-off consumer
adapter owns the only subsequent source path: when no separate activation
authority is supplied it delegates directly to the untouched LEGACY consumer;
a future composition must first admit the exact immutable request (not a
boolean flag) before it derives a durable runtime plan. That plan is derived
only after the request is held and passes the same immutable request/token/
epoch to the dedicated atomic committer. The plan interface contains durable
state/Outbox input only; it has no direct send, publish, retry, dead-letter, or
free side-effect callback.

The atomic committer re-checks the fixed scope and whole authority-consumer
bundle at its own boundary. Its database operation owns the existing durable
runtime state/Outbox commit, exact Inbox-claim release, and fence completion in
one transaction. A pre-commit failure rolls all three back; a stale/mismatched
lease, malformed runtime Inbox set, partial release, or completion-write
failure fails closed. Lease validity uses the database clock and the final
completion CAS proves that the lease is still live; expiry while durable work
is in flight rolls the whole transaction back. If the caller loses the
post-commit acknowledgement, the next acquisition observes `ALREADY_COMPLETED`
before any plan is re-derived.
The store class remains unexported from `@lana/database`; no current runtime
path constructs either adapter, supplies an activation authority, or calls the
dispatcher/committer.

## Release-candidate source evidence

`prepareDf13ReleaseCandidateEvidence` refreshes the fixed trusted release ref,
requires its exact resolved commit to equal the requested release revision,
and rechecks that ref after derivation. It then reads the v15 registered
manifest and every canonical candidate-affecting blob at that immutable commit,
recording:

- exact release revision and manifest blob/content identity;
- Gate E manifest, evidence BODY, FINALIZATION, admissibility, and durable-store
  bindings;
- field-by-field manifest comparisons and the re-derived candidate projection;
- the single canonical authority bundle and complete consumer set; and
- a source-only complete-LEGACY rollback requirement.

The evidence package is recursively frozen and self-hashed. Preparation binds
the refreshed `refs/remotes/origin/main` identity, exact manifest blob OID, raw
content SHA-256, whole-body manifest self-hash, and canonical candidate
projection. The deterministic validator checks those immutable bindings plus
request binding, package self-hash, authority bundle, consumer set, and rollback
contract. A copied hash, caller-supplied success assertion, untrusted release
ref, local ref movement during derivation, missing blob/field, malformed
revision, changed candidate fingerprint, duplicate/substituted field, or
unavailable derivation returns
`BLOCKED`/`MISMATCH`; missing manifest fields never reach canonical JSON as
`undefined`.

The forward cutover executor invokes preparation and validation itself from its
fixed source reader before acquiring a fence. Evidence preparation refreshes a
trusted Git ref but never creates a release, inspects a deployed runtime host,
calls a model provider, applies migration `0035`, or activates an authority.
`SOURCE_READY_NO_ACTIVATION` is source provenance only.

## Cutover and rollback evidence

The target COMMERCE behavior version must have a canonical `content_hash` that
binds the exact authority-bundle hash. Cutover preflight rejects a copied or
non-canonical content hash before any fence operation.

Rollback must restore the exact pre-cutover LEGACY version, not merely any
LEGACY-shaped pointer. A successful restored pointer has the pre-cutover
version/content identity at the next rollback revision, a null/omitted authority
bundle, canonical content hash, and exact `DATABASE` readback from every listed
consumer. Stale LEGACY, partial Context V2/phase/reconciliation consumers,
ambiguous authority, missing readback, or lost acknowledgement retains the
fence. Recovery distinguishes a pre-cutover LEGACY pointer, which has no
rollback to audit, from an already-restored LEGACY pointer, which requires an
exact rollback audit before convergence and release. Recovery that never
acquires a fence reports `BLOCKED_AUTHORITY_UNKNOWN`; it may claim neither a
retained lease nor a LEGACY authority it has not observed under the fence.
Recovery validates the immutable scope and rollback-pointer envelope, but does
not depend on forward-only release freshness, candidate evidence, missing-
commerce readiness, or activation verification. Those gates authorize only a
forward transition; they cannot prevent a fenced observation and exact rollback
of a control plane that may already be serving COMMERCE. A rejected or
unavailable fence acquisition returns a bounded fail-closed result and performs
no quiescence, pointer read, activation, rollback, or release operation.

This source tooling records rollback as `REQUIRED_NOT_EXECUTED`. Only separately
authorized runtime execution can append actual rollback evidence.

## Source completion and hard stops

The source-level default-off wrapper and dedicated atomic
consumer-commit/fence-completion transaction are complete. This is not a
runtime integration, release candidate, migration application, deployment,
canary, cutover, or activation authorization. Operational acceptance must still
review the exact release candidate, migration state, quiescent cutover evidence,
consumer readbacks, activation audit, rollback evidence, and controlled human
journeys under separately approved commands.

Until that work is separately authorized and accepted, runtime remains
`salesAuthorityMode=LEGACY`, `stateReadMode=LEGACY`.

BF-03 remains foundation-only/non-activatable, BF-04 remains `PARTIAL /
KNOWN_GAP`, and BF-10 natural-terminal evidence remains pending. This contract
does not alter those residuals or the separate `DATABASE_URL` remediation.
