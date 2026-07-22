/**
 * Port nguyên trạng node "Build XML Profiles" + "Normalize Structured Extraction" của
 * workflow n8n P23QDRANTLANA001 (P2.3C). Mọi quy tắc chuẩn hóa phải giữ đúng semantics
 * để `source_hash` / `content_hash` của app trùng khớp bit-for-bit với n8n.
 *
 * extraction: 2.1.0-canonical-parent, normalizer: 2.0.1
 */
import { createHash } from "node:crypto";

export const EXTRACTION_VERSION = "2.1.0-canonical-parent";
export const NORMALIZER_VERSION = "2.0.1";

export interface RegistryEntry {
  ma_sp: string;
  sheet_row: number;
  xml_group_id: string;
  shop_alias: string;
  brand: string;
  rule_type: string;
  category: string;
  title_override: string;
  material_override: string;
  description_override: string;
  color_override: string[];
  style_override: string[];
  material_components_override: string;
  active: boolean;
  aliases: string[];
  search_colors: string[];
  search_styles: string[];
  search_materials: string[];
  search_silhouettes: string[];
  search_occasions: string[];
  source_updated_at: string;
  xml_title: string;
  description_xml: string;
  material_xml: string;
  xml_link: string;
  xml_image_urls: string[];
  auto_confidence: number;
  review_status: string;
  source_hash: string;
  xml_updated_at: string;
}

export interface XmlProfile {
  reg: RegistryEntry;
  group_id: string;
  title: string;
  description_xml: string;
  material_xml: string;
  material_components: Record<string, string[]>;
  color_primary: string[];
  color_detail: string[];
  style_primary: string;
  style_secondary: string;
  style_scores: Record<string, number>;
  extraction_warnings: string[];
  extraction_version: string;
  product_link: string;
  brand_xml: string;
  images: string[];
  primary_images: string[];
  sizes: string[];
  classifications: string[];
  rule_type: string;
  category: string;
  aliases: string[];
  search_colors: string[];
  search_styles: string[];
  search_materials: string[];
  search_silhouettes: string[];
  search_occasions: string[];
  auto_confidence: number;
  review_status: string;
  source_hash: string;
  xml_updated_at: string;
}

type XmlValue = unknown;

// --- helper cơ bản (giữ đúng thứ tự phép biến đổi của n8n) ---

const unwrap = (v: XmlValue): XmlValue => (Array.isArray(v) ? v[0] : v);

export const xmlText = (v: XmlValue): string => {
  const value = unwrap(v);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record._ ?? record["#text"] ?? "").trim();
  }
  return String(value ?? "").trim();
};

export const asList = (v: XmlValue): XmlValue[] =>
  v === null || v === undefined ? [] : Array.isArray(v) ? v : [v];

export const unicodeText = (v: unknown): string =>
  String(v || "")
    .normalize("NFC")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/\r/gu, "")
    .replace(/[ \t]+/gu, " ")
    .trim();

export const lowerVi = (v: unknown): string => unicodeText(v).toLocaleLowerCase("vi-VN");

export const ascii = (v: unknown): string =>
  lowerVi(v).normalize("NFD").replace(/[̀-ͯ]/gu, "").replace(/đ/gu, "d");

export const unique = (values: readonly unknown[] | undefined): string[] => [
  ...new Set((values || []).map((v) => String(v ?? "").trim().toUpperCase()).filter(Boolean)),
];

export const compareStable = (a: unknown, b: unknown): number =>
  String(a).localeCompare(String(b), "vi", { sensitivity: "base", numeric: true })
  || String(a).localeCompare(String(b));

export const uniqueSorted = (values: readonly unknown[] | undefined): string[] =>
  unique(values).sort(compareStable);

const mergeSets = (...sets: (readonly unknown[] | undefined)[]): string[] =>
  uniqueSorted(sets.flat() as unknown[]);

export const matchLabels = (haystack: string, rules: readonly { label: string; pattern: RegExp }[]): string[] =>
  rules.filter((rule) => rule.pattern.test(haystack)).map((rule) => rule.label);

const escapeRegex = (v: unknown): string => String(v || "").replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

