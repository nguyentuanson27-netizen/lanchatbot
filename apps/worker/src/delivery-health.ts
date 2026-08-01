import { createServer, type Server } from "node:http";
import type { MetaOutboxHealthSnapshot } from "@lana/database";

export interface DeliveryHealthStore {
  readMetaOutboxHealth(pageId: string): Promise<MetaOutboxHealthSnapshot>;
}

export interface QueueHealthThresholds {
  readonly actionableSloSeconds: number;
  readonly manualReviewSloSeconds: number;
}

export interface QueueHealthAssessment {
  readonly status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  readonly reasonCodes: readonly string[];
}

export function classifyMetaOutboxQueueHealth(
  snapshot: MetaOutboxHealthSnapshot,
  thresholds: QueueHealthThresholds,
): QueueHealthAssessment {
  const unhealthy: string[] = [];
  if (snapshot.expiredSendingCount > 0) {
    unhealthy.push("EXPIRED_SENDING_LEASE");
  }
  if (snapshot.stuckDescendantCount > 0) {
    unhealthy.push("STUCK_DESCENDANT");
  }
  if (
    snapshot.oldestActionableAgeSeconds !== null &&
    snapshot.oldestActionableAgeSeconds > thresholds.actionableSloSeconds
  ) {
    unhealthy.push("ACTIONABLE_AGE_SLO_BREACH");
  }
  if (
    snapshot.oldestManualReviewAgeSeconds !== null &&
    snapshot.oldestManualReviewAgeSeconds > thresholds.manualReviewSloSeconds
  ) {
    unhealthy.push("MANUAL_REVIEW_AGE_SLO_BREACH");
  }
  if (unhealthy.length > 0) {
    return { status: "UNHEALTHY", reasonCodes: unhealthy };
  }
  if (snapshot.manualReviewCount > 0) {
    return {
      status: "DEGRADED",
      reasonCodes: ["MANUAL_REVIEW_REQUIRES_OPERATOR"],
    };
  }
  return { status: "HEALTHY", reasonCodes: [] };
}

function sendJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  body: Readonly<Record<string, unknown>>,
): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export function createDeliveryHealthServer(input: Readonly<{
  store: DeliveryHealthStore;
  pageId: string;
  thresholds: QueueHealthThresholds;
}>): Server {
  return createServer(async (request, response) => {
    const path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (path === "/health/live") {
      sendJson(response, 200, { status: "live" });
      return;
    }
    if (path === "/health/ready") {
      try {
        await input.store.readMetaOutboxHealth(input.pageId);
        sendJson(response, 200, { status: "ready", dependency: "postgres" });
      } catch {
        sendJson(response, 503, {
          status: "not_ready",
          dependency: "postgres",
        });
      }
      return;
    }
    if (path === "/health/queue") {
      try {
        const snapshot = await input.store.readMetaOutboxHealth(input.pageId);
        const assessment = classifyMetaOutboxQueueHealth(
          snapshot,
          input.thresholds,
        );
        sendJson(response, assessment.status === "HEALTHY" ? 200 : 503, {
          status: assessment.status,
          reasonCodes: assessment.reasonCodes,
          queue: snapshot,
        });
      } catch {
        sendJson(response, 503, {
          status: "UNHEALTHY",
          reasonCodes: ["QUEUE_HEALTH_DEPENDENCY_ERROR"],
        });
      }
      return;
    }
    sendJson(response, 404, { status: "not_found" });
  });
}