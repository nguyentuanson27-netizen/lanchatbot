import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import type { TrackCRequestedObligation } from "./track-c-c3-strategy-contract.js";
import { runTrackCStrategyContractCase, runTrackCStrategyLive } from "./track-c-c3-strategy-contract-runner.js";
import { contextFromFrozenTrackCCapture } from "./track-c-offline-candidate.js";
import { materializeTrackCV5CaseCapture,
  type TrackCV5MaterializationRecipe, type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";

// Independent deterministic controls, not DEV70 and not model acceptance.
const root = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(new URL("runtime-materialization.json", root), "utf8")) as TrackCV5MaterializationRecipe;
const catalog = JSON.parse(readFileSync(new URL("facts.json", root), "utf8")) as {
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
};
const at = new Date(recipe.evaluation_at);
const modelResource = "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
function payload(value: unknown) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] };
}
function run(input: { inbound: string; answer: string | null; limit?: string; known?: string; scope?: TrackCRequestedObligation["scope"];
  request?: "LOCALITY"; progression?: string; productId?: string; selectedSize?: string; selectionSpan?: string; etaDeadline?: number }) {
  const productId = input.productId ?? "SQ9012";
  const capture = materializeTrackCV5CaseCapture({ lane: "BEHAVIOR_SIMULATION", recipe,
    fixture: { id: "SEMANTIC_STATEMENT_PAIR", latest_customer_message: input.inbound,
      context: { product_binding: { status: "RESOLVED", product_ids: [productId] },
        phase: "BROWSING", canonical_flags: [], source_stage: null,
        buying_intent: { decision: "NONE", requested_action: "NONE", quantity: null, evidence: null },
        runtime_claim_refs: input.etaDeadline !== undefined ? ["RC_ETA_HN"] : productId === "SQ9012" ? ["RC_PRICE_A"] : [] } },
    runtimeClaimCatalog: catalog.runtime_claim_catalog });
  const send = vi.fn<CandidateVertexTransport["send"]>()
    .mockResolvedValueOnce({ providerModelVersion: "gemini-3.5-flash-lite", payload: payload({
      replyAct: "ANSWER", proposition: input.etaDeadline !== undefined ? "ETA" : productId === "SQ9012" ? "PRICE" : "NONE",
      evidenceRefs: productId === "SQ9012" ? ["CLAIM_001"] : [],
      goal: [`NEED: ${input.limit ?? "answer current request"}`, `KNOWN: ${input.known ?? "NONE"}`,
        "ANSWER: selected evidence", `LIMIT: ${input.limit ?? "NONE"}`,
        `NEXT: ${input.request ? "assigned locality needed for ETA" : "NONE"}`].join("\n"),
      continuation: input.request ? { type: "ASK", input: input.request } : { type: "KEEP_OPEN" }, canonicalAction: "NONE" }) })
    .mockResolvedValueOnce({ providerModelVersion: "gemini-3.5-flash-lite", payload: payload({
      answerText: input.answer, factualTexts: [], progressionText: input.progression ?? null }) });
  const promise = runTrackCStrategyContractCase({ lane: "BEHAVIOR_SIMULATION", modelResource, capture,
    evaluationAt: at,
    ...(input.scope === undefined ? {} : { requestedObligations: [
      { kind: "FACT_REQUEST" as const, capability: "PRICE" as const, scope: null, productId },
      { kind: "FACT_REQUEST" as const, capability: "PRODUCT_ATTRIBUTES" as const, scope: input.scope, productId },
    ] }),
    ...(input.etaDeadline === undefined ? {} : { deliveryDeadlineConstraint: { maxDeliveryDays: input.etaDeadline } }),
    ...(input.selectedSize ? { customerVariant: { operation: "SELECT" as const, productId,
      size: input.selectedSize, color: null, evidenceText: input.selectionSpan ?? input.inbound } } : {}),
    evaluationContext: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
      text: input.inbound, attachmentCount: 0, occurredAt: at.toISOString() }], transport: { send } });
  return { promise, send, capture };
}

