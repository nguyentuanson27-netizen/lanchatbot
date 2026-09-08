/**
 * Product Image Recognition V2 — shared image preparation (Phase 1, Task 1.1).
 *
 * Catalog publication and customer recognition must produce vectors in the same
 * space, so both call this one implementation:
 *
 *   decode -> orientation normalization -> bounded resize (max 1024, aspect ratio
 *   preserved, never upscale, never crop) -> canonical PNG -> RemBG `u2netp`
 *   -> ephemeral cutout PNG
 *
 * Canonical preparation is exposed separately from cutout creation because the
 * reranker compares non-cutout evidence: it reuses the already prepared customer
 * image and canonicalizes each winning catalog image without a second RemBG pass.
 *
 * Cutouts are in-memory buffers only. Nothing here writes a file, so there is no
 * cutout to persist, no cutout URL and no cutout bucket.
 */
import { spawn } from "node:child_process";
import {
  RECOGNITION_V2_MAX_IMAGE_DIMENSION,
  RECOGNITION_V2_REMBG_MODEL,
} from "./media-recognition-v2-config.js";

/** Canonical, non-cutout preparation plus ephemeral cutout creation. */
export interface RecognitionImagePipelinePort {
  /** Decode, orient, bound and re-encode as canonical PNG. */
  prepareCanonicalPng(input: Uint8Array, signal: AbortSignal): Promise<Buffer>;
  /** Run RemBG over a canonical PNG and return the ephemeral cutout PNG. */
  createCutoutPng(canonicalPng: Buffer, signal: AbortSignal): Promise<Buffer>;
}

/** Bounded, SSRF-safe retrieval of an untrusted catalog/customer image. */
export interface RecognitionImageDownloadPort {
  download(imageUrl: string, signal: AbortSignal): Promise<Uint8Array>;
}

/** Download + canonical preparation, shared by catalog and customer paths. */
export interface RecognitionImagePreparationPort {
  prepareFromUrl(imageUrl: string, signal: AbortSignal): Promise<Buffer>;
  prepareFromBytes(input: Uint8Array, signal: AbortSignal): Promise<Buffer>;
  createCutoutPng(canonicalPng: Buffer, signal: AbortSignal): Promise<Buffer>;
}

export class RecognitionImageError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "RecognitionImageError";
    this.code = code;
  }
}

const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Header-level dimension reader. Bounding decoded pixels before spawning the
 * decoder keeps a decompression bomb from ever reaching a child process.
 */
export function readImageDimensions(
  bytes: Uint8Array,
): { readonly width: number; readonly height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // PNG: 8-byte signature, then IHDR width/height at offsets 16 and 20.
  if (
    bytes.byteLength >= 24 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  // JPEG: walk the marker segments to the first SOFn frame header.
  if (bytes.byteLength >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.byteLength) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1] ?? 0;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const length = view.getUint16(offset + 2);
      const isFrameHeader =
        (marker >= 0xc0 && marker <= 0xcf) &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrameHeader) {
        return {
          height: view.getUint16(offset + 5),
          width: view.getUint16(offset + 7),
        };
      }
      if (length < 2) return null;
      offset += 2 + length;
    }
    return null;
  }
  // WebP: RIFF container, VP8/VP8L/VP8X chunk carries the canvas size.
  if (
    bytes.byteLength >= 30 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X") {
      return {
        width: 1 + (view.getUint32(24, true) & 0xffffff),
        height: 1 + ((view.getUint32(26, true) >>> 8) & 0xffffff),
      };
    }
    if (chunk === "VP8 ") {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (chunk === "VP8L") {
      const bits = view.getUint32(21, true);
      return {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >>> 14) & 0x3fff),
      };
    }
  }
  return null;
}

