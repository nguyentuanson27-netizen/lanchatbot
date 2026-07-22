import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createConversationCommand,
  getConversation,
  getConversationCommands,
  getConversationMessages,
  getHandoff,
  getHandoffs,
  getIdentity,
  getOperations,
  getOutreach,
  getProductData,
  transitionPolicyArtifact,
} from "./api.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin control-plane API", () => {
  it("preserves structured lifecycle gate errors for operator feedback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "ADMIN_POLICY_CANARY_LIVE_DISABLED",
      request_id: "request-1",
    }), { status: 403, headers: { "content-type": "application/json" } })));
    const request = transitionPolicyArtifact({
      id: "version-1",
      key: "lana.policy.test",
      kind: "SHOP_POLICY",
      version: 1,
      lifecycle: "APPROVED",
      revision: 2,
      contentHash: "sha256:test",
      content: {},
      updatedBy: "owner",
      updatedAt: "2026-07-22T08:00:00.000Z",
    }, "START_CANARY", "1198992073286645", "LIVE_OUTBOUND");
    await expect(request).rejects.toMatchObject({
      status: 403,
      code: "ADMIN_POLICY_CANARY_LIVE_DISABLED",
      requestId: "request-1",
      message: "Canary gửi thật đang bị khóa bởi cổng an toàn.",
    } satisfies Partial<ApiError>);
  });

  it("reads lifecycle safety visibility from the authenticated capability response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      user: {
        email: "owner@example.com",
        role: "OWNER",
        page_scope: ["1198992073286645"],
        capabilities: {
          policy_control: true,
          policy_page_ids: ["1198992073286645"],
          policy_lifecycle: {
            canary_shadow: true,
            canary_live: false,
            publish: false,
          },
        },
      },
    })));
    const result = await getIdentity();
    expect(result).toMatchObject({
      policyCanaryShadowEnabled: true,
      policyCanaryLiveEnabled: false,
      policyPublishEnabled: false,
      policyPageIds: ["1198992073286645"],
    });
  });

  it("normalizes the oldest-first employee handoff queue and redacted source message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/handoffs/summary")) {
        return Promise.resolve(new Response(JSON.stringify({
          summary: { total: 2, new: 1, in_progress: 1, resolved: 0, reasons: [] },
        }), { status: 200, headers: { "content-type": "application/json" } }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        items: [{
          handoff_id: "8125242a-e05c-4b54-bbc4-29b17ec6f559",
          conversation_id: "94fd27a3-cdad-4210-9fc2-97280e76d38d",
          page_id: "1198992073286645",
          customer_label: "Nguyễn Thị Lan",
          source: "BOT_POLICY",
          reason_code: "BUSINESS_FACT_NOT_FOUND",
          trigger_text_redacted_safe: "CB182 giá bao nhiêu?",
          status: "NEW",
          occurred_at: "2026-07-20T02:00:00.000Z",
        }],
      }), { status: 200, headers: { "content-type": "application/json" } }));
    }));
    const result = await getHandoffs();
    expect(result.summary.open).toBe(2);
    expect(result.items[0]).toMatchObject({
      customerLabel: "Nguyễn Thị Lan",
      triggerMessage: "CB182 giá bao nhiêu?",
      reasonCode: "BUSINESS_FACT_NOT_FOUND",
    });
  });

  it("loads the complete owner-transfer timeline for a handoff", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      handoff: {
        handoff_id: "8125242a-e05c-4b54-bbc4-29b17ec6f559",
        conversation_id: "94fd27a3-cdad-4210-9fc2-97280e76d38d",
        page_id: "1198992073286645",
        status: "RESOLVED",
        occurred_at: "2026-07-20T02:00:00.000Z",
        history: [{
          handoff_id: "history-1",
          direction: "HUMAN_TO_BOT",
          source: "ADMIN",
          reason_code: "RESUME_AFTER_REVIEW",
          owner_before: "HUMAN",
          owner_after: "BOT",
          occurred_at: "2026-07-20T02:15:00.000Z",
        }],
      },
    }), { status: 200, headers: { "content-type": "application/json" } })));
    const result = await getHandoff("8125242a-e05c-4b54-bbc4-29b17ec6f559");
    expect(result.history?.[0]).toMatchObject({
      direction: "HUMAN_TO_BOT",
      ownerBefore: "HUMAN",
      ownerAfter: "BOT",
      triggerMessage: "Không có tin nhắn nguồn",
    });
  });
  it("posts a command with its idempotency key and optimistic state version", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      command: {
        command_id: "8125242a-e05c-4b54-bbc4-29b17ec6f555",
        conversation_id: "94fd27a3-cdad-4210-9fc2-97280e76d38d",
        command_type: "PAUSE_BOT",
        pause_minutes: 15,
        status: "PENDING",
        reason: "TEMPORARY_PAUSE",
        created_at: "2026-07-18T06:00:00.000Z",
      },
    }), { status: 202, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const command = await createConversationCommand(
      "94fd27a3-cdad-4210-9fc2-97280e76d38d",
      {
        command: "PAUSE_BOT",
        pauseMinutes: 15,
        reason: "TEMPORARY_PAUSE",
        expectedStateVersion: 12,
      },
      "test-idempotency-key",
    );

    expect(command.status).toBe("PENDING");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/conversations/94fd27a3-cdad-4210-9fc2-97280e76d38d/commands");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "Idempotency-Key": "test-idempotency-key",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      command: "PAUSE_BOT",
      pause_minutes: 15,
      reason: "TEMPORARY_PAUSE",
      expected_state_version: 12,
    });
  });

  it("normalizes command view fields used by PostgreSQL", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        command_id: "8125242a-e05c-4b54-bbc4-29b17ec6f555",
        conversation_id: "94fd27a3-cdad-4210-9fc2-97280e76d38d",
        command_type: "ADD_TAG",
        tag: "NHAN_VIEN",
        status: "FAILED",
        reason: "TAG_CORRECTION",
        requested_by_ref: "operator-hash",
        error_code: "PANCAKE_WRITE_FAILED",
        created_at: "2026-07-18T06:00:00.000Z",
      }],
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const response = await getConversationCommands(
      "94fd27a3-cdad-4210-9fc2-97280e76d38d",
    );

    expect(response.items[0]).toMatchObject({
      command: "ADD_TAG",
      tag: "NHAN_VIEN",
      status: "FAILED",
      actor: "operator-hash",
      error: "PANCAKE_WRITE_FAILED",
    });
  });

  it("preserves PostgreSQL bigint state_version strings for optimistic commands", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/messages?")) {
        return Promise.resolve(new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        conversation: {
          conversation_id: "94fd27a3-cdad-4210-9fc2-97280e76d38d",
          page_id: "1198992073286645",
          conversation_owner: "BOT",
          state_version: "17",
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));
    }));

    const conversation = await getConversation(
      "94fd27a3-cdad-4210-9fc2-97280e76d38d",
    );

    expect(conversation.stateVersion).toBe(17);
  });

  it("uses the OWNER identity projection for the title and Pancake ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/messages?")) {
        return Promise.resolve(new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        conversation: {
          conversation_id: "94fd27a3-cdad-4210-9fc2-97280e76d38d",
          page_id: "1198992073286645",
          customer_ref: "meta:v1:ad39",
          customer_label: "Nguyễn Thị Lan",
          pancake_conversation_id: "1198992073286645_28047528831551494",
          conversation_owner: "BOT",
          state_version: "17",
        },
      }), { status: 200, headers: { "content-type": "application/json" } }));
    }));

    const conversation = await getConversation(
      "94fd27a3-cdad-4210-9fc2-97280e76d38d",
    );

    expect(conversation.customerLabel).toBe("Nguyễn Thị Lan");
    expect(conversation.pancakeConversationId).toBe(
      "1198992073286645_28047528831551494",
    );
  });

  it("normalizes paginated consultation history without outreach messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [
        {
          message_pk: "new",
          sender_type: "BOT",
          text_redacted_safe: "Tin mới",
          outcome: "SENT",
          intent: "hoi_gia",
          product_id: "SV695",
          occurred_at: "2026-07-19T02:01:00.000Z",
        },
        {
          message_pk: "old",
          sender_type: "CUSTOMER",
          text_redacted_safe: "Tin cũ",
          occurred_at: "2026-07-19T02:00:00.000Z",
        },
      ],
      next_cursor: "older-page",
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const result = await getConversationMessages("94fd27a3-cdad-4210-9fc2-97280e76d38d");
    expect(result.items.map((item) => item.id)).toEqual(["old", "new"]);
    expect(result.items[1]).toMatchObject({ status: "SENT", intent: "hoi_gia", productId: "SV695" });
    expect(result.nextCursor).toBe("older-page");
  });

  it("loads outreach effectiveness from dedicated endpoints", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/outreach/metrics")) {
        return Promise.resolve(new Response(JSON.stringify({
          metrics: { sent: 10, read: 8, responded_24h: 4, converted_7d: 2, revenue: "1398000" },
        }), { status: 200, headers: { "content-type": "application/json" } }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        items: [{
          outreach_id: "outreach-1",
          page_id: "1198992073286645",
          template_id: "UPSALE_FOLLOWUP_01",
          template_version: "v1",
          status: "SENT",
          response_intent: "ASK_PRICE",
          order_value: "699000",
          created_at: "2026-07-19T02:00:00.000Z",
        }],
        next_cursor: "next-outreach",
      }), { status: 200, headers: { "content-type": "application/json" } }));
    }));

    const result = await getOutreach();
    expect(result.items[0]).toMatchObject({
      templateId: "UPSALE_FOLLOWUP_01",
      responseIntent: "ASK_PRICE",
      orderValue: 699000,
    });
    expect(result.nextCursor).toBe("next-outreach");
    expect(result.metrics.find((item) => item.label === "Phản hồi trong 24h")?.hint).toBe("40% số tin gửi");
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("catalog and batch worker views", () => {
  it("reads product data from the batch catalog snapshot, not chat evaluations", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({
      summary: {
        sources: [
          {
            snapshot_key: "POS_CATALOG",
            source: "Pancake POS + Google Sheets",
            status: "WARNING",
            record_count: 125,
            detail: "125 mã cấu hình · nguồn GOOGLE_SHEETS_BATCH",
            observed_at: "2026-07-21T12:00:00.000Z",
          },
          {
            snapshot_key: "QDRANT_COLLECTION",
            source: "Qdrant",
            status: "OK",
            record_count: 917,
            observed_at: "2026-07-21T10:00:00.000Z",
          },
        ],
        problems: [
          {
            product_id: "SV101",
            issue_code: "PRODUCT_NOT_FOUND",
            severity: "critical",
            source: "POS snapshot",
            detected_at: "2026-07-21T12:00:00.000Z",
          },
        ],
        totals: { sources: 2, records: 1_042, degraded: 1, issues: 1 },
      },
    })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getProductData();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/catalog/summary");
    expect(result.sources[0]).toMatchObject({
      name: "Giá và tồn kho (POS)",
      status: "warning",
      recordCount: 125,
    });
    expect(result.problems[0]).toMatchObject({
      productId: "SV101",
      issue: "Không tìm thấy trên POS",
      severity: "critical",
    });
    expect(result.metrics.find((metric) => metric.label === "Mã cần bổ sung")?.value).toBe(1);
    // Thời điểm hiển thị phải là mốc mới nhất của nguồn, không phải giờ hiện tại.
    expect(result.updatedAt).toBe("2026-07-21T12:00:00.000Z");
  });

  it("names batch workers and treats an idle daily worker as healthy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("/operations/workers")) {
        return Promise.resolve(jsonResponse({
          items: [
            {
              worker_type: "P23B_METADATA_STAGING",
              worker_id: "p23b-app-shard0",
              status: "IDLE",
              mode: "WRITE_NEW_ONLY",
              last_seen_at: new Date(Date.now() - 3_600_000).toISOString(),
            },
            {
              worker_type: "POS_SNAPSHOT",
              worker_id: "pos-snapshot-worker-1",
              status: "IDLE",
              last_seen_at: new Date(Date.now() - 40 * 3_600_000).toISOString(),
            },
          ],
        }));
      }
      return Promise.resolve(jsonResponse({ items: [] }));
    }));
    const result = await getOperations();
    expect(result.services[0]).toMatchObject({ name: "Gắn nhãn ảnh", status: "healthy" });
    expect(result.services[0]?.detail).toContain("WRITE_NEW_ONLY");
    // Im lặng quá một chu kỳ đầy đủ là dấu hiệu worker đã chết, dù trạng thái
    // cuối cùng ghi lại vẫn là IDLE.
    expect(result.services[1]).toMatchObject({ name: "Đồng bộ giá và tồn", status: "degraded" });
    expect(result.services[1]?.detail).toContain("Chưa báo cáo quá 26 giờ");
  });
});
