import {
  stageSizeChartFromImageRegistry,
  type ExtractedSizeChartData,
} from "@lana/business-tools";
import {
  AdminArtifactContentV1Schema,
  type ProductComponentRole,
  type MeasurementKind,
  type SizeChartV1,
} from "@lana/contracts";
import type { PostgresSizeChartExtractionStore } from "@lana/database";
import type { ImagePipeline } from "./p23c-publisher.js";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    measurement_basis: { type: "STRING", enum: ["BODY", "GARMENT", "UNKNOWN"] },
    brand: { type: "STRING" },
    category: { type: "STRING" },
    component_role: {
      type: "STRING",
      enum: ["TOP", "SKIRT", "PANTS", "DRESS", "JACKET", "ACCESSORY", "OTHER", "NONE"],
    },
    boundary_policy: {
      type: "STRING",
      enum: ["REQUIRE_HUMAN_REVIEW", "PREFER_SMALLER_SIZE", "PREFER_LARGER_SIZE"],
    },
    confidence: { type: "NUMBER" },
    bands: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          size: { type: "STRING" },
          ranges: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                kind: {
                  type: "STRING",
                  enum: ["HEIGHT_CM", "WEIGHT_KG", "BUST_CM", "WAIST_CM", "HIPS_CM"],
                },
                min_inclusive: { type: "NUMBER", nullable: true },
                max_inclusive: { type: "NUMBER", nullable: true },
              },
              required: ["kind", "min_inclusive", "max_inclusive"],
              propertyOrdering: ["kind", "min_inclusive", "max_inclusive"],
            },
          },
        },
        required: ["size", "ranges"],
        propertyOrdering: ["size", "ranges"],
      },
    },
  },
  required: [
    "measurement_basis", "brand", "category", "component_role",
    "boundary_policy", "confidence", "bands",
  ],
  propertyOrdering: [
    "measurement_basis", "brand", "category", "component_role",
    "boundary_policy", "confidence", "bands",
  ],
} as const;

const PROMPT = `Bạn đang đọc ẢNH BẢNG SIZE của sản phẩm thời trang La.na Design.
Chỉ chép lại số liệu nhìn thấy rõ trong ảnh, không suy diễn và không dùng bảng size chung.
measurement_basis=BODY khi số đo là cơ thể khách; GARMENT khi là số đo thành phẩm; UNKNOWN nếu không chắc.
Đơn vị mọi số đo là cm, cân nặng là kg. Ô không có giới hạn dưới/trên dùng null.
Nếu ảnh mờ, thiếu nhãn cột hoặc không thể xác định đúng thứ tự size, giảm confidence.
Nếu ảnh không ghi rõ cách xử lý khách nằm sát biên size, dùng boundary_policy=REQUIRE_HUMAN_REVIEW.
category và component_role phải phản ánh đúng nội dung bảng, không suy từ mã sản phẩm.
Trả JSON đúng schema.`;

export interface SizeChartVisionClient {
  extract(imageBase64: string, context: string): Promise<string>;
}

export class VertexSizeChartVisionClient implements SizeChartVisionClient {
  private readonly endpoint: string;
  private readonly token: () => Promise<string>;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: {
    projectId: string;
    location: string;
    model: string;
    token: () => Promise<string>;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  }) {
    const host = options.location === "global"
      ? "aiplatform.googleapis.com"
      : `${options.location}-aiplatform.googleapis.com`;
    this.model = options.model;
    this.endpoint = `https://${host}/v1/projects/${options.projectId}/locations/${options.location}`
      + `/publishers/google/models/${options.model}:generateContent`;
    this.token = options.token;
    this.timeoutMs = Math.max(10_000, Math.min(180_000, options.timeoutMs ?? 60_000));
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async extract(imageBase64: string, context: string): Promise<string> {
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${await this.token()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: `${PROMPT}\nNgữ cảnh đã xác minh: ${context.slice(0, 800)}` },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2_048,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      const failure = (await response.json().catch(() => null)) as {
        error?: { status?: unknown; message?: unknown };
      } | null;
      const status = String(failure?.error?.status ?? "UNKNOWN")
        .replace(/[^A-Z0-9_]/giu, "_")
        .slice(0, 64);
      const message = String(failure?.error?.message ?? "")
        .replace(/[\r\n]+/gu, " ")
        .replace(/[^\p{L}\p{N}\s_.:/-]/gu, "")
        .slice(0, 240);
      throw new Error(
        `VERTEX_SIZE_CHART_HTTP_${response.status}:${status}${message ? `:${message}` : ""}`,
      );
    }
    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return (body.candidates?.[0]?.content?.parts ?? [])
      .map(({ text }) => text ?? "")
      .join("");
  }

  version(): string {
    return `size-chart-v1:${this.model}`;
  }
}

