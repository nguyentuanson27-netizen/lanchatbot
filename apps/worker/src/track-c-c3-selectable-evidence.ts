import { createHash } from "node:crypto";
import { canonicalJsonV1, type ContextV2 } from "@lana/contracts";
import {
  trackCCartClaimIsCurrent,
  type TrackCCurrentCartBinding,
} from "./track-c-c3-cart-binding.js";
import {
  TRACK_C_PROTECTED_PROPOSITIONS,
  trackCCustomerFacingSizeFromVariantId,
  type TrackCProtectedProposition,
  type TrackCSelectableEvidence,
} from "./track-c-c3-strategy-contract.js";
import type { TrackCV5ExecutionLane } from
  "./track-c-c3-v5-benchmark-materialization.js";
import { trackCProductAttributeEvidence } from
  "./track-c-c3-attribute-projection.js";
import {
  trackCFormatVnd,
  trackCSimulationFactText,
} from "./track-c-c3-fact-realization.js";

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

function plainObject(value: unknown, errorCode: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errorCode);
  }
  return value as Readonly<Record<string, unknown>>;
}

function capabilityForClaim(type: string): TrackCProtectedProposition | null {
  const capability = type === "PROMOTION" ? "PROMOTION_OFFER" : type;
  return TRACK_C_PROTECTED_PROPOSITIONS.includes(
    capability as TrackCProtectedProposition,
  ) && capability !== "NONE"
    ? capability as TrackCProtectedProposition
    : null;
}

/**
 * Keep the claim's own scope on the evidence subject.
 *
 * Only PRODUCT scope used to survive, so cart-scoped facts (shipping fee,
 * freeship, cart total, cart promotions) reached the selection surface with no
 * cart identity and no version to revalidate against, and shop-scoped facts
 * (policy, store location) lost their shop binding.
 */
function claimSubject(
  scope: ContextV2["verifiedClaims"][number]["scope"],
  presentation: ContextV2["productPresentation"],
): TrackCSelectableEvidence["subject"] {
  if (scope.kind === "PRODUCT") {
    const label = scope.variantId === null
      ? null
      : trackCVariantLabel(presentation ?? null, scope.variantId);
    return Object.freeze({
      scope: scope.variantId === null ? "PRODUCT" as const : "VARIANT" as const,
      productId: scope.productId,
      ...(scope.variantId === null ? {} : { variantId: scope.variantId }),
      ...(label === null ? {} : { variantLabel: label }),
    });
  }
  if (scope.kind === "CART") {
    return Object.freeze({
      scope: "CART" as const,
      cartId: scope.cartId,
      cartVersion: scope.cartVersion,
    });
  }
  return Object.freeze({ scope: "SHOP" as const, shopId: scope.shopId });
}

/**
 * The presentation that may resolve labels for this claim.
 *
 * A presentation only speaks for the product it describes, so it is usable
 * here only when it matches the claim's product. Both the projector and the
 * final guard resolve it through this one function, so the text they compare
 * is always built from the same input.
 */
export function trackCBoundPresentationForClaim(
  presentation: ContextV2["productPresentation"] | null | undefined,
  scope: ContextV2["verifiedClaims"][number]["scope"],
): ContextV2["productPresentation"] | null {
  return presentation !== null && presentation !== undefined &&
      scope.kind === "PRODUCT" && presentation.productId === scope.productId
    ? presentation
    : null;
}

/**
 * Customer-facing variant label from the authoritative presentation mapping.
 *
 * Parsing `SIZE_*` out of a variant ID only worked for IDs that happened to
 * encode a size and silently produced nothing for every other scheme, which
 * dropped exact colour/size stock answers. The presentation carries the real
 * mapping, so it is the source used here.
 */
export function trackCVariantLabel(
  presentation: ContextV2["productPresentation"] | null,
  variantId: string,
): Readonly<{ color?: string; size?: string }> | null {
  const variant = presentation?.variants.find(
    (entry) => entry.variantId === variantId,
  );
  if (variant === undefined) return null;
  if (variant.color === null && variant.size === null) return null;
  return Object.freeze({
    ...(variant.color === null ? {} : { color: variant.color }),
    ...(variant.size === null ? {} : { size: variant.size }),
  });
}

function arrayOfStrings(value: unknown, limit: number): readonly string[] | null {
  return Array.isArray(value) && value.length <= limit &&
      value.every((item) => typeof item === "string" && item.length <= 128)
    ? Object.freeze([...value]) as readonly string[]
    : null;
}

