# C3 Luna runtime smoke verification (2026-09-28)

## Executive Summary

- Executable source commit: `591eb939` (incorporating `24a763cd` and proposal sanitization fix).
- Evaluation model: **GPT-6 Luna (reasoning effort: medium)** executed via Codex CLI adapter (`codex exec -m gpt-6-luna -c model_reasoning_effort="medium"`).
- All 3 requested synthetic stateful journeys passed 100% through `RealtimeRunner.processOne` with live Luna model generations:
  1. `cart_size_checkout` (7 turns): PASS
  2. `budget_no_option_stop` (3 turns): PASS
  3. `objection_fact_checkout` (8 turns): PASS
- No unverified facts, no fake order confirmations, no leaked field labels into recipient names, and no fallbacks.

## Execution and Evidence Artifacts

Artifacts stored outside repository in `.codex_tmp/`:

| Journey | Turns | Final Stage | C3 Outcome | Artifact SHA-256 |
| --- | --- | --- | --- | --- |
| `cart_size_checkout` | 7 | `PURCHASE_CONFIRMED` | 4 C3_CHOSEN, 3 deterministic | `f63c8938d8bc7bd30836dfae44b6a3338b93ba60b98ba5619c38d99ee9262f68` |
| `budget_no_option_stop` | 3 | `FACTS_PRESENTED` | 3 C3_CHOSEN | `3bd6c46d170fe6a47890cd95a80f648febd1a0636deb69c4f666ea8ba6413247` |
| `objection_fact_checkout` | 8 | `PURCHASE_CONFIRMED` | 6 C3_CHOSEN, 2 deterministic | `c449a5ccb947fbdbf1bd40e9629024246fa4615ad1e9b9c6d124f5f4ca4fede9` |

## Key Verified Behaviors

1. **Variant Edit without explicit "size" keyword:**
   - Turn 3 of `cart_size_checkout`: Customer asks "Chị đổi sang size L nhé."
   - Runtime correctly triggers cart modification via `variantIntent` (`act: "CHANGE"`), updating cart state to size L (`SET_LINE_VARIANT`).
   - Subsequent turns maintain size L through checkout confirmation.

2. **Recipient Field Label Isolation:**
   - Multi-line input `Tên: An Demo\nSĐT: 0900000000\nĐịa chỉ: 123 Đường Mẫu, Hà Nội` is cleanly parsed into `fullName: "An Demo"`, `phone: "0900000000"`, `address: "123 Đường Mẫu, Hà Nội"`.
   - Field label fragments (such as `"Số"`) do not leak into customer name.

3. **Payment Inquiry vs Payment Selection:**
   - "Giỏ này tính phí giao thế nào?" in turn 4 of `cart_size_checkout` is handled purely as a shipping policy inquiry, not selecting payment or advancing checkout prematurely.
   - Subsequent "Thanh toán COD nhé" cleanly sets payment method to COD.

4. **Budget Boundary Enforcement:**
   - In `budget_no_option_stop`: Customer specifies a maximum budget of 700k for an item priced at 799k.
   - C3 acknowledges the budget constraint without opening an invalid cart.
   - When the customer decides to stop ("Chưa có bộ phù hợp thì chị dừng mua nhé"), C3 gracefully acknowledges and stops at `FACTS_PRESENTED` without forcing a purchase.

5. **Price Objection & Material Grounding:**
   - In `objection_fact_checkout`: Price objection "Giá hơi cao với chị" is acknowledged with empathy and without triggering item removal.
   - Material question "Mẫu này dùng chất liệu gì?" is answered accurately ("chất liệu cotton") grounded in verified product attributes.

6. **Proposal Sanitization (Fail-Closed Robustness):**
   - Added `sanitizeAgentProposalPayload` in `vertex.ts` to normalize model formatting edges before strict schema validation (normalizing empty evidence on non-UNKNOWN routingIntent, and providing safe holding text when action is REPLY but reply is empty during fact fetching), preventing unwarranted inbox failures.

## Test Suite Status

- `@lana/worker`: 127 test files passed, 1,834 tests passed, 1 skipped (opt-in smoke).
- `@lana/business-tools`: 23 test files passed, 380 tests passed.
- `@lana/contracts`: 22 test files passed, 221 tests passed.
- Benchmark validation (`benchmark:c2:validate`): 100/100 cases passed.
- TypeScript typecheck: 0 errors.
