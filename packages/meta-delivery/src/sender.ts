import type { MetaSendAttemptResultV1 } from "@lana/contracts";
import { z } from "zod";
import {
  HttpTransportFailure,
  type HttpRequest,
  type HttpResponse,
  type HttpTransport,
} from "./transport.js";

const IdSchema = z.string().trim().min(1).max(256);
const TextSchema = z.string().trim().min(1).max(2_000);
const HttpsUrlSchema = z
  .string()
  .url()
  .max(4_096)
  .refine((value) => new URL(value).protocol === "https:", "HTTPS_REQUIRED");

const AcceptedResponseSchema = z.object({
  recipient_id: IdSchema,
  message_id: IdSchema,
});

export type MetaMessageUnit =
  | { readonly kind: "TEXT"; readonly text: string }
  | { readonly kind: "IMAGE"; readonly imageUrl: string };

export interface MetaSendCommand {
  readonly pageId: string;
  readonly recipientId: string;
  readonly pageAccessToken: string;
  readonly message: MetaMessageUnit;
}

export interface MetaDeliveryOptions {
  readonly sendEnabled?: boolean;
  readonly graphBaseUrl?: string;
  readonly graphApiVersion?: string;
  readonly timeoutMs?: number;
}

const permanent = (reasonCode: string): MetaSendAttemptResultV1 => ({
  schemaVersion: 1,
  result: "FAILED_PERMANENT",
  reasonCode,
});

const ambiguous = (reasonCode: string): MetaSendAttemptResultV1 => ({
  schemaVersion: 1,
  result: "AMBIGUOUS",
  reasonCode,
});

const retryable = (reasonCode: string): MetaSendAttemptResultV1 => ({
  schemaVersion: 1,
  result: "RETRYABLE",
  reasonCode,
  knownNotTransmitted: true,
});

/** A hard-gated, injected-transport Meta delivery adapter. */
export class MetaDeliveryAdapter {
  private readonly sendEnabled: boolean;
  private readonly graphBaseUrl: string;
  private readonly graphApiVersion: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly transport: HttpTransport,
    options: MetaDeliveryOptions = {},
  ) {
    this.sendEnabled = options.sendEnabled ?? false;
    this.graphBaseUrl = normalizeBaseUrl(options.graphBaseUrl ?? "https://graph.facebook.com");
    this.graphApiVersion = validateVersion(options.graphApiVersion ?? "v23.0");
    this.timeoutMs = validateTimeout(options.timeoutMs ?? 10_000);
  }

  async send(command: MetaSendCommand): Promise<MetaSendAttemptResultV1> {
    if (!this.sendEnabled) return permanent("META_SEND_DISABLED");

    const validation = validateCommand(command);
    if (validation !== null) return permanent(validation);

    const request = buildRequest(
      command,
      this.graphBaseUrl,
      this.graphApiVersion,
      this.timeoutMs,
    );

    let response: HttpResponse;
    try {
      response = await this.transport.request(request);
    } catch (error: unknown) {
      if (error instanceof HttpTransportFailure) {
        return error.phase === "PRE_TRANSMISSION"
          ? retryable("META_KNOWN_NOT_TRANSMITTED")
          : ambiguous("META_TRANSPORT_OUTCOME_UNKNOWN");
      }
      // An unclassified transport exception cannot prove that no bytes left.
      return ambiguous("META_TRANSPORT_OUTCOME_UNKNOWN");
    }

    return classifyResponse(response, command.recipientId);
  }
}

function validateCommand(command: MetaSendCommand): string | null {
  if (!IdSchema.safeParse(command.pageId).success) return "META_PAGE_ID_INVALID";
  if (!IdSchema.safeParse(command.recipientId).success) return "META_RECIPIENT_INVALID";
  if (command.pageAccessToken.trim() === "") return "META_TOKEN_MISSING";
  if (command.message.kind === "TEXT") {
    return TextSchema.safeParse(command.message.text).success ? null : "META_TEXT_INVALID";
  }
  return HttpsUrlSchema.safeParse(command.message.imageUrl).success
    ? null
    : "META_IMAGE_URL_INVALID";
}

function buildRequest(
  command: MetaSendCommand,
  baseUrl: string,
  apiVersion: string,
  timeoutMs: number,
): HttpRequest {
  const message =
    command.message.kind === "TEXT"
      ? { text: command.message.text.trim() }
      : {
          attachment: {
            type: "image",
            payload: { url: command.message.imageUrl, is_reusable: false },
          },
        };
  return {
    method: "POST",
    url: `${baseUrl}/${apiVersion}/${encodeURIComponent(command.pageId)}/messages`,
    headers: {
      authorization: `Bearer ${command.pageAccessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_type: "RESPONSE",
      recipient: { id: command.recipientId },
      message,
    }),
    timeoutMs,
  };
}

function classifyResponse(
  response: HttpResponse,
  expectedRecipientId: string,
): MetaSendAttemptResultV1 {
  if (response.status >= 200 && response.status < 300) {
    const parsed = AcceptedResponseSchema.safeParse(response.body);
    if (!parsed.success || parsed.data.recipient_id !== expectedRecipientId) {
      // A 2xx means the request was dispatched, but malformed/mismatched
      // evidence is insufficient to prove which message was accepted.
      return ambiguous("META_ACCEPTANCE_EVIDENCE_INVALID");
    }
    return {
      schemaVersion: 1,
      result: "ACCEPTED",
      providerMessageId: parsed.data.message_id,
      recipientId: parsed.data.recipient_id,
    };
  }
  if (response.status === 429) return retryable("META_RATE_LIMITED_NOT_ACCEPTED");
  if (response.status === 400) return permanent("META_REQUEST_REJECTED");
  if (response.status === 401 || response.status === 403) {
    return permanent("META_AUTH_REJECTED");
  }
  if (response.status >= 400 && response.status < 500) {
    return permanent("META_CLIENT_REQUEST_REJECTED");
  }
  // A provider 5xx does not prove whether a downstream send occurred.
  return ambiguous("META_PROVIDER_OUTCOME_UNKNOWN");
}

function normalizeBaseUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error("META_GRAPH_BASE_URL_HTTPS_REQUIRED");
  if (
    parsed.hostname !== "graph.facebook.com" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("META_GRAPH_BASE_URL_FORBIDDEN");
  }
  return parsed.toString().replace(/\/$/, "");
}

function validateVersion(value: string): string {
  if (!/^v\d+\.\d+$/.test(value)) throw new Error("META_GRAPH_API_VERSION_INVALID");
  return value;
}

function validateTimeout(value: number): number {
  if (!Number.isInteger(value) || value < 100 || value > 60_000) {
    throw new Error("META_TIMEOUT_INVALID");
  }
  return value;
}
