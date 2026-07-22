import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  createInternalAssertion,
  identityFromAuthentikHeaders,
  loadAdminAuthConfig,
} from "./auth.mjs";

const owner = "nguyentuanson27@gmail.com";
const secret = "test-secret-with-at-least-thirty-two-bytes";

describe("Authentik to admin API bridge", () => {
  it("accepts only the configured owner and signs a 30 second assertion", () => {
    const identity = identityFromAuthentikHeaders({
      "x-authentik-email": owner.toUpperCase(),
      "x-authentik-uid": "authentik-user-1",
    }, new Set([owner]));
    assert.deepEqual(identity, { email: owner, subject: "authentik-user-1" });
    const assertion = createInternalAssertion(identity, {
      issuer: "lana-admin-web",
      secret,
    }, Date.parse("2026-07-16T12:00:00.000Z"));
    const [payload, signature] = assertion.split(".");
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    assert.equal(claims.exp - claims.iat, 30);
    assert.equal(signature, createHmac("sha256", secret).update(payload).digest("base64url"));
  });

  it("rejects missing identity and every email outside the allow-list", () => {
    assert.equal(identityFromAuthentikHeaders({}, new Set([owner])), null);
    assert.equal(identityFromAuthentikHeaders({
      "x-authentik-email": "other@example.com",
      "x-authentik-uid": "user-2",
    }, new Set([owner])), null);
  });

  it("requires a strong internal secret", () => {
    assert.throws(() => loadAdminAuthConfig({
      ADMIN_INTERNAL_AUTH_SECRET: "short",
      ADMIN_OWNER_EMAILS: owner,
    }), /ADMIN_WEB_AUTH_CONFIGURATION_INCOMPLETE/);
  });

  it("passes configured editor, approver and viewer identities to the API", () => {
    const config = loadAdminAuthConfig({
      ADMIN_INTERNAL_AUTH_SECRET: secret,
      ADMIN_OWNER_EMAILS: owner,
      ADMIN_EDITOR_EMAILS: "editor@example.com",
      ADMIN_APPROVER_EMAILS: "approver@example.com",
      ADMIN_VIEWER_EMAILS: "viewer@example.com",
    });
    for (const email of ["editor@example.com", "approver@example.com", "viewer@example.com"]) {
      assert.equal(identityFromAuthentikHeaders({
        "x-authentik-email": email,
        "x-authentik-uid": `uid-${email}`,
      }, config.allowedEmails)?.email, email);
    }
  });
});
