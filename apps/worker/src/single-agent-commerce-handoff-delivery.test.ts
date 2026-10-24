import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import type { ClaimedMetaOutbox } from "@lana/database";
import { createConversationState, applySilentHandoff } from "@lana/conversation-engine";
import { createCommerceHandoffPreSendGate, makeCommerceHandoffDeliveryBinding } from "./single-agent-commerce-handoff-delivery.js";
import { selectCommerceHandoff } from "./single-agent-commerce-handoff.js";
import { commerceNow, commerceScope, fixturePolicy } from "./single-agent-commerce.test-support.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";

it.each(["unchanged", "policy", "silent", "recipient", "revision", "generation", "group", "message", "receipt", "privacy", "routing", "kill", "read-error", "inflight-policy", "inflight-authority", "base-blocked"])("revalidates text-only handoff after restart (%s)", async fault => {
  const recipientId = "synthetic-recipient", scope = { ...commerceScope(), recipient: createHash("sha256").update(recipientId).digest("hex") };
  const policy = (await fixturePolicy()).bundle!;
  Object.assign(policy.artifacts, { handoffMatrix: { schemaVersion: 1, kind: "HANDOFF_MATRIX", sourceMetadata: policy.artifacts.shopPolicy.sourceMetadata,
    rules: [{ reason: "DEPENDENCY_FAILURE", customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF", holdingReply: "Em chuyển nhân viên hỗ trợ tiếp cho chị nhé.", tag: "NHAN_VIEN" }] } });
  const before = { ...createConversationState({ conversationId: scope.conversationId, routingOwner: "APP", now: commerceNow }), revision: 1 };
  const state = applySilentHandoff(before, "AGENT_REQUEST", 1, 1, commerceNow).state;
  const decision = selectCommerceHandoff(policy, scope, "DEPENDENCY_FAILURE", commerceNow);
  const messages = [{ kind: "TEXT" as const, text: decision.customerMessages[0]! }];
  const binding = makeCommerceHandoffDeliveryBinding({ scope, generation: 1, responseGroupId: "group", nextState: state, decision, policy, messages, now: commerceNow });
  const authority = { state, stateVersion: state.revision, routingOwner: "APP", appSendEnabled: true, killSwitch: false, generation: 1 };
  const claim = { pageId: scope.pageId, conversationId: scope.conversationId, responseGroupId: "group", recipientId, sequenceNo: 0, message: messages[0], handoffBinding: JSON.parse(JSON.stringify(binding)) } as { -readonly [K in keyof ClaimedMetaOutbox]: ClaimedMetaOutbox[K] };
  const currentPolicy = structuredClone(policy);
  if (fault === "policy") Object.assign(currentPolicy.versionReferences[0]!, { pointerRevision: currentPolicy.versionReferences[0]!.pointerRevision + 1 });
  if (fault === "silent") Object.assign(currentPolicy.artifacts.handoffMatrix!.rules[0]!, { customerMessagePolicy: "SILENT_HANDOFF", holdingReply: null });
  if (fault === "recipient") claim.recipientId = "different";
  if (fault === "revision") authority.stateVersion++;
  if (fault === "generation") authority.generation++;
  if (fault === "group") claim.responseGroupId = "different";
  if (fault === "message") claim.message = { kind: "TEXT", text: "different" };
  if (fault === "privacy") authority.appSendEnabled = false;
  if (fault === "routing") authority.routingOwner = "OTHER";
  if (fault === "kill") authority.killSwitch = true;
  let authorityReads = 0, policyReads = 0;
  const receipt = vi.fn(async (b: typeof binding) => b.revision === state.revision && commerceHash(b) === commerceHash(binding) && fault !== "receipt");
  const base = { authorize: vi.fn(async () => ({ status: fault === "base-blocked" ? "BLOCKED" as const : "ALLOWED" as const, reasonCode: null, blockingTag: null, observedAt: commerceNow })) };
  const gate = createCommerceHandoffPreSendGate({ base, clock: () => commerceNow,
    readAuthority: async () => { if (fault === "read-error") throw Error("UNAVAILABLE"); authorityReads++; return { ...authority,
      ...(fault === "inflight-authority" && authorityReads > 1 ? { generation: 2 } : {}) }; },
    policy: async () => { policyReads++; if (fault === "inflight-policy" && policyReads > 1) Object.assign(currentPolicy.versionReferences[0]!, { pointerRevision: currentPolicy.versionReferences[0]!.pointerRevision + 1 }); return currentPolicy; },
    hasCommittedHandoff: receipt });
  expect((await gate.authorize(claim)).status).toBe(fault === "unchanged" ? "ALLOWED" : "BLOCKED");
  if (fault === "unchanged") { expect(receipt).toHaveBeenCalledOnce(); expect(base.authorize).toHaveBeenCalledOnce(); }
  else if (fault !== "base-blocked") expect(base.authorize).not.toHaveBeenCalled();
});