export const normalizeFeedUrl = (raw: unknown): string => {
  let value = String(raw || "").trim().replace(/\.$/u, "");
  if (!/^https:\/\//iu.test(value)) throw new Error("url_must_use_https");
  const hash = value.indexOf("#");
  if (hash >= 0) value = value.slice(0, hash);
  const q = value.indexOf("?");
  if (q < 0) return value;
  const base = value.slice(0, q);
  const query = value
    .slice(q + 1)
    .split("&")
    .filter(Boolean)
    .filter((part) => {
      const key = (part.split("=")[0] ?? "").toLowerCase();
      return !key.startsWith("utm_") && key !== "fbclid" && key !== "gclid";
    })
    .sort();
  return query.length ? `${base}?${query.join("&")}` : base;
};

const normalizedValue = (value: unknown): string => unicodeText(value).replace(/\s+/gu, " ").trim();

const stableMode = (values: readonly unknown[] | undefined, preferLongest = false): string => {
  const counts = new Map<string, { count: number; values: string[] }>();
  for (const raw of values || []) {
    const value = normalizedValue(raw);
    if (!value) continue;
    const key = lowerVi(value);
    const current = counts.get(key) || { count: 0, values: [] };
    current.count += 1;
    current.values.push(value);
    counts.set(key, current);
  }
  const ranked = [...counts.values()]
    .map((entry) => ({
      count: entry.count,
      value: [...new Set(entry.values)].sort(compareStable)[0] ?? "",
    }))
    .sort((a, b) =>
      b.count - a.count
      || (preferLongest ? b.value.length - a.value.length : 0)
      || compareStable(a.value, b.value));
  return ranked[0]?.value || "";
};

const cleanParentTitle = (raw: unknown): string => {
  let value = normalizedValue(raw);
  const sections = value.split(/\s+[-–—]\s+/u).map((part) => part.trim()).filter(Boolean);
  if (sections.length > 1 && (sections[0]?.length ?? 0) >= 3) value = sections[0] ?? "";
  value = value
    .replace(/\s*[/|-]\s*(?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|\d{2,3})(?:\s*[/|-]\s*[^/|-]+)?\s*$/iu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return value;
};

const itemStableId = (item: Record<string, unknown>): string =>
  normalizedValue(xmlText(item["g:id"] ?? item.id))
  || [
    normalizedValue(xmlText(item["g:title"] ?? item.title)),
    normalizedValue(xmlText(item["g:link"] ?? item.link)),
    normalizedValue(xmlText(item["g:image_link"] ?? item.image_link)),
  ].join("|");

export const canonicalForSourceHash = (value: unknown): unknown => {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const items = value
      .map(canonicalForSourceHash)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return items.filter((item, index) => index === 0 || JSON.stringify(item) !== JSON.stringify(items[index - 1]));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, canonicalForSourceHash((value as Record<string, unknown>)[key])]),
    );
  }
  if (typeof value === "string") return normalizedValue(value);
  return value;
};

// --- bảng luật màu / chất liệu / style (giữ nguyên thứ tự và nội dung của n8n) ---

export const colorDefinitions: readonly { primary: string; details: readonly string[] }[] = [
  { primary: "TRẮNG", details: ["trắng ngọc trai", "trắng kem", "trắng sữa", "trắng tinh", "trắng"] },
  { primary: "ĐEN", details: ["đen tuyền", "đen"] },
  { primary: "KEM", details: ["kem be", "kem sữa", "kem", "beige", "màu be"] },
  { primary: "NÂU", details: ["nâu nude", "nâu tây", "nâu be", "nâu đất", "nâu"] },
  { primary: "ĐỎ", details: ["đỏ đô", "đỏ rượu", "đỏ mận", "đỏ tươi", "đỏ"] },
  { primary: "HỒNG", details: ["hồng nude", "hồng phấn", "hồng pastel", "hồng sen", "hồng"] },
  { primary: "XANH DƯƠNG", details: ["xanh navy", "xanh coban", "xanh dương", "xanh biển", "xanh denim"] },
  { primary: "XANH LÁ", details: ["xanh rêu", "xanh olive", "xanh lá", "xanh cốm"] },
  { primary: "VÀNG", details: ["vàng kem", "vàng mơ", "vàng đồng", "vàng"] },
  { primary: "TÍM", details: ["tím than", "tím pastel", "tím"] },
  { primary: "CAM", details: ["cam đất", "cam"] },
  { primary: "GHI", details: ["ghi xám", "xám ghi", "ghi", "xám"] },
  { primary: "XANH NGỌC", details: ["xanh ngọc"] },
];

export interface VariantAttr { label: string; value: string }

