/**
 * Product Image Recognition V2 — realtime recognition (Phase 5).
 *
 * The V2 path is CUTOUT-only:
 *
 *   safe download -> shared canonical preparation -> RemBG cutout
 *   -> one Gemini Embedding 2 / 3072D embedding
 *   -> exact grouped Qdrant search (<= 5 unique SKU groups)
 *   -> 0 candidates: NOT_FOUND
 *   -> 1-5 candidates: Gemini contrastive reranker
 *   -> MATCHED | AMBIGUOUS | NOT_FOUND | ERROR
 *
 * Deliberately absent, with no reachable branch: RAW embedding/search, RAW+CUTOUT
 * merge or disagreement handling, RAW fallback, similarity-threshold or score-gap
 * direct match, PRIMARY-first evidence substitution, and the recognition-result
 * Redis cache. There is no runtime fallback to the previous recognition engine.
 */
import { createHash } from "node:crypto";
import type { StableProductDocument } from "@lana/business-tools";
import type {
  ImageRecognitionHit,
  ImageRecognitionSearchPort,
} from "./image-recognition-qdrant.js";
import type { RecognitionImageEmbeddingPort } from "./gemini-embedding-2-client.js";
import type { RecognitionImagePreparationPort } from "./media-recognition-v2-image-pipeline.js";
import {
  RECOGNITION_V2_EMBEDDING_DIMENSION,
  RECOGNITION_V2_EMBEDDING_MODEL,
  RECOGNITION_V2_MAX_IMAGE_DIMENSION,
  RECOGNITION_V2_UNIQUE_PRODUCT_LIMIT,
} from "./media-recognition-v2-config.js";

export {
  MediaRecognitionV2ImagePipeline,
  MediaRecognitionV2Preparer,
  RecognitionImageError,
  SecureRecognitionImageDownloader,
  safeRecognitionImageUrl,
} from "./media-recognition-v2-image-pipeline.js";

/** Winning grouped Qdrant evidence retained for one shortlist candidate. */
export interface RealtimeMediaCandidateEvidence {
  readonly pointId: string;
  readonly imageUrl: string;
  readonly imageRole: string | null;
  readonly imageType: string | null;
  readonly imageAngle: string | null;
  readonly imageDetailType: string | null;
  readonly imageContentSha256: string | null;
}

export interface RealtimeMediaCandidate {
  readonly product: StableProductDocument;
  /** 1-based position in the grouped retrieval order. */
  readonly retrievalRank: number;
  /** Unmodified Qdrant cosine score of this SKU's winning image point. */
  readonly retrievalScore: number;
  readonly evidence: RealtimeMediaCandidateEvidence;
}

export interface MediaCandidateTelemetry {
  readonly productId: string;
  readonly rank: number;
  readonly score: number;
  readonly pointId: string;
}

/** V2 telemetry (spec §18): no raw vectors, no secrets, no cache or RAW fields. */
export interface RealtimeMediaTelemetry {
  readonly pipelineVersion: string;
  readonly embeddingPipelineVersion: string;
  readonly normalizedImageHash: string;
  readonly embeddingModel: string;
  readonly embeddingDimension: number;
  readonly preprocessMaxDimension: number;
  readonly candidates: readonly MediaCandidateTelemetry[];
  readonly selectedEvidencePointId: string | null;
  readonly rerankerModel: string | null;
  readonly rerankerPromptVersion: string | null;
  readonly rerankerDecision: string | null;
  readonly rerankerSelectedOriginalRank: number | null;
  readonly finalDecision?: "MATCHED" | "AMBIGUOUS" | "NOT_FOUND" | "ERROR";
  readonly finalProductId: string | null;
  readonly finalRetrievalScore: number | null;
  readonly finalReasonCode?: string;
  readonly errorCode: string | null;
  readonly latencyMs: Readonly<{
    prepare: number;
    cutout: number;
    embedding: number;
    qdrant: number;
    reranker: number;
    total: number;
  }>;
}

