import { describe, expect, it, vi } from "vitest";
import type { Df13CommerceAuthorityFenceAssessment } from "./df13-commerce-authority-fence.js";
import {
  Df13CommerceDefaultOffConsumerAdapter,
  type Df13LegacyConsumer,
} from "./df13-commerce-default-off-consumer.js";

type LegacyInput = Readonly<{ message: string }>;

function legacy(): Df13LegacyConsumer<LegacyInput, "LEGACY_RESULT"> {
  return { consume: vi.fn(async () => "LEGACY_RESULT" as const) };
}

const commerceAssessment = {
  status: "COMMERCE_FENCE_REQUIRED",
  request: {},
} as unknown as Df13CommerceAuthorityFenceAssessment;

describe("DF13 default-off Commerce consumer", () => {
  it("rejects every Commerce identity because this adapter has no activation path", async () => {
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({ legacyConsumer: legacy() });

    await expect(adapter.admitCommerceAuthority({
      pageId: "1198992073286645",
      channel: "MESSENGER",
      modeVersionId: "10000000-0000-4000-8000-000000000006",
      contentHash: `sha256:${"c".repeat(64)}`,
      authorityBundleHash: "a".repeat(64),
      pointerRevision: 6,
      source: "DATABASE",
    })).resolves.toEqual({ status: "REJECTED" });
  });

  it("delegates only a positively identified LEGACY assessment", async () => {
    const legacyConsumer = legacy();
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({ legacyConsumer });

    await expect(adapter.consume({
      legacyInput: { message: "hello" },
      assessment: { status: "LEGACY_ADMITTED" },
    })).resolves.toEqual({ status: "LEGACY_DELEGATED", result: "LEGACY_RESULT" });
    expect(legacyConsumer.consume).toHaveBeenCalledOnce();
  });

  it("parks a Commerce assessment without deriving or committing authority-dependent work", async () => {
    const legacyConsumer = legacy();
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({ legacyConsumer });

    await expect(adapter.consume({
      legacyInput: { message: "commerce" },
      assessment: commerceAssessment,
    })).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_COMMERCE_DEFAULT_OFF_ONLY",
    });
    expect(legacyConsumer.consume).not.toHaveBeenCalled();
  });

  it("preserves an upstream invalid-authority block without falling back to LEGACY", async () => {
    const legacyConsumer = legacy();
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({ legacyConsumer });

    await expect(adapter.consume({
      legacyInput: { message: "commerce" },
      assessment: {
        status: "BLOCKED",
        blockId: "df13-block-test",
        reasonCode: "DF13_COMMERCE_IDENTITY_INVALID",
      },
    })).resolves.toEqual({
      status: "BLOCKED",
      blockId: "df13-block-test",
      reasonCode: "DF13_COMMERCE_IDENTITY_INVALID",
    });
    expect(legacyConsumer.consume).not.toHaveBeenCalled();
  });
});
