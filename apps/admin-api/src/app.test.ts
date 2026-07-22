import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAdminApi } from "./app.js";
import type {
  AdminAuthenticator,
  AdminIdentity,
  AdminStore,
} from "./types.js";
import { AdminAuthError } from "./types.js";

const identity: AdminIdentity = {
  email: "nguyentuanson27@gmail.com",
  role: "OWNER",
  pageScope: "ALL",
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

function create() {
  return createAdminApi({
    authenticator: new FakeAuthenticator(),
    store: new FakeStore(),
    allowedOrigin: "https://admin.lanadesign.vn",
    controlEnabled: true,
    historyEnabled: true,
    controlPageIds: ["1198992073286645"],
  });
}

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
        page_scope: "ALL",
        capabilities: {
          conversation_control: true,
          history: true,
          control_page_ids: ["1198992073286645"],
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
    });
    assert.equal(response.headers["cache-control"], "no-store");
    assert.equal(response.headers["x-frame-options"], "DENY");
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
});
