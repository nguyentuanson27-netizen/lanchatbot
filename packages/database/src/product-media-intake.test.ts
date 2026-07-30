import { describe, expect, it, vi } from "vitest";
import { PostgresProductMediaIntakeStore } from "./product-media-intake.js";

const input = {
  intakeId: "a".repeat(32),
  brand: "La.na Design",
  brandKey: "lanadesign",
  productCode: "CB182",
  imageHash: "b".repeat(64),
  imageUrl: "https://example.test/cb182.webp",
  uploadedAt: new Date("2026-07-30T10:00:00.000Z"),
} as const;

function row(status: "RESERVED" | "PROJECTED" | "FAILED" = "RESERVED") {
  return {
    intake_id: input.intakeId,
    brand: input.brand,
    brand_key: input.brandKey,
    product_code: input.productCode,
    image_hash: input.imageHash,
    image_url: input.imageUrl,
    uploaded_at: input.uploadedAt,
    projection_status: status,
    projected_at: status === "PROJECTED" ? input.uploadedAt : null,
    last_error_code: status === "FAILED" ? "timeout" : null,
    revision: "0",
  };
}

describe("PostgresProductMediaIntakeStore", () => {
  it("claims a new unique brand/product/hash reservation", async () => {
    const query = vi.fn(async (sql: string) => ({
      rowCount: 1,
      rows: sql.includes("INSERT INTO product_media_intakes") ? [row()] : [],
    }));
    const store = new PostgresProductMediaIntakeStore("postgresql://unused");
    (store as unknown as { pool: unknown }).pool = { query, end: vi.fn() };

    const result = await store.reserve(input);

    expect(result.claimed).toBe(true);
    expect(result.record.intakeId).toBe(input.intakeId);
    expect(query.mock.calls[0]?.[0]).toContain("ON CONFLICT (brand_key, product_code, image_hash)");
  });

  it("atomically reclaims FAILED reservations without creating a second row", async () => {
    let call = 0;
    const query = vi.fn(async (_sql: string) => {
      call += 1;
      if (call === 1) return { rowCount: 0, rows: [] };
      return { rowCount: 1, rows: [row("RESERVED")] };
    });
    const store = new PostgresProductMediaIntakeStore("postgresql://unused");
    (store as unknown as { pool: unknown }).pool = { query, end: vi.fn() };

    const result = await store.reserve(input);

    expect(result.claimed).toBe(true);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[0]).toContain("projection_status = 'FAILED'");
    expect(query.mock.calls[1]?.[0]).toContain("projection_status = 'RESERVED'");
    expect(query.mock.calls[1]?.[0]).toContain("interval '15 minutes'");
  });

  it("returns an existing projected reservation as a duplicate", async () => {
    let call = 0;
    const query = vi.fn(async (_sql: string) => {
      call += 1;
      if (call < 3) return { rowCount: 0, rows: [] };
      return { rowCount: 1, rows: [row("PROJECTED")] };
    });
    const store = new PostgresProductMediaIntakeStore("postgresql://unused");
    (store as unknown as { pool: unknown }).pool = { query, end: vi.fn() };

    const result = await store.reserve(input);

    expect(result.claimed).toBe(false);
    expect(result.record.projectionStatus).toBe("PROJECTED");
  });
});
