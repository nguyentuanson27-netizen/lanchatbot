/**
 * Port các node "Build Registry Map", "Collect image_registry Rows",
 * "Build Approved Qdrant Jobs" và "Select Pending Point Batch" của P2.3C.
 *
 * Hash schema: lana-qdrant-semantic-v2. Chỉ dữ liệu phục vụ tìm kiếm mới vào hash;
 * trường thời gian, audit, version và confidence bị loại trừ.
 */
import { createHash } from "node:crypto";
import type { RegistryEntry, XmlProfile } from "./p23c-profiles.js";

export const HASH_SCHEMA = "lana-qdrant-semantic-v2";

export const normalizeHeader = (value: unknown): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/đ/gu, "d")
    .replace(/Đ/gu, "D")
    .trim()
    .replace(/[^a-zA-Z0-9]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .toUpperCase();

const enabled = (v: unknown): boolean =>
  !["false", "0", "no", "off", "khong", "không"].includes(String(v ?? "true").trim().toLowerCase());

const tags = (v: unknown): string[] => [
  ...new Set(
    String(v || "")
      .split(/[|,;\n]+/u)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean),
  ),
];

export interface RegistryMapResult {
  readonly registry: Record<string, RegistryEntry>;
  readonly registry_count: number;
  readonly registry_errors: string[];
  readonly duplicate_count: number;
}

/** Port "Build Registry Map": mã trùng bị loại khỏi lần chạy kèm lỗi DUPLICATE_MA_SP. */
export function buildRegistryMap(rows: readonly Record<string, unknown>[]): RegistryMapResult {
  const registry: Record<string, RegistryEntry> = {};
  const errors: string[] = [];
  const duplicateCodes = new Set<string>();
  for (const [index, item] of rows.entries()) {
    const r = Object.fromEntries(
      Object.entries(item || {}).map(([k, v]) => [normalizeHeader(k), v]),
    ) as Record<string, unknown>;
    const maSp = String(r.MA_SP || "").trim().toUpperCase();
    if (!maSp) continue;
    if (registry[maSp]) {
      errors.push(`DUPLICATE_MA_SP:${maSp}`);
      duplicateCodes.add(maSp);
      continue;
    }
    registry[maSp] = {
      ma_sp: maSp,
      sheet_row: Number(r.ROW_NUMBER || index + 2),
      xml_group_id: String(r.XML_GROUP_ID || maSp).trim().toUpperCase(),
      shop_alias: String(r.SHOP_ALIAS || r.SHOP || "LANA").trim().toUpperCase(),
      brand: String(r.BRAND || "lanadesign").trim(),
      rule_type: String(r.RULE_TYPE || "").trim().toUpperCase(),
      category: String(r.CATEGORY || r.DANH_MUC || "").trim().toUpperCase(),
      title_override: String(r.TITLE_OVERRIDE || "").trim(),
      material_override: String(r.MATERIAL_OVERRIDE || "").trim(),
      description_override: String(r.DESCRIPTION_OVERRIDE || "").trim(),
      color_override: tags(r.COLOR_OVERRIDE),
      style_override: tags(r.STYLE_OVERRIDE),
      material_components_override: String(r.MATERIAL_COMPONENTS_OVERRIDE || "").trim(),
      active: enabled(r.ACTIVE),
      aliases: tags(r.ALIASES || r.ALIAS),
      search_colors: tags(r.SEARCH_COLORS || r.MAU),
      search_styles: tags(r.SEARCH_STYLES || r.KIEU_DANG),
      search_materials: tags(r.SEARCH_MATERIALS),
      search_silhouettes: tags(r.SEARCH_SILHOUETTES || r.DANG),
      search_occasions: tags(r.SEARCH_OCCASIONS || r.DIP_MAC),
      source_updated_at: String(r.SOURCE_UPDATED_AT || "").trim(),
      xml_title: String(r.XML_TITLE || "").trim(),
      description_xml: String(r.DESCRIPTION_XML || "").trim(),
      material_xml: String(r.MATERIAL_XML || "").trim(),
      xml_link: String(r.XML_LINK || "").trim(),
      xml_image_urls: tags(r.XML_IMAGE_URLS),
      auto_confidence: Number(r.AUTO_CONFIDENCE || 0),
      review_status: String(r.REVIEW_STATUS || "").trim().toUpperCase(),
      source_hash: String(r.SOURCE_HASH || "").trim(),
      xml_updated_at: String(r.XML_UPDATED_AT || "").trim(),
    };
  }
  for (const maSp of duplicateCodes) delete registry[maSp];
  return {
    registry,
    registry_count: Object.keys(registry).length,
    registry_errors: [...new Set(errors)].sort(),
    duplicate_count: duplicateCodes.size,
  };
}

