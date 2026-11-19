# Revision2 remediation — implementation and verification

Implementation base `df37d302446e41e825acc8dfca208dde5bb804fc`; refreshed main/C3 reference `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Executable review/test source `430ee4fa0b42c0003267f7dd4e681d3da3418f06`. [Approved plan](../../../../../docs/specs/c3-phase-c-remediation-plan-20261029.md). Report-only commits do not change this run identity. No provider diagnostic/campaign or publication/live send/merge/deploy. Historical source36 and primary grades remain immutable; Phase C remains BLOCKED.

## Changes

- S0: [all22 source/tool/terminal diagnosis](DIAGNOSIS.md), based on original raw evidence.
- S1: candidate and B adapters read current active policy separately from transaction-pinned policy. Snapshot retains active authority and labels the durable transaction policyRef. Mismatched transaction binding rejects readback without rewriting cart/quote/receipt or replaying effects.
- S2: source-bound evaluator inventory is prepared independently of verifier execution. Coverage follows registered subjects/discovery/order-only needs; source/POS/media color-binding metadata and content hashes are checked. Early handoff source reads remain observable. Actual scoped media lookup can supply an observation; hint/error cannot manufacture absence. Required shop-image missing remains silent handoff.
- S2: code-owned checkout clarification has an atomic-commit witness bound to request/recipient/revisions/receipt/exact accepted text. Collector validates that native question separately from the model-stage NO_SEND. Model FAIL/UNCERTAIN/unchecked text cannot use it, SAFETY cannot use it, and branch preregistration remains required.
- S2: bounded public intake retains persisted payment method and missing-field question fingerprint/count; raw name/phone/address and whole private messages stay excluded. `delivery: UNKNOWN` avoids inventing delivery from persisted state.
- S3: CompactV2 text remains65,536bytes; approved inline-image frames use the existing1,507,328byte limit. Numeric input-budget telemetry is separate. Optional media-hint omission behavior is preserved. No model/API/config limit increased.
- S3: no-color interpretation uses actual POS presentation variants. Variant labels do not prove customer selection/stock. Malformed tool argument remains fail-closed without coercion/retry.
- Development-source tooling retains legacy fingerprints, exact comparisons without product-code metadata and mandatory full A/B/C plus human near-duplicate review. Fingerprints are rederived from source bytes. Seal copies approved inventory/mappings and binds inventory/review/artifact hashes; preflight requires them and rechecks source/corpus binding before constructing a provider client.
- Synthetic PG fixture uses DB time strictly after prior accepted delivery. Production history cutoff/freshness remains unchanged. This corrects fixture causal ordering; it does not fix or prove absence of cross-clock production limitations.

No advice-prompt rewrite, new online semantic role, semantic router/parser, repair/reverify loop, generation retry or production entrypoint wiring.

## RED → GREEN and review

Observed regressions before fixes: PINNED returned as current read; active30k replaced by transaction25k; changed transaction binding accepted; missing checkout witness/public intake/evaluator/capture functions; approved60KB inline image rejected at text cap; missing actual no-color explanation. A discarded encoding-shrink fixture did not exercise its hypothesis and was not counted as RED. Broad tests exposed optional-media-hint compatibility, then its5tests passed after correction.

At d5f35b1f, independent review found three evidence issues: missing/wrong subject coverage could seal; media colorBinding lost; fingerprint arrays could be removed and rehashed. All closed at a124d173; independent15/15testsPASS. Follow-up found missing seal record still passed preflight. Observed RED (expected exception missing), fixed430ee4fa; independent11/11testsPASS. Same reviewer approved bounded code at430ee4fa, with final verification acceptance recorded separately below.

## PostgreSQL failures preserved

- d5f35b1f full run:51PASS, then N4 FAIL (`N4_HISTORY_MISSING`), remainder NOT_RUN; database dropped.
- a124d173 targeted N4:FAIL, database dropped. Actual accepted_at04:54:58.579Z exceeded next synthetic inbound cutoff04:54:58.317Z by262ms; DB clock ahead of client about1.05–1.17s. Scoped query returned0 without error, consistent with cutoff. No runtime regression established from this fixture.
-430ee4fa targeted N4:PASS, causal-order assertion and original history assertion preserved; database dropped,0provider generations.

## Verification

See [machine-readable commands/results and artifact hashes](VERIFICATION.json). Final source430ee4fa: worker focused346PASS/7files; business-tools protected/reply-assembler21PASS; complete worker eval750PASS/0FAIL/2existingSKIP; worker typecheck/build/lint exit0. Node tests use local stubs only, never simulated campaign results.

## Remaining qualification work

Development exposure scan02:6409artifacts/5123runtime rows/524exact/179without-products;1125artifacts need reviewed runtime mapping. Inventory hash `b5c0f736fffe878f25403a2641ae5b315021cf1d8472b517670602a20c97290e`, status PENDING. It is not an approved freshness/decontamination result. Complete mappings/full history and human near-duplicate review, fresh still-valid business sources, source-bound holdout and code-owned branch registration are required before a new seal/provider dispatch.

[Diagnostic scope](DIAGNOSTIC_SCOPE.json) remains NOT_REGISTERED_NOT_RUN:6cases/max37commerce generations, distinct from qualification. Sales behavior/naturalness after these code changes is not model-verified. No claim of model-failure elimination or semantic safety proof. Original12PASS/2FAIL/8UNRESOLVED stays unchanged; C3 parity unproved/C3 NOT_RUN, B_NOT_GO and A OWNER_BYPASS unchanged.

Final full PostgreSQL source430ee4fa: **68/68checksPASS and7/7named invariantsPASS**, clean source unchanged through completion, database dropped,0provider generations/live send. Targeted N4 alsoPASS separately. All requested deterministic checks are green; independent final verification disposition is in [REVIEW.md](REVIEW.md).
