import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";

export interface StageSizeChartArtifactInput {
  readonly imageId: string;
  readonly parentProductId: string;
  readonly imageUrl: string;
  readonly imageSha256: string;
  readonly extractorVersion: string;
  readonly measurementBasis: "BODY" | "GARMENT" | "UNKNOWN";
  readonly confidence: number;
  readonly observedAt: string;
  readonly artifactKey: string;
  readonly content: Record<string, unknown>;
}

export interface StageSizeChartArtifactResult {
  readonly status: "CREATED" | "EXISTS";
  readonly extractionId: string;
  readonly versionId: string | null;
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
};

const contentHash = (value: unknown): string =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`;

export class PostgresSizeChartExtractionStore {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    if (!connectionString.trim()) throw new Error("SIZE_CHART_DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 30_000 });
  }

  async stage(input: StageSizeChartArtifactInput): Promise<StageSizeChartArtifactResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.artifactKey]);
      const existing = await client.query(
        `SELECT extraction_id, artifact_version_id
         FROM size_chart_extractions
         WHERE parent_product_id = $1 AND image_sha256 = $2 AND extractor_version = $3`,
        [input.parentProductId, input.imageSha256, input.extractorVersion],
      );
      if (existing.rowCount) {
        await client.query("COMMIT");
        return {
          status: "EXISTS",
          extractionId: String(existing.rows[0].extraction_id),
          versionId: existing.rows[0].artifact_version_id
            ? String(existing.rows[0].artifact_version_id)
            : null,
        };
      }

      const next = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS version_number
         FROM admin_artifact_versions WHERE artifact_key = $1`,
        [input.artifactKey],
      );
      const versionId = randomUUID();
      const versionNumber = Number(next.rows[0]?.version_number ?? 1);
      await client.query(
        `INSERT INTO admin_artifact_versions (
           version_id, artifact_key, artifact_kind, version_number, lifecycle,
           revision, content, content_hash, created_by_subject, updated_by_subject
         ) VALUES ($1, $2, 'SIZE_CHART', $3, 'DRAFT', 0, $4::jsonb, $5, $6, $6)`,
        [
          versionId,
          input.artifactKey,
          versionNumber,
          JSON.stringify(input.content),
          contentHash(input.content),
          "service:size-chart-extractor",
        ],
      );
      const correlationId = randomUUID();
      await client.query(
        `INSERT INTO admin_artifact_events (
           version_id, artifact_key, action, from_lifecycle, to_lifecycle,
           actor_subject, actor_role, correlation_id, metadata_safe
         ) VALUES ($1, $2, 'CREATED', NULL, 'DRAFT', $3, 'EDITOR', $4, $5::jsonb)`,
        [
          versionId,
          input.artifactKey,
          "service:size-chart-extractor",
          correlationId,
          JSON.stringify({
            source: "IMAGE_EXTRACTION",
            imageId: input.imageId,
            parentProductId: input.parentProductId,
            extractorVersion: input.extractorVersion,
          }),
        ],
      );
      const extraction = await client.query(
        `INSERT INTO size_chart_extractions (
           image_id, parent_product_id, image_url, image_sha256,
           extractor_version, status, measurement_basis, confidence,
           artifact_version_id, observed_at
         ) VALUES ($1, $2, $3, $4, $5, 'STAGED', $6, $7, $8, $9)
         RETURNING extraction_id`,
        [
          input.imageId,
          input.parentProductId,
          input.imageUrl,
          input.imageSha256,
          input.extractorVersion,
          input.measurementBasis,
          input.confidence,
          versionId,
          input.observedAt,
        ],
      );
      await client.query("COMMIT");
      return {
        status: "CREATED",
        extractionId: String(extraction.rows[0].extraction_id),
        versionId,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
