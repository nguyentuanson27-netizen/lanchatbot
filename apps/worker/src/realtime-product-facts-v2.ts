import {
  FULFILLMENT_FRESH_FOR_SECONDS,
  MEDIA_FRESH_FOR_SECONDS,
  ProductFactsV2Schema,
  type AdminArtifactContentV1,
  type ProductFactsV2,
  type ProductMediaAssetV2,
} from "@lana/contracts";
import {
  normalizeCatalogToken,
  projectProductFactsV2,
  type CatalogSnapshotV3,
  type StableProductDocument,
} from "@lana/business-tools";
import type { RuntimePolicyResolution } from "@lana/chat-runtime";

const plusSeconds = (value: string, seconds: number): string =>
  new Date(Date.parse(value) + seconds * 1_000).toISOString();

const validDate = (value: string | null | undefined, fallback: Date): string =>
  value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : fallback.toISOString();

function primaryOffer(snapshot: CatalogSnapshotV3): {
  readonly type: string;
  readonly kind: "SET" | "DIRECT";
} | null {
  const entries = Object.keys(snapshot.offers);
  const direct = entries.find((key) => normalizeCatalogToken(key) === "DIRECT");
  const set = entries.find((key) =>
    ["SET", "SET_VAY", "SET_CV", "SET_QUAN", "COMPOSITE"].includes(normalizeCatalogToken(key))
  );
  if (set) return { type: set, kind: "SET" };
  if (direct) return { type: direct, kind: "DIRECT" };
  return null;
}

function fulfillmentType(value: string): ProductFactsV2["fulfillment"]["policyType"] {
  const token = normalizeCatalogToken(value);
  if (["PRE_ORDER", "PREORDER", "DAT_TRUOC"].includes(token)) return "PRE_ORDER";
  if (["INBOUND", "COMING_SOON", "HANG_SAP_VE", "SAP_VE"].includes(token)) return "INBOUND";
  if (["MADE_TO_ORDER"].includes(token)) return "MADE_TO_ORDER";
  if (["PAUSED"].includes(token)) return "PAUSED";
  if (["DISCONTINUED"].includes(token)) return "DISCONTINUED";
  return "READY_STOCK";
}

function verifiedSizeChart(
  policy: RuntimePolicyResolution | null,
  productId: string,
  observedAt: string,
): ProductFactsV2["sizeChart"] {
  const artifacts = Object.values(policy?.bundle?.artifacts.sizeCharts ?? {});
  const selected = artifacts.find((content) => {
    if (content.chart.reference.verificationStatus !== "VERIFIED") return false;
    if (content.extraction && content.extraction.measurementBasis !== "BODY") return false;
    const scope = content.scope;
    return !scope || scope.parentProductIds.length === 0 ||
      scope.parentProductIds.some((value) =>
        normalizeCatalogToken(value) === normalizeCatalogToken(productId)
      );
  });
  if (!selected) return null;
  return {
    sizeChartId: selected.chart.reference.chartId,
    sizeChartVersion: selected.chart.reference.version,
    verificationStatus: "VERIFIED",
    sourceContentSha256: selected.chart.reference.sourceContentSha256,
    metadata: {
      authority: "ADMIN_POLICY",
      sourceVersion: selected.chart.reference.version,
      observedAt,
      expiresAt: null,
      freshForSeconds: null,
      freshnessState: "FRESH",
    },
  };
}

function imagePurpose(image: StableProductDocument["images"][number]): ProductMediaAssetV2["purposes"] {
  const intents = new Set(image.intents.map(normalizeCatalogToken));
  if (image.imageType === "SIZE_GUIDE" || intents.has("SIZE_GUIDE")) return ["SIZE_CHART"];
  if (image.feedback) return ["FEEDBACK"];
  if (
    image.imageType === "DETAIL" ||
    intents.has("MATERIAL_CLOSEUP") ||
    intents.has("DETAIL")
  ) return ["FABRIC_DETAIL", "DETAIL"];
  const purposes: ProductMediaAssetV2["purposes"][number][] = ["PRODUCT_OVERVIEW"];
  if (intents.has("LOOKBOOK")) purposes.push("LOOKBOOK");
  if (image.role === "PRIMARY") purposes.push("HERO");
  return [...new Set(purposes)];
}

export function productMediaView(
  image: StableProductDocument["images"][number],
): ProductMediaAssetV2["view"] {
  if (image.angle === "CLOSEUP") return "CLOSE_UP";
  if ((image.partsVisible ?? []).some((part) =>
    ["FULL_SET", "VAY"].includes(normalizeCatalogToken(part))
  )) return "FULL_LOOK";
  if (image.angle === "FRONT" || image.angle === "BACK" || image.angle === "SIDE") {
    return image.angle;
  }
  return "OTHER";
}

function mediaAssets(
  product: StableProductDocument,
  bom: ProductFactsV2["bom"],
): ProductMediaAssetV2[] {
  const componentForRole = (
    role: ProductFactsV2["bom"]["components"][number]["role"],
  ): string | null => {
    const matches = bom.components.filter((component) => component.role === role);
    return matches.length === 1 ? matches[0]!.componentProductId : null;
  };
  return product.images.map((image, index) => {
    const parts = new Set((image.partsVisible ?? []).map(normalizeCatalogToken));
    const componentProductId = parts.has("AO")
      ? componentForRole("TOP")
      : parts.has("CHAN_VAY") || parts.has("CV")
        ? componentForRole("SKIRT")
        : parts.has("QUAN")
          ? componentForRole("PANTS")
          : null;
    return {
      assetId: `${product.productId}:${index}:${image.url}`.slice(0, 256),
      url: image.url,
      componentProductId,
      purposes: imagePurpose(image),
      view: productMediaView(image),
      sortOrder: image.sortOrder,
      verified: image.metadataVerified === true && image.reviewStatus === "APPROVED",
      sourceContentSha256: image.sourceContentSha256 ?? null,
      reviewStatus: image.reviewStatus ?? null,
    };
  });
}