const colorContexts = (description: string, attrs: readonly VariantAttr[], title: string): string[] => {
  const contexts: string[] = [];
  for (const attr of attrs || []) {
    if (/(^|\s)(màu|màu sắc|color|colour)(\s|$)/iu.test(lowerVi(attr.label))) contexts.push(unicodeText(attr.value));
  }
  const lines = unicodeText(description).split(/\n|(?<=[.!?;])\s+/u).map((v) => v.trim()).filter(Boolean);
  for (const line of lines) {
    if (/(^|\W)(màu sắc|màu chủ đạo|gam màu|tông màu|tone màu|phối màu|màu)(\W|$)/iu.test(lowerVi(line))) {
      contexts.push(line);
    }
  }
  const titleText = unicodeText(title);
  if (/(?:\s[-–—|]\s|\()\s*(trắng|đen|kem|nâu|đỏ|hồng|xanh|vàng|tím|cam|ghi|xám)/iu.test(lowerVi(titleText))) {
    contexts.push(titleText);
  }
  return contexts;
};

export const parseColors = (
  description: string,
  attrs: readonly VariantAttr[],
  title: string,
  override: readonly string[] | undefined,
): { primary: string[]; detail: string[]; contexts: string[] } => {
  const overrideValues = unique(override || []);
  const contexts = overrideValues.length ? overrideValues : colorContexts(description, attrs, title);
  const haystack = lowerVi(contexts.join(" | "));
  const primary: string[] = [];
  const detail: string[] = [];
  for (const definition of colorDefinitions) {
    for (const phrase of definition.details) {
      const pattern = new RegExp(`(^|[^\\p{L}])${escapeRegex(phrase)}([^\\p{L}]|$)`, "iu");
      if (!pattern.test(haystack)) continue;
      primary.push(definition.primary);
      detail.push(phrase.toUpperCase());
      break;
    }
  }
  if (overrideValues.length && !primary.length) {
    return { primary: overrideValues, detail: overrideValues, contexts };
  }
  return { primary: unique(primary), detail: unique(detail), contexts };
};

export const materialDefinitions: readonly { label: string; pattern: RegExp; family: string; generic?: boolean }[] = [
  { label: "THÔ KHẮC LASER", pattern: /thô[^.;\n]{0,24}khắc\s*laser/iu, family: "THÔ" },
  { label: "REN THÊU 3D", pattern: /ren[^.;\n]{0,20}thêu\s*3d|ren\s*3d/iu, family: "REN" },
  { label: "TƠ KÍNH THÊU", pattern: /tơ\s*kính[^.;\n]{0,20}thêu/iu, family: "TƠ" },
  { label: "TƠ KÍNH", pattern: /tơ\s*kính/iu, family: "TƠ" },
  { label: "TƠ GƯƠNG", pattern: /tơ\s*gương/iu, family: "TƠ" },
  { label: "TƠ HOA", pattern: /tơ\s*hoa/iu, family: "TƠ" },
  { label: "TƠ ỐNG", pattern: /tơ\s*ống/iu, family: "TƠ" },
  { label: "TƠ NHŨ", pattern: /tơ\s*nhũ/iu, family: "TƠ" },
  { label: "TƠ MỀM", pattern: /tơ\s*mềm/iu, family: "TƠ" },
  { label: "LỤA NGỌC TRAI", pattern: /lụa[^.;\n]{0,16}ngọc\s*trai/iu, family: "LỤA" },
  { label: "LỤA SATIN", pattern: /lụa\s*satin|satin/iu, family: "LỤA" },
  { label: "LỤA GẤM", pattern: /lụa\s*gấm/iu, family: "LỤA" },
  { label: "THÔ LỤA", pattern: /thô\s*lụa/iu, family: "THÔ" },
  { label: "THÔ BOY", pattern: /thô\s*boy/iu, family: "THÔ" },
  { label: "VẢI LÓT MỀM", pattern: /(?:vải|lớp)\s*lót[^.;\n]{0,20}mềm|lót\s*mềm/iu, family: "LÓT" },
  { label: "TƠ", pattern: /(^|[^\p{L}])tơ([^\p{L}]|$)/iu, family: "TƠ", generic: true },
  { label: "LỤA", pattern: /(^|[^\p{L}])lụa([^\p{L}]|$)|silk/iu, family: "LỤA", generic: true },
  { label: "THÔ", pattern: /(^|[^\p{L}])thô([^\p{L}]|$)/iu, family: "THÔ", generic: true },
  { label: "REN", pattern: /(^|[^\p{L}])ren([^\p{L}]|$)|lace/iu, family: "REN", generic: true },
  { label: "GẤM", pattern: /(^|[^\p{L}])gấm([^\p{L}]|$)/iu, family: "GẤM" },
  { label: "VOAN", pattern: /(^|[^\p{L}])voan([^\p{L}]|$)|chiffon/iu, family: "VOAN" },
  { label: "LINEN", pattern: /(^|[^\p{L}])linen([^\p{L}]|$)/iu, family: "LINEN" },
  { label: "COTTON", pattern: /(^|[^\p{L}])cotton([^\p{L}]|$)/iu, family: "COTTON" },
  { label: "TUYTSI", pattern: /tuytsi|tuy\s*si/iu, family: "TUYTSI" },
  { label: "TWEED", pattern: /(^|[^\p{L}])tweed([^\p{L}]|$)/iu, family: "TWEED" },
  { label: "ĐŨI", pattern: /(^|[^\p{L}])đũi([^\p{L}]|$)/iu, family: "ĐŨI" },
  { label: "KAKI", pattern: /(^|[^\p{L}])kaki([^\p{L}]|$)/iu, family: "KAKI" },
  { label: "DENIM", pattern: /(^|[^\p{L}])denim([^\p{L}]|$)/iu, family: "DENIM" },
  { label: "UMI", pattern: /(^|[^\p{L}])umi([^\p{L}]|$)/iu, family: "UMI" },
  { label: "TAFTA", pattern: /tafta|taffeta/iu, family: "TAFTA" },
  { label: "ORGANZA", pattern: /organza/iu, family: "ORGANZA" },
  { label: "NHUNG", pattern: /(^|[^\p{L}])nhung([^\p{L}]|$)|velvet/iu, family: "NHUNG" },
  { label: "GOL HÀN", pattern: /gol\s*hàn/iu, family: "GOL HÀN" },
  { label: "VẢI TẰM", pattern: /vải\s*tằm/iu, family: "VẢI TẰM" },
  { label: "XỐP THÊU", pattern: /xốp[^.;\n]{0,16}thêu/iu, family: "XỐP" },
  { label: "XỐP", pattern: /(^|[^\p{L}])xốp([^\p{L}]|$)/iu, family: "XỐP", generic: true },
];

const findMaterials = (value: string): string[] => {
  const haystack = lowerVi(value);
  const matches = materialDefinitions.filter((def) => def.pattern.test(haystack));
  const specificFamilies = new Set(matches.filter((def) => !def.generic).map((def) => def.family));
  return unique(matches.filter((def) => !def.generic || !specificFamilies.has(def.family)).map((def) => def.label));
};

const componentLabels: Record<string, string> = {
  SHARED: "CHUNG", AO: "ÁO", AO_DAI: "ÁO DÀI", QUAN: "QUẦN", CHAN_VAY: "CHÂN VÁY", VAY: "VÁY",
  PHU_KIEN: "PHỤ KIỆN", LOT: "LÓT",
};

const primaryComponents = (category: string): string[] => {
  if (category === "SET_QUAN") return ["AO", "QUAN"];
  if (category === "SET_VAY") return ["AO", "CHAN_VAY"];
  if (category === "COMBO_3_MON") return ["AO", "CHAN_VAY", "QUAN"];
  if (category === "AO_DAI") return ["AO_DAI", "QUAN"];
  if (category === "CHAN_VAY") return ["CHAN_VAY"];
  if (category === "VAY") return ["VAY"];
  if (category === "AO") return ["AO"];
  if (category === "QUAN") return ["QUAN"];
  return ["SHARED"];
};

const componentsInClause = (value: string): string[] => {
  const v = lowerVi(value);
  const found: string[] = [];
  if (/áo\s*dài/iu.test(v)) found.push("AO_DAI");
  if (/chân\s*váy/iu.test(v)) found.push("CHAN_VAY");
  if (/(^|\W)phụ\s*kiện(\W|$)/iu.test(v)) found.push("PHU_KIEN");
  if (/(^|\W)(lớp\s*lót|vải\s*lót|lót\s*trong)(\W|$)/iu.test(v)) found.push("LOT");
  if (!found.includes("AO_DAI") && /(^|\W)áo(\W|$)/iu.test(v)) found.push("AO");
  if (/(^|\W)quần(\W|$)/iu.test(v)) found.push("QUAN");
  if (!found.includes("CHAN_VAY") && /(^|\W)váy(\W|$)/iu.test(v)) found.push("VAY");
  if (!found.length && /(^|\W)(set|bộ|toàn bộ|chất liệu)(\W|$)/iu.test(v)) found.push("SHARED");
  return [...new Set(found)];
};

const parseMaterialOverride = (raw: unknown): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  const keyMap: Record<string, string> = {
    CHUNG: "SHARED", SET: "SHARED", "ÁO": "AO", AO: "AO", "ÁO DÀI": "AO_DAI", "AO DAI": "AO_DAI",
    "QUẦN": "QUAN", QUAN: "QUAN", "CHÂN VÁY": "CHAN_VAY", "CHAN VAY": "CHAN_VAY", CV: "CHAN_VAY",
    "VÁY": "VAY", VAY: "VAY", "PHỤ KIỆN": "PHU_KIEN", "PHU KIEN": "PHU_KIEN", "LÓT": "LOT", LOT: "LOT",
  };
  for (const part of String(raw || "").split(";")) {
    const index = part.indexOf(":");
    if (index < 0) continue;
    const key = keyMap[part.slice(0, index).trim().toUpperCase()];
    if (!key) continue;
    result[key] = unique(part.slice(index + 1).split(/[|,]/u));
  }
  return result;
};

