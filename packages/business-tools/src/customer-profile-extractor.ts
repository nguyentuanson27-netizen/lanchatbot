import {
  BodyMeasurementV1Schema,
  type BodyMeasurementV1,
  type MeasurementKind,
} from "@lana/contracts";

export interface CustomerMeasurementExtractionInput {
  readonly text: string;
  readonly observedAt: string;
  readonly sourceEventHash: string;
}

const measurement = (
  kind: MeasurementKind,
  value: number,
  input: CustomerMeasurementExtractionInput,
  confidence: number,
): BodyMeasurementV1 =>
  BodyMeasurementV1Schema.parse({
    kind,
    value,
    provenance: {
      source: "CUSTOMER_MESSAGE",
      sourceEventHash: input.sourceEventHash,
      observedAt: input.observedAt,
      confidence,
    },
  });

const decimal = (value: string): number =>
  Number.parseFloat(value.replace(",", "."));

function normalizeHeight(value: string, meters: string | undefined): number {
  const parsed = decimal(value);
  if (meters !== undefined || parsed < 3) return Math.round(parsed * 100);
  return Math.round(parsed);
}

function inRange(kind: MeasurementKind, value: number): boolean {
  if (kind === "HEIGHT_CM") return value >= 130 && value <= 210;
  if (kind === "WEIGHT_KG") return value >= 30 && value <= 200;
  return value >= 45 && value <= 180;
}

function latestMatch(
  text: string,
  patterns: readonly RegExp[],
): { value: number; confidence: number } | null {
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    const match = matches.at(-1);
    if (!match?.[1]) continue;
    return { value: decimal(match[1]), confidence: 0.99 };
  }
  return null;
}

/**
 * Extracts only explicit body measurements. Bare numbers are deliberately
 * ignored so phone numbers, prices and order codes cannot enter the profile.
 */
export function extractCustomerMeasurements(
  input: CustomerMeasurementExtractionInput,
): readonly BodyMeasurementV1[] {
  const text = input.text.normalize("NFC").toLocaleLowerCase("vi-VN");
  const found = new Map<MeasurementKind, BodyMeasurementV1>();

  const threeRounds = [...text.matchAll(
    /(?:số\s*đo\s*)?(?:3|ba)\s*vòng\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*[-/x×]\s*(\d{2,3}(?:[.,]\d+)?)\s*[-/x×]\s*(\d{2,3}(?:[.,]\d+)?)/giu,
  )].at(-1);
  if (threeRounds) {
    const values: readonly [MeasurementKind, string | undefined][] = [
      ["BUST_CM", threeRounds[1]],
      ["WAIST_CM", threeRounds[2]],
      ["HIPS_CM", threeRounds[3]],
    ];
    for (const [kind, raw] of values) {
      if (!raw) continue;
      const value = decimal(raw);
      if (inRange(kind, value)) {
        found.set(kind, measurement(kind, value, input, 0.98));
      }
    }
  }

  const meterCentimeters = [...text.matchAll(
    /(?:(?:chiều\s*cao|cao)\s*[:=]?\s*)?([12])\s*m\s*(\d{1,2})\b/giu,
  )].at(-1);
  if (meterCentimeters?.[1] && meterCentimeters[2]) {
    const value = Number(meterCentimeters[1]) * 100 +
      Number(meterCentimeters[2].padEnd(2, "0"));
    if (inRange("HEIGHT_CM", value)) {
      found.set("HEIGHT_CM", measurement("HEIGHT_CM", value, input, 0.99));
    }
  }

  const heightPatterns = [
    /(?:chiều\s*cao|cao)\s*[:=]?\s*(\d(?:[.,]\d{1,2}))\s*(m(?:ét)?)?\b/giu,
    /(?:chiều\s*cao|cao)\s*[:=]?\s*(1[3-9]\d|20\d|210)\s*(?:cm)?\b/giu,
    /\b(\d(?:[.,]\d{1,2}))\s*m(?:ét)?\b/giu,
  ] as const;
  for (const pattern of heightPatterns) {
    if (found.has("HEIGHT_CM")) break;
    const matches = [...text.matchAll(pattern)];
    const match = matches.at(-1);
    if (!match?.[1]) continue;
    const value = normalizeHeight(match[1], match[2]);
    if (inRange("HEIGHT_CM", value)) {
      found.set("HEIGHT_CM", measurement("HEIGHT_CM", value, input, 0.99));
      break;
    }
  }

  const weight = latestMatch(text, [
    /(?:cân\s*nặng|nặng)\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|ký|kí|cân)?\b/giu,
    /\b(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|ký|kí)\b/giu,
  ]);
  if (weight && inRange("WEIGHT_KG", weight.value)) {
    found.set(
      "WEIGHT_KG",
      measurement("WEIGHT_KG", weight.value, input, weight.confidence),
    );
  }

  const explicit: readonly [
    MeasurementKind,
    readonly RegExp[],
  ][] = [
    ["BUST_CM", [
      /(?:vòng\s*ngực|ngực|vòng\s*1|v1)\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:cm)?\b/giu,
    ]],
    ["WAIST_CM", [
      /(?:vòng\s*eo|eo|vòng\s*2|v2)\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:cm)?\b/giu,
    ]],
    ["HIPS_CM", [
      /(?:vòng\s*mông|mông|vòng\s*3|v3)\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:cm)?\b/giu,
    ]],
  ];
  for (const [kind, patterns] of explicit) {
    const candidate = latestMatch(text, patterns);
    if (candidate && inRange(kind, candidate.value)) {
      found.set(kind, measurement(kind, candidate.value, input, candidate.confidence));
    }
  }

  return [...found.values()];
}