export type RealtimeMediaDecisionSource = "GEMINI_RERANK";

export type RealtimeMediaRecognition =
  | {
      readonly status: "MATCHED";
      readonly product: StableProductDocument;
      /** Retrieval score of the selected SKU's own winning point. */
      readonly score: number;
      /** Always null: V2 never decides on a retrieval gap. */
      readonly gap: null;
      readonly decisionSource: RealtimeMediaDecisionSource;
      readonly candidates: readonly RealtimeMediaCandidate[];
      readonly reasonCode: string;
      readonly telemetry: RealtimeMediaTelemetry;
    }
  | {
      readonly status: "AMBIGUOUS" | "NOT_FOUND" | "ERROR";
      readonly candidates: readonly RealtimeMediaCandidate[];
      readonly reasonCode: string;
      readonly telemetry: RealtimeMediaTelemetry;
    };

export interface MediaRerankCandidate {
  readonly productId: string;
  readonly title: string;
  readonly imageBytes: Uint8Array;
  readonly mimeType: "image/png" | "image/jpeg";
}

export interface MediaRerankResult {
  readonly selected: string | "none" | "ambiguous";
  readonly modelVersion: string;
  readonly latencyMs: number;
  readonly tokenUsage: Readonly<Record<string, number>>;
}

export interface RealtimeMediaRerankerPort {
  rerankMediaCandidates(input: {
    readonly modelName: string;
    readonly promptVersion: string;
    readonly customerImageBytes: Uint8Array;
    readonly customerImageMimeType: "image/png" | "image/jpeg";
    readonly candidates: readonly MediaRerankCandidate[];
    /**
     * Reranker-stage cap. It may only shorten the call: the caller's `signal`
     * carries the remaining total request budget and always wins.
     */
    readonly timeoutMs: number;
    readonly maxOutputTokens: number;
    /** The one request-wide budget shared by every stage of recognition. */
    readonly signal: AbortSignal;
  }): Promise<MediaRerankResult>;
}

export interface RealtimeMediaRecognitionOptions {
  readonly pipelineVersion: string;
  readonly embeddingPipelineVersion: string;
  readonly rerankerModel: string;
  readonly rerankerPromptVersion: string;
  readonly uniqueProductLimit?: number;
  readonly totalDeadlineMs?: number;
  readonly rerankerTimeoutMs?: number;
  readonly rerankerMaxOutputTokens?: number;
  readonly now?: () => number;
  readonly logTelemetry?: (telemetry: RealtimeMediaTelemetry) => void;
}

function errorCode(error: unknown, fallback: string): string {
  return error instanceof Error && error.message
    ? error.message.slice(0, 128)
    : fallback;
}

function candidateFromHit(
  hit: ImageRecognitionHit,
  index: number,
): RealtimeMediaCandidate {
  return {
    product: hit.product,
    retrievalRank: index + 1,
    retrievalScore: hit.score,
    evidence: {
      pointId: hit.pointId,
      imageUrl: hit.imageUrl,
      imageRole: hit.imageRole,
      imageType: hit.imageType,
      imageAngle: hit.imageAngle,
      imageDetailType: hit.imageDetailType,
      imageContentSha256: hit.imageContentSha256,
    },
  };
}

export class RealtimeMediaRecognitionService {
  private readonly now: () => number;

  constructor(
    private readonly search: ImageRecognitionSearchPort,
    private readonly images: RecognitionImagePreparationPort,
    private readonly embeddings: RecognitionImageEmbeddingPort,
    private readonly reranker: RealtimeMediaRerankerPort,
    private readonly options: RealtimeMediaRecognitionOptions,
  ) {
    if (!options.pipelineVersion.trim()) {
      throw new Error("MEDIA_PIPELINE_VERSION_REQUIRED");
    }
    if (!options.embeddingPipelineVersion.trim()) {
      throw new Error("MEDIA_EMBEDDING_PIPELINE_VERSION_REQUIRED");
    }
    this.now = options.now ?? Date.now;
  }

