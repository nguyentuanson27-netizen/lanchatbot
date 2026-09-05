const POSTGRES_CONTAINER = "lana-chatbot-postgres";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("TRACK_B_B3_2_DATABASE_ENDPOINT_UNPROVEN");
  }
  return value as Record<string, unknown>;
}

/**
 * Rebinds the Compose-only PostgreSQL hostname to the one inspected private
 * endpoint. Callers retain their credential and then apply their own role
 * restriction; no arbitrary host, socket, or query override is accepted.
 */
export function resolveTrackBPreprodDatabaseUrl(value: string, inspection: unknown): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error("TRACK_B_B3_2_DATABASE_CREDENTIAL_INVALID"); }
  const inspected = object(inspection);
  const state = object(inspected.State);
  const health = object(state.Health);
  const config = object(inspected.Config);
  const labels = object(config.Labels);
  const networkSettings = object(inspected.NetworkSettings);
  const networks = object(networkSettings.Networks);
  const networkEntries = Object.values(networks).map(object);
  const address = networkEntries.length === 1 ? networkEntries[0]?.IPAddress : null;
  const octets = typeof address === "string" && /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(address)
    ? address.split(".").map(Number) : [];
  const privateAddress = octets.length === 4 && octets.every((part) => part >= 0 && part <= 255) &&
    (octets[0] === 10 || (octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31) ||
      (octets[0] === 192 && octets[1] === 168));
  if (parsed.protocol !== "postgresql:" || parsed.hostname !== "postgres" || parsed.port !== "5432" ||
      parsed.search !== "" || parsed.hash !== "" ||
      parsed.username.length === 0 || parsed.password.length === 0 || parsed.pathname !== "/lana_chatbot" ||
      inspected.Name !== `/${POSTGRES_CONTAINER}` ||
      state.Running !== true || health.Status !== "healthy" ||
      labels["com.docker.compose.project"] !== "lana-chatbot" ||
      labels["com.docker.compose.service"] !== "postgres" || typeof address !== "string" ||
      !privateAddress) {
    throw new Error("TRACK_B_B3_2_DATABASE_ENDPOINT_UNPROVEN");
  }
  parsed.hostname = address;
  return parsed.toString();
}

export const TRACK_B_PREPROD_POSTGRES_CONTAINER = POSTGRES_CONTAINER;
