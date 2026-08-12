import { describe, expect, it, vi } from "vitest";
import type { StableProductDocument } from "@lana/business-tools";
import {
  buildBusinessFactQueries,
  multiFactReply,
  resolveBusinessFactQueriesBounded,
  type ResolvedProductReference,
} from "./realtime-runner.js";

const product = (productId: string): StableProductDocument => ({
  productId,
  parentProductId: productId,
  canonicalCode: productId,
  aliases: [],
  title: `Product ${productId}`,
  colors: [],
  materials: [],
  silhouettes: [],
  occasions: [],
  imageUrls: [],
  images: [],
  catalogVersion: "unbounded-text-red-v1",
});

const code = (ordinal: number): string => `SD${String(ordinal).padStart(3, "0")}`;

const resolvedReferences = (count: number): readonly ResolvedProductReference[] =>
  Array.from({ length: count }, (_, index) => {
    const productCode = code(index + 1);
    return {
      raw: productCode,
      product: product(productCode),
      resolution: "RESOLVED" as const,
    };
  });

describe("unbounded text product business-fact queries", () => {
  it.each([1, 3, 4, 10, 11, 14])(
    "retains all %i distinct valid product codes in first-occurrence order",
    (count) => {
      const references = resolvedReferences(count);
      const text = `${references.map(({ raw }) => raw).join(", ")} price and stock`;

      const queries = buildBusinessFactQueries(`event-${count}`, text, references);

      expect(queries?.queries.map(({ productRef }) => productRef.productId)).toEqual(
        references.map(({ product }) => product!.productId),
      );
      expect(queries?.queries).toHaveLength(count);
    },
  );

  it("deduplicates normalized product codes around positions ten and eleven and keeps first occurrence", () => {
    const firstTen = resolvedReferences(10);
    const duplicateWithDifferentSurface: ResolvedProductReference = {
      raw: " sd010 ",
      product: product("sd010"),
      resolution: "RESOLVED",
    };
    const eleventh: ResolvedProductReference = {
      raw: "SD011",
      product: product("SD011"),
      resolution: "RESOLVED",
    };

    const queries = buildBusinessFactQueries(
      "event-boundary-duplicate",
      "SD001 SD002 SD003 SD004 SD005 SD006 SD007 SD008 SD009 SD010 sd010 SD011 price",
      [...firstTen, duplicateWithDifferentSurface, eleventh],
    );

    expect(queries?.queries.map(({ productRef }) => productRef.raw)).toEqual([
      ...firstTen.map(({ raw }) => raw),
      "SD011",
    ]);
  });

  it("preserves unresolved evidence without dropping later valid products", () => {
    const references = [...resolvedReferences(12)];
    references.splice(5, 0, {
      raw: "BAD-CODE",
      product: null,
      resolution: "NOT_FOUND",
    });

    const queries = buildBusinessFactQueries(
      "event-unresolved-middle",
      `${references.map(({ raw }) => raw).join(" ")} price`,
      references,
    );

    expect(queries?.queries.map(({ productRef }) => ({
      raw: productRef.raw,
      resolution: productRef.resolution,
    }))).toEqual(references.map(({ raw, resolution }) => ({ raw, resolution })));
    expect(queries?.queries.at(-1)?.productRef.productId).toBe("SD012");
  });

  it.each([4, 10, 11, 14])(
    "resolves all %i product facts once with peak concurrency three and stable order",
    async (count) => {
      const references = resolvedReferences(count);
      const queries = buildBusinessFactQueries(
        `event-facts-${count}`,
        `${references.map(({ raw }) => raw).join(" ")} price`,
        references,
      )!;
      let active = 0;
      let peak = 0;
      const resolveFact = vi.fn(async (query: { productId: string }) => {
        active += 1;
        peak = Math.max(peak, active);
        const ordinal = Number.parseInt(query.productId.slice(2), 10);
        await new Promise((resolve) => setTimeout(resolve, count - ordinal));
        active -= 1;
        return {
          schemaVersion: 1 as const,
          status: "NOT_FOUND" as const,
          source: "POS_SNAPSHOT" as const,
          observedAt: "2026-08-12T08:00:00.000Z",
          expiresAt: null,
          productId: query.productId,
          facts: null,
          reasonCode: "CATALOG_SNAPSHOT_NOT_FOUND",
        };
      });

      const results = await resolveBusinessFactQueriesBounded(
        queries,
        references.map(({ product }) => product!),
        resolveFact,
        "LANA",
      );

      expect(resolveFact).toHaveBeenCalledTimes(count);
      expect(peak).toBeLessThanOrEqual(3);
      expect(results.map(({ product: item }) => item?.productId)).toEqual(
        references.map(({ product: item }) => item!.productId),
      );
    },
  );

  it("renders every resolved product exactly once in customer order", async () => {
    const references = resolvedReferences(11);
    const queries = buildBusinessFactQueries(
      "event-render-all",
      `${references.map(({ raw }) => raw).join(" ")} price`,
      references,
    )!;
    const results = await resolveBusinessFactQueriesBounded(
      queries,
      references.map(({ product: item }) => item!),
      async ({ productId }) => ({
        schemaVersion: 1,
        status: "OK",
        source: "POS_SNAPSHOT",
        observedAt: "2026-08-12T08:00:00.000Z",
        expiresAt: "2026-08-12T08:10:00.000Z",
        productId,
        facts: {
          schemaVersion: 1,
          productId,
          parentProductId: productId,
          offerType: "STANDARD",
          listPriceVnd: 100_000,
          salePriceVnd: null,
          sizes: [],
          stockStatus: "IN_STOCK",
          stockQuantity: 1,
          deliveryEta: null,
          fulfillmentPolicy: null,
          imageUrls: [],
        },
        reasonCode: null,
      }),
      "LANA",
    );

    const reply = multiFactReply(results)!;
    const positions = references.map(({ raw }) => reply.indexOf(raw));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    for (const { raw } of references) {
      expect(reply.match(new RegExp(raw, "gu"))).toHaveLength(1);
    }
  });
});