  async recognize(imageUrl: string): Promise<RealtimeMediaRecognition> {
    const started = this.now();
    const totalDeadlineMs = this.options.totalDeadlineMs ?? 20_000;
    const state: MutableTelemetry = {
      normalizedImageHash: "",
      candidates: [],
      selectedEvidencePointId: null,
      rerankerDecision: null,
      rerankerSelectedOriginalRank: null,
      finalProductId: null,
      finalRetrievalScore: null,
      errorCode: null,
      latency: {
        prepare: 0,
        cutout: 0,
        embedding: 0,
        qdrant: 0,
        reranker: 0,
        total: 0,
      },
    };
    // One budget for the whole request; every stage receives this signal so a
    // deadline or an upstream cancellation stops download, preparation, RemBG,
    // embedding, Qdrant, evidence preparation and reranking alike.
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), Math.max(1_000, totalDeadlineMs));
    const signal = controller.signal;

    try {
      const prepareStarted = this.now();
      const customerImage = await this.images.prepareFromUrl(imageUrl, signal);
      state.latency.prepare = this.now() - prepareStarted;
      state.normalizedImageHash = createHash("sha256")
        .update(customerImage)
        .digest("hex");

      const cutoutStarted = this.now();
      const cutout = await this.images.createCutoutPng(customerImage, signal);
      state.latency.cutout = this.now() - cutoutStarted;

      const embeddingStarted = this.now();
      const embedding = await this.embeddings.embedCutout(cutout, signal);
      state.latency.embedding = this.now() - embeddingStarted;

      const qdrantStarted = this.now();
      const hits = await this.search.searchCutoutGroups(
        embedding,
        this.options.uniqueProductLimit ?? RECOGNITION_V2_UNIQUE_PRODUCT_LIMIT,
        signal,
      );
      state.latency.qdrant = this.now() - qdrantStarted;

      const candidates = hits.map(candidateFromHit);
      state.candidates = candidates.map((candidate) => ({
        productId: candidate.product.productId,
        rank: candidate.retrievalRank,
        score: candidate.retrievalScore,
        pointId: candidate.evidence.pointId,
      }));

      if (candidates.length === 0) {
        return this.emit({
          status: "NOT_FOUND",
          candidates: [],
          reasonCode: "NO_CANDIDATES",
          telemetry: this.telemetry(state, started),
        });
      }

      // Every non-empty shortlist is reranked. The reranker sees the prepared
      // customer image and, for each candidate, the exact winning catalog image
      // canonicalized through the same pipeline — no second RemBG pass and no
      // PRIMARY-image substitution.
      const evidenceImages: Uint8Array[] = [];
      for (const candidate of candidates) {
        evidenceImages.push(
          await this.images.prepareFromUrl(candidate.evidence.imageUrl, signal),
        );
      }

      const rerankStarted = this.now();
      const decision = await this.reranker.rerankMediaCandidates({
        modelName: this.options.rerankerModel,
        promptVersion: this.options.rerankerPromptVersion,
        customerImageBytes: customerImage,
        customerImageMimeType: "image/png",
        candidates: candidates.map((candidate, index) => ({
          productId: candidate.product.productId,
          title: candidate.product.title,
          imageBytes: evidenceImages[index] as Uint8Array,
          mimeType: "image/png" as const,
        })),
        timeoutMs: this.options.rerankerTimeoutMs ?? 10_000,
        maxOutputTokens: this.options.rerankerMaxOutputTokens ?? 250,
        signal,
      });
      state.latency.reranker = this.now() - rerankStarted;
      state.rerankerDecision = decision.selected;

      if (decision.selected === "none") {
        return this.emit({
          status: "NOT_FOUND",
          candidates,
          reasonCode: "GEMINI_NONE",
          telemetry: this.telemetry(state, started),
        });
      }
      if (decision.selected === "ambiguous") {
        return this.emit({
          status: "AMBIGUOUS",
          candidates,
          reasonCode: "GEMINI_AMBIGUOUS",
          telemetry: this.telemetry(state, started),
        });
      }

      // Model output is untrusted: only a supplied candidate ID can win, and it is
      // re-checked here rather than trusted from the response schema.
      const selected = candidates.find(
        (candidate) => candidate.product.productId === decision.selected,
      );
      if (!selected) {
        state.errorCode = "GEMINI_SELECTION_INVALID";
        return this.emit({
          status: "ERROR",
          candidates,
          reasonCode: "GEMINI_SELECTION_INVALID",
          telemetry: this.telemetry(state, started),
        });
      }

      state.selectedEvidencePointId = selected.evidence.pointId;
      state.rerankerSelectedOriginalRank = selected.retrievalRank;
      state.finalProductId = selected.product.productId;
      state.finalRetrievalScore = selected.retrievalScore;
      return this.emit({
        status: "MATCHED",
        product: selected.product,
        // The score always belongs to the selected SKU's own winning point.
        score: selected.retrievalScore,
        gap: null,
        decisionSource: "GEMINI_RERANK",
        candidates,
        reasonCode: "GEMINI_RERANK",
        telemetry: this.telemetry(state, started),
      });
    } catch (error) {
      const code = errorCode(error, "MEDIA_RECOGNITION_FAILED");
      state.errorCode = code;
      return this.emit({
        status: "ERROR",
        candidates: [],
        reasonCode: code,
        telemetry: this.telemetry(state, started),
      });
    } finally {
      clearTimeout(deadline);
      // Release any stage still holding the budget (child process, fetch, RemBG).
      controller.abort();
    }
  }

  private emit(value: RealtimeMediaRecognition): RealtimeMediaRecognition {
    try {
      this.options.logTelemetry?.({
        ...value.telemetry,
        finalDecision: value.status,
        finalReasonCode: value.reasonCode,
      });
    } catch {
      // Telemetry is deliberately non-authoritative.
    }
    return value;
  }

  private telemetry(state: MutableTelemetry, started: number): RealtimeMediaTelemetry {
    return {
      pipelineVersion: this.options.pipelineVersion,
      embeddingPipelineVersion: this.options.embeddingPipelineVersion,
      normalizedImageHash: state.normalizedImageHash,
      embeddingModel: RECOGNITION_V2_EMBEDDING_MODEL,
      embeddingDimension: RECOGNITION_V2_EMBEDDING_DIMENSION,
      preprocessMaxDimension: RECOGNITION_V2_MAX_IMAGE_DIMENSION,
      candidates: state.candidates,
      selectedEvidencePointId: state.selectedEvidencePointId,
      rerankerModel: this.options.rerankerModel,
      rerankerPromptVersion: this.options.rerankerPromptVersion,
      rerankerDecision: state.rerankerDecision,
      rerankerSelectedOriginalRank: state.rerankerSelectedOriginalRank,
      finalProductId: state.finalProductId,
      finalRetrievalScore: state.finalRetrievalScore,
      errorCode: state.errorCode,
      latencyMs: { ...state.latency, total: this.now() - started },
    };
  }
}

interface MutableTelemetry {
  normalizedImageHash: string;
  candidates: readonly MediaCandidateTelemetry[];
  selectedEvidencePointId: string | null;
  rerankerDecision: string | null;
  rerankerSelectedOriginalRank: number | null;
  finalProductId: string | null;
  finalRetrievalScore: number | null;
  errorCode: string | null;
  latency: {
    prepare: number;
    cutout: number;
    embedding: number;
    qdrant: number;
    reranker: number;
    total: number;
  };
}