/**
 * `mergeValues` phải khớp biến thể `merge` của workflow gọi nó: P2.3C dùng `uniqueSorted`
 * (có sắp xếp), còn P2.3A dùng `unique` (giữ thứ tự phát hiện). Khác nhau ở đây làm lệch
 * `material_components`, `material_xml` và `search_materials`.
 */
export const extractMaterialComponents = (
  description: string,
  category: string,
  globalOverride: string | undefined,
  componentOverride: string | undefined,
  mergeValues: (...sets: (readonly unknown[] | undefined)[]) => string[] = mergeSets,
): { components: Record<string, string[]>; flat: string[]; summary: string; warnings: string[] } => {
  const warnings: string[] = [];
  const components: Record<string, string[]> = {};
  const add = (key: string, values: string[]): void => {
    if (values.length) components[key] = mergeValues(components[key] || [], values);
  };
  const overrideMap = parseMaterialOverride(componentOverride);
  if (Object.keys(overrideMap).length) {
    for (const [key, values] of Object.entries(overrideMap)) add(key, values);
  } else if ((globalOverride || "").length) {
    // n8n truyền reg.material_override (chuỗi) vào vị trí mảng; `.length` của chuỗi rỗng là 0
    // nên nhánh này chỉ chạy khi có override, và giá trị được spread thành mảng ký tự.
    for (const key of primaryComponents(category)) add(key, unique([globalOverride as unknown as string]));
  } else {
    const cleaned = unicodeText(description);
    const materialStart = cleaned.search(/chất\s*liệu\s*:/iu);
    const materialEndMatch = materialStart >= 0
      ? cleaned.slice(materialStart).search(/\n?\s*(ứng\s*dụng|hướng\s*dẫn|bảo\s*quản)\s*:/iu)
      : -1;
    const section = materialStart >= 0
      ? cleaned.slice(materialStart, materialEndMatch > 0 ? materialStart + materialEndMatch : undefined)
      : cleaned;
    const clauses = section.split(/\n|(?<=[.;])\s+/u).map((v) => v.trim()).filter(Boolean);
    for (const clause of clauses) {
      const materials = findMaterials(clause);
      if (!materials.length) continue;
      const keys = componentsInClause(clause);
      for (const key of keys.length ? keys : ["SHARED"]) add(key, materials);
    }
    const allSectionMaterials = findMaterials(section);
    if (!Object.keys(components).length && allSectionMaterials.length) add("SHARED", allSectionMaterials);
    const shared = components.SHARED || [];
    const primary = primaryComponents(category);
    for (const key of primary) {
      if (key === "SHARED") continue;
      if (shared.length) components[key] = mergeValues(shared, components[key] || []);
    }
    if (
      primary.length > 1
      && shared.length > 1
      && !primary.some((key) => (components[key] || []).some((v) => !shared.includes(v)))
    ) {
      warnings.push("MATERIAL_COMPONENT_AMBIGUOUS");
    }
  }
  delete components.SHARED;
  const orderedKeys = ["AO_DAI", "AO", "CHAN_VAY", "QUAN", "VAY", "PHU_KIEN", "LOT"];
  const ordered: Record<string, string[]> = {};
  for (const key of orderedKeys) if ((components[key] || []).length) ordered[key] = unique(components[key]);
  for (const [key, values] of Object.entries(components)) {
    if (!ordered[key] && values.length) ordered[key] = unique(values);
  }
  const flat = unique(Object.values(ordered).flat());
  const summary = Object.entries(ordered)
    .map(([key, values]) => `${componentLabels[key] || key}: ${values.join(" | ")}`)
    .join("; ");
  if (!flat.length) warnings.push("MATERIAL_NOT_FOUND");
  return { components: ordered, flat, summary, warnings };
};

