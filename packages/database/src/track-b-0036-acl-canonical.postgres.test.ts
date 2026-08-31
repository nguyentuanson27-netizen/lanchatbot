import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";

const databaseUrl = process.env.POLICY_STORE_TEST_DATABASE_URL
  ?? process.env.GATE_E_STORE_TEST_DATABASE_URL;
const postgresDescribe = databaseUrl ? describe.sequential : describe.skip;
const deployDirectory = resolve(import.meta.dirname, "../../../deploy");

postgresDescribe("Track B 0036 canonical ACL comparison", () => {
  let pool: Pool;
  let relationAclSql: string;
  let functionAclSql: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl!, max: 2 });
    [relationAclSql, functionAclSql] = await Promise.all([
      readFile(resolve(deployDirectory, "track-b-0036-relation-acl-canonical.sql"), "utf8"),
      readFile(resolve(deployDirectory, "track-b-0036-function-acl-canonical.sql"), "utf8"),
    ]);
  });

  afterAll(async () => {
    await pool.end();
  });

  async function canonicalRows(client: PoolClient, sql: string): Promise<string[]> {
    const result = await client.query<{ canonical_acl_row: string }>(sql);
    return result.rows.map(({ canonical_acl_row }) => canonical_acl_row);
  }

  async function fixture<T>(run: (context: {
    client: PoolClient;
    schema: string;
    roles: readonly [string, string];
  }) => Promise<T>): Promise<T> {
    const suffix = randomBytes(6).toString("hex");
    const schema = `track_b_acl_${suffix}`;
    const roles = [`track_b_acl_a_${suffix}`, `track_b_acl_b_${suffix}`] as const;
    const client = await pool.connect();
    try {
      await client.query(`CREATE ROLE ${roles[0]} NOLOGIN; CREATE ROLE ${roles[1]} NOLOGIN`);
      await client.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}`);
      return await run({ client, schema, roles });
    } finally {
      await client.query("RESET ROLE").catch(() => undefined);
      await client.query("RESET search_path").catch(() => undefined);
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => undefined);
      await client.query(`DROP ROLE IF EXISTS ${roles[0]}`).catch(() => undefined);
      await client.query(`DROP ROLE IF EXISTS ${roles[1]}`).catch(() => undefined);
      client.release();
    }
  }

  it("normalizes null and explicit owner relation ACLs without losing implicit privileges", async () => {
    await fixture(async ({ client }) => {
      await client.query("CREATE TABLE acl_target (id bigint PRIMARY KEY)");
      const implicit = await canonicalRows(client, relationAclSql);
      expect(implicit.some((row) => row.includes('[\"OWNER\", \"r\", \"acl_target\", \"postgres\"]')))
        .toBe(true);
      expect(implicit.some((row) => row.includes('[\"PRIVILEGE\", \"r\", \"acl_target\", \"ROLE\", \"postgres\", \"postgres\", \"SELECT\", false]')))
        .toBe(true);

      await client.query("GRANT ALL PRIVILEGES ON acl_target TO postgres");
      const explicit = await canonicalRows(client, relationAclSql);
      expect(explicit).toEqual(implicit);
      expect(explicit).toEqual(await canonicalRows(client, relationAclSql));

      await client.query("REVOKE ALL PRIVILEGES ON acl_target FROM postgres");
      expect(await canonicalRows(client, relationAclSql)).not.toEqual(implicit);
    });
  });

  it("retains exact non-owner grantor and grantee identities", async () => {
    await fixture(async ({ client, schema, roles }) => {
      await client.query("CREATE TABLE acl_target (id bigint PRIMARY KEY)");
      await client.query(`ALTER TABLE acl_target OWNER TO ${roles[0]}`);
      await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${roles[0]}`);
      const baseline = await canonicalRows(client, relationAclSql);
      await client.query(`SET ROLE ${roles[0]}`);
      await client.query(`GRANT SELECT ON acl_target TO ${roles[1]}`);
      await client.query("RESET ROLE");
      const delegated = await canonicalRows(client, relationAclSql);
      expect(delegated).not.toEqual(baseline);
      expect(delegated.some((row) => row.includes(
        `[\"PRIVILEGE\", \"r\", \"acl_target\", \"ROLE\", \"${roles[1]}\", \"${roles[0]}\", \"SELECT\", false]`,
      ))).toBe(true);
    });
  });

  it("captures PUBLIC, grantor, grantee, grant option, extra and missing relation privileges", async () => {
    await fixture(async ({ client, roles }) => {
      await client.query("CREATE TABLE acl_target (id bigint PRIMARY KEY)");
      const baseline = await canonicalRows(client, relationAclSql);

      await client.query(`GRANT SELECT ON acl_target TO ${roles[0]} WITH GRANT OPTION`);
      const granted = await canonicalRows(client, relationAclSql);
      expect(granted).not.toEqual(baseline);
      expect(granted.some((row) => row.includes(
        `[\"PRIVILEGE\", \"r\", \"acl_target\", \"ROLE\", \"${roles[0]}\", \"postgres\", \"SELECT\", true]`,
      ))).toBe(true);

      await client.query(`REVOKE ALL PRIVILEGES ON acl_target FROM ${roles[0]}`);
      expect(await canonicalRows(client, relationAclSql)).toEqual(baseline);

      await client.query("GRANT SELECT ON acl_target TO PUBLIC");
      const publicGrant = await canonicalRows(client, relationAclSql);
      expect(publicGrant).not.toEqual(baseline);
      expect(publicGrant.some((row) => row.includes(
        '[\"PRIVILEGE\", \"r\", \"acl_target\", \"PUBLIC\", \"\", \"postgres\", \"SELECT\", false]',
      ))).toBe(true);
      await client.query("REVOKE SELECT ON acl_target FROM PUBLIC");
      expect(await canonicalRows(client, relationAclSql)).toEqual(baseline);
    });
  });

  it("uses PostgreSQL sequence defaults and rejects missing or extra privileges", async () => {
    await fixture(async ({ client, roles }) => {
      await client.query("CREATE SEQUENCE acl_sequence");
      const defaults = await canonicalRows(client, relationAclSql);
      for (const privilege of ["SELECT", "UPDATE", "USAGE"]) {
        expect(defaults.some((row) => row.includes(
          `[\"PRIVILEGE\", \"S\", \"acl_sequence\", \"ROLE\", \"postgres\", \"postgres\", \"${privilege}\", false]`,
        ))).toBe(true);
      }
      await client.query("GRANT ALL PRIVILEGES ON SEQUENCE acl_sequence TO postgres");
      expect(await canonicalRows(client, relationAclSql)).toEqual(defaults);
      await client.query("REVOKE SELECT ON SEQUENCE acl_sequence FROM postgres");
      expect(await canonicalRows(client, relationAclSql)).not.toEqual(defaults);
      await client.query("GRANT SELECT ON SEQUENCE acl_sequence TO postgres");
      expect(await canonicalRows(client, relationAclSql)).toEqual(defaults);
      await client.query(`GRANT USAGE ON SEQUENCE acl_sequence TO ${roles[0]}`);
      expect(await canonicalRows(client, relationAclSql)).not.toEqual(defaults);
      await client.query(`REVOKE USAGE ON SEQUENCE acl_sequence FROM ${roles[0]}`);
      expect(await canonicalRows(client, relationAclSql)).toEqual(defaults);
    });
  });

  it("rejects implicit rehearsal role mapping by retaining the exact owner identity", async () => {
    await fixture(async ({ client, roles }) => {
      await client.query("CREATE TABLE acl_target (id bigint PRIMARY KEY)");
      await client.query(`ALTER TABLE acl_target OWNER TO ${roles[0]}`);
      const firstOwner = await canonicalRows(client, relationAclSql);
      await client.query(`ALTER TABLE acl_target OWNER TO ${roles[1]}`);
      const secondOwner = await canonicalRows(client, relationAclSql);
      expect(secondOwner).not.toEqual(firstOwner);
      expect(firstOwner.some((row) => row.includes(`\"${roles[0]}\"`))).toBe(true);
      expect(secondOwner.some((row) => row.includes(`\"${roles[1]}\"`))).toBe(true);
    });
  });

  it("distinguishes pseudo-PUBLIC from a quoted role named PUBLIC", async () => {
    const suffix = randomBytes(6).toString("hex");
    const schema = `track_b_acl_public_${suffix}`;
    const client = await pool.connect();
    try {
      expect((await client.query("SELECT count(*)::text AS count FROM pg_roles WHERE rolname='PUBLIC'"))
        .rows[0]).toEqual({ count: "0" });
      await client.query(`CREATE ROLE "PUBLIC" NOLOGIN; CREATE SCHEMA ${schema}; SET search_path TO ${schema}`);
      await client.query("CREATE TABLE acl_target (id bigint PRIMARY KEY)");
      await client.query("GRANT SELECT ON acl_target TO PUBLIC");
      await client.query("GRANT UPDATE ON acl_target TO \"PUBLIC\"");
      const rows = await canonicalRows(client, relationAclSql);
      expect(rows.some((row) => row.includes(
        '[\"PRIVILEGE\", \"r\", \"acl_target\", \"PUBLIC\", \"\", \"postgres\", \"SELECT\", false]',
      ))).toBe(true);
      expect(rows.some((row) => row.includes(
        '[\"PRIVILEGE\", \"r\", \"acl_target\", \"ROLE\", \"PUBLIC\", \"postgres\", \"UPDATE\", false]',
      ))).toBe(true);
    } finally {
      await client.query("RESET ROLE").catch(() => undefined);
      await client.query("RESET search_path").catch(() => undefined);
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => undefined);
      await client.query('DROP ROLE IF EXISTS "PUBLIC"').catch(() => undefined);
      client.release();
    }
  });

  it("fails closed on unresolved relation and function ACL identities", async () => {
    await fixture(async ({ client }) => {
      const unknownOid = 999_999_999;
      expect((await client.query("SELECT count(*)::text AS count FROM pg_roles WHERE oid=$1", [unknownOid]))
        .rows[0]).toEqual({ count: "0" });
      await client.query("CREATE TABLE acl_target (id bigint PRIMARY KEY)");
      await client.query("CREATE FUNCTION acl_function() RETURNS integer LANGUAGE sql AS 'SELECT 1'");
      await client.query(`
        UPDATE pg_class
           SET relacl = ARRAY[makeaclitem($1::oid, relowner, 'SELECT', false)]
         WHERE oid = 'acl_target'::regclass
      `, [unknownOid]);
      await expect(canonicalRows(client, relationAclSql)).rejects.toThrow(/division by zero/iu);
      await client.query(`
        UPDATE pg_proc
           SET proacl = ARRAY[makeaclitem($1::oid, proowner, 'EXECUTE', false)]
         WHERE oid = 'acl_function()'::regprocedure
      `, [unknownOid]);
      await expect(canonicalRows(client, functionAclSql)).rejects.toThrow(/division by zero/iu);
    });
  });

  it("normalizes function defaults while preserving PUBLIC and grant-option semantics", async () => {
    await fixture(async ({ client, roles }) => {
      await client.query("CREATE FUNCTION acl_target() RETURNS integer LANGUAGE sql AS 'SELECT 1'");
      const defaults = await canonicalRows(client, functionAclSql);
      expect(defaults.some((row) => row.includes(
        '[\"PRIVILEGE\", \"acl_target\", \"\", \"PUBLIC\", \"\", \"postgres\", \"EXECUTE\", false]',
      ))).toBe(true);

      await client.query("REVOKE EXECUTE ON FUNCTION acl_target() FROM PUBLIC");
      const withoutPublic = await canonicalRows(client, functionAclSql);
      expect(withoutPublic).not.toEqual(defaults);
      await client.query("GRANT EXECUTE ON FUNCTION acl_target() TO PUBLIC");
      expect(await canonicalRows(client, functionAclSql)).toEqual(defaults);

      await client.query(`GRANT EXECUTE ON FUNCTION acl_target() TO ${roles[0]} WITH GRANT OPTION`);
      const delegated = await canonicalRows(client, functionAclSql);
      expect(delegated.some((row) => row.includes(
        `[\"PRIVILEGE\", \"acl_target\", \"\", \"ROLE\", \"${roles[0]}\", \"postgres\", \"EXECUTE\", true]`,
      ))).toBe(true);

      await client.query("REVOKE EXECUTE ON FUNCTION acl_target() FROM postgres");
      expect(await canonicalRows(client, functionAclSql)).not.toEqual(delegated);
    });
  });
});
