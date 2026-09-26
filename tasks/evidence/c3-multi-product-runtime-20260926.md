# C3 multi-product price through RealtimeRunner — 2026-09-26

Source parent: `8cf1e8e47d8e8b27c877cccd4665cb01c547728d`.

The stateful `RealtimeRunner` regression asks for CB182 and SV9031 after a prior CB182 price turn. Exact catalog lookup binds both product codes. Fake POS facts return 799,000 VND for CB182 and 699,000 VND for SV9031. The production C3 path makes two scripted provider calls. Its Strategist input exposes two distinct PRICE evidence subjects, and the committed outbound reply includes both product codes and their full formatted prices. The legacy multi-fact baseline abbreviates prices as `799k`/`699k`, so the asserted `799.000`/`699.000` reply also distinguishes the selected C3 reply from the fallback. No cart opens.

Verification on this change:

- `pnpm --filter @lana/worker exec vitest run src/realtime-runner.test.ts src/realtime-sales-cycle.test.ts src/track-c-c3-strategy-contract-runner.test.ts`: 222/222 passed. One expected fallback warning belongs to the intentional invalid C3 output case.
- `pnpm --filter @lana/worker exec tsc --noEmit`: passed.

The test uses fake POS/search/commit ports and scripted provider output. It does not prove current POS availability, attribute comparison, customer-visible delivery, or model quality.
