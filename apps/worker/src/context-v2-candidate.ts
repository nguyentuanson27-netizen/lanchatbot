import { createHash } from "node:crypto";
import {
  ContextV2CandidateOutputV2Schema,
  canonicalJsonV1,
  type ContextV2,
  type ContextV2CandidateOutputV2,
} from "@lana/contracts";
import { parseContextV2WithIntegrity } from "./context-v2.js";

export type ContextV2CandidateOutput = ContextV2CandidateOutputV2;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: [
    "schemaVersion",
    "contractVersion",
    "contextHash",
    "productBinding",
    "segments",
    "strategy",
    "cta",
  ],
  properties: {
    schemaVersion: { type: "INTEGER", minimum: 2, maximum: 2 },
    contractVersion: {
      type: "STRING",
      enum: ["CONTEXT_V2_CANDIDATE_OUTPUT_V2"],
    },
    contextHash: { type: "STRING" },
    productBinding: {
      type: "OBJECT",
      required: ["status", "productIds"],
      properties: {
        status: {
          type: "STRING",
          enum: [
            "RESOLVED",
            "STALE",
            "AMBIGUOUS",
            "UNRESOLVED",
            "NOT_REQUIRED",
          ],
        },
        productIds: { type: "ARRAY", items: { type: "STRING" } },
      },
    },
    segments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["kind", "text"],
        properties: {
          kind: {
            type: "STRING",
            enum: [
              "GENERAL",
              "VERIFIED_CLAIM",
              "CLARIFICATION",
              "ACTION_REQUEST",
              "EFFECT_CLAIM",
            ],
          },
          text: { type: "STRING" },
          claimContentHash: { type: "STRING" },
          target: {
            type: "STRING",
            enum: ["PRODUCT", "MEASUREMENTS", "CHECKOUT_DETAILS"],
          },
          action: {
            type: "STRING",
            enum: [
              "PROVIDE_PRODUCT",
              "PROVIDE_MEASUREMENTS",
              "PROVIDE_CHECKOUT_DETAILS",
              "CONFIRM_CART",
            ],
          },
          effect: {
            type: "STRING",
            enum: [
              "CART_OPENED",
              "CART_UPDATED",
              "ORDER_PLACED",
              "ORDER_CONFIRMED",
              "MESSAGE_SENT",
              "DELIVERY_CREATED",
            ],
          },
        },
      },
    },
    strategy: {
      type: "STRING",
      enum: [
        "ANSWER_VERIFIED_FACTS",
        "ASK_CLARIFICATION",
        "ADVANCE_CART",
        "HOLD_POSITION",
      ],
    },
    cta: {
      type: "STRING",
      enum: [
        "NONE",
        "ASK_PRODUCT",
        "ASK_MEASUREMENTS",
        "ASK_CHECKOUT_DETAILS",
        "CONFIRM_CART",
      ],
    },
  },
} as const;

const GENERATION_CONFIG = {
  maxOutputTokens: 1_024,
  responseMimeType: "application/json",
  responseSchema: RESPONSE_SCHEMA,
} as const;

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
] as const;

