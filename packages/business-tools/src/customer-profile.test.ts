import { describe, expect, it } from "vitest";
import { CustomerProfileV1Schema, type CustomerProfileV1 } from "@lana/contracts";
import {
  mergeCustomerProfile,
  type CustomerProfileFieldEvidence,
  type CustomerProfileMergeState,
} from "./customer-profile.js";

const profileId = "30709206-8f96-4a1b-9311-6f03ef4dd8b2";
const eventHash = (letter: string): string => letter.repeat(64);

const evidence = (
  observedAt: string,
  source: CustomerProfileFieldEvidence["source"] = "CUSTOMER_MESSAGE",
  confidence = 1,
  hash = "b",
): CustomerProfileFieldEvidence => ({
  source,
  sourceEventHash: eventHash(hash),
  observedAt,
  confidence,
});

const baseProfile = (): CustomerProfileV1 => CustomerProfileV1Schema.parse({
  schemaVersion: 1,
  profileId,
  customerKey: {
    namespace: "lana-customer-v1",
    algorithm: "HMAC_SHA256",
    digest: eventHash("a"),
  },
  revision: 1,
  measurements: [
    {
      kind: "WEIGHT_KG",
      value: 52,
      provenance: evidence("2026-07-22T01:00:00.000Z"),
    },
  ],
  fitPreference: null,
  preferences: { colors: [], styles: [], materials: [] },
  sizeHistory: [],
  createdAt: "2026-07-22T01:00:00.000Z",
  updatedAt: "2026-07-22T01:00:00.000Z",
});

const baseState = (): CustomerProfileMergeState => ({
  profile: baseProfile(),
  fieldEvidence: {},
});

