import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NODE_ENV = "test";
const {
  TOOLS,
  ensureSlash,
  forwardedOriginHeaders,
  isAllowedRedirect,
  parseScopes,
  publicTool,
  trimSlash,
} = await import("./server.mjs");

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
  assert.equal(TOOLS.length, 10);
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
