# Catalog to C3 evidence path — synthetic verification

The repository contains no approved catalog/Sheets snapshot suitable for a
real field-coverage denominator. This report checks wiring on the existing
synthetic SQ149 fixture; it does not estimate real catalog completeness or ask
the owner to re-enter data.

| Field group | Source and producer | Persisted/read path | C3 egress |
|---|---|---|---|
| Materials, component materials, colors, styles, silhouettes, occasions | Explicit active registry overrides in `p23c-profiles.ts`; XML contributes search hints only | `p23c-jobs.ts` copies `product_attributes` into approved Qdrant payload; runtime product facts expose typed attributes | `track-c-c3-attribute-projection.ts` produces one bound projection per populated field |
| Design attributes, wear properties, care, back coverage, complexity | Structured registry JSON/enums; `UNKNOWN` is absent | Same payload and source hash, independently versioned from XML description | Field projections keep the curated value/wording and product ID |
| Price, stock, cart total and shipping | Current POS/policy readback | Runtime claim or current-cart binding | Claim hash, freshness, product/cart scope and final guard |
| Delivery ETA | Fulfillment preparation plus destination transit, when both exist | POS/business facts provide typed `deliveryEta`; product facts alone leave `etaToCustomer` empty | ETA claim only with complete destination-bound components |
| Images | Approved asset list and media selection | Actual outbound attachment/effect | No “sent image” claim without the corresponding effect |

The synthetic producer/readback check in `p23c-jobs.test.ts` confirms SQ149
fields survive profile construction and approved job payload creation with an
independent attributes content hash. `track-c-c3-attribute-projection.test.ts`
checks all populated field projections and missing-field omission. The C3
runner tests bind selected projections to their content hashes and final
egress. These are source-path checks, not a measurement of live data coverage.

Missing approved snapshot remains a T06 evidence gap. The runtime still must
not infer benefits such as coolness, durability or superiority from a material
label. A real coverage rate requires a read-only approved snapshot with
product IDs, field values and versions; no live query was made in this task.
