import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import type {
  TrackCV5JudgeDescriptor,
  TrackCV5StageJudgeInput,
  TrackCV5StageJudgePort,
} from "./track-c-c3-v5-benchmark-evaluator.js";
import type { TrackCV5RubricConfig } from "./track-c-c3-v5-benchmark-scoring.js";
import {
  TRACK_C_V5_STAGE_JUDGE_SYSTEM_INSTRUCTION,
  trackCV5StageJudgeGenerationConfig,
  VertexShadowModel,
  type VertexShadowModelOptions,
} from "./vertex.js";

const TRACK_C_V5_JUDGE_LOCATION = "global";
const TRACK_C_V5_JUDGE_MODEL = "gemini-3.6-flash";

function canonicalSha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalJsonV1(value), "utf8")
    .digest("hex");
}

/**
 * Pins the registered Track C V5 stage rubric to the existing Vertex client.
 * This factory is offline/evaluation-only and exposes no runtime or effect port.
 */
export function createTrackCV5StageJudge(input: Readonly<{
  readonly rubric: TrackCV5RubricConfig;
  readonly vertex: VertexShadowModelOptions;
}>): TrackCV5StageJudgePort {
  const rubric = structuredClone(input.rubric);
  const generationConfig = Object.freeze({
    systemInstruction: TRACK_C_V5_STAGE_JUDGE_SYSTEM_INSTRUCTION,
    strategist: trackCV5StageJudgeGenerationConfig(rubric, "STRATEGIST"),
    responder: trackCV5StageJudgeGenerationConfig(rubric, "RESPONDER"),
  });
  const descriptor: TrackCV5JudgeDescriptor = Object.freeze({
    provider: "VERTEX_AI",
    model: TRACK_C_V5_JUDGE_MODEL,
    location: TRACK_C_V5_JUDGE_LOCATION,
    rubricHash: canonicalSha256(rubric),
    generationConfigHash: canonicalSha256(generationConfig),
  });
  const vertex = new VertexShadowModel({
    ...input.vertex,
    judgeLocation: TRACK_C_V5_JUDGE_LOCATION,
    judgeModelName: TRACK_C_V5_JUDGE_MODEL,
  });
  return Object.freeze({
    descriptor: () => descriptor,
    assess: async (stageInput: TrackCV5StageJudgeInput) =>
      (await vertex.judgeTrackCV5Stage(stageInput, rubric)).assessment,
  });
}
