import { describe, expect, it, vi } from "vitest";
import {
  IMAGE_RECOGNITION_VECTOR_SIZE,
  ImageRecognitionSearchError,
  QdrantImageRecognitionAdapter,
} from "./image-recognition-qdrant.js";

function embedding(fill = 0.1): number[] {
  return Array.from({ length: IMAGE_RECOGNITION_VECTOR_SIZE }, () => fill);
}

function payload(productId: string, overrides: Record<string, unknown> = {}) {
  return {
    product_id: productId,
    ma_sp: productId,
    brand: "lanadesign",
    title: `Đầm ${productId}`,
    image_url: `https://lanadesign.vn/images/${productId.toLowerCase()}-detail-03.jpg`,
    image_role: "ADDITIONAL",
    image_type: "DETAIL",
    image_angle: "CLOSEUP",
    image_detail_type: "EMBROIDERY",
    image_content_sha256: "a".repeat(64),
    active: true,
    source_hash: "b".repeat(64),
    embedding_pipeline_version: "ge2-3072-pre1024-rembg-u2netp-v1",
    ...overrides,
  };
}

function group(productId: string, score: number, overrides: Record<string, unknown> = {}) {
  return {
    id: productId,
    hits: [{
      id: `point-${productId.toLowerCase()}`,
      score,
      payload: payload(productId, overrides),
    }],
  };
}

interface Recorded {
  readonly url: string;
  readonly init: RequestInit;
}

