/**
 * P2.3B Image Metadata Staging trong app — thay workflow n8n P23IMGMETALANA01.
 *
 * Gemini chỉ tạo các cột nháp `AI_*` trong tab `image_registry`. Con người vẫn là người
 * duyệt: app không bao giờ ghi `REVIEW_STATUS=APPROVED`, không ghi đè các cột duyệt
 * W:AP, và không ghi bất cứ thứ gì vào Qdrant.
 *
 * PHIÊN BẢN EXTRACTION: dùng chung `2.1.0-canonical-parent` với P2.3A/P2.3C (workflow n8n
 * vẫn ở `2.0.0`). Hồ sơ cha cho Gemini ngữ cảnh tốt hơn, nhưng làm đổi `contextual_text`
 * nên đổi `SOURCE_HASH` — xem `P23B_WRITE_ENABLED` và báo cáo tác động trước khi bật ghi.
 */
import { createHash } from "node:crypto";
import type { createClient } from "redis";
import type { XmlProfile } from "./p23c-profiles.js";
import { normalizeHeader, normalizePayloadUrl, deterministicPointId } from "./p23c-jobs.js";

export const IMAGE_METADATA_LOCK_PREFIX = "lock:ingest:lana_multimodal_data_v2:shard:";
export const IMAGE_REGISTRY_SHEET = "image_registry";

/** 42 cột A:AP. A:V là vùng app ghi (AI_*), W:AP là vùng người duyệt — app không đụng. */
export const IMAGE_REGISTRY_HEADERS = [
  "IMAGE_ID", "MA_SP", "IMAGE_URL", "NORMALIZED_IMAGE_URL", "IMAGE_HASH", "SOURCE_CONTEXT",
  "AI_IMAGE_TYPE", "AI_IMAGE_INTENTS", "AI_ANGLE", "AI_DETAIL_TYPE", "AI_PARTS_VISIBLE",
  "AI_VISUAL_COLORS", "AI_VISUAL_MATERIALS", "AI_BACKGROUND_TYPE", "AI_HAS_MODEL",
  "AI_HAS_TEXT_OVERLAY", "AI_QUALITY_SCORE", "AI_CONFIDENCE", "AI_MODEL", "AI_METADATA_VERSION",
  "SOURCE_HASH", "AI_UPDATED_AT",
  "IMAGE_TYPE", "IMAGE_INTENTS", "ANGLE", "DETAIL_TYPE", "PARTS_VISIBLE", "VISUAL_COLORS",
  "VISUAL_MATERIALS", "BACKGROUND_TYPE", "HAS_MODEL", "HAS_TEXT_OVERLAY", "QUALITY_SCORE",
  "VERIFIED", "REVIEW_STATUS", "MANUAL_OVERRIDE", "ACTIVE", "APPROVED_BY", "APPROVED_AT",
  "PUBLISHED_HASH", "PUBLISHED_AT", "NOTES",
] as const;

/** Giá trị mặc định cho vùng người duyệt W:AP khi tạo dòng mới. REVIEW_STATUS=PENDING. */
const REVIEWER_DEFAULTS: (string | number | boolean)[] = [
  "", "", "", "", "", "", "", "", "", "", "", false, "PENDING", false, true, "", "", "", "", "",
];

export interface MetadataJob {
  run_id: string;
  started_at: string;
  point_id: string;
  source_hash: string;
  payload: Record<string, unknown>;
  contextual_text: string;
  image_url: string;
  normalized_image_url: string;
  job_valid: boolean;
  delete_requested: boolean;
}

export interface MetadataRunContext {
  readonly run_id: string;
  readonly started_at: string;
  readonly shard_count: number;
  readonly shard_index: number;
  readonly shard_label: string;
}

const normalizeText = (value: unknown): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "D")
    .trim()
    .toLowerCase();

export interface MetadataSchemaConfig {
  readonly version: string;
  readonly model: string;
  readonly location: string;
}

/**
 * Port "Prepare Metadata Jobs" + "Apply Image Metadata Schema".
 * `source_hash` chỉ phụ thuộc point, URL ảnh, ngữ cảnh sản phẩm và phiên bản schema —
 * thời điểm đọc XML không làm ảnh bị phân tích lại.
 */
