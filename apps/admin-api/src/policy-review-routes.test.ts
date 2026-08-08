import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAdminApi } from "./app.js";
import type {
  AdminAuthenticator,
  AdminIdentity,
  AdminStore,
  ArtifactVersionQuery,
} from "./types.js";
import { AdminQueryError } from "./types.js";

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

interface ReviewStore extends AdminStore {
  getArtifactReviewContext(
    identity: AdminIdentity,
    versionId: string,
  ): Promise<Record<string, unknown> | null>;
}

function makeStore() {
  const queries: ArtifactVersionQuery[] = [];
  const transitions: string[] = [];
  const store = {
    async listArtifactVersions(_identity: AdminIdentity, query: ArtifactVersionQuery) {
      queries.push(query);
      return { items: [], nextCursor: null };
    },
    async getArtifactReviewContext(_identity: AdminIdentity, versionId: string) {
      return versionId === VERSION_A ? {
        artifact: { version_id: VERSION_A, artifact_key: "size-chart:SQ603", artifact_kind: "SIZE_CHART" },
        previous_version: { version_id: VERSION_B, version_number: 2 },
        active_pointers: [{
          pointer_id: "018f1b72-0000-7000-8000-000000000201",
          artifact_key: "size-chart:SQ603",
          artifact_kind: "SIZE_CHART",
          page_id: "page-1",
          channel: "PUBLISHED",
          version_id: VERSION_A,
          revision: 7,
        }],
        rollback_candidates: [],
      } : null;
    },
    async transitionArtifactVersion(
      _identity: AdminIdentity,
      versionId: string,
      input: { expectedRevision: number; action: string },
    ) {
      transitions.push(versionId);
      if (versionId === VERSION_B) {
        throw new AdminQueryError("ADMIN_ARTIFACT_VERSION_CONFLICT");
      }
      return {
        version_id: versionId,
        lifecycle: input.action === "VALIDATE" ? "VALIDATED" : "APPROVED",
        revision: input.expectedRevision + 1,
      };
    },
    async getArtifactVersion(_identity: AdminIdentity, versionId: string) {
      return versionId === VERSION_B
        ? { version_id: VERSION_B, lifecycle: "DRAFT", revision: 9 }
        : null;
    },
  } as unknown as ReviewStore;
  return { store, queries, transitions };
}

function create(role: AdminIdentity["role"] = "OWNER") {
  const fixture = makeStore();
  const app = createAdminApi({
    authenticator: new Authenticator(role),
    store: fixture.store,
    policyControlEnabled: true,
    policyPageIds: ["page-1"],
  });
  return { app, ...fixture };
}

describe("policy review routes", () => {
  it("passes additive search/active/sort list semantics to the store", async () => {
    const { app, queries } = create();
    const response = await app.inject({
      method: "GET",
      url: "/admin/v1/policy/artifacts?limit=50&search=SQ603&active=active&sort=artifact_key_asc",
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
      url: `/admin/v1/policy/artifacts?search=${"x".repeat(121)}`,
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(response.statusCode, 400);
    assert.deepEqual(queries, []);
    await app.close();
  });

  it("returns review context without depending on the current list page", async () => {
    const { app } = create();
    const response = await app.inject({
      method: "GET",
      url: `/admin/v1/policy/artifacts/${VERSION_A}/review-context`,
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.review_context.active_pointers[0].page_id, "page-1");
    assert.equal(payload.review_context.active_pointers[0].revision, 7);
    await app.close();
  });

  it("returns ordered per-item batch results and current revision on conflict", async () => {
    const { app, transitions } = create();
    const response = await app.inject({
      method: "POST",
      url: "/admin/v1/policy/artifacts/batch-transitions",
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
    assert.equal(payload.results[0].artifact.revision, 4);
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
      url: "/admin/v1/policy/artifacts/batch-transitions",
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

  it("rejects a role that cannot perform the requested batch action before item processing", async () => {
    const { app, transitions } = create("VIEWER");
    const response = await app.inject({
      method: "POST",
      url: "/admin/v1/policy/artifacts/batch-transitions",
      headers: { "x-lana-admin-assertion": "valid" },
      payload: { action: "APPROVE", items: [{ version_id: VERSION_A, expected_revision: 3 }] },
    });
    assert.equal(response.statusCode, 403);
    assert.deepEqual(transitions, []);
    await app.close();
  });
});
