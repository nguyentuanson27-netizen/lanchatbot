import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LocalEnvelopeCipher } from "@lana/database";
import { createDatasetReviewService } from "./dataset-review-service.js";

function serviceWithAnnotations(annotations: Array<Record<string, unknown>>) {
  const service = createDatasetReviewService({
    databaseUrl: "postgresql://unused:unused@localhost:5432/unused",
    cipher: new LocalEnvelopeCipher("00".repeat(32), "dataset-key-v1"),
    blindReviewEnabled: true,
  });
  const mutable = service as unknown as {
    review: Record<string, unknown>;
    annotation: Record<string, unknown>;
  };
  mutable.review = {
    async getConversationMessages() {
      return [{
        turn_index: 0,
        role: "CUSTOMER",
        redacted_text: "chị lấy mẫu này",
        encrypted_text: "must-never-leave-service",
      }];
    },
  };
  mutable.annotation = {
    async getProject() {
      return { project_id: "project-1", name: "Blind", review_mode: "BLIND", label_schema_id: "schema-1" };
    },
    async getLabelSchema() {
      return { schema_json: { labels: [] } };
    },
    async reviewProgress() {
      return { reviewed: 0, total: 1 };
    },
    async adjudicationProgress() {
      return { reviewed: 0, total: 1 };
    },
    async nextReviewItem() {
      return {
        project_item_id: "item-1",
        conversation_id: "conversation-1",
        split: "DEVELOPMENT",
        assignment_status: "PENDING",
        quality_flags: [],
        revision: 1,
      };
    },
    async nextAdjudicationItem() {
      return {
        project_item_id: "item-1",
        conversation_id: "conversation-1",
        split: "DEVELOPMENT",
        assignment_status: "ADJUDICATION_REQUIRED",
        quality_flags: [],
        revision: 1,
      };
    },
    async listAnnotations() {
      return annotations;
    },
  };
  return service;
}

const aiAnnotation = {
  annotation_id: "ai-1",
  label_code: "BUYING_COMMITTED",
  scope: "CUSTOMER_MESSAGE",
  turn_index: 0,
  evidence_text: "lấy mẫu này",
  confidence: "HIGH",
  source: "AI",
  status: "PROPOSED",
  reviewer_id: null,
};

describe("dataset review blind mode", () => {
  it("filters machine proposals server-side until the reviewer has an own pass", async () => {
    const humanOther = {
      ...aiAnnotation,
      annotation_id: "human-other",
      source: "HUMAN",
      status: "ACCEPTED",
      reviewer_id: "reviewer-other",
    };
    const annotations = [aiAnnotation, { ...aiAnnotation, annotation_id: "heuristic-1", source: "HEURISTIC" }, humanOther];
    const service = serviceWithAnnotations(annotations);
    const first = await service.reviewQueue("project-1", {
      reviewerSubject: "reviewer-current",
      acquireLease: false,
    });
    const firstItem = first?.item as Record<string, unknown>;
    assert.equal(first?.revealed, false);
    assert.deepEqual((firstItem.annotations as Array<Record<string, unknown>>).map((item) => item.source), ["HUMAN"]);
    assert.equal(JSON.stringify(first).includes("must-never-leave-service"), false);

    annotations.push({ ...humanOther, annotation_id: "human-own", reviewer_id: "reviewer-current" });
    const revealed = await service.reviewQueue("project-1", {
      reviewerSubject: "reviewer-current",
      acquireLease: false,
    });
    assert.equal(revealed?.revealed, true);
    assert.deepEqual(
      ((revealed?.item as Record<string, unknown>).annotations as Array<Record<string, unknown>>).map((item) => item.source),
      ["AI", "HEURISTIC", "HUMAN", "HUMAN"],
    );
  });

  it("reveals evidence in the RBAC-gated adjudication queue", async () => {
    const service = serviceWithAnnotations([aiAnnotation]);
    const queue = await service.reviewQueue("project-1", {
      reviewerSubject: "adjudicator-1",
      acquireLease: false,
      adjudication: true,
    });
    assert.equal(queue?.adjudication, true);
    assert.equal(queue?.revealed, true);
    assert.equal(((queue?.item as Record<string, unknown>).annotations as unknown[]).length, 1);
  });
});