export function buildMetadataJobs(
  profiles: readonly XmlProfile[],
  run: MetadataRunContext,
  schema: MetadataSchemaConfig,
): MetadataJob[] {
  const jobs: MetadataJob[] = [];
  for (const profile of profiles) {
    const reg = profile.reg;
    const description = reg.description_override || profile.description_xml;
    const material = profile.material_xml || reg.material_override || "";
    const brand = reg.brand || profile.brand_xml || "lanadesign";
    const seen = new Set<string>();
    const images = profile.images || [];
    for (let index = 0; index < images.length; index += 1) {
      const imageUrl = String(images[index] || "").trim();
      const normalizedImageUrl = normalizePayloadUrl(imageUrl);
      if (!normalizedImageUrl || seen.has(normalizedImageUrl)) continue;
      seen.add(normalizedImageUrl);
      const pointId = deterministicPointId(
        [normalizeText(brand), reg.ma_sp, normalizedImageUrl].join("|"),
      );
      const componentText = Object.entries(profile.material_components || {})
        .map(([component, values]) => `${component}: ${(values || []).join(", ")}`)
        .join(". ");
      const contextual = [
        profile.title, profile.category, ...(profile.color_detail || []),
        ...(profile.search_colors || []), profile.style_primary, profile.style_secondary,
        componentText, material, ...(profile.search_materials || []),
        ...(profile.search_silhouettes || []), ...(profile.search_occasions || []), description,
      ].filter(Boolean).join(". ").slice(0, 1_200);

      const payload: Record<string, unknown> = {
        product_id: reg.ma_sp, ma_sp: reg.ma_sp, aliases: profile.aliases,
        xml_group_id: profile.group_id, shop_alias: reg.shop_alias, brand,
        rule_type: profile.rule_type, category: profile.category, title: profile.title,
        description, material, material_components: profile.material_components || {},
        color_primary: profile.color_primary || [], color_detail: profile.color_detail || [],
        style_primary: profile.style_primary || "", style_secondary: profile.style_secondary || "",
        style_scores: profile.style_scores || {},
        extraction_warnings: profile.extraction_warnings || [],
        extraction_version: profile.extraction_version || "",
        product_link: profile.product_link, image_url: imageUrl,
        normalized_image_url: normalizedImageUrl,
        image_role: (profile.primary_images || []).includes(imageUrl) ? "PRIMARY" : "ADDITIONAL",
        image_sort_order: index + 1,
        images_array: images.slice(0, 8), size_options: profile.sizes,
        classifications: profile.classifications, search_colors: profile.search_colors,
        search_styles: profile.search_styles, search_materials: profile.search_materials,
        search_silhouettes: profile.search_silhouettes, search_occasions: profile.search_occasions,
        active: reg.active, source: "WEBSTORE_XML", source_updated_at: profile.xml_updated_at,
        auto_confidence: profile.auto_confidence, review_status: profile.review_status,
        image_metadata_version: schema.version, image_metadata_model_requested: schema.model,
      };

      const sourceHash = createHash("sha256").update(JSON.stringify({
        point_id: pointId,
        image_url: normalizedImageUrl,
        contextual_text: contextual,
        image_metadata_version: schema.version,
        image_metadata_model: schema.model,
        image_metadata_location: schema.location,
      })).digest("hex");

      jobs.push({
        run_id: run.run_id, started_at: run.started_at, point_id: pointId,
        source_hash: sourceHash, payload, contextual_text: contextual, image_url: imageUrl,
        normalized_image_url: normalizedImageUrl, job_valid: true,
        delete_requested: reg.active === false,
      });
    }
  }
  return jobs;
}

export interface ImageRegistryMap {
  readonly rows: Record<string, unknown>[];
  readonly byId: Record<string, Record<string, unknown>>;
  readonly maxRow: number;
}

/** Port "Build image_registry Map". */
export function buildImageRegistryMap(
  rawRows: readonly Record<string, unknown>[],
): ImageRegistryMap {
  const rows: Record<string, unknown>[] = [];
  const byId: Record<string, Record<string, unknown>> = {};
  for (const [index, item] of rawRows.entries()) {
    const normalized = Object.fromEntries(
      Object.entries(item || {}).map(([key, value]) => [normalizeHeader(key), value]),
    ) as Record<string, unknown>;
    const imageId = String(normalized.IMAGE_ID || "").trim();
    const rowNumber = Number(normalized.ROW_NUMBER || index + 2);
    const row = { ...normalized, ROW_NUMBER: rowNumber };
    rows.push(row);
    if (imageId) byId[imageId] = row;
  }
  return {
    rows,
    byId,
    maxRow: Math.max(1, ...rows.map((row) => Number(row.ROW_NUMBER || 1))),
  };
}

