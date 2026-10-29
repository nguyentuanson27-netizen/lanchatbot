import { hasResidualPii } from "@lana/dataset-review";
import { CommerceHistoryMetadataV1Schema } from "@lana/contracts";
import { finalGate, hardPrecheck, makeBinding, terminalFallback, type TerminalOutcome,
  type TrustedContext, type VerifierBinding } from "./single-agent-semantic-verifier-boundary.js";
import type { CommerceScope, CommerceToolCall, CommerceToolResult } from "./single-agent-commerce-read-only-tools.js";
import { omitCurrentProductDuplicates } from "./single-agent-commerce-read-only-context.js";

export interface NativeContent { role: "user" | "model"; parts: Record<string, unknown>[] }
/** Request metadata, never part of the mutable world/fact snapshot. */
export interface CommerceTurnTime { processingAt: string; timeZone: "Asia/Ho_Chi_Minh" }
export type OwnerGeneration = { kind: "FINAL"; text: string; telemetry?: unknown } |
  { kind: "TOOLS"; calls: CommerceToolCall[]; content: NativeContent; telemetry?: unknown };
export interface OwnerRequest { generationId: string; instructions: string; contents: NativeContent[]; context: TrustedContext; toolsAllowed: boolean;
  toolWorkAccounting?: "PRIMITIVE_WORK_V2";
  terminalHandoffAllowed?: boolean;
  pendingHandoff?: { reason: string };
  historyMetadata?: import("./single-agent-commerce-public-history.js").CommerceHistoryMetadata;
  turnTime?: CommerceTurnTime;
  mediaCapabilitiesAt?: number;
  mediaCapabilityDiagnostics?: readonly string[];
  mediaCapabilities?: readonly import("./single-agent-commerce-media-capabilities.js").MediaCapability[];
  catalogImages?: readonly import("./single-agent-commerce-media.js").CommerceCatalogImage[];
  toolBudget: { roundsRemaining: number; callsRemaining: number }; availableTools?: readonly string[]; signal: AbortSignal }
export interface VerifierRequest { generationId: string; instructions: string; finalDraft: string; trusted: TrustedContext;
  historyMetadata?: import("./single-agent-commerce-public-history.js").CommerceHistoryMetadata;
  turnTime?: CommerceTurnTime;
  latest: string; history: { role: "customer" | "shop"; text: string }[]; binding: VerifierBinding; signal: AbortSignal }
export interface VerifierGeneration { result: unknown; telemetry?: unknown }
export interface CommerceTools {
  diagnostic?(stage:import("./single-agent-commerce-diagnostics.js").CommerceDiagnosticStage,status:string,reason?:string|null,resultBytes?:number|null):void;
  /** Admitted primitive dispatches, excluding preparation and terminal handoff. */
  primitiveToolInvocations?():number;
  toolWorkAccounting?: "PRIMITIVE_WORK_V2";
  quoteTaskWork?(): readonly import("./single-agent-commerce-quote.js").QuoteTaskWork[];
  handoffSources?(): import("@lana/contracts").CommerceHandoffSourceCheckV1[] | null;
  boundedPrice?(): { text: string; claims: import("@lana/contracts").ProtectedClaimV1[] } | null;
  sealHandoffReply?(text: string, trusted: TrustedContext, images: readonly import("./single-agent-commerce-media-delivery.js").MediaDeliveryImage[]): string;
  completeHandoff?(outcome: TerminalOutcome, readback: () => Promise<TrustedContext>): Promise<TerminalOutcome>;
  /** Code-only recovery: atomically transfer ownership without customer output. */
  recoverFallback?(outcome: TerminalOutcome): Promise<TerminalOutcome>;
  handoffStatus?(): { attempts: number; status: "PREPARED" | "COMMITTED" | "BLOCKED" | "UNKNOWN"; reason: string } | null;
  publicCartSummary?(): unknown;
  /** Code-owned exact static fallback identity after a tool outcome. */
  fallbackId?(): string;
  sizeOutcome?(): { status: string } | null;
  mediaCapabilityDiagnostics?(): readonly string[];
  mediaCapabilities?(): readonly import("./single-agent-commerce-media-capabilities.js").MediaCapability[];
  catalogImages?(): readonly import("./single-agent-commerce-media.js").CommerceCatalogImage[];
  mediaSelection?(): readonly import("./single-agent-commerce-media.js").CommerceMediaAsset[];
  prepare?(admit?:(context:TrustedContext)=>boolean): Promise<number>;
  availableTools?: readonly string[];
  invoke(call: CommerceToolCall): Promise<CommerceToolResult>;
  invokeBatch(calls: CommerceToolCall[]): Promise<CommerceToolResult[]>;
  snapshot(): TrustedContext;
  readback(): Promise<TrustedContext>;
  recover?(outcome: TerminalOutcome): Promise<TerminalOutcome>;
  /** Code-owned terminal effect, e.g. a committed handoff. Never a model draft. */
  terminalOutcome?(): Promise<TerminalOutcome | null>;
}
const bytes = (v: unknown) => Buffer.byteLength(typeof v === "string" ? v : JSON.stringify(v));