/** Port "Collect image_registry Rows": chuẩn hóa header và gắn ROW_NUMBER. */
export function collectImageRegistryRows(
  rows: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  return rows.map((item, index) => ({
    ...Object.fromEntries(Object.entries(item || {}).map(([key, value]) => [normalizeHeader(key), value])),
    ROW_NUMBER: Number((item as Record<string, unknown>)?.row_number
      || (item as Record<string, unknown>)?.ROW_NUMBER
      || index + 2),
  }));
}

// --- hash ngữ nghĩa v2 ---

const TIME_HASH_KEY = /(?:^|_)(?:date|time|timestamp|datetime)$|(?:_at|_date|_time|_timestamp)$/iu;

const HASH_AUDIT_KEYS = new Set([
  "content_hash", "source_hash", "published_hash", "metadata_publish_hash", "run_id",
  "shard_count", "shard_index", "shard_label",
  "source", "source_context", "catalog_version", "embedding_model", "embedding_dimension",
  "image_metadata_version", "image_metadata_confidence", "image_metadata_review_status",
  "image_metadata_model", "image_metadata_source", "ingestion_owner", "ingestion_version",
]);

const UNORDERED_HASH_ARRAY_KEYS = new Set([
  "aliases", "color_primary", "color_detail", "size_options", "classifications", "search_colors",
  "search_styles", "search_materials", "search_silhouettes", "search_occasions", "image_intents",
  "image_parts_visible", "image_visual_colors", "image_visual_materials",
]);

const normalizeHashString = (value: unknown): string =>
  String(value).normalize("NFC").replace(/\s+/gu, " ").trim();

/** Chuẩn hóa URL cho payload: bỏ hash, hạ chữ scheme/host, xóa tracking, sắp xếp query. */
export const normalizePayloadUrl = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|_ga$)/iu.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString();
  } catch {
    return raw;
  }
};

const normalizeHashUrl = (value: unknown): string => {
  const normalized = normalizePayloadUrl(value);
  try {
    const url = new URL(normalized);
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/u, "");
    return url.toString();
  } catch {
    return normalizeHashString(normalized);
  }
};

export function canonicalForHash(value: unknown, key = ""): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return ["image_url", "normalized_image_url", "product_link"].includes(key)
      ? normalizeHashUrl(value)
      : normalizeHashString(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? (Object.is(value, -0) ? 0 : value) : null;
  }
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalForHash(item, key));
    if (!UNORDERED_HASH_ARRAY_KEYS.has(key)) return items;
    const sorted = items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return sorted.filter(
      (item, index) => index === 0 || JSON.stringify(item) !== JSON.stringify(sorted[index - 1]),
    );
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const childKey of Object.keys(value as Record<string, unknown>).sort()) {
      if (TIME_HASH_KEY.test(childKey) || HASH_AUDIT_KEYS.has(childKey)) continue;
      output[childKey] = canonicalForHash((value as Record<string, unknown>)[childKey], childKey);
    }
    return output;
  }
  return normalizeHashString(value);
}

/** Point ID deterministic dạng UUIDv5-like theo brand + mã sản phẩm + URL ảnh chuẩn hóa. */
export function deterministicPointId(seed: string): string {
  const chars = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
  chars[12] = "5";
  chars[16] = ((parseInt(chars[16] as string, 16) & 3) | 8).toString(16);
  const value = chars.join("");
  return [
    value.slice(0, 8), value.slice(8, 12), value.slice(12, 16), value.slice(16, 20), value.slice(20),
  ].join("-");
}

const boolValue = (value: unknown, fallback = false): boolean =>
  value === "" || value === null || value === undefined
    ? fallback
    : !["false", "0", "no", "off", "khong", "không"].includes(String(value).trim().toLowerCase());