export const styleDefinitions: readonly { label: string; explicit: readonly RegExp[]; evidence: readonly RegExp[] }[] = [
  { label: "NỮ TÍNH", explicit: [/nữ\s*tính/iu, /dịu\s*dàng/iu, /mềm\s*mại/iu, /duyên\s*dáng/iu], evidence: [/ren/iu, /voan/iu, /nơ/iu, /bèo/iu, /hoa\s*nổi/iu, /xòe/iu] },
  { label: "THANH LỊCH", explicit: [/thanh\s*lịch/iu, /tinh\s*tế/iu, /trang\s*nhã/iu], evidence: [/cổ\s*vest/iu, /đi\s*làm/iu, /công\s*sở/iu, /dáng\s*suông/iu] },
  { label: "HIỆN ĐẠI", explicit: [/hiện\s*đại/iu, /đương\s*đại/iu], evidence: [/bất\s*đối\s*xứng/iu, /cut[ -]?out/iu, /phối\s*layer/iu] },
  { label: "TỐI GIẢN", explicit: [/tối\s*giản/iu, /minimal/iu], evidence: [/đường\s*nét\s*gọn/iu, /ít\s*chi\s*tiết/iu] },
  { label: "SANG TRỌNG", explicit: [/sang\s*trọng/iu, /quý\s*phái/iu], evidence: [/đính\s*đá/iu, /gấm/iu, /tweed/iu, /nhung(?!\p{M})/iu] },
  { label: "TRẺ TRUNG", explicit: [/trẻ\s*trung/iu, /năng\s*động/iu], evidence: [/croptop/iu, /chân\s*váy\s*ngắn/iu] },
  { label: "CỔ ĐIỂN", explicit: [/cổ\s*điển/iu, /vintage/iu, /retro/iu], evidence: [/tay\s*bồng/iu, /cổ\s*đức/iu] },
  { label: "QUYẾN RŨ", explicit: [/quyến\s*rũ/iu, /gợi\s*cảm/iu, /cuốn\s*hút/iu], evidence: [/trễ\s*vai/iu, /xẻ\s*đùi/iu, /ôm\s*body/iu] },
];

