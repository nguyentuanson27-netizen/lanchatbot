import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAdminApi } from "./app.js";
import type { CreateAdminApiOptions } from "./app.js";
import type {
  AdminAuthenticator,
  AdminIdentity,
  AdminStore,
} from "./types.js";
import { AdminAuthError } from "./types.js";

const identity: AdminIdentity = {
  email: "nguyentuanson27@gmail.com",
  role: "OWNER",
  pageScope: ["1198992073286645"],
  subject: "authentik-user-1",
};

class FakeAuthenticator implements AdminAuthenticator {
  async authenticate(assertion: string | undefined) {
    if (assertion !== "valid") throw new AdminAuthError("ADMIN_AUTH_REQUIRED");
    return identity;
  }
  async ready() { return true; }
}

class FakeStore implements AdminStore {
  async ready() { return true; }
  async controlReady() { return true; }
  async policyControlReady() { return true; }
  async dashboard() { return { conversations: { total: 3 } }; }
  async listPages() { return [{ page_id: "1198992073286645" }]; }
  async pageHealth(_identity: AdminIdentity, pageId: string) {
    return pageId === "1198992073286645" ? { page: { page_id: pageId } } : null;
  }
  async listConversations() {
    return { items: [{ conversation_id: "c1" }], nextCursor: "next" };
  }
  async getConversation(_identity: AdminIdentity, id: string) {
    return id === "c1" || id === "018f1b72-0000-7000-8000-000000000001"
      ? { conversation_id: id, page_id: "1198992073286645" }
      : null;
  }
  async listMessages() { return { items: [], nextCursor: null }; }
  async listEvents() { return { items: [], nextCursor: null }; }
  async listOutreachMessages() {
    return {
      items: [{ outreach_id: "outreach-1", template_id: "UPSALE_FOLLOWUP_01" }],
      nextCursor: "outreach-next",
    };
  }
  async outreachMetrics() { return { sent: 10, responded_24h: 3 }; }
  async evaluationSummary() { return { total: 2 }; }
  async salesFunnelSummary() {
    return {
      price_asked: 10,
      size_consulted: 8,
      cart_opened: 5,
      order_preview: 3,
      purchase_confirmed: 2,
    };
  }
  async listEvaluations() { return { items: [], nextCursor: null }; }
  async businessFactSummary() { return { total: 1, ok: 1 }; }
  async listWorkers() { return [{ worker_id: "worker-1" }]; }
  async catalogSummary() {
    return {
      sources: [{ snapshot_key: "POS_CATALOG", status: "OK", record_count: 125 }],
      problems: [],
      workers: [],
      totals: { sources: 1, records: 125, degraded: 0, issues: 0 },
    };
  }
  async listInbox() { return { items: [], nextCursor: null }; }
  async listMetaOutbox() { return { items: [], nextCursor: null }; }
  async listPancakeOutbox() { return { items: [], nextCursor: null }; }
  async handoffSummary() {
    return { total: 3, new: 2, acknowledged: 1, oldest_open_at: "2026-07-20T01:00:00.000Z" };
  }
  async listHandoffs() {
    return {
      items: [{
        handoff_id: "018f1b72-0000-7000-8000-000000000009",
        status: "NEW",
        reason_code: "BUSINESS_FACT_NOT_FOUND",
      }],
      nextCursor: null,
    };
  }
  async getHandoff(_identity: AdminIdentity, id: string) {
    return id === "018f1b72-0000-7000-8000-000000000009"
      ? { handoff_id: id, status: "NEW" }
      : null;
  }
  async listAudit() { return { items: [], nextCursor: null }; }
  async listArtifactVersions() { return { items: [], nextCursor: null }; }
  async getArtifactVersion() { return null; }
  async listArtifactEvents() { return []; }
  async createArtifactVersion() { return { version_id: "018f1b72-0000-7000-8000-000000000010" }; }
  async updateArtifactDraft(_identity: AdminIdentity, id: string, input: Parameters<AdminStore["updateArtifactDraft"]>[2]) {
    return { version_id: id, revision: input.expectedRevision + 1, lifecycle: "DRAFT" };
  }
  async transitionArtifactVersion(_identity: AdminIdentity, id: string, input: Parameters<AdminStore["transitionArtifactVersion"]>[2]) {
    return { version_id: id, revision: input.expectedRevision + 1, lifecycle: input.action };
  }
  async listActivePointers() { return []; }
  async rollbackArtifactPointer() { return { pointer_id: "018f1b72-0000-7000-8000-000000000011" }; }
  async createSimulation() { return { simulation_id: "018f1b72-0000-7000-8000-000000000012" }; }
  async listSimulations() { return { items: [], nextCursor: null }; }
  async createConversationCommand(
    _identity: AdminIdentity,
    conversationId: string,
    input: Parameters<AdminStore["createConversationCommand"]>[2],
  ) {
    return {
      command: {
        command_id: "018f1b72-0000-7000-8000-000000000002",
        conversation_id: conversationId,
        command_type: input.command,
        expected_state_version: input.expectedStateVersion,
        status: "PENDING",
      },
      created: true,
      conflicted: false,
    };
  }
  async getCommand(_identity: AdminIdentity, commandId: string) {
    return { command_id: commandId, status: "PENDING" };
  }
  async listConversationCommands() {
    return { items: [], nextCursor: null };
  }
  async close() {}
}

