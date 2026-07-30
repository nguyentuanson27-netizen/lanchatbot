import { describe, expect, it } from "vitest";
import { renderDatasetIndex } from "./dataset-review-screen.js";
import type { DatasetIndexEntry } from "./dataset-review-types.js";
import type { Identity } from "./types.js";

const entries: DatasetIndexEntry[] = [{
  dataset: {
    datasetId: "dataset-1",
    name: "Wave 1",
    sourceType: "REDACTED_TRANSCRIPT",
    status: "READY",
    totalItems: 10,
    importedItems: 10,
    failedItems: 0,
  },
  projects: [{
    projectId: "project-1",
    name: "Adjudication",
    status: "ACTIVE",
    reviewMode: "AI_ASSISTED",
    annotationMode: "MESSAGE",
  }],
}];

function identity(canAdjudicate: boolean, canExport: boolean): Identity {
  return {
    datasetReview: {
      enabled: true,
      role: canAdjudicate ? "ADJUDICATOR" : "BENCHMARK_VIEWER",
      canAnnotate: canAdjudicate,
      canAdjudicate,
      canAdmin: false,
      aiPrelabel: true,
      blindReview: true,
      export: canExport,
    },
  } as Identity;
}

describe("dataset index capabilities", () => {
  it("shows adjudication without leaking export when only adjudication is allowed", () => {
    const html = renderDatasetIndex(entries, identity(true, false));
    expect(html).toContain("Phân xử");
    expect(html).toContain("adjudication=true");
    expect(html).not.toContain("Xuất JSONL");
  });

  it("shows export without leaking adjudication when only export is allowed", () => {
    const html = renderDatasetIndex(entries, identity(false, true));
    expect(html).toContain("Xuất JSONL");
    expect(html).not.toContain("Phân xử");
    expect(html).not.toContain("adjudication=true");
  });
});
