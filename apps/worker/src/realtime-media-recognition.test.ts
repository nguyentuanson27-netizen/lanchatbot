import { describe, expect, it, vi } from "vitest";
import type {
  ImageRecognitionHit,
  ImageRecognitionSearchPort,
  StableProductDocument,
} from "@lana/business-tools";
import {
  RealtimeMediaRecognitionService,
  type MediaRerankResult,
  type RealtimeMediaRecognitionOptions,
  type RealtimeMediaRerankerPort,
  type RealtimeMediaTelemetry,
} from "./realtime-media-recognition.js";
import type { RecognitionImageEmbeddingPort } from "./gemini-embedding-2-client.js";
import type { RecognitionImagePreparationPort } from "./media-recognition-v2-image-pipeline.js";

const SHORTLIST = ["SD375", "CB182", "SV921", "DM044", "AO113"] as const;

function product(productId: string): StableProductDocument {
  const imageUrl = `https://lanadesign.vn/images/${productId.toLowerCase()}-detail-03.jpg`;
  return {
    productId,
    parentProductId: productId,
    canonicalCode: productId,
    aliases: [],
    title: `Sản phẩm ${productId}`,
    descriptionXml: "",
    colors: [],
    materials: [],
    silhouettes: [],
    occasions: [],
    imageUrls: [imageUrl],
    images: [],
    catalogVersion: "recognition-v2",
    observedAt: "2026-09-07T00:00:00.000Z",
  };
}

function hit(productId: string, score: number): ImageRecognitionHit {
  return {
    pointId: `point-${productId.toLowerCase()}-detail-03`,
    productId,
    score,
    imageUrl: `https://lanadesign.vn/images/${productId.toLowerCase()}-detail-03.jpg`,
    imageRole: "ADDITIONAL",
    imageType: "DETAIL",
    imageAngle: "CLOSEUP",
    imageDetailType: "EMBROIDERY",
    imageContentSha256: "a".repeat(64),
    product: product(productId),
  };
}

const SCORES = [0.95, 0.92, 0.89, 0.86, 0.83] as const;

function shortlist(count: number): ImageRecognitionHit[] {
  return SHORTLIST.slice(0, count).map((id, index) => hit(id, SCORES[index] as number));
}

interface Harness {
  readonly service: RealtimeMediaRecognitionService;
  readonly search: ImageRecognitionSearchPort & { searchCutoutGroups: ReturnType<typeof vi.fn> };
  readonly images: RecognitionImagePreparationPort & {
    prepareFromUrl: ReturnType<typeof vi.fn>;
    createCutoutPng: ReturnType<typeof vi.fn>;
  };
  readonly embeddings: { embedCutout: ReturnType<typeof vi.fn> };
  readonly reranker: { rerankMediaCandidates: ReturnType<typeof vi.fn> };
  readonly telemetry: RealtimeMediaTelemetry[];
}

function harness(input: {
  hits?: ImageRecognitionHit[];
  selected?: string;
  searchError?: string;
  prepareError?: string;
  prepareErrorForUrl?: string;
  cutoutError?: string;
  embedError?: string;
  rerankError?: string;
  options?: Partial<RealtimeMediaRecognitionOptions>;
} = {}): Harness {
  const telemetry: RealtimeMediaTelemetry[] = [];
  const search = {
    searchCutoutGroups: vi.fn(async () => {
      if (input.searchError) throw new Error(input.searchError);
      return input.hits ?? [];
    }),
  };
  const images = {
    prepareFromUrl: vi.fn(async (url: string) => {
      if (input.prepareErrorForUrl && url === input.prepareErrorForUrl) {
        throw new Error("MEDIA_IMAGE_DOWNLOAD_FAILED");
      }
      if (input.prepareError) throw new Error(input.prepareError);
      return Buffer.from(`canonical:${url}`);
    }),
    prepareFromBytes: vi.fn(async () => Buffer.from("canonical")),
    createCutoutPng: vi.fn(async () => {
      if (input.cutoutError) throw new Error(input.cutoutError);
      return Buffer.from("cutout");
    }),
  };
  const embeddings = {
    embedCutout: vi.fn(async () => {
      if (input.embedError) throw new Error(input.embedError);
      return Array.from({ length: 3_072 }, () => 0.1);
    }),
  };
  const reranker = {
    rerankMediaCandidates: vi.fn(async (): Promise<MediaRerankResult> => {
      if (input.rerankError) throw new Error(input.rerankError);
      return {
        selected: input.selected ?? "ambiguous",
        modelVersion: "gemini-3.5-flash-lite",
        latencyMs: 4,
        tokenUsage: { total: 100 },
      };
    }),
  };
  return {
    search,
    images,
    embeddings,
    reranker,
    telemetry,
    service: new RealtimeMediaRecognitionService(
      search as ImageRecognitionSearchPort,
      images as RecognitionImagePreparationPort,
      embeddings as RecognitionImageEmbeddingPort,
      reranker as RealtimeMediaRerankerPort,
      {
        pipelineVersion: "recognition-v2-cutout-only",
        embeddingPipelineVersion: "ge2-3072-pre1024-rembg-u2netp-v1",
        rerankerModel: "gemini-3.5-flash-lite",
        rerankerPromptVersion: "media-rerank-v2-cutout-only",
        logTelemetry: (value) => telemetry.push(value),
        ...input.options,
      },
    ),
  };
}

