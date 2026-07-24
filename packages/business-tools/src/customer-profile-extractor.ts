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

const foldVietnamese = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/gu, "d")
    .toLocaleLowerCase("vi-VN");

function normalizeHeight(value: number): number {
  return value < 3 ? Math.round(value * 100) : Math.round(value);
}

function inRange(kind: MeasurementKind, value: number): boolean {
  if (kind === "HEIGHT_CM") return value >= 130 && value <= 210;
  if (kind === "WEIGHT_KG") return value >= 30 && value <= 200;
  return value >= 45 && value <= 180;
}

function lastCaptured(
  text: string,
  patterns: readonly RegExp[],
): { value: number; confidence: number } | null {
  for (const pattern of patterns) {
    const match = [...text.matchAll(pattern)].at(-1);
    if (!match?.[1]) continue;
    return { value: decimal(match[1]), confidence: 0.99 };
  }
  return null;
}

/**
 * Extracts only explicitly labelled body measurements. Input is folded to
 * ASCII Vietnamese so accented and unaccented customer messages behave alike.
 * Bare numbers stay ignored to protect phone numbers, prices and order IDs.
 */
export function extractCustomerMeasurements(
  input: CustomerMeasurementExtractionInput,
): readonly BodyMeasurementV1[] {
  const text = foldVietnamese(input.text);
  const found = new Map<MeasurementKind, BodyMeasurementV1>();

  const labelledThreeRounds = [...text.matchAll(
    /(?:so\s*do\s*)?(?:3|ba)\s*vong\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*[-/x]\s*(\d{2,3}(?:[.,]\d+)?)\s*[-/x]\s*(\d{2,3}(?:[.,]\d+)?)/giu,
  )].at(-1);
  // Messenger customers frequently answer the shop's explicit request for
  // three measurements with only "90-60-90". Accept that compact shape only
  // when it is the entire message; phone numbers, prices, dates and order IDs
  // remain excluded by the anchored three-value pattern and range checks.
  const bareThreeRounds = text.trim().match(
    /^(\d{2,3}(?:[.,]\d+)?)\s*[-/x]\s*(\d{2,3}(?:[.,]\d+)?)\s*[-/x]\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:cm)?$/iu,
  );
  const threeRounds = labelledThreeRounds ?? bareThreeRounds;
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
        found.set(
          kind,
          measurement(kind, value, input, labelledThreeRounds ? 0.98 : 0.94),
        );
      }
    }
  }

  const meterCentimeters = [...text.matchAll(
    /(?:(?:chieu\s*cao|cao)\s*[:=]?\s*)?([12])\s*m\s*(\d{1,2})\b/giu,
  )].at(-1);
  if (meterCentimeters?.[1] && meterCentimeters[2]) {
    const value = Number(meterCentimeters[1]) * 100 +
      Number(meterCentimeters[2].padEnd(2, "0"));
    if (inRange("HEIGHT_CM", value)) {
      found.set("HEIGHT_CM", measurement("HEIGHT_CM", value, input, 0.99));
    }
  }

  if (!found.has("HEIGHT_CM")) {
    const height = lastCaptured(text, [
      /(?:chieu\s*cao|cao)\s*[:=]?\s*(\d(?:[.,]\d{1,2}))\s*(?:m|met)?\b/giu,
      /(?:chieu\s*cao|cao)\s*[:=]?\s*(1[3-9]\d|20\d|210)\s*(?:cm)?\b/giu,
      /\b(\d(?:[.,]\d{1,2}))\s*(?:m|met)\b/giu,
    ]);
    if (height) {
      const value = normalizeHeight(height.value);
      if (inRange("HEIGHT_CM", value)) {
        found.set("HEIGHT_CM", measurement("HEIGHT_CM", value, input, height.confidence));
      }
    }
  }

  const weight = lastCaptured(text, [
    /(?:can\s*nang|nang)\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|ky|ki|can)?\b/giu,
    /\b(\d{2,3}(?:[.,]\d+)?)\s*(?:kg|ky|ki)\b/giu,
  ]);
  if (weight && inRange("WEIGHT_KG", weight.value)) {
    found.set("WEIGHT_KG", measurement("WEIGHT_KG", weight.value, input, weight.confidence));
  }

  const explicit: readonly [MeasurementKind, readonly RegExp[]][] = [
    ["BUST_CM", [
      /(?:vong\s*nguc|nguc|vong\s*1|v1)\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:cm)?\b/giu,
    ]],
    ["WAIST_CM", [
      /(?:vong\s*eo|eo|vong\s*2|v2)\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:cm)?\b/giu,
    ]],
    ["HIPS_CM", [
      /(?:vong\s*mong|mong|vong\s*3|v3)\s*[:=]?\s*(\d{2,3}(?:[.,]\d+)?)\s*(?:cm)?\b/giu,
    ]],
  ];
  for (const [kind, patterns] of explicit) {
    const candidate = lastCaptured(text, patterns);
    if (candidate && inRange(kind, candidate.value)) {
      found.set(kind, measurement(kind, candidate.value, input, candidate.confidence));
    }
  }

  return [...found.values()];
}
