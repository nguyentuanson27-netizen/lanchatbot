import { describe, expect, it, vi } from "vitest";
import { ProductSearchService } from "./search.js";
import { QdrantStableCatalogSearchAdapter } from "./qdrant.js";

const payload = {
  product_id: "SQ149",
  ma_sp: "SQ149",
  aliases: ["SET-SQ149"],
  title: "Set SQ149",
  description: "Lụa mềm với form suông nhẹ, phù hợp đi làm.",
  search_colors: ["DEN"],
  search_materials: ["LUA"],
  search_silhouettes: ["CONG SO"],
  search_occasions: ["DI LAM"],
  image_url: "https://cdn.example/sq149.jpg",
  images_array: ["https://cdn.example/sq149-2.jpg"],
  image_content_sha256: "a".repeat(64),
  image_metadata_review_status: "APPROVED",
  metadata_verified: true,
  catalog_version: "catalog-v2",
  active: true,
};

describe("Qdrant stable catalog adapter", () => {
  it("resolves an exact product code from a real Qdrant scroll response shape", async () => {
    const requests: RequestInit[] = [];
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requests.push(init ?? {});
      return new Response(JSON.stringify({
        result: { points: [{ id: "point-1", payload }] },
      }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const fetchImpl = fetchMock as unknown as typeof fetch;
    const adapter = new QdrantStableCatalogSearchAdapter({
      baseUrl: "https://qdrant.example",
      apiKey: "test-key",
      collection: "lana_multimodal_data_v2",
      expectedDimension: 3,
      embedding: {
        embedText: vi.fn(async () => [0.1, 0.2, 0.3]),
        embedImageUrl: vi.fn(async () => [0.3, 0.2, 0.1]),
      },
      fetchImpl,
    });
    await expect(adapter.findByExactCode("sq149")).resolves.toMatchObject({
      productId: "SQ149",
      canonicalCode: "SQ149",
      descriptionXml: "Lụa mềm với form suông nhẹ, phù hợp đi làm.",
      colors: ["DEN"],
      imageUrls: ["https://cdn.example/sq149.jpg", "https://cdn.example/sq149-2.jpg"],
    });
    await expect(adapter.findByExactCode("sq149")).resolves.toMatchObject({
      images: [{
        sourceContentSha256: "a".repeat(64),
        reviewStatus: "APPROVED",
        metadataVerified: true,
      }],
    });
    const request = JSON.parse(String(requests[0]?.body)) as Record<string, unknown>;
    expect(request).toMatchObject({ with_payload: true, with_vector: false });
  });

  it("queries the named text vector, deduplicates product images and applies search thresholds", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { using?: string };
      if (body.using === "product_text") {
        return new Response(JSON.stringify({ result: { points: [
          { id: "point-1", score: 0.91, payload },
          { id: "point-2", score: 0.89, payload: { ...payload, image_url: "https://cdn.example/other.jpg" } },
          { id: "point-3", score: 0.71, payload: { ...payload, product_id: "SD396", ma_sp: "SD396", title: "Set SD396" } },
        ] } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ result: { points: [] } }), { status: 200 });
    });
    const adapter = new QdrantStableCatalogSearchAdapter({
      baseUrl: "https://qdrant.example",
      apiKey: "test-key",
      collection: "lana_multimodal_data_v2",
      expectedDimension: 3,
      embedding: {
        embedText: vi.fn(async () => [0.1, 0.2, 0.3]),
        embedImageUrl: vi.fn(async () => [0.3, 0.2, 0.1]),
      },
      fetchImpl,
    });
    const service = new ProductSearchService(adapter, {
      textMinScore: 0.75,
      imageMinScore: 0.8,
      minTopGap: 0.05,
      maxCandidates: 3,
    });
    await expect(service.searchText("set cong so lua den")).resolves.toMatchObject({
      status: "MATCHED",
      matchKind: "SEMANTIC",
      product: { productId: "SQ149" },
      score: 0.91,
    });
  });

  it("rejects a vector with the wrong dimension before querying Qdrant", async () => {
    const fetchImpl = vi.fn();
    const adapter = new QdrantStableCatalogSearchAdapter({
      baseUrl: "https://qdrant.example",
      apiKey: "test-key",
      collection: "lana_multimodal_data_v2",
      expectedDimension: 3,
      embedding: {
        embedText: vi.fn(async () => [0.1]),
        embedImageUrl: vi.fn(async () => [0.1]),
      },
      fetchImpl,
    });
    await expect(adapter.searchStableText("query", 3)).rejects.toThrow("EMBEDDING_VECTOR_INVALID");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("embeds up to three images concurrently and sends one Qdrant batch query", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { searches?: unknown[] };
      expect(body.searches).toHaveLength(2);
      return new Response(JSON.stringify({ result: [
        { points: [{ id: "one", score: 0.91, payload }] },
        { points: [{ id: "two", score: 0.9, payload: { ...payload, product_id: "CB182", ma_sp: "CB182" } }] },
      ] }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const adapter = new QdrantStableCatalogSearchAdapter({
      baseUrl: "https://qdrant.example",
      apiKey: "test-key",
      collection: "lana_multimodal_data_v2",
      expectedDimension: 3,
      embedding: {
        embedText: vi.fn(async () => [0.1, 0.2, 0.3]),
        embedImageUrl: vi.fn(async (url) => url.endsWith("1.jpg")
          ? [0.1, 0.2, 0.3]
          : [0.3, 0.2, 0.1]),
      },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(adapter.searchStableImages([
      "https://cdn.example/1.jpg",
      "https://cdn.example/2.jpg",
    ], 3, 3)).resolves.toMatchObject([
      { errorCode: null, candidates: [{ document: { productId: "SQ149" } }] },
      { errorCode: null, candidates: [{ document: { productId: "CB182" } }] },
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