const SYSTEM_INSTRUCTION = [
  "You are an offline sales-response candidate used only for evaluation.",
  "Use only the verified claims and canonical state in Context V2.",
  "Never claim to have sent a message, changed a cart, confirmed an order, or performed any side effect.",
  "Write natural, concise Vietnamese for a Messenger conversation. Use ordinary shop language, not system, workflow, policy, evidence, state-machine, or test terminology.",
  "Do not mention an internal cart or expose internal action names to the customer.",
  "Apply the first matching response rule below; these are general canonical-state rules, never corpus-item exceptions.",
  "If PRODUCT_CONTEXT_UNREADY is active or productBinding is STALE, AMBIGUOUS, or UNRESOLVED: naturally ask which product the customer means; declare CLARIFICATION target PRODUCT and ACTION_REQUEST PROVIDE_PRODUCT; use strategy ASK_CLARIFICATION and CTA ASK_PRODUCT.",
  "That product-unready branch has absolute precedence: until the product is resolved, never ask for recipient name, phone number, delivery address, payment, or any other checkout detail, even when buying intent is committed.",
  "Otherwise, if MEASUREMENTS_REQUIRED is active: naturally ask for the missing everyday measurements such as height and weight; declare CLARIFICATION target MEASUREMENTS and ACTION_REQUEST PROVIDE_MEASUREMENTS; use strategy ASK_CLARIFICATION and CTA ASK_MEASUREMENTS. A customer correction never authorizes a size recommendation.",
  "Otherwise, if phase is ORDER_REVIEW with sourceStage ORDER_PREVIEW and buyingIntent.requestedAction PROCEED_TO_PAYMENT: naturally ask for recipient name, phone number, and delivery address; declare CLARIFICATION target CHECKOUT_DETAILS and ACTION_REQUEST PROVIDE_CHECKOUT_DETAILS; use strategy ASK_CLARIFICATION and CTA ASK_CHECKOUT_DETAILS; do not say an order was placed or confirmed.",
  "If phase is ORDER_CONFIRMED or sourceStage is PURCHASE_CONFIRMED: use HOLD_POSITION or ANSWER_VERIFIED_FACTS with CTA NONE, ask for nothing, and reply with a neutral acknowledgement that does not restate, imply, or take credit for any completed order effect. Do not emit EFFECT_CLAIM.",
  "For a clarification that also asks the customer to provide something, use two short non-repetitive natural sentences so the CLARIFICATION and ACTION_REQUEST segments remain distinct without sounding robotic.",
  "Natural tone examples to adapt, never copy mechanically: 'Chị đang xem mẫu nào vậy ạ?', 'Chị cao và nặng khoảng bao nhiêu ạ?', 'Chị gửi em tên, số điện thoại và địa chỉ nhận hàng nhé.', or 'Dạ em nắm rồi chị nha.' Avoid formal bot phrases such as 'vui lòng cung cấp thông tin tương ứng'.",
  "When no rule above requires information, do not add a clarification or requested action. Acknowledgements and summaries are GENERAL, not requests.",
  "When no rule above asks for missing information or requires HOLD_POSITION, state every eligible verified claim exactly once as a VERIFIED_CLAIM bound to that claim's exact provenance content hash. This includes eligible PRICE, SIZE_FIT, and PRODUCT_MEDIA claims; never omit one or hide it inside a GENERAL segment.",
  "Use ordinary customer-facing wording for those claims: give the exact eligible price in everyday Vietnamese and phrase an eligible size recommendation naturally from the supplied measurements.",
  "For each SIZE_FIT VERIFIED_CLAIM, include one standalone affirmative clause that says the customer fits 'size <recommendedSizes[0]>' using that exact first recommended token (for example, 'Theo số đo, chị hợp size M.'). Do not phrase that clause as a question, negation, uncertainty, catalog/list, stock statement, or substitute an alternative or unregistered size.",
  "Present eligible PRODUCT_MEDIA as static visible content, for example 'Mẫu chị đang xem nằm ngay bên dưới để chị xem kỹ hơn ạ.' Never describe the shop as having sent or placed the media; first-person completed transmission or placement can assert a completed MESSAGE_SENT effect.",
  "Do not claim stock, availability, price, delivery, promotions, or any other protected fact unless an eligible verified claim of that exact type supports it. In particular, do not say 'còn mẫu' merely because verified product media exists.",
  "Classify every customer-facing text segment by its semantic role; bind verified claims to their exact provenance content hash.",
  "Echo the exact Context V2 context hash and product binding; never hide a claim or effect inside a GENERAL segment.",
  "Return only the registered JSON response schema.",
].join("\n");

export const CONTEXT_V2_CANDIDATE_MODEL_ID = "gemini-3.5-flash-lite";
// Owner-selected draft expectation, not a provider-observed identity. Gate E
// remains DRAFT_UNREGISTERED until an authorized redacted observation binds
// the exact provider value before corpus/rubric registration.
export const CONTEXT_V2_CANDIDATE_PROVIDER_VERSION =
  "gemini-3.5-flash-lite";

const MODEL_RESOURCE_PATTERN = new RegExp(
  `^projects\\/[A-Za-z0-9._-]{1,128}\\/locations\\/[A-Za-z0-9._-]{1,64}\\/publishers\\/google\\/models\\/${CONTEXT_V2_CANDIDATE_MODEL_ID.replaceAll(".", "\\.")}$`,
  "u",
);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function candidateClaimScope(
  scope: ContextV2["verifiedClaims"][number]["scope"],
) {
  if (scope.kind === "PRODUCT") {
    return {
      kind: scope.kind,
      productId: scope.productId,
      variantId: scope.variantId,
    };
  }
  if (scope.kind === "CART") {
    return { kind: scope.kind, cartVersion: scope.cartVersion };
  }
  return { kind: scope.kind };
}

type ProtectedClaimType = ContextV2["verifiedClaims"][number]["type"];

