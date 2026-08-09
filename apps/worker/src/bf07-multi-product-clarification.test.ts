import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AgentProposalV1 } from "@lana/contracts";
import {
  decideMultiProductResolution,
  verifyMultiProductClarificationProposal,
} from "./multi-product-clarification.js";

interface ReplayCase {
  readonly name: string;
  readonly policy: "LEGACY" | "CLARIFY_V1";
  readonly productIds: readonly string[];
  readonly expectedDisposition: "CONTINUE" | "CLARIFY_SELECTION";
}

const replay = JSON.parse(readFileSync(
  new URL("../../../benchmarks/bf07/multi-product-clarification-v1.json", import.meta.url),
  "utf8",
)) as readonly ReplayCase[];

function proposal(reply: string): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "multi_product_selection",
    conversationStage: "PRODUCT_MATCHED",
    productId: null,
    action: "REPLY",
    reply,
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent: "NONE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  };
}

describe("BF-07 multi-product clarification", () => {
  it.each(replay)("replays $name", (fixture) => {
    expect(decideMultiProductResolution({
      policy: fixture.policy,
      productIds: fixture.productIds,
    }).disposition).toBe(fixture.expectedDisposition);
  });

  it("accepts only a bounded selection question covering every verified product", () => {
    expect(verifyMultiProductClarificationProposal(
      proposal("Chị muốn xem mẫu SD375 hay SD398 trước ạ?"),
      ["SD375", "SD398"],
    )).toEqual({ accepted: true, reasonCodes: [] });

    expect(verifyMultiProductClarificationProposal(
      proposal("SD375 giá 699k, chị chốt mẫu này nhé."),
      ["SD375", "SD398"],
    )).toEqual({
      accepted: false,
      reasonCodes: expect.arrayContaining([
        "MULTI_PRODUCT_CANDIDATE_OMITTED",
        "MULTI_PRODUCT_UNVERIFIED_COMMERCIAL_CLAIM",
      ]),
    });

    expect(verifyMultiProductClarificationProposal(
      proposal("Chị chọn SD375, SD398 hay SD999 ạ?"),
      ["SD375", "SD398"],
    )).toEqual({
      accepted: false,
      reasonCodes: ["MULTI_PRODUCT_UNVERIFIED_PRODUCT"],
    });

    expect(verifyMultiProductClarificationProposal(
      proposal("Chị thấy SD375 đẹp hơn SD398 phải không ạ?"),
      ["SD375", "SD398"],
    )).toEqual({
      accepted: false,
      reasonCodes: expect.arrayContaining([
        "MULTI_PRODUCT_DRAFT_BOUNDARY_INVALID",
        "MULTI_PRODUCT_UNVERIFIED_COMMERCIAL_CLAIM",
      ]),
    });

    expect(verifyMultiProductClarificationProposal({
      ...proposal("Chị muốn xem mẫu SD375 hay SD398 trước ạ?"),
      productId: "SD375",
      attachments: ["https://example.test/unverified.jpg"],
    }, ["SD375", "SD398"])).toEqual({
      accepted: false,
      reasonCodes: ["MULTI_PRODUCT_DRAFT_BOUNDARY_INVALID"],
    });

    expect(verifyMultiProductClarificationProposal(
      proposal("Chị muốn xem SD375? Chị muốn xem SD398?"),
      ["SD375", "SD398"],
    )).toEqual({
      accepted: false,
      reasonCodes: ["MULTI_PRODUCT_DRAFT_BOUNDARY_INVALID"],
    });

    expect(verifyMultiProductClarificationProposal(
      proposal("Chị muốn xem mẫu AB12X hay SD398 trước ạ?"),
      ["AB12X", "SD398"],
    )).toEqual({ accepted: true, reasonCodes: [] });

    expect(verifyMultiProductClarificationProposal(
      proposal("Trong hai mẫu SD375 và SD398, chị ưng mẫu nào để em hỗ trợ tiếp ạ?"),
      ["SD375", "SD398"],
    )).toEqual({ accepted: true, reasonCodes: [] });
  });

  it("fails closed before a model call when the numbered candidate limit is exceeded", () => {
    expect(decideMultiProductResolution({
      policy: "CLARIFY_V1",
      productIds: Array.from({ length: 11 }, (_, index) => `SD${100 + index}`),
    })).toMatchObject({
      disposition: "FAIL_CLOSED",
      reasonCodes: ["MULTI_PRODUCT_CANDIDATE_LIMIT_EXCEEDED"],
    });
  });
});
