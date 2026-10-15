import { describe, expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import { createCommerceHandoffTools, selectCommerceHandoff, type HandoffAuthority } from "./single-agent-commerce-handoff.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { runCommerceTurn } from "./single-agent-commerce-read-only.js";
import { commerceNow, commerceScope, fixturePolicy, policyResolver } from "./single-agent-commerce.test-support.js";

async function setup() {
  const scope = commerceScope(), policy = (await fixturePolicy()).bundle!;
  let current: HandoffAuthority = { ...scope, state: { ...createConversationState({ conversationId: scope.conversationId,
    routingOwner: "APP", now: commerceNow }), revision: scope.revision }, stateVersion: scope.revision };
  const base = createReadOnlyTools({ scope, clock: () => commerceNow, policy: () => fixturePolicy(),
    catalog: { readProduct: async () => { throw new Error("NOT_READ"); }, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
  const read = vi.fn(async () => structuredClone(current));
  const commit = vi.fn(async (next: HandoffAuthority) => { current = structuredClone(next); return true; });
  const tools = createCommerceHandoffTools({ base, scope, clock: () => commerceNow, policy: async () => policy, read,
    commit: async ({ next }) => commit(next) });
  return { scope, policy, base, read, commit, tools, current: () => current,
    change: (patch: Partial<HandoffAuthority>) => { current = { ...current, ...patch }; } };
}
describe("Phase B handoff follows current code policy and committed ownership", () => {
  it("uses the configured rule and forbids model-authored messages, tags or identity", async () => {
    const s = await setup();
    Object.assign(s.policy.artifacts, { handoffMatrix: { schemaVersion: 1, kind: "HANDOFF_MATRIX", sourceMetadata: s.policy.artifacts.shopPolicy.sourceMetadata,
      rules: [{ reason: "EXCHANGE", customerMessagePolicy: "HOLDING_REPLY_THEN_HANDOFF", holdingReply: "Shop đã nhận yêu cầu đổi hàng của chị.", tag: "VAN_DON" }] } });
    expect(selectCommerceHandoff(s.policy, s.scope, "EXCHANGE", commerceNow).customerMessages).toEqual(["Shop đã nhận yêu cầu đổi hàng của chị."]);
    await expect(s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE", tag: "NHAN_VIEN" } })).resolves.toMatchObject({ status: "REJECTED" });
    expect(s.commit).not.toHaveBeenCalled();
    expect(await s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).toMatchObject({ status: "OK" });
    expect(s.current().state.conversationOwner).toBe("HUMAN");
    expect(await s.tools.terminalOutcome!()).toMatchObject({ disposition: "HANDOFF", text: "Shop đã nhận yêu cầu đổi hàng của chị." });
  });
  it("uses existing defaults only when the optional matrix is absent; invalid or missing rules fail closed", async () => {
    const s = await setup();
    expect(selectCommerceHandoff(s.policy, s.scope, "CUSTOMER_REQUESTED_HUMAN", commerceNow)).toMatchObject({ tag: "NHAN_VIEN", customerMessages: [] });
    Object.assign(s.policy.artifacts, { handoffMatrix: { schemaVersion: 1, kind: "HANDOFF_MATRIX", sourceMetadata: s.policy.artifacts.shopPolicy.sourceMetadata,
      rules: [{ reason: "EXCHANGE", customerMessagePolicy: "SILENT_HANDOFF", holdingReply: null, tag: "NHAN_VIEN" }] } });
    await expect(s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).resolves.toMatchObject({ status: "UNAVAILABLE" });
    await expect(s.tools.invoke({ name: "request_handoff", args: { reason: "CUSTOMER_REQUESTED_HUMAN" } })).resolves.toMatchObject({ status: "UNAVAILABLE" });
    expect(s.commit).not.toHaveBeenCalled();
  });
  it("denies changed scope, privacy, permission or revision before committing", async () => {
    for (const patch of [{ recipient: "other" }, { bindingVersion: "new" }, { permission: false }, { privacyAllowed: false }, { stateVersion: 2 }]) {
      const s = await setup(); s.change(patch);
      expect((await s.tools.invoke({ name: "request_handoff", args: { reason: "CUSTOMER_REQUESTED_HUMAN" } })).status).toBe("REJECTED");
      expect(s.commit).not.toHaveBeenCalled();
    }
  });
  it("does not acknowledge a lost CAS or an unproved commit", async () => {
    const s = await setup(); s.commit.mockResolvedValue(false);
    expect((await s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).status).toBe("REJECTED");
    expect(await s.tools.terminalOutcome!()).toBeNull();
    s.commit.mockRejectedValue(new Error("ambiguous response"));
    expect((await s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).status).toBe("UNAVAILABLE");
    expect(await s.tools.terminalOutcome!()).toMatchObject({ disposition: "NO_SEND", text: null });
    expect(s.commit).toHaveBeenCalledTimes(2);
  });
  it("invalidates a handoff acknowledgement after changed authority or policy", async () => {
    const s = await setup(); await s.tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } });
    s.change({ recipient: "other" });
    expect(await s.tools.terminalOutcome!()).toMatchObject({ disposition: "NO_SEND", text: null });
    s.change({ recipient: s.scope.recipient }); Object.assign(s.policy, { versionReferences: s.policy.versionReferences.map((r,i) =>
      i === 0 ? { ...r, pointerRevision: r.pointerRevision+1 } : r) });
    expect(await s.tools.terminalOutcome!()).toMatchObject({ disposition: "NO_SEND", text: null });
    expect(s.commit).toHaveBeenCalledTimes(1);
  });
  it("does not mistake the next fetch time for a changed policy identity", async () => {
    const s = await setup(); let sequence = 0;
    const tools = createCommerceHandoffTools({ base:s.base,scope:s.scope,clock:()=>new Date(commerceNow.getTime()+1000),read:s.read,
      commit:async({next})=>s.commit(next), policy:async()=>{
        const r=await policyResolver().resolve({pageId:s.scope.pageId,channel:"CANARY_SHADOW",now:new Date(commerceNow.getTime()+(++sequence))});
        return r.bundle!;
      } });
    expect((await tools.invoke({ name: "request_handoff", args: { reason: "EXCHANGE" } })).status).toBe("OK");
    expect(await tools.terminalOutcome!()).toMatchObject({ disposition: "HANDOFF" });
  });
  it("stops the turn and suppresses sibling effects once handoff is requested", async () => {
    const s = await setup(), owner = vi.fn(async () => ({ kind: "TOOLS" as const,
      calls: [{ name: "request_handoff", args: { reason: "CUSTOMER_REQUESTED_HUMAN" } }, { name: "add_to_cart", args: { subjectRef: "invented" } }],
      content: { role: "model" as const, parts: [{ functionCall: { name: "request_handoff", args: { reason: "CUSTOMER_REQUESTED_HUMAN" } } }] } }));
    const invokeBatch = vi.spyOn(s.base, "invokeBatch"), verifier = vi.fn();
    const r = await runCommerceTurn({ scope: s.scope, clock: () => commerceNow, latest: "Cho chị gặp nhân viên.", history: [],
      ownerPrompt: "Tư vấn", verifierPrompt: "Kiểm reply", tools: s.tools, owner, verifier });
    expect(r.terminal).toMatchObject({ disposition: "HANDOFF", text: null });
    expect(r.sendEnabled).toBe(false); expect(owner).toHaveBeenCalledTimes(1); expect(verifier).not.toHaveBeenCalled();
    expect(invokeBatch).not.toHaveBeenCalled(); expect(s.commit).toHaveBeenCalledTimes(1);
  });
  it("does not call either model when a previous turn already belongs to a human", async () => {
    const s = await setup(); s.change({ state: { ...s.current().state, conversationOwner: "HUMAN" } });
    const owner = vi.fn(), verifier = vi.fn();
    const result = await runCommerceTurn({ scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Em ơi",history:[],
      ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",owner,verifier });
    expect(result.terminal.disposition).toBe("NO_SEND");expect(owner).not.toHaveBeenCalled();expect(verifier).not.toHaveBeenCalled();
  });
  it("feeds current conversation revision into the existing final gate after a verifier PASS", async () => {
    const s=await setup();
    const r=await runCommerceTurn({scope:s.scope,tools:s.tools,clock:()=>commerceNow,latest:"Em ơi",history:[],
      ownerPrompt:"Tư vấn",verifierPrompt:"Kiểm",owner:async()=>({kind:"FINAL",text:"Dạ chị."}),
      verifier:async()=>{s.change({stateVersion:2,state:{...s.current().state,revision:2}});return {result:{verdict:"PASS",violations:[]}};}});
    expect(r.terminal.disposition).not.toBe("SEND_ELIGIBLE");expect(s.commit).not.toHaveBeenCalled();
  });
  it("persists terminal stale recovery but never converts ordinary fallback or privacy no-send to handoff", async () => {
    const s = await setup();
    const fallback = { disposition: "FALLBACK" as const, reason: "FAIL", text: "fallback", fallbackId: "f" };
    expect(await s.tools.recover!(fallback)).toEqual(fallback);
    expect(await s.tools.recover!({ disposition: "NO_SEND", reason: "PRIVACY", text: null, fallbackId: null })).toMatchObject({ disposition: "NO_SEND" });
    expect(s.commit).not.toHaveBeenCalled();
    expect(await s.tools.recover!({ disposition: "HANDOFF", reason: "STALE", text: null, fallbackId: null })).toMatchObject({ disposition: "HANDOFF", text: null });
    expect(s.commit).toHaveBeenCalledTimes(1); expect(s.current().state.conversationOwner).toBe("HUMAN");
  });
});
