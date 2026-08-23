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

The prospective `COMMERCE` path remains default-off; the current `LEGACY` path
is unchanged. This revision has
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
- fresh `DATABASE` or bounded five-second `CACHE` source;
- `COMMERCE` sales authority and `LEGACY` state-read mode;
- exact DF13 authority-bundle hash.

There are no authority-independent bypass classes in this revision. An app echo
that is recognized as this app's own message exits before it becomes a semantic
consumer; every other RealtimeRunner batch crosses the adapter.

The default `LEGACY` admission is decided before any prospective `COMMERCE`
scope validation. It is not constrained by an adapter-only Inbox cardinality
limit: the current native customer-burst claim can contain more rows than a
small fixed threshold. The existing database claim's customer-burst behavior is
outside this source unit; any future database batch bound or chunking change
must preserve and separately prove sliding-debounce and response-group
semantics.

For COMMERCE, the future admission contract requires an exact fresh-resolved,
audit-recorded identity. A bounded resolver cache is equivalent to the pointer
it just validated and is therefore allowed; last-known-good, startup, stale,
missing, ambiguous, or mismatched identities fail closed before the consumer
is consulted. In particular, an LKG COMMERCE pointer is returned as
`CLARIFY_ONLY`, never as fallback COMMERCE authority. The durable provider
contract receives the complete fixed consumer set and the same immutable
identity; a partial or substituted acknowledgement is rejected. It is not
invoked by current source because no COMMERCE dispatcher exists.

The future provider must atomically claim every sorted, unique durable Inbox
row ID under a fresh opaque fence token. A work-ID hash is audit correlation
only: it cannot authorize `{A}` and `{A,B}` to run concurrently. Any overlap
with an unexpired lease returns `HELD`; recovery can use `REACQUIRED` only
after durable lease-expiry proof, with a new token that makes stale holders and
their completion acknowledgements ineffective. Completion is conditional on
the exact token, epoch, immutable authority identity, and full Inbox-ID set.

If authority cannot be admitted (including missing provider/dispatcher,
identity/scope failure, or future provider-unavailable state), the adapter
returns a deterministic durable `BLOCKED` ID rather than inventing a fence
token. The Inbox item must be durably blocked under that ID, without consuming
an attempt, completing the work, or entering generic retry/dead-letter flow.
`HELD` is reserved for a real provider-held fence token. A completed semantic
batch releases its admission only through idempotent `RELEASED |
ALREADY_RELEASED` acknowledgement. Failure to defer or complete remains
fenced for recovery; it is never converted to an unfenced retry/release. These
are required replay, lost-ACK, concurrency, and crash/restart contracts for the
separately reviewed dispatcher/provider unit; the current boundary blocks
before any such admission can occur.

If the RealtimeRunner cannot prove that a `HELD` or `BLOCKED` admission was
durably deferred—because the required port is absent, returns false, or
throws—it returns the explicit nonterminal `AUTHORITY_DEFER_UNPROVEN` outcome.
It does not complete, retry, or dead-letter the Inbox lease; the lease remains
for expiry/recovery. This deliberately favors safety over liveness and is not a
successful `HELD` acknowledgement. A future dispatcher/provider release must
configure and prove the durable defer ports before it can activate COMMERCE.

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
runtime evidence. The cutover executor owns the invocation of this tooling
against its fixed `GateECandidateSourceReader`, then independently validates
the complete self-hashed result and its exact request binding, manifest
comparisons, canonical blob projection, authority bundle, and rollback
placeholder. It accepts neither a caller-supplied package nor a bare
port-supplied success assertion. The tool does not create an immutable release,
inspect a host, call a provider, apply migration `0035`, or perform an
activation.

## Activation and rollback boundary

An owner-authorized release still must supply the durable fence provider, prove
quiescence, CAS/audit the pointer, obtain exact readback from every consumer,
run controlled critical journeys, and prove complete return to `LEGACY` before
releasing held work. The source evidence package is prerequisite material, not
proof that any of those runtime steps occurred.

BF-03 remains foundation-only/non-activatable, BF-04 remains `PARTIAL / KNOWN_GAP`,
and BF-10 natural-terminal evidence remains pending. This contract does not
alter those residuals or the separate `DATABASE_URL` remediation.