export function buildRealtimeProductFactsV2(input: {
  readonly snapshot: CatalogSnapshotV3;
  readonly product: StableProductDocument;
  readonly policy: RuntimePolicyResolution | null;
  readonly now: Date;
}): ProductFactsV2 | null {
  const primary = primaryOffer(input.snapshot);
  if (!primary) return null;
  const stableObservedAt = validDate(input.product.observedAt, input.now);
  const posObservedAt = input.snapshot.synced_at;
  const policy = input.snapshot.fulfillment_policy;
  const etaValidUntil = policy?.eta_valid_until &&
      Number.isFinite(Date.parse(policy.eta_valid_until))
    ? new Date(policy.eta_valid_until).toISOString()
    : null;
  const fulfillmentExpiresAt = etaValidUntil ?? plusSeconds(
    posObservedAt,
    FULFILLMENT_FRESH_FOR_SECONDS,
  );
  const availableOfferKinds: ProductFactsV2["identity"]["availableOfferKinds"] = [
    primary.kind,
  ];
  if (Object.keys(input.snapshot.offers).some((key) =>
    normalizeCatalogToken(key) === "COMBO_3"
  )) availableOfferKinds.push("COMBO_3");
  if (input.snapshot.selling_rules.allow_component_sale) {
    availableOfferKinds.push("COMPONENT");
  }

  try {
    const projected = projectProductFactsV2({
      posSnapshot: input.snapshot,
      primaryOfferType: primary.type,
      primaryOfferKind: primary.kind,
      staticSources: {
        identity: {
          parentProductId: input.product.productId,
          shopId: input.snapshot.shop_alias,
          brand: input.snapshot.brand,
          active: true,
          availableOfferKinds,
          metadata: {
            authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
            sourceVersion: input.product.catalogVersion,
            observedAt: stableObservedAt,
            expiresAt: null,
            freshForSeconds: null,
            freshnessState: "FRESH",
          },
        },
        content: {
          productName: input.product.title,
          description: input.product.descriptionXml?.trim() || null,
          productUrl: null,
          metadata: {
            authority: "WEBSTORE_XML",
            sourceVersion: input.product.catalogVersion,
            observedAt: stableObservedAt,
            expiresAt: null,
            freshForSeconds: null,
            freshnessState: "FRESH",
          },
        },
        sellingRules: {
          allowMixedSizes: input.snapshot.selling_rules.allow_mixed_sizes,
          allowComponentSale: input.snapshot.selling_rules.allow_component_sale,
          metadata: {
            authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
            sourceVersion: input.snapshot.selling_rules.source_version,
            observedAt: stableObservedAt,
            expiresAt: null,
            freshForSeconds: null,
            freshnessState: "FRESH",
          },
        },
        fulfillment: {
          appliesToParentProductId: input.product.productId,
          policyType: fulfillmentType(policy?.tinh_trang ?? "READY_STOCK"),
          canOrderWhenZero: policy?.can_order_when_zero ?? false,
          etaToCustomer:
            policy?.prep_min_days !== null && policy?.prep_min_days !== undefined &&
              policy.prep_max_days !== null && policy.prep_max_days !== undefined
              ? {
                  minDays: policy.prep_min_days,
                  maxDays: policy.prep_max_days,
                  validUntil: etaValidUntil,
                }
              : null,
          metadata: {
            authority: "GOOGLE_SHEETS_FULFILLMENT_POLICY",
            sourceVersion: input.snapshot.policy_version,
            observedAt: posObservedAt,
            expiresAt: fulfillmentExpiresAt,
            expiryBasis: etaValidUntil ? "ETA_VALID_UNTIL" : "DEFAULT_7_DAY_TTL",
            freshForSeconds: etaValidUntil ? null : FULFILLMENT_FRESH_FOR_SECONDS,
            freshnessState:
              Date.parse(fulfillmentExpiresAt) > input.now.getTime() ? "FRESH" : "STALE",
          },
        },
        sizeChart: verifiedSizeChart(input.policy, input.product.productId, stableObservedAt),
        media: {
          assets: [],
          metadata: {
            authority: "QDRANT_STABLE",
            sourceVersion: input.product.catalogVersion,
            observedAt: stableObservedAt,
            expiresAt: plusSeconds(stableObservedAt, MEDIA_FRESH_FOR_SECONDS),
            freshForSeconds: MEDIA_FRESH_FOR_SECONDS,
            freshnessState:
              Date.parse(plusSeconds(stableObservedAt, MEDIA_FRESH_FOR_SECONDS)) >
                input.now.getTime()
                ? "FRESH"
                : "STALE",
          },
        },
      },
      now: input.now,
    });
    return ProductFactsV2Schema.parse({
      ...projected,
      media: {
        ...projected.media,
        assets: mediaAssets(input.product, projected.bom),
      },
    });
  } catch {
    return null;
  }
}

export const sizeChartArtifactsFromPolicy = (
  policy: RuntimePolicyResolution | null,
): readonly Extract<AdminArtifactContentV1, { kind: "SIZE_CHART" }>[] =>
  Object.values(policy?.bundle?.artifacts.sizeCharts ?? {});
