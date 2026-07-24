import { describe, expect, it } from "vitest";
import { buildApprovedQdrantJobs } from "./p23c-jobs.js";

describe("P2.3C approved Qdrant jobs", () => {
  it("copies the reviewed image hash and approval provenance into the payload", () => {
    const hash = "a".repeat(64);
    const jobs = buildApprovedQdrantJobs([], [{
      IMAGE_ID: "point-1",
      MA_SP: "CB182",
      IMAGE_URL: "https://cdn.example/cb182-size.jpg",
      IMAGE_HASH: hash.toUpperCase(),
      IMAGE_TYPE: "SIZE_GUIDE",
      IMAGE_INTENTS: "SIZE_GUIDE",
      REVIEW_STATUS: "APPROVED",
      ACTIVE: "TRUE",
      VERIFIED: "TRUE",
    }], {
      run_id: "run-1",
      started_at: "2026-07-24T00:00:00.000Z",
      shard_count: 1,
      shard_index: 0,
      shard_label: "1/1",
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.payload).toMatchObject({
      image_content_sha256: hash,
      image_metadata_review_status: "APPROVED",
      metadata_verified: true,
      image_type: "SIZE_GUIDE",
    });
  });
});