describe("C3 two-sided semantic statement guard", () => {
  it("accepts an unconfirmed wrinkle question complement without accepting an independent claim", async () => {
    const input = { inbound: "Giá và vải có dễ nhăn không?", limit: "wrinkle resistance unverified", scope: "WRINKLE_RESISTANCE" as const };
    for (const answer of [null, "Em chưa có thông tin xác nhận về khả năng chống nhăn của mẫu SQ9012."]) {
      const result = await run({ ...input, answer }).promise;
      expect(result.reply).toContain("khả năng chống nhăn của mẫu SQ9012");
      expect(result.reply).toContain("849.000");
    }
    for (const answer of ["Hiện chưa có thông tin xác nhận vải có dễ nhăn khi ngồi lâu. Vải này chống nhăn.",
      "Em chưa xác nhận được chất liệu có dễ nhăn hay không nên mẫu này không nhăn.",
      "Hiện chưa có thông tin xác nhận vải có dễ nhăn khi ngồi lâu và bền hơn."]) {
      await expect(run({ ...input, answer }).promise).rejects.toThrow();
    }
  });
  it.each(["625k", "690k", "735.000đ"])("keeps a customer amount reference, not an approved price (%s)", async (amount) => {
    const inbound = `Nếu ${amount} thì chị lấy.`;
    for (const answer of [`${amount} là mức chị đề xuất.`,
      `Em chưa thể xác nhận giá ${amount} chị đề xuất.`]) {
      const { promise, send } = run({ inbound, answer, known: `customer proposed ${amount}` });
      const result = await promise;
      expect(result.reply).toContain(answer);
      expect(result.reply).toContain("849.000");
      expect(result.output.cta).toBe("NONE");
      expect(result.output.segments.some(({ kind }) => kind === "EFFECT_CLAIM")).toBe(false);
      expect(send).toHaveBeenCalledTimes(2);
    }
    for (const answer of [`Shop đồng ý giá ${amount}.`,
      `${amount} là mức chị đề xuất. Shop đã đồng ý giá đó.`]) {
      await expect(run({ inbound, answer, known: `customer proposed ${amount}` }).promise).rejects.toThrow();
    }
  });

  it("does not accept a source-less amount reference", async () => {
    await expect(run({ inbound: "Chị cần xem mẫu.", answer: "690k là mức chị đề xuất.",
      known: "customer proposed 690k" }).promise).rejects.toThrow();
  });

  it.each(["L", "M", "XL"])("distinguishes selection acknowledgement from fit for %s", async (size) => {
    const inbound = `Chị chọn size ${size}.`;
    const good = await run({ inbound, answer: `Chị chọn size ${size}.`, known: `customer selected ${size}`, selectedSize: size }).promise;
    expect(good.reply).toContain(`Chị chọn size ${size}.`);
    for (const answer of [`Size ${size} chắc chắn vừa chị.`,
      `Chị chọn size ${size}, size này sẽ vừa.`,
      `Chị chọn size ${size}. Vừa đẹp chị nhé.`]) {
      await expect(run({ inbound, answer, selectedSize: size }).promise).rejects.toThrow();
    }
  });

  it.each(["SQ9012", "PX420", "AT38"])("allows a bound product referent, not a product assertion (%s)", async (productId) => {
    const inbound = `Cho chị xem mẫu ${productId}.`;
    const answer = `Mẫu ${productId} chị đang xem.`;
    expect((await run({ inbound, answer, productId }).promise).reply).toContain(answer);
    for (const bad of [`Mẫu ${productId} chống nhăn.`, `${answer} Như vậy đáng tiền hơn.`]) {
      await expect(run({ inbound, answer: bad, productId }).promise).rejects.toThrow();
    }
  });

  it("allows a locality question for ETA without opening recipient collection", async () => {
    const inbound = "Giao hàng mất bao lâu?";
    const progression = "Chị cho em biết tỉnh hoặc thành phố nhận hàng nhé?";
    expect((await run({ inbound, answer: null, request: "LOCALITY", progression }).promise).reply).toContain(progression);
    for (const bad of ["Chị cho em địa chỉ nhận hàng đầy đủ nhé?",
      `${progression} Chị gửi thêm tên và số điện thoại.`]) {
      await expect(run({ inbound, answer: null, request: "LOCALITY", progression: bad }).promise).rejects.toThrow();
    }
  });

  it.each(["M", "L"])("keeps the selected size separate from the queried size (%s)", async (selectedSize) => {
    const other = selectedSize === "M" ? "S" : "XL";
    const selectionSpan = `Chị chọn ${selectedSize}`;
    const inbound = `${selectionSpan}, size ${other} còn không?`;
    const good = run({ inbound, selectedSize, selectionSpan, answer: `Chị chọn ${selectedSize}.` });
    expect((await good.promise).reply).toContain(`Chị chọn ${selectedSize}.`);
    await expect(run({ inbound, selectedSize, selectionSpan, answer: `Chị chọn size ${other}.` }).promise).rejects.toThrow();
  });

  it.each([
    ["wrinkle resistance", "khả năng chống nhăn", "độ mịn", "WRINKLE_RESISTANCE"],
    ["smoothness", "độ mịn", "khả năng chống nhăn", "SMOOTHNESS"],
    ["weight", "trọng lượng", "giá", "WEIGHT"],
  ] as const)("checks the assigned unsupported property, not merely non-null wording (%s)", async (topic, correct, wrong, scope) => {
    const inbound = `Giá bao nhiêu và ${correct} thế nào?`;
    const limit = `${topic} has no verified evidence`;
    const answer = `Em chưa có thông tin xác nhận về ${correct} của mẫu SQ9012.`;
    const result = await run({ inbound, answer, limit, scope }).promise;
    expect(result.reply).toContain(answer);
    expect(result.reply).toContain("849.000");
    expect(result.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM")).toHaveLength(1);
    for (const bad of [`Em chưa có dữ liệu xác nhận về ${wrong}.`, `${answer} Vì vậy chắc chắn tốt hơn.`]) {
      await expect(run({ inbound, answer: bad, limit, scope }).promise).rejects.toThrow();
    }
    expect((await run({ inbound, answer: null, limit, scope }).promise).reply).toContain(correct);
  });

  it("missing wrinkle evidence is not a negative wrinkle fact", async () => {
    const input = { inbound: "Chị hỏi giá và độ nhăn.", limit: "wrinkle resistance unverified", scope: "WRINKLE_RESISTANCE" as const };
    expect((await run({ ...input, answer: null }).promise).reply).toContain("chống nhăn");
    for (const answer of ["Không có khả năng chống nhăn đâu chị.",
      "Chắc là dễ nhăn.", "Em chưa có dữ liệu, nên chắc là dễ nhăn."]) {
      await expect(run({ ...input, answer }).promise).rejects.toThrow();
    }
  });

  it("keeps dispatch uncertainty separate from active and passive business effects", async () => {
    const input = { inbound: "Bao giờ shop gửi hàng?", limit: "dispatch time is unconfirmed" };
    const answer = "Em chưa có xác nhận về thời điểm shop sẽ gửi hàng.";
    expect((await run({ ...input, answer }).promise).reply).toContain(answer);
    for (const bad of ["Shop sẽ gửi hàng hôm nay.", "Hàng sẽ được gửi hôm nay.",
      "Việc gửi hàng sẽ diễn ra hôm nay.", `${answer} Shop sẽ gửi ngay.`]) {
      await expect(run({ ...input, answer: bad }).promise).rejects.toThrow();
    }
  });

  it.each(["timeout", "json", "wrong-property", "dropped-limit"])("recovery keeps price AND the named wrinkle limitation after %s", async (fault) => {
    const inbound = "Giá bao nhiêu và vải có chống nhăn không?";
    const seed = run({ inbound, answer: null, scope: "WRINKLE_RESISTANCE",
      limit: "wrinkle resistance is not verified" });
    await seed.promise;
    const context = contextFromFrozenTrackCCapture({ capture: seed.capture, evaluationAt: at });
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce(await seed.send.mock.results[0]!.value);
    // Use a new script: the previous successful responder is not a fixture result.
    if (fault === "timeout") send.mockRejectedValueOnce(new Error("CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT"));
    else send.mockResolvedValueOnce({ providerModelVersion: "gemini-3.5-flash-lite", payload: fault === "json"
      ? { candidates: [{ content: { parts: [{ text: "{bad json" }] } }] }
      : payload({ answerText: fault === "dropped-limit" ? null : "Em chưa có thông tin về độ mịn.",
        factualTexts: [], progressionText: null }) });
    const result = await runTrackCStrategyLive({ context, modelResource, decisionAt: at,
      requestedObligations: [
        { kind: "FACT_REQUEST", capability: "PRICE", scope: null, productId: "SQ9012" },
        { kind: "FACT_REQUEST", capability: "PRODUCT_ATTRIBUTES", scope: "WRINKLE_RESISTANCE", productId: "SQ9012" },
      ],
      dialogue: [{ direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT", text: inbound,
        attachmentCount: 0, occurredAt: at.toISOString() }], checkoutRequestedFields: [],
      checkoutClarificationActive: false, currentCart: null, paymentOptions: ["COD"], transport: { send } });
    expect(result.reply).toContain("849.000");
    expect(result.reply).toContain("chống nhăn");
    expect(result.reply).not.toContain("độ mịn");
    expect(result.output.cta).toBe("NONE");
    expect(result.output.segments.filter(({ kind }) => kind === "VERIFIED_CLAIM")).toHaveLength(1);
    if (fault !== "dropped-limit") expect(result.recoveryDiagnostic).toBeDefined();
    else expect(result.recoveryDiagnostic).toBeUndefined(); // Code supplies the limit without a failure.
    expect(send).toHaveBeenCalledTimes(2);
  });

  it.each([3, 5, 7])("keeps ETA facts and code-only feasibility; never lets prose calculate a range (%s)", async (deadline) => {
    const inbound = `Chị cần nhận trong ${deadline} ngày.`;
    const good = await run({ inbound, answer: null, etaDeadline: deadline }).promise;
    expect(good.reply).toMatch(/2.?4\s*ngày/u);
    expect(good.reply).not.toContain("nằm trong khoảng");
    if (deadline < 4) expect(good.responderTask.deliveryDeadlineText).toBeDefined();
    else expect(good.responderTask.deliveryDeadlineText).toBeUndefined();
    for (const answer of [`Hạn ${deadline} ngày nằm trong khoảng 2–4 ngày.`,
      "Mốc chị đưa nằm trong khoảng này.",
      "Như vậy sẽ kịp hạn."]) {
      await expect(run({ inbound, answer, etaDeadline: deadline }).promise).rejects.toThrow();
    }
  });

  it("uncertainty cannot hide an independent passive dispatch promise", async () => {
    const inbound = "Bao giờ shop gửi?";
    const prefix = "Em chưa có thông tin xác nhận ngày shop gửi hàng.";
    expect((await run({ inbound, answer: prefix }).promise).reply).toContain(prefix);
    for (const answer of ["Hàng sẽ được gửi hôm nay.",
      `${prefix} Hàng sẽ được gửi hôm nay.`,
      "Việc gửi hàng sẽ diễn ra hôm nay."]) {
      await expect(run({ inbound, answer }).promise).rejects.toThrow();
    }
  });

  it("does not let punctuation or a topic preface self-authorize a product assertion", async () => {
    const inbound = "Cho chị biết giá.";
    for (const answer of [
      "Mẫu này chống nhăn: em chưa có thông tin thêm.",
      "Về mẫu này chống nhăn, em chưa có thông tin thêm.",
    ]) await expect(run({ inbound, answer }).promise).rejects.toThrow();
    const answer = "Về khả năng chống nhăn, em chưa có dữ liệu xác nhận.";
    expect((await run({ inbound: "Giá và khả năng chống nhăn?", answer,
      limit: "wrinkle resistance not verified" }).promise).reply).toContain(answer);
  });

  it("does not let an epistemic prefix license an independent predicate without punctuation", async () => {
    const input = { inbound: "Giá và khả năng chống nhăn?", limit: "wrinkle resistance unverified", scope: "WRINKLE_RESISTANCE" as const };
    const good = "Em chưa có thông tin xác nhận về khả năng chống nhăn của mẫu SQ9012.";
    expect((await run({ ...input, answer: good }).promise).reply).toContain(good);
    for (const answer of [
      "Em chưa có dữ liệu tức là mẫu này không chống nhăn.",
      "Em chưa xác nhận khả năng chống nhăn bởi vậy vải này dễ nhăn.",
    ]) await expect(run({ ...input, answer }).promise).rejects.toThrow();
  });

});
