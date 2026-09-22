import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  type ProductAttributesV1,
  type ProductDesignAttributesV1,
  type ProductWearPropertiesV1,
} from "@lana/contracts";
import type {
  TrackCProtectedProposition,
  TrackCSelectableEvidence,
} from "./track-c-c3-strategy-contract.js";

/**
 * Field-scoped projection of the typed product attribute contract.
 *
 * `ProductAttributesV1` carries ten authoritative groups. Projecting only
 * materials/colors/styles dropped verified design, wear and care data that the
 * catalog already owns, so the Strategist could not answer questions those
 * fields resolve. Each populated group becomes its own selectable entry: the
 * Strategist picks the one field the question needs instead of printing the
 * whole bundle, and an absent field stays absent rather than being inferred
 * from a neighbouring one.
 */

type AttributeProjection = Readonly<{
  field: string;
  value: unknown;
  /** Absent when the field has authority but no safe customer-facing wording. */
  text?: string;
}>;

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

function joinTokens(values: readonly string[]): string {
  return values.join(", ");
}

const STRETCH_TEXT = Object.freeze({
  LIGHT: "co giãn nhẹ",
  FLEXIBLE: "co giãn tốt",
  PRESENT: "có co giãn",
});

const OPACITY_TEXT = Object.freeze({
  SHEER: "có độ xuyên thấu",
  PARTIAL: "hơi mỏng nhẹ",
  OPAQUE: "không bị lộ",
});

const BACK_COVERAGE_TEXT = Object.freeze({
  OPEN: "phần lưng để hở",
  PARTIAL: "phần lưng che một phần",
  FULL: "phần lưng che kín",
});

const DESIGN_COMPLEXITY_TEXT = Object.freeze({
  MINIMAL: "thiết kế tối giản",
  ORNATE: "thiết kế cầu kỳ",
});

const DESIGN_PART_TEXT = Object.freeze({
  neckline: "cổ áo",
  sleeve: "tay áo",
  waist: "phần eo",
  closure: "khoá/cài",
  length: "độ dài",
  lining: "lớp lót",
  details: "chi tiết",
  silhouette: "phom dáng",
});

const MATERIAL_PART_TEXT = Object.freeze({
  AO_DAI: "áo dài",
  AO: "áo",
  CHAN_VAY: "chân váy",
  QUAN: "quần",
  VAY: "váy",
  PHU_KIEN: "phụ kiện",
  LOT: "lớp lót",
});

/**
 * The wear properties are typed verified measurements, so each present value is
 * stated directly. A `null` means the catalog has not verified that property:
 * it is left unprojected instead of being derived from the material name.
 */
function wearPropertyProjections(
  wear: NonNullable<ProductWearPropertiesV1>,
): readonly AttributeProjection[] {
  const projections: AttributeProjection[] = [];
  if (wear.stretch !== null) {
    projections.push({
      field: "wearStretch",
      value: wear.stretch,
      text: `Dạ chất liệu của mẫu này ${STRETCH_TEXT[wear.stretch]} ạ.`,
    });
  }
  if (wear.wrinkleResistance !== null) {
    projections.push({
      field: "wearWrinkleResistance",
      value: wear.wrinkleResistance,
      text: "Dạ chất liệu của mẫu này thuộc nhóm ít nhăn ạ.",
    });
  }
  if (wear.opacity !== null) {
    projections.push({
      field: "wearOpacity",
      value: wear.opacity,
      text: `Dạ mẫu này ${OPACITY_TEXT[wear.opacity]} ạ.`,
    });
  }
  if (wear.lining !== null) {
    projections.push({
      field: "wearLining",
      value: wear.lining,
      text: "Dạ mẫu này có lớp lót ạ.",
    });
  }
  if (wear.breathability !== null) {
    projections.push({
      field: "wearBreathability",
      value: wear.breathability,
      text: "Dạ chất liệu của mẫu này thoáng mát ạ.",
    });
  }
  return Object.freeze(projections);
}

function designProjections(
  design: NonNullable<ProductDesignAttributesV1>,
): readonly AttributeProjection[] {
  return Object.freeze(
    (Object.keys(DESIGN_PART_TEXT) as (keyof typeof DESIGN_PART_TEXT)[])
      .flatMap((part) => {
        const values = design[part];
        return values === undefined || values.length === 0 ? [] : [{
          field: `design.${part}`,
          value: Object.freeze([...values]),
          text: `Dạ ${DESIGN_PART_TEXT[part]} của mẫu này là ${joinTokens(values)} ạ.`,
        }];
      }),
  );
}

