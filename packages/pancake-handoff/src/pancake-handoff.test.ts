import { describe, expect, it } from "vitest";
import {
  assertPancakeEndpointAllowed,
  PancakeAllowListedClient,
  type PancakePageConfig,
} from "./client.js";
import {
  desiredHandoffTag,
  InMemoryPancakePageRegistry,
  mustBlockBot,
  PancakeHandoffAdapter,
} from "./handoff.js";
import { FakePancakeHttpTransport } from "./transport.js";

const page: PancakePageConfig = {
  pageId: "page-1",
  accessToken: "test-token",
  tagIds: {
    NHAN_VIEN: "tag-human",
    VAN_DON: "tag-order",
    DA_CHOT_DON: "tag-closed",
    KHONG_UP_SALE: "tag-no-upsale",
  },
};

const create = (transport: FakePancakeHttpTransport, configs = [page]) =>
  new PancakeHandoffAdapter(
    new PancakeAllowListedClient(transport),
    new InMemoryPancakePageRegistry(configs),
    () => new Date("2026-07-13T00:00:00.000Z"),
  );

const messages = (
  insertedAt = "2026-07-13T00:00:00.000000",
) => ({
  type: "response" as const,
  response: {
    status: 200,
    headers: {},
    body: { messages: [{ id: "message-1", inserted_at: insertedAt }] },
  },
});

const conversations = (items: unknown[]) => ({
  type: "response" as const,
  response: {
    status: 200,
    headers: {},
    body: { conversations: items },
  },
});

describe("Pancake endpoint allow-list", () => {
  it("forbids a customer-message endpoint", () => {
    expect(() =>
      assertPancakeEndpointAllowed(
        "ADD_CONVERSATION_TAG",
        "POST",
        "/pages/page-1/conversations/conversation-1/messages",
      ),
    ).toThrow("PANCAKE_ENDPOINT_FORBIDDEN");
  });
});

