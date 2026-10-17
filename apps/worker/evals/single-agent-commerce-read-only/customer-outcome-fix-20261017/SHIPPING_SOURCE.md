# Existing shipping data and the exact remaining gap

Owner says the source is already in the repository. The existing pipeline is indeed present:

- `apps/worker/src/pos-snapshot-runner.ts`: reads `shipping_eta!A:AZ`, caches the original sheet rows in `config:pos_sheet_batch`, publishes `catalog:shipping_eta`.
- `apps/worker/src/pos-snapshot-core.ts` `buildSheetConfig`: reads REGION/ENABLED/TRANSIT_MIN_DAYS/TRANSIT_MAX_DAYS and includes the resulting regions in every product catalog snapshot.
- `n8n/02_P2_2_POS_Snapshot_Redis_BOM_First.json`: retained equivalent ingestion logic.
- `packages/business-tools/src/catalog-projection.ts`: ETA lookup accepts an explicit canonical region key.
- `apps/worker/src/realtime-sales-catalog.ts`: private cart checkout tries a region name contained in the address, then only explicit source-wide fallback keys.

Current **read-only** source check `2026-10-17T04:41:31.670Z` inspected only the public shipping config/cache, with zero generation/source writes. [Captured current public config](shipping-source-readback.json). Source synced `2026-10-17T04:34:03.605Z`:

| REGION in Sheet | Canonical key in snapshot | Transit days |
| --- | --- | --- |
| NOI_THANH_HN | NOI-THANH-HN | 1–2 |
| MIEN_BAC | MIEN-BAC | 2–4 |
| MIEN_TRUNG | MIEN-TRUNG | 3–5 |
| MIEN_NAM | MIEN-NAM | 3–6 |

The cached original Sheet header is exactly `REGION, TRANSIT_MIN_DAYS, TRANSIT_MAX_DAYS, ENABLED`. No province/city list, address aliases or DEFAULT is present in these current rows. Existing source proves transit times **once the region is resolved**, not which shop key an arbitrary address selects. The historical audit also records the province-to-region question at `docs/phase0/01_legacy_flow_audit.md` section15.

Therefore the earlier statement “shipping data is absent” would be wrong. It is a missing address-to-current-key contract in this path, not missing transit durations. Broad tracked-repo searches and this current source check did not find the city mapping. No geography guess or new production regex was added. Current private-address checkout stays BLOCKED until an authoritative alias/mapping or a trusted structured region is connected. The current fixture is not altered to contain MIEN-NAM merely to obtain PASS; controlled synthetic tests remain separate from source-backed acceptance.

Access uses the existing owner-authorized [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) and source-session bridge. Only these two public config keys were projected; credentials and other cached tabs were not logged or committed. No source publication, migration, live message or service change.
