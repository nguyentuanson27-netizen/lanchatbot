# Durable Contract — DF13 Fence Consumer and Release-Candidate Evidence

**Status:** Source architecture contract. It is proposed on an unmerged branch
and never authorizes a migration, release, deployment, canary, runtime mutation,
or `LEGACY -> COMMERCE` activation.

## Decision

DF13 uses one fence-bound consumer boundary around the complete RealtimeRunner
semantic path. A standalone cutover orchestrator or a test-only wrapper is not
enough: authority-dependent classification, state, Context V2, phase, strategy,
CTA, final reconciliation, and side-effect planning must be unable to enter the
worker under `COMMERCE` without the same durable fence admission.

The current `LEGACY` path remains default-off and unchanged. This revision has
neither a durable fence provider nor the all-or-nothing COMMERCE semantic
dispatcher. A COMMERCE resolution is therefore rejected before state loading or
semantic work, including when a prospective provider object is passed to the
adapter. A future source unit must add the dispatcher and its durable provider
together; provider configuration alone cannot create accidental COMMERCE
authority or send admitted work through the LEGACY semantic path.

## Consumer admission

The adapter binds one immutable identity to all eight DF13 consumers:

- mode version ID;
- canonical behavior-mode content hash;
- pointer revision;
- `DATABASE` source;
- `COMMERCE` sales authority and `LEGACY` state-read mode;
- exact DF13 authority-bundle hash.

There are no authority-independent bypass classes in this revision. An app echo
that is recognized as this app's own message exits before it becomes a semantic
consumer; every other RealtimeRunner batch crosses the adapter.

For COMMERCE, the future admission contract requires an exact
database-resolved, audit-recorded identity. Cache, last-known-good, startup,
stale, missing, ambiguous, or mismatched identities fail closed. The durable
provider contract receives the complete fixed consumer set and must return the
same identity; a partial or substituted acknowledgement is rejected. It is not
invoked by current source because no COMMERCE dispatcher exists.

The future provider must use a stable identity derived from durable Inbox IDs,
not a per-claim evaluation UUID. If its fence is held, the Inbox item must be
durably deferred under its fence token without consuming an attempt or being
completed. A completed semantic batch releases its admission only through
idempotent `RELEASED | ALREADY_RELEASED` acknowledgement. Failure to admit,
defer, or complete remains fenced for recovery; it is never converted to an
unfenced retry/release. These are required replay, lost-ACK, concurrency, and
crash/restart contracts for the separately reviewed dispatcher/provider unit;
the current boundary rejects before any such admission can occur.

## Release-candidate source evidence

`prepareDf13ReleaseCandidateEvidence` is source-only tooling. Given an exact
Git revision and fixed-argv Git reader, it reads the release revision's v15
registered manifest at `evaluation/gate-e/df10-v15/manifest.json`, validates
every immutable Gate E field, and re-derives the full candidate projection from
every canonical candidate-affecting blob. Its package records:

- the release revision and manifest blob/content identity;
- the immutable Gate E manifest, evidence BODY, FINALIZATION, admissibility,
  and durable-store bindings, plus manifest integrity;
- every re-derived candidate path/blob/content fingerprint and aggregate
  fingerprint;
- the fixed authority-consumer bundle; and
- a `REQUIRED_NOT_EXECUTED` complete-LEGACY rollback evidence placeholder.

The package always declares `sideEffects=NOT_EXECUTED`. A copied manifest hash,
missing blob, malformed revision, changed candidate fingerprint, or any manifest
field mismatch returns `BLOCKED`; it cannot be promoted into deployment or
runtime evidence. The cutover executor accepts the complete self-hashed package
and independently validates its exact request binding, manifest comparisons,
canonical blob projection, authority bundle, and rollback placeholder; it
cannot accept a bare port-supplied success assertion. The tool does not create
an immutable release, inspect a host, call a provider, apply migration `0035`,
or perform an activation.

## Activation and rollback boundary

An owner-authorized release still must supply the durable fence provider, prove
quiescence, CAS/audit the pointer, obtain exact readback from every consumer,
run controlled critical journeys, and prove complete return to `LEGACY` before
releasing held work. The source evidence package is prerequisite material, not
proof that any of those runtime steps occurred.

BF-03 remains foundation-only/non-activatable, BF-04 remains `PARTIAL / KNOWN_GAP`,
and BF-10 natural-terminal evidence remains pending. This contract does not
alter those residuals or the separate `DATABASE_URL` remediation.
