import {describe, it, expect} from "vitest";
import {checkoutDetails} from "./realtime-sales-cycle.js";

describe("candidate single-field checkout intake", () => {
  it("receives a simple recipient name only for the field actually being asked", () => {
    expect(checkoutDetails("Nguyễn Thị Lan", undefined, "FULL_NAME")).toEqual({fullName: "Nguyễn Thị Lan"});
    expect(checkoutDetails("Nguyễn Thị Lan", undefined)).toEqual({});
    expect(checkoutDetails("Nguyễn Thị Lan", undefined, "PHONE")).toEqual({});
  });
  it("does not capture a product question as a name or an address", () => {
    for (const field of ["FULL_NAME", "ADDRESS"] as const)
      expect(checkoutDetails("Khoan, áo này giặt máy được không em?", undefined, field)).toEqual({});
  });
  it("receives an unlabelled street address only while asking for the address", () => {
    const address = "12 Đường Số 3, Quận 7, TP.HCM";
    expect(checkoutDetails(address, undefined, "ADDRESS")).toEqual({address});
    expect(checkoutDetails(address, undefined, "FULL_NAME")).toEqual({});
  });
});
