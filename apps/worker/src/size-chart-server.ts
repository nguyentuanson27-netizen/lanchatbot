import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { PostgresSizeChartExtractionStore } from "@lana/database";
import { GoogleSheetsClient } from "./google-sheets-client.js";
import {
  IMAGE_REGISTRY_HEADERS,
  IMAGE_REGISTRY_SHEET,
} from "./p23b-metadata-staging.js";
import { FfmpegImagePipeline } from "./p23c-publisher.js";
import {
  SizeChartExtractionRunner,
  VertexSizeChartVisionClient,
  type SizeChartRegistryRow,
} from "./size-chart-extractor.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function secret(directName: string, fileName: string): string {
  const direct = process.env[directName]?.trim();
  return direct || readFileSync(required(fileName), "utf8").trim();
}

function boundedInt(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isFinite(parsed)
    ? Math.max(min, Math.min(max, Math.trunc(parsed)))
    : fallback;
}

const log = (level: "info" | "error", context: Record<string, unknown>, msg: string): void => {
  process.stdout.write(`${JSON.stringify({
    level,
    time: new Date().toISOString(),
    service: "size-chart-extractor",
    ...context,
    msg,
  })}\n`);
};

function tokenProvider(email: string, privateKey: string): () => Promise<string> {
  let cached: { value: string; expiresAt: number } | null = null;
  return async () => {
    if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.value;
    const issuedAt = Math.floor(Date.now() / 1_000);
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3_600,
    })).toString("base64url");
    const unsigned = `${header}.${payload}`;
    const signature = createSign("RSA-SHA256").update(unsigned).end()
      .sign(privateKey.trim().replace(/^=+/u, "").replace(/\\n/gu, "\n"), "base64url");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsigned}.${signature}`,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await response.json().catch(() => null)) as {
      access_token?: string;
      expires_in?: number;
    } | null;
    if (!response.ok || !body?.access_token) throw new Error("VERTEX_TOKEN_FAILED");
    cached = {
      value: body.access_token,
      expiresAt: Date.now() + Math.max(60, Number(body.expires_in ?? 3_600)) * 1_000,
    };
    return cached.value;
  };
}

async function main(): Promise<void> {
  const sheetId = required("DATA_INGESTION_V2_SHEET_ID");
  const credential = JSON.parse(
    secret("GOOGLE_SHEETS_CREDENTIAL", "GOOGLE_SHEETS_CREDENTIAL_FILE"),
  ) as { email?: unknown; privateKey?: unknown };
  if (typeof credential.email !== "string" || typeof credential.privateKey !== "string") {
    throw new Error("GOOGLE_SHEETS_CREDENTIAL_INVALID");
  }
  const sheets = new GoogleSheetsClient({
    serviceAccount: { email: credential.email, privateKey: credential.privateKey },
  });
  const store = new PostgresSizeChartExtractionStore(
    secret("DATABASE_URL", "DATABASE_URL_FILE"),
  );
  const model = process.env.SIZE_CHART_MODEL?.trim() || "gemini-3.1-flash-lite";
  const extractionVersion =
    process.env.SIZE_CHART_EXTRACTION_VERSION?.trim() || "size-chart-v1.0.0";
  const maximumRows = boundedInt("SIZE_CHART_MAX_ROWS", 0, 0, 10_000);
  const runner = new SizeChartExtractionRunner({
    rows: async () => {
      const range = `${IMAGE_REGISTRY_SHEET}!A:AP`;
      const [sheet] = await sheets.batchGetValues(sheetId, [range], "UNFORMATTED_VALUE");
      const rows = sheet?.values ?? [];
      const headers = (rows[0] ?? []).map(String);
      return rows.slice(1).map((values) =>
        Object.fromEntries(IMAGE_REGISTRY_HEADERS.map((header, index) => [
          header,
          String(values[headers.indexOf(header) >= 0 ? headers.indexOf(header) : index] ?? ""),
        ])) as unknown as SizeChartRegistryRow
      );
    },
    images: new FfmpegImagePipeline({
      maxBytes: boundedInt("SIZE_CHART_IMAGE_MAX_BYTES", 12_582_912, 1_048_576, 33_554_432),
      maxWidth: boundedInt("SIZE_CHART_IMAGE_MAX_WIDTH", 1_600, 512, 4_096),
      rembgUrl: "http://127.0.0.1:0/unused",
      rembgAuthHeader: "",
    }),
    vision: new VertexSizeChartVisionClient({
      projectId: required("VERTEX_PROJECT_ID"),
      location: process.env.SIZE_CHART_MODEL_LOCATION?.trim() || "global",
      model,
      token: tokenProvider(credential.email, credential.privateKey),
    }),
    store,
    extractionVersion,
    minimumConfidence: Number(process.env.SIZE_CHART_MIN_CONFIDENCE ?? 0.75),
    concurrency: boundedInt("SIZE_CHART_CONCURRENCY", 1, 1, 4),
    maximumRows: maximumRows === 0 ? null : maximumRows,
  });

  const intervalMs = boundedInt("SIZE_CHART_INTERVAL_MS", 86_400_000, 300_000, 86_400_000);
  const retryMs = boundedInt("SIZE_CHART_ERROR_RETRY_MS", 300_000, 60_000, 3_600_000);
  let stopping = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const run = async (): Promise<void> => {
    if (stopping) return;
    let delay = intervalMs;
    try {
      const summary = await runner.run();
      log("info", { summary }, "size chart extraction cycle finished");
    } catch (error) {
      delay = retryMs;
      log("error", {
        error: error instanceof Error ? error.message : String(error),
      }, "size chart extraction cycle failed");
    }
    if (!stopping) timer = setTimeout(() => void run(), delay);
  };
  const stop = async (): Promise<void> => {
    stopping = true;
    if (timer) clearTimeout(timer);
    await store.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop());
  process.on("SIGINT", () => void stop());
  await run();
}

main().catch((error) => {
  log("error", { error: error instanceof Error ? error.message : String(error) }, "fatal");
  process.exit(1);
});
