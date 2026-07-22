import type {
  FulfillmentPolicyPort,
  InventorySnapshot,
  InventorySnapshotPort,
  ParentFulfillmentPolicy,
  ScoredStableProduct,
  StableCatalogSearchPort,
  StableProductDocument,
} from "./types.js";
import { normalizeProductCode } from "./inventory.js";

export class FakeInventorySnapshotPort implements InventorySnapshotPort {
  public constructor(private readonly snapshots: ReadonlyMap<string, InventorySnapshot>) {}

  public async read(parentProductId: string): Promise<InventorySnapshot> {
    return (
      this.snapshots.get(parentProductId) ?? {
        status: "OK",
        shopConfigured: true,
        observedAt: new Date(0).toISOString(),
        variations: [],
      }
    );
  }
}

export class FakeFulfillmentPolicyPort implements FulfillmentPolicyPort {
  public constructor(private readonly policies: ReadonlyMap<string, ParentFulfillmentPolicy>) {}

  public async getParentPolicy(parentProductId: string): Promise<ParentFulfillmentPolicy | null> {
    return this.policies.get(parentProductId) ?? null;
  }
}

export class FakeStableCatalogSearchPort implements StableCatalogSearchPort {
  public readonly calls: string[] = [];

  public constructor(
    private readonly documents: readonly StableProductDocument[],
    private readonly textCandidates: readonly ScoredStableProduct[] = [],
    private readonly imageCandidates: readonly ScoredStableProduct[] = [],
  ) {}

  public async findByExactCode(normalizedCode: string): Promise<StableProductDocument | null> {
    this.calls.push(`exact:${normalizedCode}`);
    return this.documents.find((item) => item.canonicalCode.toUpperCase() === normalizedCode) ?? null;
  }

  public async findByAlias(normalizedAlias: string): Promise<readonly StableProductDocument[]> {
    this.calls.push(`alias:${normalizedAlias}`);
    return this.documents.filter((item) =>
      item.aliases.some((alias) => normalizeProductCode(alias) === normalizedAlias),
    );
  }

  public async searchStableText(query: string, limit: number): Promise<readonly ScoredStableProduct[]> {
    this.calls.push(`text:${query}`);
    return this.textCandidates.slice(0, limit);
  }

  public async searchStableImage(imageUrl: string, limit: number): Promise<readonly ScoredStableProduct[]> {
    this.calls.push(`image:${imageUrl}`);
    return this.imageCandidates.slice(0, limit);
  }
}
