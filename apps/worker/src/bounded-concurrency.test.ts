import { describe, expect, it } from "vitest";
import { mapWithBoundedConcurrency } from "./bounded-concurrency.js";

describe("mapWithBoundedConcurrency", () => {
  it.each([4, 10, 11, 14])(
    "never exceeds concurrency three for %i fact jobs and preserves input order",
    async (count) => {
      let active = 0;
      let peak = 0;
      const completions: number[] = [];
      const releases = new Map<number, () => void>();

      const pending = mapWithBoundedConcurrency(
        Array.from({ length: count }, (_, index) => index),
        3,
        async (index) => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise<void>((resolve) => releases.set(index, resolve));
          active -= 1;
          completions.push(index);
          return `fact-${index}`;
        },
      );

      // Release each active group in reverse order so completion order differs
      // deterministically from customer/input order.
      for (let start = 0; start < count; start += 3) {
        const group = Array.from(
          { length: Math.min(3, count - start) },
          (_, offset) => start + offset,
        );
        for (let attempt = 0; attempt < 50; attempt += 1) {
          if (group.every((index) => releases.has(index))) break;
          await Promise.resolve();
        }
        expect(group.every((index) => releases.has(index))).toBe(true);
        for (const index of [...group].reverse()) releases.get(index)?.();
      }

      const results = await pending;
      expect(peak).toBeLessThanOrEqual(3);
      expect(completions).not.toEqual(Array.from({ length: count }, (_, index) => index));
      expect(results).toEqual(Array.from({ length: count }, (_, index) => `fact-${index}`));
    },
  );

  it("rejects the whole batch when one fact dependency fails instead of returning partial-complete output", async () => {
    const completed: number[] = [];

    await expect(mapWithBoundedConcurrency(
      Array.from({ length: 11 }, (_, index) => index),
      3,
      async (index) => {
        if (index === 5) throw new Error("FACT_DEPENDENCY_TIMEOUT");
        completed.push(index);
        return `fact-${index}`;
      },
    )).rejects.toThrow("FACT_DEPENDENCY_TIMEOUT");

    expect(completed).not.toContain(5);
  });
});
