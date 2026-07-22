import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { FfmpegVideoFrameExtractor } from "./video-frame-extractor.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function boundedInteger(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name}_INVALID`);
  return value;
}

function secret(): string {
  const direct = process.env.MEDIA_WORKER_KEY?.trim();
  const value = direct || readFileSync(required("MEDIA_WORKER_KEY_FILE"), "utf8").trim();
  if (value.length < 32) throw new Error("MEDIA_WORKER_KEY_INVALID");
  return value;
}

function authorized(header: string | undefined, expected: string): boolean {
  const value = header?.startsWith("Bearer ") ? header.slice(7) : "";
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

const accessKey = secret();
const extractor = new FfmpegVideoFrameExtractor({
  allowedHostSuffixes: (process.env.PRODUCT_SEARCH_ALLOWED_IMAGE_HOSTS ?? "fbcdn.net,fbsbx.com,content.pancake.vn")
    .split(",").map((value) => value.trim()).filter(Boolean),
  maxBytes: boundedInteger("VIDEO_MAX_BYTES", 24 * 1024 * 1024, 1024 * 1024, 30 * 1024 * 1024),
  maxDurationSeconds: boundedInteger("VIDEO_MAX_DURATION_SECONDS", 60, 5, 60),
  timeoutMs: boundedInteger("VIDEO_PROCESSING_TIMEOUT_MS", 45_000, 5_000, 120_000),
});
const port = boundedInteger("PORT", 8090, 1, 65535);

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"status":"ok"}');
    return;
  }
  if (request.method !== "POST" || request.url !== "/extract") {
    response.writeHead(404).end();
    return;
  }
  if (!authorized(request.headers.authorization, accessKey)) {
    response.writeHead(401).end();
    return;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of request) {
      const value = Buffer.from(chunk);
      size += value.byteLength;
      if (size > 16 * 1024) throw new Error("MEDIA_REQUEST_TOO_LARGE");
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { videoUrl?: unknown };
    if (typeof body.videoUrl !== "string") throw new Error("VIDEO_URL_REQUIRED");
    const result = await extractor.extract(body.videoUrl);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      durationSeconds: result.durationSeconds,
      framesBase64: result.frames.map((frame) => Buffer.from(frame).toString("base64")),
    }));
  } catch (error) {
    response.writeHead(422, { "content-type": "application/json" });
    response.end(JSON.stringify({
      errorCode: error instanceof Error ? error.message.slice(0, 128) : "MEDIA_WORKER_FAILED",
    }));
  }
});

server.listen(port, "0.0.0.0");
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
