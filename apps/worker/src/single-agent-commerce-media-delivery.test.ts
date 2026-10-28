import { expect, it, vi } from "vitest";
import type { ClaimedMetaOutbox } from "@lana/database";
import { createCommerceMediaPreSendGate, makeCommerceMediaDeliveryBinding } from "./single-agent-commerce-media-delivery.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { commerceNow, commerceScope, fixturePolicy, fixtureProduct } from "./single-agent-commerce.test-support.js";
import { createHash } from "node:crypto";

it.each(["unchanged", "source", "revision", "recipient", "generation", "policy", "missing", "private-wire", "expired", "unapproved", "permission", "read-error", "inflight-authority","revalidated","revoked-proof","changed-proof"])("revalidates durable media group before sequence zero (%s)", async fault => {
  const scope = commerceScope(), product = fixtureProduct().product, policy = (await fixturePolicy()).bundle!;
  product.images = [{ url: "https://content.pancake.vn/detail.jpg", role: "PRIMARY", angle: "CLOSEUP", imageType: "DETAIL", intents: [],
    sortOrder: 0, qualityScore: null, feedback: false, metadataVerified: true, reviewStatus: "APPROVED",
    sourceContentSha256: "a".repeat(64), observedAt: commerceNow.toISOString(), partsVisible: ["AO"] }];
  const image = product.images[0]!, state = { revision: 2, conversationOwner: "HUMAN" };
  const proofCase=["revalidated","revoked-proof","changed-proof"].includes(fault);
  if(proofCase){image.observedAt="2026-09-01T00:00:00.000Z";image.revalidation={status:"VALID",checkedAt:commerceNow.toISOString()};}
  const messages = [{ kind: "TEXT" as const, text: "Em gửi chị ảnh mẫu nhé." }, { kind: "IMAGE" as const, imageUrl: image.url }];
  const recipientId = "synthetic-recipient", recipientHash = createHash("sha256").update(recipientId).digest("hex");
  const mediaBinding = makeCommerceMediaDeliveryBinding({ scope: { ...scope, recipient: recipientHash }, generation: 1,
    responseGroupId: "group", nextState: state, messages, policy, images: [{ productId: product.productId, url: image.url,
      sourceVersion: commerceHash({ productId: product.productId, catalogVersion: product.catalogVersion, image }),
      observedAt: proofCase?commerceNow.toISOString():image.observedAt!, expiresAt: new Date(commerceNow.getTime() + 60_000).toISOString() }] });
  const claim = { pageId: scope.pageId, conversationId: scope.conversationId, responseGroupId: "group", sequenceNo: 0,
    recipientId, message: messages[0], mediaBinding } as unknown as ClaimedMetaOutbox;
  if (fault === "source") product.images = [];
  if (fault === "unapproved") image.metadataVerified = false;
  if(fault==="revoked-proof")image.revalidation={status:"INVALID"};
  if(fault==="changed-proof")image.revalidation={status:"VALID",checkedAt:new Date(commerceNow.getTime()-1000).toISOString()};
  if (fault === "recipient") Object.assign(claim, { recipientId: "another" });
  if (fault === "missing") Object.assign(claim, { mediaBinding: {} });
  const changedPolicy = structuredClone(policy); if (fault === "policy") changedPolicy.policy.policyVersion += ":changed";
  const base = { authorize: vi.fn(async () => ({ status: "ALLOWED" as const, reasonCode: null, blockingTag: null, observedAt: commerceNow })) };
  let reads = 0;
  const gate = createCommerceMediaPreSendGate({ base, clock: () => fault === "expired" ? new Date(commerceNow.getTime() + 60_000) : commerceNow,
    readAuthority: async () => ({ state: fault === "revision" ? { ...state, revision: 3 } : state, stateVersion: fault === "revision" ? 3 : 2,
      routingOwner: "APP", appSendEnabled: fault !== "permission", killSwitch: fault === "inflight-authority" && ++reads > 1, generation: fault === "generation" ? 2 : 1 }),
    policy: async () => changedPolicy, readProduct: async () => { if (fault === "read-error") throw new Error("READ_ERROR"); return product; }, allowedHostSuffixes: ["content.pancake.vn"] });
  const result = await gate.authorize(claim);
  expect(result.status).toBe(["unchanged", "private-wire","revalidated"].includes(fault) ? "ALLOWED" : "BLOCKED");
  if (fault === "private-wire") expect(claim.message).toEqual(messages[0]);
  if (!["unchanged", "private-wire","revalidated"].includes(fault)) expect(base.authorize).not.toHaveBeenCalled();
});