export const extractStyles = (
  description: string,
  override: readonly string[] | undefined,
): { styles: string[]; scores: Record<string, number>; warning: string | null } => {
  const overrideValues = unique(override || []).slice(0, 2);
  if (overrideValues.length) {
    return {
      styles: overrideValues,
      scores: Object.fromEntries(overrideValues.map((v) => [v, 99])),
      warning: null,
    };
  }
  const haystack = lowerVi(description);
  const scored = styleDefinitions
    .map((definition, order) => {
      const explicit = definition.explicit.reduce((sum, pattern) => sum + (pattern.test(haystack) ? 1 : 0), 0);
      const evidence = definition.evidence.reduce((sum, pattern) => sum + (pattern.test(haystack) ? 1 : 0), 0);
      return { label: definition.label, score: explicit * 3 + Math.min(evidence, 3) * 0.75, explicit, order };
    })
    .filter((item) => item.score >= 1.5)
    .sort((a, b) => b.score - a.score || b.explicit - a.explicit || a.order - b.order);
  const selected = scored.slice(0, 2);
  return {
    styles: selected.map((item) => item.label),
    scores: Object.fromEntries(scored.map((item) => [item.label, Number(item.score.toFixed(2))])),
    warning: selected.length ? null : "STYLE_LOW_CONFIDENCE",
  };
};

export const silhouetteRules: readonly { label: string; pattern: RegExp }[] = [
  { label: "SUÔNG", pattern: /\bsuong\b/u }, { label: "ỐNG RỘNG", pattern: /ong rong/u },
  { label: "XÒE", pattern: /\bxoe\b/u }, { label: "ÔM", pattern: /\bom\b|om nhe|om dang/u },
  { label: "CHIẾT EO", pattern: /chiet eo|nhan eo|ton eo/u }, { label: "PEPLUM", pattern: /peplum/u },
  { label: "CỔ YẾM", pattern: /co yem/u }, { label: "CỔ VEST", pattern: /co vest/u },
  { label: "CHỮ A", pattern: /chu a|a-line/u }, { label: "MAXI", pattern: /maxi/u },
];

export const occasionRules: readonly { label: string; pattern: RegExp }[] = [
  { label: "ĐI LÀM", pattern: /di lam|cong so/u }, { label: "ĐI TIỆC", pattern: /di tiec|du tiec|tiec nhe/u },
  { label: "ĐI CHƠI", pattern: /di choi/u }, { label: "DU LỊCH", pattern: /du lich/u },
  { label: "GẶP GỠ", pattern: /gap go/u }, { label: "CƯỚI HỎI", pattern: /cuoi hoi|dam cuoi|dam hoi/u },
  { label: "CHỤP ẢNH", pattern: /chup anh/u }, { label: "HÀNG NGÀY", pattern: /hang ngay/u },
];

// --- gom nhóm biến thể XML thành hồ sơ sản phẩm cha ---

export interface XmlGroup {
  items: Record<string, unknown>[];
  images: Set<string>;
  primaryImages: Set<string>;
  attrs: VariantAttr[];
}

export function groupXmlItems(channelItems: readonly Record<string, unknown>[]): Map<string, XmlGroup> {
  const groups = new Map<string, XmlGroup>();
  for (const item of channelItems) {
    const groupId = xmlText(item["g:item_group_id"] ?? item.item_group_id).toUpperCase();
    if (!groupId) continue;
    if (!groups.has(groupId)) {
      groups.set(groupId, { items: [], images: new Set(), primaryImages: new Set(), attrs: [] });
    }
    const group = groups.get(groupId) as XmlGroup;
    group.items.push(item);
    const primary = xmlText(item["g:image_link"] ?? item.image_link);
    if (primary) {
      group.images.add(primary);
      group.primaryImages.add(primary);
    }
    for (const image of asList(item.additional_image_link)) {
      const value = xmlText(image);
      if (value) group.images.add(value);
    }
    for (const attr of asList(item.additional_variant_attribute)) {
      const record = (attr ?? {}) as Record<string, unknown>;
      group.attrs.push({ label: xmlText(record.label), value: xmlText(record.value) });
    }
  }
  return groups;
}

