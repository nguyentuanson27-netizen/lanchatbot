import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPolicyArtifactListQuery,
  createPolicyReviewStore,
  decodePolicyCursor,
  encodePolicyCursor,
} from "./policy-review-store.js";
import type { AdminStore } from "./types.js";
import { AdminQueryError } from "./types.js";

const scopedIdentity = {
  email: "owner@example.test",
  role: "OWNER" as const,
  pageScope: ["page-1", "page-2"] as const,
  subject: "owner-1",
};

async function revisionThroughStore(value: unknown): Promise<unknown> {
  const base = {
    async getArtifactVersion() {
      return {
        version_id: "018f1b72-0000-7000-8000-000000000001",
        revision: value,
      };
    },
    async close() {},
  } as unknown as AdminStore;
  const store = createPolicyReviewStore(
    base,
    "postgresql://lana:lana@127.0.0.1:5432/lana_policy_review_test",
  );
  try {
    const row = await store.getArtifactVersion(
      scopedIdentity,
      "018f1b72-0000-7000-8000-000000000001",
    );
    return row?.revision;
  } finally {
    await store.close();
  }
}

describe("policy review list query", () => {
  it("keeps search parameterized with a valid one-character escape", () => {
    const built = buildPolicyArtifactListQuery(scopedIdentity, {
      limit: 50,
      search: "SQ%_!603",
      active: "active",
      sort: "artifact_key_asc",
    });
    assert.match(built.sql, /artifact_key ILIKE/u);
    assert.match(built.sql, /ESCAPE '!'/u);
    assert.match(built.sql, /p\.page_id = ANY\(/u);
    assert.match(built.sql, /ORDER BY v\.artifact_key ASC, v\.version_id ASC/u);
    assert.ok(built.values.includes("%SQ!%!_!!603%"));
  });

  it("uses deterministic version-id tie breakers for every sort mode", () => {
    assert.match(
      buildPolicyArtifactListQuery(scopedIdentity, { limit: 50, sort: "updated_desc" }).sql,
      /ORDER BY v\.updated_at DESC, v\.version_id DESC/u,
    );
    assert.match(
      buildPolicyArtifactListQuery(scopedIdentity, {
        limit: 50,
        lifecycle: "VALIDATED",
        sort: "validated_oldest",
      }).sql,
      /ORDER BY v\.validated_at ASC NULLS LAST, v\.version_id ASC/u,
    );
  });

  it("filters exact version and revision with parameters and hides tombstones", () => {
    const built = buildPolicyArtifactListQuery(scopedIdentity, {
      limit: 50,
      version: 3,
      revision: 9,
      sort: "updated_desc",
    });
    assert.match(built.sql, /v\.version_number = \$\d+/u);
    assert.match(built.sql, /v\.revision = \$\d+::bigint/u);
    assert.match(built.sql, /NOT EXISTS[\s\S]*admin_artifact_deletions/u);
    assert.ok(built.values.includes(3));
    assert.ok(built.values.includes(9));
  });

  it("continues duplicate artifact keys with the version-id cursor tie breaker", () => {
    const cursor = encodePolicyCursor({
      sort: "artifact_key_asc",
      value: "size-chart:SQ603",
      id: "018f1b72-0000-7000-8000-000000000010",
    });
    const built = buildPolicyArtifactListQuery(scopedIdentity, {
      limit: 50,
      sort: "artifact_key_asc",
      cursor,
    });
    assert.match(built.sql, /v\.artifact_key > \$\d+ OR \(v\.artifact_key = \$\d+ AND v\.version_id::text > \$\d+\)/u);
  });

  it("rejects validated-oldest outside the validated queue", () => {
    assert.throws(
      () => buildPolicyArtifactListQuery(scopedIdentity, {
        limit: 50,
        lifecycle: "DRAFT",
        sort: "validated_oldest",
      }),
      (error) => error instanceof AdminQueryError && error.code === "ADMIN_POLICY_SORT_INVALID",
    );
  });
});

describe("policy review cursor", () => {
  it("round-trips sort, primary value and version-id tie breaker", () => {
    const cursor = {
      sort: "updated_desc" as const,
      value: "2026-08-08T01:02:03.000Z",
      id: "018f1b72-0000-7000-8000-000000000001",
    };
    assert.deepEqual(decodePolicyCursor(encodePolicyCursor(cursor), "updated_desc"), cursor);
  });

  it("rejects a cursor reused with another sort mode", () => {
    const cursor = encodePolicyCursor({
      sort: "artifact_key_asc",
      value: "size-chart:SQ603",
      id: "018f1b72-0000-7000-8000-000000000001",
    });
    assert.throws(
      () => decodePolicyCursor(cursor, "updated_desc"),
      (error) => error instanceof AdminQueryError && error.code === "ADMIN_POLICY_CURSOR_INVALID",
    );
  });
});

describe("policy review PostgreSQL bigint revision normalization", () => {
  it("accepts a safe integer number", async () => {
    assert.equal(await revisionThroughStore(7), 7);
  });

  it("accepts a canonical decimal string", async () => {
    assert.equal(await revisionThroughStore("42"), 42);
  });

  it("fails closed for malformed and out-of-safe-range revisions", async () => {
    await assert.rejects(
      () => revisionThroughStore("not-a-revision"),
      /Invalid PostgreSQL revision value/u,
    );
    await assert.rejects(
      () => revisionThroughStore("9007199254740992"),
      /Invalid PostgreSQL revision value/u,
    );
    await assert.rejects(
      () => revisionThroughStore(Number.MAX_SAFE_INTEGER + 1),
      /Invalid PostgreSQL revision value/u,
    );
  });
});
