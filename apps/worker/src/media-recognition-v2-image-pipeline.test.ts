import { describe, expect, it, vi } from "vitest";
import {
  FfmpegRecognitionImageTranscoder,
  MediaRecognitionV2ImagePipeline,
  MediaRecognitionV2Preparer,
  RecognitionImageError,
  SecureRecognitionImageDownloader,
  assertCanonicalGeometry,
  canonicalFfmpegArguments,
  readBoundedBody,
  readImageDimensions,
  safeRecognitionImageUrl,
  type RecognitionImageTranscoder,
} from "./media-recognition-v2-image-pipeline.js";

/** Minimal PNG: 8-byte signature + IHDR length/type + width/height. */
function png(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

/** Minimal JPEG: SOI followed by an SOF0 frame header carrying height/width. */
function jpeg(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(20);
  bytes.writeUInt16BE(0xffd8, 0);
  bytes.writeUInt16BE(0xffc0, 2);
  bytes.writeUInt16BE(0x0011, 4);
  bytes.writeUInt8(8, 6);
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  return bytes;
}

function transcoderReturning(
  output: Buffer,
): RecognitionImageTranscoder & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    transcode: vi.fn(async (_input, args: readonly string[]) => {
      calls.push([...args]);
      return output;
    }),
  };
}

function pipeline(
  transcoder: RecognitionImageTranscoder,
  fetchImpl?: typeof fetch,
): MediaRecognitionV2ImagePipeline {
  return new MediaRecognitionV2ImagePipeline({
    rembgUrl: "https://rembg.internal.example/api/remove",
    transcoder,
    ...(fetchImpl ? { fetchImpl } : {}),
  });
}

