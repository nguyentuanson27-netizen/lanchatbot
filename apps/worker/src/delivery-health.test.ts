import { describe, expect, it } from "vitest";
import type { MetaOutboxHealthSnapshot } from "@lana/database";
import {
  classifyMetaOutboxQueueHealth,
  createDeliveryHealthServer,
} from "./delivery-health.js";

const base: MetaOutboxHealthSnapshot = {
  pageId: "1198992073286645",
  actionableCount: 0,
  sendingCount: 0,
  expiredSendingCount: 0,
  manualReviewCount: 0,
  stuckDescendantCount: 0,
  oldestActionableAgeSeconds: null,
  oldestManualReviewAgeSeconds: null,
};
const thresholds = {
  actionableSloSeconds: 120,
  manualReviewSloSeconds: 1_800,
};

describe("delivery queue health", () => {
  it("keeps liveness independent when the database readiness check fails", async () => {
    const server = createDeliveryHealthServer({
      pageId: base.pageId,
      thresholds,
      store: {
        async readMetaOutboxHealth() {
          throw new Error("POSTGRES_UNAVAILABLE");
        },
      },
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("PORT_MISSING");
      const origin = `http://127.0.0.1:${address.port}`;
      expect((await fetch(`${origin}/health/live`)).status).toBe(200);
      expect((await fetch(`${origin}/health/ready`)).status).toBe(503);
      expect((await fetch(`${origin}/health/queue`)).status).toBe(503);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  });

  it("keeps process/dependency health separate from a healthy queue", () => {
    expect(classifyMetaOutboxQueueHealth(base, thresholds)).toEqual({
      status: "HEALTHY",
      reasonCodes: [],
    });
  });

  it("surfaces held groups for operator action without false green", () => {
    expect(classifyMetaOutboxQueueHealth({
      ...base,
      manualReviewCount: 2,
      oldestManualReviewAgeSeconds: 60,
    }, thresholds)).toEqual({
      status: "DEGRADED",
      reasonCodes: ["MANUAL_REVIEW_REQUIRES_OPERATOR"],
    });
  });

  it("marks expired leases, stuck descendants, and SLO breaches unhealthy", () => {
    expect(classifyMetaOutboxQueueHealth({
      ...base,
      actionableCount: 1,
      expiredSendingCount: 1,
      stuckDescendantCount: 1,
      oldestActionableAgeSeconds: 121,
      manualReviewCount: 1,
      oldestManualReviewAgeSeconds: 1_801,
    }, thresholds)).toEqual({
      status: "UNHEALTHY",
      reasonCodes: [
        "EXPIRED_SENDING_LEASE",
        "STUCK_DESCENDANT",
        "ACTIONABLE_AGE_SLO_BREACH",
        "MANUAL_REVIEW_AGE_SLO_BREACH",
      ],
    });
  });
});