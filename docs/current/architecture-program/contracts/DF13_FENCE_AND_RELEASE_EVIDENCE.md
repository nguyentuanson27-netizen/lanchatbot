# Durable Contract — DF13 Fence and Release Evidence

**Status:** Source-only architecture contract. It never authorizes migration,
release, deployment, canary, runtime mutation, or `LEGACY -> COMMERCE` activation.

## Governing rule

Absence of proof of COMMERCE authority means the caller keeps the existing
LEGACY path. Only a positively identified but unusable COMMERCE pointer blocks.

This rule prevents a future COMMERCE gate from changing current LEGACY traffic.
The pure fence assessment is not wired into `RealtimeRunner`; this source unit
adds no provider, dispatcher, feature flag, composition-root binding, or live
authority consumer.

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

The pure assessment does not acquire or invent a lease. The next focused source
unit must implement the durable provider and all-or-nothing dispatcher together.
That provider must atomically claim every Inbox ID, reject overlapping live
leases, bind acquisition/completion to a fresh opaque token and epoch, make
stale acknowledgements ineffective, and preserve uncommitted Inbox/Outbox work
through replay, lost ACK, concurrency, crash, and restart. Provider failure may
park work without consuming an attempt; it may not complete, retry, dead-letter,
or publish an effect.

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

## Remaining source units and hard stops

The remaining implementation order is:

1. durable fence provider plus all-or-nothing COMMERCE dispatcher;
2. integration as a default-off wrapper whose disabled branch delegates to the
   untouched LEGACY runner path.

Until both units are reviewed and a separate release/cutover is authorized,
runtime remains `salesAuthorityMode=LEGACY`, `stateReadMode=LEGACY`.

BF-03 remains foundation-only/non-activatable, BF-04 remains `PARTIAL /
KNOWN_GAP`, and BF-10 natural-terminal evidence remains pending. This contract
does not alter those residuals or the separate `DATABASE_URL` remediation.