export interface SizeChartRegistryRow {
  readonly IMAGE_ID: string;
  readonly MA_SP: string;
  readonly IMAGE_URL: string;
  readonly IMAGE_HASH: string;
  readonly AI_IMAGE_TYPE: string;
  readonly AI_UPDATED_AT: string;
  readonly ACTIVE?: string;
}

export interface SizeChartExtractionSummary {
  readonly selected: number;
  readonly created: number;
  readonly existed: number;
  readonly failed: number;
  readonly retryableFailures: number;
  readonly errors: readonly string[];
}

export const isRetryableSizeChartError = (message: string): boolean =>
  /(?:HTTP_(?:408|425|429|5\d\d)|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|UND_ERR_CONNECT_TIMEOUT)/iu
    .test(message);

type ParsedVision = ExtractedSizeChartData & {
  readonly measurementBasis: "BODY" | "GARMENT" | "UNKNOWN";
  readonly confidence: number;
};

const normalizedType = (value: string): string => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/gu, "")
  .toLocaleUpperCase("en-US")
  .replace(/[^A-Z0-9]+/gu, "_");

export const isSizeChartRegistryRow = (row: SizeChartRegistryRow): boolean =>
  ["SIZE_GUIDE", "SIZE_CHART", "BANG_SIZE"].includes(normalizedType(row.AI_IMAGE_TYPE))
  && row.ACTIVE?.trim().toLocaleUpperCase("en-US") !== "FALSE"
  && Boolean(row.IMAGE_ID.trim() && row.MA_SP.trim() && row.IMAGE_URL.trim());

export function parseExtractedSizeChart(
  raw: string,
  extractionVersion: string,
): ParsedVision {
  const parsed = JSON.parse(
    raw.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, ""),
  ) as Record<string, unknown>;
  const component = String(parsed.component_role ?? "NONE").toLocaleUpperCase("en-US");
  const componentRole = component === "NONE"
    ? null
    : component as ProductComponentRole;
  const bands = (Array.isArray(parsed.bands) ? parsed.bands : []).map((band) => {
    const value = band as Record<string, unknown>;
    return {
      size: String(value.size ?? "").trim().toLocaleUpperCase("en-US"),
      note: null,
      ranges: (Array.isArray(value.ranges) ? value.ranges : []).map((range) => {
        const item = range as Record<string, unknown>;
        return {
          kind: String(item.kind ?? "") as MeasurementKind,
          minInclusive: item.min_inclusive === null ? null : Number(item.min_inclusive),
          maxInclusive: item.max_inclusive === null ? null : Number(item.max_inclusive),
        };
      }),
    };
  });
  const chart = {
    brand: String(parsed.brand ?? "LANA").trim() || "LANA",
    category: String(parsed.category ?? "ALL").trim().toLocaleUpperCase("en-US"),
    componentRole,
    boundaryPolicy: parsed.boundary_policy as SizeChartV1["boundaryPolicy"],
    bands,
  } satisfies Omit<ExtractedSizeChartData, "extractionVersion">;
  return {
    ...chart,
    extractionVersion,
    measurementBasis: String(parsed.measurement_basis ?? "UNKNOWN") as ParsedVision["measurementBasis"],
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
  };
}