export const CANDIDATE_CLAIM_VALUE_KEYS = Object.freeze({
  PRICE: ["amountVnd", "currency"],
  STOCK: ["status", "availableQuantity"],
  SIZE_FIT: ["recommendedSizes", "alternativeSizes", "evidenceBasis"],
  ETA: ["minDays", "maxDays"],
  SHIPPING_FEE: ["amountVnd", "currency"],
  FREESHIP: ["eligible"],
  PROMOTION_OFFER: ["adjustmentId", "amountVnd"],
  PRODUCT_MEDIA: ["assetId", "assetSha256"],
} as const satisfies Readonly<Record<ProtectedClaimType, readonly string[]>>);

/** Exhaustive claim-value projection; unregistered fields never cross egress. */
export function sanitizeCandidateClaimValue(
  type: ProtectedClaimType,
  value: object,
): Readonly<Record<string, unknown>> {
  const allowedKeys: readonly string[] = CANDIDATE_CLAIM_VALUE_KEYS[type];
  const input = value as Readonly<Record<string, unknown>>;
  return Object.freeze(Object.fromEntries(
    allowedKeys.map((key) => [key, input[key]]),
  ));
}

/** The single egress sanitizer for every Context V2 candidate request. */
export function sanitizeContextV2CandidateInput(context: ContextV2) {
  const parsed = parseContextV2WithIntegrity(context);
  return {
    schemaVersion: 1 as const,
    contractVersion: "CONTEXT_V2_CANDIDATE_INPUT_V1" as const,
    contextHash: parsed.contextHash,
    productBinding: parsed.productBinding,
    dialogueEvidence: parsed.dialogueEvidence,
    verifiedClaims: parsed.verifiedClaims.map((claim) => ({
      type: claim.type,
      scope: candidateClaimScope(claim.scope),
      value: sanitizeCandidateClaimValue(claim.type, claim.value),
      provenance: {
        authority: claim.provenance.authority,
        sourceVersion: claim.provenance.sourceVersion,
        contentHash: claim.provenance.contentHash,
        observedAt: claim.provenance.observedAt,
        expiresAt: claim.provenance.expiresAt,
      },
    })),
    phase: parsed.phase,
    barriers: parsed.barriers,
    buyingIntent: parsed.buyingIntent,
    cartReadiness: parsed.cartReadiness,
    ownership: {
      owner: parsed.ownership.owner,
      handoffActive: parsed.ownership.handoffActive,
    },
  };
}

export interface CandidateRequestIdentity {
  readonly requestEnvelopeHash: string;
  readonly modelResource: string;
  readonly systemInstructionHash: string;
  readonly promptContentHash: string;
  readonly responseSchemaHash: string;
  readonly generationConfigHash: string;
  readonly safetySettingsHash: string;
}

export interface BuiltCandidateRequest {
  readonly url: string;
  readonly body: string;
  readonly identity: CandidateRequestIdentity;
}

export function deriveCandidateRequestIdentity(
  request: Readonly<{ url: string; body: string }>,
): CandidateRequestIdentity {
  const prefix = "https://aiplatform.googleapis.com/v1/";
  const suffix = ":generateContent";
  if (!request.url.startsWith(prefix) || !request.url.endsWith(suffix)) {
    throw new Error("CONTEXT_V2_CANDIDATE_URL_INVALID");
  }
  const modelResource = request.url.slice(prefix.length, -suffix.length);
  const body = JSON.parse(request.body) as {
    systemInstruction?: { parts?: Array<{ text?: unknown }> };
    contents?: Array<{ parts?: Array<{ text?: unknown }> }>;
    generationConfig?: Record<string, unknown>;
    safetySettings?: unknown;
  };
  const systemInstruction = body.systemInstruction?.parts?.[0]?.text;
  const prompt = body.contents?.[0]?.parts?.[0]?.text;
  const generationConfig = body.generationConfig;
  const responseSchema = generationConfig?.responseSchema;
  if (typeof systemInstruction !== "string" || typeof prompt !== "string" ||
      generationConfig === undefined || responseSchema === undefined ||
      body.safetySettings === undefined) {
    throw new Error("CONTEXT_V2_CANDIDATE_ENVELOPE_INVALID");
  }
  return Object.freeze({
    requestEnvelopeHash: sha256(canonicalJsonV1({
      url: request.url,
      body: request.body,
    })),
    modelResource,
    systemInstructionHash: sha256(systemInstruction),
    promptContentHash: sha256(prompt),
    responseSchemaHash: sha256(canonicalJsonV1(responseSchema)),
    generationConfigHash: sha256(canonicalJsonV1(generationConfig)),
    safetySettingsHash: sha256(canonicalJsonV1(body.safetySettings)),
  });
}