export function trackCRuntimeClaimDeterministicText(
  claim: ContextV2["verifiedClaims"][number],
  presentation?: ContextV2["productPresentation"],
  cartBinding: TrackCCurrentCartBinding | null = null,
  at: Date = new Date(),
): string | null {
  if (claim.scope.kind === "CART") {
    if (!trackCCartClaimIsCurrent(claim, cartBinding, at)) return null;
    if (claim.type === "SHIPPING_FEE") {
      return `Phí giao hàng của giỏ hiện tại là ${trackCFormatVnd(claim.value.amountVnd)} ạ.`;
    }
    if (claim.type === "FREESHIP" && claim.value.eligible) {
      return "Giỏ hiện tại được miễn phí giao hàng ạ.";
    }
    if (claim.type === "PROMOTION_OFFER") {
      return `Ưu đãi đã áp dụng cho giỏ hiện tại là ${trackCFormatVnd(claim.value.amountVnd)} ạ.`;
    }
    return null;
  }
  if (claim.scope.kind !== "PRODUCT") return null;
  if (claim.type === "PRICE") {
    return `Dạ giá hiện tại của mẫu này là ${trackCFormatVnd(claim.value.amountVnd)} ạ.`;
  }
  if (claim.type === "STOCK") {
    // Prefer the authoritative variant mapping; fall back to the ID convention
    // only when no presentation is available for this turn.
    const label = claim.scope.variantId === null
      ? null
      : trackCVariantLabel(presentation ?? null, claim.scope.variantId);
    const size = label?.size
      ?? trackCCustomerFacingSizeFromVariantId(claim.scope.variantId);
    const color = label?.color ?? null;
    if (claim.scope.variantId !== null && size === null && color === null) {
      return null;
    }
    // Name exactly the variant the claim covers, so a colour+size question is
    // not answered with a bare size.
    const variant = [
      ...(color === null ? [] : [`màu ${color}`]),
      ...(size === null ? [] : [`size ${size}`]),
    ].join(" ");
    const subject = variant === "" ? "mẫu này" : `${variant} của mẫu này`;
    if (claim.value.status === "IN_STOCK") {
      return variant === ""
        ? "Dạ mẫu này hiện còn hàng ạ."
        : `Dạ mẫu này hiện còn ${variant} ạ.`;
    }
    if (claim.value.status === "LOW_STOCK") {
      return variant === ""
        ? "Dạ mẫu này hiện còn hàng nhưng số lượng không nhiều ạ."
        : `Dạ mẫu này hiện còn ${variant} nhưng số lượng không nhiều ạ.`;
    }
    if (claim.value.status === "OUT_OF_STOCK") {
      return variant === ""
        ? "Dạ mẫu này hiện hết hàng ạ."
        : `Dạ mẫu này hiện hết ${variant} ạ.`;
    }
    if (claim.value.status === "PRE_ORDER") {
      return `Dạ ${subject} hiện nhận đặt trước ạ.`;
    }
    if (claim.value.status === "COMING_SOON") {
      return `Dạ ${subject} hiện sắp về ạ.`;
    }
    return null;
  }
  if (claim.type === "SIZE_FIT") {
    const alternative = claim.value.alternativeSizes.length === 0 ? "" :
      ` Size thay thế đã được xác minh: ${claim.value.alternativeSizes.join(" hoặc ")} ạ.`;
    return `Dạ theo thông tin size đã xác minh, size phù hợp là ${claim.value.recommendedSizes.join(" hoặc ")} ạ.${alternative}`;
  }
  if (claim.type === "ETA") {
    return claim.value.minDays === claim.value.maxDays
      ? `Dạ thời gian giao dự kiến hiện khoảng ${claim.value.minDays} ngày ạ.`
      : `Dạ thời gian giao dự kiến hiện là ${claim.value.minDays}–${claim.value.maxDays} ngày ạ. Em chưa thể cam kết chính xác một ngày cụ thể trong khoảng này ạ.`;
  }
  return null;
}