const listValue = (value: unknown): string[] => [
  ...new Set(
    String(value || "")
      .split(/[|,;\n]+/u)
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean),
  ),
];

const choose = (finalValue: unknown, aiValue: unknown, fallback = ""): string =>
  String(finalValue || "").trim() || String(aiValue || "").trim() || fallback;

export type PublishAction = "UPSERT" | "DELETE" | "HOLD";

export interface QdrantJob {
  run_id: string;
  started_at: string;
  point_id: string;
  source_hash: string;
  metadata_publish_hash: string;
  published_hash: string;
  metadata_sheet_row: number;
  payload: Record<string, unknown>;
  contextual_text: string;
  image_url: string;
  normalized_image_url: string;
  job_valid: boolean;
  publish_action: PublishAction;
  delete_requested: boolean;
  should_process: boolean;
  shard_count: number;
  shard_index: number;
  shard_label: string;
}

export interface RunContext {
  readonly run_id: string;
  readonly started_at: string;
  readonly shard_count: number;
  readonly shard_index: number;
  readonly shard_label: string;
}

/** Port "Build Approved Qdrant Jobs". */
export function buildApprovedQdrantJobs(
  profiles: readonly XmlProfile[],
  imageRegistryRows: readonly Record<string, unknown>[],
  run: RunContext,
): QdrantJob[] {
  const profileByCode = new Map(
    profiles.map((profile) => [String(profile.reg?.ma_sp || "").trim().toUpperCase(), profile]),
  );
  const jobs: QdrantJob[] = [];

  for (const row of imageRegistryRows) {
    const maSp = String(row.MA_SP || "").trim().toUpperCase();
    const imageUrl = String(row.IMAGE_URL || "").trim();
    if (!maSp || !imageUrl) continue;
    const normalizedImageUrl = normalizePayloadUrl(
      String(row.NORMALIZED_IMAGE_URL || "").trim() || imageUrl,
    );
    const profile = profileByCode.get(maSp);
    const reg = profile?.reg;
    const brand = reg?.brand || profile?.brand_xml || "lanadesign";
    const pointId = String(row.IMAGE_ID || "").trim()
      || deterministicPointId([String(brand).toLowerCase(), maSp, normalizedImageUrl].join("|"));
    const reviewStatus = String(row.REVIEW_STATUS || "").trim().toUpperCase();
    const active = boolValue(row.ACTIVE, true);
    const publishAction: PublishAction = !active ? "DELETE" : reviewStatus === "APPROVED" ? "UPSERT" : "HOLD";
    const imageType = choose(row.IMAGE_TYPE, row.AI_IMAGE_TYPE, "OTHER").toUpperCase();
    const intents = listValue(choose(row.IMAGE_INTENTS, row.AI_IMAGE_INTENTS, "PRODUCT_OVERVIEW"));
    const angle = choose(row.ANGLE, row.AI_ANGLE, "UNKNOWN").toUpperCase();
    const detailType = choose(row.DETAIL_TYPE, row.AI_DETAIL_TYPE, "NONE").toUpperCase();
    const partsVisible = listValue(choose(row.PARTS_VISIBLE, row.AI_PARTS_VISIBLE, "UNKNOWN"));
    const visualColors = listValue(choose(row.VISUAL_COLORS, row.AI_VISUAL_COLORS, ""));
    const visualMaterials = listValue(choose(row.VISUAL_MATERIALS, row.AI_VISUAL_MATERIALS, ""));
    const verified = boolValue(row.VERIFIED, false);
    const feedbackVerified = verified && (imageType === "FEEDBACK" || intents.includes("FEEDBACK"));
    const description = reg?.description_override || profile?.description_xml || "";
    const material = profile?.material_xml || "";
    const profileImages = Array.isArray(profile?.images) ? profile.images : [];
    const primaryImages = Array.isArray(profile?.primary_images) ? profile.primary_images : [];
    const profileImageIndex = profileImages.findIndex(
      (value) => normalizePayloadUrl(value) === normalizedImageUrl,
    );
    const profileIsPrimary = primaryImages.some(
      (value) => normalizePayloadUrl(value) === normalizedImageUrl,
    );
    const imageRole = String(row.IMAGE_ROLE || (profileIsPrimary ? "PRIMARY" : "ADDITIONAL")).toUpperCase();
    const imageSortOrder = Number(
      row.IMAGE_SORT_ORDER || (profileImageIndex >= 0 ? profileImageIndex + 1 : 0),
    );

    const payload: Record<string, unknown> = {
      product_id: maSp,
      ma_sp: maSp,
      aliases: profile?.aliases || [],
      xml_group_id: profile?.group_id || maSp,
      shop_alias: reg?.shop_alias || "LANA",
      brand,
      rule_type: profile?.rule_type || reg?.rule_type || "",
      category: profile?.category || reg?.category || "",
      title: profile?.title || maSp,
      description,
      material,
      material_components: profile?.material_components || {},
      color_primary: profile?.color_primary || [],
      color_detail: profile?.color_detail || [],
      style_primary: profile?.style_primary || "",
      style_secondary: profile?.style_secondary || "",
      product_link: profile?.product_link || "",
      image_url: imageUrl,
      normalized_image_url: normalizedImageUrl,
      image_role: imageRole,
      image_sort_order: imageSortOrder,
      size_options: profile?.sizes || [],
      classifications: profile?.classifications || [],
      search_colors: profile?.search_colors || [],
      search_styles: profile?.search_styles || [],
      search_materials: profile?.search_materials || [],
      search_silhouettes: profile?.search_silhouettes || [],
      search_occasions: profile?.search_occasions || [],
      active,
      source: String(row.SOURCE_CONTEXT || "WEBSTORE_XML"),
      source_updated_at: profile?.xml_updated_at || "",
      image_type: imageType,
      image_intents: intents,
      image_angle: angle,
      image_detail_type: detailType,
      image_parts_visible: partsVisible,
      image_visual_colors: visualColors,
      image_visual_materials: visualMaterials,
      image_background_type: choose(row.BACKGROUND_TYPE, row.AI_BACKGROUND_TYPE, "OTHER").toUpperCase(),
      image_has_model: boolValue(choose(row.HAS_MODEL, row.AI_HAS_MODEL, ""), false),
      image_has_text_overlay: boolValue(choose(row.HAS_TEXT_OVERLAY, row.AI_HAS_TEXT_OVERLAY, ""), false),
      image_quality_score: Number(choose(row.QUALITY_SCORE, row.AI_QUALITY_SCORE, "0") || 0),
      image_metadata_confidence: Number(row.AI_CONFIDENCE || 0),
      image_metadata_review_status: "APPROVED",
      image_metadata_version: String(row.AI_METADATA_VERSION || "image-meta-v1.0.0"),
      source_context: String(row.SOURCE_CONTEXT || "WEBSTORE_XML"),
      feedback_verified: feedbackVerified,
      metadata_verified: verified,
    };

    const contextual = [
      payload.title, payload.category, ...visualColors, ...visualMaterials, imageType, ...intents,
      angle, detailType, ...partsVisible, profile?.style_primary, profile?.style_secondary,
      material, description,
    ].filter(Boolean).join(". ").slice(0, 1_200);

    const hashInput = canonicalForHash({ hash_schema: HASH_SCHEMA, point_id: pointId, payload });
    const publishHash = createHash("sha256").update(JSON.stringify(hashInput)).digest("hex");

    jobs.push({
      run_id: run.run_id,
      started_at: run.started_at,
      point_id: pointId,
      source_hash: publishHash,
      metadata_publish_hash: publishHash,
      published_hash: String(row.PUBLISHED_HASH || "").trim(),
      metadata_sheet_row: Number(row.ROW_NUMBER || 0),
      payload,
      contextual_text: contextual,
      image_url: imageUrl,
      normalized_image_url: normalizedImageUrl,
      job_valid: publishAction !== "HOLD",
      publish_action: publishAction,
      delete_requested: publishAction === "DELETE",
      should_process: publishAction === "UPSERT",
      shard_count: Number(run.shard_count || 1),
      shard_index: Number(run.shard_index || 0),
      shard_label: run.shard_label,
    });
  }

  // Gộp point_id trùng: dòng sheet mới nhất là chuẩn, kể cả dòng HOLD,
  // để bản APPROVED cũ hơn không lọt vào lần publish.
  const uniqueJobs = new Map<string, QdrantJob>();
  for (const job of jobs) {
    const id = String(job.point_id || "");
    if (!id) continue;
    const previous = uniqueJobs.get(id);
    if (!previous || Number(job.metadata_sheet_row || 0) >= Number(previous.metadata_sheet_row || 0)) {
      uniqueJobs.set(id, job);
    }
  }
  return [...uniqueJobs.values()];
}

