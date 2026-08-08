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
import type { PolicyReviewStoreExtension } from "./policy-review-store.js";

const VERSION_A = "018f1b72-0000-7000-8000-000000000101";

class Authenticator implements AdminAuthenticator {
  async authenticate(assertion: string | undefined): Promise<AdminIdentity> {
    assert.equal(assertion, "valid");
    return {
      email: "owner@example.test",
      role: "OWNER",
      pageScope: ["page-1"],
      subject: "owner-1",
    };
  }
  async ready() { return true; }
}

function create() {
  const queries: ArtifactVersionQuery[] = [];
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
  } as unknown as AdminStore & PolicyReviewStoreExtension;
  const app = createAdminApi({
    authenticator: new Authenticator(),
    store,
    policyControlEnabled: true,
    policyPageIds: ["page-1"],
  });
  registerPolicyReviewRoutes(app, store, true);
  return { app, queries };
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