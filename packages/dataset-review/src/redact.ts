// Per-conversation PII redaction with a stable placeholder mapping: the same
// phone number always becomes [PHONE_1] within one conversation. Redaction
// over-redacts rather than risk leaking real PII. Raw text is never returned
// here; only redacted projections and a non-reversible count report.

export const REDACTION_VERSION = "redact-v1";

export type PiiType = "PHONE" | "EMAIL" | "URL" | "ORDER_ID" | "ADDRESS" | "PERSON";

export interface RedactionEntity {
  readonly type: PiiType;
  readonly placeholder: string;
  readonly index: number;
}

const PII_ORDER: readonly PiiType[] = ["EMAIL", "URL", "ORDER_ID", "PHONE", "ADDRESS", "PERSON"];

// Format-preserving synthetic values for checkout benchmarks (§8.3). Indexed by
// the entity number so [PHONE_1] and [PHONE_2] get distinct, realistic values.
const SYNTHETIC: Readonly<Record<PiiType, readonly string[]>> = {
  PHONE: ["0900000001", "0900000002", "0900000003", "0900000004"],
  EMAIL: ["an.nguyen@example.com", "binh.tran@example.com", "chi.le@example.com"],
  URL: ["https://example.com/a", "https://example.com/b"],
  ORDER_ID: ["DH000001", "DH000002", "DH000003"],
  ADDRESS: ["12 Nguyễn Trãi, Hà Nội", "34 Lê Lợi, Đà Nẵng", "56 Hai Bà Trưng, TP.HCM"],
  PERSON: ["Nguyễn An", "Trần Bình", "Lê Chi"],
};

function synthetic(type: PiiType, index: number): string {
  const pool = SYNTHETIC[type];
  const value = pool[(index - 1) % pool.length];
  // Distinguish entities beyond the pool size deterministically.
  return index <= pool.length ? (value ?? `${type}_${index}`) : `${value ?? type}-${index}`;
}

export class ConversationRedactor {
  private readonly counters = new Map<PiiType, number>();
  // canonical entity value -> placeholder, for stable mapping within one convo.
  private readonly assigned = new Map<string, string>();
  private readonly placeholderIndex = new Map<string, { type: PiiType; index: number }>();

  private placeholderFor(type: PiiType, canonical: string): string {
    const key = `${type}:${canonical}`;
    const existing = this.assigned.get(key);
    if (existing) return existing;
    const next = (this.counters.get(type) ?? 0) + 1;
    this.counters.set(type, next);
    const placeholder = `[${type}_${next}]`;
    this.assigned.set(key, placeholder);
    this.placeholderIndex.set(placeholder, { type, index: next });
    return placeholder;
  }

  private applyType(type: PiiType, text: string): string {
    switch (type) {
      case "EMAIL":
        return text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, (match) =>
          this.placeholderFor("EMAIL", match.toLowerCase()),
        );
      case "URL":
        return text.replace(/https?:\/\/[^\s]+/giu, (match) =>
          this.placeholderFor("URL", match.toLowerCase()),
        );
      case "ORDER_ID": {
        // Labelled order/tracking codes first, then bare long alphanumeric refs.
        const labelled = text.replace(
          /((?:mã\s*)?(?:đơn(?:\s*hàng)?|vận\s*đơn|mã\s*vận\s*đơn|tracking|order)\s*[:#-]?\s*)([A-Z0-9]{5,})/giu,
          (_all, label: string, code: string) =>
            `${label}${this.placeholderFor("ORDER_ID", code.toUpperCase())}`,
        );
        return labelled.replace(
          /\b(?=[A-Z0-9]*[0-9])(?=[A-Z0-9]*[A-Z])[A-Z0-9]{8,}\b/gu,
          (match) => this.placeholderFor("ORDER_ID", match.toUpperCase()),
        );
      }
      case "PHONE":
        return text.replace(/(?:\+?84|0)(?:[ .\-]?\d){8,10}/gu, (match) =>
          this.placeholderFor("PHONE", match.replace(/[ .\-]/gu, "")),
        );
      case "ADDRESS":
        return text
          .split(/\n/u)
          .map((line) =>
            /(?:địa\s*chỉ|dia\s*chi|số\s*nhà|đường|phường|quận|huyện|xã|tỉnh|thành\s*phố|ngõ|ấp|thôn)/iu.test(
              line,
            )
              ? this.placeholderFor("ADDRESS", line.trim().toLowerCase())
              : line,
          )
          .join("\n");
      case "PERSON":
        return text.replace(
          /((?:họ\s*tên|ho\s*ten|tên\s*người\s*nhận|ten\s*nguoi\s*nhan|tên\s*kh)\s*[:#-]?\s*)([\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+){1,4})/giu,
          (_all, label: string, name: string) =>
            `${label}${this.placeholderFor("PERSON", name.toLowerCase())}`,
        );
      default:
        return text;
    }
  }

  redact(text: string): string {
    let output = text;
    for (const type of PII_ORDER) {
      output = this.applyType(type, output);
    }
    return output;
  }

  // Materialise a previously-redacted text with format-preserving synthetic PII.
  synthesize(redactedText: string): string {
    return redactedText.replace(/\[(PHONE|EMAIL|URL|ORDER_ID|ADDRESS|PERSON)_(\d+)\]/gu, (match) => {
      const entity = this.placeholderIndex.get(match);
      if (!entity) return match;
      return synthetic(entity.type, entity.index);
    });
  }

  report(): { readonly counts: Readonly<Record<PiiType, number>>; readonly entities: readonly RedactionEntity[] } {
    const counts = Object.fromEntries(
      PII_ORDER.map((type) => [type, this.counters.get(type) ?? 0]),
    ) as Record<PiiType, number>;
    const entities: RedactionEntity[] = [];
    for (const [placeholder, { type, index }] of this.placeholderIndex) {
      entities.push({ type, placeholder, index });
    }
    return { counts, entities };
  }
}

// Convenience: has any residual bare-number/email risk survived redaction?
export function hasResidualPii(text: string): boolean {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b\d{9,}\b/iu.test(text);
}
