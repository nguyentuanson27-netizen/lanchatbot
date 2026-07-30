import { Pool } from "pg";
import { withTransaction } from "./repositories.js";

export type ProductMediaProjectionStatus = "RESERVED" | "PROJECTED" | "FAILED";

export interface ProductMediaIntakeInput {
  readonly intakeId: string;
  readonly brand: string;
  readonly brandKey: string;
  readonly productCode: string;
  readonly imageHash: string;
  readonly imageUrl: string;
  readonly uploadedAt: Date;
}

export interface ProductMediaLegacyIntake extends ProductMediaIntakeInput {
  readonly projectionStatus?: ProductMediaProjectionStatus;
}

export interface ProductMediaIntakeRecord extends ProductMediaIntakeInput {
  readonly projectionStatus: ProductMediaProjectionStatus;
  readonly projectedAt: Date | null;
  readonly lastErrorCode: string | null;
  readonly revision: number;
}

export interface ProductMediaReservation {
  readonly claimed: boolean;
  readonly record: ProductMediaIntakeRecord;
}

interface IntakeRow {
  intake_id: string;
  brand: string;
  brand_key: string;
  product_code: string;
  image_hash: string;
  image_url: string;
  uploaded_at: Date;
  projection_status: ProductMediaProjectionStatus;
  projected_at: Date | null;
  last_error_code: string | null;
  revision: string;
}

const RETURNING_COLUMNS = `
  intake_id, brand, brand_key, product_code, image_hash, image_url,
  uploaded_at, projection_status,
  projected_at, last_error_code, revision`;

function record(row: IntakeRow): ProductMediaIntakeRecord {
  return {
    intakeId: row.intake_id,
    brand: row.brand,
    brandKey: row.brand_key,
    productCode: row.product_code,
    imageHash: row.image_hash,
    imageUrl: row.image_url,
    uploadedAt: row.uploaded_at,
    projectionStatus: row.projection_status,
    projectedAt: row.projected_at,
    lastErrorCode: row.last_error_code,
    revision: Number(row.revision),
  };
}

function values(input: ProductMediaIntakeInput): readonly unknown[] {
  return [
    input.intakeId,
    input.brand,
    input.brandKey,
    input.productCode,
    input.imageHash,
    input.imageUrl,
    input.uploadedAt,
  ];
}

export class PostgresProductMediaIntakeStore {
  private readonly pool: Pool;

  constructor(connectionString: string, maxPoolSize = 2) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({
      connectionString,
      max: Math.max(1, Math.min(5, Math.trunc(maxPoolSize))),
    });
  }

  async ready(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1 FROM product_media_intakes LIMIT 1");
      return true;
    } catch {
      return false;
    }
  }

  async reserve(input: ProductMediaIntakeInput): Promise<ProductMediaReservation> {
    const inserted = await this.pool.query<IntakeRow>(
      `INSERT INTO product_media_intakes (
         intake_id, brand, brand_key, product_code, image_hash, image_url, uploaded_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (brand_key, product_code, image_hash) DO NOTHING
       RETURNING ${RETURNING_COLUMNS}`,
      [...values(input)],
    );
    if (inserted.rows[0]) return { claimed: true, record: record(inserted.rows[0]) };

    const retried = await this.pool.query<IntakeRow>(
      `UPDATE product_media_intakes
       SET projection_status = 'RESERVED',
           image_url = $6,
           uploaded_at = $7,
           projected_at = NULL,
           last_error_code = NULL,
           revision = revision + 1,
           updated_at = now()
       WHERE brand_key = $3 AND product_code = $4 AND image_hash = $5
         AND (
           projection_status = 'FAILED'
           OR (projection_status = 'RESERVED' AND updated_at < now() - interval '15 minutes')
         )
       RETURNING ${RETURNING_COLUMNS}`,
      [...values(input)],
    );
    if (retried.rows[0]) return { claimed: true, record: record(retried.rows[0]) };

    const existing = await this.pool.query<IntakeRow>(
      `SELECT ${RETURNING_COLUMNS}
       FROM product_media_intakes
       WHERE brand_key = $1 AND product_code = $2 AND image_hash = $3`,
      [input.brandKey, input.productCode, input.imageHash],
    );
    if (!existing.rows[0]) throw new Error("PRODUCT_MEDIA_DEDUPE_RESERVATION_RACE");
    return { claimed: false, record: record(existing.rows[0]) };
  }

  async backfill(inputs: readonly ProductMediaLegacyIntake[]): Promise<number> {
    if (inputs.length === 0) return 0;
    return withTransaction(this.pool, async (client) => {
      let inserted = 0;
      for (const input of inputs) {
        const result = await client.query(
          `INSERT INTO product_media_intakes (
             intake_id, brand, brand_key, product_code, image_hash, image_url, uploaded_at,
             projection_status, projected_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
             CASE WHEN $8 = 'PROJECTED' THEN $7 ELSE NULL END)
           ON CONFLICT (brand_key, product_code, image_hash) DO UPDATE SET
             brand = EXCLUDED.brand,
             image_url = EXCLUDED.image_url,
             projection_status = 'PROJECTED',
             projected_at = COALESCE(product_media_intakes.projected_at, EXCLUDED.uploaded_at),
             last_error_code = NULL,
             revision = product_media_intakes.revision + 1,
             updated_at = now()
           WHERE EXCLUDED.projection_status = 'PROJECTED'`,
          [...values(input), input.projectionStatus ?? "PROJECTED"],
        );
        inserted += result.rowCount ?? 0;
      }
      return inserted;
    });
  }

  async markProjected(intakeId: string, imageUrl: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE product_media_intakes
       SET projection_status = 'PROJECTED', image_url = $2,
           projected_at = now(), last_error_code = NULL,
           revision = revision + 1, updated_at = now()
       WHERE intake_id = $1`,
      [intakeId, imageUrl],
    );
    if (result.rowCount !== 1) throw new Error("PRODUCT_MEDIA_INTAKE_NOT_FOUND");
  }

  async markFailed(intakeId: string, errorCode: string): Promise<void> {
    await this.pool.query(
      `UPDATE product_media_intakes
       SET projection_status = 'FAILED', last_error_code = $2,
           revision = revision + 1, updated_at = now()
       WHERE intake_id = $1 AND projection_status = 'RESERVED'`,
      [intakeId, errorCode.slice(0, 128)],
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
