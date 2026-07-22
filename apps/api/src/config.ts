import { readFileSync } from "node:fs";
import type { GatewayRoutingMode } from "@lana/meta-webhook";
import type { ApiConfig } from "./app.js";

function secretValue(
  environment: NodeJS.ProcessEnv,
  directName: string,
  fileName: string,
): string {
  const direct = environment[directName]?.trim();
  if (direct) return direct;
  const path = environment[fileName]?.trim();
  if (!path) return "";
  return readFileSync(path, "utf8").trim();
}

function routingMode(value: string | undefined): GatewayRoutingMode {
  const normalized = value?.trim().toUpperCase();
  if (normalized === undefined || normalized === "SHADOW") return "SHADOW";
  if (normalized === "N8N" || normalized === "APP") return normalized;
  throw new Error("GATEWAY_ROUTING_MODE must be SHADOW, N8N, or APP");
}

export function configFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ApiConfig {
  const metaAppSecret = secretValue(environment, "META_APP_SECRET", "META_APP_SECRET_FILE");
  const metaVerifyToken = secretValue(environment, "META_VERIFY_TOKEN", "META_VERIFY_TOKEN_FILE");
  const identityHashSalt = secretValue(
    environment,
    "ANALYTICS_HASH_SALT",
    "ANALYTICS_HASH_SALT_FILE",
  );
  const shadowMirrorKey = secretValue(
    environment,
    "SHADOW_MIRROR_KEY",
    "SHADOW_MIRROR_KEY_FILE",
  );
  const shadowEvaluationReadKey = secretValue(
    environment,
    "SHADOW_EVALUATION_READ_KEY",
    "SHADOW_EVALUATION_READ_KEY_FILE",
  );
  const catalogMirrorKey = secretValue(
    environment,
    "CATALOG_MIRROR_KEY",
    "CATALOG_MIRROR_KEY_FILE",
  );
  const businessFactReadKey = secretValue(
    environment,
    "BUSINESS_FACT_READ_KEY",
    "BUSINESS_FACT_READ_KEY_FILE",
  );
  const allowedPageIds = new Set(
    (environment.META_ALLOWED_PAGE_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return {
    metaAppSecret,
    metaVerifyToken,
    identityHashSalt,
    allowedPageIds,
    metaAppId: environment.META_APP_ID?.trim() ?? "",
    shadowMirrorKey,
    shadowEvaluationReadKey,
    catalogMirrorKey,
    businessFactReadKey,
    routingMode: routingMode(
      environment.GATEWAY_ROUTING_MODE ?? environment.ROUTING_MODE,
    ),
    realtimeMirrorEnabled:
      (environment.REALTIME_MIRROR_ENABLED ?? "false")
        .trim()
        .toLowerCase() === "true",
    upsaleSuppressionEnabled:
      (environment.UPSALE_SUPPRESSION_ENABLED ?? "false")
        .trim()
        .toLowerCase() === "true",
  };
}