export function deriveCandidateRequestContextHash(
  request: Readonly<{ body: string }>,
): string {
  const body = JSON.parse(request.body) as {
    contents?: Array<{ parts?: Array<{ text?: unknown }> }>;
  };
  const prompt = body.contents?.[0]?.parts?.[0]?.text;
  if (typeof prompt !== "string") {
    throw new Error("CONTEXT_V2_CANDIDATE_PROMPT_INVALID");
  }
  const contextHash = (JSON.parse(prompt) as { contextHash?: unknown }).contextHash;
  if (typeof contextHash !== "string" || !/^[a-f0-9]{64}$/u.test(contextHash)) {
    throw new Error("CONTEXT_V2_CANDIDATE_CONTEXT_HASH_INVALID");
  }
  return contextHash;
}

export function buildCandidateRequest(input: Readonly<{
  modelResource: string;
  context: ContextV2;
}>): BuiltCandidateRequest {
  if (!MODEL_RESOURCE_PATTERN.test(input.modelResource)) {
    throw new Error("CONTEXT_V2_MODEL_RESOURCE_INVALID");
  }
  const sanitized = sanitizeContextV2CandidateInput(input.context);
  const prompt = canonicalJsonV1(sanitized);
  const bodyValue = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: GENERATION_CONFIG,
    safetySettings: SAFETY_SETTINGS,
  };
  const url = `https://aiplatform.googleapis.com/v1/${input.modelResource}:generateContent`;
  const body = JSON.stringify(bodyValue);
  return Object.freeze({
    url,
    body,
    identity: deriveCandidateRequestIdentity({ url, body }),
  });
}

export interface CandidateVertexTransport {
  send(request: Readonly<{
    url: string;
    body: string;
    signal?: AbortSignal;
  }>): Promise<Readonly<{
    payload: unknown;
    providerModelVersion: string | null;
  }>>;
}

export type CandidateProviderFailureScope =
  | "RETRYABLE_TRANSIENT"
  | "RUN_BLOCKING_CONFIGURATION";

export class CandidateProviderError extends Error {
  readonly name = "CandidateProviderError";

  constructor(
    message:
      | "CONTEXT_V2_CANDIDATE_PROVIDER_TRANSIENT"
      | "CONTEXT_V2_CANDIDATE_PROVIDER_CONFIGURATION"
      | "CONTEXT_V2_CANDIDATE_ACCESS_TOKEN_MISSING"
      | "CONTEXT_V2_CANDIDATE_CALLER_ABORTED",
    readonly scope: CandidateProviderFailureScope,
    readonly statusClass: "AUTH" | "4XX" | "5XX" | "OTHER",
  ) {
    super(message);
  }
}

export class FetchCandidateVertexTransport implements CandidateVertexTransport {
  constructor(
    private readonly accessToken: (signal: AbortSignal) => Promise<string>,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 30_000,
  ) {}

