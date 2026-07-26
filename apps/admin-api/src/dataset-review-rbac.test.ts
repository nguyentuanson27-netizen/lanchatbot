import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { datasetRoleAtLeast, datasetRoleFor } from "./dataset-review-rbac.js";
import type { AdminIdentity } from "./types.js";

function identity(role: AdminIdentity["role"]): AdminIdentity {
  return { email: "u@example.com", role, pageScope: "ALL", subject: "sub-1" };
}

describe("dataset-review RBAC mapping", () => {
  it("maps each admin role to its dataset role", () => {
    assert.equal(datasetRoleFor(identity("OWNER")), "DATASET_ADMIN");
    assert.equal(datasetRoleFor(identity("APPROVER")), "ADJUDICATOR");
    assert.equal(datasetRoleFor(identity("EDITOR")), "ANNOTATOR");
    assert.equal(datasetRoleFor(identity("VIEWER")), "BENCHMARK_VIEWER");
  });

  it("treats the ladder as monotone (higher covers lower)", () => {
    assert.equal(datasetRoleAtLeast(identity("OWNER"), "DATASET_ADMIN"), true);
    assert.equal(datasetRoleAtLeast(identity("OWNER"), "BENCHMARK_VIEWER"), true);
    assert.equal(datasetRoleAtLeast(identity("APPROVER"), "ADJUDICATOR"), true);
    assert.equal(datasetRoleAtLeast(identity("APPROVER"), "DATASET_ADMIN"), false);
    assert.equal(datasetRoleAtLeast(identity("EDITOR"), "ANNOTATOR"), true);
    assert.equal(datasetRoleAtLeast(identity("EDITOR"), "ADJUDICATOR"), false);
    assert.equal(datasetRoleAtLeast(identity("VIEWER"), "BENCHMARK_VIEWER"), true);
    assert.equal(datasetRoleAtLeast(identity("VIEWER"), "ANNOTATOR"), false);
  });
});