export interface SelectedMetadataJob extends MetadataJob {
  readonly existing_image_registry: Record<string, unknown> | null;
  readonly metadata_sheet_row: number;
}

export interface MetadataBatchSelection {
  readonly selected: SelectedMetadataJob[];
  readonly meta: {
    pending_metadata_count: number;
    selected_metadata_count: number;
    remaining_metadata_count: number;
    metadata_batch_size: number;
    shard_job_count: number;
    shard_count: number;
    shard_index: number;
    shard_label: string;
  };
}

const belongsToShard = (pointId: string, shardCount: number, shardIndex: number): boolean =>
  createHash("sha256").update(String(pointId || "")).digest().readUInt32BE(0) % shardCount === shardIndex;

export interface MetadataSelectionPolicy {
  /** Số ảnh tối đa mỗi lô. Chế độ vét lặp nhiều lô nên đây không còn là trần mỗi ngày. */
  readonly batchSize: number;
  /** 0 = tắt hẳn recheck định kỳ. `SOURCE_HASH` vẫn bắt được mọi thay đổi thật. */
  readonly recheckDays: number;
  /** true = chỉ phân tích ảnh chưa có trong image_registry, giữ nguyên nhãn đã duyệt. */
  readonly onlyNewImages: boolean;
}

/** Port "Select Pending Metadata Batch": dòng mới, nguồn đổi, hoặc quá hạn recheck. */
export function selectPendingMetadataBatch(
  jobs: readonly MetadataJob[],
  registry: ImageRegistryMap,
  run: MetadataRunContext,
  policy: MetadataSelectionPolicy,
  now: number = Date.now(),
): MetadataBatchSelection {
  const shardCount = Math.max(1, Number(run.shard_count || 1));
  const shardIndex = Math.max(0, Math.min(shardCount - 1, Number(run.shard_index || 0)));
  const batchSize = Number.isInteger(policy.batchSize)
    ? Math.min(500, Math.max(1, policy.batchSize))
    : 50;
  const recheckEnabled = Number(policy.recheckDays) > 0;
  const recheckMs = Math.min(3_650, Math.max(1, policy.recheckDays)) * 86_400_000;

  const shardJobs = jobs.filter((job) => belongsToShard(job.point_id, shardCount, shardIndex));
  const pending = shardJobs
    .filter((job) => {
      if (!job.job_valid || !job.point_id || job.delete_requested) return false;
      const old = registry.byId[String(job.point_id)];
      if (!old) return true;
      // Ảnh đã có nhãn và đã được duyệt: giữ nguyên, không phân tích lại vì bất kỳ lý do gì.
      if (policy.onlyNewImages) return false;
      if (String(old.SOURCE_HASH || "") !== String(job.source_hash || "")) return true;
      if (!recheckEnabled) return false;
      const updatedAt = Date.parse(String(old.AI_UPDATED_AT || ""));
      return !Number.isFinite(updatedAt) || now - updatedAt >= recheckMs;
    })
    .sort((a, b) =>
      String(a.payload?.ma_sp || "").localeCompare(String(b.payload?.ma_sp || ""))
      || Number(a.payload?.image_sort_order || 0) - Number(b.payload?.image_sort_order || 0));

  const chosen = pending.slice(0, batchSize);
  let nextRow = registry.maxRow + 1;
  const selected: SelectedMetadataJob[] = chosen.map((job) => {
    const existing = registry.byId[String(job.point_id)] || null;
    return {
      ...job,
      existing_image_registry: existing,
      metadata_sheet_row: existing ? Number(existing.ROW_NUMBER) : nextRow++,
    };
  });

  return {
    selected,
    meta: {
      pending_metadata_count: pending.length,
      selected_metadata_count: selected.length,
      remaining_metadata_count: Math.max(0, pending.length - selected.length),
      metadata_batch_size: batchSize,
      shard_job_count: shardJobs.length,
      shard_count: shardCount,
      shard_index: shardIndex,
      shard_label: run.shard_label,
    },
  };
}

