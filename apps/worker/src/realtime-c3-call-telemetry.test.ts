import { describe, expect, it, vi } from "vitest";
import { observeRealtimeC3Calls } from "./realtime-c3-call-telemetry.js";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";

type Calls = Parameters<typeof observeRealtimeC3Calls>[1];
function request(contractVersion: string): Parameters<CandidateVertexTransport["send"]>[0] {
  return { url: "https://example.invalid", body: JSON.stringify({ contents: [{ parts: [{
    text: JSON.stringify({ contractVersion, privateInput: "not-for-telemetry" }),
  }] }] }) };
}

describe("C3 per-call observation", () => {
  it.each([
    ["REALTIME_CUSTOMER_INPUT_V1", "CUSTOMER_INPUT"],
    ["TRACK_C_C3_STRATEGIST_INPUT_V1", "STRATEGIST"],
    ["TRACK_C_C3_RESPONDER_INPUT_V1", "RESPONDER"],
    ["OTHER", "UNKNOWN"],
  ])("labels %s without storing input or output", async (contract, role) => {
    const calls: Calls = [];
    const response = { payload: { usageMetadata: {
      promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 2, totalTokenCount: 17,
    }, privateOutput: "not-for-telemetry" }, providerModelVersion: "test" };
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue(response);
    const input = request(contract);
    expect(await observeRealtimeC3Calls({ send }, calls).send(input)).toBe(response);
    expect(send).toHaveBeenCalledExactlyOnceWith(input);
    expect(calls).toEqual([{ role, status: "RETURNED", latencyMs: expect.any(Number),
      tokenUsage: { prompt: 10, output: 5, thinking: 2, total: 17 } }]);
    expect(calls[0]!.latencyMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(calls)).not.toContain("not-for-telemetry");
  });

  it("records each attempted call, preserves the original failure, and never retries", async () => {
    const calls: Calls = [];
    const failure = new Error("provider token=private-value");
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockRejectedValueOnce(failure).mockResolvedValueOnce({ payload: null, providerModelVersion: null });
    const observed = observeRealtimeC3Calls({ send }, calls);
    const input = request("REALTIME_CUSTOMER_INPUT_V1");
    await expect(observed.send(input)).rejects.toBe(failure);
    expect(send).toHaveBeenCalledTimes(1);
    await observed.send(input);
    expect(calls.map(({ status }) => status)).toEqual(["ERROR", "RETURNED"]);
    expect(calls.every(({ tokenUsage }) => Object.values(tokenUsage).every((value) => value === null))).toBe(true);
    expect(JSON.stringify(calls)).not.toContain("private-value");
  });

  it("keeps missing and invalid usage unknown rather than inventing zeros or totals", async () => {
    const calls: Calls = [];
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({ payload: {
      usageMetadata: { promptTokenCount: -1, candidatesTokenCount: "4", thoughtsTokenCount: 0,
        totalTokenCount: Number.MAX_SAFE_INTEGER + 1 },
    }, providerModelVersion: null });
    await observeRealtimeC3Calls({ send }, calls).send({ url: "https://example.invalid", body: "invalid" });
    expect(calls[0]).toMatchObject({ role: "UNKNOWN", status: "RETURNED",
      tokenUsage: { prompt: null, output: null, thinking: 0, total: null } });
  });
});
