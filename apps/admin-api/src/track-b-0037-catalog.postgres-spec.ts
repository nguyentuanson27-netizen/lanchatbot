import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

const databaseUrl = process.env.POLICY_STORE_TEST_DATABASE_URL;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const canonicalizer = resolve(repositoryRoot, "deploy/track-b-0037-check-canonicalizer.mjs");

type ConstraintIdentity = Readonly<{
  checkNodeTree: string;
  deferred: boolean;
  deferrable: boolean;
  definition: string;
  owningSchema: string;
  owningTable: string;
  type: string;
  validated: boolean;
}>;

function canonicalize(identity: ConstraintIdentity): string {
  const input = `${JSON.stringify({
    objectKind: "CONSTRAINT",
    objectName: "public.df13_commerce_cutover_fences.df13_commerce_cutover_fences_scope_ck",
    identity: {
      ...identity,
      owningSchema: "public",
      owningTable: "df13_commerce_cutover_fences",
    },
  })}\n`;
  const result = spawnSync(process.execPath, [canonicalizer], {
    encoding: "utf8",
    input,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("0037 catalog canonicalization accepts dump/restore Boolean formatting and rejects semantic drift", {
  skip: databaseUrl ? false : "POLICY_STORE_TEST_DATABASE_URL is not configured",
}, async () => {
  assert.ok(databaseUrl);
  const client = new Client({ connectionString: databaseUrl });
  const schema = `track_b_0037_catalog_${process.pid}`;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    const definitions = new Map<string, string>([
      ["source_nested", "length(page_id) BETWEEN 1 AND 64 AND channel ~ '^[A-Z][A-Z0-9_]{0,31}$'"],
      ["restored_flat", "length(page_id) >= 1 AND length(page_id) <= 64 AND channel ~ '^[A-Z][A-Z0-9_]{0,31}$'"],
      ["changed_structure", "(length(page_id) >= 1 OR length(page_id) <= 64) AND channel ~ '^[A-Z][A-Z0-9_]{0,31}$'"],
      ["changed_operand", "length(channel) >= 1 AND length(page_id) <= 64 AND channel ~ '^[A-Z][A-Z0-9_]{0,31}$'"],
      ["changed_literal", "length(page_id) >= 1 AND length(page_id) <= 63 AND channel ~ '^[A-Z][A-Z0-9_]{0,31}$'"],
      ["changed_operator", "length(page_id) > 1 AND length(page_id) <= 64 AND channel ~ '^[A-Z][A-Z0-9_]{0,31}$'"],
      ["changed_cast", "length(page_id)::bigint >= 1 AND length(page_id) <= 64 AND channel ~ '^[A-Z][A-Z0-9_]{0,31}$'"],
      ["changed_null", "page_id IS NOT NULL AND length(page_id) <= 64 AND channel ~ '^[A-Z][A-Z0-9_]{0,31}$'"],
      ["changed_function", "octet_length(page_id) >= 1 AND length(page_id) <= 64 AND channel ~ '^[A-Z][A-Z0-9_]{0,31}$'"],
      ["changed_collation", "length(page_id) >= 1 AND length(page_id) <= 64 AND (channel COLLATE \"C\") ~ '^[A-Z][A-Z0-9_]{0,31}$'"],
    ]);
    for (const [table, definition] of definitions) {
      await client.query(`
        CREATE TABLE ${schema}.${table} (
          page_id text NOT NULL,
          channel text NOT NULL,
          CONSTRAINT scope_ck CHECK (${definition})
        )
      `);
    }

    const identities = new Map<string, ConstraintIdentity>();
    for (const table of definitions.keys()) {
      const result = await client.query<ConstraintIdentity>(`
        SELECT
          constraint_row.conbin::text AS "checkNodeTree",
          constraint_row.condeferred AS deferred,
          constraint_row.condeferrable AS deferrable,
          pg_get_constraintdef(constraint_row.oid, false) AS definition,
          table_ns.nspname AS "owningSchema",
          table_class.relname AS "owningTable",
          constraint_row.contype AS type,
          constraint_row.convalidated AS validated
        FROM pg_constraint constraint_row
        JOIN pg_class table_class ON table_class.oid = constraint_row.conrelid
        JOIN pg_namespace table_ns ON table_ns.oid = table_class.relnamespace
        WHERE table_ns.nspname = $1 AND table_class.relname = $2 AND constraint_row.conname = 'scope_ck'
      `, [schema, table]);
      assert.equal(result.rowCount, 1);
      const identity = result.rows[0];
      assert.ok(identity);
      identities.set(table, identity);
    }

    const nested = identities.get("source_nested");
    const flat = identities.get("restored_flat");
    assert.ok(nested && flat);
    assert.notEqual(nested.definition, flat.definition, "fixture must reproduce dump/restore formatting drift");
    assert.equal(canonicalize(nested), canonicalize(flat));

    const baseline = canonicalize(nested);
    for (const table of definitions.keys()) {
      if (table === "source_nested" || table === "restored_flat") continue;
      const identity = identities.get(table);
      assert.ok(identity);
      assert.notEqual(canonicalize(identity), baseline, `${table} semantic drift was erased`);
    }
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await client.end();
  }
});
