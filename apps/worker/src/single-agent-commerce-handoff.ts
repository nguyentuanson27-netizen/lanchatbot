import { HandoffDecisionV2Schema, HandoffReasonV2Schema, HandoffMatrixAdminContentV1Schema,
  type HandoffDecisionV2, type HandoffReasonV2, type ProtectedClaimV1 } from "@lana/contracts";
import { applySilentHandoff, decideHandoffFallbackV2, type ConversationState } from "@lana/conversation-engine";
import type { RuntimePolicyBundle } from "@lana/chat-runtime";
import { buildReadOnlyContext, commerceHash, publicPolicyLiteral } from "./single-agent-commerce-read-only-context.js";
import { toolArgs, type CommerceScope, type CommerceToolCall, type CommerceToolResult } from "./single-agent-commerce-read-only-tools.js";
import type { CommerceTools } from "./single-agent-commerce-read-only.js";
import type { TerminalOutcome } from "./single-agent-semantic-verifier-boundary.js";

export interface HandoffAuthority extends Pick<CommerceScope, "pageId" | "conversationId" | "customerHash" | "recipient" |
  "bindingVersion" | "permission" | "privacyAllowed"> {
  stateVersion: number;
  /** Existing caller-owned lease fence; the candidate never issues a fence token. */
  fence: number;
  state: ConversationState;
}
export interface CommerceHandoffCommit {
  before: HandoffAuthority;
  next: HandoffAuthority;
  decision: HandoffDecisionV2;
  /** Code-prepared independent media, never a model draft or a general HUMAN send exception. */
  media?: { images: readonly { productId: string; url: string }[]; claims: ProtectedClaimV1[];
    validate: () => Promise<boolean> };
}

/** A proposed reason grants no tag/message authority. Existing code rules remain the default when no matrix is published. */
export function selectCommerceHandoff(bundle: RuntimePolicyBundle, scope: CommerceScope, reason: HandoffReasonV2, now: Date): HandoffDecisionV2 {
  publicPolicyLiteral(bundle, scope.pageId, scope.shopId, now);
  const decision = decideHandoffFallbackV2({ schemaVersion: 2, commandId: `${scope.sourceMessageId}:handoff:${reason}`,
    decidedAt: now.toISOString(), trigger: { kind: "REASON_CODE", reason },
    evidence: [{ source: "INBOUND_MESSAGE", reference: scope.sourceMessageId, observedAt: scope.sourceObservedAt }] });
  // Admin handoff is not a customer/model capability.
  if (reason === "ADMIN_REQUEST" || decision.reason !== reason) throw new Error("HANDOFF_REASON");
  if (!bundle.artifacts.handoffMatrix) return decision;
  const matrix = HandoffMatrixAdminContentV1Schema.parse(bundle.artifacts.handoffMatrix);
  const rule = matrix.rules.find(r => r.reason === reason);
  if (!rule || Date.parse(matrix.sourceMetadata.observedAt) > now.getTime()) throw new Error("HANDOFF_RULE_UNAVAILABLE");
  return HandoffDecisionV2Schema.parse({ ...decision, customerMessagePolicy: rule.customerMessagePolicy,
    customerMessages: rule.holdingReply === null ? [] : [rule.holdingReply], tag: rule.tag,
    provenance: { ...decision.provenance, decisionSource: "ADMIN_CONTROL", rulesetVersion: `matrix:${commerceHash(matrix)}` } });
}

