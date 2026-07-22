# @lana/business-tools

Deterministic business-authority module for the send-disabled Phase 2 chatbot.

## Authority boundaries

- Qdrant supplies only stable discovery fields: canonical product ID/code, aliases, descriptive attributes, catalog version and image URLs. Runtime schemas reject dynamic price, stock, promotion, shipping and ETA fields.
- Exact canonical code is checked first, alias second, stable text/image similarity last. A low top score or small Top-1/Top-2 gap returns at most three candidates and never authorizes a price response.
- POS live data is the preferred price/inventory authority. An approved POS snapshot may be used only while fresh. Missing config, shop error, stale data and missing SKUs fail closed.
- Google Sheets supplies the parent-product fulfillment policy. The same policy applies to set components, colors and sizes. Customer delivery ETA is calculated from parent preparation days plus a separately verified transit fact; no date range is invented.
- The AI produces a proposal only. `guardAgentProposal` rejects unverified product/attachments and unauthorized price, stock, ETA, promotion, freeship and shipping-fee claims. Every returned `GuardedReplyPlanV1` has `sendAuthorized=false`; ownership and delivery layers must make the later send decision.

## Inventory rules

- Supported sizes: `S`, `M`, `L`, `XL`; other sizes are ignored.
- Warehouse rows are summed by canonical product code, normalized color and size.
- `SV*`: `MIN(CODE-AO, CODE-CV)` for the same color and size.
- `SQ*`: `MIN(CODE-AO, CODE-QUAN)` for the same color and size.
- `CB*`: separate `SET_CV` and `SET_QUAN`, each paired with `CODE-AO` for the same color and size.
- Other parent codes are looked up directly.
- Fail-closed outcomes: `NOT_FOUND`, `CONFIG_NOT_FOUND`, `SHOP_ERROR`, `STALE`.

All provider interfaces have in-memory fakes. This package contains no POS, Qdrant or Google Sheets HTTP client and performs no external side effect.
