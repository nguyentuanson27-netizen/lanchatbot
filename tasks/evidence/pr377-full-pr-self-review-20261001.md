# PR377 whole-PR self-review - 2026-10-01

## Scope and verdict

Reviewed the complete GitHub PR377 diff against integration base
`7c1f10f2a27db2b6258581f21955d1bc62681821`, through pushed head
`bff00e05c0eba2bf3ea656a9ff46b910d4ae0041`, plus this local P10-P12 increment. Reconciled the owner's
concurrent P06-P09 pushes before preparing the patch. This is same-agent
self-review (not an isolated or independent reviewer).

**Verdict: REQUEST CHANGES for final merge/activation approval.** The source fixes
below are included and their focused tests pass, but exact new-head CI and the
retained model-quality/coverage acceptance have not been satisfied. P11 was
explicitly deferred, not replaced by deterministic tests. No additional source
blocker was identified in this bounded static/regression review after the fixes;
that is not a proof of arbitrary Vietnamese model-output safety.

## Findings fixed in this increment

| Priority | Finding / location | Resolution and evidence |
|---|---|---|
| Required - cost/admission | Opt-in C3 in `realtime-runner.ts` bypassed the existing generation quota. | Share one existing AI-turn admission across roles/retries; deny/error makes zero transport calls. Four RED assertions; nine server cases GREEN. No new budget service or changed limit. |
| Required - correctness | `runTrackCStrategyContractCore` discarded its selected task when Responder transport/JSON failed. | Bounded live recovery from the already-validated answer task, with original diagnostics and all egress checks. No added model call/action. |
| Required - completeness | A failed draft with null prose could lose the unconfirmed half of a compound question. | Preserve safe limitation text; otherwise explicitly mark the whole answer incomplete. Do not infer a missing commercial property from `goal`. |
| Required - partial success | A thrown business-fact read aborted independent successful reads. | Error envelope local to the requested read; no facts/authority, later reads continue. Regression checks final rendered multi-product reply. |
| Required - privacy | Durable Inbox error reasons used raw exception prose. | Retain bounded machine codes or a generic failure code; commit-fault regression proves retry state does not contain customer/credential-like prose. |
| Required - observability | Legacy model fields omitted C3 role calls and hid the failed stage on recovered answers. | Optional JSON event fields for actual C3 calls and failureStage; null usage remains unknown, RETURNED is not quality success. No new database schema. |

The initial P06-P09 push omitted two business-tools files; the owner corrected
that at 11f045ed. It is resolved in this baseline, not claimed as a P10 fix.

## Whole-PR review coverage

**Correctness and state.** Read Producer schema/source binding, canonical intent
bridge, same-turn input application, policy plus commerce routing, variant edits,
recipient/payment/preview flow, current-cart readback, and consumer/readiness
changes. Kept product-question evidence distinct from cart effect authority.
Regression suites cover independent purchase versus conditional consideration,
selection versus query, changed product/size, stale/ambiguous cart data and
human/post-sale paths. Fakes cannot prove that the real Producer always interprets
a clause correctly; confidence/source spans are not semantic proof.

**Facts and output.** Reviewed selectable evidence, opaque variant mapping,
per-field projection, full-fact reordering, independently re-derived same-offer
price comparison, final egress checks, and bounded recovery. Price/stock/fit/policy
and transaction receipts are not sourced from conversational `goal`. Reordering
retains every selected fact; it is not free paraphrase. A weaker or missing source
must not be repaired by model prose. Final checks remain enabled in this patch.

**Architecture and simplicity.** Producer interprets input, Strategist selects
strategy/evidence, Responder words the compiled task, code owns authorization.
No extra online reviewer, model router, memory store, service or framework was
introduced. Existing kernel/CAS/Inbox/Outbox/search/history/telemetry paths are
reused. The first-contact no-question-when-known change is an explicit P06-P09
spec amendment, not an accidental relaxation in this patch. Legacy prompt-hash
routing only replaces the exact known revisions, not arbitrary instructions.

**Security and isolation.** Reviewed external/model input validation, scope,
source/revision/freshness checks, human-owner no-call, DRY_RUN/no-send, private
checkout boundaries, event metadata and exception leakage. The new call observer
stores no request/output/URL/error prose. Quota denial fails closed. Existing
SOURCE_BOUND_CUSTOMER_INPUT support is restricted to the validated bridge and
does not replace POS/policy/current-cart/commit checks. No authority switch,
allowlist expansion, secret, provider activation or live endpoint is included.

**Search/history/performance.** Alternative search is bounded, excludes current
and rejected IDs, and validates price/stock against POS facts. It does not promise
all catalog alternatives were exhausted. Price comparison uses compatible offers,
units/currency and independent valid operands, not model value judgments. History
reuses the 30-message source plus inbound/context, with privacy limits; it is not
unbounded recall. New P10 code adds no model call, lookup retry or database write;
lookup concurrency and retry counts are unchanged. No latency improvement claim
is made from fake timings.

**Tests, evaluation and CI.** Reviewed changed tests, runtime server composition,
frozen manifest/validator changes, the evaluation error-handling fix, pinned
Qdrant/CI isolation and source/evidence documents. No benchmark examples/rubric
were changed for this increment. Opt-in real-model tests remain distinct from
scripted controls. No test was deleted or made weaker to hide a failure. The
export stages new files explicitly to avoid repeating the omitted-file incident.

## Residuals that must remain visible

1. **New-head CI is required.** Local full worker has five missing-historical-tree
   failures; PostgreSQL-dependent tests are skipped. Old head 11f045ed's green run
   does not certify this patch. No CI_UNAVAILABLE_FALLBACK is claimed.
2. **P11 is deferred.** Real-model understanding, helpful objection handling,
   natural voice, branched dialogue and model comparison still need evidence on
   the final source. Scripted PURCHASE_CONFIRMED is not sales conversion.
3. **Semantic guard scope is finite.** Lexical uncertainty exceptions cannot
   prove all free prose safe. The patch does not claim every P03/P04 acceptance
   is closed, and does not relax factual/effect authority to improve wording.
4. **Continuity and retrieval remain bounded.** Questions outside stored history
   and uncaptured decision criteria can be lost; a shortlist is not the complete
   catalog. Existing P05-P09 coverage residuals are not silently closed here.
5. **Recovery is deliberately narrow.** With no trustworthy draft, the fallback
   declares incompleteness rather than reliably naming the missing property.
   Action tasks, missing evidence, identity failure and cancellation do not use
   selected-facts recovery. Failed commits do not separately persist call events;
   this increment is not a billing ledger or independent event service.

## Quality gates and rollback

See [verification](pr377-p10-p12-verification-20261001.md) for exact commands,
counts and environment limits. P12 source/spec/self-review and patch export are
performed; the full Definition of Done is NOT declared complete. Solo PREPROD
allows self-review, so an independent reviewer is not invented as a new mandatory
gate. Revert the eventual patch commit for source rollback; there is no migration
or live activation to undo in this deliverable.
