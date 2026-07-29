import { describe, expect, it, vi } from "vitest";
import type {
  ImageVectorChannel,
  ScoredStableProduct,
  StableProductDocument,
} from "@lana/business-tools";
import {
  RealtimeMediaRecognitionService,
  type RealtimeImageProcessorPort,
  type RealtimeMediaRerankerPort,
} from "./realtime-media-recognition.js";

function product(productId: string): StableProductDocument {
  const imageUrl = `https://lanadesign.vn/images/${productId.toLowerCase()}.jpg`;
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
    images: [{
      url: imageUrl,
      role: "PRIMARY",
      angle: "FRONT",
      imageType: "MODEL",
      intents: [],
      partsVisible: [],
      sortOrder: 0,
      qualityScore: 0.9,
      feedback: false,
      reviewStatus: "APPROVED",
      metadataVerified: true,
    }],
    catalogVersion: "test-v1",
    observedAt: "2026-07-28T00:00:00.000Z",
  };
}

function scored(
  document: StableProductDocument,
  score: number,
): ScoredStableProduct {
  return { document, score };
}

function processor(cutoutError?: string): RealtimeImageProcessorPort {
  return {
    prepare: vi.fn(async (url: string) =>
      new TextEncoder().encode(`normalized:${url}`)
    ),
    removeBackground: vi.fn(async () => {
      if (cutoutError) throw new Error(cutoutError);
      return new Uint8Array([7, 8, 9]);
    }),
  };
}

function service(input: {
  raw: readonly ScoredStableProduct[];
  cutout: readonly ScoredStableProduct[];
  processor?: RealtimeImageProcessorPort;
  reranker?: RealtimeMediaRerankerPort;
}) {
  const search = {
    searchImageCandidatesBytes: vi.fn(
      async (_bytes: Uint8Array, channel: ImageVectorChannel) =>
        channel === "image_cutout" ? input.cutout : input.raw,
    ),
  };
  return {
    search,
    recognizer: new RealtimeMediaRecognitionService(
      search,
      input.processor ?? processor(),
      {
        pipelineVersion: "test-pipeline-v1",
        totalDeadlineMs: 12_000,
        cutoutStrongScore: 0.82,
        cutoutMinimumScore: 0.74,
        cutoutMinimumGap: 0.025,
        rawFallbackScore: 0.78,
        rawFallbackGap: 0.04,
        aiMode: input.reranker ? "LIVE" : "OFF",
      },
      input.reranker,
    ),
  };
}

