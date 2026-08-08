import { describe, expect, it } from "vitest";
import { shouldRefreshPolicyRoute } from "./policy-control-route-sync.js";

describe("policy route query refresh", () => {
  it("refreshes same-route policy hash changes when the policy UI is mounted", () => {
    expect(shouldRefreshPolicyRoute("#/policy?cursor=next", true)).toBe(true);
    expect(shouldRefreshPolicyRoute("#/policy?search=SQ603", true)).toBe(true);
  });

  it("does not refresh another route or an unmounted policy UI", () => {
    expect(shouldRefreshPolicyRoute("#/overview", true)).toBe(false);
    expect(shouldRefreshPolicyRoute("#/policy?cursor=next", false)).toBe(false);
  });
});
