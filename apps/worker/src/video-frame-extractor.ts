import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface VideoFrameExtraction {
  readonly durationSeconds: number;
  readonly frames: readonly Uint8Array[];
}

export interface VideoFrameExtractorOptions {
  readonly allowedHostSuffixes: readonly string[];
  readonly maxBytes?: number;
  readonly maxDurationSeconds?: number;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

function safeMediaUrl(value: string, allowedHostSuffixes: readonly string[]): URL {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("VIDEO_URL_FORBIDDEN");
  }
  if (
    hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") ||
    hostname === "::1" || hostname.includes(":") || /^127\./u.test(hostname) ||
    /^10\./u.test(hostname) || /^192\.168\./u.test(hostname) || /^169\.254\./u.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./u.test(hostname) || hostname === "0.0.0.0"
  ) {
    throw new Error("VIDEO_URL_FORBIDDEN");
  }
  const trusted = allowedHostSuffixes.some((suffix) => {
    const normalized = suffix.trim().toLowerCase().replace(/^\./u, "");
    return normalized.length > 0 && (hostname === normalized || hostname.endsWith(`.${normalized}`));
  });
  if (!trusted) throw new Error("VIDEO_HOST_NOT_ALLOWED");
  return url;
}

async function command(
  executable: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [...args], {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("VIDEO_FFMPEG_TIMEOUT"));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(new Error(error.message.includes("ENOENT") ? "FFMPEG_NOT_INSTALLED" : "VIDEO_FFMPEG_FAILED"));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString("utf8"));
      } else {
        const detail = Buffer.concat(stderr).toString("utf8").slice(-300);
        reject(new Error(detail ? `VIDEO_FFMPEG_FAILED:${detail}` : "VIDEO_FFMPEG_FAILED"));
      }
    });
  });
}

export class FfmpegVideoFrameExtractor {
  private readonly fetchImpl: typeof fetch;
  private readonly maxBytes: number;
  private readonly maxDurationSeconds: number;
  private readonly timeoutMs: number;

  constructor(private readonly options: VideoFrameExtractorOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxBytes = options.maxBytes ?? 24 * 1024 * 1024;
    this.maxDurationSeconds = options.maxDurationSeconds ?? 60;
    this.timeoutMs = options.timeoutMs ?? 45_000;
  }

  async extract(videoUrl: string): Promise<VideoFrameExtraction> {
    let url = safeMediaUrl(videoUrl, this.options.allowedHostSuffixes);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let directory = "";
    try {
      let response: Response | null = null;
      for (let redirects = 0; redirects <= 3; redirects += 1) {
        response = await this.fetchImpl(url, { signal: controller.signal, redirect: "manual" });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get("location");
        if (!location || redirects === 3) throw new Error("VIDEO_REDIRECT_INVALID");
        url = safeMediaUrl(new URL(location, url).toString(), this.options.allowedHostSuffixes);
      }
      if (!response?.ok) throw new Error("VIDEO_DOWNLOAD_FAILED");
      const length = Number(response.headers.get("content-length") ?? "0");
      if (length > this.maxBytes) throw new Error("VIDEO_TOO_LARGE");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > this.maxBytes) throw new Error("VIDEO_TOO_LARGE");

      directory = await mkdtemp(join(tmpdir(), "lana-video-"));
      const input = join(directory, "input.bin");
      await writeFile(input, bytes);
      const durationText = await command(
        "ffprobe",
        ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", input],
        this.timeoutMs,
      );
      const durationSeconds = Number(durationText.trim());
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        throw new Error("VIDEO_DURATION_INVALID");
      }
      if (durationSeconds > this.maxDurationSeconds) throw new Error("VIDEO_TOO_LONG");

      const frames: Uint8Array[] = [];
      for (const [index, ratio] of [0.1, 0.5, 0.9].entries()) {
        const output = join(directory, `frame-${index}.jpg`);
        const position = Math.max(0, Math.min(durationSeconds - 0.05, durationSeconds * ratio));
        await command(
          "ffmpeg",
          [
            "-hide_banner", "-loglevel", "error", "-ss", position.toFixed(3),
            "-i", input, "-frames:v", "1", "-vf",
            "scale=min(1024\\,iw):-2:force_original_aspect_ratio=decrease",
            "-q:v", "3", "-y", output,
          ],
          this.timeoutMs,
        );
        frames.push(await readFile(output));
      }
      return { durationSeconds, frames };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("VIDEO_DOWNLOAD_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timer);
      if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

export class HttpVideoFrameExtractorClient {
  constructor(
    private readonly baseUrl: string,
    private readonly accessKey: string,
    private readonly timeoutMs = 60_000,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("MEDIA_WORKER_URL_INVALID");
    }
    if (accessKey.length < 32) throw new Error("MEDIA_WORKER_KEY_INVALID");
  }

  async extract(videoUrl: string): Promise<VideoFrameExtraction> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(
        `${this.baseUrl.replace(/\/$/u, "")}/extract`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.accessKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ videoUrl }),
          signal: controller.signal,
        },
      );
      const body = await response.json().catch(() => null) as {
        durationSeconds?: unknown;
        framesBase64?: unknown;
        errorCode?: unknown;
      } | null;
      if (!response.ok) {
        throw new Error(
          typeof body?.errorCode === "string" ? body.errorCode.slice(0, 128) : "MEDIA_WORKER_FAILED",
        );
      }
      if (
        typeof body?.durationSeconds !== "number" ||
        !Array.isArray(body.framesBase64) ||
        body.framesBase64.length !== 3 ||
        body.framesBase64.some((value) => typeof value !== "string")
      ) {
        throw new Error("MEDIA_WORKER_RESPONSE_INVALID");
      }
      const frames = body.framesBase64.map((value) => Buffer.from(value as string, "base64"));
      if (frames.some((frame) => frame.byteLength === 0 || frame.byteLength > 10 * 1024 * 1024)) {
        throw new Error("MEDIA_WORKER_FRAME_INVALID");
      }
      return { durationSeconds: body.durationSeconds, frames };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("MEDIA_WORKER_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
