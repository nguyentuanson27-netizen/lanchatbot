const GATE_E_RELEASE_EVIDENCE_READER_ROLE = "lana_gate_e_evidence_reader" as const;

export function gateEReleaseEvidenceReaderDatabaseUrl(connectionString: string): string {
  const trimmed = connectionString.trim();
  if (!trimmed) {
    throw new Error("TRACK_B_RELEASE_GATE_E_DATABASE_URL_REQUIRED");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("TRACK_B_RELEASE_GATE_E_DATABASE_URL_INVALID");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("TRACK_B_RELEASE_GATE_E_DATABASE_URL_INVALID");
  }
  if (parsed.searchParams.has("options")) {
    throw new Error("TRACK_B_RELEASE_GATE_E_DATABASE_OPTIONS_FORBIDDEN");
  }

  parsed.searchParams.set(
    "options",
    `-c role=${GATE_E_RELEASE_EVIDENCE_READER_ROLE}`,
  );
  return parsed.toString();
}
