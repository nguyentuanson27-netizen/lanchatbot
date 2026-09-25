# No-cart variant recall across turns — 2026-09-25

The earlier no-cart commerce test repeated “size M” in the buying commitment.
It therefore did not prove that the runtime carried the customer's verified
variant choice into a later turn.

The new `RealtimeRunner.processOne` case starts without a cart and uses one
persisted conversation and sales-cycle state across these customer turns:

1. Ask the price of CB182; the first-contact reply uses the verified price.
2. “Chị chọn size M nhé.” The scripted C3 stages return an accepted adaptive
   reply. The state records the POS-verified size M and no cart exists.
3. “Chị lấy mẫu này.” The message omits size. The canonical buying signal
   allows one cart opening; the POS selection receives size M from persisted
   state and the cart has one line.
4. Supply name, phone and address, then select COD. The same cart reaches
   `ORDER_PREVIEW`.
5. Confirm the current preview. The same cart reaches internal
   `PURCHASE_CONFIRMED`.

The test asserts a stable cart ID through checkout, the size passed to the
fake POS selection, the accepted C3 choice reply, and six runtime commit-port
calls. All external ports are scripted; this is runtime entrypoint evidence,
not a real POS order receipt or a live customer send. The separate commerce
test still covers duplicate inbound and direct purchase.

Verification: `realtime-runner.test.ts` passed 71/71; worker TypeScript
check passed. The run used no live service.
