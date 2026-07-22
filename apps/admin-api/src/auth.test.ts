import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InternalAssertionAuthenticator } from "./auth.js";

const now = Date.parse("2026-07-16T12:00:00.000Z");
const nowSeconds = Math.floor(now / 1000);
const issuer = "lana-admin-web";
const owner = "nguyentuanson27@gmail.com";
const secret = "test-secret-with-at-least-thirty-two-bytes";

function assertion(overrides: Record<string, unknown> = {}) {
  const payload = Buffer.from(JSON.stringify({
    iss: issuer,
    email: owner,
    sub: "authentik-user-1",
    iat: nowSeconds - 1,
    exp: nowSeconds + 29,
    ...overrides,
  })).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function authenticator() {
  return new InternalAssertionAuthenticator(
    {
      secret,
      issuer,
      ownerEmails: new Set([owner]),
      pageScope: "ALL",
    },
    () => now,
  );
}

describe("internal admin assertion authentication", () => {
  it("verifies HMAC, lifetime, issuer and owner allow-list", async () => {
    assert.deepEqual(await authenticator().authenticate(assertion()), {
      email: owner,
      role: "OWNER",
      pageScope: "ALL",
      subject: "authentik-user-1",
    });
  });

  it("rejects a signed assertion for a non-allow-listed email", async () => {
    await assert.rejects(
      () => authenticator().authenticate(assertion({ email: "other@example.com" })),
      (error: unknown) => error instanceof Error && "code" in error && error.code === "ADMIN_ACCESS_DENIED",
    );
  });

  it("assigns the bounded editor, approver and viewer roles", async () => {
    const roleAuth = new InternalAssertionAuthenticator({
      secret,
      issuer,
      ownerEmails: new Set([owner]),
      editorEmails: new Set(["editor@example.com"]),
      approverEmails: new Set(["approver@example.com"]),
      viewerEmails: new Set(["viewer@example.com"]),
      pageScope: "ALL",
    }, () => now);
    assert.equal((await roleAuth.authenticate(assertion({ email: "editor@example.com" }))).role, "EDITOR");
    assert.equal((await roleAuth.authenticate(assertion({ email: "approver@example.com" }))).role, "APPROVER");
    assert.equal((await roleAuth.authenticate(assertion({ email: "viewer@example.com" }))).role, "VIEWER");
  });

  it("rejects expired, overlong, wrong-issuer and tampered assertions", async () => {
    const invalid = (error: unknown) => error instanceof Error && "code" in error && error.code === "ADMIN_TOKEN_INVALID";
    await assert.rejects(() => authenticator().authenticate(assertion({ exp: nowSeconds - 60 })), invalid);
    await assert.rejects(() => authenticator().authenticate(assertion({ iat: nowSeconds - 100, exp: nowSeconds + 1 })), invalid);
    await assert.rejects(() => authenticator().authenticate(assertion({ iss: "wrong" })), invalid);
    const [payload, signature] = assertion().split(".");
    const tampered = Buffer.from(JSON.stringify({
      iss: issuer,
      email: "attacker@example.com",
      sub: "authentik-user-1",
      iat: nowSeconds,
      exp: nowSeconds + 30,
    })).toString("base64url");
    await assert.rejects(() => authenticator().authenticate(`${tampered}.${signature}`), invalid);
    assert.ok(payload);
  });

  it("is ready only with a strong shared secret", async () => {
    assert.equal(await authenticator().ready(), true);
    assert.equal(await new InternalAssertionAuthenticator({
      secret: "short",
      issuer,
      ownerEmails: new Set([owner]),
      pageScope: "ALL",
    }).ready(), false);
  });
});
