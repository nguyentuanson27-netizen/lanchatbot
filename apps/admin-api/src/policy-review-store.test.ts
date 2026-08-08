import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPolicyArtifactListQuery,
  decodePolicyCursor,
  encodePolicyCursor,
} from "./policy-review-store.js";
import { AdminQueryError } from "./types.js";

const scopedIdentity = {
  email: "owner@example.test",
  role: "OWNER" as const,
  pageScope: ["page-1", "page-2"] as const,
  subject: "owner-1",
};

describe("policy review list query", () => {
  it("keeps search parameterized, escapes LIKE wildcards, and scopes active pointers", () => {
    const built = buildPolicyArtifactListQuery(scopedIdentity, {
      limit: 50,
      search: "SQ%_603",
      active: "active",
      sort: "artifact_key_asc",
    });

    assert.match(built.sql, /artifact_key ILIKE/u);
    assert.match(built.sql, /ESCAPE '\\\\'/u);
    assert.match(built.sql, /p\.page_id = ANY\(/u);
    assert.match(built.sql, /ORDER BY v\.artifact_key ASC, v\.version_id ASC/u);
    assert.ok(built.values.includes("%SQ\\%\\_603%"));
    assert.ok(built.values.some((value) => Array.isArray(value) && value.join(",") === "page-1,page-2"));
  });

  it("uses deterministic version-id tie breakers for every sort mode", () => {
    const updated = buildPolicyArtifactListQuery(scopedIdentity, {
      limit: 50,
      sort: "updated_desc",
    });
    assert.match(updated.sql, /ORDER BY v\.updated_at DESC, v\.version_id DESC/u);

    const validated = buildPolicyArtifactListQuery(scopedIdentity, {
      limit: 50,
      lifecycle: "VALIDATED",
      sort: "validated_oldest",
    });
    assert.match(validated.sql, /ORDER BY v\.validated_at ASC NULLS LAST, v\.version_id ASC/u);
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
    assert.ok(built.values.includes("size-chart:SQ603"));
    assert.ok(built.values.includes("018f1b72-0000-7000-8000-000000000010"));
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

  it("rejects a missing primary value for artifact-key sorting", () => {
    const cursor = encodePolicyCursor({
      sort: "artifact_key_asc",
      value: null,
      id: "018f1b72-0000-7000-8000-000000000001",
    });
    assert.throws(
      () => decodePolicyCursor(cursor, "artifact_key_asc"),
      (error) => error instanceof AdminQueryError && error.code === "ADMIN_POLICY_CURSOR_INVALID",
    );
  });
});
