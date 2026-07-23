import { createAdminApi } from "./app.js";
import { InternalAssertionAuthenticator } from "./auth.js";
import { adminConfigFromEnvironment } from "./config.js";
import { PostgresAdminStore } from "./store.js";
import { LocalEnvelopeCipher } from "@lana/database";
import { createProductMediaService } from "./product-media.js";

const config = adminConfigFromEnvironment();
if (
  !config.databaseUrl ||
  !config.internalAuthSecret ||
  config.ownerEmails.size === 0
) {
  throw new Error("ADMIN_CONFIGURATION_INCOMPLETE");
}
if (config.controlEnabled && !config.controlDatabaseUrl) {
  throw new Error("ADMIN_CONTROL_DATABASE_URL_REQUIRED");
}

const identityCipher = config.realtimeDataKey
  ? new LocalEnvelopeCipher(config.realtimeDataKey, config.realtimeDataKeyRef)
  : undefined;
const store = new PostgresAdminStore(
  config.databaseUrl,
  config.controlDatabaseUrl,
  identityCipher,
);
const authenticator = new InternalAssertionAuthenticator(
  {
    secret: config.internalAuthSecret,
    issuer: config.assertionIssuer,
    ownerEmails: config.ownerEmails,
    editorEmails: config.editorEmails,
    approverEmails: config.approverEmails,
    viewerEmails: config.viewerEmails,
    pageScope: config.pageScope,
  },
);
const productMedia = config.productMediaEnabled
  ? createProductMediaService({
      directory: config.productMediaDirectory,
      originalDirectory: config.productMediaOriginalDirectory,
      publicBaseUrl: config.productMediaPublicBaseUrl,
      maxBytes: config.productMediaMaxBytes,
      resizeMaxDimension: config.productMediaResizeMaxDimension,
      originalTtlMs: config.productMediaOriginalTtlMs,
      cleanupIntervalMs: config.productMediaCleanupIntervalMs,
      spreadsheetId: config.productMediaSheetId,
      credentialJson: config.googleSheetsCredential,
    })
  : undefined;
const app = createAdminApi({
  store,
  authenticator,
  allowedOrigin: config.allowedOrigin,
  controlEnabled: config.controlEnabled,
  historyEnabled: config.historyEnabled,
  controlPageIds: config.controlPageIds,
  policyControlEnabled: config.policyControlEnabled,
  policyPageIds: config.policyPageIds,
  policyCanaryLiveEnabled: config.policyCanaryLiveEnabled,
  policyPublishEnabled: config.policyPublishEnabled,
  ...(productMedia ? { productMedia } : {}),
});

await app.listen({ host: "0.0.0.0", port: config.port });

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void (async () => {
      await app.close();
      await store.close();
      process.exit(0);
    })();
  });
}
