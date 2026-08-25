export function assertDf13FirstPreprodComposeContract(compose) {
  const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const mappingBlock = (source, key, indent, code) => {
    const lines = source.split(/\r?\n/u);
    const header = `${" ".repeat(indent)}${key}:`;
    const start = lines.findIndex((line) => line === header);
    if (start < 0) throw new Error(code);

    const end = lines.findIndex((line, index) => {
      if (index <= start || !line.trim() || line.trimStart().startsWith("#")) return false;
      const leading = line.length - line.trimStart().length;
      return leading <= indent;
    });
    return lines.slice(start + 1, end < 0 ? lines.length : end).join("\n");
  };
  const requireExactLine = (block, indent, text, code) => {
    const pattern = new RegExp(`^ {${indent}}${escapeRegExp(text)}\\s*$`, "mu");
    if (!pattern.test(block)) throw new Error(code);
  };

  const services = mappingBlock(compose, "services", 0, "DF13_COMPOSE_SERVICES_MISSING");
  const realtimeWorker = mappingBlock(services, "realtime-worker", 2, "DF13_REALTIME_WORKER_SERVICE_MISSING");
  const environment = mappingBlock(realtimeWorker, "environment", 4, "DF13_REALTIME_WORKER_ENVIRONMENT_MISSING");
  const volumes = mappingBlock(realtimeWorker, "volumes", 4, "DF13_REALTIME_WORKER_VOLUMES_MISSING");

  // A normal release must remain exact LEGACY even when the optional DF13
  // startup package is absent. A separately prepared, read-only package is
  // the sole input that can let a fresh COMMERCE process start.
  requireExactLine(
    environment,
    6,
    'DF13_COMMERCE_PREPROD_STARTUP_MODE: "${DF13_COMMERCE_PREPROD_STARTUP_MODE:-LEGACY}"',
    "DF13_COMMERCE_STARTUP_MODE_DEFAULT_OFF_MISSING",
  );
  requireExactLine(
    environment,
    6,
    "DF13_COMMERCE_PREPROD_STARTUP_FILE: /run/df13/commerce-startup.json",
    "DF13_COMMERCE_STARTUP_FILE_PATH_MISSING",
  );
  requireExactLine(
    volumes,
    6,
    "- ${DF13_COMMERCE_PREPROD_STARTUP_HOST_FILE:-/dev/null}:/run/df13/commerce-startup.json:ro",
    "DF13_COMMERCE_STARTUP_PACKAGE_READONLY_MOUNT_MISSING",
  );
}
