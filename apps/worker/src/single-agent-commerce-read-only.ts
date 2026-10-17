import { hasResidualPii } from "@lana/dataset-review";
import { finalGate, hardPrecheck, makeBinding, terminalFallback, type TerminalOutcome,
  type TrustedContext, type VerifierBinding } from "./single-agent-semantic-verifier-boundary.js";
import type { CommerceScope, CommerceToolCall, CommerceToolResult } from "./single-agent-commerce-read-only-tools.js";

export interface NativeContent { role: "user" | "model"; parts: Record<string, unknown>[] }
export type OwnerGeneration = { kind: "FINAL"; text: string; telemetry?: unknown } |
  { kind: "TOOLS"; calls: CommerceToolCall[]; content: NativeContent; telemetry?: unknown };
export interface OwnerRequest { generationId: string; instructions: string; contents: NativeContent[]; context: TrustedContext; toolsAllowed: boolean;
  toolBudget: { roundsRemaining: number; callsRemaining: number }; availableTools?: readonly string[]; signal: AbortSignal }
export interface VerifierRequest { generationId: string; instructions: string; finalDraft: string; trusted: TrustedContext;
  latest: string; history: { role: "customer" | "shop"; text: string }[]; binding: VerifierBinding; signal: AbortSignal }
export interface VerifierGeneration { result: unknown; telemetry?: unknown }
export interface CommerceTools {
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
const fallback = (reason: string): TerminalOutcome => ({ ...terminalFallback("C3_A_NONPROTECTED_V2"), reason });

/** Isolated candidate. Native continuations add world information; no retry, repair, Outbox or send capability. */
export async function runCommerceTurn(input: {
  scope: CommerceScope; latest: string; history: { role: "customer" | "shop"; text: string }[];
  ownerPrompt: string; verifierPrompt: string; tools: CommerceTools; clock: () => Date; timeoutMs?: number;
  /** The transport bounds its exact serialized provider body before dispatch. */
  owner: (request: OwnerRequest) => Promise<OwnerGeneration>;
  verifier: (request: VerifierRequest) => Promise<VerifierGeneration>;
}) {
  let ownerGenerations = 0, verifierGenerations = 0, toolRounds = 0, toolCalls = 0;
  let toolLatencyMs = 0, verificationStarted: number | undefined;
  const generations: { id: string; role: "owner" | "verifier"; status: string; latencyMs: number; telemetry?: unknown }[] = [];
  const finish = async (terminal: TerminalOutcome) => {
    let recovery: { originalDisposition: TerminalOutcome["disposition"]; originalReason: string;
      originalDiagnostic?: TerminalOutcome["diagnostic"] } | null = null;
    if (terminal.disposition !== "SEND_ELIGIBLE" && input.tools.recover) {
      recovery = { originalDisposition: terminal.disposition, originalReason: terminal.reason,
        ...(terminal.diagnostic ? { originalDiagnostic: terminal.diagnostic } : {}) };
      try { terminal = await input.tools.recover(terminal); }
      catch { terminal = { disposition: "NO_SEND", reason: "RECOVERY_UNAVAILABLE", text: null, fallbackId: null }; }
    }
    return { terminal, recovery, sendEnabled: false as const, ownerGenerations, verifierGenerations, toolRounds, toolCalls, generations,
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
  if (!input.latest.trim() || bytes(input.latest) > 2048 || input.history.length > 8 ||
    input.history.some(m => !["customer", "shop"].includes(m.role) || typeof m.text !== "string") ||
    input.history.reduce((n, m) => n + bytes(m.text), 0) > 4096) return finish(fallback("INPUT_BOUND"));
  if (hasResidualPii(input.latest) || input.history.some(m => hasResidualPii(m.text))) {
    return finish({ disposition: "NO_SEND", reason: "PRIVACY", text: null, fallbackId: null });
  }
  const contents: NativeContent[] = [...input.history.map(m => ({ role: m.role === "customer" ? "user" as const : "model" as const,
    parts: [{ text: m.text }] })), { role: "user", parts: [{ text: input.latest }] }];
  for (let index = 0; index < 3; index++) {
    const actual = await effectTerminal(); if (actual) return finish(actual);
    const context = input.tools.snapshot();
    if (!context.state.permission || context.state.conversationOwner !== "BOT" || !context.state.privacyAllowed) {
      return finish({ disposition: "NO_SEND", reason: "PERMISSION_OR_PRIVACY", text: null, fallbackId: null });
    }
    const id = `${input.scope.requestId}:owner:${index + 1}`;
    const request = { generationId: id, instructions: input.ownerPrompt, contents: structuredClone(contents), context,
      ...(input.tools.availableTools ? { availableTools: input.tools.availableTools } : {}),
      toolsAllowed: toolRounds < 2 && toolCalls < 6, toolBudget: { roundsRemaining: 2-toolRounds, callsRemaining: 6-toolCalls } };
    // Internal context and tool responses may repeat evidence. The native
    // transport owns the frozen 32KB wire bound after its exact projection.
    let output: OwnerGeneration;
    ownerGenerations++;
    try { output = await generate("owner", id, signal => input.owner({ ...request, signal })); }
    catch { return finish(fallback(generations.at(-1)!.status)); }
    if (!output || typeof output !== "object") return finish(fallback("MALFORMED"));
    if (output.kind === "TOOLS") {
      if (!output.calls.length || toolRounds >= 2 || toolCalls + output.calls.length > 6) return finish(fallback("BUDGET"));
      toolRounds++; toolCalls += output.calls.length;
      const toolStarted = performance.now();
      const results = await input.tools.invokeBatch(output.calls).catch(() => output.calls.map(() => ({ status: "UNAVAILABLE" as const, reason: "TOOL_ERROR" })));
      toolLatencyMs += performance.now()-toolStarted;
      const actual = await effectTerminal();
      if (actual) return finish(actual);
      if (results.length !== output.calls.length || bytes(results) > 8192) return finish(fallback("TOOL_RESULT_BOUND"));
      contents.push(structuredClone(output.content), { role: "user", parts: results.map((result, i) => ({
        functionResponse: { name: output.calls[i]!.name, response: result,
          ...(output.calls[i]!.id ? { id: output.calls[i]!.id } : {}) },
      })) });
      continue;
    }
    if (output.kind !== "FINAL" || typeof output.text !== "string") return finish(fallback("MALFORMED"));
    const trusted = input.tools.snapshot(), binding = makeBinding(input.scope.requestId, output.text, trusted);
    const problem = hardPrecheck(trusted, output.text, input.clock());
    if (problem) return finish(finalGate({ expected: binding, response: { kind: "PROVIDER_ERROR" }, current: trusted,
      finalDraft: output.text, now: input.clock(), includeDiagnostic: true, fallback: { id: "C3_A_NONPROTECTED_V2", text: "Phần này em chưa trả lời được, chị nhé." } }));
    const verifyId = `${input.scope.requestId}:verifier:1`;
    verificationStarted = performance.now();
    verifierGenerations++;
    let response;
    try {
      const result = await generate("verifier", verifyId, signal => input.verifier({ generationId: verifyId,
        instructions: input.verifierPrompt, finalDraft: output.text, trusted, latest: input.latest,
        history: structuredClone(input.history), binding, signal }));
      response = { kind: "VERDICT" as const, binding, result: result.result };
    } catch { response = { kind: generations.at(-1)!.status === "TIMEOUT" ? "TIMEOUT" as const : "PROVIDER_ERROR" as const }; }
    let current: TrustedContext;
    try { current = await input.tools.readback(); }
    catch { return finish({ disposition: "HANDOFF", reason: "CURRENT_READBACK_UNAVAILABLE", text: null, fallbackId: null }); }
    return finish(finalGate({ expected: binding, response, current, finalDraft: output.text, now: input.clock(), includeDiagnostic: true,
      fallback: { id: "C3_A_NONPROTECTED_V2", text: "Phần này em chưa trả lời được, chị nhé." } }));
  }
  return finish(fallback("BUDGET"));
}
