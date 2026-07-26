import { describe, expect, it } from "vitest";
import {
  buildImportReport,
  computeConversationImport,
} from "./import-pipeline.js";

describe("computeConversationImport", () => {
  it("parses, redacts and checksums without leaking raw PII into projections", () => {
    const result = computeConversationImport(
      "[Khách hàng]: sđt em 0912345678\n[Nhân viên Shop]: dạ set 629k ạ",
      "history_28084668237786527",
    );
    expect(result.messageCount).toBe(2);
    expect(result.customerMessageCount).toBe(1);
    expect(result.shopMessageCount).toBe(1);
    // Raw text preserved for encryption; redacted projection has placeholder.
    expect(result.messages[0]?.rawText).toContain("0912345678");
    expect(result.messages[0]?.redactedText).toContain("[PHONE_1]");
    expect(result.messages[0]?.redactedText).not.toContain("0912345678");
    // Checksums must be over redacted content only.
    expect(result.messages[0]?.messageChecksum).toHaveLength(64);
    expect(result.qualityFlags).toContain("CONTAINS_PHONE");
    expect(result.conversationKeyHash).toHaveLength(64);
    expect(result.duplicateGroupId).toHaveLength(64);
  });

  it("gives identical customer scripts the same duplicate group id", () => {
    const a = computeConversationImport(
      "[Khách hàng]: mẫu này bao nhiêu\n[Nhân viên Shop]: 200k",
      "key-a",
    );
    const b = computeConversationImport(
      "[Khách hàng]: mẫu này bao nhiêu\n[Nhân viên Shop]: 999k khác hẳn",
      "key-b",
    );
    expect(a.duplicateGroupId).toBe(b.duplicateGroupId);
    // But different source keys map to different conversation identities.
    expect(a.conversationKeyHash).not.toBe(b.conversationKeyHash);
  });

  it("marks start-truncated records", () => {
    const result = computeConversationImport(
      "còn mẫu này ko\n[Nhân viên Shop]: dạ còn ạ",
      "key-trunc",
    );
    expect(result.startTruncated).toBe(true);
    expect(result.messages[0]?.role).toBe("UNKNOWN");
  });

  it("fails closed when residual PII survives redaction", () => {
    expect(() => computeConversationImport("[Khách hàng]: số tham chiếu 123456789", "key-risk"))
      .toThrow("REDACTION_RESIDUAL_PII");
  });
});

describe("buildImportReport", () => {
  it("aggregates counts, distinct groups, truncation, PII and length bins", () => {
    const conversations = [
      computeConversationImport("[Khách hàng]: a\n[Nhân viên Shop]: b", "k1"),
      computeConversationImport("[Khách hàng]: a\n[Nhân viên Shop]: c", "k2"),
      computeConversationImport("[Khách hàng]: sđt 0912345678", "k3"),
    ];
    const report = buildImportReport(conversations, 2);
    expect(report.totalRecords).toBe(5);
    expect(report.succeeded).toBe(3);
    expect(report.failed).toBe(2);
    // k1 and k2 share the same customer script -> one group; k3 is another.
    expect(report.duplicateGroups).toBe(2);
    expect(report.piiTotals.PHONE).toBe(1);
    expect(report.lengthBins["1_5"]).toBe(3);
  });
});
