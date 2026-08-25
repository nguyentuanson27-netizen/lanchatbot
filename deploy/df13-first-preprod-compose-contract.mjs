export function assertDf13FirstPreprodComposeContract(compose) {
  const requireText = (pattern, code) => {
    if (!pattern.test(compose)) throw new Error(code);
  };

  // A normal release must remain exact LEGACY even when the optional DF13
  // startup package is absent. A separately prepared, read-only package is
  // the sole input that can let a fresh COMMERCE process start.
  requireText(
    /DF13_COMMERCE_PREPROD_STARTUP_MODE:\s*"\$\{DF13_COMMERCE_PREPROD_STARTUP_MODE:-LEGACY\}"/u,
    "DF13_COMMERCE_STARTUP_MODE_DEFAULT_OFF_MISSING",
  );
  requireText(
    /DF13_COMMERCE_PREPROD_STARTUP_FILE:\s*\/run\/df13\/commerce-startup\.json/u,
    "DF13_COMMERCE_STARTUP_FILE_PATH_MISSING",
  );
  requireText(
    /\$\{DF13_COMMERCE_PREPROD_STARTUP_HOST_FILE:-\/dev\/null\}:\/run\/df13\/commerce-startup\.json:ro/u,
    "DF13_COMMERCE_STARTUP_PACKAGE_READONLY_MOUNT_MISSING",
  );
}
