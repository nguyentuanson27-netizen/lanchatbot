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

Only these fields may leave the observation boundary:

- expected and provider-observed model version;
- request-envelope SHA-256;
- start/end UTC;
- `MATCH` or `MISMATCH` disposition.

The response body, generated reply, access token, authorization header,
credentials, and provider error detail are never returned or persisted. An
unknown/missing version aborts. A mismatched version is recorded as a redacted
mismatch and blocks registration pending an owner-reviewed amendment; it is
never coerced to the draft expectation.

## 3. Frozen corpus and rubric

The source artifact is
`apps/worker/src/gate-e-frozen-artifacts.ts`.
Its admissible identities are independently pinned by
`apps/worker/src/gate-e-registration-policy.ts`; a self-consistent replacement
corpus or rubric is not registerable.

- Corpus version: `FROZEN_POST_GATE_BF_V1_CORPUS_V1`
- Corpus canonical SHA-256:
  `812916f76146a2c011f0852498d3c477a1d8d1a3b1c0923a28b78523c39a7456`
- Rubric version: `DF10_GATE_E_RUBRIC_V1`
- Rubric canonical SHA-256:
  `af3422b7ee8282c5474bfd98dc310af5a4f2867d918141064134b64edd064696`
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
and forbidden-effect matrix. A conservative omitted-effect detector is a
fail-closed backstop only; it is not semantic authority. Strategy/CTA remain
objective assertions. Style-only preferences cannot change the verdict.

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
2. corpus/rubric/registration blob IDs using `git rev-parse <commit>:<path>`;
3. candidate source/content fingerprint from `git show <commit>:<path>`;
4. ancestry using `git merge-base --is-ancestor`;
5. commit time using Git commit metadata;
6. clean worktree and unchanged remote ref before and after the operation.

Registration fails if any blob, canonical hash, request identity, source
fingerprint, ancestor relation, or time ordering differs. The source
fingerprint is re-derived both at candidate revision P and at scored-run
revision S; both must equal the registered fingerprint. A registration artifact
must already be an ancestor of S, and its commit time must precede the run
start. The scored runner also requires this verified proof and binds it into the
redacted evidence hash before it can call the model.

The scored runner has one public orchestration boundary. It accepts only the
registration path plus Git, provider-transport and append-only evidence-store
capabilities. It does not accept a caller-created proof, manifest, corpus,
rubric, clock, candidate output or request identity. It verifies clean exact
`HEAD == refs/remotes/origin/main`, reads and verifies the registration and
frozen artifacts internally, builds the exact provider request bytes at the
send boundary, applies the provider deadline around the entire transport, and
rechecks clean unchanged refs before and after atomic evidence append.

## 6. Cost and isolation caps

| Boundary | Locked maximum |
|---|---:|
| Provider identity observation | 1 request |
| Scored population | 32 requests; current frozen corpus is 14 |
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
- evidence-store write is partial, ambiguous or non-append-only.

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
