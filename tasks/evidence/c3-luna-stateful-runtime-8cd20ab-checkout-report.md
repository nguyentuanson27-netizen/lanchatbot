# Checkout smoke after payment-policy fix — source `8cd20ab`

At exact source HEAD `8cd20ab7e14e0eb36da84ae344f4b2a9a0851e2f`, the opt-in synthetic RealtimeRunner test passed with GPT-6 Luna medium. It replayed the two checkout journeys from the earlier nine-journey smoke: 15 ordered turns, 16 completed model calls, fake ports, outbound delivery disabled. The test-only provider identity adapter is disclosed in the raw artifact. This is a source-specific checkout retest, not a fresh nine-journey quality score.

Both cart-opening replies now say `Thanh toán: COD nhé.` with a null payment artifact; the size edit from M to L repeats the same COD-only choice. Later checkout asks for COD, each journey produces an `ORDER_PREVIEW`, and both end in internal `PURCHASE_CONFIRMED`. Each turn has one synthetic commit; there was no POS order receipt or live send. The complete ordered customer/reply/stage/model-output record is in [the redacted checkout history](c3-luna-stateful-runtime-8cd20ab-checkout-history.md).

The response to “Giá hơi cao” still only acknowledges the concern. The earlier fit-concern fallback was outside the two rerun journeys and remains open. This result verifies the payment wording and checkout path, not sales quality across the suite.

Owner-local raw archive: `C:/Users/nguye/Documents/Sản phẩm AI/LUNA6_RUNTIME_C3_8cd20ab_20260926.zip`, 66 files, 287,020 bytes, SHA-256 `1FC8215183A4C506BD8043A9D4084CDF272CC2D2175F65537416BCF3D83D59B6`. The raw artifact contains synthetic recipient details; the committed history masks them. Its JSON SHA-256 is recorded in the history.
