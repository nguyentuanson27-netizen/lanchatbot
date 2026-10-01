import type { RealtimeDecisionEventPlan } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";

type Call = NonNullable<RealtimeDecisionEventPlan["details"]["c3ModelCalls"]>[number];
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};

function role(body: string): Call["role"] {
  try {
    const prompt = JSON.parse(JSON.parse(body).contents[0].parts[0].text) as { contractVersion?: unknown };
    switch (prompt.contractVersion) {
      case "REALTIME_CUSTOMER_INPUT_V1": return "CUSTOMER_INPUT";
      case "TRACK_C_C3_STRATEGIST_INPUT_V1": return "STRATEGIST";
      case "TRACK_C_C3_RESPONDER_INPUT_V1": return "RESPONDER";
      default: return "UNKNOWN";
    }
  } catch { return "UNKNOWN"; }
}

/** Observe existing send calls, including validation retries. No retry, prompt,
 * provider error text, output text or credentials are added to the event.
 * RETURNED means transport returned, not that schema/guard/quality passed.
 */
export function observeRealtimeC3Calls(transport: CandidateVertexTransport, calls: Call[]): CandidateVertexTransport {
  return { async send(request) {
    const started = performance.now();
    let status: Call["status"] = "ERROR";
    let usage: Record<string, unknown> = {};
    try {
      const response = await transport.send(request);
      status = "RETURNED";
      usage = record(record(response.payload).usageMetadata);
      return response;
    } finally {
      const count = (field: string): number | null => {
        const value = usage[field];
        return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
      };
      calls.push({ role: role(request.body), status, latencyMs: Math.max(0, performance.now() - started),
        tokenUsage: { prompt: count("promptTokenCount"), output: count("candidatesTokenCount"),
          thinking: count("thoughtsTokenCount"), total: count("totalTokenCount") } });
    }
  } };
}
