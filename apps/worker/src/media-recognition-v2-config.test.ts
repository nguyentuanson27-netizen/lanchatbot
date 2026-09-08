import { describe, expect, it } from "vitest";
import {
  LEGACY_MULTIMODAL_COLLECTION,
  RECOGNITION_V2_EMBEDDING_DIMENSION,
  RECOGNITION_V2_EMBEDDING_MODEL,
  RECOGNITION_V2_MAX_IMAGE_DIMENSION,
  RECOGNITION_V2_VERTEX_HOST,
  RECOGNITION_V2_VERTEX_LOCATION,
  defaultEmbeddingPipelineVersion,
  recognitionLockKey,
  recognitionProgressKey,
  resolveMediaRecognitionV2Config,
} from "./media-recognition-v2-config.js";

const base = { MEDIA_RECOGNITION_V2_QDRANT_COLLECTION: "lana_recognition_v2" };

describe("media recognition v2 configuration contract", () => {
  it("locks the embedding model, dimension, location and preprocessing bound", () => {
    const config = resolveMediaRecognitionV2Config(base);
    expect(config.embeddingModel).toBe(RECOGNITION_V2_EMBEDDING_MODEL);
    expect(config.embeddingModel).toBe("gemini-embedding-2");
    expect(config.embeddingDimension).toBe(3_072);
    expect(config.embeddingDimension).toBe(RECOGNITION_V2_EMBEDDING_DIMENSION);
    expect(config.vertexLocation).toBe(RECOGNITION_V2_VERTEX_LOCATION);
    expect(config.vertexHost).toBe(RECOGNITION_V2_VERTEX_HOST);
    expect(config.vertexHost).toBe("aiplatform.us.rep.googleapis.com");
    expect(config.vectorName).toBe("image_cutout");
    expect(config.distance).toBe("Cosine");
    expect(config.maxImageDimension).toBe(RECOGNITION_V2_MAX_IMAGE_DIMENSION);
    expect(config.uniqueProductLimit).toBe(5);
  });

  it("derives one pipeline version covering model, dimension, preprocess and cutout", () => {
    expect(resolveMediaRecognitionV2Config(base).embeddingPipelineVersion)
      .toBe("ge2-3072-pre1024-rembg-u2netp-v1");
    expect(defaultEmbeddingPipelineVersion("isnet")).toBe(
      "ge2-3072-pre1024-rembg-isnet-v1",
    );
  });

  it("fails closed when the recognition collection is missing or malformed", () => {
    expect(() => resolveMediaRecognitionV2Config({}))
      .toThrow("MEDIA_RECOGNITION_V2_QDRANT_COLLECTION_REQUIRED");
    expect(() => resolveMediaRecognitionV2Config({
      MEDIA_RECOGNITION_V2_QDRANT_COLLECTION: "bad collection/name",
    })).toThrow("MEDIA_RECOGNITION_V2_QDRANT_COLLECTION_INVALID");
  });

  it("refuses to share a collection with the legacy multimodal consumers", () => {
    expect(() => resolveMediaRecognitionV2Config({
      MEDIA_RECOGNITION_V2_QDRANT_COLLECTION: LEGACY_MULTIMODAL_COLLECTION,
    })).toThrow("MEDIA_RECOGNITION_V2_QDRANT_COLLECTION_CONFLICT");
    expect(() => resolveMediaRecognitionV2Config({
      MEDIA_RECOGNITION_V2_QDRANT_COLLECTION: "shared_catalog",
      QDRANT_COLLECTION: "shared_catalog",
    })).toThrow("MEDIA_RECOGNITION_V2_QDRANT_COLLECTION_CONFLICT");
    expect(() => resolveMediaRecognitionV2Config({
      MEDIA_RECOGNITION_V2_QDRANT_COLLECTION: "shared_ingest",
      QDRANT_COLLECTION_INGEST_V2: "shared_ingest",
    })).toThrow("MEDIA_RECOGNITION_V2_QDRANT_COLLECTION_CONFLICT");
  });

  it("rejects an override that would create an incompatible vector space", () => {
    expect(() => resolveMediaRecognitionV2Config({
      ...base,
      MEDIA_RECOGNITION_V2_EMBEDDING_MODEL: "multimodalembedding@001",
    })).toThrow("MEDIA_RECOGNITION_V2_EMBEDDING_MODEL_UNSUPPORTED");
    expect(() => resolveMediaRecognitionV2Config({
      ...base,
      MEDIA_RECOGNITION_V2_EMBEDDING_DIMENSION: "1408",
    })).toThrow("MEDIA_RECOGNITION_V2_EMBEDDING_DIMENSION_UNSUPPORTED");
    expect(() => resolveMediaRecognitionV2Config({
      ...base,
      MEDIA_RECOGNITION_V2_VERTEX_LOCATION: "us-central1",
    })).toThrow("MEDIA_RECOGNITION_V2_VERTEX_LOCATION_UNSUPPORTED");
  });

  it("ignores the shared legacy VERTEX_EMBEDDING_* settings entirely", () => {
    const config = resolveMediaRecognitionV2Config({
      ...base,
      VERTEX_EMBEDDING_MODEL: "multimodalembedding@001",
      VERTEX_EMBEDDING_DIMENSION: "1408",
      VERTEX_EMBEDDING_LOCATION: "us-central1",
    });
    expect(config.embeddingModel).toBe("gemini-embedding-2");
    expect(config.embeddingDimension).toBe(3_072);
    expect(config.vertexLocation).toBe("us");
  });

  it("namespaces lock and progress keys by collection and pipeline version", () => {
    const config = resolveMediaRecognitionV2Config(base);
    expect(recognitionLockKey(config, 0, 2)).toBe(
      "lock:ingest:lana_recognition_v2:ge2-3072-pre1024-rembg-u2netp-v1:shard:0:of:2",
    );
    expect(recognitionProgressKey(config, 1, 2)).toBe(
      "ingest:progress:lana_recognition_v2:ge2-3072-pre1024-rembg-u2netp-v1:shard:1:of:2",
    );
    expect(recognitionLockKey(config, 0, 2)).not.toContain(
      LEGACY_MULTIMODAL_COLLECTION,
    );
  });
});
