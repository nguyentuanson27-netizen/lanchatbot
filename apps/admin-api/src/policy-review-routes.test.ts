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
      } : null;
    },
    async transitionArtifactVersion(
      _identity: AdminIdentity,
      versionId: string,
      input: { expectedRevision: number; action: string },
    ) {
      transitions.push(versionId);
      if (versionId === VERSION_B) throw new AdminQueryError("ADMIN_ARTIFACT_VERSION_CONFLICT");
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
  } as unknown as AdminStore & PolicyReviewStoreExtension;
  const app = createAdminApi({
    authenticator: new Authenticator(role),
    store,
    policyControlEnabled: true,
    policyPageIds: ["page-1"],
  });
  registerPolicyReviewRoutes(app, store, true);
  return { app, queries, transitions };
}

describe("policy review phase1 routes", () => {
  it("passes search, active and sort semantics to the review store", async () => {
    const { app, queries } = create();
    const response = await app.inject({
      method: "GET",
      url: "/admin/v1/policy/review-artifacts?limit=50&search=SQ603&active=active&sort=artifact_key_asc",
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
      active: "active",
      sort: "artifact_key_asc",
    });
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

  it("returns review context independently of the current list page", async () => {
    const { app } = create();
    const response = await app.inject({
      method: "GET",
      url: `/admin/v1/policy/review-artifacts/${VERSION_A}/context`,
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().review_context.artifact.revision, "3");
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
});