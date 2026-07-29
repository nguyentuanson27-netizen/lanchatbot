import { describe, expect, it } from "vitest";
import { normalizeMetaMessages } from "./normalize.js";

const payloadWithoutMid = {
  object: "page",
  entry: [
    {
      id: "page-1",
      messaging: [
        {
          sender: { id: "customer-1" },
          recipient: { id: "page-1" },
          timestamp: 1_784_000_000_000,
          message: { text: "hello" },
        },
      ],
    },
  ],
};

const identityHashSalt = "test-identity-hash-salt-at-least-16-bytes";

describe("normalizeMetaMessages", () => {
  it("creates a stable canonical event key when mid is missing", () => {
    const first = normalizeMetaMessages(
      payloadWithoutMid,
      new Set(["page-1"]),
      identityHashSalt,
    )[0];
    const second = normalizeMetaMessages(
      payloadWithoutMid,
      new Set(["page-1"]),
      identityHashSalt,
    )[0];
    expect(first?.messageId).toBeNull();
    expect(first?.eventKey).toBe(second?.eventKey);
    expect(first?.eventKey).toMatch(/^meta:page-1:fallback:v1:[a-f0-9]{64}$/);
    expect(first?.conversationId).toMatch(/^meta:v1:[a-f0-9]{64}$/);
    expect(first?.conversationId).not.toContain("customer-1");
  });

  it("rejects pages outside the allow-list", () => {
    expect(() =>
      normalizeMetaMessages(payloadWithoutMid, new Set(["other"]), identityHashSalt),
    ).toThrow("not registered");
  });

  it("requires a non-trivial identity HMAC salt", () => {
    expect(() =>
      normalizeMetaMessages(payloadWithoutMid, new Set(["page-1"]), "short"),
    ).toThrow("salt");
  });

  it("normalizes click-to-message ads context without trusting it as a product", () => {
    const payload = structuredClone(payloadWithoutMid) as {
      entry: { messaging: { message: Record<string, unknown> }[] }[];
    };
    payload.entry[0]!.messaging[0]!.message = {
      text: "Tôi muốn biết thêm",
      referral: {
        source: "ads",
        type: "OPEN_THREAD",
        ad_id: "ad-921",
        ref: "campaign-summer",
        ads_context_data: {
          ad_title: "21.7_SV921_CHIỀN_HỒNG_LM",
          post_id: "989770333902779",
        },
      },
    };
    const message = normalizeMetaMessages(
      payload,
      new Set(["page-1"]),
      identityHashSalt,
    )[0];
    expect(message?.adsContext).toEqual({
      source: "ADS",
      referralType: "OPEN_THREAD",
      adTitle: "21.7_SV921_CHIỀN_HỒNG_LM",
      postId: "989770333902779",
      adId: "ad-921",
      ref: "campaign-summer",
    });
  });
});
