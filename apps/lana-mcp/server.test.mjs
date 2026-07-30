import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

process.env.NODE_ENV = "test";
const repositoryRoot = await mkdtemp(join(tmpdir(), "lana-mcp-repository-"));
await mkdir(join(repositoryRoot, "docs", "current"), { recursive: true });
await mkdir(join(repositoryRoot, "apps", "worker"), { recursive: true });
await writeFile(join(repositoryRoot, "README.md"), "# Lana\nProduction baseline link.\n");
await writeFile(join(repositoryRoot, "AGENTS.md"), "Read README before work.\n");
await writeFile(join(repositoryRoot, "docs", "current", "BASELINE.md"), "Current production baseline.\n");
await writeFile(join(repositoryRoot, "apps", "worker", "index.ts"), "export const release = 'current';\n");
await writeFile(join(repositoryRoot, ".env"), "REAL_SECRET=blocked\n");
await writeFile(join(repositoryRoot, "large.txt"), "x".repeat(250_000));
process.env.LANA_MCP_REPOSITORY_ROOT = repositoryRoot;
process.env.LANA_MCP_SOURCE_COMMIT = "abc123";
process.env.LANA_MCP_SOURCE_REF = "test-release";
const {
  TOOLS,
  ensureSlash,
  forwardedOriginHeaders,
  isAllowedRedirect,
  normalizeRepositoryPath,
  parseScopes,
  publicTool,
  repositoryListFiles,
  repositoryReadFile,
  repositorySearchText,
  trimSlash,
} = await import("./server.mjs");
after(() => rm(repositoryRoot, { recursive: true, force: true }));

test("canonical URL helpers keep issuer stable", () => {
  assert.equal(trimSlash("https://dev.example///"), "https://dev.example");
  assert.equal(ensureSlash("https://auth.example/app"), "https://auth.example/app/");
});

test("internal discovery preserves the public OAuth origin", () => {
  assert.deepEqual(
    forwardedOriginHeaders("https://auth.lanadesign.vn/application/o/lana/"),
    {
      host: "auth.lanadesign.vn",
      "x-forwarded-host": "auth.lanadesign.vn",
      "x-forwarded-proto": "https",
    },
  );
});

test("DCR accepts only ChatGPT connector callbacks", () => {
  assert.equal(
    isAllowedRedirect("https://chatgpt.com/connector/oauth/abcDEF_123456"),
    true,
  );
  assert.equal(
    isAllowedRedirect("https://chatgpt.com/connector_platform_oauth_redirect"),
    true,
  );
  assert.equal(isAllowedRedirect("https://evil.example/callback"), false);
  assert.equal(
    isAllowedRedirect("https://chatgpt.com.evil.example/connector/oauth/abc12345"),
    false,
  );
});

test("scope parser supports OAuth scope and scp claims", () => {
  const scopes = parseScopes({
    scope: "openid mcp:read",
    scp: ["mcp:write"],
  });
  assert.deepEqual(
    [...scopes].sort(),
    ["mcp:read", "mcp:write", "openid"].sort(),
  );
});

test("all remote tools advertise OAuth and safety annotations", () => {
  assert.equal(TOOLS.length, 13);
  for (const definition of TOOLS) {
    const exposed = publicTool(definition);
    assert.deepEqual(exposed.securitySchemes[0].type, "oauth2");
    assert.equal(typeof exposed.annotations.readOnlyHint, "boolean");
    assert.equal("operation" in exposed, false);
  }
  assert.equal(
    TOOLS.find((tool) => tool.name === "sheet_update_cells").annotations
      .readOnlyHint,
    false,
  );
});

test("repository tools use the existing read scope", () => {
  for (const name of [
    "repository_list_files",
    "repository_read_file",
    "repository_search_text",
  ]) {
    const definition = TOOLS.find((tool) => tool.name === name);
    assert.deepEqual(definition.scopes, ["mcp:read"]);
    assert.equal(definition.annotations.readOnlyHint, true);
  }
});

test("repository list, read, and literal search expose release text", async () => {
  const listed = await repositoryListFiles({ limit: 20 });
  assert.equal(listed.source_commit, "abc123");
  assert.ok(listed.files.includes("README.md"));
  assert.ok(listed.files.includes("docs/current/BASELINE.md"));
  assert.equal(listed.files.includes(".env"), false);

  const read = await repositoryReadFile({ path: "README.md", max_lines: 1 });
  assert.equal(read.content, "# Lana");
  assert.equal(read.truncated, true);

  const large = await repositoryReadFile({ path: "large.txt", max_lines: 1 });
  assert.equal(large.content.length, 200_000);
  assert.equal(large.truncated, true);

  const searched = await repositorySearchText({ query: "production baseline" });
  assert.deepEqual(
    searched.matches.map(({ path, line }) => ({ path, line })),
    [
      { path: "docs/current/BASELINE.md", line: 1 },
      { path: "README.md", line: 2 },
    ],
  );
});

test("repository reader blocks traversal and environment secrets", async () => {
  assert.throws(() => normalizeRepositoryPath("../README.md"), /TRAVERSAL/);
  await assert.rejects(repositoryReadFile({ path: ".env" }), /FILE_TYPE_BLOCKED/);
  await assert.rejects(repositoryReadFile({ path: "C:\\secret.txt" }), /PATH_INVALID/);
});
