import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("DF05 canonical buying authority wiring", () => {
  it("resolves canonical evidence in the runner and passes it to commerce", () => {
    const runner = readFileSync(
      new URL("./realtime-runner.ts", import.meta.url),
      "utf8",
    );

    expect(runner.match(/buildCanonicalDecisionEvidenceV1\(/gu)).toHaveLength(1);
    expect(runner).toContain("canonicalBuyingIntent:");
  });

  it("does not re-resolve buying intent inside the sales-cycle consumer", () => {
    const salesCycle = readFileSync(
      new URL("./realtime-sales-cycle.ts", import.meta.url),
      "utf8",
    );

    expect(salesCycle).toContain("CanonicalBuyingIntentV1");
    expect(salesCycle).not.toContain("resolveHybridBuyingSignal");
  });
});
