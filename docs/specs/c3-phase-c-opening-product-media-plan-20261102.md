# Phase C — opening product photo rule, owner-approved 02/11/2026

Base `9b6fec45abec3c3e98f5505504842ac4755fa0a3`. Owner selected: **every first-contact reply for an identified product includes a product photo, including ETA/ACK**. This supersedes the old no-image ETA/ACK control for the newly activated rule. No verifier prompt/schema/model/role change is required; no provider run/deploy/live send is included.

## Trusted producer and activation

Use fixed code-owned `FIRST_CONTACT_IDENTIFIED_PRODUCT_IMAGE_V1` on ingress/composition. Current Phase C candidate source identity/preflight must bind and require the rule version, and actual provider driver must pass it. Legacy unscoped paths remain explicit compatibility controls, not proof that the new rule covers them; frozen prior registrations/grades stay immutable and cannot match current candidate identity.

Derive first-contact status from a scoped durable existence read, not the truncated30-row dialogue. Accepted Meta Outbox or imported HUMAN outbound before the source batch proves returning; CUSTOMER-only rows, pending/rejected drafts and current-turn receipts do not. Bind page/conversation/customer. The cutoff is strictly before the earliest durable Inbox receivedAt and source occurredAt, preventing a replay/current-turn acceptance from proving prior contact. Missing cutoff/query/error becomes unknown; known-product output then fails closed.

## Required media and lifecycle

Cover all admitted PRODUCT refs in the final trusted snapshot, regardless of retained focus, up to existing4product/4image limits. A FINAL aboutB must not pass with onlyA's photo. No customer prose/owner-declared intent/evaluator labels determine the rule.

Run deterministic preparation only after valid/public FINAL and before trusted snapshot/binding/verifier. Reuse an eligible selected product photo, not view-only bytes or SIZE_GUIDE. Keep known colour binding and existing failed-colour handoff; never retry a failed colour lookup as generic. For each missing required product, debit one primitive before I/O and use existing selector with an internal code-only count1. Preserve existing selections; do not drop images to make room. Existing6calls/2owner tool rounds/3owner generations/retry0 remain; code preparation creates no new owner round. Budget/image-cap/source/history failure uses real silent handoff or NO_SEND if handoff cannot be proved. Recheck authority/terminal after preparation. No media/fact changes after verifier.

Egress independently compares the required set with actual response-group images before atomic enqueue, including earlyFINAL/read_product/quote_product/evaluation bypasses. Existing durable media binding/readback/freshness/revision/recipient/permission/privacy and sequence0 group gate remain authoritative. No text-only first sequence may escape a missing/ineligible photo.

Opening private/native code-only paths need a prior accepted shop output to continue. Without that proof, route to silent handoff before advancePrivateCheckout. First-opening confirm_purchase, including add→confirm batch, is fenced before any batch effect because native checkout output does not yet support the required opening media group. Returning checkout remains unchanged. This first-direct-checkout capability limitation is disclosed and not counted as sales completion; HUMAN/NO_SEND/committed handoff remain output-free.

## Verification and review

Same independent reviewer: initial REQUEST_CHANGES on missing all-product coverage and code-only exemption; revised bounded design APPROVED with durable-proof/count1/budget acceptance gates. Implementation still needs review.

Observed RED→GREEN before accept: earlyFINAL quote/ETA/ACK attach photo; missing/invalid/expired/photo-chart-only source silent handoff; read_product and quote_product cannot bypass; focusA/newB and multiple products; max4 images and6calls; reuse/no retry; returning no forced image; customer-only history still opening; unknown history; private-first/nooutput; first add→confirm zero effects; returning checkout unchanged. Test same media/price snapshot before verifier and changes after verifier; actual atomic PostgreSQL response group and pre-send revocation guards. Check current provider/preflight activation/version/firewall and readiness/judge rule alignment.

Run focused worker/media/quote/ingress/protected tests, database history tests, provider/eval tests, worker/shared typecheck/build/lint and full Node as affected. Actual disposable PostgreSQL uses current harness, synthetic domain, provider0/live0, clean sealed source and cleanup; no migration or shop data write. Preserve failed attempts and incremental source identities. Stop at implementation review approval; no new inference campaign or Phase C GO.

## Review revisions before execution

R1: normal native seal and every generation dispatch use the same scoped readiness guard and active rule. R4: required media covers initial inputs, declared discovery pool and task product, including no-initial-product discovery. Source-unavailable controls remain separate.

R2: reference wrapper prepares media BEFORE_STRATEGIST while candidate does so AFTER_OWNER_FINAL. This timing/information difference is not established as equivalent. Active rule forces INFORMATION_PARITY_NOT_ESTABLISHED and independently blocks replacement qualification even if a witness claims structural parity. An absolute candidate result may still be evaluated. Pinned-main internals stay unchanged; wrapper results are package-only until a separate parity change is reviewed.

R3: known cart colours come from exact components[].color, normalized with the existing catalog token function. Generic or wrong-colour media cannot satisfy known choices; conflicting/multiple component colours fail closed rather than inventing a matching photo. Direct first checkout and mixed component colours remain disclosed capability limits.