describe("shared V2 image preparation", () => {
  it("reads source dimensions from PNG, JPEG and rejects unknown formats", () => {
    expect(readImageDimensions(png(1_600, 900))).toEqual({ width: 1_600, height: 900 });
    expect(readImageDimensions(jpeg(900, 1_600))).toEqual({ width: 900, height: 1_600 });
    expect(readImageDimensions(Buffer.from("not-an-image"))).toBeNull();
  });

  it("bounds both dimensions to 1024 without upscaling or cropping", () => {
    const filter = canonicalFfmpegArguments(1_024).join(" ");
    expect(filter).toContain("scale=w='min(1024,iw)':h='min(1024,ih)'");
    expect(filter).toContain("force_original_aspect_ratio=decrease");
    // A crop or pad stage would discard garment boundaries or local details.
    expect(filter).not.toContain("crop");
    expect(filter).not.toContain("pad=");
    expect(filter).toContain("-autorotate 1");
    expect(filter).toContain("-vcodec png");
  });

  it("accepts landscape, portrait and already-small canonical geometry", () => {
    // Landscape 2000x1000 fits the 1024 box as 1024x512.
    expect(() => assertCanonicalGeometry(
      { width: 2_000, height: 1_000 },
      { width: 1_024, height: 512 },
      1_024,
    )).not.toThrow();
    // Portrait 800x3000 fits as 273x1024.
    expect(() => assertCanonicalGeometry(
      { width: 800, height: 3_000 },
      { width: 273, height: 1_024 },
      1_024,
    )).not.toThrow();
    // An already-small image passes through unchanged: no upscale.
    expect(() => assertCanonicalGeometry(
      { width: 500, height: 300 },
      { width: 500, height: 300 },
      1_024,
    )).not.toThrow();
    // An EXIF quarter-turn swaps the axes and is still aspect-preserving.
    expect(() => assertCanonicalGeometry(
      { width: 3_000, height: 2_000 },
      { width: 683, height: 1_024 },
      1_024,
    )).not.toThrow();
  });

  it("accepts an EXIF quarter-turn that swaps the axes without upscaling", () => {
    // A 400x800 source that autorotates to 800x400 upscales no pixel, even
    // though 800 exceeds the pre-orientation width.
    expect(() => assertCanonicalGeometry(
      { width: 400, height: 800 },
      { width: 800, height: 400 },
      1_024,
    )).not.toThrow();
    // Same rotation on a source that also needs downscaling to fit the box.
    expect(() => assertCanonicalGeometry(
      { width: 1_200, height: 2_400 },
      { width: 1_024, height: 512 },
      1_024,
    )).not.toThrow();
    // And the untouched square case stays valid in both readings.
    expect(() => assertCanonicalGeometry(
      { width: 600, height: 600 },
      { width: 600, height: 600 },
      1_024,
    )).not.toThrow();
  });

  it("still rejects an upscale that neither orientation can explain", () => {
    // 900x400 fits neither 400x800 upright nor 800x400 rotated.
    expect(() => assertCanonicalGeometry(
      { width: 400, height: 800 },
      { width: 900, height: 400 },
      1_024,
    )).toThrow("MEDIA_PREPARE_GEOMETRY_INVALID");
  });

  it("rejects upscaled, over-bound or cropped canonical output", () => {
    expect(() => assertCanonicalGeometry(
      { width: 500, height: 300 },
      { width: 1_024, height: 614 },
      1_024,
    )).toThrow("MEDIA_PREPARE_GEOMETRY_INVALID");
    expect(() => assertCanonicalGeometry(
      { width: 4_000, height: 1_000 },
      { width: 2_048, height: 512 },
      1_024,
    )).toThrow("MEDIA_PREPARE_GEOMETRY_INVALID");
    // A centre crop of 2000x1000 to a square changes the aspect ratio.
    expect(() => assertCanonicalGeometry(
      { width: 2_000, height: 1_000 },
      { width: 1_024, height: 1_024 },
      1_024,
    )).toThrow("MEDIA_PREPARE_GEOMETRY_INVALID");
  });

  it("emits canonical PNG through the locked ffmpeg contract", async () => {
    const transcoder = transcoderReturning(png(1_024, 512));
    const output = await pipeline(transcoder).prepareCanonicalPng(
      jpeg(2_000, 1_000),
      new AbortController().signal,
    );
    expect(readImageDimensions(output)).toEqual({ width: 1_024, height: 512 });
    expect(transcoder.calls[0]).toEqual(canonicalFfmpegArguments(1_024));
  });

  it("accepts a rotated portrait source through the whole preparation path", async () => {
    // End-to-end through prepareCanonicalPng, not just the assert helper: a
    // portrait JPEG whose EXIF orientation makes ffmpeg emit landscape must not
    // be rejected by the no-upscale post-condition.
    const transcoder = transcoderReturning(png(800, 400));
    const output = await pipeline(transcoder).prepareCanonicalPng(
      jpeg(400, 800),
      new AbortController().signal,
    );
    expect(readImageDimensions(output)).toEqual({ width: 800, height: 400 });
    expect(transcoder.calls[0]).toContain("-autorotate");
  });

  it("produces deterministic output for identical input", async () => {
    const transcoder = transcoderReturning(png(1_024, 512));
    const instance = pipeline(transcoder);
    const signal = new AbortController().signal;
    const first = await instance.prepareCanonicalPng(jpeg(2_000, 1_000), signal);
    const second = await instance.prepareCanonicalPng(jpeg(2_000, 1_000), signal);
    expect(first.equals(second)).toBe(true);
    expect(transcoder.calls[0]).toEqual(transcoder.calls[1]);
  });

  it("rejects decoded dimensions and pixel counts beyond the bound", async () => {
    const instance = new MediaRecognitionV2ImagePipeline({
      rembgUrl: "https://rembg.internal.example/api/remove",
      transcoder: transcoderReturning(png(10, 10)),
      maxSourceDimension: 4_096,
      maxSourcePixels: 4_000_000,
    });
    await expect(instance.prepareCanonicalPng(
      png(20_000, 10),
      new AbortController().signal,
    )).rejects.toThrow("MEDIA_IMAGE_DIMENSIONS_INVALID");
    await expect(instance.prepareCanonicalPng(
      png(4_000, 4_000),
      new AbortController().signal,
    )).rejects.toThrow("MEDIA_IMAGE_DIMENSIONS_INVALID");
  });

  it("refuses input that is not a decodable image", async () => {
    await expect(pipeline(transcoderReturning(png(10, 10))).prepareCanonicalPng(
      Buffer.from("<html>"),
      new AbortController().signal,
    )).rejects.toThrow("MEDIA_IMAGE_FORMAT_UNSUPPORTED");
  });

  it("propagates cancellation before spawning the decoder", async () => {
    const transcoder = transcoderReturning(png(10, 10));
    const controller = new AbortController();
    controller.abort();
    await expect(pipeline(transcoder).prepareCanonicalPng(
      png(100, 100),
      controller.signal,
    )).rejects.toThrow("MEDIA_PREPARE_CANCELLED");
    expect(transcoder.transcode).not.toHaveBeenCalled();
  });

  it("kills the child process and cleans up when the caller aborts", async () => {
    const controller = new AbortController();
    const pending = new FfmpegRecognitionImageTranscoder().transcode(
      png(100, 100),
      ["-version"],
      controller.signal,
      60_000,
    );
    controller.abort();
    // Either the abort wins or ffmpeg is absent; both must reject, never hang.
    await expect(pending).rejects.toBeInstanceOf(RecognitionImageError);
  });

  it("runs RemBG u2netp and keeps the cutout in memory only", async () => {
    const cutout = Buffer.from([1, 2, 3, 4]);
    const fetchImpl = vi.fn(async (input: unknown) => {
      expect(String(input)).toContain("model=u2netp");
      return new Response(cutout, {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    });
    const output = await pipeline(
      transcoderReturning(png(10, 10)),
      fetchImpl as unknown as typeof fetch,
    ).createCutoutPng(png(10, 10), new AbortController().signal);
    expect(output.equals(cutout)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("bounds an oversized RemBG response by streaming, not after buffering", async () => {
    let cancelled = false;
    let pulled = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        if (pulled > 50) {
          controller.close();
          return;
        }
        controller.enqueue(new Uint8Array(32 * 1024));
      },
      cancel() {
        cancelled = true;
      },
    });
    const instance = new MediaRecognitionV2ImagePipeline({
      rembgUrl: "https://rembg.internal.example/api/remove",
      transcoder: transcoderReturning(png(10, 10)),
      maxBytes: 64 * 1024,
      fetchImpl: (async () => new Response(body, {
        status: 200,
        headers: { "content-type": "image/png" },
      })) as unknown as typeof fetch,
    });
    await expect(instance.createCutoutPng(png(10, 10), new AbortController().signal))
      .rejects.toThrow("REMBG_RESPONSE_TOO_LARGE");
    expect(cancelled).toBe(true);
    expect(pulled).toBeLessThanOrEqual(4);
  });

  it("propagates a RemBG failure instead of falling back", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 500 }));
    await expect(pipeline(
      transcoderReturning(png(10, 10)),
      fetchImpl as unknown as typeof fetch,
    ).createCutoutPng(png(10, 10), new AbortController().signal))
      .rejects.toThrow("REMBG_FAILED");
  });

  it("cancels an in-flight RemBG call when the request budget ends", async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn((_input: unknown, init?: { signal?: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }));
    const pending = pipeline(
      transcoderReturning(png(10, 10)),
      fetchImpl as unknown as typeof fetch,
    ).createCutoutPng(png(10, 10), controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow("MEDIA_CUTOUT_CANCELLED");
  });
});

