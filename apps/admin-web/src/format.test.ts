import { describe, expect, it } from "vitest";
import { escapeHtml, formatDuration, formatNumber, truncate } from "./format.js";

describe("admin display formatters", () => {
  it("escapes values received from the API", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("formats numbers and queue age for Vietnamese operators", () => {
    expect(formatNumber(12345)).toBe("12.345");
    expect(formatDuration(120)).toBe("2 phút");
  });

  it("truncates long message previews", () => {
    expect(truncate("abcdef", 5)).toBe("abcd…");
  });
});
