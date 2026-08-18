# Gate E-PREPROD — Registration and Evaluation Execution Plan

**Status:** `DRAFT_UNREGISTERED`
**Scope:** DF-P6 / DF10 prerequisite before DF-C
**Baseline:** `POST_BF_V1`
**Operating mode:** `ENGINEERING_PREPROD`

This plan defines the only admissible ordering for Gate E registration and
scoring. It does not register the draft artifacts, authorize a provider call,
claim a scored result, accept Gate E, deploy source, or authorize DF-C.

## 1. Immutable ordering

```text
source/tooling PR (this plan; DRAFT_UNREGISTERED)
  -> exact-head review + owner merge authorization
  -> merged prerequisite commit P
  -> one redacted provider-identity observation against P
  -> registration PR R binds P + observation + exact corpus/rubric/requests
  -> exact-head review + owner merge authorization for R
  -> scored run S proves R is an ancestor and predates S
  -> append-only redacted evidence + Gate E verdict PR
  -> explicit Gate E acceptance
  -> only then re-audit DF-C eligibility
```

No scored provider request may occur before the registration artifact is in an
immutable Git commit. Caller-provided commit strings or timestamps are not
provenance.

## 2. Provider identity observation

The observation uses the first canonical corpus item after sorting by
`itemId`. The exact request is rebuilt with `buildCandidateRequest`, compared
byte-for-byte through its registered `CandidateRequestIdentity`, and sent once
through `CandidateVertexTransport`.

The future provider resource location is fixed to `global`. This source change
does not provision credentials, perform observation, or authorize a request.

Only these fields may leave the observation boundary:

- expected and provider-observed model version;
- request-envelope SHA-256;
- exact trusted source revision, fixed freshly fetched trusted ref and governed
  clean/exact-head execution-boundary identifier;
- start/end UTC;
- `MATCH` or `MISMATCH` disposition.

The response body, generated reply, access token, authorization header,
credentials, and provider error detail are never returned or persisted. An
unknown/missing version aborts. A mismatched version is recorded as a redacted
mismatch and blocks registration pending an owner-reviewed amendment; it is
never coerced to the draft expectation.

The repository can prove artifact integrity and that the public observation
orchestrator enforces this boundary; it cannot cryptographically prove that an
arbitrary JSON file came from a real provider call. Therefore the observation
artifact must be produced by that orchestrator and committed through its own
owner-reviewed registration PR. The reviewed immutable Git artifact is the
external trust anchor; self-consistent JSON alone is not provider-call proof.

## 3. Frozen corpus and rubric

The source artifact is
`apps/worker/src/gate-e-frozen-artifacts.ts`.
Its admissible identities are independently pinned by
`apps/worker/src/gate-e-registration-policy.ts`; a self-consistent replacement
corpus or rubric is not registerable.

- Corpus version: `FROZEN_POST_GATE_BF_V1_CORPUS_V1`
- Corpus canonical SHA-256:
  `e70ce49dbd5a5afae19603342dfd10352bc6b965eebf4f77fe6d4fe1b0c9c4dd`
- Rubric version: `DF10_GATE_E_RUBRIC_V1`
- Rubric canonical SHA-256:
  `89a830334787c33a8790e6c4a73355e9210f8e449037fc993e30ce6470834986`
- Population: all 14 frozen items; no scoring sample.
- Data: controlled PII-free fixtures only; no raw transcript, customer hash,
  phone, address, email, provider payload, token, or credential.

The corpus covers BF-01 through BF-10 and explicit counterexamples for
correction, stale product switching, partial/full-look media, unsafe URL,
verified/unverified size, order review versus confirmation, missing product
with committed intent, and forbidden delivery/cart side-effect claims.

Every item is `MUST_PASS`. Required strata are claim safety, Context V2
integrity, side-effect safety, and MUST_PASS. The runtime protected-claim guard
must validate candidate wording during the scored workflow. Candidate output
V2 classifies every text segment as general wording, a verified claim bound to
an exact evidence content hash, a typed clarification, a typed requested
action, or a typed effect claim. Per-case obligations bind the exact Context V2
hash, product binding, required/forbidden claims, clarification/action class
and forbidden-effect matrix. A separate evaluation-only semantic-interpreter
call and policy receive customer-facing wording plus sanitized eligible claims,
but use the same registered model identity as the candidate and never receive
candidate-authored segment kinds, clarification/action labels or effect
labels. Scoring requires the interpreter-derived typed claims, requests and
effects to agree with the frozen case obligations and the candidate
declarations. Phrase detection is diagnostic telemetry only and cannot decide
the verdict. Strategy/CTA remain objective assertions. Style-only preferences
cannot change the verdict.

## 4. Candidate manifest and identity

The registration manifest binds:

- exact candidate source revision P;
- exact provider-observed model version;
- plan, corpus, rubric and provider-observation hashes;
- all 14 request identities, including model resource, system instruction,
  prompt content, response schema, generation config, safety settings and full
  request-envelope hash;
- the reviewed candidate source closure and canonical content fingerprint;
- execution caps below.

The manifest also binds the interpreter's model resource, system instruction,
input contract, response schema, generation config and safety settings through
one static policy hash. The manifest explicitly records
`SEPARATE_CALL_SEPARATE_POLICY_SHARED_MODEL_IDENTITY`; it does not claim an
independent judge model. A closed coverage-domain hash requires positive and
adversarial-negative calibration for every verdict-bearing effect,
clarification, requested-action and frozen protected-claim class. All 27
calibration probes bind their exact coverage, request identities and
expected-classification hashes. A missing, extra or duplicate coverage token
fails before any corpus request. Each dynamic interpretation
request is derived from the actual candidate-output hash; its full envelope
hash and the typed interpretation hash are recorded per corpus item. A policy,
probe or dynamic-envelope mismatch fails before a score is admissible.