describe("PancakeHandoffAdapter", () => {
  it("maps post-sale to Vận Đơn and all other handoffs to Nhân viên", () => {
    expect(desiredHandoffTag(true)).toBe("VAN_DON");
    expect(desiredHandoffTag(false)).toBe("NHAN_VIEN");
  });

  it("extracts the customer name from the exact conversation without another API call", async () => {
    const transport = new FakePancakeHttpTransport([
      messages(),
      conversations([{
        id: "conversation-1",
        tags: [],
        from: { name: "Tên từ from" },
        customers: [{ name: "Tên từ customers" }],
        page_customer: { name: "  Nguyễn Thị Lan  " },
      }]),
    ]);

    const result = await create(transport).observeBlockingTags(
      "page-1",
      "conversation-1",
    );

    expect(result.customerName).toBe("Nguyễn Thị Lan");
    expect(transport.calls).toHaveLength(2);
  });

  it("treats an existing desired tag as success without POST", async () => {
    const transport = new FakePancakeHttpTransport([
      messages(),
      conversations([
        { id: "conversation-1", tags: [{ id: "tag-human" }] },
      ]),
    ]);
    const result = await create(transport).ensureDesiredTag(
      "page-1",
      "conversation-1",
      "NHAN_VIEN",
    );
    expect(result).toEqual({
      result: "APPLIED",
      providerTagId: "tag-human",
      alreadyPresent: true,
    });
    expect(transport.calls).toHaveLength(2);
    expect(transport.calls[0]?.method).toBe("GET");
    expect(transport.calls[0]?.url).toMatch(/\/v1\/pages\/page-1\/conversations\/conversation-1\/messages$/);
    expect(transport.calls[1]?.url).toMatch(/\/v2\/pages\/page-1\/conversations$/);
  });

  it("reads desired state then adds a missing tag", async () => {
    const transport = new FakePancakeHttpTransport([
      messages(),
      conversations([{ id: "conversation-1", tags: [] }]),
      { type: "response", response: { status: 200, headers: {}, body: { success: true } } },
    ]);
    const result = await create(transport).ensureDesiredTag(
      "page-1",
      "conversation-1",
      "VAN_DON",
    );
    expect(result).toEqual({
      result: "APPLIED",
      providerTagId: "tag-order",
      alreadyPresent: false,
    });
    expect(transport.calls.map((call) => call.method)).toEqual(["GET", "GET", "POST"]);
    expect(transport.calls[2]?.url).toMatch(/\/tags$/);
    expect(transport.calls[2]?.body).toBe(
      JSON.stringify({ action: "add", tag_id: "tag-order" }),
    );
    expect(transport.calls[2]?.query).toEqual({ page_access_token: "test-token" });
    expect(transport.calls[2]?.headers.authorization).toBeUndefined();
  });

  it("removes a managed tag but only completes after a later verified read", async () => {
    const firstTransport = new FakePancakeHttpTransport([
      messages(),
      conversations([{ id: "conversation-1", tags: [{ id: "tag-human" }] }]),
      { type: "response", response: { status: 200, headers: {}, body: { success: true } } },
    ]);
    const first = await create(firstTransport).ensureTagAbsent(
      "page-1",
      "conversation-1",
      "NHAN_VIEN",
    );
    expect(first).toEqual({
      result: "RETRYABLE",
      reasonCode: "PANCAKE_TAG_REMOVE_RECONCILE_REQUIRED",
    });
    expect(firstTransport.calls[2]?.body).toBe(
      JSON.stringify({ action: "remove", tag_id: "tag-human" }),
    );

    const reconcileTransport = new FakePancakeHttpTransport([
      messages(),
      conversations([{ id: "conversation-1", tags: [] }]),
    ]);
    const reconciled = await create(reconcileTransport).ensureTagAbsent(
      "page-1",
      "conversation-1",
      "NHAN_VIEN",
    );
    expect(reconciled).toEqual({
      result: "APPLIED",
      providerTagId: "tag-human",
      alreadyAbsent: true,
    });
    expect(reconcileTransport.calls).toHaveLength(2);
  });

  it("fails safely without transport when token or desired tag is missing", async () => {
    const transport = new FakePancakeHttpTransport([]);
    const missingToken: PancakePageConfig = {
      ...page,
      accessToken: "",
    };
    const result = await create(transport, [missingToken]).ensureDesiredTag(
      "page-1",
      "conversation-1",
      "NHAN_VIEN",
    );
    expect(result).toEqual({
      result: "FAILED_PERMANENT",
      reasonCode: "PANCAKE_PAGE_CONFIG_MISSING",
    });
    expect(transport.calls).toHaveLength(0);

    const missingTag: PancakePageConfig = {
      ...page,
      tagIds: { VAN_DON: "tag-order" },
    };
    const result2 = await create(transport, [missingTag]).ensureDesiredTag(
      "page-1",
      "conversation-1",
      "NHAN_VIEN",
    );
    expect(result2).toMatchObject({ result: "FAILED_PERMANENT" });
    expect(transport.calls).toHaveLength(0);
  });

  it("observes all blocking tags and fails open when observation is unverified", async () => {
    const verifiedTransport = new FakePancakeHttpTransport([
      messages(),
      conversations([
        { id: "conversation-1", tags: [{ id: "tag-order" }] },
      ]),
    ]);
    const verified = await create(verifiedTransport).observeBlockingTags(
      "page-1",
      "conversation-1",
    );
    expect(verified).toMatchObject({ verified: true, blockingTag: "VAN_DON" });
    expect(mustBlockBot(verified)).toBe(true);

    const noConfig = await create(new FakePancakeHttpTransport([]), []).observeBlockingTags(
      "unknown-page",
      "conversation-1",
    );
    expect(noConfig.verified).toBe(false);
    expect(mustBlockBot(noConfig)).toBe(false);
  });

  it.each([
    ["tag-human", "NHAN_VIEN"],
    ["tag-order", "VAN_DON"],
    ["tag-closed", "DA_CHOT_DON"],
    ["tag-no-upsale", "KHONG_UP_SALE"],
  ] as const)("maps Pancake tag %s to blocking tag %s", async (tagId, expected) => {
    const result = await create(
      new FakePancakeHttpTransport([
        messages(),
        conversations([{ id: "conversation-1", tags: [{ id: tagId }] }]),
      ]),
    ).observeBlockingTags("page-1", "conversation-1");

    expect(result).toMatchObject({ verified: true, blockingTag: expected });
    expect(mustBlockBot(result)).toBe(true);
  });

  it("keeps tag add retryable after a rate limit", async () => {
    const transport = new FakePancakeHttpTransport([
      messages(),
      conversations([{ id: "conversation-1", tags: [] }]),
      { type: "response", response: { status: 429, headers: {}, body: { error: "slow" } } },
    ]);
    const result = await create(transport).ensureDesiredTag(
      "page-1",
      "conversation-1",
      "NHAN_VIEN",
    );
    expect(result).toEqual({
      result: "RETRYABLE",
      reasonCode: "PANCAKE_TAG_ADD_RETRYABLE",
    });
  });

  it("uses the newest Pancake message time to query the exact conversation window", async () => {
    const transport = new FakePancakeHttpTransport([
      {
        type: "response",
        response: {
          status: 200,
          headers: {},
          body: {
            messages: [
              { id: "newest", inserted_at: "2026-07-13T01:02:03.000000" },
              { id: "older", inserted_at: "2026-07-12T23:59:59.000000" },
            ],
          },
        },
      },
      conversations([
        {
          id: "conversation-1",
          updated_at: "2026-07-13T01:02:01.000000",
          tags: [{ id: "tag-human" }],
        },
        {
          id: "conversation-1",
          updated_at: "2026-07-13T01:02:04.000000",
          tags: [{ id: "tag-order" }],
        },
        {
          id: "another-conversation",
          updated_at: "2026-07-13T01:02:05.000000",
          tags: [{ id: "tag-human" }],
        },
      ]),
    ]);

    const result = await create(transport).observeBlockingTags(
      "page-1",
      "conversation-1",
    );

    const latest = Math.floor(
      Date.parse("2026-07-13T01:02:03.000Z") / 1_000,
    );
    expect(result).toMatchObject({
      verified: true,
      blockingTag: "VAN_DON",
      observedTagIds: ["tag-order"],
    });
    expect(transport.calls).toHaveLength(2);
    expect(transport.calls[0]?.url).toMatch(
      /\/v1\/pages\/page-1\/conversations\/conversation-1\/messages$/,
    );
    expect(transport.calls[1]?.url).toMatch(
      /\/v2\/pages\/page-1\/conversations$/,
    );
    expect(transport.calls[1]?.query).toEqual({
      page_access_token: "test-token",
      since: String(latest - 600),
      until: String(latest + 600),
      page_number: "1",
    });
  });

  it("fails closed when Pancake messages do not provide a usable timestamp", async () => {
    const transport = new FakePancakeHttpTransport([
      {
        type: "response",
        response: {
          status: 200,
          headers: {},
          body: { messages: [{ id: "message-1", inserted_at: null }] },
        },
      },
    ]);

    const result = await create(transport).observeBlockingTags(
      "page-1",
      "conversation-1",
    );

    expect(result).toMatchObject({
      verified: false,
      reasonCode: "PANCAKE_MESSAGE_TIMESTAMP_UNAVAILABLE",
    });
    expect(transport.calls).toHaveLength(1);
  });

  it("refuses a non-Pancake host before exposing a page token", () => {
    expect(
      () =>
        new PancakeAllowListedClient(new FakePancakeHttpTransport([]), {
          baseUrl: "https://attacker.example/api/public_api/v1",
        }),
    ).toThrow("PANCAKE_BASE_URL_FORBIDDEN");
  });
});