function create(overrides: Partial<CreateAdminApiOptions> = {}) {
  return createAdminApi({
    authenticator: new FakeAuthenticator(),
    store: new FakeStore(),
    allowedOrigin: "https://admin.lanadesign.vn",
    controlEnabled: true,
    historyEnabled: true,
    controlPageIds: ["1198992073286645"],
    policyControlEnabled: true,
    policyPageIds: ["1198992073286645"],
    ...overrides,
  });
}

class RoleAuthenticator implements AdminAuthenticator {
  constructor(private readonly role: AdminIdentity["role"]) {}
  async authenticate(assertion: string | undefined) {
    if (assertion !== "valid") throw new AdminAuthError("ADMIN_AUTH_REQUIRED");
    return { ...identity, role: this.role, subject: `sub-${this.role}` };
  }
  async ready() { return true; }
}

type DatasetService = NonNullable<CreateAdminApiOptions["datasetReview"]>;

class FakeDatasetReviewService implements DatasetService {
  calls: string[] = [];
  async ready() { return true; }
  async close() {}
  async listDatasets() { this.calls.push("listDatasets"); return [{ dataset_id: "ds-1" }]; }
  async getDataset(id: string) { return id === "018f1b72-0000-7000-8000-000000000001" ? { dataset_id: id } : null; }
  async listProjects() { return [{ project_id: "018f1b72-0000-7000-8000-000000000020" }]; }
  async getProject(id: string) { return { project_id: id, split_summary: { DEVELOPMENT: 2 } }; }
  async createProject(input: Parameters<DatasetService["createProject"]>[0]) {
    this.calls.push("createProject");
    return { project_id: "018f1b72-0000-7000-8000-000000000021", name: input.name, created_by_subject: input.createdBySubject };
  }
  async listLabelSchemas() { return [{ label_schema_id: "018f1b72-0000-7000-8000-000000000030" }]; }
  async createLabelSchema(_schema: unknown, subject: string) {
    if (subject === "throw") throw new Error("bad schema");
    return { labelSchemaId: "018f1b72-0000-7000-8000-000000000031", created: true, name: "wave1", version: "1.0.0" };
  }
  async createSplit() { return { assigned: 4, alreadyAssigned: 0, perSplit: { DEVELOPMENT: 2, VALIDATION: 1, HOLDOUT: 1, RARE_SAFETY: 0 } }; }
  async reviewQueue(projectId: string, request: Parameters<DatasetService["reviewQueue"]>[1]) {
    this.calls.push(`reviewQueue:${request.acquireLease}`);
    return {
      project_id: projectId,
      review_mode: "AI_ASSISTED",
      progress: { reviewed: 1, total: 3 },
      item: { project_item_id: "018f1b72-0000-7000-8000-000000000040", messages: [], annotations: [] },
    };
  }
  async addAnnotation(input: Parameters<DatasetService["addAnnotation"]>[0]) {
    return { annotation_id: "018f1b72-0000-7000-8000-000000000050", label_code: input.labelCode, source: "HUMAN" };
  }
  async reviewAnnotation(id: string, input: Parameters<DatasetService["reviewAnnotation"]>[1]) {
    return { annotation_id: id, status: input.action === "ACCEPT" ? "ACCEPTED" : "REJECTED" };
  }
  async lockHoldout() { this.calls.push("lockHoldout"); return { locked: 5 }; }
  async exportProject(_projectId: string, splits: readonly string[]) {
    return {
      filename: "benchmark.jsonl",
      jsonl: `${JSON.stringify({ split: splits[0] })}\n`,
      rowCount: 1,
      itemCount: 1,
    };
  }
}