describe("RealtimeMediaRecognitionService", () => {
  const sd395 = product("SD395");
  const sd443 = product("SD443");
  const sd013 = product("SD013");

  it("auto-matches a strong cutout result when raw does not contradict it", async () => {
    const { recognizer } = service({
      cutout: [scored(sd395, 0.87), scored(sd443, 0.81), scored(sd013, 0.73)],
      raw: [scored(sd395, 0.81), scored(sd443, 0.76), scored(sd013, 0.72)],
    });

    const result = await recognizer.recognize(
      "https://content.pancake.vn/customer.jpg",
    );

    expect(result.status).toBe("MATCHED");
    if (result.status === "MATCHED") {
      expect(result.product.productId).toBe("SD395");
      expect(result.reasonCode).toBe("CUTOUT_STRONG");
    }
    expect(result.telemetry.channelsAgree).toBe(true);
  });

  it("uses raw only as fallback when cutout processing fails", async () => {
    const { recognizer } = service({
      processor: processor("REMBG_TIMEOUT"),
      cutout: [],
      raw: [scored(sd395, 0.84), scored(sd443, 0.77), scored(sd013, 0.71)],
    });

    const result = await recognizer.recognize(
      "https://content.pancake.vn/customer.jpg",
    );

    expect(result.status).toBe("MATCHED");
    if (result.status === "MATCHED") {
      expect(result.product.productId).toBe("SD395");
      expect(result.reasonCode).toBe("RAW_FALLBACK_STRONG");
    }
    expect(result.telemetry.cutoutStatus).toBe("ERROR");
  });

  it("accepts Gemini only when it agrees with the cutout top candidate", async () => {
    const reranker: RealtimeMediaRerankerPort = {
      rerankMediaCandidates: vi.fn(async () => ({
        selected: "SD395",
        modelVersion: "gemini-3.5-flash-lite",
        latencyMs: 120,
        tokenUsage: { prompt: 1_032, completion: 8, total: 1_040 },
      })),
    };
    const { recognizer } = service({
      cutout: [scored(sd395, 0.80), scored(sd443, 0.79), scored(sd013, 0.76)],
      raw: [scored(sd443, 0.82), scored(sd395, 0.80), scored(sd013, 0.74)],
      reranker,
    });

    const result = await recognizer.recognize(
      "https://content.pancake.vn/customer.jpg",
    );

    expect(result.status).toBe("MATCHED");
    if (result.status === "MATCHED") {
      expect(result.product.productId).toBe("SD395");
      expect(result.reasonCode).toBe("GEMINI_CUTOUT_CONSENSUS");
    }
    expect(result.telemetry.aiReason).toBe("RAW_CUTOUT_DISAGREE");
  });

  it("does not let Gemini select a different candidate than cutout", async () => {
    const reranker: RealtimeMediaRerankerPort = {
      rerankMediaCandidates: vi.fn(async () => ({
        selected: "SD443",
        modelVersion: "gemini-3.5-flash-lite",
        latencyMs: 120,
        tokenUsage: {},
      })),
    };
    const { recognizer } = service({
      cutout: [scored(sd395, 0.80), scored(sd443, 0.79)],
      raw: [scored(sd443, 0.82), scored(sd395, 0.80)],
      reranker,
    });

    const result = await recognizer.recognize(
      "https://content.pancake.vn/customer.jpg",
    );

    expect(result.status).toBe("AMBIGUOUS");
    expect(result.candidates.map(({ product }) => product.productId)).toEqual([
      "SD395",
      "SD443",
    ]);
  });

  it("returns not-found when Gemini explicitly rejects all candidates", async () => {
    const reranker: RealtimeMediaRerankerPort = {
      rerankMediaCandidates: vi.fn(async () => ({
        selected: "none",
        modelVersion: "gemini-3.5-flash-lite",
        latencyMs: 90,
        tokenUsage: {},
      })),
    };
    const { recognizer } = service({
      cutout: [scored(sd395, 0.78), scored(sd443, 0.77)],
      raw: [scored(sd395, 0.77), scored(sd443, 0.76)],
      reranker,
    });

    const result = await recognizer.recognize(
      "https://content.pancake.vn/customer.jpg",
    );

    expect(result.status).toBe("NOT_FOUND");
    expect(result.reasonCode).toBe("GEMINI_NONE");
  });

  it("falls back to clarification-compatible ambiguity on Gemini timeout", async () => {
    const reranker: RealtimeMediaRerankerPort = {
      rerankMediaCandidates: vi.fn(async () => {
        throw new Error("VERTEX_MEDIA_TIMEOUT");
      }),
    };
    const { recognizer } = service({
      cutout: [scored(sd395, 0.80), scored(sd443, 0.79)],
      raw: [scored(sd395, 0.79), scored(sd443, 0.78)],
      reranker,
    });

    const result = await recognizer.recognize(
      "https://content.pancake.vn/customer.jpg",
    );

    expect(result.status).toBe("AMBIGUOUS");
    expect(result.telemetry.aiDecision).toBe("VERTEX_MEDIA_TIMEOUT");
  });

  it("does not force weak candidates into clarification choices", async () => {
    const { recognizer } = service({
      cutout: [scored(sd395, 0.70), scored(sd443, 0.69)],
      raw: [scored(sd443, 0.76), scored(sd395, 0.75)],
    });

    const result = await recognizer.recognize(
      "https://content.pancake.vn/customer.jpg",
    );

    expect(result.status).toBe("NOT_FOUND");
    expect(result.candidates).toEqual([]);
  });
});