function boundedSimulationEvidence(
  fact: unknown,
  ref: string,
  boundProductIds: readonly string[],
): TrackCSelectableEvidence | null {
  const value = plainObject(fact, "TRACK_C_SIMULATION_EVIDENCE_INVALID");
  const kind = value.kind;
  const productId = typeof value.productId === "string" ? value.productId : undefined;
  const requireBoundProduct = (): string => {
    if (productId === undefined ||
        (boundProductIds.length > 0 && !boundProductIds.includes(productId))) {
      throw new Error("TRACK_C_EVIDENCE_BINDING_INVALID");
    }
    return productId;
  };
  const contentHash = sha256({ ref, fact: value });
  const make = (
    capability: TrackCProtectedProposition,
    projected: Readonly<Record<string, unknown>>,
    subject?: TrackCSelectableEvidence["subject"],
    deterministicText?: string,
  ) => Object.freeze({
    ref,
    capability,
    ...(subject === undefined ? {} : { subject }),
    value: Object.freeze({ ...projected }),
    ...(deterministicText === undefined ? {} : { deterministicText }),
    provenance: Object.freeze({ contentHash, authority: "SIMULATION" as const }),
  });
  if (kind === "PRODUCT_PROFILE") {
    const subjectProductId = requireBoundProduct();
    const displayName = typeof value.displayName === "string" ? value.displayName : null;
    const material = typeof value.material === "string" ? value.material : null;
    const colors = arrayOfStrings(value.colors, 8);
    const design = arrayOfStrings(value.design, 4);
    if (displayName === null || material === null || colors === null || design === null) {
      throw new Error("TRACK_C_SIMULATION_EVIDENCE_INVALID");
    }
    const offerType = typeof value.offerType === "string" ? value.offerType : null;
    const profileText = colors.length === 0
      ? `Mẫu ${displayName} có chất liệu ${material} ạ.`
      : `Mẫu ${displayName} có chất liệu ${material}, hiện có màu ${colors.join(", ")} ạ.`;
    const deterministicText = design.length === 0 ? profileText :
      `${profileText} Thiết kế của mẫu gồm ${design.join(", ")} ạ.`;
    return make("PRODUCT_PRESENTATION", {
      displayName,
      material,
      colors,
      design,
      ...(offerType === null ? {} : { offerType }),
    }, { scope: "PRODUCT", productId: subjectProductId, displayName },
      deterministicText);
  }
  if (kind === "PRODUCT_COMPARISON") {
    const products = arrayOfStrings(value.products, 4);
    const descriptions = plainObject(value.data, "TRACK_C_SIMULATION_EVIDENCE_INVALID");
    if (products === null || products.length < 2 ||
        products.some((id) => !boundProductIds.includes(id)) ||
        Object.keys(descriptions).some((id) => !products.includes(id))) {
      throw new Error("TRACK_C_EVIDENCE_BINDING_INVALID");
    }
    if (products.some((id) => typeof descriptions[id] !== "string")) {
      throw new Error("TRACK_C_SIMULATION_EVIDENCE_INVALID");
    }
    const customerText = typeof value.customerText === "string" &&
        value.customerText === value.customerText.trim() &&
        value.customerText.length > 0 && value.customerText.length <= 500
      ? value.customerText : null;
    if (customerText !== null && products.some((id) => customerText.includes(id))) {
      throw new Error("TRACK_C_SIMULATION_EVIDENCE_INVALID");
    }
    return make(
      "PRODUCT_COMPARISON",
      { products, descriptions },
      undefined,
      customerText ?? undefined,
    );
  }
  if (kind === "CARE_GUIDANCE") {
    const subjectProductId = requireBoundProduct();
    const data = plainObject(value.data, "TRACK_C_SIMULATION_EVIDENCE_INVALID");
    if (typeof data.wash !== "string" || typeof data.avoid !== "string" ||
        typeof data.dry !== "string") {
      throw new Error("TRACK_C_SIMULATION_EVIDENCE_INVALID");
    }
    return make(
      "CARE_GUIDANCE",
      { data },
      { scope: "PRODUCT", productId: subjectProductId },
      trackCSimulationFactText("CARE_GUIDANCE", data, null) ?? undefined,
    );
  }
  if (kind === "CHANNEL_PRICE_SNAPSHOT") {
    const subjectProductId = requireBoundProduct();
    const data = plainObject(value.data, "TRACK_C_SIMULATION_EVIDENCE_INVALID");
    if (typeof data.chatVnd !== "number") {
      throw new Error("TRACK_C_SIMULATION_EVIDENCE_INVALID");
    }
    return make(
      "PRICE",
      { chatVnd: data.chatVnd },
      { scope: "PRODUCT", productId: subjectProductId },
      `Dạ giá trên kênh chat hiện là ${trackCFormatVnd(data.chatVnd)} ạ.`,
    );
  }
  if (kind === "FULFILLMENT_SNAPSHOT") {
    const subjectProductId = requireBoundProduct();
    const data = plainObject(value.data, "TRACK_C_SIMULATION_EVIDENCE_INVALID");
    if (typeof data.status !== "string" ||
        typeof data.productionMinDays !== "number" ||
        typeof data.productionMaxDays !== "number" ||
        typeof data.deliveryMinDays !== "number" ||
        typeof data.deliveryMaxDays !== "number") {
      throw new Error("TRACK_C_SIMULATION_EVIDENCE_INVALID");
    }
    return make(
      "FULFILLMENT_STATUS",
      { data },
      { scope: "PRODUCT", productId: subjectProductId },
      trackCSimulationFactText("FULFILLMENT_SNAPSHOT", data, null) ?? undefined,
    );
  }
  if (kind === "PRODUCT_LIFECYCLE") {
    const subjectProductId = requireBoundProduct();
    const data = plainObject(value.data, "TRACK_C_SIMULATION_EVIDENCE_INVALID");
    if (typeof data.status !== "string") {
      throw new Error("TRACK_C_SIMULATION_EVIDENCE_INVALID");
    }
    return make(
      "PRODUCT_LIFECYCLE",
      { data },
      { scope: "PRODUCT", productId: subjectProductId },
      trackCSimulationFactText("PRODUCT_LIFECYCLE", data, null) ?? undefined,
    );
  }
  if (kind === "POLICY_SNAPSHOT" || kind === "PRODUCT_ATTRIBUTE" ||
      kind === "OFFER_CONFIGURATION" || kind === "PROMOTION_SEMANTICS" ||
      kind === "CART_TOTAL" || kind === "BUSINESS_LOCATION") {
    const capability = kind === "PRODUCT_ATTRIBUTE" ? "PRODUCT_ATTRIBUTES" :
      kind === "OFFER_CONFIGURATION" ? "OFFER_CONFIGURATION" :
      kind === "PROMOTION_SEMANTICS" ? "PROMOTION_OFFER" :
      kind === "CART_TOTAL" ? "CART_TOTAL" :
      kind === "BUSINESS_LOCATION" ? "BUSINESS_LOCATION" : "POLICY";
    const subjectProductId = productId === undefined
      ? undefined : requireBoundProduct();
    const data = plainObject(value.data, "TRACK_C_SIMULATION_EVIDENCE_INVALID");
    const policy = typeof value.policy === "string" ? value.policy : null;
    // Cart-scoped facts keep their cart identity and version so the value can
    // be revalidated against the current cart before it is stated.
    const cartId = typeof value.cartId === "string" ? value.cartId : null;
    const cartVersion = typeof data["cartVersion"] === "number"
      ? data["cartVersion"] : null;
    const subject: TrackCSelectableEvidence["subject"] =
      kind === "CART_TOTAL"
        ? Object.freeze({
            scope: "CART" as const,
            ...(cartId === null ? {} : { cartId }),
            ...(cartVersion === null ? {} : { cartVersion }),
          })
        : subjectProductId === undefined
          ? undefined
          : Object.freeze({ scope: "PRODUCT" as const, productId: subjectProductId });
    return make(capability, {
      ...(policy === null ? {} : { policy }),
      data,
    }, subject, trackCSimulationFactText(kind, data, policy) ?? undefined);
  }
  return null;
}

