export const UPSALE_MESSAGE_FRAGMENTS = [
  {
    templateId: "UPSALE_FOLLOWUP_01",
    fragment: "chị ơi thật ngại em sợ làm phiền chị",
  },
  {
    templateId: "UPSALE_FOLLOWUP_02",
    fragment: "em nhắn lại xem mình còn cần tư vấn về sản phẩm không ạ",
  },
  {
    templateId: "UPSALE_FOLLOWUP_03",
    fragment: "hôm trước mình có hỏi về sản phẩm, shop chưa thấy mình phản hồi lại",
  },
] as const;

export type UpsaleTemplateId = (typeof UPSALE_MESSAGE_FRAGMENTS)[number]["templateId"];

export interface UpsaleMessageMatch {
  templateId: UpsaleTemplateId;
  templateVersion: "v1";
  normalizedText: string;
}

/**
 * Canonical form used only for deterministic outreach classification/hashing.
 * It intentionally keeps Vietnamese diacritics and punctuation meaningful.
 */
export function normalizeUpsaleText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/gu, "")
    .toLocaleLowerCase("vi")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Matches a known fragment anywhere in the message; suffixes/prefixes are allowed. */
export function classifyUpsaleMessage(text: string | null): UpsaleMessageMatch | null {
  if (text === null || text.length === 0) return null;
  const normalizedText = normalizeUpsaleText(text);
  const match = UPSALE_MESSAGE_FRAGMENTS.find(({ fragment }) =>
    normalizedText.includes(fragment),
  );
  return match
    ? {
        templateId: match.templateId,
        templateVersion: "v1",
        normalizedText,
      }
    : null;
}
