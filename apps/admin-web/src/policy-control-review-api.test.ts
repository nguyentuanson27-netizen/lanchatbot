import { afterEach, describe, expect, it, vi } from "vitest";
import { getPolicyReviewContext, listPolicyArtifacts } from "./policy-control-review-api.js";

const VERSION_ID = "018f1b72-0000-7000-8000-000000000101";
const POINTER_ID = "018f1b72-0000-7000-8000-000000000201";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function artifact(revision: string) {
  return {
    version_id: VERSION_ID,
    artifact_key: "size-chart:SQ603",
    artifact_kind: "SIZE_CHART",
    version_number: 3,
    lifecycle: "VALIDATED",
    revision,
    content_hash: "sha256:test",
    content: { kind: "SIZE_CHART" },
    updated_by_subject: "owner",
    updated_at: "2026-08-08T00:00:00.000Z",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("policy review API client", () => {
  it("uses the phase1 review list endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      items: [{ ...artifact("3"), is_active: true }],
      next_cursor: null,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await listPolicyArtifacts({ search: "SQ603", active: "active" });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/policy/review-artifacts?");
    expect(result.items[0]).toMatchObject({ revision: 3, active: true });
  });

  it("normalizes PostgreSQL bigint revision strings for artifacts and pointers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      review_context: {
        artifact: artifact("3"),
        previous_version: null,
        active_pointers: [{
          pointer_id: POINTER_ID,
          artifact_key: "size-chart:SQ603",
          artifact_kind: "SIZE_CHART",
          page_id: "page-1",
          channel: "PUBLISHED",
          version_id: VERSION_ID,
          version_number: 3,
          revision: "7",
          updated_at: "2026-08-08T00:00:00.000Z",
        }],
        rollback_candidates: [],
      },
    })));

    const context = await getPolicyReviewContext(VERSION_ID);
    expect(context.artifact.revision).toBe(3);
    expect(context.activePointers[0]?.revision).toBe(7);
  });

  it("fails closed instead of silently converting an invalid revision to zero", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      items: [{ ...artifact("not-a-revision"), is_active: false }],
      next_cursor: null,
    })));
    await expect(listPolicyArtifacts({})).rejects.toThrow("Invalid policy revision value");
  });
});