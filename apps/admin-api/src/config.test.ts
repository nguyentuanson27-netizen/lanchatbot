import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminConfigFromEnvironment } from "./config.js";

describe("Admin API lifecycle safety configuration", () => {
  it("defaults to the single production page with live canary and publish off", () => {
    const config = adminConfigFromEnvironment({});
    assert.deepEqual(config.pageScope, ["1198992073286645"]);
    assert.deepEqual(config.policyPageIds, ["1198992073286645"]);
    assert.equal(config.policyCanaryLiveEnabled, false);
    assert.equal(config.policyPublishEnabled, false);
    assert.equal(config.productMediaResizeMaxDimension, 1_600);
    assert.equal(config.productMediaResizeConcurrency, 2);
    assert.equal(config.productMediaOriginalTtlMs, 86_400_000);
    assert.equal(config.productMediaCleanupIntervalMs, 3_600_000);
    assert.equal(config.productMediaOriginalDirectory, "/var/lib/lana/product-media-originals");
  });

  it("requires an explicit true value for each activation gate", () => {
    const config = adminConfigFromEnvironment({
      ADMIN_POLICY_CANARY_LIVE_ENABLED: "true",
      ADMIN_POLICY_PUBLISH_ENABLED: "TRUE",
    });
    assert.equal(config.policyCanaryLiveEnabled, true);
    assert.equal(config.policyPublishEnabled, true);
  });
});