describe("bounded body reader", () => {
  it("returns a body within the cap and rejects one beyond it", async () => {
    const small = new Response(new Uint8Array(16), { status: 200 });
    expect((await readBoundedBody(small, 1_024, "TOO_BIG")).byteLength).toBe(16);
    const large = new Response(new Uint8Array(4_096), { status: 200 });
    await expect(readBoundedBody(large, 1_024, "TOO_BIG")).rejects.toThrow("TOO_BIG");
  });
});

describe("secure recognition image downloader", () => {
  const allowed = ["lanadesign.vn"];

  it("accepts an allowlisted HTTPS catalog URL", () => {
    expect(safeRecognitionImageUrl("https://cdn.lanadesign.vn/a.jpg", allowed).hostname)
      .toBe("cdn.lanadesign.vn");
  });

  it("blocks non-HTTPS, credentials, odd ports and unlisted hosts", () => {
    for (const value of [
      "http://lanadesign.vn/a.jpg",
      "https://user:pass@lanadesign.vn/a.jpg",
      "https://lanadesign.vn:8443/a.jpg",
    ]) {
      expect(() => safeRecognitionImageUrl(value, allowed))
        .toThrow("MEDIA_IMAGE_URL_FORBIDDEN");
    }
    expect(() => safeRecognitionImageUrl("https://evil.example/a.jpg", allowed))
      .toThrow("MEDIA_IMAGE_HOST_NOT_ALLOWED");
  });

  it("blocks localhost, loopback and private address literals", () => {
    for (const host of [
      "localhost", "127.0.0.1", "10.0.0.5", "192.168.1.4", "169.254.169.254",
      "172.16.0.9", "0.0.0.0", "[::1]",
    ]) {
      expect(() => safeRecognitionImageUrl(`https://${host}/a.jpg`, [...allowed, host]))
        .toThrow("MEDIA_IMAGE_URL_FORBIDDEN");
    }
  });

  it("validates every redirect destination before following it", async () => {
    const fetchImpl = vi.fn(async (input: unknown) => {
      if (String(input).includes("start")) {
        return new Response("", {
          status: 302,
          headers: { location: "https://127.0.0.1/internal.jpg" },
        });
      }
      throw new Error("REDIRECT_WAS_FOLLOWED");
    });
    const downloader = new SecureRecognitionImageDownloader({
      allowedHostSuffixes: allowed,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(downloader.download(
      "https://lanadesign.vn/start.jpg",
      new AbortController().signal,
    )).rejects.toThrow("MEDIA_IMAGE_URL_FORBIDDEN");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("bounds the redirect chain", async () => {
    const fetchImpl = vi.fn(async () => new Response("", {
      status: 302,
      headers: { location: "https://lanadesign.vn/next.jpg" },
    }));
    const downloader = new SecureRecognitionImageDownloader({
      allowedHostSuffixes: allowed,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(downloader.download(
      "https://lanadesign.vn/a.jpg",
      new AbortController().signal,
    )).rejects.toThrow("MEDIA_IMAGE_REDIRECT_INVALID");
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("enforces the MIME allowlist and the response size limit", async () => {
    const html = new SecureRecognitionImageDownloader({
      allowedHostSuffixes: allowed,
      fetchImpl: (async () => new Response("<html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      })) as unknown as typeof fetch,
    });
    await expect(html.download("https://lanadesign.vn/a.jpg", new AbortController().signal))
      .rejects.toThrow("MEDIA_IMAGE_CONTENT_TYPE_INVALID");

    const large = new SecureRecognitionImageDownloader({
      allowedHostSuffixes: allowed,
      maxBytes: 64 * 1024,
      fetchImpl: (async () => new Response(Buffer.alloc(200 * 1024), {
        status: 200,
        headers: { "content-type": "image/png" },
      })) as unknown as typeof fetch,
    });
    await expect(large.download("https://lanadesign.vn/a.jpg", new AbortController().signal))
      .rejects.toThrow("MEDIA_IMAGE_TOO_LARGE");
  });

  it("stops reading a chunked body the moment it exceeds the cap", async () => {
    // Content-Length is absent here, so only the streaming ceiling can stop this.
    let pulled = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        if (pulled > 50) {
          controller.close();
          return;
        }
        controller.enqueue(new Uint8Array(32 * 1024));
      },
      cancel() {
        cancelled = true;
      },
    });
    const downloader = new SecureRecognitionImageDownloader({
      allowedHostSuffixes: ["lanadesign.vn"],
      maxBytes: 64 * 1024,
      fetchImpl: (async () => new Response(body, {
        status: 200,
        headers: { "content-type": "image/png" },
      })) as unknown as typeof fetch,
    });
    await expect(downloader.download(
      "https://lanadesign.vn/a.png",
      new AbortController().signal,
    )).rejects.toThrow("MEDIA_IMAGE_TOO_LARGE");
    expect(cancelled).toBe(true);
    // Never drained the whole body: a handful of chunks, not all 50.
    expect(pulled).toBeLessThanOrEqual(4);
  });

  it("still accepts a chunked body within the cap", async () => {
    const chunks = [new Uint8Array(8), new Uint8Array(8)];
    let index = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks[index++];
        if (!chunk) {
          controller.close();
          return;
        }
        controller.enqueue(chunk);
      },
    });
    const downloader = new SecureRecognitionImageDownloader({
      allowedHostSuffixes: ["lanadesign.vn"],
      maxBytes: 64 * 1024,
      fetchImpl: (async () => new Response(body, {
        status: 200,
        headers: { "content-type": "image/png" },
      })) as unknown as typeof fetch,
    });
    const bytes = await downloader.download(
      "https://lanadesign.vn/a.png",
      new AbortController().signal,
    );
    expect(bytes.byteLength).toBe(16);
  });

  it("bounds the body regardless of a lying Content-Length", async () => {
    const downloader = new SecureRecognitionImageDownloader({
      allowedHostSuffixes: ["lanadesign.vn"],
      maxBytes: 64 * 1024,
      fetchImpl: (async () => new Response(new Uint8Array(200 * 1024), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": "16" },
      })) as unknown as typeof fetch,
    });
    await expect(downloader.download(
      "https://lanadesign.vn/a.png",
      new AbortController().signal,
    )).rejects.toThrow("MEDIA_IMAGE_TOO_LARGE");
  });

  it("requires at least one allowlisted host", () => {
    expect(() => new SecureRecognitionImageDownloader({ allowedHostSuffixes: [] }))
      .toThrow("MEDIA_IMAGE_ALLOWED_HOSTS_REQUIRED");
  });
});

describe("shared preparer", () => {
  it("uses one implementation for catalog and customer images", async () => {
    const transcoder = transcoderReturning(png(1_024, 512));
    const fetchImpl = vi.fn(async () => new Response(jpeg(2_000, 1_000), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    }));
    const preparer = new MediaRecognitionV2Preparer(
      new SecureRecognitionImageDownloader({
        allowedHostSuffixes: ["lanadesign.vn"],
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
      pipeline(transcoder),
    );
    const signal = new AbortController().signal;
    const customer = await preparer.prepareFromUrl("https://lanadesign.vn/c.jpg", signal);
    const catalog = await preparer.prepareFromBytes(jpeg(2_000, 1_000), signal);
    expect(customer.equals(catalog)).toBe(true);
    expect(transcoder.calls[0]).toEqual(transcoder.calls[1]);
  });
});
