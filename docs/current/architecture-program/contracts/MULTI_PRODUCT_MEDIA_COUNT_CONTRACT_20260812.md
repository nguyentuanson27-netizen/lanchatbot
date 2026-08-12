# Multi-product text and media-count contract (2026-08-12)

Status: implementation review contract for the realtime-worker behavior PR.

## Text product references

- There is no product-count cap. Resolve every distinct valid normalized/exact
  product code in first-occurrence order.
- Duplicate surface forms share one authority slot and one result. Unresolved
  references remain explicit and do not erase later valid products.
- Business fact query batches retain all references. Product-level fact work
  runs with fixed concurrency `3`; facts inside one product remain sequential.
- Completion order cannot reorder customer-visible products. A dependency
  failure rejects the complete fact batch so partial facts cannot masquerade as
  a complete response.
- Existing message-size, deadline, quota, fact-authorization and response-group
  boundaries remain unchanged. Product count alone never causes truncation,
  disclosure, or handoff.

## Image attachments

- Up to 10 inbound images follow the existing media behavior.
- More than 10 inbound images trigger canonical `SILENT_HANDOFF` for the whole
  turn with bounded reason `MEDIA_INPUT_LIMIT_EXCEEDED`.
- This guard runs before URL/product/media resolution, model generation,
  business facts, or grounding. It produces no customer reply/outbox unit and
  records no raw URL or image data in safe handoff details.
- For mixed text and media, the image guard wins. No text product is resolved
  when the image count exceeds 10.
- Transactional commit identity remains the exactly-once boundary for replay,
  duplicate delivery, and lost acknowledgements.

## Explicit non-goals

No FSM/state shape, database migration, control-plane policy, routing,
allowlist, Messenger delivery, or service topology change is authorized by
this implementation contract.