function materialComponentProjections(
  components: ProductAttributesV1["materialComponents"],
): readonly AttributeProjection[] {
  return Object.freeze(
    (Object.keys(MATERIAL_PART_TEXT) as (keyof typeof MATERIAL_PART_TEXT)[])
      .flatMap((part) => {
        const values = components[part];
        return values === undefined || values.length === 0 ? [] : [{
          field: `materialComponents.${part}`,
          value: Object.freeze([...values]),
          text: `Dạ phần ${MATERIAL_PART_TEXT[part]} của mẫu này dùng ${joinTokens(values)} ạ.`,
        }];
      }),
  );
}

/** Every populated attribute group, as one selectable projection per field. */
export function trackCProductAttributeProjections(
  attributes: ProductAttributesV1,
): readonly AttributeProjection[] {
  const data = attributes;
  const tokenGroups: readonly Readonly<{
    field: string;
    values: readonly string[];
    text: (values: readonly string[]) => string;
  }>[] = [
    { field: "materials", values: data.materials,
      text: (values) => `Dạ mẫu này có chất liệu ${joinTokens(values)} ạ.` },
    { field: "colors", values: data.colors,
      text: (values) => `Dạ mẫu này hiện có màu ${joinTokens(values)} ạ.` },
    { field: "styles", values: data.styles,
      text: (values) => `Dạ mẫu này thuộc phong cách ${joinTokens(values)} ạ.` },
    { field: "silhouettes", values: data.silhouettes,
      text: (values) => `Dạ mẫu này có phom ${joinTokens(values)} ạ.` },
    { field: "occasions", values: data.occasions,
      text: (values) => `Dạ mẫu này phù hợp để mặc ${joinTokens(values)} ạ.` },
  ];
  return Object.freeze([
    ...tokenGroups.flatMap(({ field, values, text }) =>
      values.length === 0 ? [] : [{
        field,
        value: Object.freeze([...values]),
        text: text(values),
      }]
    ),
    ...materialComponentProjections(data.materialComponents),
    ...(data.designAttributes === null ? [] : designProjections(data.designAttributes)),
    ...(data.wearProperties === null ? [] : wearPropertyProjections(data.wearProperties)),
    ...(data.careInstructions === null ? [] : [{
      field: "careInstructions",
      value: data.careInstructions,
      // Curated catalog copy; projected verbatim rather than derived from the
      // material, which does not imply any particular washing instruction.
      text: `Dạ hướng dẫn bảo quản của mẫu này: ${data.careInstructions} ạ.`,
    }]),
    ...(data.backCoverage === null ? [] : [{
      field: "backCoverage",
      value: data.backCoverage,
      text: `Dạ mẫu này ${BACK_COVERAGE_TEXT[data.backCoverage]} ạ.`,
    }]),
    ...(data.designComplexity === null ? [] : [{
      field: "designComplexity",
      value: data.designComplexity,
      text: `Dạ mẫu này có ${DESIGN_COMPLEXITY_TEXT[data.designComplexity]} ạ.`,
    }]),
  ]);
}

/**
 * Selectable evidence for one product's attributes, one entry per field.
 *
 * `refPrefix` keeps refs stable and distinct when several bound products are
 * projected into the same selection surface.
 */
export function trackCProductAttributeEvidence(input: Readonly<{
  attributes: ProductAttributesV1;
  refPrefix: string;
  authority: TrackCSelectableEvidence["provenance"]["authority"];
  displayName?: string;
}>): readonly TrackCSelectableEvidence[] {
  const capability: TrackCProtectedProposition = "PRODUCT_ATTRIBUTES";
  return Object.freeze(
    trackCProductAttributeProjections(input.attributes).map((projection) =>
      Object.freeze({
        ref: `${input.refPrefix}_${projection.field
          .replace(/\./gu, "_")
          .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
          .toUpperCase()}`,
        capability,
        subject: Object.freeze({
          scope: "PRODUCT" as const,
          productId: input.attributes.productId,
          ...(input.displayName === undefined
            ? {}
            : { displayName: input.displayName }),
        }),
        value: Object.freeze({ [projection.field]: projection.value }),
        ...(projection.text === undefined ? {} : { deterministicText: projection.text }),
        provenance: Object.freeze({
          contentHash: sha256({
            sourceContentHash: input.attributes.metadata.contentHash,
            field: projection.field,
            value: projection.value,
          }),
          authority: input.authority,
        }),
      })
    ),
  );
}