export interface BatchSelection {
  readonly selected: QdrantJob[];
  readonly meta: {
    point_batch_size: number;
    pending_point_count: number;
    batch_selected_point_count: number;
    remaining_point_count: number;
    approved_actionable_count: number;
    duplicate_point_count: number;
    held_row_count: number;
    qdrant_existing_point_count: number;
    shard_count: number;
    shard_index: number;
    shard_label: string;
  };
  readonly existingHashes: ReadonlyMap<string, string>;
}

/** Point thuộc shard nào — sha256(point_id) 32 bit đầu chia dư cho shard_count. */
export function pointBelongsToShard(pointId: string, shardCount: number, shardIndex: number): boolean {
  return createHash("sha256").update(String(pointId || "")).digest().readUInt32BE(0) % shardCount === shardIndex;
}

/** Port "Select Pending Point Batch" (không gồm phần gọi Qdrant scroll). */
export function selectPendingPointBatch(
  jobs: readonly QdrantJob[],
  existing: ReadonlyMap<string, string>,
  run: RunContext,
  batchSizeRaw: number,
): BatchSelection {
  const batchSize = Number.isInteger(batchSizeRaw) ? Math.min(50, Math.max(1, batchSizeRaw)) : 50;
  const shardCount = Math.max(1, Number(run.shard_count || 1));
  const shardIndex = Math.max(0, Math.min(shardCount - 1, Number(run.shard_index || 0)));

  const actionableRows = jobs.filter(
    (job) => job.job_valid && job.point_id && pointBelongsToShard(job.point_id, shardCount, shardIndex),
  );
  const actionableByPoint = new Map<string, QdrantJob>();
  for (const job of actionableRows) {
    const id = String(job.point_id);
    const previous = actionableByPoint.get(id);
    if (!previous || Number(job.metadata_sheet_row || 0) >= Number(previous.metadata_sheet_row || 0)) {
      actionableByPoint.set(id, job);
    }
  }
  const actionable = [...actionableByPoint.values()];
  const duplicatePointCount = actionableRows.length - actionable.length;

  const pending = actionable
    .filter((job) => {
      const id = String(job.point_id);
      const sourceHash = String(job.source_hash || "");
      const qdrantHash = existing.get(id) || "";
      if (job.delete_requested) return existing.has(id);
      if (!existing.has(id)) return true;
      if (qdrantHash === sourceHash) return false;
      if (!qdrantHash && String(job.published_hash || "") === sourceHash) return false;
      return true;
    })
    .sort((a, b) =>
      String(a.payload?.ma_sp || "").localeCompare(String(b.payload?.ma_sp || ""))
      || String(a.point_id).localeCompare(String(b.point_id)));

  const selected = pending.slice(0, batchSize);
  return {
    selected,
    meta: {
      point_batch_size: batchSize,
      pending_point_count: pending.length,
      batch_selected_point_count: selected.length,
      remaining_point_count: Math.max(0, pending.length - selected.length),
      approved_actionable_count: actionable.length,
      duplicate_point_count: duplicatePointCount,
      held_row_count: jobs.filter((job) => job.publish_action === "HOLD").length,
      qdrant_existing_point_count: existing.size,
      shard_count: shardCount,
      shard_index: shardIndex,
      shard_label: run.shard_label,
    },
    existingHashes: existing,
  };
}

/** Cắt contextual_text theo giới hạn 900 byte UTF-8 (port "Clamp Vertex Text"). */
export function clampContextualText(text: string): { text: string; bytes: number } {
  const source = String(text || "").normalize("NFC");
  const parts: string[] = [];
  let bytes = 0;
  for (const char of source) {
    const size = Buffer.byteLength(char, "utf8");
    if (bytes + size > 900) break;
    parts.push(char);
    bytes += size;
  }
  return { text: parts.join(""), bytes };
}