/** The sole C3 factual egress for Strategist and Responder. */
export function buildTrackCSelectableEvidence(input: Readonly<{
  context: ContextV2;
  simulationFacts: readonly unknown[];
  executionLane: TrackCV5ExecutionLane;
  currentCart?: TrackCCurrentCartBinding | null;
  evaluationAt?: Date;
}>): readonly TrackCSelectableEvidence[] {
  if (input.executionLane !== "BEHAVIOR_SIMULATION" &&
      input.simulationFacts.length > 0) {
    throw new Error("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
  }
  const evidence: TrackCSelectableEvidence[] = [];
  input.context.verifiedClaims.forEach((claim, index) => {
    const capability = capabilityForClaim(claim.type);
    if (capability !== null) {
      const boundPresentation = trackCBoundPresentationForClaim(
        input.context.productPresentation, claim.scope,
      );
      const subject = claimSubject(claim.scope, boundPresentation);
      const deterministicText = trackCRuntimeClaimDeterministicText(
        claim, boundPresentation, input.currentCart ?? null, input.evaluationAt,
      );
      evidence.push(Object.freeze({
        ref: `CLAIM_${String(index + 1).padStart(3, "0")}`,
        capability,
        ...(subject === undefined ? {} : { subject }),
        value: Object.freeze({ ...claim.value }),
        ...(deterministicText === null ? {} : { deterministicText }),
        provenance: Object.freeze({
          contentHash: claim.provenance.contentHash,
          authority: "RUNTIME" as const,
        }),
      }));
    }
  });
  if (input.context.productAttributes !== null &&
      input.context.productAttributes !== undefined) {
    // Every verified attribute group, one selectable entry per field. The
    // previous projection kept only materials/colors/styles, which discarded
    // the verified design, wear and care data the catalog already owns.
    evidence.push(...trackCProductAttributeEvidence({
      attributes: input.context.productAttributes,
      refPrefix: "PRODUCT_ATTRIBUTES_001",
      authority: "RUNTIME",
      ...(input.context.productPresentation?.productId ===
          input.context.productAttributes.productId
        ? { displayName: input.context.productPresentation.displayName }
        : {}),
    }));
  }
  if (input.context.productPresentation !== null &&
      input.context.productPresentation !== undefined) {
    const presentation = input.context.productPresentation;
    evidence.push(Object.freeze({
      ref: "PRODUCT_PRESENTATION_001",
      capability: "PRODUCT_PRESENTATION",
      subject: Object.freeze({
        scope: "PRODUCT" as const,
        productId: presentation.productId,
        displayName: presentation.displayName,
      }),
      value: Object.freeze({
        displayName: presentation.displayName,
        colors: Object.freeze(presentation.variants.flatMap(({ color }) =>
          color === null ? [] : [color]
        )),
        // Keep the variant identity alongside its labels so a selection can be
        // resolved back to the authoritative variant it came from.
        variants: Object.freeze(presentation.variants.map(
          ({ variantId, color, size }) => Object.freeze({ variantId, color, size })
        )),
      }),
      deterministicText: (() => {
        const colors = [...new Set(presentation.variants.flatMap(({ color }) =>
          color === null ? [] : [color]
        ))];
        return colors.length === 0
          ? `Đây là mẫu ${presentation.displayName} ạ.`
          : `Mẫu ${presentation.displayName} hiện có màu ${colors.join(", ")} ạ.`;
      })(),
      provenance: Object.freeze({
        contentHash: presentation.provenance.contentHash,
        authority: "RUNTIME" as const,
      }),
    }));
  }
  input.simulationFacts.forEach((fact, index) => {
    const projected = boundedSimulationEvidence(
      fact,
      `SIMULATION_${String(index + 1).padStart(3, "0")}`,
      input.context.productBinding.productIds,
    );
    if (projected === null) return;
    evidence.push(projected);
    if (projected.capability === "PRODUCT_PRESENTATION") {
      // Preserve the overview for fixed first contact, while adaptive turns
      // can select just one verified attribute without printing the bundle.
      const { material, colors, design } = projected.value as {
        material: string; colors: readonly string[]; design: readonly string[];
      };
      const fields = [
        { field: "material", value: material,
          text: `Mẫu này có chất liệu ${material} ạ.` },
        ...(colors.length === 0 ? [] : [{ field: "colors", value: colors,
          text: `Mẫu này hiện có màu ${colors.join(", ")} ạ.` }]),
        ...(design.length === 0 ? [] : [{ field: "design", value: design,
          text: `Thiết kế của mẫu gồm ${design.join(", ")} ạ.` }]),
      ];
      for (const field of fields) {
        evidence.push(Object.freeze({
          ref: `${projected.ref}_${field.field.toUpperCase()}`,
          capability: "PRODUCT_ATTRIBUTES" as const,
          subject: projected.subject!,
          value: Object.freeze({ [field.field]: field.value }),
          deterministicText: field.text,
          provenance: Object.freeze({
            authority: "SIMULATION" as const,
            contentHash: sha256({
              sourceContentHash: projected.provenance.contentHash,
              field: field.field,
              value: field.value,
            }),
          }),
        }));
      }
    }
  });
  // Missing realization is a capability gap, not missing factual authority.
  // Keep the evidence visible; the compiler rejects unsupported selections.
  if (new Set(evidence.map(({ ref }) => ref)).size !== evidence.length ||
      new Set(evidence.map(({ provenance }) => provenance.contentHash)).size !==
        evidence.length) {
    throw new Error("TRACK_C_EVIDENCE_PROVENANCE_DUPLICATE");
  }
  const names = new Map<string, string>();
  for (const { subject } of evidence) {
    if (subject?.productId === undefined || subject.displayName === undefined) continue;
    const previous = names.get(subject.productId);
    if (previous !== undefined && previous !== subject.displayName) {
      throw new Error("TRACK_C_EVIDENCE_BINDING_INVALID");
    }
    names.set(subject.productId, subject.displayName);
  }
  return Object.freeze(evidence.map((entry) => {
    const displayName = entry.subject?.productId === undefined
      ? undefined : names.get(entry.subject.productId);
    return displayName === undefined ? entry : Object.freeze({
      ...entry, subject: Object.freeze({ ...entry.subject, displayName }),
    });
  }));
}
