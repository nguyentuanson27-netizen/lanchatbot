import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeCursor,
  encodeCursor,
  isRollbackTargetLifecycleCompatible,
  isShadowToLivePromotion,
  transitionTarget,
} from "./store.js";

describe("Admin cursor", () => {
  it("round-trips an opaque keyset cursor", () => {
    const value = {
      time: "2026-07-16T12:00:00.000Z",
      id: "018f1b72-0000-7000-8000-000000000001",
    };
    assert.deepEqual(decodeCursor(encodeCursor(value)), value);
  });

  it("rejects a malformed cursor", () => {
    assert.throws(() => decodeCursor("not-json"), /ADMIN_QUERY_INVALID/);
  });
});

describe("Admin policy rollback compatibility", () => {
  it("keeps pre-publish rollback inside the CANARY lifecycle", () => {
    assert.equal(isRollbackTargetLifecycleCompatible("CANARY_SHADOW", "CANARY"), true);
    assert.equal(isRollbackTargetLifecycleCompatible("CANARY_LIVE", "CANARY"), true);
    assert.equal(isRollbackTargetLifecycleCompatible("CANARY_SHADOW", "PUBLISHED"), false);
    assert.equal(isRollbackTargetLifecycleCompatible("CANARY_LIVE", "APPROVED"), false);
  });

  it("keeps published rollback inside the PUBLISHED lifecycle", () => {
    assert.equal(isRollbackTargetLifecycleCompatible("PUBLISHED", "PUBLISHED"), true);
    assert.equal(isRollbackTargetLifecycleCompatible("PUBLISHED", "CANARY"), false);
    assert.equal(isRollbackTargetLifecycleCompatible("PUBLISHED", "RETIRED"), false);
  });
});

describe("Admin shadow-to-live promotion", () => {
  it("allows only a live promotion of an existing CANARY version", () => {
    assert.equal(isShadowToLivePromotion("CANARY", "START_CANARY", "LIVE_OUTBOUND"), true);
    assert.equal(transitionTarget("CANARY", "START_CANARY", "LIVE_OUTBOUND"), "CANARY");
    assert.equal(transitionTarget("CANARY", "START_CANARY", "SHADOW"), null);
    assert.equal(transitionTarget("APPROVED", "START_CANARY", "SHADOW"), "CANARY");
  });
});
