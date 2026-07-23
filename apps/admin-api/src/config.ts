import { readFileSync } from "node:fs";

export interface AdminApiConfig {
  readonly databaseUrl: string;
  readonly controlDatabaseUrl: string;
  readonly internalAuthSecret: string;
  readonly realtimeDataKey: string;
  readonly realtimeDataKeyRef: string;
  readonly assertionIssuer: string;
  readonly ownerEmails: ReadonlySet<string>;
  readonly editorEmails: ReadonlySet<string>;
  readonly approverEmails: ReadonlySet<string>;
  readonly viewerEmails: ReadonlySet<string>;
  readonly pageScope: "ALL" | readonly string[];
  readonly allowedOrigin: string;
  readonly controlEnabled: boolean;
  readonly historyEnabled: boolean;
  readonly controlPageIds: "ALL" | readonly string[];
  readonly policyControlEnabled: boolean;
  readonly policyPageIds: "ALL" | readonly string[];
  readonly policyCanaryLiveEnabled: boolean;
  readonly policyPublishEnabled: boolean;
  readonly productMediaEnabled: boolean;
  readonly productMediaDirectory: string;
  readonly productMediaPublicBaseUrl: string;
  readonly productMediaMaxBytes: number;
  readonly productMediaSheetId: string;
  readonly googleSheetsCredential: string;
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
  const emailSet = (name: string) => new Set(
    (environment[name] ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  const editorEmails = emailSet("ADMIN_EDITOR_EMAILS");
  const approverEmails = emailSet("ADMIN_APPROVER_EMAILS");
  const viewerEmails = emailSet("ADMIN_VIEWER_EMAILS");
  const rawScope = (environment.ADMIN_PAGE_IDS ?? "1198992073286645").trim();
  const pageScope = rawScope.toUpperCase() === "ALL"
    ? "ALL"
    : rawScope.split(",").map((value) => value.trim()).filter(Boolean);
  const rawControlScope = (environment.ADMIN_CONTROL_PAGE_IDS ?? "").trim();
  const controlPageIds = rawControlScope.toUpperCase() === "ALL"
    ? "ALL" as const
    : rawControlScope.split(",").map((value) => value.trim()).filter(Boolean);
  const rawPolicyScope = (environment.ADMIN_POLICY_PAGE_IDS ?? "1198992073286645").trim();
  const policyPageIds = rawPolicyScope.toUpperCase() === "ALL"
    ? "ALL" as const
    : rawPolicyScope.split(",").map((value) => value.trim()).filter(Boolean);
  const port = Number(environment.PORT ?? "8081");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("ADMIN_PORT_INVALID");
  }
  const productMediaMaxBytes = Number(environment.ADMIN_PRODUCT_MEDIA_MAX_BYTES ?? "8388608");
  if (!Number.isInteger(productMediaMaxBytes) || productMediaMaxBytes < 1_048_576 || productMediaMaxBytes > 20_971_520) {
    throw new Error("ADMIN_PRODUCT_MEDIA_MAX_BYTES_INVALID");
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
    editorEmails,
    approverEmails,
    viewerEmails,
    pageScope,
    allowedOrigin: environment.ADMIN_ALLOWED_ORIGIN?.trim() ?? "",
    controlEnabled: environment.ADMIN_CONTROL_ENABLED?.trim().toLowerCase() === "true",
    historyEnabled: environment.ADMIN_HISTORY_ENABLED?.trim().toLowerCase() === "true",
    controlPageIds,
    policyControlEnabled: environment.ADMIN_POLICY_CONTROL_ENABLED?.trim().toLowerCase() === "true",
    policyPageIds,
    policyCanaryLiveEnabled: environment.ADMIN_POLICY_CANARY_LIVE_ENABLED?.trim().toLowerCase() === "true",
    policyPublishEnabled: environment.ADMIN_POLICY_PUBLISH_ENABLED?.trim().toLowerCase() === "true",
    productMediaEnabled: environment.ADMIN_PRODUCT_MEDIA_ENABLED?.trim().toLowerCase() === "true",
    productMediaDirectory: environment.ADMIN_PRODUCT_MEDIA_DIR?.trim() || "/var/lib/lana/product-media",
    productMediaPublicBaseUrl: environment.ADMIN_PRODUCT_MEDIA_PUBLIC_BASE_URL?.trim()
      || "https://admin.lanadesign.vn/lana-public/products",
    productMediaMaxBytes,
    productMediaSheetId: environment.DATA_INGESTION_V2_SHEET_ID?.trim() || "",
    googleSheetsCredential: valueOrFile(
      environment,
      "GOOGLE_SHEETS_CREDENTIAL",
      "GOOGLE_SHEETS_CREDENTIAL_FILE",
    ),
    port,
  };
}
