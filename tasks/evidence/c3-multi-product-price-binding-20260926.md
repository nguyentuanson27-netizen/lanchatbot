# Multi-product POS price binding — 2026-09-26

The C3 live input previously bound only `productId` and filtered all product
claims to that ID. `RealtimeRunner` also skipped C3 whenever resolution had
more than one product. A multi-product fact request now sends the resolved
product IDs to C3; price and stock claims are admitted only for those IDs.
The product binding is sorted and the single-product catalog version is not
misrepresented as a shared multi-product version.

The shared protected-claim builder hashes values alone. Two products with the
same stock count therefore collided in C3's evidence/guard maps. The C3 input
now derives a product-claim selection hash from the claim identity and its
original content hash when several products are bound. Single-product and
legacy hashes remain unchanged. A first attempt to change the shared hash
failed three r31.3 differential tests; that change was reverted before this
verification. The corrected source preserves those compatibility results.

The focused live C3 test binds CB182 and SV9031, selects both current POS
prices, receives one reply naming each product and its own price, excludes an
unbound third product, and rejects a price text paired with the other
product's claim hash. It does not mutate a cart. The C3 and sales-cycle
suites passed 150/150; with realtime runner tests, 221/221 passed. Worker
TypeScript passed. External fact/model ports were scripted; no live send or
provider call was used.

This covers price/stock claim scope and the live C3 compiler path. Multi-
product attribute/presentation comparison and a full `RealtimeRunner`
conversation using several products remain open.
