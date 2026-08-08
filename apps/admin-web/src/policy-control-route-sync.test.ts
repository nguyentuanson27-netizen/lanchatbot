import { describe, expect, it } from "vitest";
import { shouldRefreshPolicyRoute } from "./policy-control-route-sync.js";

describe("policy route sync", () => {
  it("refreshes same-route policy query-string changes when the policy screen is mounted", () => {
    expect(shouldRefreshPolicyRoute("#/policy?cursor=abc", true)).toBe(true);
    expect(shouldRefreshPolicyRoute("#/policy?search=SQ603", true)).toBe(true);
  });

  it("does not intercept another route or an unmounted policy screen", () => {
    expect(shouldRefreshPolicyRoute("#/overview", true)).toBe(false);
    expect(shouldRefreshPolicyRoute("#/policy?cursor=abc", false)).toBe(false);
  });
});