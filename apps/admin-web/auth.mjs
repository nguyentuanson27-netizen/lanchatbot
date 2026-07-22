import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

export function loadAdminAuthConfig(environment = process.env) {
  const direct = environment.ADMIN_INTERNAL_AUTH_SECRET?.trim();
  const secretFile = environment.ADMIN_INTERNAL_AUTH_SECRET_FILE?.trim();
  const secret = direct || (secretFile ? readFileSync(secretFile, "utf8").trim() : "");
  const ownerEmails = new Set(
    (environment.ADMIN_OWNER_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  const roleEmails = ["ADMIN_EDITOR_EMAILS", "ADMIN_APPROVER_EMAILS", "ADMIN_VIEWER_EMAILS"]
    .flatMap((name) => (environment[name] ?? "").split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedEmails = new Set([...ownerEmails, ...roleEmails]);
  const issuer = environment.ADMIN_ASSERTION_ISSUER?.trim() || "lana-admin-web";
  if (Buffer.byteLength(secret, "utf8") < 32 || ownerEmails.size === 0 || !issuer) {
    throw new Error("ADMIN_WEB_AUTH_CONFIGURATION_INCOMPLETE");
  }
  return { issuer, ownerEmails, allowedEmails, secret };
}

export function identityFromAuthentikHeaders(headers, ownerEmails) {
  const email = singleHeader(headers["x-authentik-email"])?.trim().toLowerCase();
  const subject = singleHeader(headers["x-authentik-uid"])?.trim();
  if (!email || !subject) return null;
  if (!ownerEmails.has(email)) return null;
  if (subject.length > 256) return null;
  return { email, subject };
}

export function createInternalAssertion(identity, config, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: config.issuer,
    email: identity.email,
    sub: identity.subject,
    iat,
    exp: iat + 30,
  })).toString("base64url");
  const signature = createHmac("sha256", config.secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function singleHeader(value) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
}