// Charge the 8KB tool batch for evidence not already in the snapshot. Raw results stay
// in the transcript so a later change can still expose the old/different evidence.
export function resultBudgetView(calls: CommerceToolCall[], results: CommerceToolResult[], context: TrustedContext) {
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  const product = (v: unknown) => record(v)
    ? omitCurrentProductDuplicates(v, context.runtimeProducts?.find(p => p.subjectRef === v.subjectRef)) : v;
  return results.map((result, i) => {
    if (result.status !== "OK" || !record(result.data)) return result;
    const data = result.data;
    if (calls[i]?.name === "search_products" && Array.isArray(data.products))
      return {...result, data:{...data, products:data.products.map(product)}};
    if (["read_product","quote_product"].includes(calls[i]?.name??"")) {
      const availability = record(data.availability) ? data.availability : {};
      if (["price", "stock"].some(k => record(availability[k]) && availability[k].status !== "OK")) return result;
      return {...result, data:product(data)};
    }
    return result;
  });
}


/** Isolated candidate. Native continuations add world information; no retry, repair, Outbox or send capability. */
export async function runCommerceTurn(input: {
  /** Pure native-serializer admission. Must never call a provider or mutate state. */
  admitPreparedContext?:(request:OwnerRequest)=>boolean;
  /** Evaluation-only witness of the existing final gate. Does not change its decision. */
  captureBoundaryWitness?: boolean;
  historyMetadata?: import("./single-agent-commerce-public-history.js").CommerceHistoryMetadata;
  scope: CommerceScope; latest: string; history: { role: "customer" | "shop"; text: string }[];
  ownerPrompt: string; verifierPrompt: string; tools: CommerceTools; clock: () => Date; timeoutMs?: number;
  /** The transport bounds its exact serialized provider body before dispatch. */
  owner: (request: OwnerRequest) => Promise<OwnerGeneration>;
  verifier: (request: VerifierRequest) => Promise<VerifierGeneration>;
}) {
  const selectedFallback = () => {
    if (input.tools.sizeOutcome?.()) return terminalFallback("C3_A_NONPROTECTED_V2");
    const id = input.tools.fallbackId?.() ?? "C3_A_NONPROTECTED_V2";
    return terminalFallback(id);
  };
  const fallback = (reason:string):TerminalOutcome => ({...selectedFallback(),reason});
  const gateFallback = () => {const value=selectedFallback();return {id:value.fallbackId??"",text:value.text??""};};
  const turnTime: Readonly<CommerceTurnTime> = Object.freeze({ processingAt: input.clock().toISOString(), timeZone: "Asia/Ho_Chi_Minh" });
  let ownerGenerations = 0, verifierGenerations = 0, toolRounds = 0, toolCalls = 0;
  let executedNormalToolInvocations=0,quoteAttempted=false;
  const primitiveAccounting=input.tools.toolWorkAccounting==="PRIMITIVE_WORK_V2";
  let terminalHandoffCalls = 0, proposedToolCalls = 0, rejectedToolCalls = 0;
  let toolLatencyMs = 0, verificationStarted: number | undefined;
  const generations: { id: string; role: "owner" | "verifier"; status: string; latencyMs: number; telemetry?: unknown }[] = [];
  const finish = async (terminal: TerminalOutcome, committedTerminal = false) => {
    let recovery: { originalDisposition: TerminalOutcome["disposition"]; originalReason: string;
      originalDiagnostic?: TerminalOutcome["diagnostic"] } | null = null;
    const rejected = terminal.disposition === "FALLBACK" ||
      (terminal.disposition === "HANDOFF" && !committedTerminal && input.tools.handoffStatus?.()?.status !== "COMMITTED");
    if (rejected) {
      recovery = { originalDisposition: terminal.disposition, originalReason: terminal.reason,
        ...(terminal.diagnostic ? { originalDiagnostic: terminal.diagnostic } : {}) };
      try {
        terminal = await input.tools.recoverFallback?.(terminal) ??
          { disposition: "NO_SEND", reason: "FALLBACK_HANDOFF_UNAVAILABLE", text: null, fallbackId: null };
        if (!["HANDOFF", "NO_SEND"].includes(terminal.disposition) || terminal.text !== null || terminal.fallbackId !== null)
          terminal = { disposition: "NO_SEND", reason: "FALLBACK_HANDOFF_UNPROVED", text: null, fallbackId: null };
      } catch { terminal = { disposition: "NO_SEND", reason: "FALLBACK_HANDOFF_UNAVAILABLE", text: null, fallbackId: null }; }
    } else if (input.tools.completeHandoff && input.tools.handoffStatus?.()?.status === "PREPARED") {
      try { terminal = await input.tools.completeHandoff(terminal, () => input.tools.readback()); }
      catch { terminal = {disposition:"NO_SEND",reason:"HANDOFF_FINALIZE_UNAVAILABLE",text:null,fallbackId:null}; }
    }
    const handoff = input.tools.handoffStatus?.();
    terminalHandoffCalls = Math.max(terminalHandoffCalls, handoff?.attempts ?? 0);
    const quoteTaskWork=input.tools.quoteTaskWork?.()??[];
    return { terminal, recovery, sendEnabled: false as const, ownerGenerations, verifierGenerations, toolRounds,
      ...(primitiveAccounting?{toolWorkAccounting:"PRIMITIVE_WORK_V2" as const,quoteTaskWork,executedNormalToolInvocations:executedNormalToolInvocations+(input.tools.primitiveToolInvocations?.()??0),
        executedToolInvocations:executedNormalToolInvocations+(input.tools.primitiveToolInvocations?.()??0)+terminalHandoffCalls}:{}),
      normalToolCalls: toolCalls, terminalHandoffCalls, toolCalls: toolCalls + terminalHandoffCalls,
      proposedToolCalls, rejectedToolCalls, handoff: handoff ?? null, generations,
      toolLatencyMs, verificationLatencyMs: verificationStarted === undefined ? null : performance.now()-verificationStarted };
  };
  const effectTerminal = async () => {
    try { return await input.tools.terminalOutcome?.() ?? null; }
    catch { return { disposition: "NO_SEND" as const, reason: "TERMINAL_READBACK_UNAVAILABLE", text: null, fallbackId: null }; }
  };
  async function generate<T>(role: "owner" | "verifier", id: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const started = performance.now(), controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const output = await Promise.race([fn(controller.signal), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("TIMEOUT")); }, input.timeoutMs ?? 90_000);
      })]);
      generations.push({ id, role, status: "OK", latencyMs: performance.now() - started,
        ...(output && typeof output === "object" && "telemetry" in output ? { telemetry: output.telemetry } : {}) });
      return output;
    } catch (error) {
      generations.push({ id, role, status: error instanceof Error && ["TIMEOUT", "PROVIDER_TIMEOUT"].includes(error.message) ? "TIMEOUT" : "PROVIDER_ERROR", latencyMs: performance.now() - started,
        ...(error && typeof error === "object" && "telemetry" in error ? { telemetry: error.telemetry } : {}) });
      throw error;
    } finally { if (timer) clearTimeout(timer); }
  }
  const metadataValid=input.historyMetadata===undefined || CommerceHistoryMetadataV1Schema.safeParse(input.historyMetadata).success;
  if (!metadataValid || (input.historyMetadata && (bytes(input.historyMetadata)>1024||bytes(input.historyMetadata.publicCartEvents)>768)))return finish(fallback("INPUT_BOUND"));
  if (!input.latest.trim() || bytes(input.latest) > 2048 || input.history.length > 8 ||
    input.history.some(m => !["customer", "shop"].includes(m.role) || typeof m.text !== "string") ||
    input.history.reduce((n, m) => n + bytes(m.text), 0) + (input.historyMetadata?.publicCartEvents.length ? bytes(input.historyMetadata) : 0) > 4096) return finish(fallback("INPUT_BOUND"));
  if (hasResidualPii(input.latest) || input.history.some(m => hasResidualPii(m.text))) {
    return finish({ disposition: "NO_SEND", reason: "PRIVACY", text: null, fallbackId: null });
  }
  const contents: NativeContent[] = [...input.history.map(m => ({ role: m.role === "customer" ? "user" as const : "model" as const,
    parts: [{ text: m.text }] })), { role: "user", parts: [{ text: input.latest }] }];
  const initialTerminal = await effectTerminal(); if (initialTerminal) return finish(initialTerminal, true);
  const initial = input.tools.snapshot();
  if (!initial.state.permission || initial.state.conversationOwner !== "BOT" || !initial.state.privacyAllowed) {
    return finish({ disposition: "NO_SEND", reason: "PERMISSION_OR_PRIVACY", text: null, fallbackId: null });
  }
  const preparationStarted = performance.now();
  if(primitiveAccounting&&!input.tools.primitiveToolInvocations)return finish({disposition:"NO_SEND",reason:"TOOL_ACCOUNTING_UNAVAILABLE",text:null,fallbackId:null});
  try { toolCalls += await input.tools.prepare?.(context=>{
    if(!input.admitPreparedContext||hardPrecheck(context,"Dạ.",input.clock())!==null)return false;
    return input.admitPreparedContext({generationId:`${input.scope.requestId}:owner:1`,instructions:input.ownerPrompt,contents:structuredClone(contents),context,turnTime,
      ...(primitiveAccounting?{toolWorkAccounting:"PRIMITIVE_WORK_V2" as const}:{}),
      ...(input.historyMetadata?.publicCartEvents.length?{historyMetadata:structuredClone(input.historyMetadata)}:{}),
      ...(input.tools.availableTools?{availableTools:input.tools.availableTools}:{}),
      ...(input.tools.catalogImages?{catalogImages:input.tools.catalogImages()}:{}),
      ...(input.tools.mediaCapabilities?{mediaCapabilities:input.tools.mediaCapabilities(),mediaCapabilitiesAt:input.clock().getTime()}:{}),
      terminalHandoffAllowed:input.tools.availableTools?.includes("request_handoff")===true,
      toolsAllowed:true,toolBudget:{roundsRemaining:2,callsRemaining:5},signal:new AbortController().signal});
  }) ?? 0; }
  catch { return finish(fallback("PREPARATION_UNAVAILABLE")); }
  toolLatencyMs += performance.now() - preparationStarted;
  executedNormalToolInvocations=toolCalls;
  for (let index = 0; index < 3; index++) {
    const context = input.tools.snapshot();
    if (!context.state.permission || context.state.conversationOwner !== "BOT" || !context.state.privacyAllowed) {
      return finish({ disposition: "NO_SEND", reason: "PERMISSION_OR_PRIVACY", text: null, fallbackId: null });
    }
    const id = `${input.scope.requestId}:owner:${index + 1}`;
    const handoff = input.tools.handoffStatus?.(), pendingHandoff = handoff?.status === "PREPARED" ? {reason:handoff.reason} : undefined;
    const terminalHandoffAllowed = !handoff && terminalHandoffCalls === 0 && input.tools.availableTools?.includes("request_handoff") === true;
    const request = { generationId: id, instructions: input.ownerPrompt, contents: structuredClone(contents), context, turnTime,
      ...(primitiveAccounting?{toolWorkAccounting:"PRIMITIVE_WORK_V2" as const}:{}),
      terminalHandoffAllowed, ...(pendingHandoff ? {pendingHandoff} : {}),
      ...(input.historyMetadata?.publicCartEvents.length?{historyMetadata:structuredClone(input.historyMetadata)}:{}),
      ...(input.tools.catalogImages?{catalogImages:input.tools.catalogImages()}:{}),
      ...(input.tools.mediaCapabilities?{mediaCapabilities:input.tools.mediaCapabilities(),mediaCapabilitiesAt:input.clock().getTime()}:{}),
      ...(input.tools.mediaCapabilityDiagnostics?{mediaCapabilityDiagnostics:input.tools.mediaCapabilityDiagnostics()}:{}),
      ...(input.tools.availableTools ? { availableTools: input.tools.availableTools } : {}),
      toolsAllowed: !handoff && toolRounds < 2 && toolCalls < 6, toolBudget: { roundsRemaining: 2-toolRounds, callsRemaining: 6-toolCalls } };
    // The native transport owns its serialized wire bound after projection.
    let output: OwnerGeneration;
    ownerGenerations++;
    try { output = await generate("owner", id, signal => input.owner({ ...request, signal })); }
    catch { return finish(fallback(generations.at(-1)!.status)); }
    if (!output || typeof output !== "object") return finish(fallback("MALFORMED"));
    if (output.kind === "TOOLS") {
      if(!Array.isArray(output.calls)||output.calls.some(c=>!c||typeof c.name!=="string"))return finish(fallback("MALFORMED"));
      proposedToolCalls += output.calls.length;
      const quoteCalls=output.calls.filter(c=>c.name==="quote_product");
      if(quoteCalls.length&&(output.calls.length!==1||quoteAttempted)){
        rejectedToolCalls+=output.calls.length;return finish(fallback("OWNER_TOOL_MODE"));
      }
      const units=primitiveAccounting&&quoteCalls.length?2:output.calls.length;
      const handoffCalls = output.calls.filter(c => c.name === "request_handoff");
      const terminalCall = handoffCalls.length === 1 && output.calls.length === 1;
      if (handoffCalls.length && (!terminalCall || (!terminalHandoffAllowed && (!request.toolsAllowed || input.tools.availableTools !== undefined)))) {
        rejectedToolCalls += output.calls.length;
        return finish(fallback("OWNER_TOOL_MODE"));
      }
      if (!request.toolsAllowed && !(terminalCall && terminalHandoffAllowed)) {
        // Retain output/telemetry, but do not count a final-only tool call as a
        // successful completion or execute it after the budget is exhausted.
        generations.at(-1)!.status = "PROVIDER_ERROR";
        rejectedToolCalls += output.calls.length;
        return finish(fallback("OWNER_TOOL_MODE"));
      }
      if (!output.calls.length || (!terminalCall && (toolRounds >= 2 || toolCalls + units > 6))) {
        rejectedToolCalls += output.calls.length;return finish(fallback("BUDGET"));
      }
      if(quoteCalls.length)quoteAttempted=true;
      if (terminalCall) terminalHandoffCalls++; else {toolRounds++; toolCalls += units;}
      const toolStarted = performance.now();
      const results = await input.tools.invokeBatch(output.calls).catch(() => output.calls.map(() => ({ status: "UNAVAILABLE" as const, reason: "TOOL_ERROR" })));
      rejectedToolCalls += results.filter(result=>result.status==="REJECTED").length;
      toolLatencyMs += performance.now()-toolStarted;
      const actual = await effectTerminal();
      if (actual) return finish(actual, true);
      if(terminalCall&&(results.length!==1||results[0]?.status!=="OK"))
        return finish({disposition:"NO_SEND",reason:"HANDOFF_REQUEST_REJECTED",text:null,fallbackId:null});
      if (input.tools.sizeOutcome?.()?.status === "NO_VERIFIED_CHART") return finish(fallback("SIZE_RULE_UNAVAILABLE"));
      const resultBytes=bytes(resultBudgetView(output.calls, results, input.tools.snapshot()));
      input.tools.diagnostic?.("RESULT_BOUND",results.length!==output.calls.length||resultBytes>8192?"REJECTED":"OK",null,resultBytes);
      if (results.length !== output.calls.length || resultBytes > 8192)
        return finish(fallback("TOOL_RESULT_BOUND"));
      contents.push(structuredClone(output.content), { role: "user", parts: results.map((result, i) => ({
        functionResponse: { name: output.calls[i]!.name, response: result,
          ...(output.calls[i]!.id ? { id: output.calls[i]!.id } : {}) },
      })) });
      continue;
    }
    if (output.kind !== "FINAL" || typeof output.text !== "string") return finish(fallback("MALFORMED"));
    // Reserved transport namespace, never customer prose. Reject, never rewrite a draft.
    if (output.text.toLowerCase().includes("asset:")) {
      const current = input.tools.snapshot();
      if (!current.state.permission || !current.state.privacyAllowed || current.state.conversationOwner !== "BOT")
        return finish({disposition:"NO_SEND",reason:"PERMISSION_OR_PRIVACY",text:null,fallbackId:null});
      return finish(fallback("OWNER_OUTPUT_ARTIFACT"));
    }
    const trusted = input.tools.snapshot();
    let draft:string;
    try { draft = input.tools.sealHandoffReply?.(output.text, trusted,input.tools.mediaSelection?.()??[]) ?? output.text; }
    catch { return finish(fallback("HANDOFF_REPLY_BOUND")); }
    const binding = makeBinding(input.scope.requestId, draft, trusted);
    const problem = hardPrecheck(trusted, draft, input.clock());
    if (problem) return finish(finalGate({ expected: binding, response: { kind: "PROVIDER_ERROR" }, current: trusted,
      finalDraft: draft, now: input.clock(), includeDiagnostic: true, fallback: gateFallback() }));
    const verifyId = `${input.scope.requestId}:verifier:1`;
    verificationStarted = performance.now();
    verifierGenerations++;
    let response;
    try {
      const result = await generate("verifier", verifyId, signal => input.verifier({ generationId: verifyId,
        instructions: input.verifierPrompt, finalDraft: draft, trusted, latest: input.latest,
        history: structuredClone(input.history), binding, turnTime, signal,
        ...(input.historyMetadata?.publicCartEvents.length?{historyMetadata:structuredClone(input.historyMetadata)}:{}) }));
      response = { kind: "VERDICT" as const, binding, result: result.result };
    } catch { response = { kind: generations.at(-1)!.status === "TIMEOUT" ? "TIMEOUT" as const : "PROVIDER_ERROR" as const }; }
    let current: TrustedContext;
    input.tools.diagnostic?.("CURRENT_READBACK","STARTED");
    try { current = await input.tools.readback();input.tools.diagnostic?.("CURRENT_READBACK","OK"); }
    catch { input.tools.diagnostic?.("CURRENT_READBACK","ERROR","UNKNOWN_INTERNAL");return finish({ disposition: "HANDOFF", reason: "CURRENT_READBACK_UNAVAILABLE", text: null, fallbackId: null }); }
    const boundaryCheckedAt = input.clock();
    const terminal = finalGate({ expected: binding, response, current, finalDraft: draft, now: boundaryCheckedAt, includeDiagnostic: true,
      fallback: gateFallback() });
    input.tools.diagnostic?.("FINAL_GATE",terminal.disposition);
    return { ...await finish(terminal), ...(terminal.diagnostic ? { currentPublicContext: current } : {}),
      ...(input.captureBoundaryWitness ? { boundaryWitness: { expected: binding,
        currentBinding: makeBinding(binding.requestId, draft, current), checkedAt: boundaryCheckedAt.toISOString(), terminal,
        currentPublicContext: current, responseKind: response.kind } } : {}) };
  }
  return finish(fallback("BUDGET"));
}