// --- Phân loại ảnh bằng Gemini ---

export interface ImageMetadata {
  image_type: string;
  image_intents: string[];
  image_angle: string;
  image_detail_type: string;
  image_parts_visible: string[];
  image_visual_colors: string[];
  image_visual_materials: string[];
  image_background_type: string;
  image_has_model: boolean;
  image_has_text_overlay: boolean;
  image_quality_score: number;
  image_metadata_confidence: number;
  image_metadata_review_status: "AUTO_OK" | "NEED_REVIEW";
  image_metadata_version: string;
  image_metadata_model: string;
  image_metadata_source: string;
  image_metadata_updated_at: string;
  source_context: string;
  feedback_verified: boolean;
}

const IMAGE_TYPES = ["MODEL", "PRODUCT_ONLY", "DETAIL", "FLATLAY", "LIFESTYLE", "COLLAGE", "SIZE_GUIDE", "OTHER"];
const IMAGE_INTENTS = ["LOOKBOOK", "PRODUCT_OVERVIEW", "MATERIAL_CLOSEUP", "DETAIL", "FIT_REFERENCE", "STYLE_REFERENCE", "SIZE_GUIDE"];
const ANGLES = ["FRONT", "BACK", "SIDE", "CLOSEUP", "MULTI", "UNKNOWN"];
const DETAIL_TYPES = ["FULL_LOOK", "FABRIC", "TEXTURE", "STITCHING", "BUTTON", "ZIPPER", "PATTERN", "EMBELLISHMENT", "OTHER", "NONE"];
const PARTS = ["FULL_SET", "AO", "QUAN", "CHAN_VAY", "VAY", "PHU_KIEN", "UNKNOWN"];
const BACKGROUNDS = ["STUDIO", "INDOOR", "OUTDOOR", "TRANSPARENT", "OTHER"];

const pick = (value: unknown, allowed: readonly string[], fallback: string): string =>
  allowed.includes(String(value || "").toUpperCase()) ? String(value).toUpperCase() : fallback;

const listOf = (value: unknown, allowed: readonly string[] | null, limit = 8): string[] => [
  ...new Set(
    (Array.isArray(value) ? value : [])
      .map((item) => String(item || "").trim().toUpperCase())
      .filter(Boolean)
      .filter((item) => !allowed || allowed.includes(item)),
  ),
].slice(0, limit);

const clamp01 = (value: unknown): number => Math.max(0, Math.min(1, Number(value) || 0));

/** Port "Parse Image Metadata": ép về tập giá trị có kiểm soát, không tin thẳng model. */
export function parseImageMetadata(
  rawText: string,
  schema: MetadataSchemaConfig,
  updatedAt: string,
): ImageMetadata {
  const cleaned = rawText.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  if (!cleaned) throw new Error("image_metadata_empty_response");
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    throw new Error("image_metadata_invalid_json");
  }
  const intents = listOf(parsed.image_intents, IMAGE_INTENTS);
  const partsVisible = listOf(parsed.garment_parts_visible, PARTS);
  const confidence = clamp01(parsed.confidence);
  return {
    image_type: pick(parsed.image_type, IMAGE_TYPES, "OTHER"),
    image_intents: intents.length ? intents : ["PRODUCT_OVERVIEW"],
    image_angle: pick(parsed.angle, ANGLES, "UNKNOWN"),
    image_detail_type: pick(parsed.detail_type, DETAIL_TYPES, "NONE"),
    image_parts_visible: partsVisible.length ? partsVisible : ["UNKNOWN"],
    image_visual_colors: listOf(parsed.visual_colors, null, 6),
    image_visual_materials: listOf(parsed.visual_materials, null, 6),
    image_background_type: pick(parsed.background_type, BACKGROUNDS, "OTHER"),
    image_has_model: Boolean(parsed.has_model),
    image_has_text_overlay: Boolean(parsed.has_text_overlay),
    image_quality_score: clamp01(parsed.quality_score),
    image_metadata_confidence: confidence,
    image_metadata_review_status: confidence >= 0.8 ? "AUTO_OK" : "NEED_REVIEW",
    image_metadata_version: schema.version,
    image_metadata_model: schema.model,
    image_metadata_source: "AI_VERTEX",
    image_metadata_updated_at: updatedAt,
    // Ảnh từ catalog XML không bao giờ được suy diễn thành feedback của khách.
    source_context: "WEBSTORE_XML",
    feedback_verified: false,
  };
}