function adapter(
  responder: (recorded: Recorded) => Response,
): { instance: QdrantImageRecognitionAdapter; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const fetchImpl = vi.fn(async (input: unknown, init?: RequestInit) => {
    const recorded = { url: String(input), init: init ?? {} };
    calls.push(recorded);
    return responder(recorded);
  });
  return {
    calls,
    instance: new QdrantImageRecognitionAdapter({
      baseUrl: "https://qdrant.internal.example",
      apiKey: "test-key",
      collection: "lana_recognition_v2",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }),
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("grouped exact recognition search", () => {
  it("issues the locked server-side grouped exact query", async () => {
    const { instance, calls } = adapter(() => json({ result: { groups: [] } }));
    await instance.searchCutoutGroups(embedding(), 5, new AbortController().signal);
    expect(calls[0]?.url).toBe(
      "https://qdrant.internal.example/collections/lana_recognition_v2/points/query/groups",
    );
    const body = JSON.parse(String(calls[0]?.init.body)) as Record<string, unknown>;
    expect(body.using).toBe("image_cutout");
    expect(body.group_by).toBe("product_id");
    expect(body.group_size).toBe(1);
    expect(body.limit).toBe(5);
    expect(body.params).toEqual({ exact: true });
    expect(body.filter).toEqual({ must: [{ key: "active", match: { value: true } }] });
    expect(body.with_payload).toBe(true);
    expect(body.with_vector).toBe(false);
    expect(body.query).toHaveLength(IMAGE_RECOGNITION_VECTOR_SIZE);
  });

  it("returns up to five unique SKU groups in server score order", async () => {
    const { instance } = adapter(() => json({
      result: {
        groups: [
          group("SD375", 0.95),
          group("CB182", 0.91),
          group("SV921", 0.88),
          group("DM044", 0.84),
          group("AO113", 0.80),
        ],
      },
    }));
    const hits = await instance.searchCutoutGroups(
      embedding(),
      5,
      new AbortController().signal,
    );
    expect(hits.map((hit) => hit.productId)).toEqual([
      "SD375", "CB182", "SV921", "DM044", "AO113",
    ]);
    expect(hits.map((hit) => hit.score)).toEqual([0.95, 0.91, 0.88, 0.84, 0.80]);
    expect(new Set(hits.map((hit) => hit.productId)).size).toBe(5);
  });

  it("preserves the exact winning point evidence for each group", async () => {
    const { instance } = adapter(() => json({
      result: { groups: [group("SD375", 0.95)] },
    }));
    const [hit] = await instance.searchCutoutGroups(
      embedding(),
      5,
      new AbortController().signal,
    );
    expect(hit?.pointId).toBe("point-sd375");
    expect(hit?.imageUrl).toBe("https://lanadesign.vn/images/sd375-detail-03.jpg");
    expect(hit?.imageRole).toBe("ADDITIONAL");
    expect(hit?.imageType).toBe("DETAIL");
    expect(hit?.imageAngle).toBe("CLOSEUP");
    expect(hit?.imageDetailType).toBe("EMBROIDERY");
    expect(hit?.imageContentSha256).toBe("a".repeat(64));
    // The document is derived from the same winning payload; it never replaces it.
    expect(hit?.product.productId).toBe("SD375");
  });

  it("keeps only the winning point when a SKU has several image points", async () => {
    const { instance } = adapter(() => json({
      result: {
        groups: [{
          id: "SD375",
          hits: [
            { id: "point-detail", score: 0.95, payload: payload("SD375") },
            { id: "point-front", score: 0.71, payload: payload("SD375") },
          ],
        }],
      },
    }));
    const hits = await instance.searchCutoutGroups(
      embedding(),
      5,
      new AbortController().signal,
    );
    expect(hits).toHaveLength(1);
    expect(hits[0]?.pointId).toBe("point-detail");
    expect(hits[0]?.score).toBe(0.95);
  });

  it("preserves finite cosine scores exactly, including negatives", async () => {
    const { instance } = adapter(() => json({
      result: { groups: [group("SD375", -0.42), group("CB182", 1.0)] },
    }));
    const hits = await instance.searchCutoutGroups(
      embedding(),
      5,
      new AbortController().signal,
    );
    expect(hits[0]?.score).toBe(-0.42);
    expect(hits[1]?.score).toBe(1.0);
  });

  it("normalizes SKU identity consistently", async () => {
    const { instance } = adapter(() => json({
      result: {
        groups: [{
          id: " sd375 ",
          hits: [{
            id: "point-sd375",
            score: 0.9,
            payload: payload(" sd375 "),
          }],
        }],
      },
    }));
    const hits = await instance.searchCutoutGroups(
      embedding(),
      5,
      new AbortController().signal,
    );
    expect(hits[0]?.productId).toBe("SD375");
    expect(hits[0]?.product.productId).toBe("SD375");
  });

  it("fails explicitly on a group with a missing, empty or unusable key", async () => {
    // Without a group key there is nothing to validate the payload against, so
    // trusting the payload alone would accept a malformed grouped response.
    for (const id of [undefined, null, "", "   ", {}, []]) {
      const { instance } = adapter(() => json({
        result: {
          groups: [{
            ...(id === undefined ? {} : { id }),
            hits: [{ id: "point-sd375", score: 0.9, payload: payload("SD375") }],
          }],
        },
      }));
      await expect(instance.searchCutoutGroups(
        embedding(),
        5,
        new AbortController().signal,
      )).rejects.toThrow("IMAGE_RECOGNITION_GROUP_IDENTITY_INVALID");
    }
  });

  it("fails explicitly on a group whose key disagrees with its winning hit", async () => {
    const { instance } = adapter(() => json({
      result: {
        groups: [{
          id: "CB182",
          hits: [{ id: "point-sd375", score: 0.9, payload: payload("SD375") }],
        }],
      },
    }));
    await expect(instance.searchCutoutGroups(
      embedding(),
      5,
      new AbortController().signal,
    )).rejects.toThrow("IMAGE_RECOGNITION_GROUP_IDENTITY_INVALID");
  });

  it("fails explicitly on malformed groups instead of dropping them", async () => {
    const cases: [unknown, string][] = [
      [{ result: { groups: [{ id: "SD375", hits: [] }] } }, "IMAGE_RECOGNITION_GROUP_EMPTY"],
      [
        { result: { groups: [{ id: "SD375", hits: [{ score: 0.9, payload: payload("SD375") }] }] } },
        "IMAGE_RECOGNITION_POINT_ID_INVALID",
      ],
      [
        { result: { groups: [{ id: "SD375", hits: [{ id: "p", score: "high", payload: payload("SD375") }] }] } },
        "IMAGE_RECOGNITION_SCORE_INVALID",
      ],
      [
        { result: { groups: [{ id: "SD375", hits: [{ id: "p", score: Number.NaN, payload: payload("SD375") }] }] } },
        "IMAGE_RECOGNITION_SCORE_INVALID",
      ],
      [
        { result: { groups: [{ id: "SD375", hits: [{ id: "p", score: 0.9, payload: {} }] }] } },
        "IMAGE_RECOGNITION_PRODUCT_ID_INVALID",
      ],
      [
        {
          result: {
            groups: [{
              id: "SD375",
              hits: [{ id: "p", score: 0.9, payload: payload("SD375", { image_url: "http://lanadesign.vn/a.jpg" }) }],
            }],
          },
        },
        "IMAGE_RECOGNITION_EVIDENCE_INVALID",
      ],
      [{ result: {} }, "IMAGE_RECOGNITION_GROUPS_INVALID"],
    ];
    for (const [body, code] of cases) {
      const { instance } = adapter(() => json(body));
      await expect(instance.searchCutoutGroups(
        embedding(),
        5,
        new AbortController().signal,
      )).rejects.toThrow(code);
    }
  });

  it("rejects a vector that is not exactly 3072 finite numbers", async () => {
    const { instance, calls } = adapter(() => json({ result: { groups: [] } }));
    const signal = new AbortController().signal;
    await expect(instance.searchCutoutGroups(Array.from({ length: 1_408 }, () => 0.1), 5, signal))
      .rejects.toThrow("IMAGE_RECOGNITION_VECTOR_INVALID");
    const withNaN = embedding();
    withNaN[9] = Number.NaN;
    await expect(instance.searchCutoutGroups(withNaN, 5, signal))
      .rejects.toThrow("IMAGE_RECOGNITION_VECTOR_INVALID");
    expect(calls).toHaveLength(0);
  });

  it("classifies transport failures", async () => {
    for (const [status, code, retryable] of [
      [503, "IMAGE_RECOGNITION_QDRANT_RETRYABLE", true],
      [429, "IMAGE_RECOGNITION_QDRANT_RETRYABLE", true],
      [400, "IMAGE_RECOGNITION_QDRANT_FAILED", false],
    ] as const) {
      const { instance } = adapter(() => json({}, status));
      await expect(instance.searchCutoutGroups(
        embedding(),
        5,
        new AbortController().signal,
      )).rejects.toMatchObject({ code, retryable });
    }
  });

  it("refuses to start once the caller's budget is already spent", async () => {
    const controller = new AbortController();
    controller.abort();
    const { instance, calls } = adapter(() => json({ result: { groups: [] } }));
    await expect(instance.searchCutoutGroups(embedding(), 5, controller.signal))
      .rejects.toThrow("IMAGE_RECOGNITION_QDRANT_CANCELLED");
    expect(calls).toHaveLength(0);
  });

  it("aborts the in-flight fetch when the parent signal aborts", async () => {
    const controller = new AbortController();
    let started: () => void = () => undefined;
    const inFlight = new Promise<void>((resolve) => {
      started = resolve;
    });
    let observed: AbortSignal | undefined;
    const fetchImpl = vi.fn((_input: unknown, init?: RequestInit) => {
      observed = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
        started();
      });
    });
    const instance = new QdrantImageRecognitionAdapter({
      baseUrl: "https://qdrant.internal.example",
      apiKey: "test-key",
      collection: "lana_recognition_v2",
      // A long adapter-local timeout must not outlive the parent's budget.
      timeoutMs: 60_000,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const pending = instance.searchCutoutGroups(embedding(), 5, controller.signal);
    await inFlight;
    controller.abort();
    await expect(pending).rejects.toThrow("IMAGE_RECOGNITION_QDRANT_CANCELLED");
    expect(observed?.aborted).toBe(true);
  });
});

describe("recognition publisher operations", () => {
  it("reads only the V2 freshness fields from the target point", async () => {
    const { instance, calls } = adapter(() => json({
      result: [{
        id: "point-sd375",
        payload: {
          source_hash: "b".repeat(64),
          embedding_pipeline_version: "ge2-3072-pre1024-rembg-u2netp-v1",
          published_hash: "legacy-should-be-ignored",
        },
      }],
    }));
    const state = await instance.getPoint("point-sd375", new AbortController().signal);
    expect(calls[0]?.url).toContain("/collections/lana_recognition_v2/points");
    expect(state?.sourceHash).toBe("b".repeat(64));
    expect(state?.embeddingPipelineVersion).toBe("ge2-3072-pre1024-rembg-u2netp-v1");
  });

  it("returns null for a missing target point", async () => {
    const { instance } = adapter(() => json({ result: [] }));
    expect(await instance.getPoint("point-missing", new AbortController().signal))
      .toBeNull();
  });

  it("upserts under the named image_cutout vector", async () => {
    const { instance, calls } = adapter(() => json({ result: {} }));
    await instance.upsertPoint(
      { id: "point-sd375", vector: embedding(0.25), payload: { product_id: "SD375" } },
      new AbortController().signal,
    );
    expect(calls[0]?.init.method).toBe("PUT");
    const body = JSON.parse(String(calls[0]?.init.body)) as {
      points: { vector: Record<string, number[]> }[];
    };
    expect(Object.keys(body.points[0]?.vector ?? {})).toEqual(["image_cutout"]);
    expect(body.points[0]?.vector.image_cutout).toHaveLength(3_072);
  });

  it("refuses to upsert a wrong-dimension vector", async () => {
    const { instance, calls } = adapter(() => json({ result: {} }));
    await expect(instance.upsertPoint(
      { id: "p", vector: Array.from({ length: 1_408 }, () => 0.1), payload: {} },
      new AbortController().signal,
    )).rejects.toThrow("IMAGE_RECOGNITION_VECTOR_INVALID");
    expect(calls).toHaveLength(0);
  });

  it("deletes a single point by id", async () => {
    const { instance, calls } = adapter(() => json({ result: {} }));
    await instance.deletePoint("point-sd375", new AbortController().signal);
    expect(calls[0]?.url).toContain("/points/delete?wait=true");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ points: ["point-sd375"] });
  });

  it("validates the collection vector name, dimension and distance", async () => {
    const valid = adapter(() => json({
      result: { config: { params: { vectors: { image_cutout: { size: 3_072, distance: "Cosine" } } } } },
    }));
    await expect(valid.instance.validateCollectionContract(new AbortController().signal))
      .resolves.toBeUndefined();

    const wrongSize = adapter(() => json({
      result: { config: { params: { vectors: { image_cutout: { size: 1_408, distance: "Cosine" } } } } },
    }));
    await expect(wrongSize.instance.validateCollectionContract(new AbortController().signal))
      .rejects.toThrow("IMAGE_RECOGNITION_COLLECTION_DIMENSION_INVALID");

    const wrongName = adapter(() => json({
      result: { config: { params: { vectors: { image_raw: { size: 3_072, distance: "Cosine" } } } } },
    }));
    await expect(wrongName.instance.validateCollectionContract(new AbortController().signal))
      .rejects.toThrow("IMAGE_RECOGNITION_COLLECTION_VECTOR_MISSING");

    const wrongDistance = adapter(() => json({
      result: { config: { params: { vectors: { image_cutout: { size: 3_072, distance: "Dot" } } } } },
    }));
    await expect(wrongDistance.instance.validateCollectionContract(new AbortController().signal))
      .rejects.toThrow("IMAGE_RECOGNITION_COLLECTION_DISTANCE_INVALID");
  });

  it("requires HTTPS, an API key and a valid collection name", () => {
    expect(() => new QdrantImageRecognitionAdapter({
      baseUrl: "http://qdrant.internal.example",
      apiKey: "k",
      collection: "lana_recognition_v2",
    })).toThrow("QDRANT_HTTPS_REQUIRED");
    expect(() => new QdrantImageRecognitionAdapter({
      baseUrl: "https://qdrant.internal.example",
      apiKey: " ",
      collection: "lana_recognition_v2",
    })).toThrow("QDRANT_API_KEY_REQUIRED");
    expect(() => new QdrantImageRecognitionAdapter({
      baseUrl: "https://qdrant.internal.example",
      apiKey: "k",
      collection: "bad name",
    })).toThrow("QDRANT_COLLECTION_INVALID");
  });

  it("exposes a typed error class", () => {
    expect(new ImageRecognitionSearchError("X", true)).toBeInstanceOf(Error);
  });
});
