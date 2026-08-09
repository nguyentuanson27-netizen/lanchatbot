import { describe, expect, it } from "vitest";
import type { AgentProposalV1 } from "@lana/contracts";
import { authorizeBusinessFactIntent } from "./business-fact-intent-authorization.js";

function proposal(
  intent: AgentProposalV1["businessFactQuery"]["intent"],
): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "tu_van",
    conversationStage: "consulting",
    productId: "SD398",
    action: "REPLY",
    reply: "Em hỗ trợ chị ạ.",
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent,
      offerType: null,
      color: null,
      size: intent === "SIZE" ? "M" : null,
      deliveryRegion: intent === "ETA" ? "HCM" : null,
    },
  };
}

describe("authorizeBusinessFactIntent", () => {
  it("allows NONE and exactly the caller-authorized canonical intents", () => {
    const allowed = ["PRICE", "ETA"] as const;

    expect(authorizeBusinessFactIntent(proposal("NONE"), allowed))
      .toEqual(proposal("NONE"));
    expect(authorizeBusinessFactIntent(proposal("PRICE"), allowed))
      .toEqual(proposal("PRICE"));
    expect(authorizeBusinessFactIntent(proposal("ETA"), allowed))
      .toEqual(proposal("ETA"));
  });

  it.each(["PRICE", "STOCK", "ETA", "SIZE"] as const)(
    "reconciles unauthorized %s to a qualifier-free NONE proposal",
    (intent) => {
      const authorized = authorizeBusinessFactIntent(proposal(intent), []);

      expect(authorized.businessFactQuery).toEqual({
        intent: "NONE",
        offerType: null,
        color: null,
        size: null,
        deliveryRegion: null,
      });
      expect(authorized.action).toBe("REPLY");
      expect(authorized.reply).toBe("Em hỗ trợ chị ạ.");
    },
  );

  it("does not derive authorization from customer text or a feature policy", () => {
    expect(authorizeBusinessFactIntent(proposal("SIZE"), ["STOCK"]))
      .toEqual(expect.objectContaining({
        businessFactQuery: expect.objectContaining({ intent: "NONE" }),
      }));
  });
});