/**
 * Canonical ffmpeg arguments for the V2 preparation stage.
 *
 * `-autorotate 1` applies the decoder's orientation side data before scaling.
 * The scale box is `min(max,iw) x min(max,ih)` with
 * `force_original_aspect_ratio=decrease`, which bounds both dimensions, keeps the
 * aspect ratio, and can only shrink — a smaller image fits its own box unchanged.
 * Nothing crops: there is no `crop`, `pad` or `setsar` stage.
 */
export function canonicalFfmpegArguments(maxDimension: number): string[] {
  return [
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-autorotate", "1",
    "-i", "pipe:0",
    "-frames:v", "1",
    "-vf",
    `scale=w='min(${maxDimension},iw)':h='min(${maxDimension},ih)'`
      + ":force_original_aspect_ratio=decrease:flags=lanczos",
    "-pix_fmt", "rgba",
    "-f", "image2pipe",
    "-vcodec", "png",
    "pipe:1",
  ];
}

/**
 * Runtime post-condition on the canonical stage, checked against the bytes the
 * decoder actually produced rather than only against the filter string: both
 * dimensions bounded, nothing upscaled, and the aspect ratio preserved (a crop or
 * a pad would change it). A small tolerance absorbs ffmpeg's integer rounding.
 */
export function assertCanonicalGeometry(
  source: { readonly width: number; readonly height: number },
  output: { readonly width: number; readonly height: number },
  maxDimension: number,
): void {
  if (output.width <= 0 || output.height <= 0) {
    throw new RecognitionImageError("MEDIA_PREPARE_GEOMETRY_INVALID");
  }
  if (output.width > maxDimension || output.height > maxDimension) {
    throw new RecognitionImageError("MEDIA_PREPARE_GEOMETRY_INVALID");
  }
  if (output.width > source.width || output.height > source.height) {
    throw new RecognitionImageError("MEDIA_PREPARE_GEOMETRY_INVALID");
  }
  // An EXIF quarter-turn swaps the axes before scaling, so compare against both
  // the upright and the rotated source ratio.
  const outputRatio = output.width / output.height;
  const upright = source.width / source.height;
  const rotated = source.height / source.width;
  const drift = Math.min(
    Math.abs(outputRatio - upright) / upright,
    Math.abs(outputRatio - rotated) / rotated,
  );
  if (!Number.isFinite(drift) || drift > 0.02) {
    throw new RecognitionImageError("MEDIA_PREPARE_GEOMETRY_INVALID");
  }
}

/** Injectable transcoder so tests can exercise the pipeline without ffmpeg. */
export interface RecognitionImageTranscoder {
  transcode(
    input: Uint8Array,
    args: readonly string[],
    signal: AbortSignal,
    timeoutMs: number,
  ): Promise<Buffer>;
}

/** Default transcoder: one bounded, cancellable ffmpeg child process. */
export class FfmpegRecognitionImageTranscoder implements RecognitionImageTranscoder {
  async transcode(
    input: Uint8Array,
    args: readonly string[],
    signal: AbortSignal,
    timeoutMs: number,
  ): Promise<Buffer> {
    if (signal.aborted) throw new RecognitionImageError("MEDIA_PREPARE_CANCELLED");
    return new Promise<Buffer>((resolve, reject) => {
      const child = spawn("ffmpeg", [...args], {
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let settled = false;
      // Every exit path clears the timer, drops the abort listener and kills the
      // child, so no ffmpeg process outlives the caller's budget.
      const finish = (callback: () => void): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        callback();
      };
      const kill = (): void => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
        }
      };
      const onAbort = (): void => {
        kill();
        finish(() => reject(new RecognitionImageError("MEDIA_PREPARE_CANCELLED")));
      };
      const timer = setTimeout(() => {
        kill();
        finish(() => reject(new RecognitionImageError("MEDIA_PREPARE_TIMEOUT")));
      }, Math.max(250, timeoutMs));
      signal.addEventListener("abort", onAbort, { once: true });
      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.once("error", (error) => {
        kill();
        finish(() => reject(new RecognitionImageError(
          error.message.includes("ENOENT")
            ? "FFMPEG_NOT_INSTALLED"
            : "MEDIA_PREPARE_FAILED",
        )));
      });
      child.once("close", (code) => {
        finish(() => {
          if (code !== 0) {
            // ffmpeg stderr can echo the input; keep it out of the error surface.
            void stderr;
            reject(new RecognitionImageError("MEDIA_PREPARE_FAILED"));
            return;
          }
          const output = Buffer.concat(stdout);
          if (output.byteLength === 0) {
            reject(new RecognitionImageError("MEDIA_PREPARE_EMPTY"));
            return;
          }
          resolve(output);
        });
      });
      child.stdin.once("error", () => undefined);
      child.stdin.end(Buffer.from(input));
    });
  }
}

