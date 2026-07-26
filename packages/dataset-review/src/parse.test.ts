import { describe, expect, it } from "vitest";
import { parseTranscript } from "./parse.js";

describe("parseTranscript", () => {
  it("splits messages by role prefix and counts roles", () => {
    const result = parseTranscript(
      "[Khách hàng]: cho xin giá\n[Nhân viên Shop]: Dạ set 629k ạ\n[Khách hàng]: ok",
    );
    expect(result.messageCount).toBe(3);
    expect(result.customerMessageCount).toBe(2);
    expect(result.shopMessageCount).toBe(1);
    expect(result.messages.map((m) => m.role)).toEqual(["CUSTOMER", "SHOP", "CUSTOMER"]);
    expect(result.messages[0]?.text).toBe("cho xin giá");
    expect(result.messages.every((m) => m.startsWithRolePrefix)).toBe(true);
    expect(result.startTruncated).toBe(false);
  });

  it("joins continuation lines into the preceding message", () => {
    const result = parseTranscript(
      "[Khách hàng]: dòng 1\ndòng 2\ndòng 3\n[Nhân viên Shop]: ok",
    );
    expect(result.messageCount).toBe(2);
    expect(result.messages[0]?.text).toBe("dòng 1\ndòng 2\ndòng 3");
  });

  it("marks content before any prefix as UNKNOWN and start-truncated", () => {
    const result = parseTranscript("mẫu này còn không\n[Nhân viên Shop]: Dạ còn ạ");
    expect(result.startTruncated).toBe(true);
    expect(result.messages[0]?.role).toBe("UNKNOWN");
    expect(result.messages[0]?.startsWithRolePrefix).toBe(false);
    expect(result.messages[1]?.role).toBe("SHOP");
  });

  it("normalises CRLF but preserves emoji and teencode exactly", () => {
    const result = parseTranscript("[Khách hàng]: ok nha 😍 dc ko\r\n[Nhân viên Shop]: dc ạ");
    expect(result.messages[0]?.text).toBe("ok nha 😍 dc ko");
    expect(result.messages[1]?.text).toBe("dc ạ");
  });

  it("assigns sequential turn indexes starting at 0", () => {
    const result = parseTranscript("[Khách hàng]: a\n[Nhân viên Shop]: b");
    expect(result.messages.map((m) => m.turnIndex)).toEqual([0, 1]);
  });
});
