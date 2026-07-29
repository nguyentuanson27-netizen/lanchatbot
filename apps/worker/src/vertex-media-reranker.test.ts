import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { VertexMediaReranker } from "./vertex-media-reranker.js";

const privateKey = generateKeyPairSync("rsa", {
  modulusLength: 2_048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

function generated(selected: string): Response {
  return new Response(JSON.stringify({
    modelVersion: "gemini-3.5-flash-lite",
    usageMetadata: {
      promptTokenCount: 1_032,
      candidatesTokenCount: 8,
      totalTokenCount: 1_040,
    },
    candidates: [{
      content: { parts: [{ text: JSON.stringify({ selected }) }] },
    }],
  }), { status: 200 });
}

function input() {
  return {
    modelName: "gemini-3.5-flash-lite",
    promptVersion: "media-rerank-v1",
    customerImageBytes: new Uint8Array([1, 2, 3]),
    customerImageMimeType: "image/png" as const,
    candidates: [
      {
        productId: "SD395",
        title: "Sản phẩm SD395",
        imageBytes: new Uint8Array([4, 5, 6]),
        mimeType: "image/png" as const,
      },
      {
        productId: "SD443",
        title: "Sản phẩm SD443",
        imageBytes: new Uint8Array([7, 8, 9]),
        mimeType: "image/png" as const,
      },
    ],
    timeoutMs: 8_000,
    maxOutputTokens: 250,
  };
}

describe("VertexMediaReranker", () => {
  it("sends bounded inline images and accepts only a listed candidate", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "token",
        expires_in: 3_600,
      }), { status: 200 }))
      .mockResolvedValueOnce(generated("SD395"));
    const reranker = new VertexMediaReranker({
      projectId: "test-project",
      location: "global",
      serviceAccount: {
        email: "test@example.iam.gserviceaccount.com",
        privateKey,
      },
      fetchImpl,
    });

    const result = await reranker.rerankMediaCandidates(input());

    expect(result.selected).toBe("SD395");
    expect(result.tokenUsage.total).toBe(1_040);
    const [, request] = fetchImpl.mock.calls[1] ?? [];
    const body = JSON.parse(String(request?.body)) as {
      contents: readonly { parts: readonly unknown[] }[];
      generationConfig: {
        maxOutputTokens: number;
        responseSchema: {
          properties: { selected: { enum: readonly string[] } };
        };
      };
    };
    expect(body.contents[0]?.parts).toHaveLength(6);
    expect(body.generationConfig.maxOutputTokens).toBe(250);
    expect(body.generationConfig.responseSchema.properties.selected.enum).toEqual([
      "SD395",
      "SD443",
      "none",
      "ambiguous",
    ]);
  });

  it("rejects a model response that invents a product code", async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: "token",
        expires_in: 3_600,
      }), { status: 200 }))
      .mockResolvedValueOnce(generated("SD999"));
    const reranker = new VertexMediaReranker({
      projectId: "test-project",
      location: "global",
      serviceAccount: {
        email: "test@example.iam.gserviceaccount.com",
        privateKey,
      },
      fetchImpl,
    });

    await expect(reranker.rerankMediaCandidates(input()))
      .rejects.toThrow("VERTEX_MEDIA_SCHEMA_INVALID");
  });
});
