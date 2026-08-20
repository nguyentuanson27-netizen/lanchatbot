import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  GATE_E_INTERPRETER_MODEL_RELATIONSHIP_V1,
  GATE_E_INTERPRETATION_PROBES_V1,
  GATE_E_INTERPRETATION_REQUIRED_COVERAGE_V1,
  assertGateEInterpreterProbeCoverageV1,
  buildGateEInterpretationRequest,
  deriveGateEInterpreterRegistrationV1,
  parseGateEInterpretationResponse,
} from "./gate-e-output-interpreter.js";

const modelResource =
  "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
const hash = (value: string): string => createHash("sha256")
  .update(value, "utf8")
  .digest("hex");

describe("Gate E semantic interpreter capability boundary", () => {
  it("registers the static policy and exact calibration requests", () => {
    const registration = deriveGateEInterpreterRegistrationV1(modelResource);
    expect(registration.interpreterModelRelationship).toBe(
      GATE_E_INTERPRETER_MODEL_RELATIONSHIP_V1,
    );
    expect(registration.coverageDomainHash).toBe(
      hash(canonicalJsonV1(GATE_E_INTERPRETATION_REQUIRED_COVERAGE_V1)),
    );
    expect(registration.probes).toHaveLength(GATE_E_INTERPRETATION_PROBES_V1.length);
    for (const [index, probe] of GATE_E_INTERPRETATION_PROBES_V1.entries()) {
      const request = buildGateEInterpretationRequest({
        modelResource,
        interpretationInput: probe.input,
      });
      expect(registration.probes[index]).toMatchObject({
        probeId: probe.probeId,
        candidateOutputHash: probe.input.candidateOutputHash,
        requestIdentity: request.identity,
        coverage: probe.coverage,
        expectedClassificationHash: hash(canonicalJsonV1(probe.expected)),
      });
    }
    expect(registration.policyHash).toBe(hash(canonicalJsonV1(registration.policy)));
  });

  it("uses only Gemini 3.5 Flash-Lite compatible schema controls", () => {
    const request = buildGateEInterpretationRequest({
      modelResource,
      interpretationInput: GATE_E_INTERPRETATION_PROBES_V1[0]!.input,
    });
    const body = JSON.parse(request.body) as {
      generationConfig: {
        responseSchema: {
          additionalProperties?: unknown;
          properties: { schemaVersion: Record<string, unknown> };
        };
        temperature?: unknown;
        topP?: unknown;
      };
    };
    expect(body.generationConfig.responseSchema.properties.schemaVersion).toEqual({
      type: "INTEGER",
      minimum: 1,
      maximum: 1,
    });
    expect(body.generationConfig.responseSchema)
      .not.toHaveProperty("additionalProperties");
    expect(body.generationConfig).not.toHaveProperty("temperature");
    expect(body.generationConfig).not.toHaveProperty("topP");
  });

  it("closes the positive and adversarial-negative matrix for every verdict class", () => {
    expect(() => assertGateEInterpreterProbeCoverageV1(
      GATE_E_INTERPRETATION_PROBES_V1,
    )).not.toThrow();
    expect(GATE_E_INTERPRETATION_PROBES_V1.flatMap(({ coverage }) => coverage).sort())
      .toEqual([...GATE_E_INTERPRETATION_REQUIRED_COVERAGE_V1].sort());

    const missingOne = GATE_E_INTERPRETATION_PROBES_V1.map((probe, index) =>
      index === 0
        ? { ...probe, coverage: probe.coverage.slice(1) }
        : probe
    );
    expect(() => assertGateEInterpreterProbeCoverageV1(missingOne))
      .toThrow("GATE_E_INTERPRETER_COVERAGE_INCOMPLETE");

    const duplicated = [
      ...GATE_E_INTERPRETATION_PROBES_V1,
      GATE_E_INTERPRETATION_PROBES_V1[0]!,
    ];
    expect(() => assertGateEInterpreterProbeCoverageV1(duplicated))
      .toThrow("GATE_E_INTERPRETER_COVERAGE_DUPLICATED");

    const coverageSwappedBetweenOppositeExpectations =
      GATE_E_INTERPRETATION_PROBES_V1.map((probe, index) => {
        if (index === 0) {
          return { ...probe, coverage: GATE_E_INTERPRETATION_PROBES_V1[1]!.coverage };
        }
        if (index === 1) {
          return { ...probe, coverage: GATE_E_INTERPRETATION_PROBES_V1[0]!.coverage };
        }
        return probe;
      });
    expect(() => assertGateEInterpreterProbeCoverageV1(
      coverageSwappedBetweenOppositeExpectations,
    )).toThrow("GATE_E_INTERPRETER_COVERAGE_SEMANTICS_INVALID");
  });

  it("uses natural Messenger wording without exposing hidden cart state", () => {
    expect(GATE_E_INTERPRETATION_PROBES_V1.map(({ probeId, input }) => [
      probeId,
      input.wording[0],
    ])).toEqual([
      ["effect-cart_opened-positive", "Dạ mẫu này em note lại cho chị rồi nha."],
      ["effect-cart_opened-adversarial-negative", "Dạ em đang xem mẫu này cho chị."],
      ["effect-cart_updated-positive", "Em đổi sang màu đen, size M cho chị rồi nha."],
      ["effect-cart_updated-adversarial-negative", "Để em kiểm tra lại màu với size cho chị nha."],
      ["effect-order_placed-positive", "Em tạo đơn cho chị rồi nha."],
      ["effect-order_placed-adversarial-negative", "Đơn mình chưa lên đâu chị."],
      ["effect-order_confirmed-positive", "Chị yên tâm, đơn này đã được xác nhận rồi nha."],
      ["effect-order_confirmed-adversarial-negative", "Đơn này em chưa chốt chị nha."],
      ["effect-message_sent-positive", "Em gửi thông tin thanh toán cho chị rồi nha."],
      ["effect-message_sent-adversarial-negative", "Em chưa gửi thông tin thanh toán đâu chị."],
      ["effect-delivery_created-positive", "Đơn của chị có mã vận đơn rồi nha."],
      ["effect-delivery_created-adversarial-negative", "Đơn mình chưa có mã vận đơn chị nha."],
      ["clarification-product-positive", "Chị gửi em mã hoặc ảnh mẫu chị đang xem nha."],
      ["clarification-product-adversarial-negative", "Dạ em thấy đúng mẫu chị đang hỏi rồi."],
      ["clarification-measurements-positive", "Chị gửi em chiều cao với cân nặng nha, em xem size cho chị."],
      ["clarification-measurements-adversarial-negative", "Dạ em có chiều cao với cân nặng của chị rồi."],
      ["clarification-checkout_details-positive", "Chị gửi em tên, số điện thoại với địa chỉ nhận hàng nha."],
      ["clarification-checkout_details-adversarial-negative", "Dạ em có đủ thông tin nhận hàng rồi."],
      ["action-confirm-cart-positive", "Chị xem lại mẫu, màu với size giúp em đúng chưa nha."],
      ["action-confirm-cart-adversarial-negative", "Em đang tổng hợp lại mẫu, màu với size cho chị."],
      ["claim-price-positive", "Mẫu này 699 nghìn chị nha."],
      ["claim-price-adversarial-negative", "Để em xem lại giá mẫu này rồi báo chị nha."],
      ["claim-size_fit-positive", "Theo số đo của chị, M sẽ vừa hơn. L là size rộng hơn."],
      ["claim-size_fit-adversarial-negative", "Để em đối chiếu bảng size rồi báo chị nha."],
      ["claim-product_media-positive", "Đúng ảnh của mẫu này đây chị nha."],
      ["claim-product_media-adversarial-negative", "Để em tìm đúng ảnh mẫu này gửi chị nha."],
      ["unrelated-wording", "Dạ em đây chị."],
    ]);
  });

  it("rejects candidate-authored semantic labels at the interpreter input boundary", () => {
    const input = {
      candidateOutputHash: hash("candidate"),
      wording: ["Xin chào chị."],
      eligibleClaims: [],
      claimedEffects: ["ORDER_PLACED"],
    };
    expect(() => buildGateEInterpretationRequest({
      modelResource,
      interpretationInput: input,
    })).toThrow("GATE_E_INTERPRETATION_INPUT_INVALID");
  });

  it("accepts only exact-hash, typed provider interpretations", () => {
    const candidateOutputHash = hash("candidate");
    expect(parseGateEInterpretationResponse({
      providerModelVersion: "gemini-3.5-flash-lite",
      payload: { candidates: [{ content: { parts: [{ text: JSON.stringify({
        schemaVersion: 1,
        contractVersion: "GATE_E_OUTPUT_INTERPRETATION_V1",
        candidateOutputHash,
        claimContentHashes: [],
        clarificationTargets: [],
        requestedActions: [],
        claimedEffects: ["ORDER_PLACED", "CART_UPDATED"],
      }) }] } }] },
    })).toMatchObject({
      candidateOutputHash,
      claimedEffects: ["CART_UPDATED", "ORDER_PLACED"],
    });

    expect(() => parseGateEInterpretationResponse({
      providerModelVersion: "unknown",
      payload: {},
    })).toThrow("GATE_E_INTERPRETATION_PROVIDER_IDENTITY_MISMATCH");
  });
});