export function buildXmlProfiles(
  registry: Readonly<Record<string, RegistryEntry>>,
  groups: ReadonlyMap<string, XmlGroup>,
  now: string,
): XmlProfile[] {
  const profiles: XmlProfile[] = [];
  for (const reg of Object.values(registry)) {
    const candidateIds = unique([reg.xml_group_id, reg.ma_sp]);
    const groupId = candidateIds.find((id) => groups.has(id));
    if (!groupId) continue;
    const group = groups.get(groupId) as XmlGroup;
    const items = [...group.items].sort((a, b) => compareStable(itemStableId(a), itemStableId(b)));
    const rawTitles = items.map((item) => normalizedValue(xmlText(item["g:title"] ?? item.title))).filter(Boolean);
    const parentTitles = rawTitles.map(cleanParentTitle).filter(Boolean);
    const title = normalizedValue(reg.title_override) || stableMode(parentTitles) || groupId;
    const descriptions = items
      .map((item) => unicodeText(xmlText(item["g:description"] ?? item.description)))
      .filter(Boolean);
    const descriptionXml = normalizedValue(reg.description_override) || stableMode(descriptions, true);
    const links = items
      .map((item) => xmlText(item["g:link"] ?? item.link))
      .filter(Boolean)
      .map((value) => {
        try {
          return normalizeFeedUrl(value);
        } catch {
          return "";
        }
      })
      .filter(Boolean);
    const link = stableMode(links);
    const brandXml = stableMode(items.map((item) => xmlText(item["g:brand"] ?? item.brand)).filter(Boolean));
    const sortedAttrs = [...group.attrs].sort((a, b) =>
      compareStable(`${ascii(a.label)}|${lowerVi(a.value)}`, `${ascii(b.label)}|${lowerVi(b.value)}`));
    const searchable = ascii(
      [title, ...parentTitles, descriptionXml, ...sortedAttrs.map((attr) => attr.value)].join(" "),
    );
    let categoryAuto = "OTHER";
    if (/ao dai/u.test(searchable)) categoryAuto = "AO_DAI";
    else if (/combo.*3|ba mon/u.test(searchable) || reg.ma_sp.startsWith("CB")) categoryAuto = "COMBO_3_MON";
    else if (/set quan/u.test(searchable) || reg.ma_sp.startsWith("SQ")) categoryAuto = "SET_QUAN";
    else if (/set vay/u.test(searchable) || reg.ma_sp.startsWith("SV")) categoryAuto = "SET_VAY";
    else if (/chan vay/u.test(searchable)) categoryAuto = "CHAN_VAY";
    else if (/\bvay\b|\bdam\b/u.test(searchable)) categoryAuto = "VAY";
    else if (/\bao\b/u.test(searchable)) categoryAuto = "AO";
    else if (/\bquan\b/u.test(searchable)) categoryAuto = "QUAN";
    const ruleAuto = categoryAuto === "COMBO_3_MON" ? "CB"
      : categoryAuto === "SET_QUAN" ? "SQ"
        : categoryAuto === "SET_VAY" ? "SV" : "DIRECT";
    const ruleType = reg.rule_type || ruleAuto;
    const category = reg.category || categoryAuto;

    const colorResult = parseColors(descriptionXml, sortedAttrs, title, reg.color_override);
    const materialResult = extractMaterialComponents(
      descriptionXml, category, reg.material_override, reg.material_components_override,
    );
    const styleResult = extractStyles(descriptionXml, reg.style_override);
    const silhouettesAuto = unique(matchLabels(searchable, silhouetteRules));
    const occasionsAuto = unique(matchLabels(searchable, occasionRules));
    const warnings = unique([
      ...(colorResult.primary.length ? [] : ["COLOR_NOT_FOUND"]),
      ...materialResult.warnings,
      ...(styleResult.warning ? [styleResult.warning] : []),
    ]);
    const aliases = mergeSets(reg.aliases, parentTitles, [title, groupId]);

    const urls: string[] = [];
    for (const raw of group.images) {
      try {
        urls.push(normalizeFeedUrl(raw));
      } catch {
        // giữ nguyên hành vi n8n: bỏ qua URL không hợp lệ
      }
    }
    const images = [...new Set(urls)].sort();
    const primaryImages = [
      ...new Set(
        [...group.primaryImages]
          .map((raw) => {
            try {
              return normalizeFeedUrl(raw);
            } catch {
              return "";
            }
          })
          .filter(Boolean),
      ),
    ].sort(compareStable);
    const sizes = uniqueSorted(
      sortedAttrs.filter((attr) => ascii(attr.label).trim() === "size").map((attr) => attr.value),
    );
    const classifications = uniqueSorted(
      sortedAttrs.filter((attr) => ascii(attr.label).includes("phan loai")).map((attr) => attr.value),
    );
    let confidence = 0;
    if (categoryAuto !== "OTHER") confidence += 0.25;
    if (materialResult.flat.length) confidence += 0.30;
    if (styleResult.styles.length) confidence += 0.15;
    if (silhouettesAuto.length) confidence += 0.10;
    if (occasionsAuto.length) confidence += 0.10;
    if (colorResult.primary.length) confidence += 0.10;
    confidence = Number(confidence.toFixed(2));
    const hardWarnings = warnings.filter(
      (value) => value === "MATERIAL_NOT_FOUND" || value === "MATERIAL_COMPONENT_AMBIGUOUS",
    );
    const reviewStatus = categoryAuto === "OTHER" || hardWarnings.length || confidence < 0.55
      ? "NEED_REVIEW" : "AUTO_OK";
    const sourceHashInput = canonicalForSourceHash({
      extraction_version: EXTRACTION_VERSION,
      groupId,
      title,
      descriptionXml,
      link,
      images,
      primaryImages,
      sizes,
      classifications,
      aliases,
      color_primary: colorResult.primary,
      color_detail: colorResult.detail,
      material_components: materialResult.components,
      styles: styleResult.styles,
    });
    const sourceHash = createHash("sha256").update(JSON.stringify(sourceHashInput)).digest("hex");
    const xmlUpdatedAt = reg.source_hash === sourceHash && reg.xml_updated_at ? reg.xml_updated_at : now;

    profiles.push({
      reg,
      group_id: groupId,
      title,
      description_xml: descriptionXml,
      material_xml: materialResult.summary,
      material_components: materialResult.components,
      color_primary: colorResult.primary,
      color_detail: colorResult.detail,
      style_primary: styleResult.styles[0] || "",
      style_secondary: styleResult.styles[1] || "",
      style_scores: styleResult.scores,
      extraction_warnings: warnings,
      extraction_version: EXTRACTION_VERSION,
      product_link: link,
      brand_xml: brandXml,
      images,
      primary_images: primaryImages,
      sizes,
      classifications,
      rule_type: ruleType,
      category,
      aliases,
      search_colors: colorResult.primary,
      search_styles: styleResult.styles,
      search_materials: materialResult.flat,
      search_silhouettes: mergeSets(reg.search_silhouettes, silhouettesAuto),
      search_occasions: mergeSets(reg.search_occasions, occasionsAuto),
      auto_confidence: confidence,
      review_status: reviewStatus,
      source_hash: sourceHash,
      xml_updated_at: xmlUpdatedAt,
    });
  }
  return profiles;
}

