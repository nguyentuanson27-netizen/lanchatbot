import { describe, expect, it } from "vitest";
import { extractCustomerMeasurements } from "./customer-profile-extractor.js";

const input = (text: string) => ({
  text,
  observedAt: "2026-07-23T10:00:00.000Z",
  sourceEventHash: "a".repeat(64),
});

describe("extractCustomerMeasurements", () => {
  it("extracts height, weight and explicit measurements with provenance", () => {
    const values = extractCustomerMeasurements(input(
      "Em cao 1m60, nặng 50kg, eo 68 và vòng ngực 86",
    ));
    expect(Object.fromEntries(values.map((item) => [item.kind, item.value]))).toEqual({
      HEIGHT_CM: 160,
      WEIGHT_KG: 50,
      BUST_CM: 86,
      WAIST_CM: 68,
    });
    expect(values.every(({ provenance }) =>
      provenance.source === "CUSTOMER_MESSAGE" &&
      provenance.sourceEventHash === "a".repeat(64)
    )).toBe(true);
  });

  it("extracts three-round shorthand in bust-waist-hips order", () => {
    const values = extractCustomerMeasurements(input("Số đo 3 vòng 88-68-92"));
    expect(Object.fromEntries(values.map((item) => [item.kind, item.value]))).toEqual({
      BUST_CM: 88,
      WAIST_CM: 68,
      HIPS_CM: 92,
    });
  });

  it("accepts a bare three-round reply only when the whole message is the measurement tuple", () => {
    const values = extractCustomerMeasurements(input("90-60-90"));
    expect(Object.fromEntries(values.map((item) => [item.kind, item.value]))).toEqual({
      BUST_CM: 90,
      WAIST_CM: 60,
      HIPS_CM: 90,
    });
    expect(values.every(({ provenance }) => provenance.confidence === 0.94)).toBe(true);
    expect(extractCustomerMeasurements(input("ngày 24-07-2026"))).toEqual([]);
    expect(extractCustomerMeasurements(input("mã 90-60-90"))).toEqual([]);
  });

  it("accepts unaccented Vietnamese and common weight abbreviations", () => {
    const values = extractCustomerMeasurements(input(
      "chieu cao 1m58, can nang 50 ky, so do 3 vong 86-68-92",
    ));
    expect(Object.fromEntries(values.map((item) => [item.kind, item.value]))).toEqual({
      BUST_CM: 86,
      WAIST_CM: 68,
      HIPS_CM: 92,
      HEIGHT_CM: 158,
      WEIGHT_KG: 50,
    });
  });

  it("does not treat phone numbers, prices or unlabelled values as measurements", () => {
    expect(extractCustomerMeasurements(input(
      "SĐT 0984997797, mẫu này 699k, mã 118619999",
    ))).toEqual([]);
  });

  it("rejects implausible values", () => {
    expect(extractCustomerMeasurements(input(
      "cao 260cm nặng 290kg eo 12",
    ))).toEqual([]);
  });
});
