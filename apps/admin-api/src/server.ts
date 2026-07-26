import { createAdminApi } from "./app.js";
import { InternalAssertionAuthenticator } from "./auth.js";
import { adminConfigFromEnvironment } from "./config.js";
import { PostgresAdminStore } from "./store.js";
import { LocalEnvelopeCipher } from "@lana/database";
import { createProductMediaService } from "./product-media.js";
import { createDatasetReviewService } from "./dataset-review-service.js";

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
// Dataset-review module is off unless flagged on AND an envelope cipher exists
// (its stores require one to construct, even though this read path never
// decrypts). Migration/import into any database is out of scope here.
const datasetReview = config.datasetReviewEnabled && identityCipher
  ? createDatasetReviewService({
      databaseUrl: config.databaseUrl,
      writeDatabaseUrl: config.controlDatabaseUrl,
      cipher: identityCipher,
      blindReviewEnabled: config.datasetBlindReviewEnabled,
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
  datasetAiPrelabelEnabled: config.datasetAiPrelabelEnabled,
  datasetBlindReviewEnabled: config.datasetBlindReviewEnabled,
  datasetExportEnabled: config.datasetExportEnabled,
  ...(productMedia ? { productMedia } : {}),
  ...(datasetReview ? { datasetReview } : {}),
});

await app.listen({ host: "0.0.0.0", port: config.port });

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void (async () => {
      await app.close();
      await store.close();
      if (datasetReview) await datasetReview.close();
      process.exit(0);
    })();
  });
}
