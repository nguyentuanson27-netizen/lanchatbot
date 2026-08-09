import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAdminApi } from "./app.js";
import { registerPolicyReviewRoutes } from "./policy-review-routes.js";
import type {
  AdminAuthenticator,
  AdminIdentity,
  AdminStore,
  ArtifactVersionQuery,
} from "./types.js";
import { AdminQueryError } from "./types.js";
import type { PolicyReviewStoreExtension } from "./policy-review-store.js";

const VERSION_A = "018f1b72-0000-7000-8000-000000000101";
const VERSION_B = "018f1b72-0000-7000-8000-000000000102";
const VERSION_C = "018f1b72-0000-7000-8000-000000000103";

class Authenticator implements AdminAuthenticator {
  constructor(private readonly role: AdminIdentity["role"] = "OWNER") {}
  async authenticate(assertion: string | undefined): Promise<AdminIdentity> {
    assert.equal(assertion, "valid");
    return {
      email: `${this.role.toLowerCase()}@example.test`,
      role: this.role,
      pageScope: ["page-1"],
      subject: `${this.role.toLowerCase()}-1`,
    };
  }
  async ready() { return true; }
}

function create(role: AdminIdentity["role"] = "OWNER") {
  const queries: ArtifactVersionQuery[] = [];
  const transitions: string[] = [];
  const deactivations: Array<{ id: string; revision: number }> = [];
  const deletions: Array<{ id: string; revision: number }> = [];
  const store = {
    async listArtifactVersions(_identity: AdminIdentity, query: ArtifactVersionQuery) {
      queries.push(query);
      return { items: [], nextCursor: null };
    },
    async getArtifactReviewContext(_identity: AdminIdentity, versionId: string) {
      return versionId === VERSION_A ? {
        artifact: {
          version_id: VERSION_A,
          artifact_key: "size-chart:SQ603",
          artifact_kind: "SIZE_CHART",
          revision: "3",
        },
        previous_version: null,
        active_pointers: [],
        rollback_candidates: [],
        deletion_eligible: false,
      } : null;
    },
    async transitionArtifactVersion(
      _identity: AdminIdentity,
      versionId: string,
      input: { expectedRevision: number; action: string },
    ) {
      transitions.push(versionId);
      if (versionId === VERSION_B) throw new AdminQueryError("ADMIN_ARTIFACT_VERSION_CONFLICT");
      if (versionId === VERSION_C) throw new Error("unexpected database failure");
      return {
        version_id: versionId,
        artifact_key: "size-chart:SQ603",
        artifact_kind: "SIZE_CHART",
        version_number: 3,
        lifecycle: input.action === "VALIDATE" ? "VALIDATED" : "APPROVED",
        revision: String(input.expectedRevision + 1),
        content_hash: "sha256:test",
        content: { kind: "SIZE_CHART" },
        updated_by_subject: "owner",
        updated_at: "2026-08-08T00:00:00.000Z",
      };
    },
    async getArtifactVersion(_identity: AdminIdentity, versionId: string) {
      return versionId === VERSION_B
        ? { version_id: VERSION_B, lifecycle: "DRAFT", revision: "9" }
        : null;
    },
    async deactivateArtifactPointer(_identity: AdminIdentity, pointerId: string, input: { expectedRevision: number }) {
      deactivations.push({ id: pointerId, revision: input.expectedRevision });
      return { pointer_id: pointerId, active: false, revision: input.expectedRevision + 1 };
    },
    async deleteArtifactVersion(_identity: AdminIdentity, versionId: string, input: { expectedRevision: number }) {
      deletions.push({ id: versionId, revision: input.expectedRevision });
      return { version_id: versionId, deleted: true };
    },
  } as unknown as AdminStore & PolicyReviewStoreExtension;
  const app = createAdminApi({
    authenticator: new Authenticator(role),
    store,
    policyControlEnabled: true,
    policyPageIds: ["page-1"],
  });
  registerPolicyReviewRoutes(app, store, true);
  return { app, queries, transitions, deactivations, deletions };
}