export interface MediaRecognitionV2ImagePipelineOptions {
  readonly rembgUrl: string;
  readonly rembgModel?: string;
  readonly rembgAuthHeader?: string;
  /** Upper bound on encoded input bytes handed to the decoder. */
  readonly maxBytes?: number;
  /** Upper bound on either declared source dimension. */
  readonly maxSourceDimension?: number;
  /** Upper bound on declared source pixels. */
  readonly maxSourcePixels?: number;
  readonly prepareTimeoutMs?: number;
  readonly rembgTimeoutMs?: number;
  readonly transcoder?: RecognitionImageTranscoder;
  readonly fetchImpl?: typeof fetch;
}

/** The single shared V2 preprocessing implementation. */
export class MediaRecognitionV2ImagePipeline implements RecognitionImagePipelinePort {
  private readonly rembgUrl: URL;
  private readonly rembgModel: string;
  private readonly rembgAuthHeader: string;
  private readonly maxBytes: number;
  private readonly maxSourceDimension: number;
  private readonly maxSourcePixels: number;
  private readonly prepareTimeoutMs: number;
  private readonly rembgTimeoutMs: number;
  private readonly transcoder: RecognitionImageTranscoder;
  private readonly fetchImpl: typeof fetch;

  constructor(options: MediaRecognitionV2ImagePipelineOptions) {
    this.rembgUrl = new URL(options.rembgUrl);
    if (!["http:", "https:"].includes(this.rembgUrl.protocol)) {
      throw new Error("REMBG_URL_INVALID");
    }
    if (this.rembgUrl.username || this.rembgUrl.password) {
      throw new Error("REMBG_URL_INVALID");
    }
    this.rembgModel = options.rembgModel?.trim() || RECOGNITION_V2_REMBG_MODEL;
    this.rembgAuthHeader = options.rembgAuthHeader?.trim() ?? "";
    this.maxBytes = Math.max(64 * 1024, options.maxBytes ?? 12 * 1024 * 1024);
    this.maxSourceDimension = Math.max(
      RECOGNITION_V2_MAX_IMAGE_DIMENSION,
      options.maxSourceDimension ?? 12_000,
    );
    this.maxSourcePixels = Math.max(
      RECOGNITION_V2_MAX_IMAGE_DIMENSION ** 2,
      options.maxSourcePixels ?? 50_000_000,
    );
    this.prepareTimeoutMs = Math.max(250, options.prepareTimeoutMs ?? 8_000);
    this.rembgTimeoutMs = Math.max(250, options.rembgTimeoutMs ?? 15_000);
    this.transcoder = options.transcoder ?? new FfmpegRecognitionImageTranscoder();
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async prepareCanonicalPng(input: Uint8Array, signal: AbortSignal): Promise<Buffer> {
    if (signal.aborted) throw new RecognitionImageError("MEDIA_PREPARE_CANCELLED");
    if (input.byteLength === 0) throw new RecognitionImageError("MEDIA_IMAGE_EMPTY");
    if (input.byteLength > this.maxBytes) {
      throw new RecognitionImageError("MEDIA_IMAGE_TOO_LARGE");
    }
    const dimensions = readImageDimensions(input);
    if (!dimensions) throw new RecognitionImageError("MEDIA_IMAGE_FORMAT_UNSUPPORTED");
    if (
      dimensions.width <= 0 ||
      dimensions.height <= 0 ||
      dimensions.width > this.maxSourceDimension ||
      dimensions.height > this.maxSourceDimension ||
      dimensions.width * dimensions.height > this.maxSourcePixels
    ) {
      throw new RecognitionImageError("MEDIA_IMAGE_DIMENSIONS_INVALID");
    }
    const output = await this.transcoder.transcode(
      input,
      canonicalFfmpegArguments(RECOGNITION_V2_MAX_IMAGE_DIMENSION),
      signal,
      this.prepareTimeoutMs,
    );
    const produced = readImageDimensions(output);
    if (!produced) throw new RecognitionImageError("MEDIA_PREPARE_OUTPUT_INVALID");
    assertCanonicalGeometry(dimensions, produced, RECOGNITION_V2_MAX_IMAGE_DIMENSION);
    return output;
  }

  async createCutoutPng(canonicalPng: Buffer, signal: AbortSignal): Promise<Buffer> {
    if (signal.aborted) throw new RecognitionImageError("MEDIA_CUTOUT_CANCELLED");
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, this.rembgTimeoutMs);
    try {
      const form = new FormData();
      form.append(
        "file",
        new Blob([new Uint8Array(canonicalPng)], { type: "image/png" }),
        "image.png",
      );
      const url = new URL(this.rembgUrl);
      url.searchParams.set("model", this.rembgModel);
      const headers: Record<string, string> = {};
      if (this.rembgAuthHeader) headers.authorization = this.rembgAuthHeader;
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new RecognitionImageError(
          response.status === 429 ? "REMBG_RATE_LIMITED" : "REMBG_FAILED",
        );
      }
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType && !contentType.startsWith("image/")) {
        throw new RecognitionImageError("REMBG_RESPONSE_INVALID");
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > this.maxBytes) {
        throw new RecognitionImageError("REMBG_RESPONSE_INVALID");
      }
      return bytes;
    } catch (error) {
      if (error instanceof RecognitionImageError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new RecognitionImageError(
          signal.aborted ? "MEDIA_CUTOUT_CANCELLED" : "REMBG_TIMEOUT",
        );
      }
      throw new RecognitionImageError("REMBG_FAILED");
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  }
}