function datasetApp(options: {
  role?: AdminIdentity["role"];
  service?: DatasetService | null;
  exportEnabled?: boolean;
} = {}) {
  const service = options.service === undefined ? new FakeDatasetReviewService() : options.service;
  return createAdminApi({
    authenticator: new RoleAuthenticator(options.role ?? "OWNER"),
    store: new FakeStore(),
    allowedOrigin: "https://admin.lanadesign.vn",
    ...(service ? { datasetReview: service } : {}),
    datasetExportEnabled: options.exportEnabled ?? false,
    datasetAiPrelabelEnabled: true,
    datasetBlindReviewEnabled: true,
  });
}

const datasetHeaders = { "x-lana-admin-assertion": "valid", origin: "https://admin.lanadesign.vn" };

describe("Admin API", () => {
  it("serves catalog freshness from the batch snapshot, not chat traffic", async () => {
    const app = create();
    const response = await app.inject({
      method: "GET",
      url: "/admin/v1/catalog/summary",
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().summary.totals.records, 125);
    assert.equal(response.json().summary.sources[0].snapshot_key, "POS_CATALOG");
    const unauthorized = await app.inject({
      method: "GET",
      url: "/admin/v1/catalog/summary",
    });
    assert.equal(unauthorized.statusCode, 401);
    await app.close();
  });
  it("lists the automatic employee handoff queue and its summary", async () => {
    const app = create();
    const headers = { "x-lana-admin-assertion": "valid" };
    const summary = await app.inject({
      method: "GET",
      url: "/admin/v1/handoffs/summary",
      headers,
    });
    assert.equal(summary.statusCode, 200);
    assert.equal(summary.json().summary.new, 2);
    const queue = await app.inject({
      method: "GET",
      url: "/admin/v1/handoffs?status=OPEN&source=BOT_POLICY&limit=25",
      headers,
    });
    assert.equal(queue.statusCode, 200);
    assert.equal(queue.json().items[0].reason_code, "BUSINESS_FACT_NOT_FOUND");
    const invalid = await app.inject({
      method: "GET",
      url: "/admin/v1/handoffs?status=DELETED",
      headers,
    });
    assert.equal(invalid.statusCode, 400);
    await app.close();
  });
  it("keeps outreach analytics separate and paginated", async () => {
    const app = create();
    const messages = await app.inject({
      method: "GET",
      url: "/admin/v1/outreach/messages?limit=25&template_id=UPSALE_FOLLOWUP_01",
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(messages.statusCode, 200);
    assert.deepEqual(messages.json(), {
      items: [{ outreach_id: "outreach-1", template_id: "UPSALE_FOLLOWUP_01" }],
      next_cursor: "outreach-next",
    });
    const metrics = await app.inject({
      method: "GET",
      url: "/admin/v1/outreach/metrics",
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(metrics.statusCode, 200);
    assert.deepEqual(metrics.json(), { metrics: { sent: 10, responded_24h: 3 } });
    await app.close();
  });

  it("keeps liveness public but requires an internal signed assertion for admin routes", async () => {
    const app = create();
    assert.equal((await app.inject({ method: "GET", url: "/health/live" })).statusCode, 200);
    const unauthorized = await app.inject({ method: "GET", url: "/admin/v1/me" });
    assert.equal(unauthorized.statusCode, 401);
    assert.equal(unauthorized.json().code, "ADMIN_AUTH_REQUIRED");
    await app.close();
  });

  it("keeps control mutations disabled by default", async () => {
    const app = createAdminApi({
      authenticator: new FakeAuthenticator(),
      store: new FakeStore(),
      allowedOrigin: "https://admin.lanadesign.vn",
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/v1/conversations/018f1b72-0000-7000-8000-000000000001/commands",
      headers: {
        "x-lana-admin-assertion": "valid",
        "idempotency-key": "ui-command-disabled",
        origin: "https://admin.lanadesign.vn",
      },
      payload: {
        command: "PAUSE_BOT",
        pause_minutes: 15,
        expected_state_version: 0,
        reason: "TEMPORARY_PAUSE",
      },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, "ADMIN_CONTROL_DISABLED");
    await app.close();
  });

  it("returns only the verified identity and read-only endpoint envelopes", async () => {
    const app = create();
    const headers = {
      "x-lana-admin-assertion": "valid",
      origin: "https://admin.lanadesign.vn",
    };
    const me = await app.inject({ method: "GET", url: "/admin/v1/me", headers });
    assert.equal(me.statusCode, 200);
    assert.deepEqual(me.json(), {
      user: {
        email: identity.email,
        role: "OWNER",
        page_scope: ["1198992073286645"],
        capabilities: {
          conversation_control: true,
          history: true,
          control_page_ids: ["1198992073286645"],
          policy_control: true,
          policy_page_ids: ["1198992073286645"],
          policy_lifecycle: {
            canary_shadow: true,
            canary_live: false,
            publish: false,
          },
          product_media_upload: false,
          dataset_review: {
            enabled: false,
            role: "DATASET_ADMIN",
            can_annotate: false,
            can_adjudicate: false,
            can_admin: false,
            ai_prelabel: false,
            blind_review: false,
            export: false,
          },
        },
      },
    });
    const conversations = await app.inject({
      method: "GET",
      url: "/admin/v1/conversations?limit=50",
      headers,
    });
    assert.deepEqual(conversations.json(), {
      items: [{ conversation_id: "c1" }],
      next_cursor: "next",
    });
    assert.equal((await app.inject({
      method: "POST",
      url: "/admin/v1/conversations",
      headers,
    })).statusCode, 404);
    await app.close();
  });

  it("accepts an authenticated product media upload and keeps it pending for review", async () => {
    const app = create({
      productMedia: {
        async ready() { return true; },
        async catalog() {
          return {
            brands: ["La.na Design"],
            products: [{ maSp: "CB182", brand: "La.na Design", active: true }],
          };
        },
        async upload(_identity, input) {
          return {
            intakeId: "intake-1",
            maSp: input.maSp.toUpperCase(),
            brand: input.brand,
            imageUrl: "https://admin.lanadesign.vn/lana-public/products/cb182-a.jpg",
            classificationStatus: "PENDING_AI" as const,
            status: "PENDING_AI" as const,
            uploadedAt: "2026-07-24T00:00:00.000Z",
            duplicate: false,
          };
        },
      },
    });
    const catalog = await app.inject({
      method: "GET",
      url: "/admin/v1/product-media/catalog",
      headers: {
        "x-lana-admin-assertion": "valid",
        origin: "https://admin.lanadesign.vn",
      },
    });
    assert.equal(catalog.statusCode, 200);
    assert.deepEqual(catalog.json().catalog.brands, ["La.na Design"]);
    assert.deepEqual(catalog.json().catalog.products, [{
      maSp: "CB182",
      brand: "La.na Design",
      active: true,
    }]);

    const response = await app.inject({
      method: "POST",
      url: "/admin/v1/product-media/uploads",
      headers: {
        "x-lana-admin-assertion": "valid",
        origin: "https://admin.lanadesign.vn",
      },
      payload: {
        ma_sp: "CB182",
        brand: "La.na Design",
        file_name: "cb182.jpg",
        mime_type: "image/jpeg",
        content_base64: "/9j/2Q==",
      },
    });
    assert.equal(response.statusCode, 201);
    assert.equal(response.json().upload.status, "PENDING_AI");
    assert.equal(response.json().upload.maSp, "CB182");
    await app.close();
  });

  it("keeps history and outreach disabled until explicitly enabled", async () => {
    const app = createAdminApi({
      authenticator: new FakeAuthenticator(),
      store: new FakeStore(),
    });
    const response = await app.inject({
      method: "GET",
      url: "/admin/v1/messages?limit=10",
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().code, "ADMIN_HISTORY_DISABLED");
    await app.close();
  });

  it("rejects cross-origin browser requests and malformed filters", async () => {
    const app = create();
    const denied = await app.inject({
      method: "GET",
      url: "/admin/v1/dashboard",
      headers: {
        "x-lana-admin-assertion": "valid",
        origin: "https://evil.example",
      },
    });
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.json().code, "ADMIN_ORIGIN_DENIED");
    const invalid = await app.inject({
      method: "GET",
      url: "/admin/v1/conversations?limit=999",
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().code, "ADMIN_QUERY_INVALID");
    await app.close();
  });

  it("returns security headers and readiness without exposing configuration", async () => {
    const app = create();
    const response = await app.inject({ method: "GET", url: "/health/ready" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: "ready",
      auth: true,
      database: true,
      read_only: false,
      control_plane: true,
      policy_control: true,
      policy_lifecycle: {
        canary_shadow: true,
        canary_live: false,
        publish: false,
      },
      product_media: false,
      dataset_review: false,
    });
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(response.headers["x-frame-options"], "DENY");

    const identityResponse = await app.inject({
      method: "GET",
      url: "/admin/v1/me",
      headers: { "x-lana-admin-assertion": "valid" },
    });
    assert.deepEqual(identityResponse.json().user.capabilities.policy_lifecycle, {
      canary_shadow: true,
      canary_live: false,
      publish: false,
    });
    await app.close();
  });

  it("allows shadow canary but rejects live canary and publish by default", async () => {
    const app = create();
    const headers = {
      "x-lana-admin-assertion": "valid",
      origin: "https://admin.lanadesign.vn",
    };
    const versionId = "018f1b72-0000-7000-8000-000000000010";
    const transition = (payload: Record<string, unknown>) => app.inject({
      method: "POST",
      url: `/admin/v1/policy/artifacts/${versionId}/transitions`,
      headers,
      payload: { expected_revision: 2, page_id: "1198992073286645", ...payload },
    });

    const shadow = await transition({ action: "START_CANARY", canary_mode: "SHADOW" });
    assert.equal(shadow.statusCode, 200);

    const live = await transition({ action: "START_CANARY", canary_mode: "LIVE_OUTBOUND" });
    assert.equal(live.statusCode, 403);
    assert.equal(live.json().code, "ADMIN_POLICY_CANARY_LIVE_DISABLED");

    const publish = await transition({ action: "PUBLISH", canary_mode: null });
    assert.equal(publish.statusCode, 403);
    assert.equal(publish.json().code, "ADMIN_POLICY_PUBLISH_DISABLED");

    const retire = await transition({ action: "RETIRE", page_id: null, canary_mode: null });
    assert.equal(retire.statusCode, 200);

    const rollback = await app.inject({
      method: "POST",
      url: "/admin/v1/policy/pointers/rollback",
      headers,
      payload: {
        artifact_key: "lana.shopwide.offers",
        artifact_kind: "OFFER_POLICY",
        page_id: "1198992073286645",
        channel: "PUBLISHED",
        target_version_id: "018f1b72-0000-7000-8000-000000000009",
        expected_pointer_revision: 4,
      },
    });
    assert.equal(rollback.statusCode, 200);

    const shadowRollback = await app.inject({
      method: "POST",
      url: "/admin/v1/policy/pointers/rollback",
      headers,
      payload: {
        artifact_key: "lana.shopwide.offers",
        artifact_kind: "OFFER_POLICY",
        page_id: "1198992073286645",
        channel: "CANARY_SHADOW",
        target_version_id: "018f1b72-0000-7000-8000-000000000008",
        expected_pointer_revision: 2,
      },
    });
    assert.equal(shadowRollback.statusCode, 200);

    const otherPage = await app.inject({
      method: "POST",
      url: `/admin/v1/policy/artifacts/${versionId}/transitions`,
      headers,
      payload: {
        expected_revision: 2,
        action: "START_CANARY",
        page_id: "other-page",
        canary_mode: "SHADOW",
      },
    });
    assert.equal(otherPage.statusCode, 403);
    assert.equal(otherPage.json().code, "ADMIN_PAGE_NOT_ALLOWED");
    await app.close();
  });

  it("allows live canary and publish only when each safety flag is explicit", async () => {
    const app = create({
      policyCanaryLiveEnabled: true,
      policyPublishEnabled: true,
    });
    const headers = {
      "x-lana-admin-assertion": "valid",
      origin: "https://admin.lanadesign.vn",
    };
    const url = "/admin/v1/policy/artifacts/018f1b72-0000-7000-8000-000000000010/transitions";
    const live = await app.inject({
      method: "POST", url, headers,
      payload: { expected_revision: 2, action: "START_CANARY", page_id: "1198992073286645", canary_mode: "LIVE_OUTBOUND" },
    });
    const publish = await app.inject({
      method: "POST", url, headers,
      payload: { expected_revision: 3, action: "PUBLISH", page_id: "1198992073286645", canary_mode: null },
    });
    assert.equal(live.statusCode, 200);
    assert.equal(publish.statusCode, 200);
    const readiness = await app.inject({ method: "GET", url: "/health/ready" });
    assert.deepEqual(readiness.json().policy_lifecycle, {
      canary_shadow: true,
      canary_live: true,
      publish: true,
    });
    await app.close();
  });

  it("accepts only allowlisted, versioned, idempotent owner commands", async () => {
    const app = create();
    const conversationId = "018f1b72-0000-7000-8000-000000000001";
    const accepted = await app.inject({
      method: "POST",
      url: `/admin/v1/conversations/${conversationId}/commands`,
      headers: {
        "x-lana-admin-assertion": "valid",
        "idempotency-key": "ui-command-0001",
        origin: "https://admin.lanadesign.vn",
      },
      payload: {
        command: "PAUSE_BOT",
        pause_minutes: 15,
        expected_state_version: 7,
        reason: "TEMPORARY_PAUSE",
      },
    });
    assert.equal(accepted.statusCode, 202);
    assert.equal(accepted.json().command.command_type, "PAUSE_BOT");

    const arbitraryTag = await app.inject({
      method: "POST",
      url: `/admin/v1/conversations/${conversationId}/commands`,
      headers: {
        "x-lana-admin-assertion": "valid",
        "idempotency-key": "ui-command-0002",
        origin: "https://admin.lanadesign.vn",
      },
      payload: {
        command: "ADD_TAG",
        tag: "TUY_Y",
        expected_state_version: 7,
        reason: "TAG_CORRECTION",
      },
    });
    assert.equal(arbitraryTag.statusCode, 400);
    assert.equal(arbitraryTag.json().code, "ADMIN_COMMAND_INVALID");

    const missingKey = await app.inject({
      method: "POST",
      url: `/admin/v1/conversations/${conversationId}/commands`,
      headers: {
        "x-lana-admin-assertion": "valid",
        origin: "https://admin.lanadesign.vn",
      },
      payload: {
        command: "RESUME_BOT",
        expected_state_version: 8,
        reason: "RESUME_AFTER_REVIEW",
      },
    });
    assert.equal(missingKey.statusCode, 400);
    await app.close();
  });

  it("accepts only structured policy drafts and side-effect-free simulations", async () => {
    const app = create();
    const headers = {
      "x-lana-admin-assertion": "valid",
      origin: "https://admin.lanadesign.vn",
    };
    const sourceMetadata = {
      source: "ADMIN",
      sourceReference: null,
      sourceVersion: "2026-07-22.1",
      observedAt: "2026-07-22T08:00:00.000Z",
    };
    const content = {
      schemaVersion: 1,
      kind: "OFFER_POLICY",
      scope: "SHOP_WIDE",
      multiItem: {
        minimumParentProductUnits: 2,
        discountBps: 500,
        setAndComboCountAsOne: true,
      },
      concessions: {
        second: { freeShipping: true, fixedDiscountVnd: 0 },
        final: { freeShipping: true, fixedDiscountVnd: 20_000 },
        stackMultiItemWithSecond: true,
        stackMultiItemWithFinal: true,
        deduplicateFreeShipping: true,
      },
      sourceMetadata,
    };
    const created = await app.inject({
      method: "POST",
      url: "/admin/v1/policy/artifacts",
      headers,
      payload: { artifact_key: "lana.shopwide.offers", content },
    });
    assert.equal(created.statusCode, 201);

    const arbitrary = await app.inject({
      method: "POST",
      url: "/admin/v1/policy/artifacts",
      headers,
      payload: {
        artifact_key: "lana.unsafe",
        content: { ...content, arbitrary_json: { code: "return true" } },
      },
    });
    assert.equal(arbitrary.statusCode, 400);
    assert.equal(arbitrary.json().code, "ADMIN_ARTIFACT_INVALID");

    const simulation = await app.inject({
      method: "POST",
      url: "/admin/v1/policy/simulations",
      headers,
      payload: {
        schemaVersion: 1,
        versionIds: ["018f1b72-0000-7000-8000-000000000010"],
        pageId: "1198992073286645",
        lookbackDays: 180,
        maxConversations: 500,
        sideEffects: "DISABLED",
      },
    });
    assert.equal(simulation.statusCode, 202);
    await app.close();
  });
});

describe("Dataset review routes", () => {
  it("returns 503 for every dataset route when the module is disabled", async () => {
    const app = datasetApp({ service: null });
    for (const url of ["/admin/v1/datasets", "/admin/v1/dataset-label-schemas"]) {
      const response = await app.inject({ method: "GET", url, headers: datasetHeaders });
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().code, "ADMIN_DATASET_REVIEW_DISABLED");
    }
    await app.close();
  });

  it("lists datasets for a benchmark viewer and reports capabilities", async () => {
    const app = datasetApp({ role: "VIEWER" });
    const list = await app.inject({ method: "GET", url: "/admin/v1/datasets", headers: datasetHeaders });
    assert.equal(list.statusCode, 200);
    assert.deepEqual(list.json(), { items: [{ dataset_id: "ds-1" }], next_cursor: null });
    const me = await app.inject({ method: "GET", url: "/admin/v1/me", headers: datasetHeaders });
    assert.deepEqual(me.json().user.capabilities.dataset_review, {
      enabled: true,
      role: "BENCHMARK_VIEWER",
      can_annotate: false,
      can_adjudicate: false,
      can_admin: false,
      ai_prelabel: true,
      blind_review: true,
      export: false,
    });
    await app.close();
  });

  it("forbids a benchmark viewer from creating a project but allows the dataset admin", async () => {
    const viewerApp = datasetApp({ role: "VIEWER" });
    const forbidden = await viewerApp.inject({
      method: "POST",
      url: "/admin/v1/datasets/018f1b72-0000-7000-8000-000000000001/projects",
      headers: datasetHeaders,
      payload: { label_schema_id: "018f1b72-0000-7000-8000-000000000031", name: "Wave 1", annotation_mode: "MESSAGE", review_mode: "AI_ASSISTED" },
    });
    assert.equal(forbidden.statusCode, 403);
    assert.equal(forbidden.json().code, "ADMIN_DATASET_FORBIDDEN");
    await viewerApp.close();

    const adminApp = datasetApp({ role: "OWNER" });
    const created = await adminApp.inject({
      method: "POST",
      url: "/admin/v1/datasets/018f1b72-0000-7000-8000-000000000001/projects",
      headers: datasetHeaders,
      payload: { label_schema_id: "018f1b72-0000-7000-8000-000000000031", name: "Wave 1", annotation_mode: "MESSAGE", review_mode: "AI_ASSISTED" },
    });
    assert.equal(created.statusCode, 201);
    assert.equal(created.json().project.created_by_subject, "sub-OWNER");
    await adminApp.close();
  });

  it("acquires a lease for a reviewer but keeps the queue read-only for a viewer", async () => {
    const reviewerService = new FakeDatasetReviewService();
    const reviewerApp = createAdminApi({
      authenticator: new RoleAuthenticator("EDITOR"),
      store: new FakeStore(),
      allowedOrigin: "https://admin.lanadesign.vn",
      datasetReview: reviewerService,
    });
    const reviewerQueue = await reviewerApp.inject({
      method: "GET",
      url: "/admin/v1/dataset-projects/018f1b72-0000-7000-8000-000000000020/queue?split=DEVELOPMENT",
      headers: datasetHeaders,
    });
    assert.equal(reviewerQueue.statusCode, 200);
    assert.ok(reviewerService.calls.includes("reviewQueue:true"));
    await reviewerApp.close();

    const viewerService = new FakeDatasetReviewService();
    const viewerApp = createAdminApi({
      authenticator: new RoleAuthenticator("VIEWER"),
      store: new FakeStore(),
      allowedOrigin: "https://admin.lanadesign.vn",
      datasetReview: viewerService,
    });
    const viewerQueue = await viewerApp.inject({
      method: "GET",
      url: "/admin/v1/dataset-projects/018f1b72-0000-7000-8000-000000000020/queue",
      headers: datasetHeaders,
    });
    assert.equal(viewerQueue.statusCode, 200);
    assert.ok(viewerService.calls.includes("reviewQueue:false"));
    await viewerApp.close();
  });

  it("requires adjudicator rights to REMOVE an annotation", async () => {
    const annotatorApp = datasetApp({ role: "EDITOR" });
    const remove = await annotatorApp.inject({
      method: "POST",
      url: "/admin/v1/dataset-annotations/018f1b72-0000-7000-8000-000000000050/review",
      headers: datasetHeaders,
      payload: { action: "REMOVE" },
    });
    assert.equal(remove.statusCode, 403);
    await annotatorApp.close();

    const accept = await datasetApp({ role: "EDITOR" }).inject({
      method: "POST",
      url: "/admin/v1/dataset-annotations/018f1b72-0000-7000-8000-000000000050/review",
      headers: datasetHeaders,
      payload: { action: "ACCEPT" },
    });
    assert.equal(accept.statusCode, 200);
    assert.equal(accept.json().annotation.status, "ACCEPTED");
  });

  it("streams a JSONL export only when the export flag is on", async () => {
    const disabled = await datasetApp({ role: "OWNER", exportEnabled: false }).inject({
      method: "GET",
      url: "/admin/v1/dataset-projects/018f1b72-0000-7000-8000-000000000020/export",
      headers: datasetHeaders,
    });
    assert.equal(disabled.statusCode, 503);
    assert.equal(disabled.json().code, "ADMIN_DATASET_EXPORT_DISABLED");

    const enabled = await datasetApp({ role: "OWNER", exportEnabled: true }).inject({
      method: "GET",
      url: "/admin/v1/dataset-projects/018f1b72-0000-7000-8000-000000000020/export",
      headers: datasetHeaders,
    });
    assert.equal(enabled.statusCode, 200);
    assert.match(enabled.headers["content-type"] as string, /x-ndjson/u);
    assert.equal(enabled.headers["x-dataset-export-items"], "1");
    assert.match(enabled.body, /"split":"DEVELOPMENT"/u);
  });

  it("blocks holdout export for anyone below dataset admin", async () => {
    const app = datasetApp({ role: "APPROVER", exportEnabled: true });
    const response = await app.inject({
      method: "GET",
      url: "/admin/v1/dataset-projects/018f1b72-0000-7000-8000-000000000020/export?splits=HOLDOUT",
      headers: datasetHeaders,
    });
    assert.equal(response.statusCode, 403);
    await app.close();
  });

  it("locks the holdout split for the dataset admin", async () => {
    const service = new FakeDatasetReviewService();
    const app = createAdminApi({
      authenticator: new RoleAuthenticator("OWNER"),
      store: new FakeStore(),
      allowedOrigin: "https://admin.lanadesign.vn",
      datasetReview: service,
    });
    const response = await app.inject({
      method: "POST",
      url: "/admin/v1/dataset-projects/018f1b72-0000-7000-8000-000000000020/lock-holdout",
      headers: datasetHeaders,
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().holdout, { locked: 5 });
    assert.ok(service.calls.includes("lockHoldout"));
    await app.close();
  });
});
