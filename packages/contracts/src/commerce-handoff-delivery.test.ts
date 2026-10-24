import { expect, it } from "vitest";
import { CommerceHandoffDeliveryBindingV1Schema as schema } from "./commerce-handoff-delivery.js";

it("accepts a bounded single holding reply binding and rejects private/unbound extensions", () => {
  const hash = "a".repeat(64), b = { kind: "C3_HANDOFF_GROUP_V1", pageId: "page", shopId: "shop", conversationId: "conversation",
    customerHash: hash, recipientHash: hash, responseGroupId: "group", generation: 1, revision: 2, stateHash: hash, policyHash: hash,
    reason: "DEPENDENCY_FAILURE", rulesetVersion: "rules-v1", messageHashes: [hash] };
  expect(schema.safeParse(b).success).toBe(true);
  for (const patch of [{ messageHashes: [] }, { messageHashes: Array(7).fill(hash) }, { recipientHash: "recipient" },
    { reason: "UNREGISTERED" }, { privateText: "not permitted" }]) expect(schema.safeParse({ ...b, ...patch }).success).toBe(false);
});
