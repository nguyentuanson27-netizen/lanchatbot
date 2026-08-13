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
    expect(salesCycle).toContain("MODEL_CONFIRMATION_NOT_AUTHORITY");
  });

  it("wires protected outbound readiness and versioned atomic commerce validation", () => {
    const runner = readFileSync(new URL("./realtime-runner.ts", import.meta.url), "utf8");
    const database = readFileSync(
      new URL("../../../packages/database/src/realtime-runtime.ts", import.meta.url),
      "utf8",
    );
    expect(runner).toContain('effect: "PROTECTED_OUTBOUND"');
    expect(runner).toContain("protectedClaims: protectedOutboundClaims");
    expect(database).toContain('readinessContractVersion !== "DF06_EFFECT_READINESS_V1"');
    expect(database).toContain('throw new Error("EFFECT_READINESS_REQUIRED")');
    expect(database).toContain("EFFECT_READINESS_CLAIM_BINDING_MISMATCH");
    expect(database).toContain("EFFECT_READINESS_CLAIM_SCOPE_MISMATCH");
    expect(database).toContain("EFFECT_READINESS_CONFIRMATION_BINDING_MISMATCH");
    expect(database).toContain("EFFECT_READINESS_PREVIEW_MISMATCH");
  });
});