export class SizeChartExtractionRunner {
  constructor(private readonly options: {
    rows: () => Promise<readonly SizeChartRegistryRow[]>;
    images: ImagePipeline;
    vision: SizeChartVisionClient;
    store: PostgresSizeChartExtractionStore;
    extractionVersion: string;
    minimumConfidence?: number;
    concurrency?: number;
    maximumRows?: number | null;
  }) {}

  async run(): Promise<SizeChartExtractionSummary> {
    const selectedRows = (await this.options.rows()).filter(isSizeChartRegistryRow);
    const maximumRows = this.options.maximumRows && this.options.maximumRows > 0
      ? Math.trunc(this.options.maximumRows)
      : null;
    const rows = maximumRows ? selectedRows.slice(0, maximumRows) : selectedRows;
    const minimumConfidence = this.options.minimumConfidence ?? 0.75;
    const concurrency = Math.max(1, Math.min(4, this.options.concurrency ?? 1));
    let cursor = 0;
    let created = 0;
    let existed = 0;
    let failed = 0;
    let retryableFailures = 0;
    const errors: string[] = [];

    const consume = async (): Promise<void> => {
      while (cursor < rows.length) {
        const row = rows[cursor++]!;
        try {
          const productId = row.MA_SP.trim().toLocaleUpperCase("en-US");
          const imageSha256 = row.IMAGE_HASH.toLocaleLowerCase("en-US");
          if (await this.options.store.exists({
            parentProductId: productId,
            imageSha256,
            extractorVersion: this.options.extractionVersion,
          })) {
            existed += 1;
            continue;
          }
          const image = await this.options.images.prepare(row.IMAGE_URL);
          const extracted = parseExtractedSizeChart(
            await this.options.vision.extract(
              image.buffer.toString("base64"),
              `MA_SP=${row.MA_SP}; AI_IMAGE_TYPE=${row.AI_IMAGE_TYPE}`,
            ),
            this.options.extractionVersion,
          );
          if (extracted.measurementBasis === "UNKNOWN" || extracted.confidence < minimumConfidence) {
            failed += 1;
            errors.push(`${row.MA_SP}:SIZE_CHART_REVIEW_REQUIRED`);
            continue;
          }
          const staged = stageSizeChartFromImageRegistry(row, extracted);
          if (staged.status !== "STAGED") {
            failed += 1;
            errors.push(`${row.MA_SP}:${staged.reasonCodes.join(",")}`);
            continue;
          }
          const content = AdminArtifactContentV1Schema.parse({
            schemaVersion: 1,
            kind: "SIZE_CHART",
            chart: staged.chart,
            scope: {
              ...staged.scope,
              parentProductIds: [...(staged.scope.parentProductIds ?? [])],
              categories: [...(staged.scope.categories ?? [])],
              componentRole: staged.scope.componentRole ?? null,
              forms: [...(staged.scope.forms ?? [])],
              materials: [...(staged.scope.materials ?? [])],
            },
            extraction: {
              measurementBasis: extracted.measurementBasis,
              confidence: extracted.confidence,
              extractorVersion: this.options.extractionVersion,
            },
            sourceMetadata: {
              source: "IMAGE_EXTRACTION",
              sourceReference: row.IMAGE_URL,
              sourceVersion: this.options.extractionVersion,
              observedAt: row.AI_UPDATED_AT,
            },
          });
          const result = await this.options.store.stage({
            imageId: row.IMAGE_ID,
            parentProductId: productId,
            imageUrl: row.IMAGE_URL,
            imageSha256,
            extractorVersion: this.options.extractionVersion,
            measurementBasis: extracted.measurementBasis,
            confidence: extracted.confidence,
            observedAt: row.AI_UPDATED_AT,
            artifactKey: `size-chart:${productId}`,
            content,
          });
          if (result.status === "CREATED") created += 1;
          else existed += 1;
        } catch (error) {
          failed += 1;
          const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
          if (isRetryableSizeChartError(message)) retryableFailures += 1;
          errors.push(`${row.MA_SP}:${message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, consume));
    return {
      selected: rows.length,
      created,
      existed,
      failed,
      retryableFailures,
      errors: errors.slice(0, 100),
    };
  }
}
