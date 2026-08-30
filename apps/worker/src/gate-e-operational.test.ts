import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CONTEXT_V2_CANDIDATE_MODEL_ID } from "./context-v2-candidate.js";
import {
  buildGateEOperationalRegistration,
  gateEDatabaseUrlForRole,
  gateEModelResource,
} from "./gate-e-operational.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

describe("Gate E operational boundary", () => {
  it("binds the approved Vertex resource without accepting path injection", () => {
    expect(gateEModelResource("lana-preprod_1")).toBe(
      `projects/lana-preprod_1/locations/global/publishers/google/models/${CONTEXT_V2_CANDIDATE_MODEL_ID}`,
    );
    expect(() => gateEModelResource("lana/other")).toThrow(
      "GATE_E_OPERATIONAL_PROJECT_ID_INVALID",
    );
  });

  it("scopes each database command to its least-privilege role", () => {
    const registration = new URL(gateEDatabaseUrlForRole(
      "postgresql://operator:secret@db.internal:5432/lana?sslmode=require",
      "registration",
    ));
    const evidence = new URL(gateEDatabaseUrlForRole(
      "postgresql://operator:secret@db.internal:5432/lana?sslmode=require",
      "evidence",
    ));
    expect(registration.searchParams.get("options")).toBe(
      "-c role=lana_gate_e_registration_writer",
    );
    expect(evidence.searchParams.get("options")).toBe(
      "-c role=lana_gate_e_evidence_writer",
    );
    expect(registration.searchParams.get("sslmode")).toBe("require");
    expect(() => gateEDatabaseUrlForRole(
      "postgresql://db/lana?options=-c%20role%3Dlana_app",
      "evidence",
    )).toThrow("GATE_E_OPERATIONAL_DATABASE_OPTIONS_FORBIDDEN");
    expect(() => gateEDatabaseUrlForRole("https://db/lana", "evidence"))
      .toThrow("GATE_E_OPERATIONAL_DATABASE_URL_INVALID");
  });

  it("reproduces the committed v15 registration from immutable artifacts", async () => {
    const actual = await buildGateEOperationalRegistration({
      cwd: REPOSITORY_ROOT,
      artifactDirectory: "evaluation/gate-e/df10-v15",
    });
    const expected = (await import(
      "../../../evaluation/gate-e/df10-v15/registration.json",
      { with: { type: "json" } }
    )).default;
    expect(actual).toEqual(expected);
  });

  it("rejects artifact path traversal before reading files", async () => {
    await expect(buildGateEOperationalRegistration({
      cwd: REPOSITORY_ROOT,
      artifactDirectory: "../outside",
    })).rejects.toThrow("GATE_E_OPERATIONAL_ARTIFACT_PATH_INVALID");
  });
});