  async send(request: Readonly<{
    url: string;
    body: string;
    signal?: AbortSignal;
  }>) {
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(
      request.signal?.reason ?? "CONTEXT_V2_CANDIDATE_CALLER_ABORTED",
    );
    if (request.signal?.aborted) abortFromCaller();
    request.signal?.addEventListener("abort", abortFromCaller, { once: true });
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout>;
    const timeoutFailure = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        timedOut = true;
        controller.abort("CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT");
        reject(new Error("CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT"));
      }, Math.max(1_000, Math.min(120_000, this.timeoutMs)));
    });
    try {
      return await Promise.race([
        (async () => {
          let accessToken: string;
          try {
            accessToken = (await this.accessToken(controller.signal)).trim();
          } catch {
            throw new CandidateProviderError(
              "CONTEXT_V2_CANDIDATE_ACCESS_TOKEN_MISSING",
              "RUN_BLOCKING_CONFIGURATION",
              "AUTH",
            );
          }
          if (!accessToken) {
            throw new CandidateProviderError(
              "CONTEXT_V2_CANDIDATE_ACCESS_TOKEN_MISSING",
              "RUN_BLOCKING_CONFIGURATION",
              "AUTH",
            );
          }
          if (request.signal?.aborted) {
            throw new CandidateProviderError(
              "CONTEXT_V2_CANDIDATE_CALLER_ABORTED",
              "RUN_BLOCKING_CONFIGURATION",
              "OTHER",
            );
          }
          const response = await this.fetchImpl(request.url, {
            method: "POST",
            headers: {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json",
            },
            body: request.body,
            signal: controller.signal,
            redirect: "error",
          });
          if (!response.ok) {
            const transient = response.status === 408 || response.status === 429 ||
              response.status >= 500;
            const statusClass = response.status >= 500
              ? "5XX" as const
              : response.status >= 400
                ? "4XX" as const
                : "OTHER" as const;
            throw new CandidateProviderError(
              transient
                ? "CONTEXT_V2_CANDIDATE_PROVIDER_TRANSIENT"
                : "CONTEXT_V2_CANDIDATE_PROVIDER_CONFIGURATION",
              transient ? "RETRYABLE_TRANSIENT" : "RUN_BLOCKING_CONFIGURATION",
              statusClass,
            );
          }
          const payload = await response.json() as Record<string, unknown>;
          const responseModelVersion = response.headers.get(
            "x-vertex-model-version",
          );
          const payloadModelVersion = typeof payload.modelVersion === "string"
            ? payload.modelVersion
            : null;
          return {
            payload,
            providerModelVersion:
              responseModelVersion ?? payloadModelVersion,
          };
        })(),
        timeoutFailure,
      ]);
    } catch (error) {
      if (error instanceof CandidateProviderError) {
        throw error;
      }
      if (request.signal?.aborted) {
        throw new CandidateProviderError(
          "CONTEXT_V2_CANDIDATE_CALLER_ABORTED",
          "RUN_BLOCKING_CONFIGURATION",
          "OTHER",
        );
      }
      if (timedOut) {
        throw new Error("CONTEXT_V2_CANDIDATE_PROVIDER_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timeout!);
      request.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}

function candidateText(payload: unknown): string {
  const record = payload !== null && typeof payload === "object"
    ? payload as Record<string, unknown>
    : {};
  const candidates = Array.isArray(record.candidates) ? record.candidates : [];
  const first = candidates[0] !== null && typeof candidates[0] === "object"
    ? candidates[0] as Record<string, unknown>
    : {};
  const content = first.content !== null && typeof first.content === "object"
    ? first.content as Record<string, unknown>
    : {};
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const part = parts[0] !== null && typeof parts[0] === "object"
    ? parts[0] as Record<string, unknown>
    : {};
  if (typeof part.text !== "string") {
    throw new Error("CONTEXT_V2_CANDIDATE_RESPONSE_MISSING");
  }
  return part.text;
}

export interface ContextV2CandidateModelPort {
  generateCandidate(context: ContextV2): Promise<Readonly<{
    output: ContextV2CandidateOutput;
    providerModelVersion: string;
    requestIdentity: CandidateRequestIdentity;
  }>>;
}

export function parseCandidateVertexResponse(response: Readonly<{
  payload: unknown;
  providerModelVersion: string | null;
}>): Readonly<{
  output: ContextV2CandidateOutput;
  providerModelVersion: string;
}> {
  const providerModelVersion = response.providerModelVersion?.trim() ?? "";
  if (!providerModelVersion || providerModelVersion.toLowerCase() === "unknown") {
    throw new Error("CONTEXT_V2_CANDIDATE_MODEL_IDENTITY_UNKNOWN");
  }
  if (providerModelVersion !== CONTEXT_V2_CANDIDATE_PROVIDER_VERSION) {
    throw new Error("CONTEXT_V2_CANDIDATE_MODEL_IDENTITY_MISMATCH");
  }
  let output: ContextV2CandidateOutput;
  try {
    output = ContextV2CandidateOutputV2Schema.parse(
      JSON.parse(candidateText(response.payload)),
    );
  } catch (error) {
    if (error instanceof Error &&
        error.message === "CONTEXT_V2_CANDIDATE_RESPONSE_MISSING") {
      throw error;
    }
    throw new Error("CONTEXT_V2_CANDIDATE_RESPONSE_INVALID");
  }
  return Object.freeze({ output, providerModelVersion });
}

export class ContextV2CandidateModel implements ContextV2CandidateModelPort {
  constructor(
    private readonly modelResource: string,
    private readonly transport: CandidateVertexTransport,
  ) {}

  async generateCandidate(context: ContextV2) {
    const request = buildCandidateRequest({
      modelResource: this.modelResource,
      context,
    });
    const response = await this.transport.send({
      url: request.url,
      body: request.body,
    });
    const parsed = parseCandidateVertexResponse(response);
    return {
      output: parsed.output,
      providerModelVersion: parsed.providerModelVersion,
      requestIdentity: request.identity,
    };
  }
}
