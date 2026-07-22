import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, type PoolClient } from "pg";

export interface MigrationResult {
  name: string;
  direction: "up" | "down";
}

const migrationsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../migrations");

async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name text PRIMARY KEY,
      checksum_sha256 text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function migrationFiles(direction: "up" | "down"): Promise<string[]> {
  const suffix = `.${direction}.sql`;
  return (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(suffix))
    .sort((left, right) => left.localeCompare(right));
}

function migrationName(fileName: string): string {
  return fileName.replace(/\.(up|down)\.sql$/, "");
}

function checksum(sql: string): string {
  return createHash("sha256").update(sql, "utf8").digest("hex");
}

export async function migrateUp(pool: Pool): Promise<MigrationResult[]> {
  const client = await pool.connect();
  const results: MigrationResult[] = [];
  try {
    await ensureMigrationTable(client);
    for (const fileName of await migrationFiles("up")) {
      const name = migrationName(fileName);
      const sql = await readFile(resolve(migrationsDirectory, fileName), "utf8");
      const digest = checksum(sql);
      const applied = await client.query<{ checksum_sha256: string }>(
        "SELECT checksum_sha256 FROM schema_migrations WHERE migration_name = $1",
        [name],
      );
      if (applied.rowCount) {
        if (applied.rows[0]?.checksum_sha256 !== digest) {
          throw new Error(`Applied migration checksum changed: ${name}`);
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (migration_name, checksum_sha256) VALUES ($1, $2)",
          [name, digest],
        );
        await client.query("COMMIT");
        results.push({ name, direction: "up" });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    return results;
  } finally {
    client.release();
  }
}

export async function migrateDownOne(pool: Pool): Promise<MigrationResult | null> {
  if (process.env.ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK !== "true") {
    throw new Error("Rollback refused. Set ALLOW_DESTRUCTIVE_MIGRATION_ROLLBACK=true explicitly.");
  }
  const client = await pool.connect();
  try {
    await ensureMigrationTable(client);
    const latest = await client.query<{ migration_name: string }>(
      "SELECT migration_name FROM schema_migrations ORDER BY applied_at DESC, migration_name DESC LIMIT 1",
    );
    const name = latest.rows[0]?.migration_name;
    if (!name) return null;

    const downFile = resolve(migrationsDirectory, `${name}.down.sql`);
    const sql = await readFile(downFile, "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("DELETE FROM schema_migrations WHERE migration_name = $1", [name]);
      await client.query("COMMIT");
      return { name, direction: "down" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const direction = process.argv[2] ?? "up";
    const result = direction === "down" ? await migrateDownOne(pool) : await migrateUp(pool);
    // Migration names are non-sensitive. Never print connection strings or query parameters.
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Migration failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

