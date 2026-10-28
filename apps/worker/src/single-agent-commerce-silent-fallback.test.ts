import { expect, it, vi } from "vitest";
import { createConversationState } from "@lana/conversation-engine";
import { createCommerceHandoffTools, type CommerceHandoffCommit, type HandoffAuthority } from "./single-agent-commerce-handoff.js";
import { createReadOnlyTools } from "./single-agent-commerce-read-only-tools.js";
import { runCommerceTurn, type OwnerGeneration, type VerifierGeneration } from "./single-agent-commerce-read-only.js";
import { commerceNow, commerceScope, fixturePolicy } from "./single-agent-commerce.test-support.js";

async function fixture(mode: "success" | "rejected" | "unknown" | "revoked" = "success") {
  const scope = commerceScope(), policy = (await fixturePolicy()).bundle!;
  let current: HandoffAuthority = { ...scope, fence: 1, stateVersion: scope.revision,
    state: { ...createConversationState({ conversationId: scope.conversationId, routingOwner: "APP", now: commerceNow }), revision: scope.revision } };
  const base = createReadOnlyTools({ scope, clock: () => commerceNow, policy: () => fixturePolicy(),
    catalog: { readProduct: async () => { throw Error("NOT_READ"); }, searchText: async () => ({ status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" }) } });
  const receiptRecovery = vi.fn(async () => ({ disposition: "SEND_ELIGIBLE" as const, reason: "RECEIPT_BACKED_ACK", text: "Đã thêm vào giỏ.", fallbackId: null }));
  const commit = vi.fn(async (change: CommerceHandoffCommit) => {
    if (mode === "unknown") throw Error("COMMIT_UNKNOWN");
    if (mode === "rejected" || !await change.validate()) return false;
    current = structuredClone(change.next); return true;
  });
  const tools = createCommerceHandoffTools({ base: { ...base, recover: receiptRecovery }, scope, clock: () => commerceNow,
    policy: async () => policy, read: async () => structuredClone(current), commit });
  const owner = vi.fn(async (): Promise<OwnerGeneration> => { if (mode === "revoked") current.permission = false; throw Error("HTTP_429"); });
  const verifier = vi.fn(async (): Promise<VerifierGeneration> => ({ result: { verdict: "PASS", violations: [] } }));
  return { scope, tools, base, owner, verifier, commit, receiptRecovery, current: () => current,
    run: (latest = "Áo này bao nhiêu em?") => runCommerceTurn({ scope, tools, owner, verifier, latest, history: [],
      ownerPrompt: "Tư vấn", verifierPrompt: "Kiểm reply", clock: () => commerceNow, timeoutMs: 5 }) };
}

it.each(["provider", "timeout", "malformed", "FAIL", "UNCERTAIN", "bad-verdict", "tool-bound", "artifact", "input-bound", "preparation", "budget", "size-unavailable"])(
  "hands off %s silently without receipt/media/static reply or extra generation", async fault => {
    const f = await fixture();
    if (fault !== "provider") f.owner.mockImplementation(async () => {
      if (fault === "timeout") throw Error("TIMEOUT");
      if (fault === "malformed") return {} as OwnerGeneration;
      if (["tool-bound", "size-unavailable", "budget"].includes(fault)) return { kind: "TOOLS",
        calls: Array.from({length:fault === "budget"?7:1},()=>({ name: "read_policy", args: {} })), content: { role: "model", parts: [] } };
      return { kind: "FINAL", text: fault === "artifact" ? "asset:internal" : "Dạ chị." };
    });
    if (fault === "tool-bound") f.tools.invokeBatch = async () => [{ status: "OK", data: { padding: "x".repeat(9000) } }];
    if (fault === "preparation") f.tools.prepare = async () => { throw Error("PREPARE_FAILED"); };
    if (fault === "size-unavailable") f.tools.sizeOutcome = () => ({status:"NO_VERIFIED_CHART"});
    if (["FAIL", "UNCERTAIN", "bad-verdict"].includes(fault)) f.verifier.mockResolvedValue({ result: { verdict: fault, violations: [] } });
    const r = await f.run(fault === "input-bound" ? "x".repeat(2049) : undefined);
    expect(r.terminal).toMatchObject({ disposition: "HANDOFF", text: null, fallbackId: null });
    expect(r.recovery?.originalDisposition).toBe("FALLBACK");
    expect(f.current().state.conversationOwner).toBe("HUMAN");
    expect(f.commit).toHaveBeenCalledOnce();
    const change = f.commit.mock.calls[0]![0];
    expect(change.decision).toMatchObject({ customerMessagePolicy: "SILENT_HANDOFF", customerMessages: [] });
    expect(change.reply).toBeUndefined(); expect(change.media).toBeUndefined();
    expect(f.receiptRecovery).not.toHaveBeenCalled();
    expect(r.terminalHandoffCalls).toBe(1);
    expect(f.owner.mock.calls.length).toBeLessThanOrEqual(1);
  });

it.each(["rejected", "unknown", "revoked"] as const)("does not send or retry if silent handoff is %s", async mode => {
  const f = await fixture(mode), r = await f.run();
  expect(r.terminal).toMatchObject({ disposition: "NO_SEND", text: null, fallbackId: null });
  expect(f.owner).toHaveBeenCalledOnce(); expect(f.verifier).not.toHaveBeenCalled();
  expect(f.commit.mock.calls.length).toBeLessThanOrEqual(1); expect(f.receiptRecovery).not.toHaveBeenCalled();
});

it("fails closed when the read-only surface has no handoff capability", async () => {
  const f = await fixture();
  const r = await runCommerceTurn({ scope: f.scope, tools: f.base, owner: f.owner, verifier: f.verifier,
    latest: "Áo này bao nhiêu em?", history: [], ownerPrompt: "Tư vấn", verifierPrompt: "Kiểm reply", clock: () => commerceNow });
  expect(r.terminal).toMatchObject({ disposition: "NO_SEND", reason: "FALLBACK_HANDOFF_UNAVAILABLE", text: null, fallbackId: null });
  expect(r.recovery?.originalReason).toBe("PROVIDER_ERROR");
});

it("keeps a normal verified reply unchanged", async () => {
  const f = await fixture(); f.owner.mockResolvedValue({ kind: "FINAL", text: "Dạ chị." });
  const r = await f.run();
  expect(r.terminal).toMatchObject({ disposition: "SEND_ELIGIBLE", text: "Dạ chị." });
  expect(f.verifier).toHaveBeenCalledOnce(); expect(f.commit).not.toHaveBeenCalled();
});

it("rejects a recovery adapter that tries to return customer text", async () => {
  const f = await fixture();
  f.tools.recoverFallback = async () => ({disposition:"SEND_ELIGIBLE",reason:"RECEIPT_BACKED_ACK",text:"Đã thêm vào giỏ.",fallbackId:null});
  const r = await f.run();
  expect(r.terminal).toMatchObject({disposition:"NO_SEND",reason:"FALLBACK_HANDOFF_UNPROVED",text:null,fallbackId:null});
  expect(f.commit).not.toHaveBeenCalled();expect(f.receiptRecovery).not.toHaveBeenCalled();
});
