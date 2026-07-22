import { createHmac, timingSafeEqual } from "node:crypto";
import {
  AdminAuthError,
  type AdminAuthenticator,
  type AdminIdentity,
} from "./types.js";

interface InternalAssertionClaims {
  readonly email?: unknown;
  readonly exp?: unknown;
  readonly iat?: unknown;
  readonly iss?: unknown;
  readonly sub?: unknown;
}

export interface InternalAssertionConfig {
  readonly secret: string;
  readonly issuer: string;
  readonly ownerEmails: ReadonlySet<string>;
  readonly pageScope: "ALL" | readonly string[];
  readonly clockToleranceSeconds?: number;
  readonly maximumLifetimeSeconds?: number;
}

export class InternalAssertionAuthenticator implements AdminAuthenticator {
  constructor(
    private readonly config: InternalAssertionConfig,
    private readonly now: () => number = Date.now,
  ) {}

  async authenticate(assertion: string | undefined): Promise<AdminIdentity> {
    if (!assertion) throw new AdminAuthError("ADMIN_AUTH_REQUIRED");
    const parts = assertion.split(".");
    if (parts.length !== 2) throw new AdminAuthError("ADMIN_TOKEN_INVALID");
    const [encodedPayload, encodedSignature] = parts;
    if (!encodedPayload || !encodedSignature) {
      throw new AdminAuthError("ADMIN_TOKEN_INVALID");
    }

    const expected = createHmac("sha256", this.config.secret)
      .update(encodedPayload)
      .digest();
    let received: Buffer;
    try {
      received = Buffer.from(encodedSignature, "base64url");
    } catch {
      throw new AdminAuthError("ADMIN_TOKEN_INVALID");
    }
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new AdminAuthError("ADMIN_TOKEN_INVALID");
    }

    const claims = decodeJson<InternalAssertionClaims>(encodedPayload);
    const nowSeconds = Math.floor(this.now() / 1000);
    const tolerance = this.config.clockToleranceSeconds ?? 5;
    const maximumLifetime = this.config.maximumLifetimeSeconds ?? 30;
    if (
      claims.iss !== this.config.issuer ||
      typeof claims.iat !== "number" ||
      typeof claims.exp !== "number" ||
      claims.iat > nowSeconds + tolerance ||
      claims.exp < nowSeconds - tolerance ||
      claims.exp <= claims.iat ||
      claims.exp - claims.iat > maximumLifetime ||
      typeof claims.email !== "string" ||
      typeof claims.sub !== "string" ||
      claims.sub.length < 1 ||
      claims.sub.length > 256
    ) {
      throw new AdminAuthError("ADMIN_TOKEN_INVALID");
    }

    const email = claims.email.trim().toLowerCase();
    if (!this.config.ownerEmails.has(email)) {
      throw new AdminAuthError("ADMIN_ACCESS_DENIED");
    }
    return {
      email,
      role: "OWNER",
      pageScope: this.config.pageScope,
      subject: claims.sub,
    };
  }

  async ready(): Promise<boolean> {
    return (
      Buffer.byteLength(this.config.secret, "utf8") >= 32 &&
      this.config.issuer.length > 0 &&
      this.config.ownerEmails.size > 0
    );
  }
}

function decodeJson<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    throw new AdminAuthError("ADMIN_TOKEN_INVALID");
  }
}