describe("policy review phase1 routes", () => {
  it("passes search, active and sort semantics to the review store", async () => {
    const { app, queries } = create();
    const response = await app.inject({
      method: "GET",
      url: "/admin/v1/policy/review-artifacts?limit=50&search=SQ603&active=active&sort=artifact_key_asc&version=3&revision=9",
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(queries[0], {
      limit: 50,
      cursor: undefined,
      pageId: undefined,
      artifactKind: undefined,
      lifecycle: undefined,
      artifactKey: undefined,
      search: "SQ603",
      version: 3,
      revision: 9,
      active: "active",
      sort: "artifact_key_asc",
    });
    await app.close();
  });

  it("routes revision-guarded pointer deactivation and safe deletion", async () => {
    const { app, deactivations, deletions } = create();
    const pointer = await app.inject({
      method: "DELETE",
      url: `/admin/v1/policy/pointers/${VERSION_B}`,
      headers: { "x-lana-admin-assertion": "valid" },
      payload: { expected_revision: 7 },
    });
    const artifact = await app.inject({
      method: "DELETE",
      url: `/admin/v1/policy/review-artifacts/${VERSION_A}`,
      headers: { "x-lana-admin-assertion": "valid" },
      payload: { expected_revision: 3 },
    });
    assert.equal(pointer.statusCode, 200);
    assert.equal(artifact.statusCode, 200);
    assert.deepEqual(deactivations, [{ id: VERSION_B, revision: 7 }]);
    assert.deepEqual(deletions, [{ id: VERSION_A, revision: 3 }]);
    await app.close();
  });

  it("rejects deactivation and deletion for non-owner roles", async () => {
    const { app, deactivations, deletions } = create("APPROVER");
    const pointer = await app.inject({
      method: "DELETE",
      url: `/admin/v1/policy/pointers/${VERSION_B}`,
      headers: { "x-lana-admin-assertion": "valid" },
      payload: { expected_revision: 7 },
    });
    const artifact = await app.inject({
      method: "DELETE",
      url: `/admin/v1/policy/review-artifacts/${VERSION_A}`,
      headers: { "x-lana-admin-assertion": "valid" },
      payload: { expected_revision: 3 },
    });
    assert.equal(pointer.statusCode, 403);
    assert.equal(artifact.statusCode, 403);
    assert.deepEqual(deactivations, []);
    assert.deepEqual(deletions, []);
    await app.close();
  });

  it("rejects oversized search before the store boundary", async () => {
    const { app, queries } = create();
    const response = await app.inject({
      method: "GET",
      url: `/admin/v1/policy/review-artifacts?search=${"x".repeat(121)}`,
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(response.statusCode, 400);
    assert.deepEqual(queries, []);
    await app.close();
  });

  it("rejects invalid version and revision filters before the store boundary", async () => {
    const { app, queries } = create();
    for (const query of ["version=0", "version=1.5", "revision=-1", "revision=9007199254740992"]) {
      const response = await app.inject({
        method: "GET",
        url: `/admin/v1/policy/review-artifacts?${query}`,
        headers: { "x-lana-admin-assertion": "valid" },
      });
      assert.equal(response.statusCode, 400, query);
    }
    assert.deepEqual(queries, []);
    await app.close();
  });

  it("returns review context independently of the current list page", async () => {
    const { app } = create();
    const response = await app.inject({
      method: "GET",
      url: `/admin/v1/policy/review-artifacts/${VERSION_A}/context`,
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().review_context.artifact.revision, "3");
    assert.equal(response.json().review_context.deletion_eligible, false);
    await app.close();
  });
});

describe("policy review phase2 batch route", () => {
  it("returns ordered per-item results and preserves bigint current revision on conflict", async () => {
    const { app, transitions } = create();
    const response = await app.inject({
      method: "POST",
      url: "/admin/v1/policy/review-artifacts/batch-transitions",
      headers: { "x-lana-admin-assertion": "valid" },
      payload: {
        action: "VALIDATE",
        items: [
          { version_id: VERSION_A, expected_revision: 3 },
          { version_id: VERSION_B, expected_revision: 4 },
        ],
      },
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.deepEqual(transitions, [VERSION_A, VERSION_B]);
    assert.deepEqual(payload.results.map((item: { version_id: string }) => item.version_id), [VERSION_A, VERSION_B]);
    assert.equal(payload.results[0].ok, true);
    assert.equal(payload.results[1].ok, false);
    assert.equal(payload.results[1].error_code, "ADMIN_ARTIFACT_VERSION_CONFLICT");
    assert.equal(payload.results[1].current_revision, 9);
    assert.deepEqual(payload.summary, { total: 2, succeeded: 1, failed: 1 });
    await app.close();
  });

  it("rejects duplicate ids before starting any item mutation", async () => {
    const { app, transitions } = create();
    const response = await app.inject({
      method: "POST",
      url: "/admin/v1/policy/review-artifacts/batch-transitions",
      headers: { "x-lana-admin-assertion": "valid" },
      payload: {
        action: "APPROVE",
        items: [
          { version_id: VERSION_A, expected_revision: 3 },
          { version_id: VERSION_A, expected_revision: 3 },
        ],
      },
    });
    assert.equal(response.statusCode, 400);
    assert.deepEqual(transitions, []);
    await app.close();
  });

  it("rejects an unauthorized role before item processing", async () => {
    const { app, transitions } = create("VIEWER");
    const response = await app.inject({
      method: "POST",
      url: "/admin/v1/policy/review-artifacts/batch-transitions",
      headers: { "x-lana-admin-assertion": "valid" },
      payload: { action: "APPROVE", items: [{ version_id: VERSION_A, expected_revision: 3 }] },
    });
    assert.equal(response.statusCode, 403);
    assert.deepEqual(transitions, []);
    await app.close();
  });

  it("logs unexpected per-item failures with request and batch correlation context", async () => {
    const { app } = create();
    const originalWrite = process.stderr.write;
    let logs = "";
    process.stderr.write = ((chunk: string | Uint8Array) => {
      logs += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    try {
      const response = await app.inject({
        method: "POST",
        url: "/admin/v1/policy/review-artifacts/batch-transitions",
        headers: { "x-lana-admin-assertion": "valid" },
        payload: {
          action: "VALIDATE",
          items: [
            { version_id: VERSION_A, expected_revision: 3 },
            { version_id: VERSION_C, expected_revision: 3 },
          ],
        },
      });
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().results[1].error_code, "ADMIN_INTERNAL_ERROR");
      assert.match(logs, /"event":"policy_batch_item_failed"/u);
      assert.match(logs, /"request_id":"[^"]+"/u);
      assert.match(logs, /"batch_correlation_id":"[^"]+"/u);
      assert.match(logs, new RegExp(`"version_id":"${VERSION_C}"`, "u"));
    } finally {
      process.stderr.write = originalWrite;
      await app.close();
    }
  });
});
