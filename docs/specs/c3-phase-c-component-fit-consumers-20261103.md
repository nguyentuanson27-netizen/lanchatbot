# Component fit — consumer and authority manifest

This additive contract supports candidate-only component fit without changing the existing PRODUCT meaning. A missing legacy target remains PRODUCT-only. It does not add production wiring or create shop charts. Source availability and model acceptance are separate gates.

| Consumer/producer | Disposition and boundary |
|---|---|
| contracts `size-fit-target.ts`, legacy `SizeRecommendationProtectedClaimV1Schema`, protected `SIZE_FIT` | TARGET_AWARE serialization. Strict bounded target; explicit target parent must match product scope. Schema validation alone grants no fit/effect authority. |
| business-tools `recommendSize`, `createVerifiedSizeRecommendationClaim` | TARGET_AWARE for explicit new targets. Decision and producer target must agree. COMPONENT requires current measurements; parent/role-only accepted history cannot authorize a new component. Unmarked legacy engine calls retain PRODUCT behavior. |
| business-tools `buildProtectedClaimsFromVerifiedFactsV1` | TARGET_AWARE with independently supplied expectedFitTarget. Omitted expected target is PRODUCT-only. Aggregating fact-set API remains PRODUCT-only through that default. |
| worker `commerceComponentSizeSource` / ingress port | TARGET_AWARE. Unique exact BOM ref using existing catalog role mapping, fresh scoped POS source and published explicit parent/role/brand chart. No same-name delegation for COMPONENT. Source content/chart/BOM binding and actual source expiry returned by code. |
| worker customer state/snapshot/readback | TARGET_AWARE. At most four target entries; separate keys, exact claimId/contentHash, independently resolved target/source hash and fingerprint. Correction invalidates results; changed BOM/chart or backward source expiry revokes them. Forward heartbeat does not renew an existing claim. |
| realtime claim authorization/request matching | TARGET_AWARE. Explicit expected targets; component claim cannot satisfy a targetless PRODUCT request. Requests include target in dedup identity. Non-PRODUCT fit scope rejected. |
| semantic boundary / final gate | TARGET_AWARE. Exact claim/target/fingerprint/profile binding rechecked at actual time; source expiry clips claim validity. A prior PASS cannot authorize changed/expired data. |
| Gemini owner projection / verifier trusted serialization | TARGET_AWARE presentation only; preserves claim target and bounded state target bindings. Verifier prompt explains target semantics; it does not calculate size or authorize effects. |
| legacy business-tools guard | PRODUCT_ONLY_REJECT_COMPONENT before parent matching. |
| ContextV2 schema, candidate egress, Gate E, offline validation, historical C3 benchmark consumer | PRODUCT_ONLY_REJECT_COMPONENT. ContextV2 rejects component claims before any legacy conversion; candidate egress and unpinned conversion helpers also reject defensively. The frozen historical benchmark runner remains byte-identical, protected by the upstream ContextV2 contract. |
| historical benchmark materialization | PRODUCT-only corpus producer; value serialization preserves fields, upstream ContextV2 rejects unsupported component captures. No historical fixture or frozen result rewritten. |
| generic canonical effect readiness / sales-strategy barriers | Unchanged. Neither is component fit authorization. Component final authorization remains the explicit worker/realtime boundaries above; effect permission/receipts still use existing code paths. |

Observed RED before implementation: component requests returned `SIZE_SOURCE_UNAVAILABLE`. A second negative RED demonstrated explicit PRODUCT conversion of a marked component decision; now rejected. Tests also cover different component roles/IDs, missing target, stripped target coexisting with PRODUCT fit, request-key separation, absent expected target, old history, profile/source changes and expiry after verifier. Shared legacy tests exposed three regressions from treating legacy internal component IDs as the new explicit target contract; explicit decision target binding fixed these while preserving legacy calls.

Actual shop source captured on 2026-11-03 has no approved TOP/PANTS/SKIRT chart. Fixture mechanics passing does not make that source capability READY. This manifest does not approve S5 public checkout interruption, evaluator bridge, provider run, or Phase C GO.