export type StagingStatus = "STAGED" | "FAILED" | "SKIPPED";

export interface StagedRow {
  readonly status: StagingStatus;
  readonly point_id: string;
  readonly ma_sp: string;
  readonly image_url: string;
  readonly metadata_sheet_row: number;
  readonly existing_row: boolean;
  readonly source_changed: boolean;
  readonly review_status_update: string;
  readonly source_hash: string;
  readonly ai_values: (string | number | boolean)[];
  readonly full_values: (string | number | boolean)[];
  readonly error: string;
}

const joinList = (value: unknown): string =>
  (Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean).join(" | ");

/**
 * Các cột nháp quyết định "bản nháp AI có đổi thật không". Cố ý bỏ điểm số
 * (`AI_QUALITY_SCORE`, `AI_CONFIDENCE`) vì chúng dao động nhẹ mà không đổi nội dung
 * người duyệt đã đọc, và bỏ version/model/thời điểm vì đó là dữ liệu audit.
 */
const DRAFT_COMPARISON_COLUMNS = [
  "AI_IMAGE_TYPE", "AI_IMAGE_INTENTS", "AI_ANGLE", "AI_DETAIL_TYPE", "AI_PARTS_VISIBLE",
  "AI_VISUAL_COLORS", "AI_VISUAL_MATERIALS", "AI_BACKGROUND_TYPE", "AI_HAS_MODEL",
  "AI_HAS_TEXT_OVERLAY",
] as const;

const draftMatchesExisting = (
  existing: Record<string, unknown>,
  aiValues: readonly (string | number | boolean)[],
): boolean =>
  DRAFT_COMPARISON_COLUMNS.every((column) => {
    const index = IMAGE_REGISTRY_HEADERS.indexOf(column);
    if (index < 0) return true;
    const next = aiValues[index];
    const previous = existing[column];
    if (typeof next === "boolean") {
      return String(previous).trim().toUpperCase() === String(next).toUpperCase();
    }
    return String(previous ?? "").trim() === String(next ?? "").trim();
  });

/** Port "Build image_registry Row": chỉ dựng vùng A:V, phần W:AP giữ mặc định cho người duyệt. */
export function buildImageRegistryRow(
  job: SelectedMetadataJob,
  meta: ImageMetadata,
  imageBuffer: Buffer,
  staleOnlyWhenDraftChanges = true,
): StagedRow {
  const existing = job.existing_image_registry;
  const imageHash = createHash("sha256").update(imageBuffer).digest("hex");
  // CDN có thể mã hóa lại ảnh không đổi, nên IMAGE_HASH chỉ dùng để đối soát;
  // trạng thái duyệt chỉ đổi khi vân tay nguồn ổn định thay đổi.
  const sourceChanged = !existing || String(existing.SOURCE_HASH || "") !== String(job.source_hash || "");
  const aiValues: (string | number | boolean)[] = [
    job.point_id, String(job.payload?.ma_sp || ""), job.image_url, job.normalized_image_url,
    imageHash, "WEBSTORE_XML",
    meta.image_type, joinList(meta.image_intents), meta.image_angle, meta.image_detail_type,
    joinList(meta.image_parts_visible), joinList(meta.image_visual_colors),
    joinList(meta.image_visual_materials), meta.image_background_type,
    meta.image_has_model, meta.image_has_text_overlay,
    meta.image_quality_score, meta.image_metadata_confidence,
    meta.image_metadata_model, meta.image_metadata_version,
    job.source_hash, meta.image_metadata_updated_at,
  ];
  // Người duyệt đã chấp nhận một bản nháp cụ thể. Nếu chạy lại cho ra đúng bản nháp đó thì
  // phê duyệt cũ vẫn còn hiệu lực — không bắt duyệt lại chỉ vì ngữ cảnh sản phẩm đổi.
  const draftUnchanged = Boolean(existing) && staleOnlyWhenDraftChanges
    && draftMatchesExisting(existing as Record<string, unknown>, aiValues);
  const markStale = sourceChanged && !draftUnchanged;

  return {
    status: "STAGED",
    point_id: job.point_id,
    ma_sp: String(job.payload?.ma_sp || ""),
    image_url: job.image_url,
    metadata_sheet_row: Number(job.metadata_sheet_row),
    existing_row: Boolean(existing),
    source_changed: sourceChanged,
    review_status_update: markStale ? "STALE" : "",
    source_hash: job.source_hash,
    ai_values: aiValues,
    full_values: [...aiValues, ...REVIEWER_DEFAULTS],
    error: "",
  };
}

