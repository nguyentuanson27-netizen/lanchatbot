import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

process.env.NODE_ENV = "test";
const testRoot = await mkdtemp(join(tmpdir(), "lana-mcp-repository-"));
const releasesRoot = join(testRoot, "releases");
const pointerFile = join(testRoot, "current.json");
const releaseA = join(releasesRoot, "release-a");
const releaseB = join(releasesRoot, "release-b");
await mkdir(join(releaseA, "docs", "current"), { recursive: true });
await mkdir(join(releaseA, "apps", "worker"), { recursive: true });
await writeFile(join(releaseA, "README.md"), "# Lana\nProduction baseline link.\n");
await writeFile(join(releaseA, "AGENTS.md"), "Read README before work.\n");
await writeFile(join(releaseA, "docs", "current", "BASELINE.md"), "Current production baseline.\n");
await writeFile(join(releaseA, "apps", "worker", "index.ts"), "export const release = 'current';\n");
await writeFile(join(releaseA, ".env"), "REAL_SECRET=blocked\n");
await writeFile(join(releaseA, "large.txt"), "x".repeat(250_000));
await mkdir(join(releaseB, "docs", "current"), { recursive: true });
await writeFile(join(releaseB, "README.md"), "# Lana v2\nr31.3 live.\n");
await writeFile(join(releaseB, "AGENTS.md"), "Read current release.\n");
await writeFile(join(releaseB, "docs", "current", "R31_STATUS.md"), "DEPLOYED_VERIFIED_R31_3\n");

async function writePointer(
  release,
  sourceCommit,
  sourceRef = release,
) {
  await writeFile(
    pointerFile,
    JSON.stringify({
      release,
      source_commit: sourceCommit,
      source_ref: sourceRef,
      updated_at: "2026-07-31T00:00:00Z",
    }),
  );
}

await writePointer("release-a", "a".repeat(40), "test-release");
process.env.LANA_MCP_REPOSITORY_ROOT = releaseA;
process.env.LANA_MCP_REPOSITORY_RELEASES_ROOT = releasesRoot;
process.env.LANA_MCP_REPOSITORY_POINTER_FILE = pointerFile;
process.env.LANA_MCP_SOURCE_COMMIT = "embedded";
process.env.LANA_MCP_SOURCE_REF = "embedded";
const {
  TOOLS,
  ensureSlash,
  forwardedOriginHeaders,
  isAllowedRedirect,
  normalizeRepositoryPath,
  parseScopes,
  publicTool,
  repositoryContext,
  repositoryListFiles,
  repositoryReadFile,
  repositorySearchText,
  trimSlash,
} = await import("./server.mjs");
after(() => rm(testRoot, { recursive: true, force: true }));

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
  assert.equal(listed.source_commit, "a".repeat(40));
  assert.equal(listed.source_ref, "test-release");
  assert.equal(listed.source_release, "release-a");
  assert.equal(listed.source_mode, "current_release_pointer");
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

test("repository pointer switches the current release without restart", async () => {
  await writePointer("release-b", "b".repeat(40), "r31.3");
  const context = await repositoryContext();
  assert.equal(context.source_release, "release-b");
  assert.equal(context.source_commit, "b".repeat(40));
  const read = await repositoryReadFile({ path: "README.md", max_lines: 2 });
  assert.equal(read.source_ref, "r31.3");
  assert.equal(read.content, "# Lana v2\nr31.3 live.");
  await writePointer("release-a", "a".repeat(40), "test-release");
});

test("repository pointer fails closed for an invalid release", async () => {
  await writePointer("../outside", "c".repeat(40), "outside");
  await assert.rejects(repositoryContext(), /POINTER_RELEASE_INVALID/);
  await writePointer("release-a", "a".repeat(40), "test-release");
});

test("repository reader blocks traversal and environment secrets", async () => {
  assert.throws(() => normalizeRepositoryPath("../README.md"), /TRAVERSAL/);
  await assert.rejects(repositoryReadFile({ path: ".env" }), /FILE_TYPE_BLOCKED/);
  await assert.rejects(repositoryReadFile({ path: "C:\\secret.txt" }), /PATH_INVALID/);
});
