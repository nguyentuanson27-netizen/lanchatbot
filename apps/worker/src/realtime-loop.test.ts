import { describe, expect, it, vi } from "vitest";
import { runRealtimeLoop, type RealtimeLoopStatus } from "./realtime-loop.js";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 2));

describe("realtime loop", () => {
  it("bounds parallel work and emits a single stopping heartbeat", async () => {
    const controller = new AbortController();
    let calls = 0;
    let active = 0;
    let maxActive = 0;
    const statuses: RealtimeLoopStatus[] = [];
    const runner = {
      async processOne(): Promise<boolean> {
        calls += 1;
        if (calls > 12) {
          controller.abort();
          return false;
        }
        active += 1;
        maxActive = Math.max(maxActive, active);
        await tick();
        active -= 1;
        return true;
      },
    };
    const inbox = {
      heartbeat: vi.fn(async (_workerId: string, status: RealtimeLoopStatus) => {
        statuses.push(status);
      }),
      waitForWork: vi.fn(async (_timeoutMs: number, signal?: AbortSignal) => {
        if (!signal?.aborted) await tick();
      }),
    };

    await runRealtimeLoop({
      runner,
      inbox,
      workerId: "worker-1",
      mode: "LIVE",
      sendEnabled: true,
      concurrency: 3,
      fallbackPollMs: 20,
      heartbeatMs: 60_000,
      signal: controller.signal,
    });

    expect(maxActive).toBe(3);
    expect(statuses[0]).toBe("STARTING");
    expect(statuses.at(-1)).toBe("STOPPING");
    expect(statuses.filter((status) => status === "PROCESSING")).toHaveLength(1);
  });

  it("shares one wake wait across all idle slots", async () => {
    const controller = new AbortController();
    let releaseWake: (() => void) | undefined;
    const waitForWork = vi.fn((_timeoutMs: number, signal?: AbortSignal) =>
      new Promise<void>((resolve) => {
        releaseWake = resolve;
        signal?.addEventListener("abort", () => resolve(), { once: true });
      })
    );
    const runner = { processOne: vi.fn(async () => false) };
    const running = runRealtimeLoop({
      runner,
      inbox: { heartbeat: vi.fn(async () => undefined), waitForWork },
      workerId: "worker-1",
      mode: "LIVE",
      sendEnabled: true,
      concurrency: 4,
      fallbackPollMs: 10_000,
      heartbeatMs: 60_000,
      signal: controller.signal,
    });

    await tick();
    expect(waitForWork).toHaveBeenCalledTimes(1);
    controller.abort();
    releaseWake?.();
    await running;
  });
});
