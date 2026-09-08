import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  GeminiEmbedding2Client,
  GeminiEmbedding2Error,
  geminiEmbedding2Endpoint,
  geminiEmbedding2RequestBody,
  parseGeminiEmbedding2Response,
} from "./gemini-embedding-2-client.js";

const privateKey = generateKeyPairSync("rsa", {
  modulusLength: 2_048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

const serviceAccount = {
  email: "recognition@lana.iam.gserviceaccount.com",
  privateKey,
};

const CUTOUT = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

function vector(length: number, fill: number | ((index: number) => number)): number[] {
  return Array.from(
    { length },
    (_value, index) => (typeof fill === "function" ? fill(index) : fill),
  );
}

interface Recorded {
  readonly url: string;
  readonly init: RequestInit;
}

function client(
  responder: (recorded: Recorded, call: number) => Response,
): { instance: GeminiEmbedding2Client; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const fetchImpl = vi.fn(async (input: unknown, init?: RequestInit) => {
    const recorded = { url: String(input), init: init ?? {} };
    calls.push(recorded);
    if (recorded.url.includes("oauth2.googleapis.com")) {
      return new Response(
        JSON.stringify({ access_token: "test-access-token", expires_in: 3_600 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return responder(recorded, calls.length);
  });
  return {
    calls,
    instance: new GeminiEmbedding2Client({
      projectId: "lana-preprod",
      serviceAccount,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }),
  };
}

function embeddingResponse(values: unknown): Response {
  return new Response(JSON.stringify({ embedding: { values } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("Gemini Embedding 2 wire contract", () => {
  it("targets the us multi-region :embedContent endpoint", () => {
    expect(geminiEmbedding2Endpoint("lana-preprod")).toBe(
      "https://aiplatform.us.rep.googleapis.com/v1/projects/lana-preprod"
      + "/locations/us/publishers/google/models/gemini-embedding-2:embedContent",
    );
  });

  it("sends the cutout PNG as content.parts[].inlineData", () => {
    const body = geminiEmbedding2RequestBody(CUTOUT) as {
      content: { parts: { inlineData: { mimeType: string; data: string } }[] };
    };
    expect(body.content.parts).toHaveLength(1);
    expect(body.content.parts[0]?.inlineData.mimeType).toBe("image/png");
    expect(body.content.parts[0]?.inlineData.data).toBe(CUTOUT.toString("base64"));
    // The legacy :predict shape must not reappear under a new model name.
    expect(body).not.toHaveProperty("instances");
    expect(body).not.toHaveProperty("parameters");
  });

  it("issues an OAuth-authenticated call with the expected request body", async () => {
    const { instance, calls } = client(() =>
      embeddingResponse(vector(3_072, (index) => index / 3_072)));
    await instance.embedCutout(CUTOUT, new AbortController().signal);
    const embedCall = calls.find((call) => call.url.includes("embedContent"));
    expect(embedCall?.url).toBe(geminiEmbedding2Endpoint("lana-preprod"));
    expect(embedCall?.init.method).toBe("POST");
    expect((embedCall?.init.headers as Record<string, string>).authorization)
      .toBe("Bearer test-access-token");
    expect(JSON.parse(String(embedCall?.init.body)))
      .toEqual(geminiEmbedding2RequestBody(CUTOUT));
    expect(embedCall?.url).not.toContain(":predict");
  });

  it("returns a valid 3072D vector unchanged, negatives included", async () => {
    const expected = vector(3_072, (index) => (index % 2 === 0 ? 0.5 : -0.5));
    const { instance } = client(() => embeddingResponse(expected));
    const result = await instance.embedCutout(CUTOUT, new AbortController().signal);
    expect(result).toHaveLength(3_072);
    expect([...result]).toEqual(expected);
  });

  it("rejects a legacy 1408D vector", async () => {
    const { instance } = client(() => embeddingResponse(vector(1_408, 0.1)));
    await expect(instance.embedCutout(CUTOUT, new AbortController().signal))
      .rejects.toThrow("GEMINI_EMBEDDING_DIMENSION_INVALID");
  });

  it("rejects any other wrong dimension", async () => {
    for (const length of [0, 768, 3_071, 3_073]) {
      const { instance } = client(() => embeddingResponse(vector(length, 0.1)));
      await expect(instance.embedCutout(CUTOUT, new AbortController().signal))
        .rejects.toThrow("GEMINI_EMBEDDING_DIMENSION_INVALID");
    }
  });

  it("rejects non-number, NaN and Infinity values", () => {
    const withValue = (value: unknown): unknown[] => {
      const values: unknown[] = vector(3_072, 0.1);
      values[17] = value;
      return values;
    };
    for (const bad of ["0.5", null, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => parseGeminiEmbedding2Response({ embedding: { values: withValue(bad) } }))
        .toThrow("GEMINI_EMBEDDING_VALUE_INVALID");
    }
  });

  it("rejects a response without embedding.values", () => {
    expect(() => parseGeminiEmbedding2Response({}))
      .toThrow("GEMINI_EMBEDDING_RESPONSE_INVALID");
    expect(() => parseGeminiEmbedding2Response({ predictions: [{ imageEmbedding: [] }] }))
      .toThrow("GEMINI_EMBEDDING_RESPONSE_INVALID");
  });

  it("surfaces provider failures as explicit, classified errors", async () => {
    for (const [status, code, retryable] of [
      [429, "GEMINI_EMBEDDING_RATE_LIMITED", true],
      [503, "GEMINI_EMBEDDING_RETRYABLE", true],
      [400, "GEMINI_EMBEDDING_FAILED", false],
    ] as const) {
      const { instance } = client(() => new Response("{}", { status }));
      await expect(instance.embedCutout(CUTOUT, new AbortController().signal))
        .rejects.toMatchObject({ code, retryable });
    }
  });

  it("surfaces an auth failure and drops the cached token", async () => {
    const { instance } = client(() => new Response("{}", { status: 401 }));
    await expect(instance.embedCutout(CUTOUT, new AbortController().signal))
      .rejects.toThrow("GEMINI_EMBEDDING_AUTH_FAILED");
  });

  it("fails closed when the OAuth exchange is rejected", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 403 }));
    const instance = new GeminiEmbedding2Client({
      projectId: "lana-preprod",
      serviceAccount,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(instance.embedCutout(CUTOUT, new AbortController().signal))
      .rejects.toThrow("GEMINI_EMBEDDING_AUTH_FAILED");
  });

  it("honours caller cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const { instance, calls } = client(() => embeddingResponse(vector(3_072, 0.1)));
    await expect(instance.embedCutout(CUTOUT, controller.signal))
      .rejects.toThrow("GEMINI_EMBEDDING_CANCELLED");
    expect(calls).toHaveLength(0);
  });

  it("aborts an in-flight embedding call when the budget ends", async () => {
    const controller = new AbortController();
    let embedStarted: () => void = () => undefined;
    const inFlight = new Promise<void>((resolve) => {
      embedStarted = resolve;
    });
    const fetchImpl = vi.fn(async (input: unknown, init?: RequestInit) => {
      if (String(input).includes("oauth2.googleapis.com")) {
        return new Response(
          JSON.stringify({ access_token: "t", expires_in: 3_600 }),
          { status: 200 },
        );
      }
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
        embedStarted();
      });
    });
    const instance = new GeminiEmbedding2Client({
      projectId: "lana-preprod",
      serviceAccount,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const pending = instance.embedCutout(CUTOUT, controller.signal);
    await inFlight;
    controller.abort();
    await expect(pending).rejects.toThrow("GEMINI_EMBEDDING_CANCELLED");
  });

  it("never puts the token, key or vector into an error message", async () => {
    const values = vector(3_072, 0.123456789);
    values[0] = Number.NaN;
    const { instance } = client(() => embeddingResponse(values));
    const error: GeminiEmbedding2Error = await instance
      .embedCutout(CUTOUT, new AbortController().signal)
      .then(() => {
        throw new Error("expected the invalid vector to be rejected");
      })
      .catch((value: unknown) => value as GeminiEmbedding2Error);
    const serialized = `${error.message} ${error.stack ?? ""}`;
    expect(serialized).not.toContain("test-access-token");
    expect(serialized).not.toContain("PRIVATE KEY");
    expect(serialized).not.toContain("0.123456789");
    expect(serialized).not.toContain("Bearer");
    expect(error.message).toBe("GEMINI_EMBEDDING_VALUE_INVALID");
  });

  it("rejects malformed service-account material at construction", () => {
    expect(() => new GeminiEmbedding2Client({
      projectId: "",
      serviceAccount,
    })).toThrow("VERTEX_PROJECT_ID_REQUIRED");
    expect(() => new GeminiEmbedding2Client({
      projectId: "lana-preprod",
      serviceAccount: { email: "not-an-email", privateKey },
    })).toThrow("VERTEX_EMAIL_INVALID");
    expect(() => new GeminiEmbedding2Client({
      projectId: "lana-preprod",
      serviceAccount: { email: serviceAccount.email, privateKey: "nope" },
    })).toThrow("VERTEX_PRIVATE_KEY_INVALID");
  });
});
