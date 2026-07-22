import { describe, expect, it } from "vitest";
import { FakePancakeHttpTransport } from "@lana/pancake-handoff";
import { PancakeExactTagReader } from "./pancake-control.js";

describe("PancakeExactTagReader", () => {
  it("reads messages v1 then conversations v2 +/-600s and selects exact conversation", async () => {
    const latest = Date.parse("2026-07-18T05:00:00.000Z") / 1_000;
    const transport = new FakePancakeHttpTransport([
      {
        type: "response",
        response: {
          status: 200,
          headers: {},
          body: { messages: [{ inserted_at: "2026-07-18T05:00:00.000000" }] },
        },
      },
      {
        type: "response",
        response: {
          status: 200,
          headers: {},
          body: {
            conversations: [
              { id: "other", updated_at: "2026-07-18T05:00:02.000000", tags: [] },
              {
                id: "page-1_sender-1",
                updated_at: "2026-07-18T05:00:01.000000",
                tags: [{ id: "tag-order" }],
              },
            ],
          },
        },
      },
    ]);
    const reader = new PancakeExactTagReader(transport, [{
      pageId: "page-1",
      accessToken: "secret-token",
      tagIds: {
        NHAN_VIEN: "tag-human",
        VAN_DON: "tag-order",
        DA_CHOT_DON: "tag-closed",
        KHONG_UP_SALE: "tag-no-upsale",
      },
    }]);

    const result = await reader.observe("page-1", "page-1_sender-1");

    expect(result).toMatchObject({ verified: true, blockingTag: "VAN_DON" });
    expect(transport.calls[0]?.url).toMatch(/\/v1\/pages\/page-1\/conversations\/page-1_sender-1\/messages$/);
    expect(transport.calls[1]?.url).toMatch(/\/v2\/pages\/page-1\/conversations$/);
    expect(transport.calls[1]?.query).toMatchObject({
      since: String(latest - 600),
      until: String(latest + 600),
      page_number: "1",
    });
  });
});
