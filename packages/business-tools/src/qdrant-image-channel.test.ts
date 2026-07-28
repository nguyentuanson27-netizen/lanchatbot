import { describe, expect, it, vi } from "vitest";
import { QdrantStableCatalogSearchAdapter } from "./qdrant.js";

describe("Qdrant image vector channels", () => {
  it("queries image_cutout explicitly for cutout bytes", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ result: { points: [] } }), { status: 200 }),
    );
    const adapter = new QdrantStableCatalogSearchAdapter({
      baseUrl: "https://qdrant.example.com",
      apiKey: "test-key",
      collection: "catalog_test",
      expectedDimension: 3,
      fetchImpl,
      embedding: {
        embedText: vi.fn(async () => [0, 0, 0]),
        embedImageUrl: vi.fn(async () => [0, 0, 0]),
        embedImageBytes: vi.fn(async () => [0.1, 0.2, 0.3]),
      },
    });

    await adapter.searchStableImageBytesByChannel(
      new Uint8Array([1, 2, 3]),
      "image_cutout",
      3,
    );

    const [, request] = fetchImpl.mock.calls[0] ?? [];
    const body = JSON.parse(String(request?.body)) as {
      using: string;
      query: readonly number[];
    };
    expect(body.using).toBe("image_cutout");
    expect(body.query).toEqual([0.1, 0.2, 0.3]);
  });
});