export function createCommerceHandoffTools(input: {
  base: CommerceTools; scope: CommerceScope; clock: () => Date; policy: () => Promise<RuntimePolicyBundle>;
  read: () => Promise<HandoffAuthority>;
  /** Must atomically persist ownership, event and tag intent using the current inbox/revision transaction. */
  commit: (change: CommerceHandoffCommit) => Promise<boolean>;
  prepareSizeHandoffMedia?: (before: HandoffAuthority) => Promise<CommerceHandoffCommit["media"]>;
}): CommerceTools {
  let committed: { next: HandoffAuthority; decision: HandoffDecisionV2; policyHash: string } | undefined;
  let uncertain = false;
  let dependencyRecoveryAttempted = false;
  let authority: HandoffAuthority | undefined;
  let turnFence: number | undefined;
  const read = async () => { authority = await input.read(); turnFence ??= authority.fence; return authority; };
  const snapshot = () => {
    const base = input.base.snapshot(); if (!authority) return base;
    return buildReadOnlyContext({ state: { ...base.state,
      ...(base.state.conversationRevision === undefined ? { revision: authority.stateVersion } : { conversationRevision: authority.stateVersion }),
      recipient: authority.recipient, bindingVersion: authority.bindingVersion, privacyAllowed: authority.privacyAllowed,
      permission: authority.permission && scopeMatches(authority), conversationOwner: authority.state.conversationOwner },
      subjects: base.boundSubjects, products: base.runtimeProducts ?? [], claims: base.protectedClaims, policies: base.policyLiterals,
      receipts: base.effectReceipts, ...(base.cartBinding ? { cartBinding: base.cartBinding } : {}) });
  };
  const policyIdentity = (bundle: RuntimePolicyBundle) => commerceHash({
    policy: publicPolicyLiteral(bundle, input.scope.pageId, input.scope.shopId, input.clock()), matrix: bundle.artifacts.handoffMatrix });
  const scopeMatches = (a: HandoffAuthority) => a.pageId === input.scope.pageId && a.conversationId === input.scope.conversationId &&
    a.state.conversationId === input.scope.conversationId && a.customerHash === input.scope.customerHash &&
    a.recipient === input.scope.recipient && a.bindingVersion === input.scope.bindingVersion && a.privacyAllowed &&
    Number.isSafeInteger(a.fence) && a.fence > 0 && a.fence >= a.state.lastFence && a.fence === turnFence;
  async function terminalOutcome(): Promise<TerminalOutcome | null> {
    if (uncertain) return { disposition: "NO_SEND", reason: "HANDOFF_COMMIT_UNPROVED", text: null, fallbackId: null };
    if (!committed) {
      const current = await read();
      const inherited = await input.base.terminalOutcome?.(); if (inherited) return inherited;
      return scopeMatches(current) && current.permission && current.state.conversationOwner === "BOT" ? null
        : { disposition: "NO_SEND", reason: "HANDOFF_AUTHORITY", text: null, fallbackId: null };
    }
    const current = await read();
    if (!scopeMatches(current) || current.stateVersion !== committed.next.stateVersion ||
      commerceHash(current.state) !== commerceHash(committed.next.state) ||
      policyIdentity(await input.policy()) !== committed.policyHash) return { disposition: "NO_SEND", reason: "HANDOFF_SCOPE_CHANGED", text: null, fallbackId: null };
    return { disposition: "HANDOFF", reason: committed.decision.reason,
      text: committed.decision.customerMessages[0] ?? null, fallbackId: null };
  }
  async function request(reason: HandoffReasonV2, independentSizeMedia = false): Promise<CommerceToolResult> {
    if (uncertain) return { status: "UNAVAILABLE", reason: "HANDOFF_COMMIT_UNPROVED" };
    if (committed) return { status: "REJECTED", reason: "ALREADY_HANDED_OFF" };
    const before = await read();
    if (!scopeMatches(before) || !before.permission || before.state.conversationOwner !== "BOT" || before.state.routingOwner !== "APP" ||
      before.stateVersion !== (input.base.snapshot().state.conversationRevision ?? input.scope.revision) ||
      before.state.revision !== before.stateVersion) return { status: "REJECTED", reason: "HANDOFF_AUTHORITY" };
    const policy = await input.policy(), decision = selectCommerceHandoff(policy, input.scope, reason, input.clock());
    let media: CommerceHandoffCommit["media"];
    // Only automatic no-chart recovery can preserve independent media. An
    // explicit customer/model handoff and a silent policy keep their contract.
    if (independentSizeMedia && decision.customerMessages.length && input.prepareSizeHandoffMedia) {
      try { media = await input.prepareSizeHandoffMedia(before); } catch { media = undefined; }
    }
    const engineReason = decision.category === "AFTER_SALES" ? reason === "AFTER_SALES_REQUEST" ? "POST_SALE" : reason
      : reason === "CUSTOMER_REQUESTED_HUMAN" ? reason : "AGENT_REQUEST";
    const transitioned = applySilentHandoff(before.state, engineReason as Parameters<typeof applySilentHandoff>[1],
      before.state.revision, before.fence, input.clock());
    const next = { ...before, state: transitioned.state, stateVersion: transitioned.state.revision };
    // No automatic retry after an ambiguous transaction; a later reader may reconcile via the existing event ledger.
    try { if (!await input.commit({ before, next, decision, ...(media ? { media } : {}) })) return { status: "REJECTED", reason: "HANDOFF_CONFLICT" }; }
    catch { uncertain = true; return { status: "UNAVAILABLE", reason: "HANDOFF_COMMIT_UNPROVED" }; }
    committed = { next, decision, policyHash: policyIdentity(policy) };
    const outcome = await terminalOutcome();
    return outcome?.disposition === "HANDOFF" ? { status: "OK", data: { handoffAccepted: true } }
      : { status: "UNAVAILABLE", reason: "HANDOFF_SCOPE_CHANGED" };
  }
  async function invoke(call: CommerceToolCall): Promise<CommerceToolResult> {
    if (committed || uncertain) return { status: "REJECTED", reason: "HANDOFF_TERMINAL" };
    if (call.name !== "request_handoff") return input.base.invoke(call);
    const a = toolArgs(call.args, ["reason"]), parsed = HandoffReasonV2Schema.safeParse(a?.reason);
    if (!a || !parsed.success || parsed.data === "ADMIN_REQUEST") return { status: "REJECTED", reason: "HANDOFF_ARGUMENTS" };
    try { return await request(parsed.data); } catch { return { status: "UNAVAILABLE", reason: "HANDOFF_POLICY_OR_SOURCE" }; }
  }
  return { ...input.base, invoke, snapshot, terminalOutcome,
    async readback() { await input.base.readback(); await read(); return snapshot(); }, async invokeBatch(calls) {
    if (committed || uncertain) return calls.map(() => ({ status: "REJECTED", reason: "HANDOFF_TERMINAL" }));
    const handoffs = calls.filter(c => c.name === "request_handoff");
    if (!handoffs.length) return input.base.invokeBatch(calls);
    if (handoffs.length !== 1) return calls.map(() => ({ status: "REJECTED", reason: "MULTIPLE_HANDOFF_REQUESTS" }));
    const result = await invoke(handoffs[0]!);
    return calls.map(c => c === handoffs[0] ? result : { status: "REJECTED", reason: "HANDOFF_TAKES_PRECEDENCE" });
  }, async recover(outcome) {
    if (outcome.disposition === "NO_SEND") return outcome;
    const actual = await terminalOutcome(); if (actual) return actual;
    if (outcome.reason === "SIZE_RULE_UNAVAILABLE") {
      if (dependencyRecoveryAttempted) return outcome;
      dependencyRecoveryAttempted = true;
      try {
        const result = await request("SIZE_RULE_UNAVAILABLE", true);
        if (result.status === "OK" || uncertain || committed) return await terminalOutcome() ?? outcome;
        return await terminalOutcome() ?? outcome;
      } catch {
        try { return await terminalOutcome() ?? outcome; }
        catch { return {disposition:"NO_SEND",reason:"HANDOFF_AUTHORITY_UNAVAILABLE",text:null,fallbackId:null}; }
      }
    }
    const recovered = await input.base.recover?.(outcome) ?? outcome;
    if (recovered.disposition !== "HANDOFF") return recovered;
    try { await request("DEPENDENCY_FAILURE"); return await terminalOutcome() ?? recovered; }
    catch { return { disposition: "NO_SEND", reason: "HANDOFF_UNAVAILABLE", text: null, fallbackId: null }; }
  } };
}
