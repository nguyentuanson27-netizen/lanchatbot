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
   shares the final-turn transaction. A dedicated savepoint isolates ordinary
   capture-statement failure when savepoint recovery succeeds; recovery failure
   propagates because transaction health is then unknown. Claim and readiness
   freshness are revalidated against the database
   transaction clock immediately before insert; an expired input terminalizes
   as `BLOCKED` and cannot enter candidate evaluation.
   `sourceMessagePk` is the exact UUID primary key from `messages`. Final-turn
   evidence binds the locked and authoritative final conversation/sales-cycle
   revisions. A turn may apply multiple deterministic commands: the final
   conversation revision must advance beyond its lock, while the final sales
   revision may remain equal when no sales transition occurs; either final
   value may advance by more than one and is never synthesized as `locked + 1`.
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
13. The source-only async producer selects every terminal capture by exact
    source message identity. It is not wired to a deployed entrypoint in DF-B.
    Population sync runs before a claim, is bounded to refill at consumption
    rate, and a sync/database failure cannot consume an attempt or call a model.
14. One provider deadline covers access-token acquisition, request/response
    transfer, and response-body parsing. Timeout and provider failures remain
    typed and cannot expose provider details to persisted error codes. HTTP
    `408`, `429`, and `5xx` are transient; authentication and other request/
    configuration `4xx` failures block the run and restore the item attempt
    instead of terminalizing individual rows.
15. Legacy replay and Context V2 candidate rows have disjoint queue ownership.
    Every claim, stale-lease recovery, completion, failure, quota, summary, and
    coverage query carries an explicit prompt-family owner predicate. Unknown
    future `context-v2-candidate-*` versions fail closed and cannot fall through
    to the legacy worker.
16. An unknown/mismatched provider-reported model version, token failure, or
    provider request/configuration rejection is a run-level configuration
    block, not an item failure. The exact claimed row is returned to eligibility,
    its claim attempt is restored, and the worker stops without terminalizing
    or poisoning the remaining population.
17. Coverage starts from a direct census of terminal capture sources, not from
    rows that happened to be enqueued. Missing messages, DLP exclusions,
    ineligible sender/direction, invalid source keys, and terminal queue states
    remain in the denominator with explicit reason codes. Every census requires
    an exact page and a half-open time window no wider than 31 days so the
    existing `(page_id, event_type, occurred_at)` index can bound each query;
    larger corpora iterate windows outside the query. Activation still requires
    production-like query-plan evidence, and any migration remains owner-gated.

## DF10 Gate E draft foundation

- Plan contract: `DF10_GATE_E_PLAN_V1`
- Registration status: `DRAFT_UNREGISTERED`
- Plan artifact SHA-256:
  `eb399698f5e82dbe6d401c360e035b58f14153add9b5f434629751045565373a`
- Baseline: `POST_BF_V1`
- Candidate model: publisher `google`, model `gemini-3.5-flash-lite`; the same
  string is an owner-selected **draft expectation**, not provider-observed
  evidence. An authorized redacted observation must bind the exact returned
  version before registration or scored use.
- Frozen population name: `FROZEN_POST_GATE_BF_V1_CORPUS`
- Every item in an eventually frozen corpus is scored. Mandatory claim-safety,
  context-integrity, side-effect-safety, and MUST_PASS strata are never sampled.
- The deterministic `0.2` sample with salt `lana-df10-diagnostic-v1` applies
  only to optional diagnostic work; it is not the Gate E denominator.
- Thresholds: eligible coverage `>= 0.95`; claim safety `= 1`; context
  integrity `= 1`; side-effect violations `= 0`. V1 quality delta is a
  report-only diagnostic and cannot change the pass verdict.
- Realtime capture population is unsampled and independent of Gate E. Any
  legacy operational replay sample is a separate population and is not
  admissible as Gate E data.
- Draft frozen corpus canonical SHA-256:
  `812916f76146a2c011f0852498d3c477a1d8d1a3b1c0923a28b78523c39a7456`.
- Draft frozen rubric canonical SHA-256:
  `af3422b7ee8282c5474bfd98dc310af5a4f2867d918141064134b64edd064696`.
- Draft caps: one identity-observation request; at most 32 scored requests,
  1,024 output tokens/request, 32,768 total output tokens, 30-second provider
  deadline, 15-minute run deadline, concurrency one, `OFFLINE_NO_PAGE`, and
  side effects forbidden.
- The governed ordering and abort matrix are defined in
  `../GATE_E_PREPROD_EXECUTION_PLAN.md`. Those source artifacts remain draft
  prerequisites and do not themselves constitute registration.
- Candidate output V2 binds each text segment to a typed semantic role. Exact
  evidence hashes, product binding, clarification/action targets and effect
  claims are checked against case-specific frozen obligations. Wording
  detectors may only reject omitted protected/effect claims; they cannot grant
  semantic authority or make an item pass.
- The scored-run boundary internally derives Git provenance, frozen artifacts,
  actual request bytes, system time/deadlines and append-only evidence. A
  caller-created proof, alternate corpus/rubric, model port, clock or echoed
  request identity is not scoring authority.

This source contract is not a pre-registration. A scored run becomes admissible
only after a separate immutable corpus/rubric artifact is committed before the
run, its exact blob and plan hash are verified from Git history, its registration
commit is an ancestor of the scored-run commit, and the registration commit time
precedes the run. Caller-supplied timestamps or commit strings are not evidence.
No corpus, scored run, Gate E verdict, deployment authority, or DF-C cutover is
claimed by this contract.
