# Durable Contract — Model Evaluation Boundary

This contract separates the byte-frozen legacy generation baseline from every
offline or replay candidate. It is source architecture only and never grants
runtime authority, deployment, side effects, or Gate acceptance.

Required properties:

1. Realtime generation and the V1 replay use one baseline capability and the
   same serialized request envelope for each baseline method. The baseline
   capability and its resolved request-builder dependency graph do not import,
   accept, or render Context V2. Realtime orchestration may import Context V2
   only to persist a shadow capture; it may not pass Context V2 into this
   capability or its request builders.
2. A Context V2 candidate uses a distinct capability whose input requires an
   integrity-valid snapshot. Candidate inputs are never optional and never
   represented by `null` on the baseline path.
3. Baseline and candidate capabilities may share authenticated HTTP/OAuth
   transport, but they do not share prompt builders, request builders, response
   identity rules, or public generation methods.
4. The exact baseline request envelope is regression-pinned to its approved
   source baseline. Any intended change requires the applicable realtime
   differential evidence and approved deviation; a prompt-version label alone
   is not evidence of byte equivalence.
5. Candidate egress passes through one allowlisted sanitizer. Candidate request
   identity covers the model resource, system instruction, prompt/content,
   response schema, generation configuration, safety settings, and every other
   candidate-affecting field actually sent to the provider.
6. Offline/replay candidates are side-effect-free verification tools. They
   cannot send customer messages, mutate commerce/conversation state, authorize
   claims, or become a third live semantic authority.
7. A scored result is inadmissible when request identity, provider-observed
   model identity, corpus/rubric identity, source revision, or pre-registration
   provenance is missing, unknown, stale, or mismatched.
8. DF-B keeps the source capture gate default-off and has no environment, page,
   routing, or control-plane activation wiring. When separately authorized and
   enabled, realtime attempts one minimal terminal capture (`BUILT` or
   `BLOCKED`) for every exact inbound source message. The successful insert
   shares the final-turn transaction, but a dedicated savepoint makes capture
   failure incapable of rolling back conversation state, outbox, or the inbox
   commit. Claim and readiness freshness are revalidated against the database
   transaction clock immediately before insert; an expired input terminalizes
   as `BLOCKED` and cannot enter candidate evaluation.
9. Capture identity is content-addressed from the exact source message primary
   key and terminal payload. A retry of identical content deduplicates; two
   different terminal payloads for one source key remain visible and make the
   source ambiguous instead of being silently tie-broken.
10. Candidate eligibility uses exact `sourceMessagePk` as correctness. A bounded
   conversation/time range may be added only as a partition-pruning hint and
   cannot replace or weaken the exact-key predicate.
11. Capture lookup returns typed outcomes for valid, invalid, blocked,
    ambiguous, not-yet-terminal, absent-after-deadline, and database-error
    states. Only a valid built capture may call a candidate model. Database
    errors are retryable, do not consume a model attempt, and are never mapped
    to a missing snapshot.
12. Candidate-worker readiness probes its read-only capture permission before
    accepting work. A missing capture becomes terminal only after the locked
    deadline; blocked, invalid, ambiguous, and deadline-expired cases remain in
    coverage accounting with reason codes.
