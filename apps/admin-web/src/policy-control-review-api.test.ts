import { afterEach, describe, expect, it, vi } from "vitest";
import {
  batchTransitionPolicyArtifacts,
  deactivatePolicyPointer,
  deletePolicyArtifact,
  getPolicyReviewContext,
  listPolicyArtifacts,
} from "./policy-control-review-api.js";

const VERSION_ID = "018f1b72-0000-7000-8000-000000000101";
const VERSION_ID_B = "018f1b72-0000-7000-8000-000000000102";
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

  it("sends exact version and revision filters to the review boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], next_cursor: null }));
    vi.stubGlobal("fetch", fetchMock);

    await listPolicyArtifacts({ version: 3, revision: 9 });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("version=3");
    expect(url).toContain("revision=9");
  });

  it("uses revision-guarded endpoints for deactivation and safe deletion", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ pointer: { pointer_id: POINTER_ID, active: false, revision: "8" } }))
      .mockResolvedValueOnce(jsonResponse({ deletion: { version_id: VERSION_ID, deleted: true } }));
    vi.stubGlobal("fetch", fetchMock);

    await deactivatePolicyPointer(POINTER_ID, 7);
    await deletePolicyArtifact(VERSION_ID, 3);

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "DELETE" });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "DELETE" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ expected_revision: 7 });
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ expected_revision: 3 });
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
        deletion_eligible: false,
      },
    })));

    const context = await getPolicyReviewContext(VERSION_ID);
    expect(context.artifact.revision).toBe(3);
    expect(context.activePointers[0]?.revision).toBe(7);
    expect(context.deletionEligible).toBe(false);
  });

  it("fails closed instead of silently converting an invalid revision to zero", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      items: [{ ...artifact("not-a-revision"), is_active: false }],
      next_cursor: null,
    })));
    await expect(listPolicyArtifacts({})).rejects.toThrow("Invalid policy revision value");
  });

  it("preserves PostgreSQL bigint current_revision strings in batch conflicts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      request_id: "request-1",
      action: "APPROVE",
      results: [{
        version_id: VERSION_ID,
        ok: false,
        error_code: "ADMIN_ARTIFACT_VERSION_CONFLICT",
        current_revision: "9",
      }],
      summary: { total: 1, succeeded: 0, failed: 1 },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await batchTransitionPolicyArtifacts("APPROVE", [{
      versionId: VERSION_ID,
      expectedRevision: 3,
    }]);

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/policy/review-artifacts/batch-transitions");
    expect(result.results[0]).toMatchObject({
      versionId: VERSION_ID,
      ok: false,
      errorCode: "ADMIN_ARTIFACT_VERSION_CONFLICT",
      currentRevision: 9,
    });
  });

  it("rejects an unknown action in a 200 response instead of inventing a default", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      request_id: "request-2",
      action: "PUBLISH",
      results: [],
      summary: { total: 0, succeeded: 0, failed: 0 },
    })));

    await expect(batchTransitionPolicyArtifacts("APPROVE", [{
      versionId: VERSION_ID,
      expectedRevision: 3,
    }])).rejects.toThrow("Invalid policy batch response");
  });

  it("rejects a truncated 200 response after an ambiguous partial mutation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      request_id: "request-3",
      action: "APPROVE",
      results: [{
        version_id: VERSION_ID,
        ok: false,
        error_code: "ADMIN_INTERNAL_ERROR",
      }],
      summary: { total: 1, succeeded: 0, failed: 1 },
    })));

    await expect(batchTransitionPolicyArtifacts("APPROVE", [
      { versionId: VERSION_ID, expectedRevision: 3 },
      { versionId: VERSION_ID_B, expectedRevision: 4 },
    ])).rejects.toThrow("Invalid policy batch response");
  });

  it("rejects reordered result ids even when counts look valid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      request_id: "request-4",
      action: "APPROVE",
      results: [
        { version_id: VERSION_ID_B, ok: false, error_code: "ADMIN_INTERNAL_ERROR" },
        { version_id: VERSION_ID, ok: false, error_code: "ADMIN_INTERNAL_ERROR" },
      ],
      summary: { total: 2, succeeded: 0, failed: 2 },
    })));

    await expect(batchTransitionPolicyArtifacts("APPROVE", [
      { versionId: VERSION_ID, expectedRevision: 3 },
      { versionId: VERSION_ID_B, expectedRevision: 4 },
    ])).rejects.toThrow("Invalid policy batch response");
  });

  it("rejects a malformed success artifact instead of defaulting required fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      request_id: "request-5",
      action: "APPROVE",
      results: [{
        version_id: VERSION_ID,
        ok: true,
        artifact: {
          version_id: VERSION_ID,
          artifact_kind: "SIZE_CHART",
          version_number: 3,
          lifecycle: "APPROVED",
          revision: "4",
          content: { kind: "SIZE_CHART" },
          updated_by_subject: "owner",
          updated_at: "2026-08-08T00:00:00.000Z",
        },
      }],
      summary: { total: 1, succeeded: 1, failed: 0 },
    })));

    await expect(batchTransitionPolicyArtifacts("APPROVE", [{
      versionId: VERSION_ID,
      expectedRevision: 3,
    }])).rejects.toThrow("Invalid policy batch response");
  });
});
