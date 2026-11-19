import { createHash } from "node:crypto";
import { RuntimePolicyResolver } from "@lana/chat-runtime";
import type { ClaimedMetaOutbox } from "@lana/database";
import { expect, it, vi } from "vitest";
import { makeCommerceMediaDeliveryBinding } from "./single-agent-commerce-media-delivery.js";
import { createCommercePreprodDeliveryGate } from "./single-agent-commerce-preprod-delivery.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { commerceNow, commerceScope, fixturePolicyPointers, fixtureProduct } from "./single-agent-commerce.test-support.js";

async function fixture() {
  const scope = commerceScope();
  const clock = () => commerceNow;
  const product = fixtureProduct().product;
  const image = {
    url: "https://content.pancake.vn/preprod.jpg", role: "PRIMARY" as const,
    angle: "FRONT" as const, imageType: "MODEL" as const, intents: [], sortOrder: 0,
    qualityScore: null, feedback: false, reviewStatus: "APPROVED" as const, metadataVerified: true,
    sourceContentSha256: "a".repeat(64), observedAt: commerceNow.toISOString(), partsVisible: ["AO"],
  };
  product.images = [image];
  const loadActivePointers = vi.fn(async () => fixturePolicyPointers(fee).map(row => ({
    pointer: { ...row.pointer, channel: "PUBLISHED" },
    version: { ...row.version, lifecycle: "PUBLISHED" },
  })));
  let fee = 25_000;
  const policy = (await new RuntimePolicyResolver({ loadActivePointers }, {
    enabled: true, publishedEnabled: true,
  }).resolve({ pageId: scope.pageId, channel: "PUBLISHED", now: clock() })).bundle!;
  const row = {
    conversationId: scope.conversationId, routingOwner: "APP" as const,
    state: { revision: 2 }, stateVersion: 2, appSendEnabled: true, killSwitch: false, pageMode: "LIVE" as const,
  };
  const base = { authorize: vi.fn(async () => ({
    status: "ALLOWED" as const, reasonCode: null, blockingTag: null, observedAt: clock(),
  })) };
  const ports = {
    pageId: scope.pageId, policyChannel: "PUBLISHED" as const, base, clock,
    store: {
      loadOrCreate: vi.fn(async () => row) as unknown as Parameters<typeof createCommercePreprodDeliveryGate>[0]["store"]["loadOrCreate"],
      hasCommittedHandoffDelivery: vi.fn(async () => false),
    },
    inbox: { readGeneration: vi.fn(async () => 1) },
    policyStore: { loadActivePointers },
    catalog: { findByExactCode: vi.fn(async () => product) },
    allowedHostSuffixes: ["content.pancake.vn"],
  };
  const recipientId = "test-recipient";
  const messages = [
    { kind: "TEXT" as const, text: "Em gửi chị ảnh mẫu nhé." },
    { kind: "IMAGE" as const, imageUrl: image.url },
  ];
  const binding = makeCommerceMediaDeliveryBinding({
    scope: { ...scope, recipient: createHash("sha256").update(recipientId).digest("hex") },
    policy, generation: 1, responseGroupId: "preprod-group", nextState: row.state, messages,
    now: clock(),
    images: [{
      productId: product.productId, url: image.url, observedAt: image.observedAt, expiresAt: null,
      sourceVersion: commerceHash({ productId: product.productId, catalogVersion: product.catalogVersion, image }),
    }],
  });
  const claim = {
    pageId: scope.pageId, conversationId: scope.conversationId, responseGroupId: binding.responseGroupId,
    recipientId, sequenceNo: 0, message: messages[0], mediaBinding: binding,
  } as ClaimedMetaOutbox;
  loadActivePointers.mockClear();
  return { ports, claim, row, product, setFee: (value: number) => { fee = value; } };
}

it("checks current authority, exact image and active policy for a persisted candidate group", async () => {
  const { ports, claim, product } = await fixture();
  const gate = createCommercePreprodDeliveryGate(ports);
  expect(await gate.authorize(claim)).toMatchObject({ status: "ALLOWED" });
  expect(ports.policyStore.loadActivePointers).toHaveBeenCalledWith({ pageId: claim.pageId, channel: "PUBLISHED" });
  expect(ports.catalog.findByExactCode).toHaveBeenCalledWith(product.productId);
  expect(ports.base.authorize).toHaveBeenCalledWith(claim);
});

it("denies changed delivery authority, revoked images and updated active policy", async () => {
  const { ports, claim, row, product, setFee } = await fixture();
  const gate = createCommercePreprodDeliveryGate(ports);
  expect((await gate.authorize(claim)).status).toBe("ALLOWED");
  ports.base.authorize.mockClear();
  setFee(30_000);
  expect((await gate.authorize(claim)).status).toBe("BLOCKED");
  setFee(25_000);
  row.killSwitch = true;
  expect((await gate.authorize(claim)).status).toBe("BLOCKED");
  row.killSwitch = false;
  product.images = [];
  expect((await gate.authorize(claim)).status).toBe("BLOCKED");
  expect(ports.base.authorize).not.toHaveBeenCalled();
});

it("leaves existing unbound groups on the Pancake gate and refuses other pages or shadow policy", async () => {
  const { ports, claim } = await fixture();
  const gate = createCommercePreprodDeliveryGate(ports);
  const legacy = { ...claim, mediaBinding: undefined };
  expect((await gate.authorize(legacy)).status).toBe("ALLOWED");
  expect((await gate.authorize({ ...claim, pageId: "other-page" })).status).toBe("BLOCKED");
  expect(ports.policyStore.loadActivePointers).not.toHaveBeenCalled();
  expect(ports.base.authorize).toHaveBeenCalledExactlyOnceWith(legacy);
  expect(() => createCommercePreprodDeliveryGate({ ...ports, pageId: "other-page" })).toThrow("PAGE_FORBIDDEN");
  expect(() => createCommercePreprodDeliveryGate({ ...ports, policyChannel: "CANARY_SHADOW" })).toThrow("LIVE_POLICY_REQUIRED");
});

it.each(["authority", "policy"])("blocks a %s change while the Pancake read was in flight", async changed => {
  const { ports, claim, row, setFee } = await fixture();
  const authorize = ports.base.authorize;
  authorize.mockImplementationOnce(async () => {
    if (changed === "authority") row.stateVersion++;
    else setFee(30_000);
    return { status: "ALLOWED", reasonCode: null, blockingTag: null, observedAt: commerceNow };
  });
  const gate = createCommercePreprodDeliveryGate(ports);
  expect((await gate.authorize(claim)).status).toBe("BLOCKED");
  expect(authorize).toHaveBeenCalledOnce();
});
