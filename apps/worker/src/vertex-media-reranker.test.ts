import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { MAX_RERANK_CANDIDATES, VertexMediaReranker } from "./vertex-media-reranker.js";

const privateKey = generateKeyPairSync("rsa", {
  modulusLength: 2_048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

const SHORTLIST = ["SD395", "SD443", "SV921", "CB182", "DM044"] as const;

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

function candidate(productId: string, seed: number) {
  return {
    productId,
    title: `Sản phẩm ${productId}`,
    // The exact winning catalog image for this SKU, already canonicalized.
    imageBytes: new Uint8Array([seed, seed + 1, seed + 2]),
    mimeType: "image/png" as const,
  };
}

function input(count: number) {
  return {
    modelName: "gemini-3.5-flash-lite",
    promptVersion: "media-rerank-v2-cutout-only",
    customerImageBytes: new Uint8Array([1, 2, 3]),
    customerImageMimeType: "image/png" as const,
    candidates: SHORTLIST.slice(0, count).map((id, index) => candidate(id, index * 10)),
    timeoutMs: 8_000,
    maxOutputTokens: 250,
  };
}

function reranker(selected: string): {
  instance: VertexMediaReranker;
  fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>;
} {
  const fetchImpl = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify({
      access_token: "token",
      expires_in: 3_600,
    }), { status: 200 }))
    .mockResolvedValueOnce(generated(selected));
  return {
    fetchImpl,
    instance: new VertexMediaReranker({
      projectId: "test-project",
      location: "global",
      serviceAccount: {
        email: "test@example.iam.gserviceaccount.com",
        privateKey,
      },
      fetchImpl,
    }),
  };
}

function requestBody(fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>) {
  const [, request] = fetchImpl.mock.calls[1] ?? [];
  return JSON.parse(String(request?.body)) as {
    contents: readonly { parts: readonly Record<string, unknown>[] }[];
    generationConfig: {
      maxOutputTokens: number;
      responseSchema: { properties: { selected: { enum: readonly string[] } } };
    };
  };
}

describe("Gemini reranker for 1-5 candidates", () => {
  it("caps the shortlist at five unique SKUs", () => {
    expect(MAX_RERANK_CANDIDATES).toBe(5);
  });

  it("reranks a single candidate", async () => {
    const { instance, fetchImpl } = reranker("SD395");
    const result = await instance.rerankMediaCandidates(input(1));
    expect(result.selected).toBe("SD395");
    // instruction text + customer image + one candidate label + one candidate image
    expect(requestBody(fetchImpl).contents[0]?.parts).toHaveLength(4);
    expect(requestBody(fetchImpl).generationConfig.responseSchema.properties.selected.enum)
      .toEqual(["SD395", "none", "ambiguous"]);
  });

  it.each([1, 2, 3, 4, 5])("lets candidate rank %i win", async (rank) => {
    const winner = SHORTLIST[rank - 1] as string;
    const { instance } = reranker(winner);
    const result = await instance.rerankMediaCandidates(input(5));
    expect(result.selected).toBe(winner);
  });

  it("sends every supplied candidate without slicing to three", async () => {
    const { instance, fetchImpl } = reranker("DM044");
    await instance.rerankMediaCandidates(input(5));
    const body = requestBody(fetchImpl);
    // instruction + customer image + 5 * (label + image)
    expect(body.contents[0]?.parts).toHaveLength(12);
    expect(body.generationConfig.responseSchema.properties.selected.enum).toEqual([
      ...SHORTLIST, "none", "ambiguous",
    ]);
  });

  it("uses the exact evidence image bytes supplied for each candidate", async () => {
    const { instance, fetchImpl } = reranker("SD443");
    const request = input(2);
    await instance.rerankMediaCandidates(request);
    const parts = requestBody(fetchImpl).contents[0]?.parts ?? [];
    const inlineImages = parts
      .map((part) => (part.inlineData as { data?: string } | undefined)?.data)
      .filter((value): value is string => typeof value === "string");
    expect(inlineImages[0]).toBe(Buffer.from(request.customerImageBytes).toString("base64"));
    expect(inlineImages[1]).toBe(
      Buffer.from(request.candidates[0]!.imageBytes).toString("base64"),
    );
    expect(inlineImages[2]).toBe(
      Buffer.from(request.candidates[1]!.imageBytes).toString("base64"),
    );
  });

  it("prompts for contrastive local discriminators and ignores person context", async () => {
    const { instance, fetchImpl } = reranker("SD395");
    await instance.rerankMediaCandidates(input(2));
    const instructions = String(requestBody(fetchImpl).contents[0]?.parts[0]?.text ?? "");
    for (const discriminator of [
      "họa tiết", "thêu", "cúc", "cổ áo", "tay áo", "viền", "đường may",
      "chất liệu", "motif", "cắt may", "màu",
    ]) {
      expect(instructions).toContain(discriminator);
    }
    expect(instructions).toContain("mâu thuẫn");
    expect(instructions).toContain("khuôn mặt");
    expect(instructions).toContain("tư thế");
    expect(instructions).toContain("bối cảnh");
    expect(instructions).toContain("góc máy");
  });

  it("returns none", async () => {
    const { instance } = reranker("none");
    expect((await reranker("none").instance.rerankMediaCandidates(input(3))).selected)
      .toBe("none");
    expect((await instance.rerankMediaCandidates(input(1))).selected).toBe("none");
  });

  it("returns ambiguous", async () => {
    const { instance } = reranker("ambiguous");
    expect((await instance.rerankMediaCandidates(input(4))).selected).toBe("ambiguous");
  });

  it("rejects a model response that invents a product code", async () => {
    const { instance } = reranker("SD999");
    await expect(instance.rerankMediaCandidates(input(3)))
      .rejects.toThrow("VERTEX_MEDIA_SCHEMA_INVALID");
  });

  it("rejects an empty shortlist", async () => {
    const { instance } = reranker("SD395");
    await expect(instance.rerankMediaCandidates(input(0)))
      .rejects.toThrow("VERTEX_MEDIA_CANDIDATES_REQUIRED");
  });

  it("rejects duplicate candidate ids rather than deduplicating them", async () => {
    const { instance } = reranker("SD395");
    await expect(instance.rerankMediaCandidates({
      ...input(2),
      candidates: [candidate("SD395", 0), candidate("SD395", 10)],
    })).rejects.toThrow("VERTEX_MEDIA_CANDIDATES_INVALID");
  });

  it("rejects a blank candidate id", async () => {
    const { instance } = reranker("SD395");
    await expect(instance.rerankMediaCandidates({
      ...input(1),
      candidates: [candidate("   ", 0)],
    })).rejects.toThrow("VERTEX_MEDIA_CANDIDATES_INVALID");
  });

  it("rejects more than five candidates instead of silently truncating", async () => {
    const { instance } = reranker("SD395");
    await expect(instance.rerankMediaCandidates({
      ...input(5),
      candidates: [...input(5).candidates, candidate("XX999", 90)],
    })).rejects.toThrow("VERTEX_MEDIA_CANDIDATES_INVALID");
  });
});