describe("mergeCustomerProfile", () => {
  it("merges measurements independently instead of replacing the profile", () => {
    const result = mergeCustomerProfile(baseState(), {
      profileId,
      expectedRevision: 1,
      measurements: [
        {
          kind: "WAIST_CM",
          value: 72,
          provenance: evidence("2026-07-22T02:00:00.000Z"),
        },
      ],
    });

    expect(result.profile.revision).toBe(2);
    expect(result.profile.measurements).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "WEIGHT_KG", value: 52 }),
      expect.objectContaining({ kind: "WAIST_CM", value: 72 }),
    ]));
    expect(result.changedFields).toEqual(["measurements.WAIST_CM"]);
    expect(result.profile.updatedAt).toBe("2026-07-22T02:00:00.000Z");
  });

  it("ignores an older field update and keeps unrelated new fields", () => {
    const result = mergeCustomerProfile(baseState(), {
      profileId,
      expectedRevision: 1,
      measurements: [
        {
          kind: "WEIGHT_KG",
          value: 49,
          provenance: evidence("2026-07-22T00:59:59.000Z"),
        },
        {
          kind: "HEIGHT_CM",
          value: 160,
          provenance: evidence("2026-07-22T02:00:00.000Z"),
        },
      ],
    });

    expect(result.profile.measurements.find(({ kind }) => kind === "WEIGHT_KG")?.value).toBe(52);
    expect(result.profile.measurements.find(({ kind }) => kind === "HEIGHT_CM")?.value).toBe(160);
    expect(result.ignoredFields).toContain("measurements.WEIGHT_KG");
  });

  it("uses the latest explicit customer measurement when values conflict", () => {
    const result = mergeCustomerProfile(baseState(), {
      profileId,
      expectedRevision: 1,
      measurements: [
        {
          kind: "WEIGHT_KG",
          value: 50,
          provenance: evidence("2026-07-22T02:00:00.000Z"),
        },
      ],
    });

    expect(result.profile.measurements.find(({ kind }) => kind === "WEIGHT_KG")?.value)
      .toBe(50);
    expect(result.changedFields).toContain("measurements.WEIGHT_KG");
  });

  it("uses confidence and then source authority to break timestamp ties", () => {
    const afterConfidence = mergeCustomerProfile(baseState(), {
      profileId,
      expectedRevision: 1,
      measurements: [
        {
          kind: "WEIGHT_KG",
          value: 53,
          provenance: evidence("2026-07-22T01:00:00.000Z", "CUSTOMER_MESSAGE", 0.8),
        },
        {
          kind: "WEIGHT_KG",
          value: 54,
          provenance: evidence("2026-07-22T01:00:00.000Z", "HUMAN_CONFIRMED", 1),
        },
      ],
    });
    expect(afterConfidence.profile.measurements[0]?.value).toBe(54);

    const state: CustomerProfileMergeState = {
      profile: afterConfidence.profile,
      fieldEvidence: afterConfidence.fieldEvidence,
    };
    const afterSource = mergeCustomerProfile(state, {
      profileId,
      expectedRevision: state.profile.revision,
      fitPreference: {
        value: "RELAXED",
        evidence: evidence("2026-07-22T03:00:00.000Z", "ADMIN_APPROVED_IMPORT", 1),
      },
    });
    const final = mergeCustomerProfile(afterSource, {
      profileId,
      expectedRevision: afterSource.profile.revision,
      fitPreference: {
        value: "FITTED",
        evidence: evidence("2026-07-22T03:00:00.000Z", "HUMAN_CONFIRMED", 1),
      },
    });
    expect(final.profile.fitPreference).toBe("FITTED");
  });

  it("normalizes preference lists and appends deduplicated size history", () => {
    const patch = {
      profileId,
      expectedRevision: 1,
      preferences: {
        colors: {
          value: [" Be ", "be", "Đen"],
          evidence: evidence("2026-07-22T02:00:00.000Z"),
        },
      },
      sizeHistory: [
        {
          productId: "CB182",
          componentRole: "TOP" as const,
          size: "m",
          outcome: "PURCHASED" as const,
          evidence: evidence("2026-07-22T02:01:00.000Z"),
        },
      ],
    };
    const first = mergeCustomerProfile(baseState(), patch);
    const replay = mergeCustomerProfile(first, {
      ...patch,
      expectedRevision: first.profile.revision,
    });

    expect(first.profile.preferences.colors).toEqual(["Be", "Đen"]);
    expect(first.profile.sizeHistory).toHaveLength(1);
    expect(first.profile.sizeHistory[0]?.size).toBe("M");
    expect(replay.profile.revision).toBe(first.profile.revision);
    expect(replay.changedFields).toEqual([]);
  });

  it("rejects a patch for another profile", () => {
    expect(() => mergeCustomerProfile(baseState(), {
      profileId: "5443b12e-724a-4a18-8610-97cc8694f812",
      expectedRevision: 1,
      measurements: [],
    })).toThrow("CUSTOMER_PROFILE_ID_MISMATCH");
  });

  it("rejects a stale writer and returns a persistence CAS condition", () => {
    const result = mergeCustomerProfile(baseState(), {
      profileId,
      expectedRevision: 1,
      measurements: [{
        kind: "HEIGHT_CM",
        value: 160,
        provenance: evidence("2026-07-22T02:00:00.000Z"),
      }],
    });
    expect(result.cas).toEqual({ expectedRevision: 1, nextRevision: 2 });
    expect(() => mergeCustomerProfile(result, {
      profileId,
      expectedRevision: 1,
      fitPreference: {
        value: "REGULAR",
        evidence: evidence("2026-07-22T03:00:00.000Z"),
      },
    })).toThrow("CUSTOMER_PROFILE_REVISION_CONFLICT");
  });

  it("validates provenance for every field type", () => {
    expect(() => mergeCustomerProfile(baseState(), {
      profileId,
      expectedRevision: 1,
      fitPreference: {
        value: "REGULAR",
        evidence: { ...evidence("2026-07-22T02:00:00.000Z"), confidence: 2 },
      },
    })).toThrow();
    expect(() => mergeCustomerProfile(baseState(), {
      profileId,
      expectedRevision: 1,
      sizeHistory: [{
        productId: "CB182",
        componentRole: "TOP",
        size: "M",
        outcome: "PURCHASED",
        evidence: { ...evidence("2026-07-22T02:00:00.000Z"), observedAt: "invalid" },
      }],
    })).toThrow();
  });

  it("does not revise the profile or retain orphan evidence when an old history entry falls outside the cap", () => {
    const current = baseProfile();
    const sizeHistory = Array.from({ length: 50 }, (_, index) => ({
      productId: `CB${index}`,
      componentRole: "TOP" as const,
      size: "M",
      outcome: "PURCHASED" as const,
      sourceEventHash: eventHash(["a", "b", "c", "d", "e", "f"][index % 6]!),
      recordedAt: new Date(Date.parse("2026-07-22T01:00:00.000Z") + index * 1_000).toISOString(),
    }));
    const state: CustomerProfileMergeState = {
      profile: CustomerProfileV1Schema.parse({ ...current, sizeHistory }),
      fieldEvidence: {},
    };
    const result = mergeCustomerProfile(state, {
      profileId,
      expectedRevision: 1,
      sizeHistory: [{
        productId: "TOO-OLD",
        componentRole: "TOP",
        size: "S",
        outcome: "PURCHASED",
        evidence: evidence("2026-07-21T00:00:00.000Z"),
      }],
    });
    expect(result.profile.revision).toBe(1);
    expect(result.changedFields).toEqual([]);
    expect(Object.keys(result.fieldEvidence).some((key) => key.includes("TOO-OLD"))).toBe(false);
    expect(result.cas).toEqual({ expectedRevision: 1, nextRevision: 1 });
  });
});
