import type { ContextV2 } from "@lana/contracts";
import { candidateProductPresentationClaims } from "./context-v2-candidate.js";

type ClaimReferenceRegistryEntry = Readonly<{
  contentHash: string;
  placeholders: Readonly<Record<string, string>> | null;
}>;

function hasValidPresentationProduction(
  text: string,
  expected: readonly string[],
): boolean {
  const tokens = text.normalize("NFC")
    .match(/\{\{[A-Z_]+\}\}|\p{L}+/gu)
    ?.map((token) => token.startsWith("{{")
      ? token
      : token.toLocaleLowerCase("vi-VN")) ?? [];
  let cursor = tokens[0] === "dạ" ? 1 : 0;
  let displayForm: "SUBJECT" | "MODEL" | "NAME";
  if (tokens[cursor] === "{{DISPLAY_NAME}}") {
    displayForm = "SUBJECT";
    cursor += 1;
  } else if (tokens[cursor] === "mẫu" &&
      tokens[cursor + 1] === "{{DISPLAY_NAME}}") {
    displayForm = "MODEL";
    cursor += 2;
  } else if (
    tokens[cursor] === "tên" && tokens[cursor + 1] === "mẫu" &&
    tokens[cursor + 2] === "là" &&
    tokens[cursor + 3] === "{{DISPLAY_NAME}}"
  ) {
    displayForm = "NAME";
    cursor += 4;
  } else {
    return false;
  }

  const requiredFacts = new Set(
    expected.filter((placeholder) => placeholder !== "DISPLAY_NAME"),
  );
  if (requiredFacts.size > 0) {
    if (tokens[cursor] !== "có") return false;
    cursor += 1;
    if (tokens[cursor] === "phiên" && tokens[cursor + 1] === "bản") {
      cursor += 2;
    }
    const seen = new Set<string>();
    while (cursor < tokens.length && seen.size < requiredFacts.size) {
      const label = tokens[cursor];
      const placeholder = tokens[cursor + 1];
      const fact = label === "màu" && placeholder === "{{VARIANT_COLOR}}"
        ? "VARIANT_COLOR"
        : (label === "size" || label === "cỡ") &&
            placeholder === "{{VARIANT_SIZE}}"
          ? "VARIANT_SIZE"
          : null;
      if (fact === null || !requiredFacts.has(fact) || seen.has(fact)) {
        return false;
      }
      seen.add(fact);
      cursor += 2;
      if (tokens[cursor] === "và") cursor += 1;
    }
    if (seen.size !== requiredFacts.size) return false;
  } else if (displayForm === "SUBJECT") {
    return false;
  }

  if (tokens[cursor] === "chị" || tokens[cursor] === "em") cursor += 1;
  if (tokens[cursor] === "nhé" || tokens[cursor] === "nha" ||
      tokens[cursor] === "ạ") {
    cursor += 1;
  }
  return cursor === tokens.length;
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
  const punctuationOnly = normalizedFraming.replace(
    /\p{L}+|[\s.,:;!?()\-/]/gu,
    "",
  );
  if (punctuationOnly.length > 0 ||
      !hasValidPresentationProduction(text, expected)) {
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
