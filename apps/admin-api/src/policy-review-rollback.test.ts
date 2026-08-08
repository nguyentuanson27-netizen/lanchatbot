import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isConcreteRollbackCandidateRow } from "./policy-review-store.js";

describe("policy review rollback candidate context", () => {
  it("rejects a candidate when the active pointer has no concrete page id", () => {
    assert.equal(isConcreteRollbackCandidateRow({
      target_version_id: "018f1b72-0000-7000-8000-000000000001",
      page_id: null,
    }), false);
    assert.equal(isConcreteRollbackCandidateRow({
      target_version_id: "018f1b72-0000-7000-8000-000000000001",
      page_id: "",
    }), false);
  });

  it("keeps a candidate when both target version and page context are concrete", () => {
    assert.equal(isConcreteRollbackCandidateRow({
      target_version_id: "018f1b72-0000-7000-8000-000000000001",
      page_id: "page-1",
    }), true);
  });
});
