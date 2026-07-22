import { readFileSync } from "node:fs";

export interface AdminApiConfig {
  readonly databaseUrl: string;
  readonly controlDatabaseUrl: string;
  readonly internalAuthSecret: string;
  readonly realtimeDataKey: string;
  readonly realtimeDataKeyRef: string;
  readonly assertionIssuer: string;
  readonly ownerEmails: ReadonlySet<string>;
  readonly pageScope: "ALL" | readonly string[];
  readonly allowedOrigin: string;
  readonly controlEnabled: boolean;
  readonly historyEnabled: boolean;
  readonly controlPageIds: "ALL" | readonly string[];
  readonly port: number;
}

function valueOrFile(
  environment: NodeJS.ProcessEnv,
  directName: string,
  fileName: string,
): string {
  const direct = environment[directName]?.trim();
  if (direct) return direct;
  const file = environment[fileName]?.trim();
  return file ? readFileSync(file, "utf8").trim() : "";
}

export function adminConfigFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): AdminApiConfig {
  const ownerEmails = new Set(
    (environment.ADMIN_OWNER_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  const rawScope = (environment.ADMIN_PAGE_IDS ?? "ALL").trim();
  const pageScope = rawScope.toUpperCase() === "ALL"
    ? "ALL"
    : rawScope.split(",").map((value) => value.trim()).filter(Boolean);
  const rawControlScope = (environment.ADMIN_CONTROL_PAGE_IDS ?? "").trim();
  const controlPageIds = rawControlScope.toUpperCase() === "ALL"
    ? "ALL" as const
    : rawControlScope.split(",").map((value) => value.trim()).filter(Boolean);
  const port = Number(environment.PORT ?? "8081");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("ADMIN_PORT_INVALID");
  }
  return {
    databaseUrl: valueOrFile(
      environment,
      "ADMIN_DATABASE_URL",
      "ADMIN_DATABASE_URL_FILE",
    ),
    controlDatabaseUrl: valueOrFile(
      environment,
      "ADMIN_CONTROL_DATABASE_URL",
      "ADMIN_CONTROL_DATABASE_URL_FILE",
    ),
    internalAuthSecret: valueOrFile(
      environment,
      "ADMIN_INTERNAL_AUTH_SECRET",
      "ADMIN_INTERNAL_AUTH_SECRET_FILE",
    ),
    realtimeDataKey: valueOrFile(
      environment,
      "REALTIME_DATA_KEY",
      "REALTIME_DATA_KEY_FILE",
    ),
    realtimeDataKeyRef: environment.REALTIME_DATA_KEY_REF?.trim() || "local-kek-v1",
    assertionIssuer: environment.ADMIN_ASSERTION_ISSUER?.trim() || "lana-admin-web",
    ownerEmails,
    pageScope,
    allowedOrigin: environment.ADMIN_ALLOWED_ORIGIN?.trim() ?? "",
    controlEnabled: environment.ADMIN_CONTROL_ENABLED?.trim().toLowerCase() === "true",
    historyEnabled: environment.ADMIN_HISTORY_ENABLED?.trim().toLowerCase() === "true",
    controlPageIds,
    port,
  };
}