export interface SecureRecognitionImageDownloaderOptions {
  readonly allowedHostSuffixes: readonly string[];
  readonly maxBytes?: number;
  readonly maxRedirects?: number;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Validate an untrusted image URL. HTTPS only, no credentials, port 443 only,
 * no localhost/loopback/link-local/private literal, and the host must match the
 * approved suffix allowlist. Used for the initial URL and, again, for every
 * redirect destination before it is followed.
 */
export function safeRecognitionImageUrl(
  value: string,
  allowedHostSuffixes: readonly string[],
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RecognitionImageError("MEDIA_IMAGE_URL_FORBIDDEN");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new RecognitionImageError("MEDIA_IMAGE_URL_FORBIDDEN");
  }
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "::1" ||
    hostname.includes(":") ||
    /^127\./u.test(hostname) ||
    /^10\./u.test(hostname) ||
    /^192\.168\./u.test(hostname) ||
    /^169\.254\./u.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./u.test(hostname) ||
    hostname === "0.0.0.0"
  ) {
    throw new RecognitionImageError("MEDIA_IMAGE_URL_FORBIDDEN");
  }
  const trusted = allowedHostSuffixes.some((suffix) => {
    const normalized = suffix.trim().toLowerCase().replace(/^\./u, "");
    return normalized.length > 0 &&
      (hostname === normalized || hostname.endsWith(`.${normalized}`));
  });
  if (!trusted) throw new RecognitionImageError("MEDIA_IMAGE_HOST_NOT_ALLOWED");
  return url;
}

