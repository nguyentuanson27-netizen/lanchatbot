/**
 * The writer may edit address/politeness at sentence boundaries, not a claim.
 * Keep every other character (including negation, quantities, punctuation in
 * prices, product names and policy conjunctions). This is a lossless editorial
 * surface, not a semantic classifier or permission for factual paraphrase.
 */
export function trackCRealizationVariants(source: string): readonly string[] {
  // Only the projector's final politeness suffix may change. Never remove
  // words inside the source or normalize numbers, names, negation or clauses.
  const plain = source.replace(/ (?:ạ|nhé|nha)([.!?])$/u, "$1");
  return [...new Set([source, plain,
    ...(source.startsWith("Dạ") ? [] : [`Dạ, ${plain}`]),
  ])];
}

export function trackCRealizationMatches(value: string, source: string): boolean {
  // No whitespace folding, case folding, punctuation removal or number
  // normalization: such changes can alter subject identity or a policy.
  return trackCRealizationVariants(source).includes(value);
}

/** Customer-facing rendering of already validated segments, one text unit. */
export function trackCComposeReply(texts: readonly string[]): string {
  return texts.map((value, index) => {
    // Only remove repeated sentence-final politeness. Never touch an internal
    // material/name token such as "vải dạ", or add/change a factual clause.
    const final = index === texts.length - 1;
    return final ? value : value.replace(/ (?:ạ|nhé|nha)([.!?])$/u, "$1");
  }).join(" ");
}

/** Match a complete, lossless permutation to source units, not model claim IDs.
 * Fixed first-contact still uses its positional layout. Ambiguous cross-subject
 * wording cannot be used to choose another source unit. */
export function trackCOrderEvidence<T extends { deterministicText?: string }>(
  evidence: readonly T[], texts: readonly string[], allowReorder: boolean,
): readonly T[] {
  if (texts.length === 0) return evidence;
  if (texts.length !== evidence.length) throw new Error("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
  const remaining = new Set(evidence.map((_, index) => index));
  return texts.map((value, index) => {
    const matches = [...remaining].filter((position) =>
      evidence[position]!.deterministicText !== undefined &&
      trackCRealizationMatches(value, evidence[position]!.deterministicText!));
    const position = matches.includes(index) ? index
      : allowReorder && matches.length === 1 ? matches[0]! : -1;
    if (position < 0) throw new Error("TRACK_C_RESPONDER_UNBOUND_FACTUAL_TEXT");
    remaining.delete(position);
    return evidence[position]!;
  });
}
