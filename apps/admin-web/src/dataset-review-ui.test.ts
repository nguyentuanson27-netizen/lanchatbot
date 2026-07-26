import { describe, expect, it } from "vitest";
import {
  highlightEvidence,
  isLeaseHeldByOther,
  renderReviewQueue,
  resolveShortcut,
  visibleAnnotations,
} from "./dataset-review-ui.js";
import type {
  Identity,
} from "./types.js";
import type {
  ReviewAnnotation,
  ReviewQueueData,
} from "./dataset-review-types.js";

const identity: Identity = {
  email: "me@example.com",
  name: "Me",
  role: "EDITOR",
  pageScope: [],
  canControl: false,
  historyEnabled: false,
  controlPageIds: [],
  policyControl: false,
  policyPageIds: [],
  policyCanaryShadowEnabled: false,
  policyCanaryLiveEnabled: false,
  policyPublishEnabled: false,
  productMediaUpload: false,
  datasetReview: {
    enabled: true,
    role: "ANNOTATOR",
    canAnnotate: true,
    canAdjudicate: false,
    canAdmin: false,
    aiPrelabel: true,
    blindReview: true,
    export: false,
  },
};

function aiAnnotation(overrides: Partial<ReviewAnnotation> = {}): ReviewAnnotation {
  return {
    id: "ann-1",
    labelCode: "BUYING_COMMITTED",
    scope: "CUSTOMER_MESSAGE",
    turnIndex: 0,
    secondTurnIndex: null,
    evidenceText: "lấy mẫu này",
    evidenceStart: 4,
    evidenceEnd: 15,
    confidence: "HIGH",
    source: "AI",
    status: "PROPOSED",
    ...overrides,
  };
}

function data(overrides: Partial<ReviewQueueData> = {}): ReviewQueueData {
  return {
    projectId: "p-1",
    projectName: "Wave 1",
    reviewMode: "AI_ASSISTED",
    split: "DEVELOPMENT",
    progress: { reviewed: 1, total: 3 },
    labels: [],
    item: {
      projectItemId: "pi-12345678",
      conversationId: "c-1",
      split: "DEVELOPMENT",
      assignmentStatus: "IN_REVIEW",
      qualityFlags: ["CONTAINS_PHONE"],
      messages: [
        { turnIndex: 0, role: "CUSTOMER", redactedText: "chị lấy mẫu này nha" },
        { turnIndex: 1, role: "SHOP", redactedText: "dạ 629k ạ" },
      ],
      annotations: [aiAnnotation()],
      lease: { ownerSubject: null, until: null },
      revision: 2,
    },
    ...overrides,
  };
}

describe("highlightEvidence", () => {
  it("escapes text and wraps a single span", () => {
    const html = highlightEvidence("a <b> c", [{ start: 2, end: 5 }]);
    expect(html).toContain("&lt;b&gt;");
    expect(html).toContain('<mark class="evidence" data-evidence>');
  });

  it("merges overlapping spans into one mark", () => {
    const html = highlightEvidence("chị lấy mẫu này", [{ start: 0, end: 3 }, { start: 2, end: 6 }]);
    expect(html.match(/<mark/gu)?.length).toBe(1);
  });

  it("clamps out-of-range spans and returns plain escaped text when none valid", () => {
    expect(highlightEvidence("abc", [{ start: 5, end: 9 }])).toBe("abc");
    expect(highlightEvidence("a<b", [])).toBe("a&lt;b");
  });
});

describe("resolveShortcut", () => {
  it("maps review keys", () => {
    expect(resolveShortcut({ key: "a" })).toBe("ACCEPT");
    expect(resolveShortcut({ key: "A", shiftKey: true })).toBe("ACCEPT_ALL");
    expect(resolveShortcut({ key: "r" })).toBe("REJECT");
    expect(resolveShortcut({ key: "e" })).toBe("EDIT");
    expect(resolveShortcut({ key: "n" })).toBe("SAVE_NEXT");
    expect(resolveShortcut({ key: "p" })).toBe("PREVIOUS");
    expect(resolveShortcut({ key: "s" })).toBe("SKIP");
  });

  it("never fires inside a text field or with a modifier", () => {
    expect(resolveShortcut({ key: "a", targetTag: "INPUT" })).toBeNull();
    expect(resolveShortcut({ key: "a", targetTag: "TEXTAREA" })).toBeNull();
    expect(resolveShortcut({ key: "a", isContentEditable: true })).toBeNull();
    expect(resolveShortcut({ key: "a", ctrlKey: true })).toBeNull();
    expect(resolveShortcut({ key: "z" })).toBeNull();
  });
});