The reviewed source closure is the exact path list exported as
`GATE_E_CANDIDATE_SOURCE_PATHS_V1`. It includes the full non-test source of the
runtime-loaded contracts and business-tools packages, their build/package
configuration, the candidate/evaluator sources and the lockfile. Each entry
binds the Git blob object ID and SHA-256 content hash. The manifest additionally
binds the request-envelope projection built from those sources, so a
source/build/request drift fails closed.

## 5. Git provenance proof

Before observation, registration, or scoring, the harness must derive rather
than accept:

1. exact source and registration commits from Git;
2. corpus/rubric/registration blob IDs using an argv-only
   `git rev-parse <commit>:<path>` boundary;
3. candidate source/content fingerprint from argv-only
   `git show <commit>:<path>`;
4. ancestry using `git merge-base --is-ancestor`;
5. committer time using `%cI` Git commit metadata;
6. a freshly fetched `refs/remotes/origin/main`, clean worktree and unchanged
   trusted ref before and after the operation.

Blob-introduction discovery walks only history reachable from the trusted
scored revision. Refs, commits and repository-relative paths are strictly
validated; no shell interpolation or caller-selected ref is accepted.

Registration fails if any blob, canonical hash, request identity, source
fingerprint, ancestor relation, or time ordering differs. The source
fingerprint is re-derived both at candidate revision P and at scored-run
revision S; both must equal the registered fingerprint. A registration artifact
must already be an ancestor of S, and its commit time must strictly precede the
run start; equality is inadmissible. The scored runner also requires this
verified proof and binds it into the
redacted evidence hash before it can call the model.

The scored runner has one public orchestration boundary. It accepts only the
registration path plus Git, provider-transport and deadline-enforcing
append-only evidence-store capabilities. It does not accept a caller-created proof, manifest, corpus,
rubric, clock, candidate output or request identity. It verifies clean exact
`HEAD == refs/remotes/origin/main`, reads and verifies the registration and
frozen artifacts internally, builds the exact provider request bytes at the
send boundary, applies the provider deadline around the entire transport, and
rechecks clean unchanged refs after the unfinalized evidence-body append. It
then asks the store to append a separate hash-bound finalization record with
`notAfter` equal to the original run deadline. The store must enforce that
deadline with its own DB clock at the final owned pre-commit admission boundary
in the same atomic transaction; abort is only an early-cancellation aid. The
body alone is always
`UNFINALIZED_TECHNICAL_EVIDENCE`. Verdict code receives only the two expected
hashes, retrieves both records plus immutable `admittedAt` metadata, and
requires the finalization admission boundary to be within `notAfter`.
`admittedAt` / `storeBoundaryAt` is a final pre-commit boundary timestamp, not
exact commit time or post-commit time. Store admission metadata is outside the
finalization content hash, so no receipt or third-record self-reference is
created. Caller-supplied self-consistent objects are not
certification evidence. Scored execution remains blocked until a concrete
store adapter proves these V2 semantics; a structural port or test fake is not
durable-store evidence. For an existing identical hash, `ALREADY_PRESENT`
returns the original admission metadata and performs no record or metadata
rewrite, including on a retry after `notAfter`. Existing conflicting content is
`HASH_CONFLICT`; the atomic deadline check applies before creating an absent
record. A concrete adapter must prove these ordering and idempotency properties,
not only the happy-path append.

## 6. Cost and isolation caps

| Boundary | Locked maximum |
|---|---:|
| Provider identity observation | 1 request |
| Scored population | 55 requests: 27 registered calibration probes + 14 candidate + 14 interpretation calls |
| Per-request output | 1,024 tokens |
| Total scored output | 32,768 tokens |
| Provider deadline | 30 seconds/request, including token/body handling |
| Full run deadline | 15 minutes |
| Concurrency | 1 |
| Page scope | `OFFLINE_NO_PAGE` |
| Side effects | `FORBIDDEN` |

The evaluation capability has no Messenger, Meta Outbox, Pancake, routing,
control-plane, cart/order mutation, or live authority port. Evaluation writes
are limited to a dedicated append-only evidence output. Complete logs remain
outside the repository and must be redacted before hashing. Repository evidence
contains hashes, bounded reason codes and aggregate results only.

## 7. Abort and rollback

Stop without scoring or Gate acceptance when any of these occurs:

- branch/head/blob/manifest/request identity changes;
- provider version is missing, unknown or mismatched;
- corpus/rubric was not committed before the run;
- registration is not an ancestor or does not predate the run;
- candidate source fingerprint or any request envelope differs;
- sensitive data appears in input/output/logs;
- a cap would be exceeded;
- any repository step runs and fails;
- the claim guard, Context integrity, side-effect assertion or MUST_PASS case
  fails;
- evidence-store write is partial, ambiguous, non-append-only, admitted after
  its atomic `notAfter`, or lacks trusted admission metadata;
- semantic-interpreter policy/probe calibration, output hash or actual request
  identity differs from the registered contract;
- the unfinalized evidence body has no valid hash-bound terminal finalization;
- no concrete evidence-store adapter proves transactional deadline enforcement.

Rollback is evidence-only: abort the run, retain the immutable failed evidence
with safe reason codes, make no Gate claim, and leave sales authority `LEGACY`.
No customer/live state exists to roll back because the workflow is offline and
side-effect-free.

## 8. Authorization boundaries

This source PR must stop before merge. After exact-head gates and review, the
smallest owner command is authorization to merge this prerequisite PR. Merge
does not itself authorize observation. A later explicit command must authorize
the one-request provider observation against exact merged P. Registration,
scored run, Gate verdict, Gate acceptance and DF-C remain separate boundaries.