export interface SheetBatchRequest {
  readonly updates: { range: string; values: (string | number | boolean)[][] }[];
  readonly appends: (string | number | boolean)[][];
  readonly existing_update_count: number;
  readonly new_append_count: number;
}

/** Port "Build image_registry Batch Request": update A:V cho dòng cũ, append cho dòng mới. */
export function buildSheetBatchRequest(rows: readonly StagedRow[]): SheetBatchRequest {
  const updates: { range: string; values: (string | number | boolean)[][] }[] = [];
  const appends: (string | number | boolean)[][] = [];
  let existingUpdateCount = 0;
  let newAppendCount = 0;
  for (const row of rows) {
    if (row.status !== "STAGED" || Number(row.metadata_sheet_row) < 2) continue;
    const number = Number(row.metadata_sheet_row);
    if (row.existing_row) {
      updates.push({ range: `image_registry!A${number}:V${number}`, values: [row.ai_values] });
      if (row.review_status_update) {
        updates.push({ range: `image_registry!AI${number}`, values: [[row.review_status_update]] });
      }
      existingUpdateCount += 1;
    } else {
      appends.push(row.full_values);
      newAppendCount += 1;
    }
  }
  return {
    updates,
    appends,
    existing_update_count: existingUpdateCount,
    new_append_count: newAppendCount,
  };
}

export const IMAGE_METADATA_PROMPT =
  "Analyze only what is visibly present in this Vietnamese fashion product image. "
  + "Do not infer customer feedback, authenticity, stock, price, size, material composition, "
  + "or product claims. Return the strict schema. Product context is reference only: ";

export const IMAGE_METADATA_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    image_type: { type: "STRING", enum: IMAGE_TYPES },
    image_intents: { type: "ARRAY", items: { type: "STRING", enum: IMAGE_INTENTS } },
    angle: { type: "STRING", enum: ANGLES },
    detail_type: { type: "STRING", enum: DETAIL_TYPES },
    garment_parts_visible: { type: "ARRAY", items: { type: "STRING", enum: PARTS } },
    visual_colors: { type: "ARRAY", items: { type: "STRING" } },
    visual_materials: { type: "ARRAY", items: { type: "STRING" } },
    background_type: { type: "STRING", enum: BACKGROUNDS },
    has_model: { type: "BOOLEAN" },
    has_text_overlay: { type: "BOOLEAN" },
    quality_score: { type: "NUMBER" },
    confidence: { type: "NUMBER" },
  },
  required: [
    "image_type", "image_intents", "angle", "detail_type", "garment_parts_visible",
    "visual_colors", "visual_materials", "background_type", "has_model", "has_text_overlay",
    "quality_score", "confidence",
  ],
  propertyOrdering: [
    "image_type", "image_intents", "angle", "detail_type", "garment_parts_visible",
    "visual_colors", "visual_materials", "background_type", "has_model", "has_text_overlay",
    "quality_score", "confidence",
  ],
} as const;

export interface ImageClassifier {
  classify(imageBase64: string, contextualText: string): Promise<string>;
}

export class VertexImageClassifier implements ImageClassifier {
  private readonly endpoint: string;
  private readonly token: () => Promise<string>;
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
    this.endpoint = `https://${host}/v1/projects/${options.projectId}/locations/${options.location}`
      + `/publishers/google/models/${options.model}:generateContent`;
    this.token = options.token;
    this.timeoutMs = Math.max(10_000, Math.min(180_000, options.timeoutMs ?? 60_000));
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async classify(imageBase64: string, contextualText: string): Promise<string> {
    const token = await this.token();
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: IMAGE_METADATA_PROMPT + String(contextualText || "").slice(0, 1_200) },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
          responseSchema: IMAGE_METADATA_RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`VERTEX_METADATA_HTTP_${response.status}`);
    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const parts = body?.candidates?.[0]?.content?.parts ?? [];
    return parts.map((part) => String(part?.text || "")).join("");
  }
}
