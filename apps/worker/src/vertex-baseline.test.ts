import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { baselineModelCapability } from "./vertex-baseline.js";

describe("baseline model capability", () => {
  it("exposes baseline generation without a Context V2 candidate capability", async () => {
    const generated = {
      proposal: { action: "NO_REPLY" },
      modelVersion: "baseline-v1",
      latencyMs: 1,
      tokenUsage: {},
    };
    const generate = vi.fn(async () => generated);
    const capability = baselineModelCapability({ generate } as never);

    await expect(capability.generate([], "lana-realtime-v1")).resolves.toBe(generated);
    expect(generate).toHaveBeenCalledWith([], "lana-realtime-v1");
    expect("generateCandidate" in capability).toBe(false);
  });

  it("keeps Context V2 imports outside the byte-frozen baseline boundary", () => {
    const boundarySource = readFileSync(
      new URL("./vertex-baseline.ts", import.meta.url),
      "utf8",
    );
    const vertexSource = readFileSync(new URL("./vertex.ts", import.meta.url), "utf8");

    expect(boundarySource).not.toMatch(/context-v2/iu);
    expect(vertexSource).not.toMatch(/context-v2/iu);
  });
});
