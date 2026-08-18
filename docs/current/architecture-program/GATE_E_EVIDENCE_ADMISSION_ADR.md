# ADR — Gate E Evidence Admission Boundary

**Status:** Accepted for source implementation
**Decision:** Option A — DB-authoritative final pre-commit admission boundary
**Scope:** Gate E-PREPROD evidence only; no runtime authority or deployment

## Context

Gate E needs a durable deadline authority for the unfinalized evidence body and
its hash-bound finalization. Application time, a timestamp returned before the
transaction finishes, and cancellation signals cannot prove that a late write
was excluded. PostgreSQL commit timestamps are not generally enabled and would
require a second read/write phase whose availability, retention and ambiguity
would become part of Gate authority.

## Decision

The dedicated append function owns the transaction write. A deferred constraint
trigger samples `clock_timestamp()` at the last database-controlled pre-commit
admission step, rejects the transaction when the sampled time exceeds
`notAfter`, and atomically appends the sampled value to immutable admission
metadata. Source and APIs name this value `admittedAt`; database internals may
name the local value `store_boundary_at`.

`admittedAt` is authoritative for admission and deadline ordering only. It is
not an exact PostgreSQL commit timestamp, is not post-commit time, and must never
be presented as either. The evidence content hash excludes admission metadata,
avoiding recursive receipts while the hash-only reader cross-checks both.

## Threat model and invariants

- Caller clocks, timestamps and retry times do not authorize admission.
- An absent hash is inserted only through the owned function. Final admission
  is rechecked by the DB clock at the deferred boundary.
- An identical retry returns the immutable original `admittedAt`, including
  after the deadline; it cannot extend `notAfter` or rewrite metadata.
- Same hash with different canonical content, binding or deadline is a conflict.
- BODY and FINALIZATION records bind registration commit, manifest, scored
  revision, record kind and body hash. FINALIZATION requires its BODY already
  admitted with the same deadline and identity.
- Missing/partial population, sensitive keys, raw provider material and invalid
  canonical hashes fail before the append boundary.
- Tables reject UPDATE, DELETE and TRUNCATE. Runtime roles receive only execute
  permission on the hash-scoped append/read functions, never table DML.

## Deadline, rollback, retry and connection ambiguity

An early DB-clock check can avoid needless work, but only the deferred boundary
decides admission. A deadline exception rolls back record and admission rows
together. Any pre-commit validation or permission failure rolls back and is not
converted to missing evidence.

If the client loses certainty while issuing `COMMIT`, the adapter returns no
successful receipt and reports `GATE_E_EVIDENCE_COMMIT_AMBIGUOUS`. A later
identical retry is the recovery protocol: it either retrieves the one admitted
record and its original metadata or performs a new deadline-governed append.
The ambiguous call itself never grants Gate authority.

## Options considered

1. **Option A (selected): final pre-commit DB admission boundary.** Atomic,
   one transaction, truthful semantics, deterministic retry and no cluster
   configuration dependency.
2. **Application or statement timestamp.** Rejected because work can continue
   after sampling and commit late.
3. **`track_commit_timestamp` plus a two-phase finalize/read.** Rejected because
   it requires cluster configuration, commit-identity lookup and a second phase;
   pruning, disabled tracking or connection ambiguity could leave evidence
   unverifiable. It also solves a stronger “exact commit time” problem Gate E
   does not require.

## Consequences

Evidence certification versions advance to BODY V3, FINALIZATION V3 and Gate E
plan V2. Existing V2 evidence shapes are not accepted by this store. Migration
0034 is source-only until separately authorized and applied. The future provider
location remains `global`; credentials, provider observation, scoring, Gate E
verdict and DF-C remain outside this decision.
