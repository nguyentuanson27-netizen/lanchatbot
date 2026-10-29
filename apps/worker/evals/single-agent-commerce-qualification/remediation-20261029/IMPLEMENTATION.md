# Revision2 remediation — implementation record

Implementation base `df37d302446e41e825acc8dfca208dde5bb804fc`; refreshed main remains296cdcf, also the unchanged C3 reference. Approved [plan](../../../../../docs/specs/c3-phase-c-remediation-plan-20261029.md). Status: built and under verification; independent implementation review/real-PG run pending at this savepoint. No provider diagnostic/campaign, no publication/live send/merge/deploy. Historical source36/primary grades remain immutable and Phase C BLOCKED.

## Implemented

- S0 [all22 source/tool/terminal diagnosis](DIAGNOSIS.md). Read actual original raw, not primary re-grading.
- S1 read adapters return current active-pointer sources, not the separate transaction-pinned port. Effects retain active policy evidence and separately label transaction policyRef; mismatched durable policy is rejected without rewriting committed cart/receipt. No global resolver/status relaxation or repin/migration.
- S2 pre-seal evaluator-only source inventory contains source-bound product/POS/media data independently of verifier execution, with derivation/content hash checks. Actual source reads are recorded on early handoff paths as well. Real scoped media lookup can bind an observation; hint/error cannot manufacture absence. Required-media missing still follows silent handoff.
- S2 native checkout clarification producer supplies a witness only after atomic commit, for bounded code-authored non-protected questions. Collector/validator require matching native result, receipt, accepted Outbox/text, recipient and revisions; model FAIL/unverified text cannot use this path. Branch registration remains mandatory before a new seal. Existing production entrypoints remain unwired.
- S2 public intake projection retains code-persisted payment method and missing-field question fingerprint/count. Raw name/phone/address and whole private messages remain excluded. `delivery: UNKNOWN` avoids claiming a question reached the customer just because state persisted.
- S3 CompactV2 text remains65,536bytes; image frames use their already existing1,507,328byte limit. The old final presentation check applied the text cap to approved inline-image frames. No model/API/config limit increased. Optional media hints retain prior omission behavior; no need to rewrite advice prompt. Numeric request-budget breakdown is telemetry only.
- S3 no-color interpretation comes from actual POS presentation variants, not nonexistent colors on STOCK claim values; labels are not customer selection or stock proof. s11 malformed argument remains fail-closed with no coercion/retry and is a model-reliability residual.
- Source inventory tooling retains prior approved fingerprint lists and adds product-independent exact checks, source-byte readback and mandatory full A/B/C/near-duplicate review before native seal. Unsupported wire mappings stay PENDING rather than certifying a fresh holdout. [Diagnostic scope](DIAGNOSTIC_SCOPE.json) is NOT_REGISTERED_NOT_RUN,6cases/max37commerce generations, separate from qualification.

## Observed RED → GREEN

New regressions observed before their fixes: native read returned PINNED instead of RESOLVED; active30k replaced by transaction25k; changed transaction policy readback accepted instead of rejection; checkout witness method absent; public intake projection absent; evaluator/source and clarification-capture exports absent; CompactV2 rejected a60KB inline image against text cap; actual POS no-color projection had no explanatory field. These are deterministic/local fixture tests, not model results.

One discarded test fixture hypothesized raw-vs-presented encoding shrinkage but did not exercise that boundary; it was not counted as a valid RED. Inspection showed s06 called view_product_media and the actual reproducible bug was the mixed image/text limit. A broad regression then exposed changed optional hint behavior; fixed and its5testsPASS. No claim every observed model failure is fixed by code.

## Commands actually run so far

- New targeted Node/Vitest regressions above, with failures retained in session output before fixes.
- Focused worker9files398PASS before the final policy-binding guard; final effects/session repeat87PASS includes guard regression.
- Full worker eval run initially744PASS/1FAIL/2SKIP (media hint compatibility), repeat746PASS/0FAIL/2SKIP. Later focused protocol/provider group144PASS. Additional legacy-inventory regression2PASS. Final exact implementation checks will be recorded after source savepoint/review changes.
- Worker build/typecheck/lint exit0 before final guard; to be repeated for final source. No shared package source change.
- Offline exposure scan:6409artifacts,5123runtime rows,524unique exact fingerprints after retaining2legacy lists. Scan is PENDING; unsupported wire/source mappings require review. This is not decontamination proof or approved fresh-corpus evidence. Full inventories stay outside Git; no private seeds/credentials copied into this record.

## Still separate from implementation approval

Fresh reviewed source/corpus, code-owned branch registrations and independent holdout/inventory mapping approval are required before provider dispatch. Diagnostic source inputs remain pending; no run identity is fabricated. C3 parity remains unproved, C3 NOT_RUN. Build/review approval does not turn the original12PASS/2FAIL/8UNRESOLVED into qualification PASS. Sales behavior and naturalness after these changes are not model-verified.
