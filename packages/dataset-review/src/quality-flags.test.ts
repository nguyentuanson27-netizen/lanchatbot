import { describe, expect, it } from "vitest";
import { parseTranscript } from "./parse.js";
import { computeQualityFlags } from "./quality-flags.js";
import type { PiiType } from "./redact.js";

const NO_PII: Readonly<Record<PiiType, number>> = {
  PHONE: 0,
  EMAIL: 0,
  URL: 0,
  ORDER_ID: 0,
  ADDRESS: 0,
  PERSON: 0,
};

describe("computeQualityFlags", () => {
  it("flags start-truncated and missing attachment context", () => {
    const transcript = parseTranscript("mẫu này còn ko\n[Nhân viên Shop]: dạ còn ạ");
    const flags = computeQualityFlags({ transcript, piiCounts: NO_PII });
    expect(flags).toContain("START_TRUNCATED");
    expect(flags).toContain("MISSING_ATTACHMENT_CONTEXT");
    expect(flags).toContain("PRODUCT_REFERENCE_NOT_EVALUABLE");
  });

  it("flags repeated shop messages", () => {
    const transcript = parseTranscript(
      "[Nhân viên Shop]: chị cho em xin size nha\n[Khách hàng]: m\n[Nhân viên Shop]: chị cho em xin size nha",
    );
    const flags = computeQualityFlags({ transcript, piiCounts: NO_PII });
    expect(flags).toContain("REPEATED_SHOP_MESSAGE");
  });

  it("flags contains-phone from redaction counts", () => {
    const transcript = parseTranscript("[Khách hàng]: sđt [PHONE_1]");
    const flags = computeQualityFlags({
      transcript,
      piiCounts: { ...NO_PII, PHONE: 1 },
    });
    expect(flags).toContain("CONTAINS_PHONE");
  });

  it("flags low customer content when the customer barely speaks", () => {
    const transcript = parseTranscript(
      "[Khách hàng]: ok\n[Nhân viên Shop]: dạ set 629k ạ\n[Nhân viên Shop]: chị xem thêm nha",
    );
    const flags = computeQualityFlags({ transcript, piiCounts: NO_PII });
    expect(flags).toContain("LOW_CUSTOMER_CONTENT");
  });

  it("flags possibly capped at 30 for long transcripts", () => {
    const lines = Array.from({ length: 30 }, (_v, i) =>
      i % 2 === 0 ? `[Khách hàng]: c${i}` : `[Nhân viên Shop]: s${i}`,
    );
    const transcript = parseTranscript(lines.join("\n"));
    const flags = computeQualityFlags({ transcript, piiCounts: NO_PII });
    expect(flags).toContain("POSSIBLY_CAPPED_AT_30");
  });
});
