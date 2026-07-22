import { createHash } from "node:crypto";
import {
  ProductSearchService,
  type MediaProductSearchResult,
  type ProductSearchResult,
} from "@lana/business-tools";
import { createClient } from "redis";

function urlFingerprint(value: string): string {
  const url = new URL(value);
  return createHash("sha256")
    .update("url:v1\0")
    .update(url.toString())
    .digest("hex");
}

function bytesFingerprint(value: Uint8Array): string {
  return createHash("sha256")
    .update("bytes:v1\0")
    .update(value)
    .digest("hex");
}

function cacheable(value: MediaProductSearchResult): boolean {
  return value.status !== "ERROR";
}

function cachedResult(value: string | null): MediaProductSearchResult | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<MediaProductSearchResult>;
    if (
      parsed.status === "MATCHED" || parsed.status === "AMBIGUOUS" ||
      parsed.status === "NOT_FOUND"
    ) {
      return parsed as MediaProductSearchResult;
    }
  } catch {
    // Ignore malformed/old cache values and refresh from the source.
  }
  return null;
}

export class RedisCachedProductSearch {
  private readonly client: ReturnType<typeof createClient>;

  constructor(
    redisUrl: string,
    private readonly inner: ProductSearchService,
    private readonly ttlSeconds = 7 * 24 * 60 * 60,
    private readonly namespace = "catalog-v2",
  ) {
    if (!redisUrl.trim()) throw new Error("REDIS_URL_REQUIRED");
    if (ttlSeconds < 60 || ttlSeconds > 30 * 24 * 60 * 60) {
      throw new Error("MEDIA_SEARCH_CACHE_TTL_INVALID");
    }
    this.client = createClient({ url: redisUrl });
    this.client.on("error", () => undefined);
  }

  private async connected(): Promise<void> {
    if (!this.client.isOpen) await this.client.connect();
  }

  private key(fingerprint: string): string {
    const namespace = createHash("sha256")
      .update(this.namespace)
      .digest("hex")
      .slice(0, 16);
    return `media-search:v1:${namespace}:${fingerprint}`;
  }

  async ready(): Promise<boolean> {
    try {
      await this.connected();
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  searchText(query: string): Promise<ProductSearchResult> {
    return this.inner.searchText(query);
  }

  async searchImage(imageUrl: string): Promise<ProductSearchResult> {
    const result = (await this.searchImages([imageUrl]))[0];
    if (!result || result.status === "ERROR") {
      throw new Error(result?.reasonCode ?? "IMAGE_SEARCH_RESULT_MISSING");
    }
    return result;
  }

  async searchImages(
    imageUrls: readonly string[],
    concurrency = 3,
  ): Promise<readonly MediaProductSearchResult[]> {
    await this.connected();
    const urls = imageUrls.slice(0, 10).map((value) => new URL(value).toString());
    const keys = urls.map((value) => this.key(urlFingerprint(value)));
    const values = keys.length > 0 ? await this.client.mGet(keys) : [];
    const output: (MediaProductSearchResult | null)[] = values.map(cachedResult);
    const missing = output
      .map((value, index) => value === null ? index : -1)
      .filter((index) => index >= 0);
    if (missing.length > 0) {
      const fresh = await this.inner.searchImages(
        missing.map((index) => urls[index] as string),
        concurrency,
      ).catch((error: unknown) => missing.map(() => ({
        status: "ERROR" as const,
        reasonCode: error instanceof Error ? error.message.slice(0, 128) : "IMAGE_BATCH_SEARCH_FAILED",
      })));
      for (let position = 0; position < missing.length; position += 1) {
        const index = missing[position] as number;
        const result = fresh[position] ?? {
          status: "ERROR" as const,
          reasonCode: "IMAGE_SEARCH_RESULT_MISSING",
        };
        output[index] = result;
        if (cacheable(result)) {
          await this.client.set(keys[index] as string, JSON.stringify(result), {
            EX: this.ttlSeconds,
          });
        }
      }
    }
    return output.map((value) => value ?? ({
      status: "ERROR" as const,
      reasonCode: "IMAGE_SEARCH_RESULT_MISSING",
    }));
  }

  async searchImageBytes(imageBytes: Uint8Array): Promise<MediaProductSearchResult> {
    await this.connected();
    const key = this.key(bytesFingerprint(imageBytes));
    const existing = cachedResult(await this.client.get(key));
    if (existing) return existing;
    const result = await this.inner.searchImageBytes(imageBytes);
    if (cacheable(result)) {
      await this.client.set(key, JSON.stringify(result), { EX: this.ttlSeconds });
    }
    return result;
  }

  async close(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }
}