/** Port node "Normalize Structured Extraction": sửa chất liệu bị gán nhầm vào LÓT và tính lại hash. */
export function normalizeStructuredExtraction(profiles: readonly XmlProfile[]): XmlProfile[] {
  const labels: Record<string, string> = {
    AO_DAI: "ÁO DÀI", AO: "ÁO", CHAN_VAY: "CHÂN VÁY", QUAN: "QUẦN", VAY: "VÁY",
    PHU_KIEN: "PHỤ KIỆN", LOT: "LÓT",
  };
  const primary = (category: string): string[] =>
    category === "SET_QUAN" ? ["AO", "QUAN"]
      : category === "SET_VAY" ? ["AO", "CHAN_VAY"]
        : category === "COMBO_3_MON" ? ["AO", "CHAN_VAY", "QUAN"]
          : category === "AO_DAI" ? ["AO_DAI", "QUAN"]
            : category === "CHAN_VAY" ? ["CHAN_VAY"]
              : category === "VAY" ? ["VAY"]
                : category === "AO" ? ["AO"]
                  : category === "QUAN" ? ["QUAN"] : [];

  return profiles.map((profile) => {
    const components = JSON.parse(JSON.stringify(profile.material_components || {})) as Record<string, string[]>;
    const lining = unique(components.LOT || []);
    const misplacedMain = lining.filter((value) => !value.includes("LÓT"));
    if (misplacedMain.length) {
      components.LOT = lining.filter((value) => value.includes("LÓT"));
      for (const key of primary(profile.category)) {
        components[key] = unique([...(components[key] || []), ...misplacedMain]);
      }
      if (!components.LOT.length) delete components.LOT;
    }
    const ordered: Record<string, string[]> = {};
    for (const key of ["AO_DAI", "AO", "CHAN_VAY", "QUAN", "VAY", "PHU_KIEN", "LOT"]) {
      if ((components[key] || []).length) ordered[key] = unique(components[key]);
    }
    const flat = unique(Object.values(ordered).flat());
    const summary = Object.entries(ordered)
      .map(([key, values]) => `${labels[key] || key}: ${values.join(" | ")}`)
      .join("; ");
    const warnings = unique(
      (profile.extraction_warnings || []).filter(
        (value) => value !== "MATERIAL_COMPONENT_AMBIGUOUS" || !flat.length,
      ),
    );
    const hardWarnings = warnings.filter(
      (value) => value === "MATERIAL_NOT_FOUND" || value === "MATERIAL_COMPONENT_AMBIGUOUS",
    );
    const reviewStatus = profile.category === "OTHER" || hardWarnings.length
      || Number(profile.auto_confidence || 0) < 0.55 ? "NEED_REVIEW" : "AUTO_OK";
    const sourceHash = createHash("sha256")
      .update(JSON.stringify({
        base: profile.source_hash,
        material_components: ordered,
        normalizer: NORMALIZER_VERSION,
      }))
      .digest("hex");
    // `SOURCE_HASH` trong product_registry là hash SAU normalize, nên phép so sánh giữ
    // `xml_updated_at` phải làm ở đây. Làm ở buildXmlProfiles (hash trước normalize) thì
    // không bao giờ khớp và cột XML_UPDATED_AT bị làm mới mỗi lần chạy.
    const xmlUpdatedAt = profile.reg.source_hash === sourceHash && profile.reg.xml_updated_at
      ? profile.reg.xml_updated_at
      : profile.xml_updated_at;
    return {
      ...profile,
      material_components: ordered,
      search_materials: flat,
      material_xml: summary,
      extraction_warnings: warnings,
      review_status: reviewStatus,
      source_hash: sourceHash,
      xml_updated_at: xmlUpdatedAt,
    };
  });
}
