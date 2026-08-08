import { afterEach, describe, expect, it, vi } from "vitest";
import { batchTransitionPolicyArtifacts } from "./policy-control-review-api.js";

const VERSION_ID = "018f1b72-0000-7000-8000-000000000401";

function jsonResponse(revision: unknown): Response {
  return new Response(JSON.stringify({
    request_id: "request-revision-bind",
    action: "APPROVE",
    results: [{
      version_id: VERSION_ID,
      ok: true,
      artifact: {
        version_id: VERSION_ID,
        artifact_key: "policy:revision-bind",
        artifact_kind: "SHOP_POLICY",
        version_number: 1,
        lifecycle: "APPROVED",
        revision,
        content_hash: "sha256:test",
        content: { kind: "SHOP_POLICY" },
        updated_by_subject: "owner",
        updated_at: "2026-08-08T00:00:00.000Z",
      },
    }],
    summary: { total: 1, succeeded: 1, failed: 0 },
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function expectRejectedSuccessRevision(revision: unknown): Promise<void> {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(revision)));
  await expect(batchTransitionPolicyArtifacts("APPROVE", [{
    versionId: VERSION_ID,
    expectedRevision: 3,
  }])).rejects.toThrow("Invalid policy batch response");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("policy batch success revision binding", () => {
  it("rejects a stale success revision", async () => {
    await expectRejectedSuccessRevision("3");
  });

  it("rejects a success revision that skips the expected increment", async () => {
    await expectRejectedSuccessRevision("5");
  });

  it("rejects an out-of-safe-range success revision", async () => {
    await expectRejectedSuccessRevision("9007199254740992");
  });
});
