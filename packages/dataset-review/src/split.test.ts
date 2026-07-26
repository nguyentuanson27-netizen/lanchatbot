import { describe, expect, it } from "vitest";
import { assignSplits, type SplitItem } from "./split.js";
import { lengthBin } from "./normalize.js";

function makeItems(count: number, groupEvery = 0): SplitItem[] {
  return Array.from({ length: count }, (_v, index) => ({
    conversationId: `conv_${index}`,
    duplicateGroupId: groupEvery > 0 && index % groupEvery === 0 ? "group_shared" : null,
  }));
}

describe("assignSplits", () => {
  it("is deterministic for the same seed and inputs", () => {
    const items = makeItems(100);
    const a = assignSplits(items, { DEVELOPMENT: 60, VALIDATION: 25, HOLDOUT: 15 }, "seed-1");
    const b = assignSplits(items, { DEVELOPMENT: 60, VALIDATION: 25, HOLDOUT: 15 }, "seed-1");
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it("keeps every conversation in a duplicate group in one split", () => {
    // 10 conversations all share the same duplicate group -> all one split.
    const items: SplitItem[] = Array.from({ length: 10 }, (_v, index) => ({
      conversationId: `conv_${index}`,
      duplicateGroupId: "group_shared",
    }));
    const assignment = assignSplits(items, { DEVELOPMENT: 6, VALIDATION: 3, HOLDOUT: 1 }, "seed");
    const splits = new Set(items.map((item) => assignment.get(item.conversationId)));
    expect(splits.size).toBe(1);
  });

  it("never leaks a shared group across development and holdout", () => {
    const items = makeItems(60, 5); // some share group_shared
    const assignment = assignSplits(items, { DEVELOPMENT: 36, VALIDATION: 15, HOLDOUT: 9 }, "seed-x");
    const groupSplits = new Set(
      items
        .filter((item) => item.duplicateGroupId === "group_shared")
        .map((item) => assignment.get(item.conversationId)),
    );
    expect(groupSplits.size).toBe(1);
  });

  it("assigns every conversation exactly one split", () => {
    const items = makeItems(2000);
    const assignment = assignSplits(items, { DEVELOPMENT: 1200, VALIDATION: 500, HOLDOUT: 300 }, "seed");
    expect(assignment.size).toBe(2000);
  });
});

describe("lengthBin", () => {
  it("bins by message count", () => {
    expect(lengthBin(3)).toBe("1_5");
    expect(lengthBin(8)).toBe("6_10");
    expect(lengthBin(15)).toBe("11_20");
    expect(lengthBin(40)).toBe("OVER_20");
  });
});