/** Bounded, allowlisted, cancellable downloader for untrusted image bytes. */
export class SecureRecognitionImageDownloader implements RecognitionImageDownloadPort {
  private readonly allowedHostSuffixes: readonly string[];
  private readonly maxBytes: number;
  private readonly maxRedirects: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SecureRecognitionImageDownloaderOptions) {
    this.allowedHostSuffixes = options.allowedHostSuffixes.filter(
      (value) => value.trim().length > 0,
    );
    if (this.allowedHostSuffixes.length === 0) {
      throw new Error("MEDIA_IMAGE_ALLOWED_HOSTS_REQUIRED");
    }
    this.maxBytes = Math.max(64 * 1024, options.maxBytes ?? 10 * 1024 * 1024);
    this.maxRedirects = Math.max(0, Math.min(5, options.maxRedirects ?? 3));
    this.timeoutMs = Math.max(250, options.timeoutMs ?? 8_000);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async download(imageUrl: string, signal: AbortSignal): Promise<Uint8Array> {
    if (signal.aborted) throw new RecognitionImageError("MEDIA_IMAGE_DOWNLOAD_CANCELLED");
    let url = safeRecognitionImageUrl(imageUrl, this.allowedHostSuffixes);
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, this.timeoutMs);
    try {
      let response: Response | null = null;
      for (let redirects = 0; redirects <= this.maxRedirects; redirects += 1) {
        response = await this.fetchImpl(url, {
          signal: controller.signal,
          redirect: "manual",
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get("location");
        if (!location || redirects === this.maxRedirects) {
          throw new RecognitionImageError("MEDIA_IMAGE_REDIRECT_INVALID");
        }
        // The destination is validated before it is ever requested.
        url = safeRecognitionImageUrl(
          new URL(location, url).toString(),
          this.allowedHostSuffixes,
        );
      }
      if (!response?.ok) throw new RecognitionImageError("MEDIA_IMAGE_DOWNLOAD_FAILED");
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      const mime = contentType.split(";")[0]?.trim() ?? "";
      if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(mime)) {
        throw new RecognitionImageError("MEDIA_IMAGE_CONTENT_TYPE_INVALID");
      }
      const declaredLength = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(declaredLength) && declaredLength > this.maxBytes) {
        throw new RecognitionImageError("MEDIA_IMAGE_TOO_LARGE");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0) {
        throw new RecognitionImageError("MEDIA_IMAGE_EMPTY");
      }
      if (bytes.byteLength > this.maxBytes) {
        throw new RecognitionImageError("MEDIA_IMAGE_TOO_LARGE");
      }
      return bytes;
    } catch (error) {
      if (error instanceof RecognitionImageError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new RecognitionImageError(
          signal.aborted
            ? "MEDIA_IMAGE_DOWNLOAD_CANCELLED"
            : "MEDIA_IMAGE_DOWNLOAD_TIMEOUT",
        );
      }
      throw new RecognitionImageError("MEDIA_IMAGE_DOWNLOAD_FAILED");
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  }
}

/**
 * Download + canonical preparation + cutout, composed once and injected into both
 * the catalog publisher and the realtime recognition service.
 */
export class MediaRecognitionV2Preparer implements RecognitionImagePreparationPort {
  constructor(
    private readonly downloader: RecognitionImageDownloadPort,
    private readonly pipeline: RecognitionImagePipelinePort,
  ) {}

  async prepareFromUrl(imageUrl: string, signal: AbortSignal): Promise<Buffer> {
    return this.pipeline.prepareCanonicalPng(
      await this.downloader.download(imageUrl, signal),
      signal,
    );
  }

  async prepareFromBytes(input: Uint8Array, signal: AbortSignal): Promise<Buffer> {
    return this.pipeline.prepareCanonicalPng(input, signal);
  }

  async createCutoutPng(canonicalPng: Buffer, signal: AbortSignal): Promise<Buffer> {
    return this.pipeline.createCutoutPng(canonicalPng, signal);
  }
}
