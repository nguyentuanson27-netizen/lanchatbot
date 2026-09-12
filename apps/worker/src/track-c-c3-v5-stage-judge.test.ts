import { createHash, generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalJsonV1 } from "@lana/contracts";
import { describe, expect, it, vi } from "vitest";
import type { TrackCV5RubricConfig } from "./track-c-c3-v5-benchmark-scoring.js";
import { createTrackCQualityV2StageJudge } from "./track-c-quality-benchmark-v2.js";
import {
  TRACK_C_V5_STAGE_JUDGE_SYSTEM_INSTRUCTION,
  trackCV5StageJudgeGenerationConfig,
} from "./vertex.js";

const rubric = JSON.parse(readFileSync(
  new URL("../evals/track-c-c2/v2/rubric.json", import.meta.url),
  "utf8",
)) as TrackCV5RubricConfig;

const privateKey = generateKeyPairSync("rsa", {
  modulusLength: 2_048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
}).privateKey;

function providerResponse(): Response {
  return new Response(JSON.stringify({
    modelVersion: "gemini-3.6-flash",
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      scores: {
        QUESTION_RESOLUTION: 4,
        FACT_GROUNDING: 4,
        CONTEXT_USE: 3,
        NEXT_MOVE_QUALITY: 3,
        NATURALNESS_LANA: 3,
        CONCISION: 4,
      },
      hardFailures: [],
      behaviorRequirementsSatisfied: true,
      tuningNotes: [],
    }) }] } }],
  }), { status: 200 });
}

describe("Track C V5 Vertex stage judge composition", () => {
  it("pins the current judge and submits the stage rubric through the existing Vertex boundary", async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    const fetchImpl = vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com")) {
        return new Response(JSON.stringify({
          access_token: "test-token",
          expires_in: 3_600,
        }), { status: 200 });
      }
      requests.push({ url, body: JSON.parse(String(init?.body)) });
      return providerResponse();
    }) as unknown as typeof fetch;
    const judge = createTrackCQualityV2StageJudge({
      rubric,
      vertex: {
        projectId: "test-project",
        location: "us-central1",
        modelName: "gemini-3.5-flash-lite",
        serviceAccount: {
          email: "test@example.iam.gserviceaccount.com",
          privateKey,
        },
        fetchImpl,
      },
    });

    const generationConfig = {
      systemInstruction: TRACK_C_V5_STAGE_JUDGE_SYSTEM_INSTRUCTION,
      strategist: trackCV5StageJudgeGenerationConfig(rubric, "STRATEGIST"),
      responder: trackCV5StageJudgeGenerationConfig(rubric, "RESPONDER"),
    };
    expect(judge.descriptor()).toEqual({
      provider: "VERTEX_AI",
      model: "gemini-3.6-flash",
      location: "global",
      rubricHash: createHash("sha256")
        .update(canonicalJsonV1(rubric), "utf8")
        .digest("hex"),
      generationConfigHash: createHash("sha256")
        .update(canonicalJsonV1(generationConfig), "utf8")
        .digest("hex"),
    });

    const assessment = await judge.assess({
      contractVersion: "TRACK_C_V5_STAGE_JUDGE_INPUT_V1",
      executionLane: "PRODUCTION_CONTRACT",
      domain: "PRICE_VALUE",
      stage: "RESPONDER",
      dialogue: [{
        direction: "INBOUND",
        senderType: "CUSTOMER",
        messageType: "TEXT",
        text: "Mẫu này bao nhiêu em?",
        attachmentCount: 0,
        occurredAt: "2026-09-12T10:00:00.000Z",
      }],
      expected: {
        requiredBehaviors: ["answer the exact verified price"],
        forbiddenBehaviors: ["no invented promotion"],
      },
      authoritativeEvidence: { priceVnd: 849_000 },
      artifact: {
        conversationPlan: {
          currentNeed: "Answer price",
          mustResolve: "Exact price",
          conversationRead: "Product resolved",
          nextMove: "NONE",
          avoid: "No invented fact",
        },
        responderReply: "Mẫu này hiện 849k chị ạ.",
      },
    });

    expect(assessment.scores).toMatchObject({
      QUESTION_RESOLUTION: 4,
      FACT_GROUNDING: 4,
      NATURALNESS_LANA: 3,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(
      "https://aiplatform.googleapis.com/v1/projects/test-project/locations/global/publishers/google/models/gemini-3.6-flash:generateContent",
    );
    const body = requests[0]?.body as {
      generationConfig: Record<string, unknown>;
      contents: [{ parts: [{ text: string }] }];
    };
    expect(body.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "HIGH" },
    });
    expect(body.generationConfig).not.toHaveProperty("temperature");
    expect(body.contents[0].parts[0].text).not.toContain("caseId");
    expect(body.contents[0].parts[0].text).not.toContain("split");
  });

  it("fails closed when Vertex omits a score required by the assessed stage", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes("oauth2.googleapis.com")) {
        return new Response(JSON.stringify({
          access_token: "test-token",
          expires_in: 3_600,
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          scores: { QUESTION_RESOLUTION: 4 },
          hardFailures: [],
          behaviorRequirementsSatisfied: true,
          tuningNotes: [],
        }) }] } }],
      }), { status: 200 });
    }) as unknown as typeof fetch;
    const judge = createTrackCQualityV2StageJudge({
      rubric,
      vertex: {
        projectId: "test-project",
        location: "us-central1",
        modelName: "gemini-3.5-flash-lite",
        serviceAccount: {
          email: "test@example.iam.gserviceaccount.com",
          privateKey,
        },
        fetchImpl,
      },
    });

    await expect(judge.assess({
      contractVersion: "TRACK_C_V5_STAGE_JUDGE_INPUT_V1",
      executionLane: "BEHAVIOR_SIMULATION",
      domain: "CONVERSATION_CONTROL",
      stage: "STRATEGIST",
      dialogue: [],
      expected: { requiredBehaviors: [], forbiddenBehaviors: [] },
      authoritativeEvidence: {},
      artifact: {
        conversationPlan: {
          currentNeed: "Clarify the active product",
          mustResolve: "Referent",
          conversationRead: "Ambiguous",
          nextMove: "Ask one clarification",
          avoid: "Do not guess",
        },
      },
    })).rejects.toThrow("VERTEX_TRACK_C_V5_STAGE_SCHEMA_INVALID");
  });
});
