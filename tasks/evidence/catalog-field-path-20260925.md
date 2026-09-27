# Catalog to C3 evidence path — source coverage and synthetic verification

The repository contains no approved catalog/Sheets snapshot suitable for a
real field-coverage denominator. The source-path check uses the existing
synthetic SQ149 fixture. A later read-only VPS inspection supplies a
point-in-time source denominator below; it does not ask the owner to re-enter
data or turn extraction states into approval.

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

## Read-only source coverage on the supplied VPS

At 2026-09-25 10:08–10:13 UTC, the owner-supplied VPS was inspected without
changing services, data, routing or customer traffic. The POS worker's existing
`config:pos_sheet_batch` Redis cache was written at
`2026-09-25T10:01:15.158Z`. Its `product_registry` tab has 113 data rows,
112 marked active. All 112 active product IDs match the 112 current
`catalog:offer:LANA:*` POS snapshots in both directions. The POS snapshots
were schema v3 and `data_status=OK`; each had an offer, fulfillment policy,
selling rules and shipping ETA table. Across them were 1,192 offer rows with
price and stock fields populated. This establishes source presence, not the
correctness of each offer or a customer-facing delivery promise.

Among the 112 active registry rows, explicit curated fields were populated as
follows. `UNKNOWN`, blank, `{}` and `[]` do not count. JSON fields were also
parsed to exclude empty/unknown-only objects.

| Registry field | Populated active rows |
| --- | ---: |
| `MATERIAL_OVERRIDE`, `MATERIAL_COMPONENTS_OVERRIDE`, `STYLE_OVERRIDE` | 101 each |
| `DESIGN_ATTRIBUTES_JSON` | 91 |
| `WEAR_PROPERTIES_JSON` with at least one usable property | 78 |
| `SILHOUETTE_OVERRIDE` | 65 |
| `COLOR_OVERRIDE` | 37 |
| `OCCASION_OVERRIDE` | 22 |
| `DESIGN_COMPLEXITY` | 8 |
| `CARE_INSTRUCTIONS` | 3 |
| `BACK_COVERAGE` | 0 |
| `DESCRIPTION_OVERRIDE` | 107 |

`WEAR_PROPERTIES_JSON` was present as text in all 112 rows, but 34 were
unknown-only; the usable count is 78. No JSON parse errors were observed in
the design or wear fields. Registry `REVIEW_STATUS` values were 101 `AUTO_OK`,
6 `NEED_REVIEW` and 5 blank. Those values are extraction review states, **not**
the image publisher's `APPROVED` authority; this audit does not promote them
to approved customer claims.

The realtime worker and publisher both point to Qdrant collection
`lana_multimodal_data_v2`. A bounded read-only scroll of its existing payloads
returned 1,055 active image points across 107 products, all with image metadata
`APPROVED`, but **zero** points with `product_attributes`. A full-payload
single-point field-name readback confirmed the field is absent in the deployed
index. Repository code in `p23c-jobs.ts` can produce this field, and
`qdrant.ts` validates it before runtime use, but that source change has not
been deployed or republished here. Therefore current live index coverage for
the new typed attribute path is **0/107 indexed products**, even though the
registry cache has source values. No Qdrant write or backfill was performed.

The runtime still must not infer benefits such as coolness, durability or
superiority from a material label. T06 remains open: a future authorized
preproduction publish/readback must demonstrate that verified attributes reach
the index and canonical evidence, then measure claim coverage against the
appropriate product denominator. This report is a point-in-time aggregate,
not a saved copy of customer or raw catalog records.
