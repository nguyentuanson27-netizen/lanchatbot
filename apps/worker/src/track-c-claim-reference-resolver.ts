import type { ContextV2 } from "@lana/contracts";
import { candidateProductPresentationClaims } from "./context-v2-candidate.js";

type ClaimReferenceRegistryEntry = Readonly<{
  contentHash: string;
  placeholders: Readonly<Record<string, string>> | null;
}>;

const PRESENTATION_FRAMING_WORDS = new Set([
  "ạ",
  "bản",
  "biến",
  "có",
  "cỡ",
  "của",
  "dạ",
  "em",
  "gồm",
  "là",
  "màu",
  "mã",
  "mẫu",
  "nha",
  "nhé",
  "phiên",
  "size",
  "tên",
  "thể",
  "thông",
  "thuộc",
  "tin",
  "và",
  "với",
  "chị",
]);

function hasExpectedPresentationRole(
  text: string,
  placeholder: string,
): boolean {
  const semanticTokens = text.normalize("NFC")
    .match(/\{\{[A-Z_]+\}\}|\p{L}+/gu)
    ?.map((token) => token.startsWith("{{")
      ? token
      : token.toLocaleLowerCase("vi-VN")) ?? [];
  const index = semanticTokens.indexOf(`{{${placeholder}}}`);
  if (index < 0) return false;
  const previous = semanticTokens[index - 1];
  const next = semanticTokens[index + 1];
  if (placeholder === "VARIANT_COLOR") return previous === "màu";
  if (placeholder === "VARIANT_SIZE") {
    return previous === "size" || previous === "cỡ";
  }
  if (placeholder !== "DISPLAY_NAME") return false;
  if (previous === "mẫu" || previous === "tên" || previous === "mã") {
    return true;
  }
  if (previous === "là" &&
      (semanticTokens[index - 2] === "mẫu" ||
       semanticTokens[index - 2] === "tên")) {
    return true;
  }
  return next === "có" &&
    (previous === undefined ||
     previous === "dạ" ||
     previous === "em" ||
     previous === "chị");
}

export type ClaimReferenceErrors = Readonly<{
  invalid: string;
  unknown: string;
  duplicate: string;
  textMismatch: string;
}>;

export function buildTrackCClaimReferenceRegistry(
  context: ContextV2,
): ReadonlyMap<string, ClaimReferenceRegistryEntry> {
  const registry = new Map<string, ClaimReferenceRegistryEntry>(
    context.verifiedClaims.map((claim, index) => [
      `CLAIM_${String(index + 1).padStart(3, "0")}`,
      Object.freeze({
        contentHash: claim.provenance.contentHash,
        placeholders: null,
      }),
    ]),
  );
  if (context.productAttributes !== null &&
      context.productAttributes !== undefined) {
    registry.set(
      "PRODUCT_ATTRIBUTES_001",
      Object.freeze({
        contentHash: context.productAttributes.metadata.contentHash,
        placeholders: null,
      }),
    );
  }
  if (context.productPresentation !== null &&
      context.productPresentation !== undefined) {
    for (const claim of candidateProductPresentationClaims(
      context.productPresentation,
    )) {
      registry.set(claim.claimRef, Object.freeze({
        contentHash: context.productPresentation.provenance.contentHash,
        placeholders: claim.placeholders,
      }));
    }
  }
  return registry;
}

function resolvePlaceholders(
  text: unknown,
  placeholders: Readonly<Record<string, string>>,
  textMismatch: string,
): string {
  if (typeof text !== "string") throw new Error(textMismatch);
  const rawTokens = [...text.matchAll(/\{\{([^{}]*)\}\}/gu)];
  const tokens = rawTokens.map(
    (match) => match[1]!,
  );
  const expected = Object.keys(placeholders).sort();
  if (tokens.length !== expected.length ||
      new Set(tokens).size !== tokens.length ||
      tokens.some((token) => !/^[A-Z_]+$/u.test(token)) ||
      [...tokens].sort().some((token, index) => token !== expected[index])) {
    throw new Error(textMismatch);
  }
  const framing = tokens.reduce(
    (remaining, token) => remaining.replace(`{{${token}}}`, ""),
    text,
  );
  if (/[{}]/u.test(framing)) throw new Error(textMismatch);
  const normalizedFraming = framing.normalize("NFC")
    .toLocaleLowerCase("vi-VN");
  const words = normalizedFraming.match(/\p{L}+/gu) ?? [];
  const punctuationOnly = normalizedFraming.replace(
    /\p{L}+|[\s.,:;!?()\-/]/gu,
    "",
  );
  if (punctuationOnly.length > 0 ||
      words.some((word) => !PRESENTATION_FRAMING_WORDS.has(word)) ||
      expected.some((placeholder) =>
        !hasExpectedPresentationRole(text, placeholder))) {
    throw new Error(textMismatch);
  }
  return tokens.reduce(
    (resolved, token) => resolved.replace(
      `{{${token}}}`,
      placeholders[token]!,
    ),
    text,
  );
}

export function resolveTrackCCandidateClaimReferences(
  value: unknown,
  registry: ReadonlyMap<string, ClaimReferenceRegistryEntry>,
  errors: ClaimReferenceErrors,
): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errors.invalid);
  }
  const output = value as Readonly<Record<string, unknown>>;
  if (!Array.isArray(output.segments)) throw new Error(errors.invalid);
  const used = new Set<string>();
  const segments = output.segments.map((segment) => {
    if (segment === null || typeof segment !== "object" ||
        Array.isArray(segment)) {
      throw new Error(errors.invalid);
    }
    const record = segment as Readonly<Record<string, unknown>>;
    if (Object.hasOwn(record, "claimContentHash")) {
      throw new Error(errors.invalid);
    }
    if (record.kind !== "VERIFIED_CLAIM") {
      if (Object.hasOwn(record, "claimRef")) throw new Error(errors.invalid);
      return record;
    }
    if (typeof record.claimRef !== "string") throw new Error(errors.invalid);
    const entry = registry.get(record.claimRef);
    if (entry === undefined) throw new Error(errors.unknown);
    if (used.has(record.claimRef)) throw new Error(errors.duplicate);
    used.add(record.claimRef);
    const { claimRef: _claimRef, ...rest } = record;
    const text = entry.placeholders === null
      ? record.text
      : resolvePlaceholders(
          record.text,
          entry.placeholders,
          errors.textMismatch,
        );
    return Object.freeze({
      ...rest,
      text,
      claimContentHash: entry.contentHash,
    });
  });
  return Object.freeze({ ...output, segments: Object.freeze(segments) });
}