describe("visibleAnnotations", () => {
  const anns: ReviewAnnotation[] = [aiAnnotation(), aiAnnotation({ id: "h1", source: "HUMAN" })];

  it("shows everything in AI-assisted mode", () => {
    expect(visibleAnnotations(anns, "AI_ASSISTED", false)).toHaveLength(2);
  });

  it("hides AI proposals in blind mode until revealed", () => {
    const hidden = visibleAnnotations(anns, "BLIND", false);
    expect(hidden).toHaveLength(1);
    expect(hidden[0]?.source).toBe("HUMAN");
    expect(visibleAnnotations(anns, "BLIND", true)).toHaveLength(2);
  });
});

describe("isLeaseHeldByOther", () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();

  it("is false for self, an explicit backend-owned lease, or no owner", () => {
    expect(isLeaseHeldByOther({ ownerSubject: null, until: future }, "me")).toBe(false);
    expect(isLeaseHeldByOther({ ownerSubject: "me", until: future }, "me")).toBe(false);
    expect(isLeaseHeldByOther({ ownerSubject: "opaque-subject", ownedByCurrent: true, until: future }, "me")).toBe(false);
  });

  it("is true for another active holder and false once expired", () => {
    expect(isLeaseHeldByOther({ ownerSubject: "other", until: future }, "me")).toBe(true);
    expect(isLeaseHeldByOther({ ownerSubject: "other", until: past }, "me")).toBe(false);
  });
});

describe("renderReviewQueue", () => {
  it("renders transcript, highlighted evidence, actions and progress", () => {
    const html = renderReviewQueue(data({
      labels: [{
        code: "BUYING_COMMITTED",
        name: "Buying committed",
        scope: "CUSTOMER_MESSAGE",
        evidenceRequired: true,
        confidenceRequired: true,
        mutuallyExclusiveGroup: "BUYING_STATE",
        isSafetyCritical: true,
      }],
    }), identity);
    expect(html).toContain('id="review-turn-0"');
    expect(html).toContain('id="review-turn-1"');
    expect(html).toContain("<mark");
    expect(html).toContain('data-annotation-action="ACCEPT"');
    expect(html).not.toContain('data-annotation-action="DELETE"');
    expect(html).toContain('data-review-action="SAVE_NEXT"');
    expect(html).toContain('data-progress="1/3"');
    expect(html).toContain("CONTAINS_PHONE");
    expect(html).toContain("data-annotation-add");
    expect(html).toContain('<option value="BUYING_COMMITTED">Buying committed (BUYING_COMMITTED)</option>');
    expect(html).not.toContain('data-review-action="ADD"');
  });

  it("shows an empty state when there is no item", () => {
    const html = renderReviewQueue(data({ item: null }), identity);
    expect(html).toContain("Hết mục để review");
  });

  it("hides AI proposals and marks in blind mode", () => {
    const html = renderReviewQueue(data({ reviewMode: "BLIND", revealed: false }), identity);
    expect(html).toContain("data-review-blind");
    expect(html).not.toContain('data-annotation-id="ann-1"');
    expect(html).not.toContain("<mark");
  });

  it("disables mutation actions for a benchmark viewer", () => {
    const viewer: Identity = {
      ...identity,
      datasetReview: {
        ...identity.datasetReview!,
        role: "BENCHMARK_VIEWER",
        canAnnotate: false,
      },
    };
    const html = renderReviewQueue(data(), viewer);
    expect(html).toContain('data-review-action="SAVE_NEXT" disabled');
    expect(html).toContain('data-annotation-action="ACCEPT" data-annotation-id="ann-1" disabled');
    expect(html).toContain('data-annotation-add aria-label="Th\u00eam nh\u00e3n" disabled');
  });

  it("shows delete only to an adjudicator", () => {
    const adjudicator: Identity = {
      ...identity,
      datasetReview: {
        ...identity.datasetReview!,
        role: "ADJUDICATOR",
        canAdjudicate: true,
      },
    };
    const html = renderReviewQueue(data(), adjudicator);
    expect(html).toContain('data-annotation-action="DELETE"');
  });

  it("locks the item and disables actions when another reviewer holds the lease", () => {
    const locked = data();
    locked.item!.lease = { ownerSubject: "other@example.com", until: new Date(Date.now() + 60_000).toISOString() };
    const html = renderReviewQueue(locked, identity);
    expect(html).toContain("data-review-locked");
    expect(html).toContain('data-review-action="SAVE_NEXT" disabled');
    expect(html).toContain('data-annotation-action="ACCEPT" data-annotation-id="ann-1" disabled');
  });
});
