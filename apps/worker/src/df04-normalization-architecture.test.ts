import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const TARGET_CONSUMERS = [
  new URL("../../../packages/business-tools/src/buying-signal.ts", import.meta.url),
  new URL("../../../packages/business-tools/src/guard.ts", import.meta.url),
  new URL("./realtime-sales-cycle.ts", import.meta.url),
  new URL("./verified-product-context.ts", import.meta.url),
] as const;

describe("DF04 targeted normalization boundary", () => {
  it.each(TARGET_CONSUMERS)(
    "uses the named recall-fold primitive in %s",
    (sourceUrl) => {
      const source = readFileSync(sourceUrl, "utf8");

      expect(source).toContain("foldVietnameseForRecall");
      expect(source).not.toMatch(/\.normalize\(["']NFD["']\)/u);
    },
  );
});