const CUSTOMER_IMAGE = "https://lanadesign.vn/customer/photo.jpg";

describe("V2 realtime recognition pipeline", () => {
  it("runs exactly one cutout embedding and one grouped exact search", async () => {
    const test = harness({ hits: shortlist(2), selected: "SD375" });
    await test.service.recognize(CUSTOMER_IMAGE);
    expect(test.images.createCutoutPng).toHaveBeenCalledTimes(1);
    expect(test.embeddings.embedCutout).toHaveBeenCalledTimes(1);
    expect(test.search.searchCutoutGroups).toHaveBeenCalledTimes(1);
    const [embedding, limit] = test.search.searchCutoutGroups.mock.calls[0] ?? [];
    expect(embedding).toHaveLength(3_072);
    expect(limit).toBe(5);
  });

  it("returns NOT_FOUND when the grouped search yields no SKU group", async () => {
    const test = harness({ hits: [] });
    const result = await test.service.recognize(CUSTOMER_IMAGE);
    expect(result.status).toBe("NOT_FOUND");
    expect(result.reasonCode).toBe("NO_CANDIDATES");
    expect(test.reranker.rerankMediaCandidates).not.toHaveBeenCalled();
  });

  it.each([1, 2, 3, 4, 5])(
    "reranks every non-empty shortlist of %i candidates",
    async (count) => {
      const test = harness({ hits: shortlist(count), selected: "SD375" });
      await test.service.recognize(CUSTOMER_IMAGE);
      expect(test.reranker.rerankMediaCandidates).toHaveBeenCalledTimes(1);
      const [request] = test.reranker.rerankMediaCandidates.mock.calls[0] ?? [];
      expect(request.candidates).toHaveLength(count);
    },
  );

  it.each([1, 2, 3, 4, 5])("lets retrieval rank %i become the final match", async (rank) => {
    const hits = shortlist(5);
    const winner = hits[rank - 1] as ImageRecognitionHit;
    const test = harness({ hits, selected: winner.productId });
    const result = await test.service.recognize(CUSTOMER_IMAGE);
    expect(result.status).toBe("MATCHED");
    if (result.status !== "MATCHED") return;
    expect(result.product.productId).toBe(winner.productId);
    // The score belongs to the selected SKU, never to the retrieval leader.
    expect(result.score).toBe(winner.score);
    expect(result.gap).toBeNull();
    expect(result.decisionSource).toBe("GEMINI_RERANK");
    expect(result.telemetry.rerankerSelectedOriginalRank).toBe(rank);
  });

  it("feeds the reranker the exact winning point image, not a PRIMARY substitute", async () => {
    const hits = shortlist(3);
    const test = harness({ hits, selected: "CB182" });
    const result = await test.service.recognize(CUSTOMER_IMAGE);
    const preparedUrls = test.images.prepareFromUrl.mock.calls.map(([url]) => url);
    expect(preparedUrls[0]).toBe(CUSTOMER_IMAGE);
    expect(preparedUrls.slice(1)).toEqual(hits.map((value) => value.imageUrl));
    for (const url of preparedUrls.slice(1)) {
      expect(String(url)).toContain("-detail-03.jpg");
    }
    // RemBG runs once, for the customer image only; evidence is non-cutout.
    expect(test.images.createCutoutPng).toHaveBeenCalledTimes(1);
    if (result.status !== "MATCHED") throw new Error("expected MATCHED");
    expect(result.telemetry.selectedEvidencePointId).toBe("point-cb182-detail-03");
  });

  it("preserves the winning point evidence on every candidate", async () => {
    const test = harness({ hits: shortlist(2), selected: "SD375" });
    const result = await test.service.recognize(CUSTOMER_IMAGE);
    expect(result.candidates[0]?.evidence).toEqual({
      pointId: "point-sd375-detail-03",
      imageUrl: "https://lanadesign.vn/images/sd375-detail-03.jpg",
      imageRole: "ADDITIONAL",
      imageType: "DETAIL",
      imageAngle: "CLOSEUP",
      imageDetailType: "EMBROIDERY",
      imageContentSha256: "a".repeat(64),
    });
    expect(result.candidates.map((value) => value.retrievalRank)).toEqual([1, 2]);
  });

  it("maps reranker none to NOT_FOUND", async () => {
    const result = await harness({ hits: shortlist(3), selected: "none" })
      .service.recognize(CUSTOMER_IMAGE);
    expect(result.status).toBe("NOT_FOUND");
    expect(result.reasonCode).toBe("GEMINI_NONE");
  });

  it("maps reranker ambiguous to AMBIGUOUS with the shortlist retained", async () => {
    const result = await harness({ hits: shortlist(3), selected: "ambiguous" })
      .service.recognize(CUSTOMER_IMAGE);
    expect(result.status).toBe("AMBIGUOUS");
    expect(result.reasonCode).toBe("GEMINI_AMBIGUOUS");
    expect(result.candidates).toHaveLength(3);
  });

  it("rejects a selection outside the supplied candidate set", async () => {
    const result = await harness({ hits: shortlist(3), selected: "XX999" })
      .service.recognize(CUSTOMER_IMAGE);
    expect(result.status).toBe("ERROR");
    expect(result.reasonCode).toBe("GEMINI_SELECTION_INVALID");
  });

  it("never accepts a high retrieval score without reranking", async () => {
    const test = harness({ hits: [hit("SD375", 0.999)], selected: "ambiguous" });
    const result = await test.service.recognize(CUSTOMER_IMAGE);
    expect(test.reranker.rerankMediaCandidates).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("AMBIGUOUS");
  });

  it("never accepts a large retrieval gap without reranking", async () => {
    const test = harness({
      hits: [hit("SD375", 0.98), hit("CB182", 0.30)],
      selected: "none",
    });
    const result = await test.service.recognize(CUSTOMER_IMAGE);
    expect(test.reranker.rerankMediaCandidates).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("NOT_FOUND");
  });

  it("fails the whole request when any candidate evidence cannot be prepared", async () => {
    const hits = shortlist(3);
    const test = harness({
      hits,
      selected: "SD375",
      prepareErrorForUrl: hits[2]!.imageUrl,
    });
    const result = await test.service.recognize(CUSTOMER_IMAGE);
    expect(result.status).toBe("ERROR");
    expect(result.reasonCode).toBe("MEDIA_IMAGE_DOWNLOAD_FAILED");
    // No dropped candidate, no backfill, no reduced-set rerank.
    expect(test.reranker.rerankMediaCandidates).not.toHaveBeenCalled();
  });

  it("maps download, cutout, embedding and Qdrant failures to ERROR", async () => {
    for (const [input, code] of [
      [{ prepareError: "MEDIA_IMAGE_HOST_NOT_ALLOWED" }, "MEDIA_IMAGE_HOST_NOT_ALLOWED"],
      [{ hits: shortlist(1), cutoutError: "REMBG_FAILED" }, "REMBG_FAILED"],
      [
        { hits: shortlist(1), embedError: "GEMINI_EMBEDDING_DIMENSION_INVALID" },
        "GEMINI_EMBEDDING_DIMENSION_INVALID",
      ],
      [
        { searchError: "IMAGE_RECOGNITION_QDRANT_RETRYABLE" },
        "IMAGE_RECOGNITION_QDRANT_RETRYABLE",
      ],
      [
        { hits: shortlist(2), rerankError: "VERTEX_MEDIA_TIMEOUT" },
        "VERTEX_MEDIA_TIMEOUT",
      ],
    ] as const) {
      const result = await harness(input).service.recognize(CUSTOMER_IMAGE);
      expect(result.status).toBe("ERROR");
      expect(result.reasonCode).toBe(code);
    }
  });

  it("never forces the retrieval leader on failure", async () => {
    const result = await harness({
      hits: shortlist(3),
      rerankError: "VERTEX_MEDIA_RETRYABLE",
    }).service.recognize(CUSTOMER_IMAGE);
    expect(result.status).toBe("ERROR");
    expect(result).not.toHaveProperty("product");
  });

  it("propagates one shared cancellation budget through every stage", async () => {
    const test = harness({ hits: shortlist(2), selected: "SD375" });
    await test.service.recognize(CUSTOMER_IMAGE);
    const signals = [
      test.images.prepareFromUrl.mock.calls[0]?.[1],
      test.images.createCutoutPng.mock.calls[0]?.[1],
      test.embeddings.embedCutout.mock.calls[0]?.[1],
      test.search.searchCutoutGroups.mock.calls[0]?.[2],
      test.images.prepareFromUrl.mock.calls[1]?.[1],
    ];
    expect(signals.every((value) => value instanceof AbortSignal)).toBe(true);
    expect(new Set(signals).size).toBe(1);
    // The budget is released once the request settles.
    expect((signals[0] as AbortSignal).aborted).toBe(true);
  });
});

