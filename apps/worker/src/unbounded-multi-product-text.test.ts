import { describe, expect, it, vi } from "vitest";
import { BusinessFactEnvelopeV1Schema, RealtimeCustomerInputSchema, type BusinessFactEnvelopeV1 } from "@lana/contracts";
import { noCustomerSelection } from "./realtime-customer-input.fixture.js";
import type { StableProductDocument } from "@lana/business-tools";
import {
  buildBusinessFactQueries,
  multiFactReply,
  resolveBusinessFactQueriesBounded,
  resolveProductReferencesBounded,
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
  it("keeps each typed fact subject's qualifier outside the buying selection", () => {
    const input = RealtimeCustomerInputSchema.parse({ ...noCustomerSelection(),
      factQuery: { intent: "STOCK", offerType: null, size: "S", color: null, deliveryRegion: null },
      obligations: [
        { kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: "SD001", evidenceText: "SD001 size S còn không?" },
        { kind: "FACT_REQUEST", capability: "STOCK", scope: null, productId: "SD002", evidenceText: "SD002 size L còn không?" },
      ],
    });
    const queries = buildBusinessFactQueries("typed-qualifiers", "Chị lấy size M. SD001 size S còn không? SD002 size L còn không?", resolvedReferences(2), input);
    expect(queries?.queries.map(({ productRef, requestedFacts, qualifiers }) =>
      ({ productId: productRef.productId, requestedFacts, size: qualifiers.size }))).toEqual([
      { productId: "SD001", requestedFacts: ["STOCK"], size: "S" },
      { productId: "SD002", requestedFacts: ["STOCK"], size: "L" },
    ]);
  });
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

  it("resolves more than ten residual text codes with stable order and peak concurrency three", async () => {
    const codes = Array.from({ length: 14 }, (_, index) => code(index + 1));
    let active = 0;
    let peak = 0;
    const references = await resolveProductReferencesBounded(codes, async (productCode) => {
      active += 1;
      peak = Math.max(peak, active);
      const ordinal = Number.parseInt(productCode.slice(2), 10);
      await new Promise((resolve) => setTimeout(resolve, 15 - ordinal));
      active -= 1;
      return product(productCode);
    });

    expect(peak).toBeLessThanOrEqual(3);
    expect(references.map(({ raw }) => raw)).toEqual(codes);
    expect(references.every(({ resolution }) => resolution === "RESOLVED")).toBe(true);
  });
});


describe("partial lookup failure isolation", () => {
  it("preserves independent reads and exposes an error only for the failed requested fact", async () => {
    const references = resolvedReferences(2);
    const base = buildBusinessFactQueries("lookup-fault", "SD001 SD002 price", references)!;
    const queries = { ...base, queries: base.queries.map((query) => ({ ...query,
      requestedFacts: ["PRICE", "STOCK"] as ("PRICE" | "STOCK")[] })) };
    const resolve = vi.fn(async ({ productId, intent }: { productId: string; intent: string }): Promise<BusinessFactEnvelopeV1> => {
      if (productId === "SD001" && intent === "PRICE") throw new Error("redis phone=0901234567 token=secret");
      return { schemaVersion: 1, status: "OK", source: "POS_SNAPSHOT",
        observedAt: "2026-09-30T00:00:00.000Z", expiresAt: "2099-01-01T00:00:00.000Z", productId,
        facts: { schemaVersion: 1, productId, parentProductId: productId, offerType: "STANDARD",
          salePriceVnd: 100_000, listPriceVnd: null, sizes: [], stockStatus: "IN_STOCK", stockQuantity: 2,
          deliveryEta: null, fulfillmentPolicy: null, imageUrls: [] }, reasonCode: null };
    });
    const result = await resolveBusinessFactQueriesBounded(queries, references.map(({ product }) => product!), resolve, "LANA");
    expect(resolve).toHaveBeenCalledTimes(4);
    expect(result.map(({ facts }) => facts.map(({ envelope }) => envelope.status))).toEqual([["ERROR", "OK"], ["OK", "OK"]]);
    const failed = result[0]!.facts[0]!.envelope;
    expect(BusinessFactEnvelopeV1Schema.safeParse(failed).success).toBe(true);
    expect(failed).toMatchObject({ productId: "SD001", facts: null, reasonCode: "BUSINESS_FACT_LOOKUP_FAILED" });
    expect(JSON.stringify(result)).not.toMatch(/0901234567|token=|redis phone/);
    const reply = multiFactReply(result)!;
    expect(reply).toContain("SD001");
    expect(reply).toContain("SD002");
    expect(reply).toContain("100k");
  });
});
