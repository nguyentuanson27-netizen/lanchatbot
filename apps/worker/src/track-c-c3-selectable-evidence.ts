import { createHash } from "node:crypto";
import { canonicalJsonV1, type ContextV2 } from "@lana/contracts";
import {
  TRACK_C_PROTECTED_PROPOSITIONS,
  trackCEvidenceHasSafeFactualEgress,
  type TrackCProtectedProposition,
  type TrackCSelectableEvidence,
} from "./track-c-c3-strategy-contract.js";
import type { TrackCV5ExecutionLane } from
  "./track-c-c3-v5-benchmark-materialization.js";

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

function productSubject(
  scope: ContextV2["verifiedClaims"][number]["scope"],
) {
  return scope.kind === "PRODUCT"
    ? Object.freeze({
        productId: scope.productId,
        ...(scope.variantId === null ? {} : { variantId: scope.variantId }),
      })
    : undefined;
}

function arrayOfStrings(value: unknown, limit: number): readonly string[] | null {
  return Array.isArray(value) && value.length <= limit &&
      value.every((item) => typeof item === "string" && item.length <= 128)
    ? Object.freeze([...value]) as readonly string[]
    : null;
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
    const deterministicText = colors.length === 0
      ? `Mẫu ${displayName} có chất liệu ${material} ạ.`
      : `Mẫu ${displayName} có chất liệu ${material}, hiện có màu ${colors.join(", ")} ạ.`;
    return make("PRODUCT_PRESENTATION", {
      displayName,
      material,
      colors,
      design,
      ...(offerType === null ? {} : { offerType }),
    }, { productId: subjectProductId, displayName }, deterministicText);
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
    return make(
      "PRODUCT_COMPARISON",
      { products, descriptions },
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
      { productId: subjectProductId },
    );
  }
  if (kind === "CHANNEL_PRICE_SNAPSHOT") {
    const subjectProductId = requireBoundProduct();
    const data = plainObject(value.data, "TRACK_C_SIMULATION_EVIDENCE_INVALID");
    if (typeof data.chatVnd !== "number") {
      throw new Error("TRACK_C_SIMULATION_EVIDENCE_INVALID");
    }
    return make("PRICE", { chatVnd: data.chatVnd }, { productId: subjectProductId });
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
      { productId: subjectProductId },
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
      { productId: subjectProductId },
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
    return make(capability, {
      ...(policy === null ? {} : { policy }),
      data,
    }, subjectProductId === undefined ? undefined : { productId: subjectProductId });
  }
  return null;
}

/** The sole C3 factual egress for Strategist and Responder. */
export function buildTrackCSelectableEvidence(input: Readonly<{
  context: ContextV2;
  simulationFacts: readonly unknown[];
  executionLane: TrackCV5ExecutionLane;
}>): readonly TrackCSelectableEvidence[] {
  if (input.executionLane !== "BEHAVIOR_SIMULATION" &&
      input.simulationFacts.length > 0) {
    throw new Error("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
  }
  const evidence: TrackCSelectableEvidence[] = [];
  input.context.verifiedClaims.forEach((claim, index) => {
    const capability = capabilityForClaim(claim.type);
    if (capability !== null) {
      const subject = productSubject(claim.scope);
      evidence.push(Object.freeze({
        ref: `CLAIM_${String(index + 1).padStart(3, "0")}`,
        capability,
        ...(subject === undefined ? {} : { subject }),
        value: Object.freeze({ ...claim.value }),
        provenance: Object.freeze({
          contentHash: claim.provenance.contentHash,
          authority: "RUNTIME" as const,
        }),
      }));
    }
  });
  if (input.context.productAttributes !== null &&
      input.context.productAttributes !== undefined) {
    const attributes = input.context.productAttributes;
    const attributeText = attributes.materials.length > 0 &&
        attributes.colors.length > 0
      ? `Mẫu này có chất liệu ${attributes.materials.join(", ")} và màu ${attributes.colors.join(", ")} ạ.`
      : attributes.materials.length > 0
        ? `Mẫu này có chất liệu ${attributes.materials.join(", ")} ạ.`
        : attributes.colors.length > 0
          ? `Mẫu này hiện có màu ${attributes.colors.join(", ")} ạ.`
          : null;
    evidence.push(Object.freeze({
      ref: "PRODUCT_ATTRIBUTES_001",
      capability: "PRODUCT_ATTRIBUTES",
      subject: Object.freeze({ productId: attributes.productId }),
      value: Object.freeze({
        materials: Object.freeze([...attributes.materials]),
        colors: Object.freeze([...attributes.colors]),
        styles: Object.freeze([...attributes.styles]),
      }),
      ...(attributeText === null ? {} : { deterministicText: attributeText }),
      provenance: Object.freeze({
        contentHash: attributes.metadata.contentHash,
        authority: "RUNTIME" as const,
      }),
    }));
  }
  if (input.context.productPresentation !== null &&
      input.context.productPresentation !== undefined) {
    const presentation = input.context.productPresentation;
    evidence.push(Object.freeze({
      ref: "PRODUCT_PRESENTATION_001",
      capability: "PRODUCT_PRESENTATION",
      subject: Object.freeze({
        productId: presentation.productId,
        displayName: presentation.displayName,
      }),
      value: Object.freeze({
        displayName: presentation.displayName,
        colors: Object.freeze(presentation.variants.flatMap(({ color }) =>
          color === null ? [] : [color]
        )),
        variants: Object.freeze(presentation.variants.map(({ color, size }) =>
          Object.freeze({ color, size })
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
    if (projected !== null) evidence.push(projected);
  });
  const selectable = evidence.filter(trackCEvidenceHasSafeFactualEgress);
  if (new Set(selectable.map(({ ref }) => ref)).size !== selectable.length ||
      new Set(selectable.map(({ provenance }) => provenance.contentHash)).size !==
        selectable.length) {
    throw new Error("TRACK_C_EVIDENCE_PROVENANCE_DUPLICATE");
  }
  return Object.freeze(selectable);
}