describe("V2 realtime recognition telemetry", () => {
  it("emits only V2 fields, with no cache, RAW or fusion signal", async () => {
    const test = harness({ hits: shortlist(3), selected: "CB182" });
    const result = await test.service.recognize(CUSTOMER_IMAGE);
    const telemetry = test.telemetry[0] as RealtimeMediaTelemetry;
    expect(telemetry.embeddingModel).toBe("gemini-embedding-2");
    expect(telemetry.embeddingDimension).toBe(3_072);
    expect(telemetry.preprocessMaxDimension).toBe(1_024);
    expect(telemetry.embeddingPipelineVersion).toBe("ge2-3072-pre1024-rembg-u2netp-v1");
    expect(telemetry.candidates).toEqual([
      { productId: "SD375", rank: 1, score: 0.95, pointId: "point-sd375-detail-03" },
      { productId: "CB182", rank: 2, score: 0.92, pointId: "point-cb182-detail-03" },
      { productId: "SV921", rank: 3, score: 0.89, pointId: "point-sv921-detail-03" },
    ]);
    expect(telemetry.rerankerDecision).toBe("CB182");
    expect(telemetry.rerankerSelectedOriginalRank).toBe(2);
    expect(telemetry.finalDecision).toBe("MATCHED");
    expect(telemetry.finalProductId).toBe("CB182");
    expect(telemetry.finalRetrievalScore).toBe(0.92);
    expect(telemetry.latencyMs).toEqual(expect.objectContaining({
      prepare: expect.any(Number),
      cutout: expect.any(Number),
      embedding: expect.any(Number),
      qdrant: expect.any(Number),
      reranker: expect.any(Number),
      total: expect.any(Number),
    }));
    for (const removed of [
      "cacheHit", "raw", "cutout", "rawGap", "cutoutGap", "channelsAgree",
      "cutoutStatus", "aiReason",
    ]) {
      expect(telemetry).not.toHaveProperty(removed);
    }
    expect(result.status).toBe("MATCHED");
  });

  it("never puts a raw vector or a secret into telemetry", async () => {
    const test = harness({ hits: shortlist(2), selected: "SD375" });
    await test.service.recognize(CUSTOMER_IMAGE);
    const serialized = JSON.stringify(test.telemetry[0]);
    expect(serialized).not.toContain("0.1,0.1");
    expect(serialized.toLowerCase()).not.toContain("bearer");
    expect(serialized.toLowerCase()).not.toContain("api-key");
    expect(serialized.toLowerCase()).not.toContain("private key");
    expect(JSON.parse(serialized)).not.toHaveProperty("embedding");
  });

  it("records the error code without a partial match on failure", async () => {
    const test = harness({ searchError: "IMAGE_RECOGNITION_GROUPS_INVALID" });
    await test.service.recognize(CUSTOMER_IMAGE);
    const telemetry = test.telemetry[0] as RealtimeMediaTelemetry;
    expect(telemetry.finalDecision).toBe("ERROR");
    expect(telemetry.errorCode).toBe("IMAGE_RECOGNITION_GROUPS_INVALID");
    expect(telemetry.finalProductId).toBeNull();
    expect(telemetry.finalRetrievalScore).toBeNull();
  });
});

describe("V2 realtime recognition construction", () => {
  it("requires the pipeline and embedding pipeline versions", () => {
    const build = (options: Partial<RealtimeMediaRecognitionOptions>) =>
      () => new RealtimeMediaRecognitionService(
        { searchCutoutGroups: vi.fn() } as unknown as ImageRecognitionSearchPort,
        {} as RecognitionImagePreparationPort,
        {} as RecognitionImageEmbeddingPort,
        {} as RealtimeMediaRerankerPort,
        {
          pipelineVersion: "v",
          embeddingPipelineVersion: "p",
          rerankerModel: "m",
          rerankerPromptVersion: "pv",
          ...options,
        },
      );
    expect(build({ pipelineVersion: "  " })).toThrow("MEDIA_PIPELINE_VERSION_REQUIRED");
    expect(build({ embeddingPipelineVersion: "  " }))
      .toThrow("MEDIA_EMBEDDING_PIPELINE_VERSION_REQUIRED");
    expect(build({})).not.toThrow();
  });
});
